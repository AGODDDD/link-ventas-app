'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, BookOpen, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { useDashboardStore } from '@/store/useDashboardStore'
import ThemeToggle from '@/components/dashboard/ThemeToggle'
import { useDashboardSession } from '@/components/dashboard/DashboardSessionContext'
import {
    DASHBOARD_REALTIME_COPY,
    getRealtimeStatus,
    type DashboardRealtimeStatus,
} from '@/lib/dashboardStatus'

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
    const { userId, store: dashboardStore } = useDashboardSession()
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [todayLabel, setTodayLabel] = useState('Hoy')
    const [realtimeStatus, setRealtimeStatus] = useState<DashboardRealtimeStatus>('connecting')
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const formattedDate = new Intl.DateTimeFormat('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'America/Lima',
        }).format(new Date()).replace('.', '')
        setTodayLabel(`Hoy, ${formattedDate}`)
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
        let channelOrders: any
        const targetId = dashboardStore?.id

        if (!targetId || !userId) {
            setRealtimeStatus('disconnected')
            return
        }

        const handleOffline = () => setRealtimeStatus('disconnected')
        const handleOnline = () => setRealtimeStatus('reconnecting')
        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)

        const setupRealtime = () => {

            // ── CANAL 1: NUEVO CORE (ORDERS) ──
            const channelNameOrd = `orders_rx_${userId}_${Math.random().toString(36).substring(7)}`
            channelOrders = supabase.channel(channelNameOrd)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${targetId}` },
                    async (payload) => {
                        const nuevaOrden = payload.new
                        
                        // El pago con tarjeta se anuncia solamente al quedar aprobado.
                        if (nuevaOrden.status === 'pendiente_pago' && (nuevaOrden.metodo_pago === 'mercadopago' || nuevaOrden.metodo_pago === 'tarjeta_mercadopago' || nuevaOrden.payment_proof_url === 'MERCADOPAGO_PENDING')) {
                            return;
                        }

                        toast.success(`NUEVA VENTA — S/ ${parseFloat(nuevaOrden.total || 0).toFixed(2)}`, {
                            description: `${nuevaOrden.customer_name} acaba de pagar`,
                            duration: 6000,
                            icon: <span className="text-[10px] font-black tracking-[0.14em] text-secondary">NV</span>,
                            action: {
                                label: 'Ver pedido',
                                onClick: () => window.location.href = '/dashboard/pedidos',
                            },
                        })
                        setNotificaciones(prev => [{
                            id: nuevaOrden.id,
                            mensaje: `Compra de ${nuevaOrden.customer_name}`,
                            monto: nuevaOrden.total || 0,
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
                        if (store.dashboardOwnerId !== userId) return
                        store.agregarOrderLocal({ ...nuevaOrden, total: Number(nuevaOrden.total || 0) })

                        // Si no había items aún, reintentar a los 2s y actualizar el store
                        if (items.length === 0) {
                            setTimeout(async () => {
                                const retryItems = await fetchItems();
                                const currentStore = useDashboardStore.getState()
                                if (retryItems.length > 0 && currentStore.dashboardOwnerId === userId) {
                                    currentStore.actualizarItemsOrderLocal?.(nuevaOrden.id, retryItems);
                                }
                            }, 2000);
                        }

                        // Reproducir alerta sonora y notificación push nativa
                        playNotificationSound();
                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            new Notification('Nueva Venta Recibida', {
                                body: `${nuevaOrden.customer_name} — S/ ${parseFloat(nuevaOrden.total || 0).toFixed(2)}`,
                                icon: '/brand/linkventas-mark.svg'
                            })
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'orders', filter: `store_id=eq.${targetId}` },
                    async (payload) => {
                        const store = useDashboardStore.getState();
                        if (store.dashboardOwnerId !== userId) return
                        const exists = store.orders.some(o => o.id === payload.new.id);
                        
                        // Un pago confirmado pasa a estado operativo pendiente mediante el webhook.
                        if (!exists && payload.new.status === 'pendiente' && payload.new.payment_status === 'approved') {
                            const nuevaOrden = payload.new;
                            const { data: items } = await supabase.from('order_items').select('*').eq('order_id', nuevaOrden.id);
                            nuevaOrden.order_items = items || [];
                            
                            store.agregarOrderLocal({ ...nuevaOrden, total: Number(nuevaOrden.total || 0) });
                            
                            toast.success(`PAGO MERCADO PAGO — S/ ${parseFloat(nuevaOrden.total || 0).toFixed(2)}`, {
                                description: `${nuevaOrden.customer_name} pagó con tarjeta exitosamente`,
                                duration: 6000,
                                icon: <span className="text-[10px] font-black tracking-[0.14em] text-secondary">MP</span>,
                                action: {
                                    label: 'Ver pedido',
                                    onClick: () => window.location.href = '/dashboard/pedidos',
                                },
                            })
                            setNotificaciones(prev => [{
                                id: nuevaOrden.id,
                                mensaje: `Pago Mercado Pago de ${nuevaOrden.customer_name}`,
                                monto: nuevaOrden.total || 0,
                                fecha: new Date(),
                                leida: false
                            }, ...prev])
                            playNotificationSound();
                            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                new Notification('Nueva Venta Pagada (Mercado Pago)', {
                                    body: `${nuevaOrden.customer_name} — S/ ${parseFloat(nuevaOrden.total || 0).toFixed(2)}`,
                                    icon: '/brand/linkventas-mark.svg'
                                })
                            }
                        } else if (exists) {
                            // Pasar también legacy_id: el trigger de BD puede haberlo asignado
                            // en un UPDATE posterior al INSERT inicial (race condition BARR-...)
                            store.actualizarEstadoOrderLocal(
                                payload.new.id,
                                payload.new.status,
                                payload.new.legacy_id || undefined
                            );
                        }
                    }
                )
                .subscribe(status => {
                    setRealtimeStatus(getRealtimeStatus(status))
                })

        }

        setupRealtime();

        return () => {
             window.removeEventListener('offline', handleOffline)
             window.removeEventListener('online', handleOnline)
             if (channelOrders) supabase.removeChannel(channelOrders)
        }
    }, [dashboardStore?.id, userId])

    const unreadCount = notificaciones.filter(n => !n.leida).length

    const marcarTodasLeidas = () => {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
    }

    return (
        <header 
            style={{ top: hasBanner ? '45px' : '0' }}
            className="hidden md:flex fixed right-0 w-full md:w-[calc(100%-14rem)] h-16 z-40
                       bg-white/80 dark:bg-[#0f0f11]/80
                       backdrop-blur-xl justify-end items-center px-4 md:px-8
                       border-b border-zinc-200 dark:border-zinc-800"
        >
            <div className="flex items-center gap-3 md:gap-5">
                <div className="hidden items-center gap-3 border-r border-zinc-200 pr-5 text-xs dark:border-zinc-800 lg:flex">
                    <time className="font-medium text-zinc-500 dark:text-zinc-400">{todayLabel}</time>
                    <span className="inline-flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-200">
                        <span
                            aria-hidden="true"
                            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                                realtimeStatus === 'connected'
                                    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]'
                                    : realtimeStatus === 'error' || realtimeStatus === 'disconnected'
                                        ? 'bg-red-400'
                                        : 'bg-amber-400'
                            }`}
                        />
                        {DASHBOARD_REALTIME_COPY[realtimeStatus]}
                    </span>
                </div>
                
                {/* LA ANTENA: CAMPANA Y BADGE */}
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
                        aria-expanded={isMenuOpen}
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
                                <h3 className="font-bold text-zinc-900 dark:text-[var(--dash-text-primary)] text-sm">Notificaciones</h3>
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
                                        <span className="mb-3 block h-px w-8 bg-current opacity-30" />
                                        <p className="text-xs">No hay notificaciones nuevas.</p>
                                    </div>
                                ) : (
                                    notificaciones.map(n => (
                                        <Link 
                                            href="/dashboard/pedidos"
                                            key={n.id} 
                                            onClick={() => {
                                                setNotificaciones(prev => prev.map(notif => notif.id === n.id ? { ...notif, leida: true } : notif));
                                                setIsMenuOpen(false);
                                            }}
                                            className={`block p-4 border-b border-zinc-100 dark:border-[var(--dash-border)] flex items-start gap-3 transition-colors ${!n.leida ? 'bg-[var(--dash-accent)]/5' : 'hover:bg-zinc-50 dark:hover:bg-[var(--dash-surface-2)]'}`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-[var(--dash-success-soft)] flex items-center justify-center shrink-0">
                                                <span className="font-mono text-[10px] font-bold text-[var(--dash-success)]">NV</span>
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className={`text-sm truncate ${!n.leida ? 'font-bold text-zinc-900 dark:text-[var(--dash-text-primary)]' : 'text-zinc-500 dark:text-[var(--dash-text-muted)]'}`}>{n.mensaje}</p>
                                                <p className="text-xs font-mono font-bold text-[var(--dash-accent)] mt-1">S/ {n.monto.toFixed(2)}</p>
                                                <p className="text-[10px] text-zinc-400/70 dark:text-[var(--dash-text-muted)]/50 mt-1">{n.fecha.toLocaleTimeString()}</p>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                            
                            <Link href="/dashboard/pedidos" onClick={() => setIsMenuOpen(false)} className="block w-full p-3 text-center text-xs font-bold text-zinc-500 dark:text-[var(--dash-text-muted)] hover:text-zinc-900 dark:hover:text-[var(--dash-text-primary)] hover:bg-zinc-50 dark:hover:bg-[var(--dash-surface-2)] transition-colors border-t border-zinc-100 dark:border-[var(--dash-border)] uppercase tracking-widest">
                                Ir a Gestión de Órdenes →
                            </Link>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event('linkventas:start-product-tour'))}
                    aria-label="Abrir guía de esta sección"
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
                >
                    <BookOpen size={16} aria-hidden="true" />
                    <span>Guía</span>
                </button>

                <ThemeToggle />

                <Link
                    href="/dashboard/configuracion"
                    aria-label="Abrir ajustes de tienda"
                    className="rounded-full border border-zinc-200 px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-zinc-600 transition-colors hover:border-[var(--dash-accent)] hover:text-[var(--dash-accent)] dark:border-[var(--dash-border)] dark:text-[var(--dash-text-muted)]"
                >
                    CUENTA
                </Link>

            </div>
        </header>
    )
}
