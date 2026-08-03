export type OrderPaymentMethod = 'mercadopago' | 'tarjeta_mercadopago' | 'whatsapp' | 'transferencia' | 'contra_entrega'

/**
 * Mercado Pago card checkout is a UI-specific label; the database contract
 * stores all Mercado Pago orders under the canonical `mercadopago` value.
 */
export function normalizeOrderPaymentMethod(value: string): Exclude<OrderPaymentMethod, 'tarjeta_mercadopago'> {
  return value === 'tarjeta_mercadopago' ? 'mercadopago' : value as Exclude<OrderPaymentMethod, 'tarjeta_mercadopago'>
}
