import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { store_id, product_id, customer_name, customer_email, rating, comment } = body

    // 1. Validar presencia de todos los campos
    if (!store_id || !product_id || !customer_name || !customer_email || !rating || !comment) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos.' },
        { status: 400 }
      )
    }

    // 2. Validar rango del rating
    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'La calificacion debe ser un numero entre 1 y 5.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    // 3. Verificar si ya existe una reseña de este email para este producto
    const { data: existingReview } = await supabase
      .from('product_reviews')
      .select('id')
      .eq('store_id', store_id)
      .eq('product_id', product_id)
      .eq('customer_email', customer_email)
      .maybeSingle()

    if (existingReview) {
      return NextResponse.json(
        { error: 'Ya dejaste una reseña para este producto.' },
        { status: 409 }
      )
    }

    // 4. Buscar orden completada del cliente en esta tienda que incluya el producto
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', store_id)
      .eq('customer_email', customer_email)
      .eq('status', 'completado')

    let verifiedPurchase = false

    if (orders && orders.length > 0) {
      const orderIds = orders.map((o) => o.id)

      const { data: matchingItem } = await supabase
        .from('order_items')
        .select('id')
        .in('order_id', orderIds)
        .eq('product_id', product_id)
        .limit(1)
        .maybeSingle()

      if (matchingItem) {
        verifiedPurchase = true
      }
    }

    // 5. Si no es compra verificada, bloquear
    if (!verifiedPurchase) {
      return NextResponse.json(
        { error: 'Solo clientes que hayan comprado este producto pueden dejar una resena.' },
        { status: 403 }
      )
    }

    // 6. Insertar la reseña con verified_purchase = true
    const { data: review, error: insertError } = await supabase
      .from('product_reviews')
      .insert({
        store_id,
        product_id,
        customer_name: customer_name.trim(),
        customer_email: customer_email.trim().toLowerCase(),
        rating: ratingNum,
        comment: comment.trim(),
        verified_purchase: true,
      })
      .select('id, customer_name, rating, comment, verified_purchase, created_at')
      .single()

    if (insertError) {
      console.error('Error insertando resena:', insertError)
      return NextResponse.json(
        { error: 'No se pudo guardar la resena. Intenta de nuevo.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, review })
  } catch (error: any) {
    console.error('Error en API reviews:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
