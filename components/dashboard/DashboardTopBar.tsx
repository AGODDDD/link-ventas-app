'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Bell, PlusCircle, UserCircle, ShoppingBag, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { useDashboardStore } from '@/store/useDashboardStore'
import ThemeToggle from '@/components/dashboard/ThemeToggle'

interface Notificacion {
    id: string;
    mensaje: string;
    monto: number;
    fecha: Date;
    leida: boolean;
}

let sharedAudioCtx: any = null;

const initAudioContext = () => {
    if (typeof window === 'undefined') return;
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!sharedAudioCtx) {
            sharedAudioCtx = new AudioContextClass();
        }
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume();
        }
    } catch (e) {
        console.error('Failed to initialize AudioContext:', e);
    }
};

// Función de síntesis de audio premium nativa (Web Audio API)
// Esto genera una campanilla moderna y elegante de dos tonos sin depender de archivos de audio externos (que pueden dar 404).
const playNotificationSound = () => {
    try {
        if (typeof window === 'undefined') return;
        
        // Si no se ha inicializado en el click, lo intentamos ahora
        if (!sharedAudioCtx) {
            initAudioContext();
        }
        
        if (!sharedAudioCtx) return;
        
        // Intentar hacer resume en caso de que esté en estado suspendido
        if (sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume();
        }
        
        const ctx = sharedAudioCtx;
        const now = ctx.currentTime;
        
        // Primer tono de campana (re natural / D5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
        
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Segundo tono de campana (la natural / A5) con leve desfase
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.08); // A5
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6
        
        gain2.gain.setValueAtTime(0.1, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.8);
    } catch (e) {
        console.error('Audio synthesis failed:', e);
    }
}

interface TopBarProps {
    hasBanner?: boolean;
}

export default function DashboardTopBar({ hasBanner }: TopBarProps = {}) {
    const [userId, setUserId] = useState<string | null>(null)
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Cargar Usuario
    useEffect(() => {
        const obtenerUsuario = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setUserId(user.id)
        }
        obtenerUsuario()
    }, [])

    // Habilitar Audio en interacción del usuario para burlar las restricciones de Autoplay
    useEffect(() => {
        const handleUserGesture = () => {
            initAudioContext();
        };
        document.addEventListener('click', handleUserGesture, { capture: true });
        document.addEventListener('touchstart', handleUserGesture, { capture: true });
        return () => {
            document.removeEventListener('click', handleUserGesture, { capture: true });
            document.removeEventListener('touchstart', handleUserGesture, { capture: true });
        };
    }, []);

    // Click Outside para cerrar el menú
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [])

    // Configurar Radar WebSockets
    useEffect(() => {
        if (!userId) return

        let channelOrders: any
        let channelDelivery: any

        const setupRealtime = async () => {
            const { data: storeData } = await supabase.from('stores').select('id').eq('owner_id', userId).single()
            const targetId = storeData?.id || userId;

            // ── CANAL 1: NUEVO CORE (ORDERS) ──
            const channelNameOrd = `orders_rx_${userId}_${Math.random().toString(36).substring(7)}`
            channelOrders = supabase.channel(channelNameOrd)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${targetId}` },
                    async (payload) => {
                        const nuevaOrden = payload.new
                        
                        // Ignorar notificaciones de Culqi cuando nacen en pendiente_pago
                        if (nuevaOrden.status === 'pendiente_pago' && (nuevaOrden.metodo_pago === 'culqi' || nuevaOrden.metodo_pago === 'tarjeta_culqi' || nuevaOrden.payment_proof_url === 'CULQI_PENDING')) {
                            return;
                        }

                        toast.success(`NUEVA VENTA de S/ ${nuevaOrden.total_amount || nuevaOrden.total || 0}`, {
                            description: `El cliente ${nuevaOrden.customer_name} acaba de pagar.`,
                            duration: 8000,
                            icon: <ShoppingBag className="text-secondary" />
                        })
                        setNotificaciones(prev => [{
                            id: nuevaOrden.id,
                            mensaje: `Compra de ${nuevaOrden.customer_name}`,
                            monto: nuevaOrden.total_amount || nuevaOrden.total || 0,
                            fecha: new Date(),
                            leida: false
                        }, ...prev])
                        
                        // Fetch order_items con retry para evitar race condition:
                        // El INSERT de 'orders' dispara Realtime ANTES de que se inserten los order_items.
                        // Esperamos 800ms y si no hay items, reintentamos a los 2s.
                        const fetchItems = async () => {
                            const { data } = await supabase.from('order_items').select('*').eq('order_id', nuevaOrden.id);
                            return data || [];
                        };
                        
                        await new Promise(r => setTimeout(r, 800));
                        let items = await fetchItems();
                        
                        // Inyectar al store inmediatamente con lo que hay
                        nuevaOrden.order_items = items;
                        const store = useDashboardStore.getState()
                        const norm = store.normalizarOrder(nuevaOrden, 'core')
                        store.agregarOrderLocal(norm)

                        // Si no había items aún, reintentar a los 2s y actualizar el store
                        if (items.length === 0) {
                            setTimeout(async () => {
                                const retryItems = await fetchItems();
                                if (retryItems.length > 0) {
                                    useDashboardStore.getState().actualizarItemsOrderLocal?.(nuevaOrden.id, retryItems);
                                }
                            }, 2000);
                        }

                        // Reproducir alerta sonora y notificación push nativa
                        playNotificationSound();
                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            new Notification('🛍️ Nueva Venta Recibida', { 
                                body: `${nuevaOrden.customer_name} — S/ ${parseFloat(nuevaOrden.total_amount || nuevaOrden.total || 0).toFixed(2)}`, 
                                icon: '/favicon.ico' 
                            })
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'orders', filter: `store_id=eq.${targetId}` },
                    async (payload) => {
                        const store = useDashboardStore.getState();
                        const exists = store.orders.some(o => o.id === payload.new.id);
                        
                        // Si no existía (era un Culqi pendiente) y ahora es 'paid', ingresarlo como orden nueva
                        if (!exists && payload.new.status === 'paid') {
                            const nuevaOrden = payload.new;
                            const { data: items } = await supabase.from('order_items').select('*').eq('order_id', nuevaOrden.id);
                            nuevaOrden.order_items = items || [];
                            
                            const norm = store.normalizarOrder(nuevaOrden, 'core');
                            store.agregarOrderLocal(norm);
                            
                            toast.success(`NUEVA VENTA PAGADA de S/ ${nuevaOrden.total_amount || nuevaOrden.total || 0}`, {
                                description: `El cliente ${nuevaOrden.customer_name} pagó con Culqi exitosamente.`,
                                duration: 8000,
                                icon: <ShoppingBag className="text-secondary" />
                            })
                            setNotificaciones(prev => [{
                                id: nuevaOrden.id,
                                mensaje: `Pago Culqi de ${nuevaOrden.customer_name}`,
                                monto: nuevaOrden.total_amount || nuevaOrden.total || 0,
                                fecha: new Date(),
                                leida: false
                            }, ...prev])
                            playNotificationSound();
                            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                new Notification('🛍️ Nueva Venta Pagada (Culqi)', { 
                                    body: `${nuevaOrden.customer_name} — S/ ${parseFloat(nuevaOrden.total_amount || nuevaOrden.total || 0).toFixed(2)}`, 
                                    icon: '/favicon.ico' 
                                })
                            }
                        } else if (exists) {
                            store.actualizarEstadoOrderLocal(payload.new.id, payload.new.status);
                        }
                    }
                )
                .subscribe()

            // ── CANAL 2: LEGACY & STANDARD DELIVERY ──
            const channelNameDel = `delivery_rx_${userId}_${Math.random().toString(36).substring(7)}`
            channelDelivery = supabase.channel(channelNameDel)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'delivery_orders', filter: `store_id=eq.${userId}` }, // Usar userId Legacy Original!
                    (payload) => {
                        const pedido = payload.new
                        
                        // Esperamos 500ms antes de inyectar al store local.
                        // La orden TAMBIÉN se inserta en 'orders' (tabla core) con ~300ms de diferencia.
                        // Si dejamos que el canal de 'orders' llegue primero, su deduplicación 
                        // por legacy_id rechazará este duplicado automáticamente.
                        setTimeout(() => {
                            const store = useDashboardStore.getState()
                            const norm = store.normalizarOrder(pedido, 'legacy_delivery')
                            store.agregarOrderLocal(norm) // agregarOrderLocal filtrará si ya existe
                        }, 500)

                        toast.success(`🛵 NUEVO PEDIDO DELIVERY`, {
                            description: `${pedido.customer_name || 'Cliente'} — S/ ${parseFloat(pedido.total || 0).toFixed(2)}`,
                            duration: 10000,
                            icon: <ShoppingBag className="text-green-500" />
                        })
                        setNotificaciones(prev => [{
                            id: pedido.id,
                            mensaje: `🛵 Delivery de ${pedido.customer_name || 'Cliente'} — ${pedido.id.substring(0,6)}`,
                            monto: parseFloat(pedido.total || 0),
                            fecha: new Date(),
                            leida: false
                        }, ...prev])

                        playNotificationSound();
                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            new Notification('🛵 Nuevo Pedido Delivery', { body: `${pedido.customer_name || 'Cliente'} — S/ ${parseFloat(pedido.total || 0).toFixed(2)}`, icon: '/favicon.ico' })
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'delivery_orders', filter: `store_id=eq.${userId}` },
                    (payload) => {
                        useDashboardStore.getState().actualizarEstadoOrderLocal(payload.new.id, payload.new.status)
                    }
                )
                .subscribe()
        }

        setupRealtime();

        return () => {
             if (channelOrders) supabase.removeChannel(channelOrders)
             if (channelDelivery) supabase.removeChannel(channelDelivery)
        }
    }, [userId])

    const unreadCount = notificaciones.filter(n => !n.leida).length

    const marcarTodasLeidas = () => {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
    }

    return (
        <header 
            style={{ top: hasBanner ? '45px' : '0' }}
            className="hidden md:flex fixed right-0 w-full md:w-[calc(100%-14rem)] h-16 z-40
                       bg-white/80 dark:bg-[#0f0f11]/80
                       backdrop-blur-xl justify-between items-center px-4 md:px-8
                       border-b border-zinc-200 dark:border-zinc-800"
        >
            
            {/* Buscador falso / Decorativo para rellenar */}
            <div className="flex items-center gap-4 bg-zinc-50 dark:bg-[var(--dash-surface-2)] px-4 py-2 rounded-lg w-full max-w-sm ml-12 md:ml-0 border border-zinc-200 dark:border-[var(--dash-border)]">
                <Search className="text-zinc-400 dark:text-[var(--dash-text-muted)] w-4 h-4" />
                <input 
                    className="bg-transparent border-none text-sm focus:ring-0 placeholder:text-zinc-400/70 dark:placeholder:text-[var(--dash-text-muted)]/50 w-full text-zinc-700 dark:text-[var(--dash-text-primary)] outline-none" 
                    placeholder="Comandos rápidos..." 
                    type="text"
                />
            </div>

            <div className="flex items-center gap-4 md:gap-6 ml-4">
                
                {/* LA ANTENA: CAMPANA Y BADGE */}
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`relative p-2 rounded-full transition-colors ${unreadCount > 0 ? 'text-[var(--dash-text-primary)] hover:bg-zinc-100 dark:hover:bg-[var(--dash-surface-2)]' : 'text-zinc-400 dark:text-[var(--dash-text-muted)] hover:text-zinc-700 dark:hover:text-[var(--dash-text-primary)]'}`}
                    >
                        <Bell className="w-6 h-6" />
                        
                        {/* El punto rojo si hay no leídas */}
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[var(--dash-surface)] shadow-[0_0_10px_rgba(255,180,171,0.5)] animate-pulse"></span>
                        )}
                    </button>

                    {/* MENÚ DESPLEGABLE DE NOTIFICACIONES */}
                    {isMenuOpen && (
                        <div className="absolute top-12 right-0 w-80 bg-white dark:bg-[var(--dash-surface-2)] border border-zinc-200 dark:border-[var(--dash-border)] shadow-2xl rounded-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in">
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-[var(--dash-border)] bg-zinc-50 dark:bg-[var(--dash-surface)]">
                                <h3 className="font-bold text-zinc-900 dark:text-[var(--dash-text-primary)] text-sm">Registro Radar</h3>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={marcarTodasLeidas} 
                                        className="text-[10px] text-[var(--dash-accent)] hover:text-[var(--dash-accent-hover)] font-bold uppercase tracking-widest flex items-center gap-1"
                                    >
                                        <Check size={12}/> Visto
                                    </button>
                                )}
                            </div>
                            
                            <div className="max-h-80 overflow-y-auto">
                                {notificaciones.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-400 dark:text-[var(--dash-text-muted)] flex flex-col items-center">
                                        <Bell size={24} className="mb-2 opacity-20" />
                                        <p className="text-xs">El radar está en silencio.</p>
                                    </div>
                                ) : (
                                    notificaciones.map(n => (
                                        <div key={n.id} className={`p-4 border-b border-zinc-100 dark:border-[var(--dash-border)] flex items-start gap-3 transition-colors ${!n.leida ? 'bg-[var(--dash-accent)]/5' : 'hover:bg-zinc-50 dark:hover:bg-[var(--dash-surface-2)]'}`}>
                                            <div className="w-8 h-8 rounded-full bg-[var(--dash-success-soft)] flex items-center justify-center shrink-0">
                                                <ShoppingBag className="w-4 h-4 text-[var(--dash-success)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm truncate ${!n.leida ? 'font-bold text-zinc-900 dark:text-[var(--dash-text-primary)]' : 'text-zinc-500 dark:text-[var(--dash-text-muted)]'}`}>{n.mensaje}</p>
                                                <p className="text-xs font-mono font-bold text-[var(--dash-accent)] mt-1">S/ {n.monto.toFixed(2)}</p>
                                                <p className="text-[10px] text-zinc-400/70 dark:text-[var(--dash-text-muted)]/50 mt-1">{n.fecha.toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <Link href="/dashboard/pedidos" onClick={() => setIsMenuOpen(false)} className="block w-full p-3 text-center text-xs font-bold text-zinc-500 dark:text-[var(--dash-text-muted)] hover:text-zinc-900 dark:hover:text-[var(--dash-text-primary)] hover:bg-zinc-50 dark:hover:bg-[var(--dash-surface-2)] transition-colors border-t border-zinc-100 dark:border-[var(--dash-border)] uppercase tracking-widest">
                                Ir a Gestión de Órdenes →
                            </Link>
                        </div>
                    )}
                </div>

                <ThemeToggle />

                <Link href="/dashboard/crear" className="hidden sm:block">
                    <PlusCircle className="cursor-pointer text-zinc-400 dark:text-[var(--dash-text-muted)] hover:text-[var(--dash-accent)] transition-colors w-6 h-6" />
                </Link>
                <Link href="/dashboard/configuracion">
                    <UserCircle className="cursor-pointer text-zinc-400 dark:text-[var(--dash-text-muted)] hover:text-[var(--dash-accent)] transition-colors w-7 h-7" />
                </Link>

            </div>
        </header>
    )
}
