import { NextResponse } from 'next/server'
import { decryptText } from '@/lib/encryption'
import { hasValidMercadoPagoSignature } from '@/lib/mercadoPagoWebhook'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'

type MercadoPagoPayment = {
  id?: string | number
  status?: string
  transaction_amount?: number
  currency_id?: string
  external_reference?: string
  date_approved?: string
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function paymentIdFromRequest(url: URL, body: Record<string, unknown>) {
  const data = body.data as Record<string, unknown> | undefined
  return String(data?.id ?? body.id ?? url.searchParams.get('data.id') ?? '').trim()
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
    const supabase = getSupabaseServiceClient()
    if (scope === 'platform') {
      const webhookSecret = process.env.MP_WEBHOOK_SECRET
      const platformAccessToken = process.env.MP_ACCESS_TOKEN
      if (!webhookSecret || !platformAccessToken) return NextResponse.json({ error: 'Facturación no configurada.' }, { status: 503 })
      if (!paymentId || !hasValidMercadoPagoSignature(
        request.headers.get('x-signature'), request.headers.get('x-request-id'), paymentId, webhookSecret,
      )) return NextResponse.json({ error: 'Notificación inválida.' }, { status: 401 })
      const payment = await fetchPayment(platformAccessToken, paymentId)
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
    if (!storeId || !uuidPattern.test(storeId)) return NextResponse.json({ error: 'store_id inválido.' }, { status: 400 })
    const { data: store } = await supabase.from('stores').select('owner_id').eq('id', storeId).single()
    if (!store) return NextResponse.json({ error: 'Tienda no encontrada.' }, { status: 404 })
    const { data: profile } = await supabase.from('profiles').select('mercadopago_access_token, mercadopago_webhook_secret').eq('id', store.owner_id).single()
    if (!profile?.mercadopago_access_token || !profile.mercadopago_webhook_secret) return NextResponse.json({ error: 'Pasarela no configurada.' }, { status: 409 })
    if (!paymentId || !hasValidMercadoPagoSignature(
      request.headers.get('x-signature'), request.headers.get('x-request-id'), paymentId, decryptText(profile.mercadopago_webhook_secret),
    )) return NextResponse.json({ error: 'Notificación inválida.' }, { status: 401 })
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
