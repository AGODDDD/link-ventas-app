import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, Product, ProductModifierGroup } from '@/types/tienda'

const MAX_QUANTITY_PER_LINE = 100

function productQuantityLimit(product: Product) {
  if (product.stock === null || product.stock === undefined) return MAX_QUANTITY_PER_LINE
  return Math.max(0, Math.min(MAX_QUANTITY_PER_LINE, Math.floor(product.stock)))
}

function stableVariantKey(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableVariantKey).sort().join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableVariantKey(entry)}`)
      .join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

function sameVariant(a: unknown, b: unknown) {
  return stableVariantKey(a) === stableVariantKey(b)
}

interface CartStore {
  // carts[storeId] = CartItem[]
  carts: Record<string, CartItem[]>
  addToCart: (storeId: string, product: Product, variantDetails?: any) => void
  removeFromCart: (storeId: string, productId: string, variantDetails?: any) => void
  updateQuantity: (storeId: string, productId: string, variantDetails: any, delta: number) => void
  clearCart: (storeId: string) => void
  getTotalItems: (storeId: string) => number
  getTotalPrice: (storeId: string) => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      carts: {},
      
      addToCart: (storeId, product, variantDetails) => set((state) => {
        const storeCart = state.carts[storeId] || []
        const isSameItem = (item: CartItem) => item.product.id === product.id && sameVariant(item.variantDetails, variantDetails)
        const existing = storeCart.find(isSameItem)
        const quantityLimit = productQuantityLimit(product)

        if (quantityLimit === 0) return state
        
        let newStoreCart
        if (existing) {
          newStoreCart = storeCart.map(item =>
            isSameItem(item)
              ? { ...item, product, quantity: Math.min(quantityLimit, item.quantity + 1) }
              : item
          )
        } else {
          newStoreCart = [...storeCart, { product, quantity: 1, variantDetails }]
        }
        
        return { carts: { ...state.carts, [storeId]: newStoreCart } }
      }),
      
      removeFromCart: (storeId, productId, variantDetails) => set((state) => {
        const storeCart = state.carts[storeId] || []
        const newStoreCart = storeCart.filter(item => !(item.product.id === productId && sameVariant(item.variantDetails, variantDetails)))
        return { carts: { ...state.carts, [storeId]: newStoreCart } }
      }),
      
      updateQuantity: (storeId, productId, variantDetails, delta) => set((state) => {
        const storeCart = state.carts[storeId] || []
        const newStoreCart = storeCart.map(item => {
          if (item.product.id === productId && sameVariant(item.variantDetails, variantDetails)) {
            const newQuantity = Math.min(productQuantityLimit(item.product), Math.max(0, item.quantity + delta))
            return { ...item, quantity: newQuantity }
          }
          return item
        }).filter(item => item.quantity > 0)
        
        return { carts: { ...state.carts, [storeId]: newStoreCart } }
      }),
      
      clearCart: (storeId) => set((state) => ({
        carts: { ...state.carts, [storeId]: [] }
      })),
      
      getTotalItems: (storeId) => {
        const storeCart = get().carts[storeId] || []
        return storeCart.reduce((acc, item) => acc + item.quantity, 0)
      },
      
      getTotalPrice: (storeId) => {
        const storeCart = get().carts[storeId] || []
        return storeCart.reduce((acc, item) => {
           let modifiersPrice = 0;
           if (item.variantDetails?.options && item.product.variants) {
              const groups = item.product.variants as ProductModifierGroup[];
              Object.entries(item.variantDetails.options as Record<string, string[]>).forEach(([groupId, optionIds]) => {
                 const group = groups.find(g => g.id === groupId);
                 if (group) {
                    optionIds.forEach(optId => {
                       const opt = group.options.find(o => o.id === optId);
                       if (opt) modifiersPrice += opt.price_modifier;
                    });
                 }
              });
           }
           const unitPrice = item.product.price + modifiersPrice;
           return acc + (unitPrice * item.quantity);
        }, 0)
      }
    }),
    {
      name: 'link-ventas-cart-storage',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<CartStore> | undefined
        const carts = Object.fromEntries(
          Object.entries(state?.carts || {}).map(([storeId, cart]) => [
            storeId,
            (Array.isArray(cart) ? cart : []).filter((item): item is CartItem =>
              Boolean(item?.product?.id) &&
              Number.isFinite(item.product.price) &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0
            ).map(item => ({ ...item, quantity: Math.min(productQuantityLimit(item.product), item.quantity) }))
              .filter(item => item.quantity > 0),
          ])
        )
        return { carts } as CartStore
      },
    }
  )
)
