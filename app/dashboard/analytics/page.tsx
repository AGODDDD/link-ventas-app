'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, DollarSign, ShoppingBag, Users, BarChart3, Calendar, Zap, Download, Package, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { generateInsights, Insight } from '@/lib/analyticsEngine'

type Order = {
    id: string
    created_at: string
    total_amount: string
    status: string
    customer_name: string
    payment_proof_url: string
    metodo_pago: string
    order_items?: any[]
}

const COLORS = ['#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

export default function AnalyticsPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [leads, setLeads] = useState<any[]>([])
    const [carts, setCarts] = useState<any[]>([])
    const [insights, setInsights] = useState<Insight[]>([])
    const [loading, setLoading] = useState(true)
    const [periodo, setPeriodo] = useState<'7d' | '30d' | 'all'>('30d')
    const [planStatus, setPlanStatus] = useState<string | null>(null)

    useEffect(() => {
        const cargarDatos = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [coreRes, leadsRes, profileRes, cartsRes] = await Promise.all([
                // Core Orders + Items
                supabase.from('orders').select('*, order_items(*)').eq('store_id', user.id).order('created_at', { ascending: true }),
                // Leads
                supabase.from('store_leads').select('*').eq('store_id', user.id),
                // Plan
                supabase.from('profiles').select('plan').eq('id', user.id).single(),
                // Abandoned Carts
                supabase.from('abandoned_carts').select('*').eq('store_id', user.id)
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
                        payment_proof_url: o.payment_proof_url || 'NUEVO_CORE',
                        metodo_pago: o.metodo_pago || 'whatsapp',
                        order_items: o.order_items || []
                    })
                })
            }

            // Ordenar por fecha para los gráficos
            unified.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

            setOrders(unified)
            if (leadsRes.data) setLeads(leadsRes.data)
            if (cartsRes.data) setCarts(cartsRes.data)
            
            // Run Analytics AI Engine
            const generatedInsights = generateInsights(unified, leadsRes.data || [], cartsRes.data || [])
            setInsights(generatedInsights)
            
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

    // === VENTAS POR DÍA (Área Interactiva) ===
    const ventasPorDia = useMemo(() => {
        const dias: { date: string; label: string; Ventas: number; Ordenes: number }[] = []
        const numDias = periodo === '7d' ? 7 : (periodo === '30d' ? 30 : 30); // Limitar a 30 puntos visuales máx para "all"
        for (let i = numDias - 1; i >= 0; i--) {
            const fecha = new Date()
            fecha.setDate(fecha.getDate() - i)
            const key = fecha.toISOString().split('T')[0]
            const label = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
            
            const ordenesDia = orders.filter(o => o.created_at.split('T')[0] === key)
            dias.push({
                date: key,
                label,
                Ventas: ordenesDia.reduce((acc, o) => acc + parseFloat(o.total_amount || '0'), 0),
                Ordenes: ordenesDia.length
            })
        }
        return dias
    }, [orders, periodo])

    // === MÉTODO DE PAGO ===
    const metodosPagoData = useMemo(() => {
        const efectivo = ordersFiltradas.filter(o => o.payment_proof_url === 'CONTRA_ENTREGA' || o.metodo_pago === 'contra_entrega').length
        const transferencia = ordersFiltradas.filter(o => o.payment_proof_url !== 'CONTRA_ENTREGA' && o.metodo_pago !== 'culqi' && o.metodo_pago !== 'contra_entrega').length
        const culqi = ordersFiltradas.filter(o => o.metodo_pago === 'culqi').length
        
        return [
            { name: 'Transferencia/Yape', value: transferencia },
            { name: 'Contra Entrega', value: efectivo },
            { name: 'Tarjeta (Culqi)', value: culqi },
        ].filter(m => m.value > 0)
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

    // === TOP PRODUCTOS ===
    const topProductos = useMemo(() => {
        const map = new Map<string, { name: string; total: number; count: number }>()
        ordersFiltradas.forEach(o => {
            if (o.order_items) {
                o.order_items.forEach((item: any) => {
                    const existing = map.get(item.name) || { name: item.name, total: 0, count: 0 }
                    existing.total += parseFloat(item.price) * item.quantity
                    existing.count += item.quantity
                    map.set(item.name, existing)
                })
            }
        })
        return Array.from(map.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
    }, [ordersFiltradas])

    // === EXPORTAR CSV ===
    const exportarCSV = () => {
        const csvRows = []
        // Headers
        csvRows.push(['ID Pedido', 'Fecha', 'Cliente', 'Estado', 'Metodo Pago', 'Monto Total'].join(','))
        
        ordersFiltradas.forEach(o => {
            const row = [
                o.id,
                `"${new Date(o.created_at).toLocaleString()}"`,
                `"${o.customer_name}"`,
                o.status,
                o.metodo_pago,
                parseFloat(o.total_amount).toFixed(2)
            ]
            csvRows.push(row.join(','))
        })
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `linkventas_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    if (loading) return <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 font-bold animate-pulse">Analizando métricas... 📊</div>

    return (
        <div className="space-y-8 pb-12 relative w-full">

            {/* ── PAYWALL OVERLAY para plan free ─────────────────────────────────── */}
            {planStatus === 'free' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 40,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    background: 'rgba(10, 10, 20, 0.4)',
                    padding: '24px',
                    paddingTop: '100px',
                    borderRadius: '24px',
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
                    }} className="animate-in slide-in-from-bottom-4 fade-in duration-700">
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
                            Desbloquea métricas de ventas en tiempo real, gráficos históricos interactivos, ranking de productos y exportación CSV.
                        </p>
                        <div style={{ display: 'grid', gap: '10px', marginBottom: '24px', textAlign: 'left' }}>
                            {[
                                'Exportación de datos a Excel/CSV',
                                'Gráficos interactivos de ingresos',
                                'Ranking de los 5 productos más vendidos',
                                'Top clientes y retención',
                                'Distribución de métodos de pago',
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
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">Analytics</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Inteligencia comercial de tu operación.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Botón Exportar CSV */}
                    <button
                        onClick={exportarCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-bold shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                    >
                        <Download size={16} />
                        Exportar CSV
                    </button>

                    {/* Period Selector */}
                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800/50 p-1 gap-1 shadow-sm">
                        {(['7d', '30d', 'all'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriodo(p)}
                                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                                    periodo === p
                                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100'
                                }`}
                            >
                                {p === '7d' ? '7 Días' : p === '30d' ? '30 Días' : 'Todo'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Insights Grid (2x2 Flat Semantic UI) */}
            {insights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map(insight => {
                        const styleConfig = {
                            danger: { bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-900/50', iconClass: 'text-red-500', Icon: AlertTriangle },
                            warning: { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900/50', iconClass: 'text-amber-500', Icon: AlertTriangle },
                            success: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/50', iconClass: 'text-emerald-500', Icon: CheckCircle2 },
                            prediction: { bg: 'bg-indigo-50 dark:bg-indigo-950/20', border: 'border-indigo-200 dark:border-indigo-900/50', iconClass: 'text-indigo-500', Icon: TrendingUp },
                            info: { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-900/50', iconClass: 'text-blue-500', Icon: Info }
                        };
                        const conf = styleConfig[insight.type];
                        const Icon = conf.Icon;
                        
                        return (
                            <div key={insight.id} className={`${conf.bg} ${conf.border} border p-5 rounded-xl shadow-sm flex gap-4 transition-colors`}>
                                <div className="mt-1 flex-shrink-0">
                                    <Icon className={`w-5 h-5 ${conf.iconClass}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{insight.title}</h4>
                                        {insight.metric && (
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${conf.bg} ${conf.border} border ${conf.iconClass} bg-opacity-50`}>
                                                {insight.metric}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                                        {insight.message}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* KPI Cards (Glassmorphism + Gradients) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-900/10 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm backdrop-blur-xl group hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-16 h-16 text-primary" />
                    </div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Ingresos</p>
                    </div>
                    <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 relative z-10">S/ {formatCurrency(ingresoTotal)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium relative z-10">{ordersFiltradas.length} transacciones</p>
                </div>

                <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-900/10 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm backdrop-blur-xl group hover:border-green-500/30 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShoppingBag className="w-16 h-16 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Ticket Promedio</p>
                    </div>
                    <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 relative z-10">S/ {formatCurrency(ticketPromedio)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium relative z-10">Por cada orden</p>
                </div>

                <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-900/10 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm backdrop-blur-xl group hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-16 h-16 text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Conversión</p>
                    </div>
                    <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 relative z-10">{tasaConversion}%</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium relative z-10">{leads.length} leads generados</p>
                </div>

                <div className="bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-900/10 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm backdrop-blur-xl group hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-16 h-16 text-blue-500" />
                    </div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Completados</p>
                    </div>
                    <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 relative z-10">{pedidosCompletados}</p>
                    <p className="text-xs text-blue-500/80 dark:text-blue-400/80 mt-2 font-bold relative z-10">{pedidosPendientes} pendientes</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recharts Area Chart */}
                <div className="lg:col-span-2 bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" /> Ingresos en el Tiempo
                        </h3>
                    </div>
                    <div className="h-72 w-full text-xs font-bold font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ventasPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', backgroundColor: 'var(--dash-surface)', color: 'var(--dash-text-primary)' }}
                                    formatter={(value: any) => [`S/ ${formatCurrency(Number(value))}`, 'Ingresos']}
                                />
                                <Area type="monotone" dataKey="Ventas" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods Donut */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex flex-col">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">Métodos de Pago</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Distribución de preferencias de clientes.</p>
                    
                    <div className="flex-1 flex items-center justify-center -my-4">
                        {metodosPagoData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={metodosPagoData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {metodosPagoData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#18181b', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        formatter={(value: any) => [`${value} pedidos`, '']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-xs font-bold text-zinc-500">Sin datos de pago</p>
                        )}
                    </div>
                    
                    <div className="mt-2 space-y-2">
                        {metodosPagoData.map((m, i) => (
                            <div key={i} className="flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                    <span className="text-zinc-600 dark:text-zinc-300">{m.name}</span>
                                </div>
                                <span className="text-zinc-900 dark:text-zinc-100">{Math.round((m.value / ordersFiltradas.length) * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Top Products & Top Customers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Products */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" /> Top 5 Productos Más Vendidos
                    </h3>
                    {topProductos.length > 0 ? (
                        <div className="space-y-4">
                            {topProductos.map((prod, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 hover:border-primary/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shadow-sm ${
                                            i === 0 ? 'bg-primary text-white shadow-primary/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                                        }`}>
                                            #{i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{prod.name}</p>
                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{prod.count} unidades vendidas</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-zinc-900 dark:text-zinc-100 text-lg tracking-tighter">S/ {formatCurrency(prod.total)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                            <Package size={32} className="mb-2 opacity-20" />
                            <p className="text-xs font-bold text-center">Aún no hay ventas de productos para analizar.</p>
                        </div>
                    )}
                </div>

                {/* Top Customers */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-500" /> Top 5 Mejores Clientes
                    </h3>
                    {topClientes.length > 0 ? (
                        <div className="space-y-4">
                            {topClientes.map((cliente, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 hover:border-green-500/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-xs shadow-inner">
                                            {cliente.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{cliente.name}</p>
                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{cliente.count} {cliente.count === 1 ? 'compra' : 'compras'} (Retención)</p>
                                        </div>
                                    </div>
                                    <p className="font-black text-green-600 dark:text-green-500 text-lg tracking-tighter">S/ {formatCurrency(cliente.total)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                            <Users size={32} className="mb-2 opacity-20" />
                            <p className="text-xs font-bold text-center">Aún no hay clientes recurrentes.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
