import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Store, StoreConfig, UnifiedOrder, UnifiedOrderItem } from '@/types/core'

interface DashboardState {
    // Estado de Tienda (Core)
    storeInfo: Store | null
    storeConfig: StoreConfig | null
    cargarStoreInfo: (userId: string) => Promise<void>

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
    actualizarEstadoOrderLocal: (orderId: string, nuevoEstado: string, legacyId?: string) => void
    actualizarItemsOrderLocal: (orderId: string, items: any[]) => void
    normalizarOrder: (raw: any, source: 'legacy_delivery' | 'core' | 'legacy_standard') => any
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

        set({ orders: unifiedOrders, ordersCargadas: true });
    },

    agregarOrderLocal: (order: any) => {
        set((state) => {
            const existsById = state.orders.some(o => o.id === order.id);
            if (existsById) return state;
            
            if (order.legacy_id) {
                const existsByLegacy = state.orders.some(o => o.legacy_id === order.legacy_id);
                if (existsByLegacy) return state;
            }
            return { orders: [order, ...state.orders] };
        });
    },

    actualizarEstadoOrderLocal: (orderId: string, nuevoEstado: string, legacyId?: string) => {
        set((state) => ({
            orders: state.orders.map(o => o.id === orderId
                ? {
                    ...o,
                    status: nuevoEstado,
                    // Si el trigger de BD ya asignó el BARR-... y antes era null, actualizarlo
                    ...(legacyId && !o.legacy_id ? { legacy_id: legacyId } : {})
                }
                : o
            )
        }))
    },

    actualizarItemsOrderLocal: (orderId: string, items: any[]) => {
        // Actualiza los order_items de una orden ya inyectada en el store
        // Usado por el retry del TopBar cuando los items no estaban disponibles al momento del INSERT
        set((state) => ({
            orders: state.orders.map(o => o.id === orderId ? { ...o, order_items: items } : o)
        }))
    },

    // Helper para normalizar cualquier fuente de orden (Legacy o Core)
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
    }
}))
