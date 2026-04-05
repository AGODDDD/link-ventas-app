import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    // Instancia limpia (sin Auth requerida porque el cliente que compra no tiene cuenta)
    // Para interactuar con la Base de datos sin Row Level Security (o con anon key), debemos asegurarnos de que:
    // La política de abandoned_carts permite INSERT público.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set(name, value, options) },
          remove(name: string, options: CookieOptions) { cookieStore.set(name, '', options) },
        },
      }
    )

    const payload = await request.json()
    const { storeId, customerName, customerPhone, cart, existingLeadId } = payload

    if (!storeId || !customerPhone || cart.length === 0) {
      return NextResponse.json({ error: 'Faltan datos clave' }, { status: 400 })
    }

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

  } catch (error: any) {
    console.error('Error Silencioso AbandonedCarts:', error.message)
    return NextResponse.json({ error: 'Fallo interno' }, { status: 500 })
  }
}
