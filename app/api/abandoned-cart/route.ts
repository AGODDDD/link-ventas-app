import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'
import { getRateLimitKey } from '@/lib/rateLimit'

const MAX_ATTEMPTS = 8

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServiceClient()
    const { data: allowed, error: rateLimitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: getRateLimitKey(request, 'abandoned-cart'),
      p_limit: MAX_ATTEMPTS,
      p_window_seconds: 60,
    })
    if (rateLimitError) throw rateLimitError
    if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
    const payload = await request.json()
    const { storeId, customerName, customerPhone, cart, existingLeadId } = payload

    if (typeof storeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(storeId) || !/^\d{7,15}$/.test(text(customerPhone, 40).replace(/\s/g, '')) || !Array.isArray(cart) || cart.length === 0 || cart.length > 100) {
      return NextResponse.json({ error: 'Faltan datos clave' }, { status: 400 })
    }
    const safeCart = cart.map((item: unknown) => item && typeof item === 'object' ? item : null).filter(Boolean).slice(0, 100)
    if (!safeCart.length) return NextResponse.json({ error: 'Carrito inválido' }, { status: 400 })

    // Upsert mechanism: Si ya mandamos el lead en este intento (tienen existingLeadId), lo actualizamos. 
    // Si no, creamos uno nuevo.
    if (existingLeadId) {
      const { error } = await supabase
        .from('abandoned_carts')
        .update({
          customer_name: text(customerName, 160),
          customer_phone: text(customerPhone, 40).replace(/\s/g, ''),
          cart_items: safeCart
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
          cart_items: safeCart
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
