import { NextResponse } from 'next/server'
import { decryptText } from '@/lib/encryption'
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
    const [{ data: order }, { data: store }, { data: profile }] = await Promise.all([
      supabase.from('orders').select('id, total, status, store_id').eq('id', orderId).eq('store_id', storeId).single(),
      supabase.from('store_config').select('mercadopago_active').eq('store_id', storeId).single(),
      supabase.from('profiles').select('mercadopago_access_token, plan, plan_expires_at').eq('id', storeId).single(),
    ])
    if (!order || order.status !== 'pendiente_pago') return NextResponse.json({ error: 'Orden no disponible para pago.' }, { status: 409 })
    if (!store?.mercadopago_active || !profile?.mercadopago_access_token || !hasProFeatures(profile.plan, profile.plan_expires_at)) return NextResponse.json({ error: 'Mercado Pago no esta disponible en esta tienda.' }, { status: 403 })

    const accessToken = decryptText(profile.mercadopago_access_token)
    const amount = Number(order.total)
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Idempotency-Key': order.id },
      body: JSON.stringify({ token, transaction_amount: amount, installments, payment_method_id: paymentMethodId, issuer_id: issuerId || undefined, payer: { email }, external_reference: order.id, description: `Orden ${order.id}` }),
    })
    const payment: { id?: number | string; status?: string; transaction_amount?: number; currency_id?: string; status_detail?: string } = await mpResponse.json()
    if (!mpResponse.ok || payment.status !== 'approved' || Number(payment.transaction_amount) !== amount || payment.currency_id !== 'PEN' || !payment.id) {
      return NextResponse.json({ error: payment.status_detail || 'Pago no aprobado.' }, { status: 400 })
    }

    const { data: paidOrder, error } = await supabase.from('orders').update({ status: 'paid', metodo_pago: 'mercadopago', mercadopago_payment_id: String(payment.id), mercadopago_paid_at: new Date().toISOString(), payment_proof_url: 'MERCADOPAGO_AUTOMATIC' }).eq('id', order.id).eq('status', 'pendiente_pago').is('mercadopago_payment_id', null).select('id, legacy_id').maybeSingle()
    if (error || !paidOrder) return NextResponse.json({ error: 'Pago aprobado; estamos conciliando la orden.' }, { status: 202 })
    return NextResponse.json({ success: true, order: paidOrder })
  } catch (error) {
    console.error('Mercado Pago checkout error:', error)
    return NextResponse.json({ error: 'No se pudo procesar el pago.' }, { status: 500 })
  }
}
