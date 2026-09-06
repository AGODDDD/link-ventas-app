import { Product, ProductModifierGroup } from '@/types/tienda'

export function formatRestaurantMinimumOrder(minimumOrderAmount?: number) {
  return typeof minimumOrderAmount === 'number'
    && Number.isFinite(minimumOrderAmount)
    && minimumOrderAmount > 0
    ? `Pedido mínimo: S/ ${minimumOrderAmount.toFixed(2)}`
    : null
}

/**
 * A product with a required modifier cannot be added from the card shortcut:
 * the customer must first choose the required option in the product modal.
 */
export function requiresRestaurantProductConfiguration(product: Product) {
  return (product.variants || []).some((variant): variant is ProductModifierGroup => (
    'required' in variant && variant.required === true
  ))
}
