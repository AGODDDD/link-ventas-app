'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, CheckCircle, Clock, X, Truck, Ban, ChevronRight, MapPin, Phone, User, Printer, Download, Share2, Mail, Copy, FileText, Lock, Zap } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import { ThermalReceipt } from '@/components/dashboard/ThermalReceipt'
import { printThermalTicket } from '@/lib/thermalUtils'
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
    const [planStatus, setPlanStatus] = useState<string | null>(null)

    // Paywall ticket térmico
    const [showTicketPaywall, setShowTicketPaywall] = useState(false)

    // Estado para Compartir Ticket
    const [shareOrder, setShareOrder] = useState<any | null>(null)
    const [shareEmail, setShareEmail] = useState('')
    const [sharePngPreview, setSharePngPreview] = useState<string | null>(null)

    // Paginación UI (Performance Tweak)
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            if (profile) {
                setPerfil(profile)
                setPlanStatus(profile.plan ?? null)
            }

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

    // Impresión Nativa usando el Iframe Oculto
    const imprimirTicketNativo = (order: any) => {
        // Si el plan es free, mostrar paywall en lugar de imprimir
        if (planStatus === 'free') {
            setShowTicketPaywall(true)
            return
        }
        const element = receiptRefs.current[order.id]
        if (!element) {
            toast.error("Motor térmico no inicializado", { id: 'thermal-toast' })
            return
        }
        toast.success('Abriendo panel de impresión nativa... 🖨️', { id: 'thermal-toast' })
        printThermalTicket(element)
    }

    // Compartir Ticket con Vista Previa Rápida en PNG y PDF Oficial
    const abrirCompartir = async (order: any) => {
        setShareOrder(order)
        setShareEmail(order.customer_email || '')
        setSharePngPreview(null)
        
        setTimeout(async () => {
            try {
                const element = receiptRefs.current[order.id]
                if (element) {
                    const canvas = await html2canvas(element, { scale: 1.5, backgroundColor: '#ffffff' })
                    setSharePngPreview(canvas.toDataURL('image/png'))
                }
            } catch (err) {
                console.error("Error al generar vista previa del ticket:", err)
            }
        }, 300)
    }

    const compartirWhatsApp = (order: any) => {
        const phone = order.customer_phone ? order.customer_phone.replace(/\D/g, '') : ''
        const store_name = perfil?.store_name || 'nuestra tienda'
        const pdfUrl = `${window.location.origin}/api/pedidos/ticket?id=${order.id}`
        const customerName = order.customer_name || 'Cliente'
        
        const message = `Hola ${customerName}, ¡gracias por tu compra! Aquí puedes visualizar y descargar el ticket digital oficial de tu pedido en ${store_name.toUpperCase()}: ${pdfUrl}`
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        
        window.open(whatsappUrl, '_blank')
        toast.success('Abriendo WhatsApp... 💬')
    }

    const compartirEmail = (order: any, email: string) => {
        if (!email || !email.includes('@')) {
            toast.error('Por favor, ingresa un correo electrónico válido')
            return
        }
        
        const store_name = perfil?.store_name || 'nuestra tienda'
        const pdfUrl = `${window.location.origin}/api/pedidos/ticket?id=${order.id}`
        const customerName = order.customer_name || 'Cliente'
        const shortId = order.id.split('-')[0].toUpperCase()
        
        const subject = `Ticket Digital - Pedido #${shortId} en ${store_name}`
        const body = `Hola ${customerName},\n\n¡Gracias por tu compra! Adjuntamos el enlace para visualizar y descargar tu ticket digital optimizado:\n\n${pdfUrl}\n\nGracias por tu preferencia.\n\n${store_name.toUpperCase()}`
        
        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        window.open(mailtoUrl, '_blank')
        toast.success('Abriendo cliente de correo... ✉️')
    }

    const copiarEnlacePDF = (order: any) => {
        const pdfUrl = `${window.location.origin}/api/pedidos/ticket?id=${order.id}`
        navigator.clipboard.writeText(pdfUrl)
        toast.success('¡Enlace del ticket PDF copiado al portapapeles! 🔗')
    }

    const descargarPdfDesdeModal = async (order: any) => {
        toast.loading('Generando PDF oficial... 📄', { id: 'modal-pdf' })
        try {
            const response = await fetch(`/api/pedidos/ticket?id=${order.id}`)
            if (!response.ok) throw new Error("No se pudo generar el PDF")
            const blob = await response.blob()
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `Ticket_${order.id.split('-')[0].toUpperCase()}.pdf`
            link.click()
            toast.success('¡Ticket PDF descargado con éxito! 📄', { id: 'modal-pdf' })
        } catch (err: any) {
            toast.error('Falló la descarga del PDF: ' + err.message, { id: 'modal-pdf' })
        }
    }

    const descargarPngDesdeModal = async (order: any) => {
        if (sharePngPreview) {
            const link = document.createElement('a')
            link.href = sharePngPreview
            link.download = `Ticket_${order.id.split('-')[0].toUpperCase()}.png`
            link.click()
            toast.success('Ticket descargado como PNG con éxito!')
        } else {
            toast.loading('Generando ticket clásico...', { id: 'modal-download' })
            try {
                const element = receiptRefs.current[order.id]
                if (!element) throw new Error("Motor térmico no inicializado")
                const canvas = await html2canvas(element, { scale: 2, backgroundColor: null })
                const image = canvas.toDataURL('image/png')
                const link = document.createElement('a')
                link.href = image
                link.download = `Ticket_${order.id.split('-')[0].toUpperCase()}.png`
                link.click()
                toast.success('Ticket descargado como PNG con éxito!', { id: 'modal-download' })
            } catch (err: any) {
                toast.error('Falló la descarga del PNG: ' + err.message, { id: 'modal-download' })
            }
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

            {/* ── PAYWALL MODAL TICKET TÉRMICO (plan free) ─────────────────────────── */}
            {showTicketPaywall && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 60,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        padding: '24px',
                    }}
                    onClick={() => setShowTicketPaywall(false)}
                >
                    <div
                        style={{
                            maxWidth: '380px', width: '100%',
                            background: 'rgba(19,19,26,0.98)',
                            border: '1px solid rgba(139,92,246,0.35)',
                            borderRadius: '24px',
                            padding: '36px 28px',
                            textAlign: 'center',
                            boxShadow: '0 40px 80px rgba(0,0,0,0.85)',
                            position: 'relative',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowTicketPaywall(false)}
                            style={{
                                position: 'absolute', top: '14px', right: '14px',
                                background: 'none', border: 'none',
                                color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px',
                            }}
                        >
                            <X size={18} />
                        </button>

                        <div style={{
                            width: '60px', height: '60px',
                            background: 'rgba(124,58,237,0.15)',
                            border: '1px solid rgba(139,92,246,0.4)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            <Printer size={26} style={{ color: '#a78bfa' }} />
                        </div>

                        <p style={{ fontSize: '19px', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
                            Tickets Térmicos Pro
                        </p>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.7', marginBottom: '24px' }}>
                            La impresión de tickets PDF de <strong style={{ color: '#fff' }}>80mm estilo térmico</strong> es exclusiva del Plan Pro.
                            Profesionaliza tu operación por solo <strong style={{ color: '#a78bfa' }}>S/ 29/mes</strong>.
                        </p>

                        <div style={{ display: 'grid', gap: '8px', marginBottom: '24px', textAlign: 'left' }}>
                            {[
                                'Impresión nativa en impresoras 80mm',
                                'Descarga de ticket en PNG y PDF oficial',
                                'Compartir ticket por WhatsApp o Email',
                                'Productos ilimitados y Culqi incluidos',
                            ].map((f, i) => (
                                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
                                    <span style={{ color: '#a78bfa', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                                </div>
                            ))}
                        </div>

                        <a
                            href={`https://wa.me/51999999999?text=${encodeURIComponent('Hola, quiero activar el Plan Pro de LinkVentas para imprimir tickets térmicos.')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                width: '100%', padding: '14px',
                                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                borderRadius: '12px',
                                fontSize: '14px', fontWeight: 700, color: '#fff',
                                textDecoration: 'none',
                                boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
                            }}
                            onClick={() => setShowTicketPaywall(false)}
                        >
                            <Zap size={15} />
                            Activar Plan Pro — S/ 29/mes
                        </a>
                        <button
                            onClick={() => setShowTicketPaywall(false)}
                            style={{ marginTop: '12px', background: 'none', border: 'none', fontSize: '12px', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                        >
                            Continuar con Plan Emprendedor
                        </button>
                    </div>
                </div>
            )}

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
                                                    {items.map((item: any, idx: number) => {
                                                        const combinedPriceRaw = parseFloat(item.unitPrice || item.price || item.price_at_time || 0)
                                                        const rawMods = item.modifiersList || item.modifiers || item.options || ''
                                                        const isModsObject = rawMods && !Array.isArray(rawMods) && typeof rawMods === 'object' && rawMods.items
                                                        const isModsArray = Array.isArray(rawMods)
                                                        const modsList = isModsObject ? rawMods.items : (isModsArray ? rawMods : [])
                                                        const modsString = (!isModsArray && !isModsObject && typeof rawMods === 'string') ? rawMods : ''
                                                        const itemNotes = item.notes || (isModsObject ? rawMods.notes : '') || ''
                                                        
                                                        const modsTotal = modsList.reduce((acc: number, m: any) => acc + (parseFloat(m.price) || 0), 0)
                                                        const basePrice = combinedPriceRaw - modsTotal

                                                        return (
                                                            <div key={idx} className="flex flex-col text-sm bg-surface-container p-2 rounded-md gap-1">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex items-start gap-2">
                                                                        <span className="bg-surface-bright text-on-surface text-xs font-bold px-2 py-0.5 rounded">{item.quantity}x</span>
                                                                        <span className="font-medium text-on-surface-variant text-xs mt-0.5">{item.name}</span>
                                                                    </div>
                                                                    <span className="text-xs font-bold text-on-surface whitespace-nowrap mt-0.5">S/ {(basePrice * item.quantity).toFixed(2)}</span>
                                                                </div>
                                                                {modsString && (
                                                                    <div className="flex justify-between text-[11px] text-on-surface-variant pl-9">
                                                                        <span className="truncate">- {modsString}</span>
                                                                    </div>
                                                                )}
                                                                {modsList.map((m: any, mIdx: number) => (
                                                                    <div key={mIdx} className="flex justify-between text-[11px] text-on-surface-variant pl-9">
                                                                        <span className="truncate">- {m.name}</span>
                                                                        <span className="whitespace-nowrap">
                                                                            {parseFloat(m.price) > 0 ? `S/ ${(parseFloat(m.price) * item.quantity).toFixed(2)}` : ''}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {itemNotes && (
                                                                    <div className="flex items-start gap-1 text-[11px] text-amber-500 pl-9 italic">
                                                                        <span>📝</span>
                                                                        <span>{itemNotes}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
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
                                                        
                                                        {/* BOTONES IMPRIMIR Y COMPARTIR TICKET */}
                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                            <button
                                                                onClick={() => imprimirTicketNativo(order)}
                                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-on-surface text-background hover:bg-primary text-xs font-bold rounded-xl transition-all shadow-[0_5px_15px_rgba(0,0,0,0.15)] hover:scale-[1.02] active:scale-95 uppercase tracking-wider"
                                                            >
                                                                <Printer size={14} /> Imprimir
                                                            </button>
                                                            <button
                                                                onClick={() => abrirCompartir(order)}
                                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface-container hover:bg-surface-bright text-on-surface-variant text-xs font-bold rounded-xl border border-outline-variant/10 transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-wider"
                                                            >
                                                                <Share2 size={14} /> Compartir
                                                            </button>
                                                        </div>
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
                                                        {/* BOTONES IMPRIMIR Y COMPARTIR TICKET */}
                                                        <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                                                            <button
                                                                onClick={() => imprimirTicketNativo(order)}
                                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-on-surface text-background hover:bg-primary text-xs font-bold rounded-xl transition-all shadow-[0_5px_15px_rgba(0,0,0,0.15)] hover:scale-[1.02] active:scale-95 uppercase tracking-wider"
                                                            >
                                                                <Printer size={14} /> Imprimir
                                                            </button>
                                                            <button
                                                                onClick={() => abrirCompartir(order)}
                                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface-container hover:bg-surface-bright text-on-surface-variant text-xs font-bold rounded-xl border border-outline-variant/10 transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-wider"
                                                            >
                                                                <Share2 size={14} /> Compartir
                                                            </button>
                                                        </div>
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
                            })}
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

                                                    {/* BOTONES IMPRIMIR Y COMPARTIR TICKET */}
                                                    <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                                                        <button
                                                            onClick={() => imprimirTicketNativo(order)}
                                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-on-surface text-background hover:bg-primary text-xs font-bold rounded-xl transition-all shadow-[0_5px_15px_rgba(0,0,0,0.15)] hover:scale-[1.02] active:scale-95 uppercase tracking-wider"
                                                        >
                                                            <Printer size={14} /> Imprimir
                                                        </button>
                                                        <button
                                                            onClick={() => abrirCompartir(order)}
                                                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface-container hover:bg-surface-bright text-on-surface-variant text-xs font-bold rounded-xl border border-outline-variant/10 transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-wider"
                                                        >
                                                            <Share2 size={14} /> Compartir
                                                        </button>
                                                    </div>

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

            {/* MODAL DE COMPARTIR COMPROBANTE - ULTRA PREMIUM */}
            {shareOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative bg-surface rounded-2xl max-w-2xl w-full overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-outline-variant/20 flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => { setShareOrder(null); setSharePngPreview(null) }}
                            className="absolute top-4 right-4 p-2 bg-surface-container-high hover:bg-surface-bright rounded-full text-on-surface z-10 transition-colors border border-white/10"
                        >
                            <X size={20} />
                        </button>

                        {/* Columna Izquierda: Vista Previa Rápida (PNG renderizado) */}
                        <div className="md:w-1/2 p-6 bg-surface-container-low flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-outline-variant/10">
                            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-4">Vista Previa Rápida</p>
                            
                            <div className="w-[190px] h-[320px] bg-white rounded-lg shadow-[0_15px_30px_rgba(0,0,0,0.25)] overflow-y-auto overflow-x-hidden border border-neutral-200 relative scrollbar-none">
                                {sharePngPreview ? (
                                    <img src={sharePngPreview} className="w-full h-auto" alt="Ticket Preview" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-white p-4 text-center">
                                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3"></div>
                                        <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Generando vista...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Columna Derecha: Canales de Envío y PDF Oficial */}
                        <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-6">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-1">Compartir Comprobante</p>
                                <h3 className="font-headline font-black text-xl text-on-surface uppercase italic tracking-tight mb-2">Pedido #{shareOrder.id.split('-')[0].toUpperCase()}</h3>
                                <p className="text-xs text-on-surface-variant leading-relaxed">
                                    Generamos un <strong className="text-primary font-bold">PDF oficial optimizado para ticketera</strong> directamente en el servidor. Puedes compartir el enlace oficial o enviarlo:
                                </p>
                            </div>

                            {/* Acciones principales */}
                            <div className="space-y-3 flex-1 flex flex-col justify-center">
                                {/* CANAL WHATSAPP */}
                                <button
                                    onClick={() => compartirWhatsApp(shareOrder)}
                                    className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transform transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-[#25D366]/20"
                                >
                                    💬 Enviar por WhatsApp
                                </button>

                                {/* DESCARGAR PDF OFICIAL */}
                                <button
                                    onClick={() => descargarPdfDesdeModal(shareOrder)}
                                    className="w-full bg-primary hover:brightness-110 text-on-primary px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transform transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20"
                                >
                                    <FileText size={14} /> Descargar PDF Oficial
                                </button>

                                {/* SECCIÓN CORREO ELECTRÓNICO */}
                                <div className="border-t border-outline-variant/10 pt-4 mt-2">
                                    <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Enviar por Correo Electrónico</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            placeholder="correo@ejemplo.com"
                                            value={shareEmail}
                                            onChange={(e) => setShareEmail(e.target.value)}
                                            className="flex-1 bg-surface-container-low border border-outline-variant/10 focus:border-primary/50 outline-none text-xs text-on-surface px-3 py-2.5 rounded-lg font-medium"
                                        />
                                        <button
                                            onClick={() => compartirEmail(shareOrder, shareEmail)}
                                            className="bg-primary hover:brightness-110 text-on-primary p-2.5 rounded-lg flex items-center justify-center transition-all hover:scale-[1.02] active:scale-95"
                                            title="Enviar Correo"
                                        >
                                            <Mail size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Descargar PNG de respaldo en el pie del modal */}
                            <div className="border-t border-outline-variant/10 pt-4 flex justify-between items-center text-[10px] text-on-surface-variant font-mono">
                                <span>TAMAÑO: TICKET 80MM</span>
                                <button 
                                    onClick={() => descargarPngDesdeModal(shareOrder)}
                                    className="text-primary hover:underline font-bold uppercase tracking-widest flex items-center gap-1"
                                >
                                    <Download size={10} /> Descargar PNG
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
