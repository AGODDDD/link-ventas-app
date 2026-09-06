import { NextResponse } from 'next/server'
import { decryptText } from '@/lib/encryption'
import { getPublicAppOrigin } from '@/lib/appUrl'
import { getRateLimitKey } from '@/lib/rateLimit'
import { getSupabaseServiceClient, hasProFeatures } from '@/lib/supabaseServer'

function stringValue(value: unknown, limit = 255) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit ? value.trim() : null
}

export async function POST(request: Request) {
  try {
    const body: Record<string, unknown> = await request.json()
    const orderId = stringValue(body.order_id, 64)
    const storeId = stringValue(body.store_id, 64)
    const token = stringValue(body.token, 512)
    const email = stringValue(body.email, 254)
    const paymentMethodId = stringValue(body.payment_method_id, 80)
    const installments = Number(body.installments)
    const issuerId = stringValue(body.issuer_id, 80)
    if (!orderId || !storeId || !token || !email || !paymentMethodId || !Number.isInteger(installments) || installments < 1 || installments > 36) {
      return NextResponse.json({ error: 'Datos de pago invalidos.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const { error: expiryError } = await supabase.rpc('expire_order_reservations', { p_store_id: storeId })
    if (expiryError) throw expiryError
    const [{ data: order }, { data: config }, { data: store }] = await Promise.all([
      supabase.from('orders').select('id, total, status, store_id').eq('id', orderId).eq('store_id', storeId).single(),
      supabase.from('store_config').select('mercadopago_active').eq('store_id', storeId).single(),
      supabase.from('stores').select('owner_id').eq('id', storeId).single(),
    ])
    const { data: profile } = store
      ? await supabase.from('profiles').select('mercadopago_access_token, plan, plan_expires_at').eq('id', store.owner_id).single()
      : { data: null }
    if (!order || order.status !== 'pendiente_pago') return NextResponse.json({ error: 'Orden no disponible para pago.' }, { status: 409 })
    if (!config?.mercadopago_active || !profile?.mercadopago_access_token || !hasProFeatures(profile.plan, profile.plan_expires_at)) return NextResponse.json({ error: 'Mercado Pago no esta disponible en esta tienda.' }, { status: 403 })

    const { data: allowed, error: limitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: getRateLimitKey(request, 'store-payment-attempt', [storeId, orderId]),
      p_limit: 8,
      p_window_seconds: 900,
    })
    if (limitError) throw limitError
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos de pago. Intenta nuevamente más tarde.' }, { status: 429 })

    const accessToken = decryptText(profile.mercadopago_access_token)
    const amount = Number(order.total)
    const notificationUrl = `${getPublicAppOrigin(request.url)}/api/webhooks/mercadopago?store_id=${storeId}`
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Idempotency-Key': order.id },
      body: JSON.stringify({ token, transaction_amount: amount, installments, payment_method_id: paymentMethodId, issuer_id: issuerId || undefined, payer: { email }, external_reference: order.id, description: `Orden ${order.id}`, notification_url: notificationUrl }),
    })
    const payment: { id?: number | string; status?: string; transaction_amount?: number; currency_id?: string; status_detail?: string; message?: string } = await mpResponse.json()
    if (!mpResponse.ok || Number(payment.transaction_amount) !== amount || payment.currency_id !== 'PEN' || !payment.id) {
      console.error('Mercado Pago rechazó el pago:', { httpStatus: mpResponse.status })
      return NextResponse.json({ error: 'Pago no pudo ser procesado. Revisa los datos o utiliza otro medio de pago.' }, { status: 400 })
    }

    // La confirmación final y el descuento de stock ocurren exclusivamente en el webhook.
    return NextResponse.json({ accepted: true, payment_id: String(payment.id), payment_status: payment.status ?? 'pending' }, { status: 202 })
  } catch (error) {
    console.error('Mercado Pago checkout error:', error)
    return NextResponse.json({ error: 'No se pudo procesar el pago.' }, { status: 500 })
  }
}
