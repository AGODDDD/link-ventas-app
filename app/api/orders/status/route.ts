import { NextResponse } from 'next/server'
import { getRateLimitKey } from '@/lib/rateLimit'
import { getAuthenticatedUser, getSupabaseServiceClient, getSupabaseUserServerClient } from '@/lib/supabaseServer'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const orderReferencePattern = /^[A-Za-z0-9-]{1,80}$/
const allowedTransitions = new Set(['pendiente', 'en_preparacion', 'alistando', 'en_camino', 'completado', 'cancelado'])

export async function PATCH(req: Request) {
  try {
    const { user, token } = await getAuthenticatedUser(req)
    if (!user || !token) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

    const body: Record<string, unknown> = await req.json()
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : ''
    const nextStatus = typeof body.next_status === 'string' ? body.next_status.trim() : ''
    if (!uuidPattern.test(orderId) || !allowedTransitions.has(nextStatus)) {
      return NextResponse.json({ error: 'Transición inválida.' }, { status: 400 })
    }

    const supabase = getSupabaseUserServerClient(token)
    const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).maybeSingle()
    if (!store) return NextResponse.json({ error: 'Tienda no encontrada.' }, { status: 404 })

    const { data: order } = await supabase.from('orders').select('id').eq('id', orderId).eq('store_id', store.id).maybeSingle()
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })

    const { error: expiryError } = await getSupabaseServiceClient().rpc('expire_order_reservations', { p_store_id: store.id })
    if (expiryError) throw expiryError

    const { error } = await supabase.rpc('transition_order_status', {
      p_order_id: order.id,
      p_next_status: nextStatus,
    })
    if (error) return NextResponse.json({ error: 'El pedido ya no permite ese cambio de estado. Actualiza la lista.' }, { status: 409 })

    return NextResponse.json({ success: true, status: nextStatus })
  } catch (error) {
    console.error('Order status transition error:', error)
    return NextResponse.json({ error: 'No se pudo actualizar el pedido.' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('store_id')
  const orderId = searchParams.get('order_id')
  const customerPhone = searchParams.get('customer_phone')?.replace(/\s/g, '')
  if (!storeId || !orderId || !customerPhone || !uuidPattern.test(storeId) || !orderReferencePattern.test(orderId) || !/^\d{7,15}$/.test(customerPhone)) {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceClient()
  const { data: allowed, error: limitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
    p_client_key: getRateLimitKey(req, 'order-tracking', [storeId]),
    p_limit: 60,
    p_window_seconds: 60,
  })
  if (limitError) return NextResponse.json({ error: 'No se pudo verificar la orden.' }, { status: 500 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas consultas. Intenta nuevamente más tarde.' }, { status: 429 })

  const { error: expiryError } = await supabase.rpc('expire_order_reservations', { p_store_id: storeId })
  if (expiryError) return NextResponse.json({ error: 'No se pudo verificar la orden.' }, { status: 500 })

  let query = supabase
    .from('orders')
    .select('id, legacy_id, status, updated_at')
    .eq('store_id', storeId)
    .eq('customer_phone', customerPhone)

  query = uuidPattern.test(orderId)
    ? query.eq('id', orderId)
    : query.eq('legacy_id', orderId)

  const { data, error } = await query.maybeSingle()
  if (error || !data) {
    return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ order: data })
}
