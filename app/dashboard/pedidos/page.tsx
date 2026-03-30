'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, CheckCircle, Clock, X, Truck, Ban } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'

type Order = {
    id: string
    created_at: string
    customer_name: string
    customer_phone: string
    customer_address: string
    total_amount: number
    status: 'pending' | 'paid' | 'shipped' | 'cancelled'
    payment_proof_url: string
    order_items: any[]
}

export default function PedidosPage() {
    const { orders, ordersCargadas, cargarOrders, actualizarEstadoOrderLocal } = useDashboardStore()
    const [loading, setLoading] = useState(!ordersCargadas)

    // Estado para el Modal de Comprobante
    const [selectedProof, setSelectedProof] = useState<string | null>(null)
    const [proofLoading, setProofLoading] = useState(false)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await cargarOrders(user.id)
            setLoading(false)
        }
        init()
    }, [cargarOrders])

    const forceRefresh = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setLoading(true)
        await cargarOrders(user.id, true)
        setLoading(false)
    }

    const actualizarEstado = async (id: string, nuevoEstado: string) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: nuevoEstado })
            .eq('id', id)

        if (!error) {
            actualizarEstadoOrderLocal(id, nuevoEstado)
        }
    }

    const verComprobante = async (path: string) => {
        if (path === 'CONTRA_ENTREGA') return; // No hay foto
        setProofLoading(true)
        setSelectedProof(null) 
        try {
            const { data, error } = await supabase.storage
                .from('comprobantes')
                .createSignedUrl(path, 3600)

            if (error) throw error
            setSelectedProof(data.signedUrl)
        } catch (e: any) {
            alert('Error cargando comprobante: ' + e.message)
        } finally {
            setProofLoading(false)
        }
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return "bg-tertiary-container/10 text-tertiary border-tertiary/20"
            case 'paid': return "bg-secondary-container/40 text-secondary border-secondary/20"
            case 'shipped': return "bg-primary-container/40 text-primary border-primary/20"
            case 'cancelled': return "bg-error-container/40 text-error border-error/20"
            default: return "bg-surface-bright text-on-surface"
        }
    }

    const getStatusName = (status: string) => {
        switch (status) {
            case 'pending': return "Pendiente"
            case 'paid': return "Pagado"
            case 'shipped': return "Enviado"
            case 'cancelled': return "Cancelado"
            default: return status
        }
    }

    if (loading) return <div className="p-8 text-center text-on-surface-variant font-bold animate-pulse">Cargando pedidos... 🛰️</div>

    return (
        <div className="space-y-6 pb-12 relative w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Órdenes 📦</h1>
                    <p className="text-on-surface-variant">Gestión logística y control de transacciones.</p>
                </div>
                <button onClick={forceRefresh} className="px-6 py-2 bg-surface-bright text-on-surface border border-outline-variant/30 rounded-lg hover:bg-surface-container-high transition-colors font-semibold text-sm">
                    Actualizar Lista
                </button>
            </div>

            <div className="grid gap-6">
                {orders.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-outline-variant/20 rounded-2xl bg-surface-container-low">
                        <p className="text-on-surface-variant text-xl font-bold">Aún no tienes pedidos.</p>
                        <p className="text-on-surface-variant/70 text-sm mt-2">Empieza a compartir tu catálogo para recibir órdenes aquí.</p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="bg-surface-container-high rounded-2xl border border-outline-variant/5 shadow-2xl overflow-hidden group">
                            
                            {/* Order Header */}
                            <div className="bg-surface-container-low px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/5 gap-4">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-primary tracking-widest px-3 py-1 bg-primary/10 rounded-md">
                                        #{order.id.split('-')[0].toUpperCase()}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 ${getStatusStyle(order.status)}`}>
                                        {getStatusName(order.status)}
                                    </span>
                                    <span className="text-xs font-medium text-on-surface-variant">
                                        {new Date(order.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="font-bold text-xl tracking-tighter text-on-surface">S/ {parseFloat(order.total_amount as any).toFixed(2)}</div>
                            </div>

                            {/* Order Body */}
                            <div className="p-6 grid md:grid-cols-12 gap-6">
                                {/* Zona Info Cliente */}
                                <div className="md:col-span-5 space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Cliente</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-surface-bright flex items-center justify-center font-black text-on-surface shadow-inner">
                                                {order.customer_name ? order.customer_name.substring(0,2).toUpperCase() : '👤'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-on-surface">{order.customer_name}</p>
                                                <p className="text-sm font-medium text-primary">📞 {order.customer_phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 mt-4">Dirección de Entrega</p>
                                        <div className="bg-surface-bright/50 p-3 rounded-lg border border-outline-variant/10 flex items-start gap-2">
                                            <span className="text-on-surface-variant pt-0.5">📍</span>
                                            <p className="text-sm text-on-surface font-medium capitalize">{order.customer_address || 'Sin dirección proporcionada'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Zona Carrito */}
                                <div className="md:col-span-4 border-l-0 md:border-l border-t md:border-t-0 border-outline-variant/10 pt-6 md:pt-0 md:pl-6 flex flex-col">
                                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Contenido del Pedido</p>
                                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                                        {order.order_items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm bg-surface-container p-2 rounded-md">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-surface-bright text-on-surface text-xs font-bold px-2 py-0.5 rounded">{item.quantity}x</span>
                                                    <span className="font-medium text-on-surface-variant line-clamp-1">{item.products?.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Zona de Acciones Operativas */}
                                <div className="md:col-span-3 border-l-0 md:border-l border-t md:border-t-0 border-outline-variant/10 pt-6 md:pt-0 md:pl-6 flex flex-col justify-center gap-3">
                                    
                                    {order.payment_proof_url && order.payment_proof_url !== 'CONTRA_ENTREGA' ? (
                                        <button 
                                            onClick={() => verComprobante(order.payment_proof_url)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-container hover:bg-surface-bright text-primary text-sm font-bold rounded-xl border border-primary/20 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_5px_15px_rgba(192,193,255,0.1)]"
                                        >
                                            <Eye size={18} /> Ver Voucher
                                        </button>
                                    ) : (
                                        <div className="w-full text-center px-4 py-3 bg-surface-container text-on-surface-variant text-xs font-bold rounded-xl border border-outline-variant/10 uppercase tracking-widest">
                                            Pago Contra Entrega
                                        </div>
                                    )}

                                    {order.status === 'pending' && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <button 
                                                onClick={() => actualizarEstado(order.id, 'paid')}
                                                className="flex flex-col items-center justify-center gap-1 p-2 bg-secondary/10 hover:bg-secondary text-secondary hover:text-on-secondary rounded-lg transition-colors border border-secondary/20 hover:border-transparent font-bold text-xs"
                                            >
                                                <CheckCircle size={18} /> Validar
                                            </button>
                                            <button 
                                                onClick={() => actualizarEstado(order.id, 'cancelled')}
                                                className="flex flex-col items-center justify-center gap-1 p-2 bg-error/10 hover:bg-error text-error hover:text-on-error rounded-lg transition-colors border border-error/20 hover:border-transparent font-bold text-xs"
                                            >
                                                <Ban size={18} /> Cancelar
                                            </button>
                                        </div>
                                    )}

                                    {order.status === 'paid' && (
                                        <button 
                                            onClick={() => actualizarEstado(order.id, 'shipped')}
                                            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary hover:brightness-110 text-sm font-bold rounded-xl transition-all shadow-[0_10px_20px_rgba(192,193,255,0.2)] hover:scale-[1.02] active:scale-95"
                                        >
                                            <Truck size={18} /> Marcar Enviado
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL DE COMPROBANTE - DARK PREMIUM */}
            {(selectedProof || proofLoading) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative bg-surface rounded-2xl max-w-sm w-full overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-outline-variant/20">
                        <button 
                            onClick={() => { setSelectedProof(null); setProofLoading(false) }}
                            className="absolute top-4 right-4 p-2 bg-surface-container-high hover:bg-surface-bright rounded-full text-on-surface z-10 transition-colors border border-white/10"
                        >
                            <X size={20} />
                        </button>
                        <div className="p-5 bg-surface-container-low text-center font-bold tracking-widest text-on-surface uppercase text-sm border-b border-outline-variant/10">
                            VERIFICACIÓN DE PAGO
                        </div>
                        <div className="aspect-[9/16] bg-black flex items-center justify-center overflow-hidden">
                            {proofLoading ? (
                                <div className="text-primary font-bold animate-pulse text-sm flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                                    Descargando Voucher...
                                </div>
                            ) : (
                                <img src={selectedProof!} className="w-full h-full object-contain" alt="Comprobante" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
