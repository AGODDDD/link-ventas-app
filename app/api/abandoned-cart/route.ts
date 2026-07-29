import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { storeId, customerName, customerPhone, cart, existingLeadId } = payload

    if (!storeId || !customerPhone || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: 'Faltan datos clave' }, { status: 400 })
    }
    const supabase = getSupabaseServiceClient()

    // Upsert mechanism: Si ya mandamos el lead en este intento (tienen existingLeadId), lo actualizamos. 
    // Si no, creamos uno nuevo.
    if (existingLeadId) {
      const { error } = await supabase
        .from('abandoned_carts')
        .update({
          customer_name: customerName,
          customer_phone: customerPhone,
          cart_json: cart,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLeadId)
        .eq('store_id', storeId)
        .eq('customer_phone', customerPhone)

      if (error) throw error
      return NextResponse.json({ success: true, leadId: existingLeadId })
    } else {
      // Creamos uno nuevo
      const { data, error } = await supabase
        .from('abandoned_carts')
        .insert({
          store_id: storeId,
          customer_name: customerName,
          customer_phone: customerPhone,
          cart_json: cart
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
