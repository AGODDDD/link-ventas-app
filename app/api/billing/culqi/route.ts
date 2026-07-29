import { NextResponse } from 'next/server'
import { getAuthenticatedUser, getSupabaseServiceClient } from '@/lib/supabaseServer'

const PRO_AMOUNT = 2900

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Sesion invalida.' }, { status: 401 })

  const secretKey = process.env.CULQI_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Facturacion no configurada.' }, { status: 503 })

  try {
    const body: Record<string, unknown> = await request.json()
    const tokenId = typeof body.token_id === 'string' ? body.token_id : ''
    const email = typeof body.email === 'string' ? body.email.trim() : user.email || ''
    if (!tokenId || !email) return NextResponse.json({ error: 'Datos de pago invalidos.' }, { status: 400 })

    const chargeResponse = await fetch('https://api.culqi.com/v2/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
      body: JSON.stringify({
        amount: PRO_AMOUNT,
        currency_code: 'PEN',
        capture: true,
        email,
        source_id: tokenId,
        description: `LinkVentas Pro - ${user.id}`,
        metadata: { user_id: user.id, product: 'linkventas_pro_monthly' },
      }),
    })
    const charge: { id?: string; amount?: number; currency?: string; response_code?: string; state?: string; merchant_message?: string } = await chargeResponse.json()
    const successful = chargeResponse.ok && charge.id && charge.amount === PRO_AMOUNT && charge.currency === 'PEN' && charge.response_code === 'venta_exitosa' && charge.state === 'Exitosa'
    if (!successful) return NextResponse.json({ error: charge.merchant_message || 'Pago no aprobado.' }, { status: 400 })

    const { data, error } = await getSupabaseServiceClient().rpc('activate_platform_pro_subscription', {
      p_user_id: user.id,
      p_charge_id: charge.id,
      p_amount: PRO_AMOUNT,
      p_currency: 'PEN',
    })
    if (error || !data?.[0]) return NextResponse.json({ error: 'Pago aprobado; no se pudo activar el plan.' }, { status: 500 })

    return NextResponse.json({ success: true, plan: data[0].plan, plan_expires_at: data[0].plan_expires_at })
  } catch (error) {
    console.error('Platform Culqi billing error:', error)
    return NextResponse.json({ error: 'No se pudo procesar el cobro.' }, { status: 500 })
  }
}
