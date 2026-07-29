import { NextResponse } from 'next/server'
import { decryptText } from '@/lib/encryption'
import { getSupabaseServiceClient, hasProFeatures } from '@/lib/supabaseServer'

type CulqiCharge = {
  id?: string
  amount?: number
  currency?: string
  currency_code?: string
  response_code?: string
  state?: string
  metadata?: { order_id?: string; store_id?: string }
}

export async function POST(req: Request) {
  try {
    const body: { object?: string; type?: string; data?: CulqiCharge | string } = await req.json()
    if (body.object !== 'event' || body.type !== 'charge.creation.succeeded') {
      return NextResponse.json({ success: true, message: 'Event type ignored' })
    }

    const eventCharge = typeof body.data === 'string' ? JSON.parse(body.data) as CulqiCharge : body.data
    const orderId = eventCharge?.metadata?.order_id
    const storeId = eventCharge?.metadata?.store_id
    const chargeId = eventCharge?.id
    if (!orderId || !storeId || !chargeId) {
      return NextResponse.json({ error: 'Missing charge metadata.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, total, store_id, culqi_charge_id')
      .eq('id', orderId)
      .eq('store_id', storeId)
      .single()
    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.status === 'paid' && order.culqi_charge_id === chargeId) {
      return NextResponse.json({ success: true, message: 'Already processed.' })
    }
    if (order.culqi_charge_id && order.culqi_charge_id !== chargeId) {
      return NextResponse.json({ error: 'Charge does not belong to this order.' }, { status: 409 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('culqi_secret_key, culqi_active, plan, plan_expires_at')
      .eq('id', storeId)
      .single()
    if (!profile?.culqi_active || !profile.culqi_secret_key || !hasProFeatures(profile.plan, profile.plan_expires_at)) {
      return NextResponse.json({ error: 'Store cannot process Culqi payments.' }, { status: 403 })
    }

    let secretKey: string
    try {
      secretKey = decryptText(profile.culqi_secret_key)
    } catch (error) {
      console.error('Culqi webhook decryption failed:', error)
      return NextResponse.json({ error: 'Decryption failure.' }, { status: 500 })
    }

    const verificationResponse = await fetch(`https://api.culqi.com/v2/charges/${encodeURIComponent(chargeId)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    if (!verificationResponse.ok) {
      return NextResponse.json({ error: 'Charge verification failed.' }, { status: 403 })
    }

    const verifiedCharge: CulqiCharge = await verificationResponse.json()
    const expectedAmount = Math.round(Number(order.total) * 100)
    const chargeCurrency = verifiedCharge.currency ?? verifiedCharge.currency_code
    const metadataMatches = verifiedCharge.metadata?.order_id === orderId && verifiedCharge.metadata?.store_id === storeId
    const isSuccessful = verifiedCharge.response_code === 'venta_exitosa' && verifiedCharge.state === 'Exitosa'

    if (
      verifiedCharge.id !== chargeId ||
      !metadataMatches ||
      chargeCurrency !== 'PEN' ||
      !isSuccessful ||
      Number(verifiedCharge.amount) !== expectedAmount
    ) {
      console.error('Rejected Culqi webhook:', { chargeId, orderId, storeId, verifiedCharge })
      return NextResponse.json({ error: 'Charge validation mismatch.' }, { status: 400 })
    }

    const { data: paidOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        culqi_charge_id: chargeId,
        culqi_paid_at: new Date().toISOString(),
        payment_proof_url: 'CULQI_AUTOMATIC',
      })
      .eq('id', orderId)
      .eq('store_id', storeId)
      .or(`culqi_charge_id.is.null,culqi_charge_id.eq.${chargeId}`)
      .select('id')
      .maybeSingle()

    if (updateError || !paidOrder) {
      console.error('Culqi webhook update failed:', updateError)
      return NextResponse.json({ error: 'Order update failed.' }, { status: 409 })
    }

    return NextResponse.json({ success: true, message: 'Order verified and marked as paid.' })
  } catch (error) {
    console.error('Culqi webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing error.' }, { status: 500 })
  }
}
