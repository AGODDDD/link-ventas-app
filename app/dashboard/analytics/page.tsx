'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, BarChart3, Calendar, ArrowRight, Lock, Zap } from 'lucide-react'

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
    const [planStatus, setPlanStatus] = useState<string | null>(null)

    useEffect(() => {
        const cargarDatos = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [coreRes, leadsRes, profileRes] = await Promise.all([
                // Core Orders
                supabase.from('orders').select('*').eq('store_id', user.id).order('created_at', { ascending: true }),
                // Leads
                supabase.from('store_leads').select('*').eq('store_id', user.id),
                // Plan
                supabase.from('profiles').select('plan').eq('id', user.id).single(),
            ])

            if (profileRes.data) setPlanStatus(profileRes.data.plan ?? null)

            let unified: Order[] = []

            if (coreRes.data) {
                coreRes.data.forEach((o: any) => {
                    unified.push({
                        id: o.id,
                        created_at: o.created_at,
                        total_amount: o.total?.toString() || o.total_amount?.toString() || '0',
                        status: o.status,
                        customer_name: o.customer_name || 'Sin nombre',
                        payment_proof_url: o.payment_proof_url || 'NUEVO_CORE'
                    })
                })
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

    const pedidosPendientes = ordersFiltradas.filter(o => 
        ['pending', 'pendiente', 'pendiente_pago', 'pendiente_verificacion'].includes(o.status)
    ).length
    const pedidosCompletados = ordersFiltradas.filter(o => 
        ['paid', 'shipped', 'completado'].includes(o.status)
    ).length

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

    if (loading) return <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 font-bold animate-pulse">Analizando métricas... 📊</div>

    return (
        <div className="space-y-8 pb-12 relative w-full">

            {/* ── PAYWALL OVERLAY para plan free ─────────────────────────────────── */}
            {planStatus === 'free' && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(18px)',
                    WebkitBackdropFilter: 'blur(18px)',
                    background: 'rgba(10, 10, 20, 0.55)',
                    padding: '24px',
                }}>
                    <div style={{
                        maxWidth: '400px',
                        width: '100%',
                        background: 'rgba(19,19,26,0.95)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: '24px',
                        padding: '40px 32px',
                        textAlign: 'center',
                        boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
                    }}>
                        <div style={{
                            width: '64px', height: '64px',
                            background: 'rgba(124,58,237,0.15)',
                            border: '1px solid rgba(139,92,246,0.4)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px',
                        }}>
                            <BarChart3 size={28} style={{ color: '#a78bfa' }} />
                        </div>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
                            Analíticas Avanzadas Pro
                        </p>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.7', marginBottom: '28px' }}>
                            Desbloquea métricas de ventas en tiempo real, gráficos históricos y exportación de datos CSV.
                            Sube a Pro por <strong style={{ color: '#a78bfa' }}>S/ 29/mes</strong>.
                        </p>
                        <div style={{ display: 'grid', gap: '10px', marginBottom: '24px', textAlign: 'left' }}>
                            {[
                                'Ingresos totales y ticket promedio',
                                'Gráfico de ventas últimos 7 días',
                                'Top 5 clientes por facturación',
                                'Tasa de conversión de leads',
                                'Métodos de pago más usados',
                            ].map((f, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
                                    <span style={{ color: '#a78bfa', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                                </div>
                            ))}
                        </div>
                        <a
                            href={`https://wa.me/51999999999?text=${encodeURIComponent('Hola, quiero activar el Plan Pro de LinkVentas para acceder a las analíticas avanzadas.')}`}
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
                        >
                            <Zap size={16} />
                            Activar Plan Pro — S/ 29/mes
                        </a>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">Analytics 📊</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Inteligencia comercial de tu operación.</p>
                </div>
                {/* Period Selector */}
                <div className="flex items-center bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800/50 p-1 gap-1">
                    {(['7d', '30d', 'all'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriodo(p)}
                            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                                periodo === p
                                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100'
                            }`}
                        >
                            {p === '7d' ? '7 Días' : p === '30d' ? '30 Días' : 'Todo'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Ingresos</p>
                        <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100">S/ {ingresoTotal.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{ordersFiltradas.length} transacciones</p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Ticket Promedio</p>
                        <ShoppingBag className="w-4 h-4 text-secondary" />
                    </div>
                    <p className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100">S/ {ticketPromedio.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Por orden</p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Conversión</p>
                        <TrendingUp className="w-4 h-4 text-secondary" />
                    </div>
                    <p className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100">{tasaConversion}%</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{leads.length} leads → {ordersFiltradas.length} ventas</p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Pendientes</p>
                        <Calendar className="w-4 h-4 text-tertiary-fixed" />
                    </div>
                    <p className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100">{pedidosPendientes}</p>
                    <p className="text-xs text-secondary mt-1">{pedidosCompletados} completados</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Bar Chart */}
                <div className="lg:col-span-2 bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" /> Ventas Últimos 7 Días
                        </h3>
                    </div>
                    <div className="flex items-end justify-between gap-2 md:gap-4 h-48 px-2">
                        {Array.from({length: 7}).map((_, i) => {
                            const d = new Date()
                            d.setDate(d.getDate() - (6 - i))
                            const dayString = d.toDateString()
                            const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === dayString)
                            const totalDay = dayOrders.reduce((acc, o) => acc + parseFloat(o.total_amount || '0'), 0)
                            
                            // Calculando alturas relativas
                            const maxSales = Math.max(
                                1, 
                                ...Array.from({length: 7}).map((_, j) => {
                                    const dTemp = new Date()
                                    dTemp.setDate(dTemp.getDate() - (6 - j))
                                    const dOrders = orders.filter(o => new Date(o.created_at).toDateString() === dTemp.toDateString())
                                    return dOrders.reduce((acc, o) => acc + parseFloat(o.total_amount || '0'), 0)
                                })
                            )
                            const heightPercentage = Math.max(5, (totalDay / maxSales) * 100)

                            return (
                                <div key={i} className="flex flex-col items-center gap-2 w-full group/bar relative">
                                    {/* Tooltip on Hover */}
                                    <div className="absolute -top-8 bg-white dark:bg-zinc-900-highest text-zinc-900 dark:text-zinc-100 text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                                        S/ {totalDay.toFixed(2)}
                                    </div>
                                    <div className="w-full bg-white dark:bg-zinc-900 rounded-t-lg relative h-40 flex items-end justify-center transition-all bg-opacity-50 group-hover/bar:bg-opacity-100">
                                        <div 
                                            className="w-full bg-primary/40 rounded-t-lg hover:bg-primary transition-all flex border-t-2 border-primary" 
                                            style={{ height: `${heightPercentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-widest text-center">
                                        {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6">Métodos de Pago</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-zinc-500 dark:text-zinc-400">Transferencia/QR</span>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">{metodosPago.transferencia}</span>
                            </div>
                            <div className="h-3 w-full bg-white dark:bg-zinc-900 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${ordersFiltradas.length > 0 ? (metodosPago.transferencia / ordersFiltradas.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-zinc-500 dark:text-zinc-400">Contra Entrega</span>
                                <span className="font-bold text-zinc-900 dark:text-zinc-100">{metodosPago.efectivo}</span>
                            </div>
                            <div className="h-3 w-full bg-white dark:bg-zinc-900 rounded-full overflow-hidden">
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
                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{ordersFiltradas.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Customers */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Top 5 Clientes
                </h3>
                {topClientes.length > 0 ? (
                    <div className="space-y-3">
                        {topClientes.map((cliente, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white dark:bg-zinc-900 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                        i === 0 ? 'bg-primary/20 text-primary' : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'
                                    }`}>
                                        #{i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{cliente.name}</p>
                                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{cliente.count} {cliente.count === 1 ? 'compra' : 'compras'}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-zinc-900 dark:text-zinc-100">S/ {cliente.total.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">Aún no hay datos suficientes para el ranking.</p>
                )}
            </div>
        </div>
    )
}
