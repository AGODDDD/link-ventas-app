import { NextResponse } from 'next/server'
import { getRateLimitKey } from '@/lib/rateLimit'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const orderReferencePattern = /^[A-Za-z0-9-]{1,80}$/

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    const body: Record<string, unknown> = await request.json()
    const storeId = text(body.store_id, 64)
    const productId = text(body.product_id, 64)
    const orderReference = text(body.order_reference, 80)
    const customerPhone = text(body.customer_phone, 40).replace(/\s/g, '')
    const customerEmail = text(body.customer_email, 254).toLowerCase()
    const fallbackName = text(body.customer_name, 80)
    const comment = text(body.comment, 600)
    const rating = Number(body.rating)

    if (!uuidPattern.test(storeId) || !uuidPattern.test(productId) || !orderReferencePattern.test(orderReference)) {
      return NextResponse.json({ error: 'Tienda, producto o pedido inválido.' }, { status: 400 })
    }
    if (!/^\d{7,15}$/.test(customerPhone) || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
      return NextResponse.json({ error: 'Los datos usados para verificar la compra no son válidos.' }, { status: 400 })
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 5) {
      return NextResponse.json({ error: 'Selecciona una calificación y escribe un comentario válido.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const rateLimitKey = getRateLimitKey(request, 'review', [storeId, productId])
    const { data: allowed, error: limitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: rateLimitKey,
      p_limit: 5,
      p_window_seconds: 3600,
    })
    if (limitError) throw limitError
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 })

    let orderQuery = supabase
      .from('orders')
      .select('id, customer_name')
      .eq('store_id', storeId)
      .eq('customer_phone', customerPhone)
      .eq('customer_email', customerEmail)
      .eq('status', 'completado')

    orderQuery = uuidPattern.test(orderReference)
      ? orderQuery.eq('id', orderReference)
      : orderQuery.eq('legacy_id', orderReference)

    const { data: order } = await orderQuery.maybeSingle()
    if (!order) {
      return NextResponse.json({ error: 'No encontramos una compra completada con esos datos.' }, { status: 403 })
    }

    const { data: purchasedItem } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', order.id)
      .eq('product_id', productId)
      .limit(1)
      .maybeSingle()
    if (!purchasedItem) {
      return NextResponse.json({ error: 'Ese producto no pertenece al pedido indicado.' }, { status: 403 })
    }

    const { data: existingReview } = await supabase
      .from('product_reviews')
      .select('id')
      .eq('order_id', order.id)
      .eq('product_id', productId)
      .maybeSingle()
    if (existingReview) {
      return NextResponse.json({ error: 'Este producto ya fue reseñado para ese pedido.' }, { status: 409 })
    }

    const { data: review, error: insertError } = await supabase
      .from('product_reviews')
      .insert({
        store_id: storeId,
        product_id: productId,
        order_id: order.id,
        customer_name: text(order.customer_name, 80) || fallbackName || 'Cliente verificado',
        customer_email: customerEmail,
        rating,
        comment,
        verified_purchase: true,
      })
      .select('id, customer_name, rating, comment, verified_purchase, created_at')
      .single()
    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Este producto ya fue reseñado para ese pedido.' }, { status: 409 })
      }
      throw insertError
    }

    return NextResponse.json({ success: true, review }, { status: 201 })
  } catch (error) {
    console.error('Review API error:', error)
    return NextResponse.json({ error: 'No se pudo guardar la reseña.' }, { status: 500 })
  }
}
