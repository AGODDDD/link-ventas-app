import { NextResponse } from 'next/server'
import { decryptText } from '@/lib/encryption'
import { getSupabaseServiceClient, hasProFeatures } from '@/lib/supabaseServer'

function asIdentifier(value: unknown) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 ? value : null
}

export async function POST(req: Request) {
  try {
    const body: Record<string, unknown> = await req.json()
    const tokenId = asIdentifier(body.token_id)
    const storeId = asIdentifier(body.store_id)
    const orderId = asIdentifier(body.order_id)
    const email = typeof body.email === 'string' && body.email.length <= 254 ? body.email : null

    if (!tokenId || !email || !storeId || !orderId) {
      return NextResponse.json({ error: 'Faltan parametros requeridos.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total, store_id, culqi_charge_id')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada para el cobro.' }, { status: 404 })
    }
    if (order.status === 'paid' || order.culqi_charge_id) {
      return NextResponse.json({ error: 'La orden ya tiene un cargo registrado.' }, { status: 409 })
    }
    if (order.status !== 'pendiente_pago') {
      return NextResponse.json({ error: 'La orden no esta disponible para pago con Culqi.' }, { status: 409 })
    }

    const orderTotal = Number(order.total)
    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      return NextResponse.json({ error: 'Total de orden invalido.' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('culqi_secret_key, culqi_active, plan, plan_expires_at')
      .eq('id', storeId)
      .single()

    if (profileError || !profile || !profile.culqi_active || !profile.culqi_secret_key) {
      return NextResponse.json({ error: 'Tienda no configurada para Culqi.' }, { status: 403 })
    }
    if (!hasProFeatures(profile.plan, profile.plan_expires_at)) {
      return NextResponse.json({ error: 'La tienda no tiene un plan activo para pagos automaticos.' }, { status: 403 })
    }

    let secretKey: string
    try {
      secretKey = decryptText(profile.culqi_secret_key)
    } catch (error) {
      console.error('Culqi key decryption failed:', error)
      return NextResponse.json({ error: 'Error de configuracion de cifrado en la tienda.' }, { status: 500 })
    }

    const expectedAmount = Math.round(orderTotal * 100)
    const response = await fetch('https://api.culqi.com/v2/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
      body: JSON.stringify({
        amount: expectedAmount,
        currency_code: 'PEN',
        capture: true,
        email,
        source_id: tokenId,
        description: `Orden ${orderId} en LinkVentas`,
        metadata: { order_id: orderId, store_id: storeId },
      }),
    })

    const charge: { id?: string; response_code?: string; currency?: string; amount?: number; merchant_message?: string } = await response.json()
    if (!response.ok || !charge.id || charge.response_code !== 'venta_exitosa' || charge.currency !== 'PEN' || Number(charge.amount) !== expectedAmount) {
      console.error('Culqi charge rejected:', charge)
      return NextResponse.json({ error: charge.merchant_message || 'Transaccion denegada.' }, { status: 400 })
    }

    const { data: claimedOrder, error: claimError } = await supabase
      .from('orders')
      .update({ culqi_charge_id: charge.id, payment_proof_url: 'CULQI_PENDING_WEBHOOK' })
      .eq('id', orderId)
      .eq('store_id', storeId)
      .eq('status', 'pendiente_pago')
      .is('culqi_charge_id', null)
      .select('id')
      .maybeSingle()

    if (claimError || !claimedOrder) {
      console.error('Culqi charge could not be claimed:', claimError)
      return NextResponse.json({ error: 'Pago recibido; estamos conciliando la orden.' }, { status: 202 })
    }

    // El webhook, tras validar el cargo contra Culqi, es el único que confirma paid.
    return NextResponse.json({ success: true, charge_id: charge.id, status: 'pending_confirmation' })
  } catch (error) {
    console.error('Culqi checkout error:', error)
    return NextResponse.json({ error: 'Error interno en el procesamiento del pago.' }, { status: 500 })
  }
}
