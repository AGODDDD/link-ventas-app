import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface DashboardState {
    // Estado de Productos
    productos: any[]
    productosCargados: boolean
    cargarProductos: (userId: string, force?: boolean) => Promise<void>
    eliminarProductoLocal: (productId: string) => void
    
    // Estado de Órdenes
    orders: any[]
    ordersCargadas: boolean
    cargarOrders: (userId: string, force?: boolean) => Promise<void>
    agregarOrderLocal: (order: any) => void
    actualizarEstadoOrderLocal: (orderId: string, nuevoEstado: string) => void
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    // ---- PRODUCTOS ----
    productos: [],
    productosCargados: false,
    
    cargarProductos: async (userId: string, force: boolean = false) => {
        // Si ya están en memoria y no estamos forzando, no viajamos a la DB. (0 ms load = Velocidad Extrema)
        if (get().productosCargados && !force) return;

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            set({ productos: data, productosCargados: true });
        }
    },

    eliminarProductoLocal: (productId: string) => {
        set((state) => ({
            productos: state.productos.filter(p => p.id !== productId)
        }))
    },

    // ---- ÓRDENES ----
    orders: [],
    ordersCargadas: false,

    cargarOrders: async (userId: string, force: boolean = false) => {
        if (get().ordersCargadas && !force) return;

        // Fetch de ambas tablas en paralelo (Simultaneidad Extrema)
        const [ordersRes, deliveryRes] = await Promise.all([
            supabase
                .from('orders')
                .select(`*, order_items (*, products (name))`)
                .eq('merchant_id', userId)
                .order('created_at', { ascending: false }),
            supabase
                .from('delivery_orders')
                .select('*')
                .eq('store_id', userId)
                .order('created_at', { ascending: false })
        ]);

        let unifiedOrders: any[] = [];

        // 1. Agregar órdenes estándar
        if (ordersRes.data) {
            unifiedOrders = [...ordersRes.data.map(o => ({ ...o, _source: 'standard' }))];
        }

        // 2. Agregar órdenes de delivery normalizadas para el dashboard
        if (deliveryRes.data) {
            const normalizedDelivery = deliveryRes.data.map(d => ({
                id: d.id,
                created_at: d.created_at,
                customer_name: d.customer_name,
                total_amount: d.total.toString(),
                status: d.status,
                payment_proof_url: d.metodo_pago === 'contra_entrega' ? 'CONTRA_ENTREGA' : 'WHATSAPP_LINK',
                order_items: d.items || [],
                _source: 'delivery'
            }));
            unifiedOrders = [...unifiedOrders, ...normalizedDelivery];
        }

        // 3. Re-ordenar por fecha de creación descendente
        unifiedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        set({ orders: unifiedOrders, ordersCargadas: true });
    },

    agregarOrderLocal: (order: any) => {
        // Inyecta el pedido nuevo al principio de la matriz (como un feed de Instagram)
        set((state) => ({
            orders: [order, ...state.orders]
        }))
    },

    actualizarEstadoOrderLocal: (orderId: string, nuevoEstado: string) => {
        set((state) => ({
            orders: state.orders.map(o => o.id === orderId ? { ...o, status: nuevoEstado } : o)
        }))
    }
}))
