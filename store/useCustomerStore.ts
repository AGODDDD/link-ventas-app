import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image_url?: string;
  options?: string; // Summary of modifiers
  notes?: string;
}

export interface Order {
  id: string;
  storeId: string;
  storeName: string;
  date: string; // ISO string
  status: 'pendiente_pago' | 'pendiente' | 'en_preparacion' | 'alistando' | 'en_camino' | 'completado';
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  direccion: string;
  referencia?: string;
  lat?: number;
  lng?: number;
  cliente: {
    nombre: string;
    telefono: string;
    correo: string;
  };
  metodoPago: 'whatsapp' | 'niubiz';
  estimatedTime?: string; // e.g. "50 - 60 min"
}

interface CustomerProfile {
  nombre: string;
  telefono: string;
  correo: string;
}

interface CustomerStore {
  // Profile
  profile: CustomerProfile;
  setProfile: (data: Partial<CustomerProfile>) => void;

  // Address
  savedAddress: { direccion: string; referencia: string; lat: number; lng: number } | null;
  setSavedAddress: (data: { direccion: string; referencia: string; lat: number; lng: number } | null) => void;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  getOrdersByStore: (storeId: string) => Order[];
}

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      // Profile
      profile: { nombre: '', telefono: '', correo: '' },
      setProfile: (data) => set((state) => ({
        profile: { ...state.profile, ...data }
      })),

      // Address
      savedAddress: null,
      setSavedAddress: (data) => set({ savedAddress: data }),

      // Orders
      orders: [],
      addOrder: (order) => set((state) => ({
        orders: [order, ...state.orders]
      })),
      updateOrderStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
      })),
      getOrdersByStore: (storeId) => get().orders.filter(o => o.storeId === storeId),
    }),
    {
      name: 'linkventas-customer',
    }
  )
)

// Helper to generate order IDs like PRIM-SB-100426-0008
export function generateOrderId(storePrefix: string): string {
  const now = new Date()
  const dateStr = `${(now.getDate()).toString().padStart(2, '0')}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getFullYear().toString().slice(-2)}`
  const seq = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `${storePrefix}-${dateStr}-${seq}`
}
