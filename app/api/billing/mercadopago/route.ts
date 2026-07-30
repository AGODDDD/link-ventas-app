import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'

const PRO_AMOUNT = 25

function text(value: unknown, limit: number) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit ? value.trim() : null
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Sesion invalida.' }, { status: 401 })

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return NextResponse.json({ error: 'Facturacion no configurada.' }, { status: 503 })

  try {
    const body: Record<string, unknown> = await request.json()
    const token = text(body.token, 512)
    const paymentMethodId = text(body.payment_method_id, 80)
    const email = text(body.email, 254) || user.email || null
    const installments = Number(body.installments)
    const issuerId = text(body.issuer_id, 80)
    if (!token || !paymentMethodId || !email || !Number.isInteger(installments) || installments < 1 || installments > 36) {
      return NextResponse.json({ error: 'Datos de pago invalidos.' }, { status: 400 })
    }

    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Idempotency-Key': `pro-${user.id}-${token}` },
      body: JSON.stringify({
        token,
        transaction_amount: PRO_AMOUNT,
        installments,
        payment_method_id: paymentMethodId,
        issuer_id: issuerId || undefined,
        payer: { email },
        external_reference: user.id,
        description: 'LinkVentas Pro - 30 dias',
      }),
    })
    const payment: { id?: number | string; status?: string; transaction_amount?: number; currency_id?: string; status_detail?: string } = await paymentResponse.json()
    if (!paymentResponse.ok || payment.status !== 'approved' || Number(payment.transaction_amount) !== PRO_AMOUNT || payment.currency_id !== 'PEN' || !payment.id) {
      return NextResponse.json({ error: payment.status_detail || 'Pago no aprobado.' }, { status: 400 })
    }

    const { data, error } = await getSupabaseServiceClient().rpc('activate_platform_pro_subscription', {
      p_user_id: user.id,
      p_payment_id: String(payment.id),
      p_amount: PRO_AMOUNT,
      p_currency: 'PEN',
    })
    if (error || !data?.[0]) return NextResponse.json({ error: 'Pago aprobado; no se pudo activar el plan.' }, { status: 500 })
    return NextResponse.json({ success: true, plan: data[0].plan, plan_expires_at: data[0].plan_expires_at })
  } catch (error) {
    console.error('Platform Mercado Pago billing error:', error)
    return NextResponse.json({ error: 'No se pudo procesar el cobro.' }, { status: 500 })
  }
}
