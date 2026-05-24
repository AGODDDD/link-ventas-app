import { NextResponse } from 'next/server'
import { decryptText } from '@/lib/encryption'
import { getSupabaseServiceClient, hasProFeatures } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token_id, email, store_id, order_id } = body

    if (!token_id || !email || !store_id || !order_id) {
      return NextResponse.json({ error: 'Faltan parametros requeridos.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('culqi_secret_key, culqi_active, plan, plan_expires_at')
      .eq('id', store_id)
      .single()

    if (profileError || !profile || !profile.culqi_active || !profile.culqi_secret_key) {
      return NextResponse.json({ error: 'Tienda no configurada para Culqi.' }, { status: 403 })
    }

    if (!hasProFeatures(profile.plan, profile.plan_expires_at)) {
      return NextResponse.json({ error: 'La tienda no tiene un plan activo para pagos automaticos.' }, { status: 403 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total_amount, total, store_id')
      .eq('id', order_id)
      .eq('store_id', store_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada para el cobro.' }, { status: 404 })
    }

    if (order.status === 'paid') {
      return NextResponse.json({ error: 'La orden ya fue pagada.' }, { status: 409 })
    }

    const orderTotal = Number(order.total_amount ?? order.total ?? 0)
    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      return NextResponse.json({ error: 'Total de orden invalido.' }, { status: 400 })
    }

    let realSecretKey: string
    try {
      realSecretKey = decryptText(profile.culqi_secret_key)
    } catch (decryptError) {
      console.error('Fallo al desencriptar Secret Key:', decryptError)
      return NextResponse.json({ error: 'Error de configuracion de cifrado en la tienda.' }, { status: 500 })
    }

    const amountInCents = Math.round(orderTotal * 100)
    const response = await fetch('https://api.culqi.com/v2/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${realSecretKey}`,
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency_code: 'PEN',
        email,
        source_id: token_id,
        description: `Orden #${String(order_id).split('-')[0].toUpperCase()} en LinkVentas`,
        metadata: { order_id, store_id },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Error de Cargo Culqi:', data)
      return NextResponse.json({ error: data.merchant_message || 'Transaccion denegada.' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'paid', payment_proof_url: 'CULQI_AUTOMATIC' })
      .eq('id', order_id)
      .eq('store_id', store_id)

    if (updateError) {
      console.error('Cargo exitoso, pero fallo actualizando orden:', updateError)
      return NextResponse.json({ error: 'Pago exitoso, pero no se pudo confirmar la orden.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, charge: data })
  } catch (error: any) {
    console.error('Error en API Culqi Checkout:', error)
    return NextResponse.json({ error: 'Error interno en el procesamiento del pago.' }, { status: 500 })
  }
}
