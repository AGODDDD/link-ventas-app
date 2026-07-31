import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { decryptText } from '@/lib/encryption'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

type MercadoPagoPayment = {
  id?: string | number
  status?: string
  transaction_amount?: number
  currency_id?: string
  external_reference?: string
  date_approved?: string
}

function paymentIdFromRequest(url: URL, body: Record<string, unknown>) {
  const data = body.data as Record<string, unknown> | undefined
  return String(data?.id ?? body.id ?? url.searchParams.get('data.id') ?? '').trim()
}

function hasValidSignature(request: Request, paymentId: string) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true
  const signature = request.headers.get('x-signature')
  const requestId = request.headers.get('x-request-id')
  if (!signature || !requestId || !paymentId) return false
  const value = `id:${paymentId};request-id:${requestId};ts:${signature.match(/ts=([^,]+)/)?.[1] ?? ''};`
  const expected = createHmac('sha256', secret).update(value).digest('hex')
  const received = signature.match(/v1=([a-f0-9]+)/i)?.[1]
  if (!received || received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected))
}

async function fetchPayment(accessToken: string, paymentId: string) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('Mercado Pago no confirmó el pago')
  return response.json() as Promise<MercadoPagoPayment>
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const paymentId = paymentIdFromRequest(url, body)
    const scope = url.searchParams.get('scope')
    if (!paymentId || !hasValidSignature(request, paymentId)) return NextResponse.json({ error: 'Notificación inválida.' }, { status: 401 })

    const supabase = getSupabaseServiceClient()
    if (scope === 'platform') {
      const payment = await fetchPayment(process.env.MP_ACCESS_TOKEN || '', paymentId)
      const userId = payment.external_reference
      if (!userId || payment.status !== 'approved' || Number(payment.transaction_amount) !== 25 || payment.currency_id !== 'PEN') return NextResponse.json({ ok: true })
      const { error } = await supabase.rpc('activate_platform_pro_subscription', {
        p_user_id: userId,
        p_payment_id: paymentId,
        p_amount: 25,
        p_currency: 'PEN',
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    const storeId = url.searchParams.get('store_id')
    if (!storeId) return NextResponse.json({ error: 'store_id requerido.' }, { status: 400 })
    const { data: store } = await supabase.from('stores').select('owner_id').eq('id', storeId).single()
    if (!store) return NextResponse.json({ error: 'Tienda no encontrada.' }, { status: 404 })
    const { data: profile } = await supabase.from('profiles').select('mercadopago_access_token').eq('id', store.owner_id).single()
    if (!profile?.mercadopago_access_token) return NextResponse.json({ error: 'Pasarela no configurada.' }, { status: 409 })
    const payment = await fetchPayment(decryptText(profile.mercadopago_access_token), paymentId)
    const orderId = payment.external_reference
    const order = orderId ? await supabase.from('orders').select('id, total, store_id').eq('id', orderId).eq('store_id', storeId).maybeSingle() : { data: null }
    if (!order.data || Number(payment.transaction_amount) !== Number(order.data.total) || payment.currency_id !== 'PEN') return NextResponse.json({ error: 'Pago no corresponde a la orden.' }, { status: 409 })

    if (payment.status === 'approved') {
      const { error } = await supabase.rpc('confirm_mercadopago_order_payment', { p_order_id: order.data.id, p_payment_id: paymentId, p_paid_at: payment.date_approved || new Date().toISOString() })
      if (error) throw error
    } else if (['rejected', 'cancelled'].includes(payment.status || '')) {
      await supabase.from('orders').update({ payment_status: 'rejected' }).eq('id', order.data.id).eq('status', 'pendiente_pago')
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Mercado Pago webhook error:', error)
    return NextResponse.json({ error: 'No se pudo procesar la notificación.' }, { status: 500 })
  }
}
