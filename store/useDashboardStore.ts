import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Store, StoreConfig, UnifiedOrder, UnifiedOrderItem } from '@/types/core'

export interface Product {
    id: string;
    name: string;
    price: string | number;
    stock: number;
    image_url?: string;
    brand?: string;
    is_active?: boolean;
    created_at?: string;
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
    total_amount: number;
    last_updated: string;
    [key: string]: any;
}

const CACHE_TTL = 300000; // 5 minutos en milisegundos

interface DashboardState {
    // Estado de Tienda (Core)
    storeInfo: Store | null
    storeConfig: StoreConfig | null
    cargarStoreInfo: (userId: string) => Promise<void>

    // Estado de Productos
    productos: Product[]
    productosLastFetch: number
    cargarProductos: (userId: string, force?: boolean) => Promise<void>
    eliminarProductoLocal: (productId: string) => void
    
    // Estado de Órdenes
    orders: UnifiedOrder[]
    ordersLastFetch: number
    cargarOrders: (userId: string, force?: boolean) => Promise<void>
    agregarOrderLocal: (order: any) => void
    actualizarEstadoOrderLocal: (orderId: string, nuevoEstado: string, legacyId?: string) => void
    actualizarItemsOrderLocal: (orderId: string, items: any[]) => void
    normalizarOrder: (raw: any, source: 'legacy_delivery' | 'core' | 'legacy_standard') => any

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

export const useDashboardStore = create<DashboardState>((set, get) => ({
    // ---- TIENDA (CORE) ----
    storeInfo: null,
    storeConfig: null,

    cargarStoreInfo: async (userId: string) => {
        // 1. Intentar cargar desde las tablas nuevas (Core)
        const [storeRes, configRes] = await Promise.all([
            supabase.from('stores').select('*').eq('id', userId).single(),
            supabase.from('store_config').select('*').eq('store_id', userId).single()
        ]);

        if (storeRes.data && configRes.data) {
            set({ 
                storeInfo: storeRes.data as Store, 
                storeConfig: configRes.data as StoreConfig 
            });
        } else {
            // 2. Fallback: Cargar desde Profiles (Migración On-the-fly)
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (profile) {
                // Simular el objeto Core para el frontend
                set({
                    storeInfo: {
                        id: profile.id,
                        owner_id: profile.id,
                        slug: profile.slug || '',
                        name: profile.store_name || '',
                        template_type: profile.template_type || 'comercio',
                        whatsapp_phone: profile.whatsapp_phone || '', // Movido aquí (Core)
                        avatar_url: profile.avatar_url,
                        banner_url: profile.banner_url,
                        is_active: true,
                        created_at: profile.created_at,
                        updated_at: profile.created_at
                    },
                    storeConfig: {
                        store_id: profile.id,
                        primary_color: profile.primary_color || '#000000',
                        secondary_color: profile.secondary_color || '#ffffff',
                        fomo_enabled: profile.fomo_enabled || false,
                        fomo_min_viewers: profile.fomo_min_viewers || 3,
                        fomo_max_viewers: profile.fomo_max_viewers || 24,
                        fomo_message: profile.fomo_message || '',
                        created_at: profile.created_at,
                        updated_at: profile.created_at
                    }
                });
            }
        }
    },

    // ---- PRODUCTOS ----
    productos: [],
    productosLastFetch: 0,
    
    cargarProductos: async (userId: string, force: boolean = false) => {
        const isStale = Date.now() - get().productosLastFetch > CACHE_TTL;
        if (!force && !isStale && get().productosLastFetch > 0) return;

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            set({ productos: data, productosLastFetch: Date.now() });
        }
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

    cargarOrders: async (userId: string, force: boolean = false) => {
        const isStale = Date.now() - get().ordersLastFetch > CACHE_TTL;
        if (!force && !isStale && get().ordersLastFetch > 0) return;

        const { data, error } = await supabase
            .from('orders')
            .select(`*, order_items (*)`)
            .eq('store_id', userId)
            .order('created_at', { ascending: false })
            .limit(300);

        if (error) {
            console.error('Error fetching orders:', error);
            return;
        }

        let unifiedOrders: any[] = [];
        
        if (data) {
            unifiedOrders = data
                .filter(o => !(o.status === 'pendiente_pago' && (o.metodo_pago === 'culqi' || o.metodo_pago === 'tarjeta_culqi')))
                .map(o => ({
                    id: o.id,
                    legacy_id: o.legacy_id,
                    created_at: o.created_at,
                    customer_name: o.customer_name || 'Sin nombre',
                    customer_phone: o.customer_phone || '-',
                    direccion: o.direccion || 'Sin dirección',
                    referencia: o.referencia || '',
                    total_amount: (o.total || o.total_amount || 0).toString(),
                    total: o.total || o.total_amount || 0,
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

        set({ orders: unifiedOrders, ordersLastFetch: Date.now() });
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

    normalizarOrder: (raw: any, source: 'legacy_delivery' | 'core' | 'legacy_standard') => {
        if (source === 'legacy_delivery') {
            return {
                id: raw.id,
                created_at: raw.created_at,
                customer_name: raw.customer_name || 'Sin nombre',
                customer_phone: raw.customer_phone || '-',
                direccion: raw.direccion || raw.address || 'Sin dirección',
                referencia: raw.referencia || '',
                total_amount: raw.total ? raw.total.toString() : '0',
                subtotal: raw.subtotal || 0,
                delivery_fee: raw.delivery_fee || 0,
                status: raw.status,
                payment_proof_url: raw.metodo_pago === 'contra_entrega' ? 'CONTRA_ENTREGA' : 'WHATSAPP_LINK',
                order_items: raw.items || [],
                _source: 'legacy_delivery'
            }
        }
        if (source === 'core') {
            return {
                id: raw.id,
                legacy_id: raw.legacy_id,
                created_at: raw.created_at,
                customer_name: raw.customer_name || 'Sin nombre',
                customer_phone: raw.customer_phone || '-',
                direccion: raw.direccion || raw.customer_address || 'Sin dirección',
                referencia: raw.referencia || '',
                total_amount: (raw.total || raw.total_amount || 0).toString(),
                subtotal: raw.subtotal || 0,
                delivery_fee: raw.delivery_fee || 0,
                status: raw.status,
                order_type: raw.order_type,
                metodo_pago: raw.metodo_pago,
                payment_proof_url: raw.payment_proof_url || 'NUEVO_CORE',
                order_items: raw.order_items || [],
                _source: 'core'
            }
        }
        return { ...raw, _source: 'legacy_standard' }
    },

    // ---- LEADS (CLIENTES) ----
    leads: [],
    leadsLastFetch: 0,

    cargarLeads: async (userId: string, force: boolean = false) => {
        const isStale = Date.now() - get().leadsLastFetch > CACHE_TTL;
        if (!force && !isStale && get().leadsLastFetch > 0) return;

        const { data, error } = await supabase
            .from('store_leads')
            .select('*')
            .eq('store_id', userId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            set({ leads: data, leadsLastFetch: Date.now() });
        }
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
        const isStale = Date.now() - get().cartsLastFetch > CACHE_TTL;
        if (!force && !isStale && get().cartsLastFetch > 0) return;

        const { data, error } = await supabase
            .from('abandoned_carts')
            .select('*')
            .eq('store_id', userId)
            .order('last_updated', { ascending: false });

        if (!error && data) {
            set({ abandonedCarts: data, cartsLastFetch: Date.now() });
        }
    }
}))
