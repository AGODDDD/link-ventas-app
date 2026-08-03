import { NextResponse } from 'next/server'
import { getRateLimitKey } from '@/lib/rateLimit'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const extensionByType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const storeId = String(form.get('store_id') || '').trim()
    const file = form.get('file')
    if (!uuidPattern.test(storeId) || !(file instanceof File) || file.size < 1 || file.size > 5 * 1024 * 1024 || !allowedTypes.has(file.type)) {
      return NextResponse.json({ error: 'Comprobante inválido. Usa JPG, PNG o WEBP de hasta 5 MB.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const clientKey = getRateLimitKey(request, 'payment-proof', [storeId])
    const { data: allowed, error: limitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: clientKey,
      p_limit: 5,
      p_window_seconds: 3600,
    })
    if (limitError) throw limitError
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 })

    const { data: store } = await supabase.from('stores').select('id').eq('id', storeId).eq('is_active', true).maybeSingle()
    if (!store) return NextResponse.json({ error: 'Tienda no disponible.' }, { status: 404 })

    const path = `${storeId}/${crypto.randomUUID()}.${extensionByType[file.type]}`
    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError

    return NextResponse.json({ path }, { status: 201 })
  } catch (error) {
    console.error('Payment proof upload error:', error)
    return NextResponse.json({ error: 'No se pudo subir el comprobante.' }, { status: 500 })
  }
}

