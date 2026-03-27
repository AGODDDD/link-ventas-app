import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, Product } from '@/types/tienda'

interface CartStore {
  // carts[storeId] = CartItem[]
  carts: Record<string, CartItem[]>
  addToCart: (storeId: string, product: Product) => void
  removeFromCart: (storeId: string, productId: string) => void
  updateQuantity: (storeId: string, productId: string, delta: number) => void
  clearCart: (storeId: string) => void
  getTotalItems: (storeId: string) => number
  getTotalPrice: (storeId: string) => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      carts: {},
      
      addToCart: (storeId, product) => set((state) => {
        const storeCart = state.carts[storeId] || []
        const existing = storeCart.find(item => item.product.id === product.id)
        
        let newStoreCart
        if (existing) {
          newStoreCart = storeCart.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        } else {
          newStoreCart = [...storeCart, { product, quantity: 1 }]
        }
        
        return { carts: { ...state.carts, [storeId]: newStoreCart } }
      }),
      
      removeFromCart: (storeId, productId) => set((state) => {
        const storeCart = state.carts[storeId] || []
        const newStoreCart = storeCart.filter(item => item.product.id !== productId)
        return { carts: { ...state.carts, [storeId]: newStoreCart } }
      }),
      
      updateQuantity: (storeId, productId, delta) => set((state) => {
        const storeCart = state.carts[storeId] || []
        const newStoreCart = storeCart.map(item => {
          if (item.product.id === productId) {
            const newQuantity = Math.max(0, item.quantity + delta)
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
        return storeCart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
      }
    }),
    {
      name: 'link-ventas-cart-storage',
    }
  )
)
