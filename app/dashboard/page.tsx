'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useDashboardStore } from '@/store/useDashboardStore'
import { useCustomerStore } from '@/store/useCustomerStore'
import { jsonToCSV, downloadFile } from '@/lib/csvUtils'
export default function DashboardPage() {
  const { orders, ordersCargadas, cargarOrders } = useDashboardStore()
  const customerStore = useCustomerStore()
  const [leadsNuevos, setLeadsNuevos] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  // Saneamiento: Limpiar pedidos UUID (huérfanos de pruebas de hoy)
  useEffect(() => {
    if (customerStore.orders.some(o => o.id.length > 20)) {
        console.log('🧹 Limpiando pedidos huérfanos (UUIDs)...')
        const cleanOrders = customerStore.orders.filter(o => o.id.length <= 20)
        // Usamos set para actualizar (necesitamos acceder al estado interno del store)
        useCustomerStore.setState({ orders: cleanOrders })
    }
  }, [customerStore.orders])

  // Estadísticas calculadas reactivamente desde el cerebro Zustand
  const ingresosTotales = useMemo(() => {
    return orders.reduce((acc, obj) => acc + parseFloat(obj.total_amount || 0), 0)
  }, [orders])

  const pedidosTotales = orders.length
  
  // Paginación UI (Performance Tweak)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const ordenesRecientes = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Componente de Paginación Premium
  const renderPagination = () => {
        if (totalPages <= 1) return null;
        // Limitamos visualmente para no saturar si hay cientos de páginas
        const pageList = Array.from({ length: Math.min(10, totalPages) }, (_, i) => i + 1);
        
        return (
            <div className="flex justify-center items-center gap-2 mt-4 pb-6 border-t border-outline-variant/5 pt-4 bg-surface-container">
                <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 rounded-xl text-on-surface hover:bg-surface-container-high border border-outline-variant/10 transition-colors disabled:opacity-30 shadow-sm"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                
                {pageList.map(page => (
                    <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl font-bold transition-all border ${currentPage === page ? 'bg-primary text-on-primary border-primary shadow-lg scale-105' : 'text-on-surface-variant border-transparent hover:bg-surface-container-high'}`}
                    >
                        {page}
                    </button>
                ))}
                
                {totalPages > 10 && <span className="text-on-surface-variant font-bold">...</span>}

                <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-2 rounded-xl text-on-surface hover:bg-surface-container-high border border-outline-variant/10 transition-colors disabled:opacity-30 shadow-sm"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
        );
  };

  // KPIs dinámicos reales
  const pedidosHoy = useMemo(() => {
    const hoy = new Date().toDateString()
    return orders.filter(o => new Date(o.created_at).toDateString() === hoy).length
  }, [orders])

  const crecimiento = useMemo(() => {
    const ahora = Date.now()
    const hace7dias = ahora - 7 * 24 * 60 * 60 * 1000
    const hace14dias = ahora - 14 * 24 * 60 * 60 * 1000
    const ventasSemanaActual = orders.filter(o => new Date(o.created_at).getTime() >= hace7dias)
      .reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0)
    const ventasSemanaPasada = orders.filter(o => {
      const t = new Date(o.created_at).getTime()
      return t >= hace14dias && t < hace7dias
    }).reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0)
    if (ventasSemanaPasada === 0) return ventasSemanaActual > 0 ? 100 : 0
    return Math.round(((ventasSemanaActual - ventasSemanaPasada) / ventasSemanaPasada) * 100)
  }, [orders])

  const handleExportOrders = () => {
    if (orders.length === 0) return;
    
    // Mapeo amigable para Excel
    const dataToExport = orders.map(o => ({
      "ID Pedido": o.id.split('-')[0].toUpperCase(),
      "Cliente": o.customer_name || "Anónimo",
      "Monto": `S/ ${parseFloat(o.total_amount).toFixed(2)}`,
      "Fecha": new Date(o.created_at).toLocaleDateString(),
      "Hora": new Date(o.created_at).toLocaleTimeString(),
      "Metodo": o.payment_proof_url === 'CONTRA_ENTREGA' ? 'Efectivo' : 'QR/Voucher',
      "Estado": o.status
    }));

    const csv = jsonToCSV(dataToExport);
    downloadFile(csv, `Ventas_${new Date().toISOString().split('T')[0]}.csv`);
  }

  useEffect(() => {
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Cargar Orders al cerebro Zustand (0ms si ya están en caché)
      await cargarOrders(user.id)

      // Cargar Leads (independiente)
      const { data: leads } = await supabase
        .from('store_leads')
        .select('id')
        .eq('store_id', user.id)

      if (leads) setLeadsNuevos(leads.length)
    }
    
    loadStats()
  }, [cargarOrders])

  return (
    <>
      {/* BEGIN: Dashboard Header */}
      <div className="flex justify-between items-end animate-fade-in-up">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-2">Resumen General</h2>
          <p className="text-on-surface-variant text-sm">Control centralizado de transacciones y estados logísticos.</p>
        </div>
      </div>
      {/* END: Dashboard Header */}

      {/* BEGIN: Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-10 mb-12">
        {/* Card: Total Ingresos */}
        <div className="metric-card card-bg p-6 rounded-xl border border-outline-variant/10 animate-fade-in-up delay-100">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Total de Ingresos</p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-bold text-on-surface">S/ {ingresosTotales.toFixed(2)}</h3>
            <span className={`text-xs font-medium ${crecimiento >= 0 ? 'text-success' : 'text-error'}`}>{crecimiento >= 0 ? '+' : ''}{crecimiento}%</span>
          </div>
          <div className="mt-4 h-1 w-32 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full w-[75%] gradient-accent"></div>
          </div>
        </div>

        {/* Card: Pedidos Totales */}
        <div className="metric-card card-bg p-6 rounded-xl border border-outline-variant/10 relative overflow-hidden animate-fade-in-up delay-200">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Pedidos Totales</p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-bold text-on-surface">{pedidosTotales}</h3>
            <span className="text-xs font-medium text-success">↑ {pedidosHoy} hoy</span>
          </div>
          {/* Tiny Bar Chart */}
          <div className="mt-4 flex items-end space-x-1 h-10">
            <div className="w-1 bg-surface-container h-4 rounded-full transition-all duration-500 hover:h-8 hover:bg-primary"></div>
            <div className="w-1 bg-surface-container h-6 rounded-full transition-all duration-500 hover:h-10 hover:bg-primary"></div>
            <div className="w-1 bg-surface-bright h-8 rounded-full transition-all duration-500 hover:h-12 hover:bg-primary"></div>
            <div className="w-1 bg-outline-variant/50 h-10 rounded-full transition-all duration-500 hover:h-14 hover:bg-primary"></div>
            <div className="w-1 bg-surface-bright h-6 rounded-full transition-all duration-500 hover:h-10 hover:bg-primary"></div>
            <div className="w-1 bg-surface-container h-4 rounded-full transition-all duration-500 hover:h-8 hover:bg-primary"></div>
          </div>
        </div>

        {/* Card: Nuevos Leads */}
        <div className="metric-card card-bg p-6 rounded-xl border border-outline-variant/10 animate-fade-in-up delay-300">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Nuevos Leads</p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-bold text-on-surface">{leadsNuevos}</h3>
            <span className="text-xs font-medium text-on-surface-variant">Potencial</span>
          </div>
          <div className="mt-4 flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-surface-bright border border-outline-variant/10 flex items-center justify-center text-[8px] transition-transform hover:z-10 hover:scale-125 text-on-surface">ID</div>
            <div className="w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant/10 flex items-center justify-center text-[8px] transition-transform hover:z-10 hover:scale-125 text-on-surface">OF</div>
            <div className="w-6 h-6 rounded-full bg-surface-container border border-outline-variant/10 flex items-center justify-center text-[8px] text-on-surface-variant transition-transform hover:z-10 hover:scale-125">{leadsNuevos > 2 ? `+${leadsNuevos - 2}` : '+0'}</div>
          </div>
        </div>

        {/* Card: Alertas */}
        <div className="metric-card card-bg p-6 rounded-xl border border-outline-variant/10 animate-fade-in-up delay-400">
          <p className="text-[10px] font-bold text-error uppercase tracking-widest mb-4">Alertas</p>
          <div className="flex items-baseline space-x-2 mb-2">
            <h3 className="text-3xl font-bold text-on-surface">0</h3>
            <span className="text-xs font-medium text-on-surface-variant">Temas críticos</span>
          </div>
          <div className="flex items-center space-x-2 text-success">
            <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
            <span className="text-xs font-medium">Todo operando normal</span>
          </div>
        </div>
      </div>
      {/* END: Stats Overview Cards */}

      {/* BEGIN: Orders Table Section */}
      <section className="card-bg rounded-2xl border border-outline-variant/10 overflow-hidden animate-fade-in-up delay-500 mb-12">
        {/* Header with Search and Filters */}
        <div className="p-6 border-b border-outline-variant/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1">
            <h3 className="text-xl font-bold text-on-surface whitespace-nowrap">Últimos Pedidos</h3>
            <div className="relative flex-1 max-w-md group">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-on-surface-variant group-focus-within:text-primary transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </span>
              <input className="bg-surface-container border-outline-variant/10 text-on-surface text-sm rounded-lg focus:ring-1 focus:ring-primary focus:border-primary block w-full pl-10 py-2 transition-all outline-none" placeholder="Buscar pedidos..." type="text"/>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button className="magnetic-btn flex items-center px-4 py-2 bg-surface border border-outline-variant/20 rounded-md text-sm font-medium text-on-surface hover:bg-surface-container-high transition">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              Filtrar por Estado
            </button>
            <button 
              onClick={handleExportOrders}
              className="magnetic-btn flex items-center px-5 py-2 bg-success-soft text-success rounded-md text-sm font-bold hover:bg-success/20 transition border border-success/20"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Exportar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="table-header-bg">
              <tr>
                <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">ID del Pedido</th>
                <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Cliente</th>
                <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Fecha</th>
                <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Total</th>
                <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {ordenesRecientes.length > 0 ? (
                ordenesRecientes.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-container transition-colors group cursor-default">
                        <td className="px-6 md:px-8 py-5 text-sm font-medium text-on-surface-variant group-hover:text-on-surface truncate max-w-[150px]">#{order.id.split('-')[0].toUpperCase()}</td>
                        <td className="px-6 md:px-8 py-5">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-md bg-surface-bright flex items-center justify-center text-[10px] font-bold text-on-surface-variant group-hover:bg-surface-container-highest transition-colors uppercase">
                                    {order.customer_name ? order.customer_name.substring(0,2) : '--'}
                                </div>
                                <span className="text-sm font-medium text-on-surface">{order.customer_name}</span>
                            </div>
                        </td>
                        <td className="px-6 md:px-8 py-5 text-sm text-on-surface-variant group-hover:text-on-surface whitespace-nowrap">
                            {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 md:px-8 py-5 text-sm font-bold text-on-surface group-hover:text-primary transition-colors text-right">S/ {parseFloat(order.total_amount).toFixed(2)}</td>
                        <td className="px-6 md:px-8 py-5">
                            <span className="badge-green px-2 py-1 rounded text-[10px] font-bold tracking-tight group-hover:border-success/40 transition-all uppercase whitespace-nowrap">
                                {order.payment_proof_url === 'CONTRA_ENTREGA' ? 'Efectivo' : 'Con QR'}
                            </span>
                        </td>
                    </tr>
                ))
              ) : (
                  <tr>
                      <td colSpan={5} className="px-8 py-10 text-center text-on-surface-variant text-sm">
                          Sin órdenes recientes. ¡Sal a vender! 💸
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </section>
    </>
  )
}