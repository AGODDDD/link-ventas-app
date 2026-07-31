import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'
import { isStoreClosed } from '@/lib/storeSchedule'

type CartLine = {
  product_id?: unknown
  quantity?: unknown
  variant_details?: unknown
}

const paymentMethods = new Set(['mercadopago', 'tarjeta_mercadopago', 'whatsapp', 'transferencia', 'contra_entrega'])
const orderTypes = new Set(['delivery', 'pickup', 'standard'])

function asText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(req: Request) {
  try {
    const body: Record<string, unknown> = await req.json()
    const storeId = asText(body.store_id, 64)
    const orderType = asText(body.order_type, 24)
    const paymentMethod = asText(body.payment_method, 32)
    const customerName = asText(body.customer_name, 160)
    const customerPhone = asText(body.customer_phone, 40)
    const items = Array.isArray(body.items) ? body.items : []

    if (!storeId || !orderTypes.has(orderType) || !paymentMethods.has(paymentMethod)) {
      return NextResponse.json({ error: 'Solicitud de orden invalida.' }, { status: 400 })
    }

    if (customerName.length < 3 || !/^\d{7,15}$/.test(customerPhone.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Datos del cliente invalidos.' }, { status: 400 })
    }

    if ((orderType === 'delivery' || orderType === 'standard') && asText(body.address, 500).length < 5) {
      return NextResponse.json({ error: 'Direccion invalida.' }, { status: 400 })
    }

    if (paymentMethod === 'transferencia' && !asText(body.payment_proof_url, 500)) {
      return NextResponse.json({ error: 'Adjunta un comprobante de transferencia.' }, { status: 400 })
    }

    const normalizedItems = items.map((item: CartLine) => ({
      product_id: asText(item?.product_id, 64),
      quantity: Number(item?.quantity),
      variant_details: item?.variant_details && typeof item.variant_details === 'object' ? item.variant_details : null,
    }))

    if (!normalizedItems.length || normalizedItems.some((item) => !item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) {
      return NextResponse.json({ error: 'El carrito contiene productos invalidos.' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()
    const [{ data: store }, { data: storeConfig }] = await Promise.all([
      supabase.from('stores').select('id, template_type, is_active').eq('id', storeId).maybeSingle(),
      supabase.from('store_config').select('operations_config, store_schedule').eq('store_id', storeId).maybeSingle(),
    ])

    if (!store?.is_active) {
      return NextResponse.json({ error: 'La tienda no está recibiendo pedidos.' }, { status: 409 })
    }

    const operations = (storeConfig?.operations_config || {}) as Record<string, unknown>
    if (store.template_type === 'restaurante') {
      if (orderType === 'delivery' && operations.delivery_enabled === false) {
        return NextResponse.json({ error: 'El delivery no está disponible.' }, { status: 409 })
      }
      if (orderType === 'pickup' && operations.pickup_enabled !== true) {
        return NextResponse.json({ error: 'El recojo no está disponible.' }, { status: 409 })
      }
    }

    if (operations.accepts_orders_always !== true && isStoreClosed(storeConfig?.store_schedule)) {
      return NextResponse.json({ error: 'La tienda está cerrada en este momento.' }, { status: 409 })
    }

    const latitude = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : null
    const longitude = typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : null
    const { data, error } = await supabase.rpc('create_order_from_cart', {
      p_store_id: storeId,
      p_order_type: orderType,
      p_payment_method: paymentMethod,
      p_customer_name: customerName,
      p_customer_phone: customerPhone.replace(/\s/g, ''),
      p_customer_email: asText(body.customer_email, 254) || null,
      p_address: asText(body.address, 500) || null,
      p_reference: asText(body.reference, 500) || null,
      p_lat: latitude,
      p_lng: longitude,
      p_items: normalizedItems,
      p_payment_proof_url: asText(body.payment_proof_url, 500) || null,
    })

    if (error || !data?.[0]) {
      console.error('Order creation failed:', error)
      return NextResponse.json({ error: 'No se pudo crear la orden.' }, { status: 422 })
    }

    return NextResponse.json({ order: data[0] }, { status: 201 })
  } catch (error) {
    console.error('Order API error:', error)
    return NextResponse.json({ error: 'Error interno al crear la orden.' }, { status: 500 })
  }
}
