import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabaseServer'
import { isStoreClosed, shouldEnforceStoreSchedule } from '@/lib/storeSchedule'
import { normalizeOrderPaymentMethod } from '@/lib/orderPayment'
import { getRateLimitKey } from '@/lib/rateLimit'
import { boundedJson, InvalidRequestBody } from '@/lib/requestBody'

type CartLine = {
  product_id?: unknown
  quantity?: unknown
  variant_details?: unknown
}

const paymentMethods = new Set(['mercadopago', 'tarjeta_mercadopago', 'whatsapp', 'transferencia', 'contra_entrega'])
const orderTypes = new Set(['delivery', 'pickup', 'standard'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function asText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(req: Request) {
  try {
    const body = await boundedJson(req)
    const storeId = asText(body.store_id, 64)
    const orderType = asText(body.order_type, 24)
    const requestedPaymentMethod = asText(body.payment_method, 32)
    const paymentMethod = normalizeOrderPaymentMethod(requestedPaymentMethod)
    const customerName = asText(body.customer_name, 160)
    const customerPhone = asText(body.customer_phone, 40)
    const items = Array.isArray(body.items) ? body.items : []

    if (!uuidPattern.test(storeId) || !orderTypes.has(orderType) || !paymentMethods.has(requestedPaymentMethod)) {
      return NextResponse.json({ error: 'Solicitud de orden invalida.' }, { status: 400 })
    }

    if (customerName.length < 3 || !/^\d{7,15}$/.test(customerPhone.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Datos del cliente invalidos.' }, { status: 400 })
    }

    if ((orderType === 'delivery' || orderType === 'standard') && asText(body.address, 500).length < 5) {
      return NextResponse.json({ error: 'Direccion invalida.' }, { status: 400 })
    }

    const customerEmail = asText(body.customer_email, 254).toLowerCase()
    if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) {
      return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 })
    }

    const paymentProof = asText(body.payment_proof_url, 500)
    if (paymentMethod === 'transferencia' && !new RegExp(`^${storeId}/[0-9a-f-]{36}\\.(?:jpg|png|webp)$`, 'i').test(paymentProof)) {
      return NextResponse.json({ error: 'Adjunta un comprobante de transferencia válido.' }, { status: 400 })
    }

    if (items.length > 50) return NextResponse.json({ error: 'El carrito supera el límite de productos.' }, { status: 400 })
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

    if (shouldEnforceStoreSchedule(operations.accepts_orders_always) && isStoreClosed(storeConfig?.store_schedule)) {
      return NextResponse.json({ error: 'La tienda está cerrada en este momento.' }, { status: 409 })
    }

    if (store.template_type === 'restaurante') {
      const minimumOrder = Number(operations.min_order_amount)
      if (Number.isFinite(minimumOrder) && minimumOrder > 0) {
        const productIds = [...new Set(normalizedItems.map(item => item.product_id))]
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('id, price, variants')
          .in('id', productIds)
          .eq('user_id', storeId)
          .eq('is_active', true)

        if (productsError || !products || products.length !== productIds.length) {
          return NextResponse.json({ error: 'No se pudo validar el total del pedido.' }, { status: 409 })
        }

        const subtotal = normalizedItems.reduce((total, item) => {
          const product = products.find(candidate => candidate.id === item.product_id)
          const selectedOptions = (item.variant_details as { options?: Record<string, string[]> } | null)?.options || {}
          const modifiers = Array.isArray(product?.variants) ? product.variants.reduce((sum: number, group: any) => {
            const selected = selectedOptions[group?.id] || []
            return sum + (Array.isArray(group?.options) ? group.options.reduce((optionSum: number, option: any) => (
              selected.includes(option?.id) ? optionSum + Number(option?.price_modifier || 0) : optionSum
            ), 0) : 0)
          }, 0) : 0
          return total + (Number(product?.price || 0) + modifiers) * item.quantity
        }, 0)

        if (subtotal < minimumOrder) {
          return NextResponse.json({ error: `El pedido mínimo es S/ ${minimumOrder.toFixed(2)}.` }, { status: 409 })
        }
      }
    }

    // A public order creates an inventory reservation. Bound it per client and
    // store so automated traffic cannot hold a merchant's stock hostage.
    const { data: allowed, error: limitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: getRateLimitKey(req, 'order-create', [storeId]),
      p_limit: 5,
      p_window_seconds: 900,
    })
    if (limitError) throw limitError
    if (!allowed) return NextResponse.json({ error: 'Demasiados pedidos en poco tiempo. Intenta nuevamente más tarde.' }, { status: 429 })

    const { data: phoneAllowed, error: phoneLimitError } = await supabase.rpc('consume_abandoned_cart_rate_limit', {
      p_client_key: getRateLimitKey(req, 'order-phone', [storeId, customerPhone.replace(/\s/g, '')]),
      p_limit: 3, p_window_seconds: 900,
    })
    if (phoneLimitError) throw phoneLimitError
    if (!phoneAllowed) return NextResponse.json({ error: 'Demasiados pedidos pendientes. Intenta más tarde.' }, { status: 429 })

    const latitude = typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : null
    const longitude = typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : null
    const { data, error } = await supabase.rpc('create_order_from_cart', {
      p_store_id: storeId,
      p_order_type: orderType,
      p_payment_method: paymentMethod,
      p_customer_name: customerName,
      p_customer_phone: customerPhone.replace(/\s/g, ''),
      p_customer_email: customerEmail || null,
      p_address: asText(body.address, 500) || null,
      p_reference: asText(body.reference, 500) || null,
      p_lat: latitude,
      p_lng: longitude,
      p_items: normalizedItems,
      p_payment_proof_url: paymentProof || null,
    })

    if (error || !data?.[0]) {
      console.error('Order creation failed:', error)
      return NextResponse.json({ error: 'No se pudo crear la orden.' }, { status: 422 })
    }

    return NextResponse.json({ order: data[0] }, { status: 201 })
  } catch (error) {
    if (error instanceof InvalidRequestBody) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Order API error:', error)
    return NextResponse.json({ error: 'Error interno al crear la orden.' }, { status: 500 })
  }
}
