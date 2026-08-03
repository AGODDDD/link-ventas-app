import { NextResponse } from 'next/server'
import { getPublicAppOrigin } from '@/lib/appUrl'
import { getRateLimitKey } from '@/lib/rateLimit'
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

    const { data: allowed, error: limitError } = await getSupabaseServiceClient().rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: getRateLimitKey(request, 'platform-payment-attempt', [user.id]),
      p_limit: 5,
      p_window_seconds: 3600,
    })
    if (limitError) throw limitError
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos de pago. Intenta nuevamente más tarde.' }, { status: 429 })

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
        notification_url: `${getPublicAppOrigin(request.url)}/api/webhooks/mercadopago?scope=platform`,
      }),
    })
    const payment: { id?: number | string; status?: string; transaction_amount?: number; currency_id?: string; status_detail?: string } = await paymentResponse.json()
    if (!paymentResponse.ok || Number(payment.transaction_amount) !== PRO_AMOUNT || payment.currency_id !== 'PEN' || !payment.id) {
      return NextResponse.json({ error: payment.status_detail || 'Pago no pudo ser procesado.' }, { status: 400 })
    }
    // El webhook de Mercado Pago confirma y activa el plan de forma idempotente.
    return NextResponse.json({ accepted: true, payment_id: String(payment.id), payment_status: payment.status ?? 'pending' }, { status: 202 })
  } catch (error) {
    console.error('Platform Mercado Pago billing error:', error)
    return NextResponse.json({ error: 'No se pudo procesar el cobro.' }, { status: 500 })
  }
}
