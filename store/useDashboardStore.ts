import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Store, StoreConfig, UnifiedOrder, UnifiedOrderItem } from '@/types/core'

export interface Product {
    id: string;
    name: string;
    price: any;
    stock: any;
    image_url?: any;
    brand?: any;
    is_active?: any;
    created_at?: any;
    [key: string]: any;
}

export interface Lead {
    id: string;
    store_id: string;
    name: string;
    email?: string;
    phone?: string;
    preference?: string;
    created_at: string;
    [key: string]: any;
}

export interface AbandonedCart {
    id: string;
    store_id: string;
    customer_name?: string;
    customer_phone?: string;
    cart_items: any;
    total: number;
    created_at: string;
    [key: string]: any;
}

const CACHE_TTL = 300000; // 5 minutos en milisegundos

async function resolveStoreId(ownerId: string) {
    const { data, error } = await supabase.from('stores').select('id').eq('owner_id', ownerId).single()
    if (error || !data) throw new Error('No se encontró la tienda del usuario.')
    return data.id
}

interface DashboardState {
    // Propietario del cache en memoria. Nunca se reutilizan datos entre cuentas.
    dashboardOwnerId: string | null
    prepararParaUsuario: (userId: string, reset?: boolean) => void
    limpiarDashboard: () => void

    // Estado de Tienda (Core)
    storeInfo: Store | null
    storeConfig: StoreConfig | null
    cargarStoreInfo: (userId: string) => Promise<void>

    // Estado de Productos
    productos: Product[]
    productosLastFetch: number
    productosCargados: boolean
    cargarProductos: (userId: string, force?: boolean) => Promise<void>
    eliminarProductoLocal: (productId: string) => void
    
    // Estado de Órdenes
    orders: any[]
    ordersLastFetch: number
    ordersCargadas: boolean
    cargarOrders: (userId: string, force?: boolean) => Promise<void>
    agregarOrderLocal: (order: any) => void
    actualizarEstadoOrderLocal: (orderId: string, nuevoEstado: string, legacyId?: string) => void
    actualizarItemsOrderLocal: (orderId: string, items: any[]) => void

    // Estado de Leads (Clientes)
    leads: Lead[]
    leadsLastFetch: number
    cargarLeads: (userId: string, force?: boolean) => Promise<void>
    eliminarLeadLocal: (leadId: string) => void

    // Estado de Carritos Abandonados (Analytics)
    abandonedCarts: AbandonedCart[]
    cartsLastFetch: number
    cargarCarts: (userId: string, force?: boolean) => Promise<void>
}

function emptyDashboardData(ownerId: string | null = null) {
    return {
        dashboardOwnerId: ownerId,
        storeInfo: null,
        storeConfig: null,
        productos: [],
        productosLastFetch: 0,
        productosCargados: false,
        orders: [],
        ordersLastFetch: 0,
        ordersCargadas: false,
        leads: [],
        leadsLastFetch: 0,
        abandonedCarts: [],
        cartsLastFetch: 0,
    }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    dashboardOwnerId: null,
    prepararParaUsuario: (userId: string, reset: boolean = false) => {
        if (reset || get().dashboardOwnerId !== userId) set(emptyDashboardData(userId))
    },
    limpiarDashboard: () => set(emptyDashboardData()),

    // ---- TIENDA (CORE) ----
    storeInfo: null,
    storeConfig: null,

    cargarStoreInfo: async (userId: string) => {
        get().prepararParaUsuario(userId)
        const { data: store } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', userId)
            .single()

        if (get().dashboardOwnerId !== userId) return

        if (store) {
            const { data: config } = await supabase
                .from('store_config')
                .select('*')
                .eq('store_id', store.id)
                .maybeSingle()

            if (get().dashboardOwnerId !== userId) return
            set({
                storeInfo: store as Store,
                storeConfig: config as StoreConfig | null,
            });
        } else {
            set({ storeInfo: null, storeConfig: null });
        }
    },

    // ---- PRODUCTOS ----
    productos: [],
    productosLastFetch: 0,
    productosCargados: false,
    
    cargarProductos: async (userId: string, force: boolean = false) => {
        get().prepararParaUsuario(userId)
        const isStale = Date.now() - get().productosLastFetch > CACHE_TTL;
        if (!force && !isStale && get().productosLastFetch > 0) return;

        const storeId = await resolveStoreId(userId)
        if (get().dashboardOwnerId !== userId) return
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', storeId)
            .order('created_at', { ascending: false });

        if (get().dashboardOwnerId !== userId) return
        if (error) {
            console.error('Error fetching products:', error)
            return
        }

        set({ 
            productos: data || [], 
            productosLastFetch: Date.now(), 
            productosCargados: true 
        });
    },

    eliminarProductoLocal: (productId: string) => {
        set((state) => ({
            productos: state.productos.filter(p => p.id !== productId),
            productosLastFetch: 0 // Forzar revalidación en próxima visita
        }))
    },

    // ---- ÓRDENES ----
    orders: [],
    ordersLastFetch: 0,
    ordersCargadas: false,

    cargarOrders: async (userId: string, force: boolean = false) => {
        get().prepararParaUsuario(userId)
        const isStale = Date.now() - get().ordersLastFetch > CACHE_TTL;
        if (!force && !isStale && get().ordersLastFetch > 0) return;

        const storeId = await resolveStoreId(userId)
        if (get().dashboardOwnerId !== userId) return
        const { data, error } = await supabase
            .from('orders')
            .select(`*, order_items (*)`)
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(300);

        if (get().dashboardOwnerId !== userId) return
        if (error) {
            console.error('Error fetching orders:', error);
            return;
        }

        let unifiedOrders: any[] = [];
        
        if (data) {
            unifiedOrders = data
                .filter(o => !(o.status === 'pendiente_pago' && (o.metodo_pago === 'mercadopago' || o.metodo_pago === 'tarjeta_mercadopago')))
                .map(o => ({
                    id: o.id,
                    legacy_id: o.legacy_id,
                    created_at: o.created_at,
                    customer_name: o.customer_name || 'Sin nombre',
                    customer_phone: o.customer_phone || '-',
                    customer_email: o.customer_email || '',
                    direccion: o.direccion || 'Sin dirección',
                    referencia: o.referencia || '',
                    total: Number(o.total || 0),
                    subtotal: o.subtotal || 0,
                    delivery_fee: o.delivery_fee || 0,
                    status: o.status,
                    order_type: o.order_type,
                    metodo_pago: o.metodo_pago,
                    payment_proof_url: o.payment_proof_url || 'NUEVO_CORE',
                    order_items: o.order_items || [],
                    _source: 'core'
                }));
        }

        set({ 
            orders: unifiedOrders, 
            ordersLastFetch: Date.now(), 
            ordersCargadas: true 
        });
    },

    agregarOrderLocal: (order: any) => {
        set((state) => {
            const existsById = state.orders.some(o => o.id === order.id);
            if (existsById) return { ordersLastFetch: 0 };
            
            if (order.legacy_id) {
                const existsByLegacy = state.orders.some(o => o.legacy_id === order.legacy_id);
                if (existsByLegacy) return { ordersLastFetch: 0 };
            }
            return { 
                orders: [order, ...state.orders],
                ordersLastFetch: 0 // Forzar revalidación
            };
        });
    },

    actualizarEstadoOrderLocal: (orderId: string, nuevoEstado: string, legacyId?: string) => {
        set((state) => ({
            orders: state.orders.map(o => o.id === orderId
                ? {
                    ...o,
                    status: nuevoEstado,
                    ...(legacyId && !o.legacy_id ? { legacy_id: legacyId } : {})
                }
                : o
            ),
            ordersLastFetch: 0 // Forzar revalidación
        }))
    },

    actualizarItemsOrderLocal: (orderId: string, items: any[]) => {
        set((state) => ({
            orders: state.orders.map(o => o.id === orderId ? { ...o, order_items: items } : o),
            ordersLastFetch: 0 // Forzar revalidación
        }))
    },

    // ---- LEADS (CLIENTES) ----
    leads: [],
    leadsLastFetch: 0,

    cargarLeads: async (userId: string, force: boolean = false) => {
        get().prepararParaUsuario(userId)
        const isStale = Date.now() - get().leadsLastFetch > CACHE_TTL;
        if (!force && !isStale && get().leadsLastFetch > 0) return;

        const storeId = await resolveStoreId(userId)
        if (get().dashboardOwnerId !== userId) return
        const { data, error } = await supabase
            .from('store_leads')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (get().dashboardOwnerId !== userId) return
        if (error) {
            console.error('Error fetching leads:', error)
            return
        }

        set({ 
            leads: data || [], 
            leadsLastFetch: Date.now() 
        });
    },

    eliminarLeadLocal: (leadId: string) => {
        set((state) => ({
            leads: state.leads.filter(l => l.id !== leadId),
            leadsLastFetch: 0 // Forzar revalidación
        }))
    },

    // ---- CARRITOS ABANDONADOS (ANALYTICS) ----
    abandonedCarts: [],
    cartsLastFetch: 0,

    cargarCarts: async (userId: string, force: boolean = false) => {
        get().prepararParaUsuario(userId)
        const isStale = Date.now() - get().cartsLastFetch > CACHE_TTL;
        if (!force && !isStale && get().cartsLastFetch > 0) return;

        const storeId = await resolveStoreId(userId)
        if (get().dashboardOwnerId !== userId) return
        const { data, error } = await supabase
            .from('abandoned_carts')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (get().dashboardOwnerId !== userId) return
        if (error) {
            console.error('Error fetching abandoned carts:', error)
            return
        }

        set({ 
            abandonedCarts: data || [], 
            cartsLastFetch: Date.now() 
        });
    }
}))
