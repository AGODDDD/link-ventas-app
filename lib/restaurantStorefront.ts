export function formatRestaurantMinimumOrder(minimumOrderAmount?: number) {
  return typeof minimumOrderAmount === 'number'
    && Number.isFinite(minimumOrderAmount)
    && minimumOrderAmount > 0
    ? `Pedido mínimo: S/ ${minimumOrderAmount.toFixed(2)}`
    : null
}
