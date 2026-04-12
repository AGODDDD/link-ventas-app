'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, BarChart3, Calendar, ArrowRight } from 'lucide-react'

type Order = {
    id: string
    created_at: string
    total_amount: string
    status: string
    customer_name: string
    payment_proof_url: string
}

export default function AnalyticsPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [periodo, setPeriodo] = useState<'7d' | '30d' | 'all'>('30d')

    useEffect(() => {
        const cargarDatos = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [ordersRes, deliveryRes, leadsRes] = await Promise.all([
                supabase.from('orders').select('*').eq('merchant_id', user.id).order('created_at', { ascending: true }),
                supabase.from('delivery_orders').select('*').eq('store_id', user.id).order('created_at', { ascending: true }),
                supabase.from('store_leads').select('*').eq('store_id', user.id)
            ])

            let unified: Order[] = []
            if (ordersRes.data) {
                unified = [...ordersRes.data]
            }
            if (deliveryRes.data) {
                const normalized = deliveryRes.data.map((d: any) => ({
                    id: d.id,
                    created_at: d.created_at,
                    total_amount: d.total.toString(),
                    status: d.status,
                    customer_name: d.customer_name,
                    payment_proof_url: d.metodo_pago === 'contra_entrega' ? 'CONTRA_ENTREGA' : 'WHATSAPP'
                }))
                unified = [...unified, ...normalized]
            }

            // Ordenar por fecha para los gráficos
            unified.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

            setOrders(unified)
            if (leadsRes.data) setLeads(leadsRes.data)
            setLoading(false)
        }
        cargarDatos()
    }, [])

    // Filtrar por periodo
    const ordersFiltradas = useMemo(() => {
        if (periodo === 'all') return orders
        const dias = periodo === '7d' ? 7 : 30
        const limite = Date.now() - dias * 24 * 60 * 60 * 1000
        return orders.filter(o => new Date(o.created_at).getTime() >= limite)
    }, [orders, periodo])

    // === MÉTRICAS PRINCIPALES ===
    const ingresoTotal = useMemo(() =>
        ordersFiltradas.reduce((acc, o) => acc + parseFloat(o.total_amount || '0'), 0)
    , [ordersFiltradas])

    const ticketPromedio = ordersFiltradas.length > 0 ? ingresoTotal / ordersFiltradas.length : 0

    const pedidosPendientes = ordersFiltradas.filter(o => o.status === 'pending').length
    const pedidosCompletados = ordersFiltradas.filter(o => o.status === 'paid' || o.status === 'shipped').length

    const tasaConversion = leads.length > 0
        ? Math.round((ordersFiltradas.length / leads.length) * 100)
        : 0

    // === VENTAS POR DÍA (últimos 7 días) ===
    const ventasPorDia = useMemo(() => {
        const dias: { label: string; monto: number; count: number }[] = []
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date()
            fecha.setDate(fecha.getDate() - i)
            const key = fecha.toISOString().split('T')[0]
            const label = fecha.toLocaleDateString('es-PE', { weekday: 'short' }).toUpperCase()
            const ordenesDia = orders.filter(o => o.created_at.split('T')[0] === key)
            dias.push({
                label,
                monto: ordenesDia.reduce((acc, o) => acc + parseFloat(o.total_amount || '0'), 0),
                count: ordenesDia.length
            })
        }
        return dias
    }, [orders])

    const maxVentaDia = Math.max(...ventasPorDia.map(d => d.monto), 1)

    // === MÉTODO DE PAGO ===
    const metodosPago = useMemo(() => {
        const efectivo = ordersFiltradas.filter(o => o.payment_proof_url === 'CONTRA_ENTREGA').length
        const transferencia = ordersFiltradas.length - efectivo
        return { efectivo, transferencia }
    }, [ordersFiltradas])

    // === TOP CLIENTES ===
    const topClientes = useMemo(() => {
        const map = new Map<string, { name: string; total: number; count: number }>()
        ordersFiltradas.forEach(o => {
            const existing = map.get(o.customer_name) || { name: o.customer_name, total: 0, count: 0 }
            existing.total += parseFloat(o.total_amount || '0')
            existing.count += 1
            map.set(o.customer_name, existing)
        })
        return Array.from(map.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
    }, [ordersFiltradas])

    if (loading) return <div className="p-8 text-center text-on-surface-variant font-bold animate-pulse">Analizando métricas... 📊</div>

    return (
        <div className="space-y-8 pb-12 relative w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Analytics 📊</h1>
                    <p className="text-on-surface-variant">Inteligencia comercial de tu operación.</p>
                </div>
                {/* Period Selector */}
                <div className="flex items-center bg-surface-container-high rounded-lg border border-outline-variant/10 p-1 gap-1">
                    {(['7d', '30d', 'all'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriodo(p)}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                                periodo === p
                                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                                    : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                        >
                            {p === '7d' ? '7 Días' : p === '30d' ? '30 Días' : 'Todo'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Ingresos</p>
                        <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-3xl font-bold tracking-tighter text-on-surface">S/ {ingresoTotal.toFixed(2)}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{ordersFiltradas.length} transacciones</p>
                </div>

                <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Ticket Promedio</p>
                        <ShoppingBag className="w-4 h-4 text-secondary" />
                    </div>
                    <p className="text-3xl font-bold tracking-tighter text-on-surface">S/ {ticketPromedio.toFixed(2)}</p>
                    <p className="text-xs text-on-surface-variant mt-1">Por orden</p>
                </div>

                <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Conversión</p>
                        <TrendingUp className="w-4 h-4 text-secondary" />
                    </div>
                    <p className="text-3xl font-bold tracking-tighter text-on-surface">{tasaConversion}%</p>
                    <p className="text-xs text-on-surface-variant mt-1">{leads.length} leads → {ordersFiltradas.length} ventas</p>
                </div>

                <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Pendientes</p>
                        <Calendar className="w-4 h-4 text-tertiary-fixed" />
                    </div>
                    <p className="text-3xl font-bold tracking-tighter text-on-surface">{pedidosPendientes}</p>
                    <p className="text-xs text-secondary mt-1">{pedidosCompletados} completados</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Bar Chart */}
                <div className="lg:col-span-2 bg-surface-container-high p-6 rounded-xl border border-outline-variant/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-on-surface flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" /> Ventas Últimos 7 Días
                        </h3>
                    </div>
                    <div className="flex items-end justify-between gap-3 h-48">
                        {ventasPorDia.map((dia, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <p className="text-[10px] font-bold text-primary">
                                    {dia.monto > 0 ? `S/${dia.monto.toFixed(0)}` : ''}
                                </p>
                                <div className="w-full relative rounded-t-md overflow-hidden bg-surface-container" style={{ height: '100%' }}>
                                    <div
                                        className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md transition-all duration-700 hover:from-primary hover:to-primary/80"
                                        style={{ height: `${Math.max((dia.monto / maxVentaDia) * 100, dia.monto > 0 ? 8 : 2)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-on-surface-variant uppercase">{dia.label}</p>
                                {dia.count > 0 && (
                                    <p className="text-[9px] text-on-surface-variant/50">{dia.count} ord</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5">
                    <h3 className="font-bold text-on-surface mb-6">Métodos de Pago</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-on-surface-variant">Transferencia/QR</span>
                                <span className="font-bold text-on-surface">{metodosPago.transferencia}</span>
                            </div>
                            <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${ordersFiltradas.length > 0 ? (metodosPago.transferencia / ordersFiltradas.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-on-surface-variant">Contra Entrega</span>
                                <span className="font-bold text-on-surface">{metodosPago.efectivo}</span>
                            </div>
                            <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-tertiary-fixed rounded-full transition-all duration-500"
                                    style={{ width: `${ordersFiltradas.length > 0 ? (metodosPago.efectivo / ordersFiltradas.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mini donut visual */}
                    <div className="mt-8 flex items-center justify-center">
                        <div className="relative w-28 h-28">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-container" />
                                <circle
                                    cx="18" cy="18" r="14" fill="none" strokeWidth="4"
                                    className="text-primary"
                                    strokeDasharray={`${ordersFiltradas.length > 0 ? (metodosPago.transferencia / ordersFiltradas.length) * 88 : 0} 88`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-on-surface">{ordersFiltradas.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Customers */}
            <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5">
                <h3 className="font-bold text-on-surface mb-6 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Top 5 Clientes
                </h3>
                {topClientes.length > 0 ? (
                    <div className="space-y-3">
                        {topClientes.map((cliente, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                        i === 0 ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'
                                    }`}>
                                        #{i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-on-surface">{cliente.name}</p>
                                        <p className="text-[10px] text-on-surface-variant">{cliente.count} {cliente.count === 1 ? 'compra' : 'compras'}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-on-surface">S/ {cliente.total.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-on-surface-variant py-8">Aún no hay datos suficientes para el ranking.</p>
                )}
            </div>
        </div>
    )
}
