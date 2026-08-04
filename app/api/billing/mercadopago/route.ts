import { NextResponse } from 'next/server'
import { getPublicAppOrigin } from '@/lib/appUrl'
import { getRateLimitKey } from '@/lib/rateLimit'
import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'

const PRO_AMOUNT = 25

type MercadoPagoPreapproval = {
  id?: string
  init_point?: string
  status?: string
  next_payment_date?: string
}

function isCheckoutUrl(value: unknown) {
  return typeof value === 'string' && /^https:\/\//i.test(value)
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user?.email) return NextResponse.json({ error: 'Sesion invalida.' }, { status: 401 })

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return NextResponse.json({ error: 'Facturacion no configurada.' }, { status: 503 })

  try {
    const supabase = getSupabaseServiceClient()
    const { data: existing, error: existingError } = await supabase
      .from('platform_billing_subscriptions')
      .select('status, checkout_url')
      .eq('user_id', user.id)
      .in('status', ['pending', 'authorized'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing?.status === 'authorized') {
      return NextResponse.json({ error: 'Ya tienes una suscripcion Pro activa.' }, { status: 409 })
    }
    if (existing?.checkout_url) return NextResponse.json({ checkout_url: existing.checkout_url })

    const { data: allowed, error: limitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: getRateLimitKey(request, 'platform-subscription-create', [user.id]),
      p_limit: 5,
      p_window_seconds: 3600,
    })
    if (limitError) throw limitError
    if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, { status: 429 })

    const origin = getPublicAppOrigin(request.url)
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        reason: 'LinkVentas Pro - suscripcion mensual',
        external_reference: user.id,
        payer_email: user.email,
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: PRO_AMOUNT, currency_id: 'PEN' },
        back_url: `${origin}/pendiente`,
        notification_url: `${origin}/api/webhooks/mercadopago?scope=platform`,
      }),
    })
    const subscription = await response.json() as MercadoPagoPreapproval
    if (!response.ok || !subscription.id || !isCheckoutUrl(subscription.init_point)) {
      return NextResponse.json({ error: 'No se pudo iniciar la suscripcion.' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('platform_billing_subscriptions').insert({
      user_id: user.id,
      provider_subscription_id: subscription.id,
      status: subscription.status === 'authorized' ? 'authorized' : 'pending',
      checkout_url: subscription.init_point,
      next_payment_at: subscription.next_payment_date || null,
    })
    if (insertError) throw insertError
    return NextResponse.json({ checkout_url: subscription.init_point })
  } catch (error) {
    console.error('Platform Mercado Pago subscription error:', error)
    return NextResponse.json({ error: 'No se pudo iniciar la suscripcion.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Sesion invalida.' }, { status: 401 })
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) return NextResponse.json({ error: 'Facturacion no configurada.' }, { status: 503 })

  try {
    const supabase = getSupabaseServiceClient()
    const { data: subscription, error } = await supabase
      .from('platform_billing_subscriptions')
      .select('id, provider_subscription_id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'authorized', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!subscription) return NextResponse.json({ cancelled: false })

    const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscription.provider_subscription_id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status: 'canceled' }),
    })
    if (!response.ok) return NextResponse.json({ error: 'No se pudo cancelar la suscripcion en Mercado Pago.' }, { status: 502 })
    const { error: updateError } = await supabase.from('platform_billing_subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', subscription.id)
    if (updateError) throw updateError
    return NextResponse.json({ cancelled: true })
  } catch (error) {
    console.error('Platform Mercado Pago cancellation error:', error)
    return NextResponse.json({ error: 'No se pudo cancelar la suscripcion.' }, { status: 500 })
  }
}
