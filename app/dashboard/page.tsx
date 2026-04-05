'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useDashboardStore } from '@/store/useDashboardStore'
import { jsonToCSV, downloadFile } from '@/lib/csvUtils'
import FomoConfigModal from '@/components/dashboard/FomoConfigModal'

export default function DashboardPage() {
  const { orders, ordersCargadas, cargarOrders } = useDashboardStore()
  const [leadsNuevos, setLeadsNuevos] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [isFomoModalOpen, setIsFomoModalOpen] = useState(false)

  // Estadísticas calculadas reactivamente desde el cerebro Zustand
  const ingresosTotales = useMemo(() => {
    return orders.reduce((acc, obj) => acc + parseFloat(obj.total_amount || 0), 0)
  }, [orders])

  const pedidosTotales = orders.length
  const ordenesRecientes = orders.slice(0, 5)

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
      {/* Header & Filter Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-on-surface mb-2">Resumen General</h2>
          <p className="text-on-surface-variant">Control centralizado de transacciones y estados logísticos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium border border-outline-variant/30 rounded-lg hover:bg-surface-container-high transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtrar por Estado
          </button>
          <button 
            onClick={handleExportOrders}
            className="bg-primary text-on-primary px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/10 hover:brightness-110 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">download</span>
              Exportar
          </button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Total de Ingresos</p>
          <div className="flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-bold tracking-tighter text-on-surface">S/ {ingresosTotales.toFixed(2)}</span>
              <span className={`text-xs font-bold ${crecimiento >= 0 ? 'text-secondary' : 'text-error'}`}>{crecimiento >= 0 ? '+' : ''}{crecimiento}%</span>
          </div>
          <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden relative z-10">
              <div className="h-full bg-primary w-[75%]"></div>
          </div>
        </div>

        <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 relative overflow-hidden group">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Pedidos Totales</p>
          <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tighter text-on-surface">{pedidosTotales}</span>
              <span className="text-secondary text-xs font-bold">↑ {pedidosHoy} hoy</span>
          </div>
          <div className="mt-4 flex items-center gap-1">
              <div className="h-4 w-1 bg-primary/20 rounded-full"></div>
              <div className="h-6 w-1 bg-primary/40 rounded-full"></div>
              <div className="h-3 w-1 bg-primary/20 rounded-full"></div>
              <div className="h-8 w-1 bg-primary/60 rounded-full"></div>
              <div className="h-5 w-1 bg-primary/80 rounded-full"></div>
              <div className="h-10 w-1 bg-primary rounded-full"></div>
          </div>
        </div>

        <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 relative overflow-hidden group">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Nuevos Leads</p>
          <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tighter text-on-surface">{leadsNuevos}</span>
              <span className="text-primary text-xs font-bold">Potencial</span>
          </div>
          <div className="flex -space-x-2 mt-4 ml-2">
              <div className="w-6 h-6 rounded-full border-2 border-surface-container-high bg-surface-bright flex items-center justify-center text-[8px] font-bold text-on-surface">ID</div>
              <div className="w-6 h-6 rounded-full border-2 border-surface-container-high bg-primary/30 flex items-center justify-center text-[8px] font-bold text-primary">OP</div>
              <div className="w-6 h-6 rounded-full border-2 border-surface-container-high bg-surface-bright flex items-center justify-center text-[8px] font-bold">{leadsNuevos > 2 ? `+${leadsNuevos - 2}` : '+0'}</div>
          </div>
        </div>

        <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 relative overflow-hidden group">
          <p className="text-[10px] font-bold text-error uppercase tracking-widest mb-4">Alertas</p>
          <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tighter text-error">0</span>
              <span className="text-on-surface-variant text-xs font-medium">Temas críticos</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-secondary">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Todo operando normal
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/5 shadow-2xl mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-surface-container-high">
                  <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">ID del Pedido</th>
                  <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Cliente</th>
                  <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Fecha</th>
                  <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Total</th>
                  <th className="px-6 md:px-8 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Método</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {ordenesRecientes.length > 0 ? (
                ordenesRecientes.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-container-high/50 transition-colors group">
                        <td className="px-6 md:px-8 py-4 text-sm font-mono text-primary truncate max-w-[150px]">#{order.id.split('-')[0].toUpperCase()}</td>
                        <td className="px-6 md:px-8 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-surface-bright flex items-center justify-center font-bold text-xs uppercase text-on-surface">
                                    {order.customer_name ? order.customer_name.substring(0,2) : '--'}
                                </div>
                                <span className="text-sm font-medium">{order.customer_name}</span>
                            </div>
                        </td>
                        <td className="px-6 md:px-8 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                            {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 md:px-8 py-4 text-sm font-bold text-right text-on-surface">S/ {parseFloat(order.total_amount).toFixed(2)}</td>
                        <td className="px-6 md:px-8 py-4 text-sm text-on-surface-variant">
                            {order.payment_proof_url === 'CONTRA_ENTREGA' ? (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-tertiary-container/10 text-tertiary border border-tertiary/20 whitespace-nowrap">Efectivo</span>
                            ) : (
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-secondary-container/40 text-secondary border border-secondary/20 whitespace-nowrap">Con QR</span>
                            )}
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
      </div>

      {/* Secondary Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CHART REAL - Últimos 7 Días */}
        <div className="lg:col-span-2 bg-surface-container-high/40 p-8 rounded-2xl border border-outline-variant/10 relative overflow-hidden group">
            <h3 className="text-xl font-bold text-on-surface mb-6">Flujo de Ingresos (Últimos 7 Días)</h3>
            
            {orders.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-on-surface-variant text-sm">
                    Aún no hay suficientes datos para generar el gráfico.
                </div>
            ) : (
                <div className="h-56 mt-8 flex items-end justify-between gap-2 md:gap-4 px-2">
                    {Array.from({length: 7}).map((_, i) => {
                        const d = new Date()
                        d.setDate(d.getDate() - (6 - i))
                        const dayString = d.toDateString()
                        const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === dayString)
                        const totalDay = dayOrders.reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0)
                        
                        // Calculando alturas relativas
                        const maxSales = Math.max(
                            1, 
                            ...Array.from({length: 7}).map((_, j) => {
                                const dTemp = new Date()
                                dTemp.setDate(dTemp.getDate() - (6 - j))
                                const dOrders = orders.filter(o => new Date(o.created_at).toDateString() === dTemp.toDateString())
                                return dOrders.reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0)
                            })
                        )
                        const heightPercentage = Math.max(5, (totalDay / maxSales) * 100)

                        return (
                            <div key={i} className="flex flex-col items-center gap-2 w-full group/bar relative">
                                {/* Tooltip the Hover */}
                                <div className="absolute -top-8 bg-surface-container-highest text-on-surface text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                                    S/ {totalDay.toFixed(2)}
                                </div>
                                <div className="w-full bg-surface-container rounded-t-lg relative h-40 flex items-end justify-center transition-all bg-opacity-50 group-hover/bar:bg-opacity-100">
                                    <div 
                                        className="w-full bg-primary/40 rounded-t-lg hover:bg-primary transition-all flex border-t-2 border-primary" 
                                        style={{ height: `${heightPercentage}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest text-center">
                                    {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>

        {/* MOTOR DE URGENCIA / FOMO (Reemplazo the del Banner the Publicidad) */}
        <div className="bg-surface-container p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between border-2 border-primary/20">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-6xl text-primary">local_fire_department</span>
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-xl">local_fire_department</span>
                    <h3 className="text-xl font-bold text-on-surface">Motor The Stock Social</h3>
                </div>
                <p className="text-on-surface-variant text-sm line-clamp-3 mb-6">
                    Muestra a tus clientes notificaciones the tipo <strong className="text-on-surface">"14 personas están viendo esto ahora"</strong> para activar el FOMO y acelerar la the decisión de pago.
                </p>
                <div className="flex items-center justify-between bg-surface-container-high p-4 border border-outline-variant/10 rounded-xl mb-4">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">ESTADO DEL MOTOR</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-surface-bright peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            </div>
            <button 
                onClick={() => setIsFomoModalOpen(true)}
                className="relative z-10 bg-on-background text-background hover:bg-primary hover:text-on-primary transition-colors py-3 px-4 flex justify-between items-center rounded-xl font-bold text-sm tracking-widest uppercase">
                <span>Configurar Fuego</span>
                <span className="material-symbols-outlined text-sm">settings</span>
            </button>
        </div>
      </div>

      {userId && (
          <FomoConfigModal 
              isOpen={isFomoModalOpen} 
              onClose={() => setIsFomoModalOpen(false)} 
              userId={userId} 
          />
      )}
    </>
  )
}