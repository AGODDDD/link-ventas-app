import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const orderReferencePattern = /^[A-Za-z0-9-]{1,80}$/

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('store_id')
  const orderId = searchParams.get('order_id')
  const customerPhone = searchParams.get('customer_phone')?.replace(/\s/g, '')
  if (!storeId || !orderId || !customerPhone || !uuidPattern.test(storeId) || !orderReferencePattern.test(orderId) || !/^\d{7,15}$/.test(customerPhone)) {
    return NextResponse.json({ error: 'Solicitud invalida.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceClient()
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
