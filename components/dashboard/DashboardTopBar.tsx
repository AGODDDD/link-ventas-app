'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Bell, PlusCircle, UserCircle, ShoppingBag, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Link from 'next/link'
import { useDashboardStore } from '@/store/useDashboardStore'

interface Notificacion {
    id: string;
    mensaje: string;
    monto: number;
    fecha: Date;
    leida: boolean;
}

export default function DashboardTopBar() {
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
            // Obtener ID correcto de la tienda
            const { data: storeData } = await supabase.from('stores').select('id').eq('owner_id', userId).single()
            const targetId = storeData?.id || userId;

            // Único canal universal para órdenes para evitar colisiones
            channelOrders = supabase.channel('realtime_dashboard_topbar')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'orders' },
                    (payload) => {
                        const nuevaOrden = payload.new
                        if (nuevaOrden.store_id !== targetId && nuevaOrden.store_id !== userId && nuevaOrden.merchant_id !== userId) return;

                        toast.success(`NUEVA VENTA de S/ ${nuevaOrden.total_amount || nuevaOrden.total || 0}`, {
                            description: `El cliente ${nuevaOrden.customer_name} acaba de pagar.`,
                            duration: 8000,
                            icon: <ShoppingBag className="text-secondary" />
                        })
                        
                        const nuevaNotif: Notificacion = {
                            id: nuevaOrden.id,
                            mensaje: `Compra de ${nuevaOrden.customer_name}`,
                            monto: nuevaOrden.total_amount || nuevaOrden.total || 0,
                            fecha: new Date(),
                            leida: false
                        }
                        setNotificaciones(prev => [nuevaNotif, ...prev])
                        
                        // Inyectar estado sin consulta a BD para evitar race conditions
                        const store = useDashboardStore.getState()
                        const norm = store.normalizarOrder(nuevaOrden, 'core')
                        store.agregarOrderLocal(norm)
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'delivery_orders' },
                    (payload) => {
                        const pedido = payload.new
                        if (pedido.store_id !== targetId && pedido.store_id !== userId && pedido.merchant_id !== userId) return;

                        // 1. Toast de alerta
                        toast.success(`🛵 NUEVO PEDIDO DELIVERY`, {
                            description: `${pedido.customer_name || 'Cliente'} — S/ ${parseFloat(pedido.total || 0).toFixed(2)} — ${pedido.direccion || ''}`,
                            duration: 10000,
                            icon: <ShoppingBag className="text-green-500" />
                        })

                        // 2. Guardar en bandeja de campana
                        const nuevaNotif: Notificacion = {
                            id: pedido.id,
                            mensaje: `🛵 Delivery de ${pedido.customer_name || 'Cliente'} — ${pedido.id.substring(0,6)}`,
                            monto: parseFloat(pedido.total || 0),
                            fecha: new Date(),
                            leida: false
                        }
                        setNotificaciones(prev => [nuevaNotif, ...prev])

                        // 3. Inyectar estado a nivel global sin Race Condition
                        const store = useDashboardStore.getState()
                        const norm = store.normalizarOrder(pedido, 'legacy_delivery')
                        store.agregarOrderLocal(norm)

                        // 4. Sonido y Push
                        try {
                            const audio = new Audio('/notification.mp3') 
                            audio.play().catch(() => {}) 
                        } catch (_) {}

                        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                            new Notification('🛵 Nuevo Pedido Delivery', {
                                body: `${pedido.customer_name || 'Cliente'} — S/ ${parseFloat(pedido.total || 0).toFixed(2)}`,
                                icon: '/favicon.ico',
                            })
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'orders' },
                    (payload) => { 
                        if (payload.new.store_id !== targetId && payload.new.store_id !== userId && payload.new.merchant_id !== userId) return;
                        useDashboardStore.getState().actualizarEstadoOrderLocal(payload.new.id, payload.new.status)
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'delivery_orders' },
                    (payload) => { 
                        if (payload.new.store_id !== targetId && payload.new.store_id !== userId && payload.new.merchant_id !== userId) return;
                        useDashboardStore.getState().actualizarEstadoOrderLocal(payload.new.id, payload.new.status)
                    }
                )
                .subscribe()
        }

        setupRealtime();

        return () => {
             if (channelOrders) supabase.removeChannel(channelOrders)
        }
    }, [userId])

    const unreadCount = notificaciones.filter(n => !n.leida).length

    const marcarTodasLeidas = () => {
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
    }

    return (
        <header className="hidden md:flex fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-16 z-40 bg-surface/80 backdrop-blur-xl justify-between items-center px-4 md:px-8 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-b border-surface-bright">
            
            {/* Buscador falso / Decorativo para rellenar */}
            <div className="flex items-center gap-4 bg-surface-container-high px-4 py-2 rounded-lg w-full max-w-sm ml-12 md:ml-0 border border-outline-variant/10">
                <Search className="text-on-surface-variant w-4 h-4" />
                <input 
                    className="bg-transparent border-none text-sm focus:ring-0 placeholder:text-on-surface-variant/50 w-full text-on-surface outline-none" 
                    placeholder="Comandos rápidos..." 
                    type="text"
                />
            </div>

            <div className="flex items-center gap-4 md:gap-6 ml-4">
                
                {/* LA ANTENA: CAMPANA Y BADGE */}
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`relative p-2 rounded-full transition-colors ${unreadCount > 0 ? 'text-on-surface hover:bg-surface-bright' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <Bell className="w-6 h-6" />
                        
                        {/* El punto rojo si hay no leídas */}
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface shadow-[0_0_10px_rgba(255,180,171,0.5)] animate-pulse"></span>
                        )}
                    </button>

                    {/* MENÚ DESPLEGABLE DE NOTIFICACIONES */}
                    {isMenuOpen && (
                        <div className="absolute top-12 right-0 w-80 bg-surface-container-high border border-outline-variant/20 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in">
                            <div className="flex items-center justify-between p-4 border-b border-outline-variant/10 bg-surface-container-highest">
                                <h3 className="font-bold text-on-surface text-sm">Registro Radar</h3>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={marcarTodasLeidas} 
                                        className="text-[10px] text-primary hover:text-primary-container font-bold uppercase tracking-widest flex items-center gap-1"
                                    >
                                        <Check size={12}/> Visto
                                    </button>
                                )}
                            </div>
                            
                            <div className="max-h-80 overflow-y-auto">
                                {notificaciones.length === 0 ? (
                                    <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
                                        <Bell size={24} className="mb-2 opacity-20" />
                                        <p className="text-xs">El radar está en silencio.</p>
                                    </div>
                                ) : (
                                    notificaciones.map(n => (
                                        <div key={n.id} className={`p-4 border-b border-outline-variant/5 flex items-start gap-3 transition-colors ${!n.leida ? 'bg-primary/5' : 'hover:bg-surface-bright'}`}>
                                            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                                                <ShoppingBag className="w-4 h-4 text-secondary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm truncate ${!n.leida ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>{n.mensaje}</p>
                                                <p className="text-xs font-mono font-bold text-primary mt-1">S/ {n.monto.toFixed(2)}</p>
                                                <p className="text-[10px] text-on-surface-variant/50 mt-1">{n.fecha.toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            <Link href="/dashboard/pedidos" onClick={() => setIsMenuOpen(false)} className="block w-full p-3 text-center text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-bright transition-colors border-t border-outline-variant/10 uppercase tracking-widest">
                                Ir a Gestión de Órdenes →
                            </Link>
                        </div>
                    )}
                </div>

                <Link href="/dashboard/crear" className="hidden sm:block">
                    <PlusCircle className="cursor-pointer text-on-surface-variant hover:text-primary transition-colors w-6 h-6" />
                </Link>
                <Link href="/dashboard/configuracion">
                    <UserCircle className="cursor-pointer text-on-surface-variant hover:text-primary transition-colors w-7 h-7" />
                </Link>

            </div>
        </header>
    )
}
