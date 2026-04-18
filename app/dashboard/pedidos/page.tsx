'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, CheckCircle, Clock, X, Truck, Ban, ChevronRight, MapPin, Phone, User } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import { ThermalReceipt } from '@/components/dashboard/ThermalReceipt'
import { useRef } from 'react'

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

    // Estado para Rescates (Leads Mágicos)
    const [activeTab, setActiveTab] = useState<'orders' | 'leads' | 'delivery'>('delivery')
    const [leads, setLeads] = useState<any[]>([])
    const [loadingLeads, setLoadingLeads] = useState(false)

    // Delivery orders
    const [deliveryOrders, setDeliveryOrders] = useState<any[]>([])
    const [loadingDelivery, setLoadingDelivery] = useState(true)

    // Referencias para Motor Térmico (html2canvas)
    const [imprimiendoId, setImprimiendoId] = useState<string | null>(null)
    const receiptRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
    const [perfil, setPerfil] = useState<any>(null)

    // Paginación UI (Performance Tweak)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            if (profile) setPerfil(profile)

            await cargarOrders(user.id)
            setLoading(false)
            fetchLeads(user.id)

            // Pedir permiso de notificaciones del navegador
            if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission()
            }

            // El Realtime ahora está controlado de forma unificada 100% por DashboardTopBar.tsx 
            // Esto elimina la condición de carrera y los "memory leaks" de componentes montados/desmontados.
        }
        init()
    }, [cargarOrders])

    const fetchLeads = async (userId: string) => {
        setLoadingLeads(true)
        const { data } = await supabase
            .from('store_leads')
            .select('*')
            .eq('store_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)
        
        if (data) setLeads(data)
        setLoadingLeads(false)
    }

    const forceRefresh = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setLoading(true)
        await cargarOrders(user.id, true)
        fetchLeads(user.id)
        setLoading(false)
    }

    const DELIVERY_STATUSES = ['pendiente_pago', 'pendiente', 'en_preparacion', 'alistando', 'en_camino', 'completado']
    const DELIVERY_LABELS: Record<string, string> = {
        pendiente_pago: 'Pagar pedido',
        pendiente: 'Pendiente',
        en_preparacion: 'En preparación',
        alistando: 'Alistando',
        en_camino: 'En camino',
        completado: 'Completado',
    }
    const DELIVERY_COLORS: Record<string, string> = {
        pendiente_pago: 'bg-red-100 text-red-700 border-red-200',
        pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        en_preparacion: 'bg-blue-100 text-blue-700 border-blue-200',
        alistando: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        en_camino: 'bg-green-100 text-green-700 border-green-200',
        completado: 'bg-neutral-100 text-neutral-600 border-neutral-200',
        cancelado: 'bg-red-200 text-red-800 border-red-300',
    }

    const avanzarEstadoDelivery = async (order: any) => {
        const orderId = order.id
        const currentStatus = order.status
        const currentIdx = DELIVERY_STATUSES.indexOf(currentStatus)
        if (currentIdx < 0 || currentIdx >= DELIVERY_STATUSES.length - 1) return
        const nextStatus = DELIVERY_STATUSES[currentIdx + 1]
        
        // Determinar tabla basándose en el origen normalizado
        const table = order._source === 'core' ? 'orders' : 'delivery_orders'
        
        const { error } = await supabase
            .from(table)
            .update({ status: nextStatus })
            .eq('id', orderId)
        
        if (!error) {
            actualizarEstadoOrderLocal(orderId, nextStatus)
            toast.success(`Estado actualizado a: ${DELIVERY_LABELS[nextStatus]}`)
        } else {
            toast.error('Error actualizando estado: ' + error.message)
        }
    }

    const cancelarPedido = async (order: any) => {
        const orderId = order.id
        const confirmed = window.confirm('¿Seguro que deseas cancelar este pedido? Esta acción no se puede deshacer.')
        if (!confirmed) return

        const table = order._source === 'core' ? 'orders' : 'delivery_orders'

        const { error } = await supabase
            .from(table)
            .update({ status: 'cancelado' })
            .eq('id', orderId)
        if (!error) {
            actualizarEstadoOrderLocal(orderId, 'cancelado')
            toast.error('Pedido cancelado')
        } else {
            toast.error('Error al cancelar: ' + error.message)
        }
    }

    const generarRescateWA = (lead: any) => {
        const url = `https://api.whatsapp.com/send?phone=${lead.customer_phone.replace(/\s/g, '')}&text=Hola ${lead.customer_name}, %C2%A1vi que te interesaron algunos de nuestros productos! %C2%BFTe puedo ayudar aplic%C3%A1ndote un descuento especial para cerrar tu pedido hoy mismo? 👀`;
        window.open(url, '_blank')
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

    // Función Mágica the Ticket The de Térmico (Descarga the PNG Directa)
    const generarTicketTermico = async (order: any) => {
        setImprimiendoId(order.id)
        toast.loading('Generando ticket clásico 🖨️...', { id: 'thermal-toast' })

        try {
            const element = receiptRefs.current[order.id]
            if (!element) throw new Error("Motor térmico no inicializado")

            // Pequeño the delay temporal the para the the de el the theDOM the refresh
            await new Promise(r => setTimeout(r, 100))

            const canvas = await html2canvas(element, { scale: 2, backgroundColor: null })
            const image = canvas.toDataURL('image/png')

            const link = document.createElement('a')
            link.href = image
            link.download = `Ticket_${order.id.split('-')[0].toUpperCase()}.png`
            link.click()

            toast.success('Ticket the descargado con the éxito!', { id: 'thermal-toast' })
        } catch (e: any) {
            toast.error('Falló la the impresión the the de the the papel térmico: ' + e.message, { id: 'thermal-toast' })
        } finally {
            setImprimiendoId(null)
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

    // UI Pagination Bounds computation
    const filteredDelivery = orders.filter(o => o._source === 'legacy_delivery' || o._source === 'core');
    const totalDeliveryPages = Math.ceil(filteredDelivery.length / ITEMS_PER_PAGE);
    const paginatedDelivery = filteredDelivery.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const filteredStandard = orders.filter(o => o._source === 'legacy_standard');
    const totalStandardPages = Math.ceil(filteredStandard.length / ITEMS_PER_PAGE);
    const paginatedStandard = filteredStandard.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const filteredLeads = leads;
    const totalLeadsPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
    const paginatedLeads = filteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Componente the Paginación Premium
    const renderPagination = (totalPages: number) => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-center items-center gap-2 mt-8 pb-4">
                <button 
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="p-2 rounded-xl text-on-surface hover:bg-surface-container-high border border-outline-variant/10 transition-colors disabled:opacity-30 shadow-sm"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                        key={page}
                        onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        className={`w-10 h-10 rounded-xl font-bold transition-all border ${currentPage === page ? 'bg-primary text-on-primary border-primary shadow-lg scale-105' : 'text-on-surface-variant border-transparent hover:bg-surface-container-high'}`}
                    >
                        {page}
                    </button>
                ))}
                
                <button 
                    disabled={currentPage === totalPages}
                    onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className="p-2 rounded-xl text-on-surface hover:bg-surface-container-high border border-outline-variant/10 transition-colors disabled:opacity-30 shadow-sm"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-12 relative w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Central Logística 📦</h1>
                    <p className="text-on-surface-variant">Gestión de órdenes y radar de rescates de carritos.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={forceRefresh} className="px-6 py-2 bg-surface-bright text-on-surface border border-outline-variant/30 rounded-lg hover:bg-surface-container-high transition-colors font-semibold text-sm">
                        Actualizar Sistema
                    </button>
                </div>
            </div>

            {/* TAB NAVIGATOR */}
            <div className="flex gap-4 mb-6 border-b border-outline-variant/20 pb-2 overflow-x-auto custom-scrollbar">
                <button 
                    onClick={() => { setActiveTab('delivery'); setCurrentPage(1); }}
                    className={`font-headline font-black uppercase text-sm px-4 py-2 border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'delivery' ? 'border-green-500 text-green-600' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    🛵 Delivery <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-[10px]">{orders.filter(o => (o._source === 'legacy_delivery' || o._source === 'core') && o.status !== 'completado').length}</span>
                </button>
                <button 
                    onClick={() => { setActiveTab('orders'); setCurrentPage(1); }}
                    className={`font-headline font-black uppercase text-sm px-4 py-2 border-b-2 whitespace-nowrap transition-colors ${activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    Standard / Legacy ({orders.filter(o => o._source === 'legacy_standard').length})
                </button>
                <button 
                    onClick={() => { setActiveTab('leads'); setCurrentPage(1); }}
                    className={`font-headline font-black uppercase text-sm px-4 py-2 border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === 'leads' ? 'border-tertiary text-tertiary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
                >
                    Rescates WhatsApp <span className="bg-tertiary text-on-tertiary px-2 py-0.5 rounded-full text-[10px]">{leads.length}</span>
                </button>
            </div>

            <div className="grid gap-6">

                {/* ========== DELIVERY TAB ========== */}
                {activeTab === 'delivery' && (
                    <>
                        {!ordersCargadas ? (
                            <p className="text-center font-bold text-on-surface-variant animate-pulse py-10">Cargando pedidos delivery... 🛵</p>
                        ) : filteredDelivery.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-outline-variant/20 rounded-2xl bg-surface-container-low">
                                <p className="text-on-surface-variant text-xl font-bold">Sin pedidos delivery aún</p>
                                <p className="text-on-surface-variant/70 text-sm mt-2">Los pedidos del restaurante aparecerán aquí en tiempo real.</p>
                            </div>
                        ) : (
                            <>
                                {paginatedDelivery.map(order => {
                                const statusIdx = DELIVERY_STATUSES.indexOf(order.status)
                                const isCompleted = order.status === 'completado'
                                const items = order.order_items || []

                                return (
                                    <div key={order.id} className={`bg-surface-container-high rounded-2xl border overflow-hidden shadow-xl ${isCompleted ? 'border-outline-variant/10 opacity-60' : 'border-green-300/30'}`}>

                                        {/* Header */}
                                        <div className="bg-surface-container-low px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/5 gap-3">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="font-mono text-xs font-bold text-green-600 tracking-widest px-3 py-1 bg-green-50 rounded-md border border-green-200">
                                                    {order.id}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${DELIVERY_COLORS[order.status] || 'bg-neutral-100 text-neutral-500'}`}>
                                                    {DELIVERY_LABELS[order.status] || order.status}
                                                </span>
                                                <span className="text-xs text-on-surface-variant">
                                                    {new Date(order.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="font-bold text-xl tracking-tighter text-on-surface">S/ {parseFloat(order.total || order.total_amount).toFixed(2)}</div>
                                        </div>

                                        {/* Body */}
                                        <div className="p-6 grid md:grid-cols-12 gap-6">

                                            {/* Cliente + Dirección */}
                                            <div className="md:col-span-4 space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Cliente</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                                            <User size={18} className="text-green-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-on-surface text-sm">{order.customer_name || 'Sin nombre'}</p>
                                                            <p className="text-xs text-green-600 font-medium">📞 {order.customer_phone || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Dirección</p>
                                                    <div className="bg-surface-bright/50 p-3 rounded-lg border border-outline-variant/10 flex items-start gap-2">
                                                        <MapPin size={14} className="text-on-surface-variant mt-0.5 shrink-0" />
                                                        <p className="text-xs text-on-surface">{order.direccion || order.address_text || order.customer_address || 'Sin dirección'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Items */}
                                            <div className="md:col-span-4 border-l-0 md:border-l border-t md:border-t-0 border-outline-variant/10 pt-4 md:pt-0 md:pl-6">
                                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Productos</p>
                                                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {items.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between text-sm bg-surface-container p-2 rounded-md">
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-surface-bright text-on-surface text-xs font-bold px-2 py-0.5 rounded">{item.quantity}x</span>
                                                                <span className="font-medium text-on-surface-variant text-xs line-clamp-1">{item.name}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-on-surface whitespace-nowrap">S/ {parseFloat(item.totalPrice || (item.price * item.quantity) || 0).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Timeline + Action */}
                                            <div className="md:col-span-4 border-l-0 md:border-l border-t md:border-t-0 border-outline-variant/10 pt-4 md:pt-0 md:pl-6 flex flex-col">
                                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Estado del Pedido</p>

                                                {/* Mini timeline */}
                                                <div className="flex-1 space-y-1.5 mb-4">
                                                    {DELIVERY_STATUSES.map((s, i) => (
                                                        <div key={s} className="flex items-center gap-2">
                                                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${i < statusIdx ? 'bg-green-500 border-green-500' :
                                                                i === statusIdx ? 'border-green-500 bg-white' :
                                                                    'border-neutral-300 bg-white'
                                                                }`}>
                                                                {i < statusIdx && (
                                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="4">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                )}
                                                                {i === statusIdx && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                                                            </div>
                                                            <span className={`text-[11px] ${i <= statusIdx ? 'text-on-surface font-medium' : 'text-on-surface-variant/50'
                                                                }`}>{DELIVERY_LABELS[s]}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Botones de acción */}
                                                {order.status === 'cancelado' ? (
                                                    <div className="w-full text-center px-4 py-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 uppercase tracking-widest">
                                                        ❌ Pedido Cancelado
                                                    </div>
                                                ) : !isCompleted ? (
                                                    <>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => avanzarEstadoDelivery(order)}
                                                                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95 text-xs flex items-center justify-center gap-2"
                                                            >
                                                                <CheckCircle size={16} /> Próximo Paso
                                                            </button>
                                                            <button 
                                                                onClick={() => cancelarPedido(order)}
                                                                className="bg-red-50 hover:bg-red-100 text-red-600 p-3 rounded-xl border border-red-100 transition-colors"
                                                                title="Cancelar Pedido"
                                                            >
                                                                <Ban size={18} />
                                                            </button>
                                                        </div>
                                                        
                                                        {/* BOTON IMPRIMIR TICKET */}
                                                        <button
                                                            onClick={() => generarTicketTermico(order)}
                                                            disabled={imprimiendoId === order.id}
                                                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-on-surface text-background hover:bg-primary text-xs font-bold rounded-xl transition-all shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-95 uppercase tracking-widest ${imprimiendoId === order.id ? 'opacity-50 pointer-events-none' : ''}`}
                                                        >
                                                            {imprimiendoId === order.id ? '🖨️ IMPRIMIENDO...' : '🎟️ IMPRIMIR TICKET'}
                                                        </button>
                                                        <div className="fixed overflow-hidden opacity-0 pointer-events-none w-0 h-0 z-[-999]" style={{ left: '-9999px', top: '-9999px' }}>
                                                            <ThermalReceipt
                                                                ref={el => { receiptRefs.current[order.id] = el }}
                                                                order={order}
                                                                storeName={perfil?.store_name || "TU TIENDA"}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-full text-center px-4 py-3 bg-neutral-100 text-neutral-500 text-xs font-bold rounded-xl border border-neutral-200 uppercase tracking-widest">
                                                            ✅ Entregado
                                                        </div>
                                                        <button
                                                            onClick={() => generarTicketTermico(order)}
                                                            disabled={imprimiendoId === order.id}
                                                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-on-surface text-background hover:bg-primary text-xs font-bold rounded-xl transition-all shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-95 uppercase tracking-widest ${imprimiendoId === order.id ? 'opacity-50 pointer-events-none' : ''}`}
                                                        >
                                                            {imprimiendoId === order.id ? '🖨️ IMPRIMIENDO...' : '🎟️ IMPRIMIR TICKET'}
                                                        </button>
                                                        <div className="fixed overflow-hidden opacity-0 pointer-events-none w-0 h-0 z-[-999]" style={{ left: '-9999px', top: '-9999px' }}>
                                                            <ThermalReceipt
                                                                ref={el => { receiptRefs.current[order.id] = el }}
                                                                order={order}
                                                                storeName={perfil?.store_name || "TU TIENDA"}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                                    </div>
                                ))}
                                {renderPagination(totalDeliveryPages)}
                            </>
                        )}
                    </>
                )}

                {activeTab === 'orders' && (
                    <>
                        {filteredStandard.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-outline-variant/20 rounded-2xl bg-surface-container-low">
                                <p className="text-on-surface-variant text-xl font-bold">Aún no tienes pedidos.</p>
                                <p className="text-on-surface-variant/70 text-sm mt-2">Empieza a compartir tu catálogo para recibir órdenes aquí.</p>
                            </div>
                        ) : (
                            <>
                                {paginatedStandard.map((order) => (
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
                                                        {order.customer_name ? order.customer_name.substring(0, 2).toUpperCase() : '👤'}
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
                                                <div className="space-y-2 mt-2 w-full">
                                                    <button
                                                        onClick={() => actualizarEstado(order.id, 'shipped')}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary hover:brightness-110 text-sm font-bold rounded-xl transition-all shadow-[0_10px_20px_rgba(192,193,255,0.2)] hover:scale-[1.02] active:scale-95"
                                                    >
                                                        <Truck size={18} /> Marcar Enviado
                                                    </button>

                                                    {/* ACTION: TICKET VISUAL DIRECTO */}
                                                    <button
                                                        onClick={() => generarTicketTermico(order)}
                                                        disabled={imprimiendoId === order.id}
                                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-on-surface text-background hover:bg-primary text-xs font-bold rounded-xl transition-all shadow-[0_5px_15px_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-95 uppercase tracking-widest ${imprimiendoId === order.id ? 'opacity-50 pointer-events-none' : ''}`}
                                                    >
                                                        {imprimiendoId === order.id ? '🖨️ IMPRIMIENDO...' : '🎟️ IMPRIMIR TICKET'}
                                                    </button>

                                                    {/* MOTOR TÉRMICO OCULTO (Renderizado the the invisible forzoso) */}
                                                    <div className="fixed overflow-hidden opacity-0 pointer-events-none w-0 h-0 z-[-999]" style={{ left: '-9999px', top: '-9999px' }}>
                                                        <ThermalReceipt
                                                            ref={el => { receiptRefs.current[order.id] = el }}
                                                            order={order}
                                                            storeName={perfil?.store_name || "TU TIENDA"}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                                {renderPagination(totalStandardPages)}
                            </>
                        )}
                    </>)}

                {activeTab === 'leads' && (
                    <>
                        {loadingLeads ? (
                            <p className="text-center font-bold text-on-surface-variant animate-pulse py-10">Buscando leads fantasmas...</p>
                        ) : filteredLeads.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-outline-variant/20 rounded-2xl bg-surface-container-low">
                                <p className="text-on-surface-variant text-xl font-bold">Sin actividad fantasma.</p>
                                <p className="text-on-surface-variant/70 text-sm mt-2">Los clientes están cerrando todas sus cuentas correctamente.</p>
                            </div>
                        ) : (
                            <>
                                {paginatedLeads.map((lead) => (
                                <div key={lead.id} className="bg-surface-container-high rounded-2xl border-l-[6px] border-l-tertiary border-y border-r border-outline-variant/5 shadow-2xl overflow-hidden flex flex-col md:flex-row">
                                    <div className="p-6 md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-outline-variant/10">
                                        <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-2">Capturado el {new Date(lead.created_at).toLocaleString()}</p>
                                        <h3 className="font-headline font-black text-2xl text-on-surface uppercase italic tracking-tight">{lead.name || 'Sin nombre'}</h3>
                                        <p className="text-tertiary font-bold mt-1">📞 {lead.phone || '-'}</p>
                                    </div>
                                    <div className="p-6 md:w-1/3 flex flex-col justify-center">
                                        <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-1">Email / Origen</p>
                                        <p className="text-sm font-medium text-on-surface truncate">{lead.email || 'Sin correo'}</p>
                                        <p className="text-[10px] font-bold text-primary mt-1 uppercase">{lead.preference || 'Lead Directo'}</p>
                                    </div>
                                    <div className="p-6 md:flex-1 flex flex-col justify-center items-center bg-surface-container">
                                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Acción Rápida</p>
                                        <div className="flex gap-2 w-full mt-2">
                                            <a
                                                href={`https://wa.me/${lead.phone.replace(/\s/g, '')}?text=Hola%20${encodeURIComponent(lead.name)},%20te%20escribimos%20de%20nuestra%20tienda`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transform transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-[#25D366]/20"
                                            >
                                                💬 Escribir WhatsApp
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                                {renderPagination(totalLeadsPages)}
                            </>
                        )}
                    </>
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
