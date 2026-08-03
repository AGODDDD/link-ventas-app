import { NextResponse } from 'next/server'
import { getRateLimitKey } from '@/lib/rateLimit'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: Request) {
  try {
    const body: Record<string, unknown> = await request.json()
    const storeId = text(body.store_id, 64)
    const name = text(body.name, 160)
    const phone = text(body.phone, 40).replace(/\s/g, '')
    const email = text(body.email, 254).toLowerCase()
    const preference = text(body.preference, 160)

    if (!uuidPattern.test(storeId) || name.length < 2 || !/^\d{7,15}$/.test(phone) || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Datos de contacto inválidos.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const clientKey = getRateLimitKey(request, 'lead', [storeId])
    const { data: allowed, error: limitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: clientKey,
      p_limit: 5,
      p_window_seconds: 3600,
    })
    if (limitError) throw limitError
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 })

    const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).eq('is_active', true).maybeSingle()
    if (!store) return NextResponse.json({ error: 'Tienda no disponible.' }, { status: 404 })

    const { error } = await supabase.from('store_leads').insert({
      store_id: storeId,
      name,
      phone,
      email,
      preference: preference || null,
    })
    if (error) throw error

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Lead API error:', error)
    return NextResponse.json({ error: 'No se pudo registrar el contacto.' }, { status: 500 })
  }
}

