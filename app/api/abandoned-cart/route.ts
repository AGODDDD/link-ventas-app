import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 8

function allowRequest(request: Request) {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count += 1
  return true
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    if (!allowRequest(request)) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
    const payload = await request.json()
    const { storeId, customerName, customerPhone, cart, existingLeadId } = payload

    if (typeof storeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(storeId) || !/^\d{7,15}$/.test(text(customerPhone, 40).replace(/\s/g, '')) || !Array.isArray(cart) || cart.length === 0 || cart.length > 100) {
      return NextResponse.json({ error: 'Faltan datos clave' }, { status: 400 })
    }
    const safeCart = cart.map((item: unknown) => item && typeof item === 'object' ? item : null).filter(Boolean).slice(0, 100)
    if (!safeCart.length) return NextResponse.json({ error: 'Carrito inválido' }, { status: 400 })
    const supabase = getSupabaseServiceClient()

    // Upsert mechanism: Si ya mandamos el lead en este intento (tienen existingLeadId), lo actualizamos. 
    // Si no, creamos uno nuevo.
    if (existingLeadId) {
      const { error } = await supabase
        .from('abandoned_carts')
        .update({
          customer_name: text(customerName, 160),
          customer_phone: text(customerPhone, 40).replace(/\s/g, ''),
          cart_json: safeCart,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLeadId)
        .eq('store_id', storeId)
        .eq('customer_phone', text(customerPhone, 40).replace(/\s/g, ''))

      if (error) throw error
      return NextResponse.json({ success: true, leadId: existingLeadId })
    } else {
      // Creamos uno nuevo
      const { data, error } = await supabase
        .from('abandoned_carts')
        .insert({
          store_id: storeId,
          customer_name: text(customerName, 160),
          customer_phone: text(customerPhone, 40).replace(/\s/g, ''),
          cart_json: safeCart
        })
        .select('id')
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, leadId: data.id })
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error Silencioso AbandonedCarts:', message)
    return NextResponse.json({ error: 'Fallo interno' }, { status: 500 })
  }
}
