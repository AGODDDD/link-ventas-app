import { NextResponse } from 'next/server'
import { decryptText } from '@/lib/encryption'
import { hasValidMercadoPagoSignature } from '@/lib/mercadoPagoWebhook'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'
import { createHash, randomUUID } from 'crypto'

type MercadoPagoPayment = {
  id?: string | number
  status?: string
  transaction_amount?: number
  currency_id?: string
  external_reference?: string
  date_approved?: string
  preapproval_id?: string
}

type MercadoPagoSubscription = {
  id?: string
  status?: string
  external_reference?: string
  next_payment_date?: string
  auto_recurring?: { transaction_amount?: number | string; currency_id?: string }
}

type MercadoPagoAuthorizedPayment = {
  id?: string | number
  preapproval_id?: string
  currency_id?: string
  transaction_amount?: number | string
  debit_date?: string
  payment?: { id?: string | number; status?: string }
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

async function fetchSubscription(accessToken: string, subscriptionId: string) {
  const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscriptionId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('Mercado Pago no confirmó la suscripción')
  return response.json() as Promise<MercadoPagoSubscription>
}

async function fetchAuthorizedPayment(accessToken: string, invoiceId: string) {
  const response = await fetch(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(invoiceId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('Mercado Pago no confirmó el cobro recurrente')
  return response.json() as Promise<MercadoPagoAuthorizedPayment>
}

function subscriptionStatus(value: string | undefined) {
  if (value === 'authorized' || value === 'paused') return value
  if (value === 'canceled' || value === 'cancelled') return 'cancelled'
  return 'pending'
}

async function processNotification(request: Request, onVerified: (scope: string, id: string) => Promise<NextResponse | null>) {
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

      const duplicate = await onVerified('platform', paymentId)
      if (duplicate) return duplicate

      const topic = String(body.type ?? body.topic ?? '').trim()
      if (topic === 'subscription_preapproval') {
        const subscription = await fetchSubscription(platformAccessToken, paymentId)
        const userId = subscription.external_reference
        if (!userId || subscription.auto_recurring?.currency_id !== 'PEN' || Number(subscription.auto_recurring?.transaction_amount) !== 25) {
          return NextResponse.json({ ok: true })
        }
        const { error } = await supabase.from('platform_billing_subscriptions')
          .update({ status: subscriptionStatus(subscription.status), next_payment_at: subscription.next_payment_date || null, updated_at: new Date().toISOString() })
          .eq('provider_subscription_id', paymentId)
          .eq('user_id', userId)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      if (topic === 'subscription_authorized_payment') {
        const invoice = await fetchAuthorizedPayment(platformAccessToken, paymentId)
        if (!invoice.preapproval_id) return NextResponse.json({ ok: true })
        const subscription = await fetchSubscription(platformAccessToken, invoice.preapproval_id)
        const userId = subscription.external_reference
        if (!userId || subscription.auto_recurring?.currency_id !== 'PEN' || Number(subscription.auto_recurring?.transaction_amount) !== 25) {
          return NextResponse.json({ ok: true })
        }
        const { error: subscriptionError } = await supabase.from('platform_billing_subscriptions')
          .update({ status: subscriptionStatus(subscription.status), next_payment_at: subscription.next_payment_date || null, updated_at: new Date().toISOString() })
          .eq('provider_subscription_id', invoice.preapproval_id)
          .eq('user_id', userId)
        if (subscriptionError) throw subscriptionError
        if (invoice.payment?.status !== 'approved' || invoice.currency_id !== 'PEN' || Number(invoice.transaction_amount) !== 25) {
          return NextResponse.json({ ok: true })
        }
        const { error } = await supabase.rpc('record_platform_pro_subscription_charge', {
          p_user_id: userId,
          p_subscription_id: invoice.preapproval_id,
          p_invoice_id: String(invoice.id ?? paymentId),
          p_amount: 25,
          p_currency: 'PEN',
          p_paid_at: invoice.debit_date || new Date().toISOString(),
        })
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      const payment = await fetchPayment(platformAccessToken, paymentId)
      // Subscription charges are confirmed exclusively through their invoice
      // notification above, which binds the charge to a saved preapproval.
      if (payment.preapproval_id) return NextResponse.json({ ok: true })
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
    const duplicate = await onVerified(storeId, paymentId)
    if (duplicate) return duplicate
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

// Only a successfully authenticated delivery may enter the deduplication ledger.
// Failed processing releases its lease so provider retries remain possible.
export async function POST(request: Request) {
  const supabase = getSupabaseServiceClient()
  let claimedKey: string | null = null
  const claimToken = randomUUID()
  try {
    const response = await processNotification(request, async (scope, id) => {
      const key = createHash('sha256').update(JSON.stringify([scope, id, request.headers.get('x-request-id'), request.headers.get('x-signature')])).digest('hex')
      const { data, error } = await supabase.rpc('claim_webhook_delivery', { p_key: key, p_token: claimToken })
      if (error) throw error
      if (data === 'done') return NextResponse.json({ ok: true })
      if (data !== 'claimed') return NextResponse.json({ error: 'Notificación en proceso.' }, { status: 503 })
      claimedKey = key
      return null
    })
    if (claimedKey) {
      const result = response.ok
        ? await supabase.from('webhook_deliveries').update({ completed_at: new Date().toISOString() }).eq('delivery_key', claimedKey).eq('claim_token', claimToken)
        : await supabase.from('webhook_deliveries').delete().eq('delivery_key', claimedKey).eq('claim_token', claimToken)
      if (result.error) return NextResponse.json({ error: 'No se pudo registrar la notificación.' }, { status: 503 })
    }
    return response
  } catch {
    return NextResponse.json({ error: 'No se pudo procesar la notificación.' }, { status: 503 })
  }
}
