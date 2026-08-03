'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useDashboardStore } from '@/store/useDashboardStore'
import { jsonToCSV, downloadFile } from '@/lib/csvUtils'
import { getOrderStatusBadgeStyle, getOrderStatusLabel, ORDER_STATUS_LABELS } from '@/lib/orderStatus'

const INGRESO_STATUSES = new Set(['completado', 'en_camino'])
const ATTENTION_STATUSES = new Set(['pendiente', 'pendiente_pago', 'pendiente_verificacion'])
const ITEMS_PER_PAGE = 10

function orderReference(order: any) {
  return order.legacy_id || order.id?.slice(0, 8).toUpperCase() || '—'
}

function paymentLabel(order: any) {
  if (order.metodo_pago === 'mercadopago' || order.metodo_pago === 'tarjeta_mercadopago') return 'Mercado Pago'
  if (order.metodo_pago === 'contra_entrega' || order.payment_proof_url === 'CONTRA_ENTREGA') return 'Contra entrega'
  if (order.metodo_pago === 'whatsapp') return 'WhatsApp'
  return order.metodo_pago ? order.metodo_pago.replaceAll('_', ' ') : 'Por confirmar'
}

export default function DashboardPage() {
  const { orders, cargarOrders } = useDashboardStore()
  const [leadsCount, setLeadsCount] = useState(0)
  const [merchantName, setMerchantName] = useState('Administrador')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fullName = String(user.user_metadata?.full_name || '').trim()
      const emailName = String(user.email || '').split('@')[0].replace(/[._-]+/g, ' ').trim()
      const displayName = fullName || emailName || 'Administrador'
      setMerchantName(displayName.split(/\s+/)[0])

      const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).single()
      if (!store) return

      await cargarOrders(user.id)
      const { count } = await supabase
        .from('store_leads')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)

      setLeadsCount(count ?? 0)
    }

    void loadStats()
  }, [cargarOrders])

  const ingresosTotales = useMemo(
    () => orders
      .filter(order => INGRESO_STATUSES.has(order.status))
      .reduce((total, order) => total + Number(order.total || 0), 0),
    [orders]
  )

  const pedidosHoy = useMemo(() => {
    const today = new Date().toDateString()
    return orders.filter(order => new Date(order.created_at).toDateString() === today).length
  }, [orders])

  const pedidosPorAtender = useMemo(
    () => orders.filter(order => ATTENTION_STATUSES.has(order.status)).length,
    [orders]
  )

  const ordersFiltered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return orders.filter(order => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesSearch = !term || [
        orderReference(order),
        order.customer_name,
        order.customer_phone,
      ].some(value => String(value || '').toLowerCase().includes(term))
      return matchesStatus && matchesSearch
    })
  }, [orders, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(ordersFiltered.length / ITEMS_PER_PAGE))
  const ordersVisible = ordersFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const handleExportOrders = () => {
    if (ordersFiltered.length === 0) {
      toast.info('No hay pedidos para exportar con estos filtros.')
      return
    }

    const rows = ordersFiltered.map(order => ({
      'ID Pedido': orderReference(order),
      Cliente: order.customer_name || 'Sin nombre',
      Teléfono: order.customer_phone || '',
      Monto: Number(order.total || 0).toFixed(2),
      Fecha: new Date(order.created_at).toLocaleDateString('es-PE'),
      Hora: new Date(order.created_at).toLocaleTimeString('es-PE'),
      Método: paymentLabel(order),
      Estado: getOrderStatusLabel(order.status),
    }))

    downloadFile(jsonToCSV(rows), `pedidos_${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`${ordersFiltered.length} pedidos exportados.`)
  }

  const metrics = [
    {
      label: 'Ingresos confirmados',
      value: `S/ ${ingresosTotales.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      detail: 'Histórico de pedidos cobrados',
      index: '01',
    },
    {
      label: 'Pedidos',
      value: String(orders.length),
      detail: `${pedidosHoy} recibidos hoy`,
      index: '02',
    },
    {
      label: 'Por atender',
      value: String(pedidosPorAtender),
      detail: pedidosPorAtender === 0 ? 'Tu bandeja está al día' : 'Requieren una acción',
      index: '03',
    },
    {
      label: 'Oportunidades',
      value: String(leadsCount),
      detail: 'Leads captados por la tienda',
      index: '04',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-zinc-950 dark:text-white sm:text-[2rem]">
            Buenos días, {merchantName}.
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Aquí tienes el resumen de tu operación.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard/crear"
            className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
          >
            Nuevo producto
          </Link>
          <Link
            href="/dashboard/pedidos"
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/30 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-100"
          >
            Gestionar pedidos
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, index }) => (
          <article
            key={label}
            className="rounded-2xl border border-zinc-200/80 bg-white/75 p-6 shadow-[0_12px_40px_rgb(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/20 dark:border-zinc-800/80 dark:bg-zinc-900/65"
          >
            <div className="mb-6 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
              <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-zinc-400 dark:text-zinc-500">{index}</span>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">{value}</p>
            <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{detail}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_16px_50px_rgb(0,0,0,0.05)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex flex-col gap-4 border-b border-zinc-200/70 p-5 lg:flex-row lg:items-center lg:justify-between dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">Pedidos recientes</h2>
            <p className="mt-1 text-xs text-zinc-500">Busca por ID, cliente o teléfono.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 sm:w-72">
              <span className="sr-only">Buscar pedidos</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="ID, cliente o teléfono"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-3 text-sm text-zinc-900 outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar pedidos por estado</span>
              <select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-700 outline-none transition-all duration-300 focus:border-primary/50 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-200"
              >
                <option value="all">Todos los estados</option>
                {Object.entries(ORDER_STATUS_LABELS)
                  .filter(([value]) => value !== 'cancelado')
                  .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <button
              onClick={handleExportOrders}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
            >
              <Download size={15} />
              Exportar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-zinc-50/80 dark:bg-zinc-950/40">
              <tr className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                <th className="px-6 py-4">Pedido</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {ordersVisible.length > 0 ? ordersVisible.map(order => (
                <tr key={order.id} className="transition-colors duration-300 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-primary">#{orderReference(order)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{order.customer_name || 'Sin nombre'}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{order.customer_phone || 'Sin teléfono'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {new Date(order.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getOrderStatusBadgeStyle(order.status)}`}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm capitalize text-zinc-500">{paymentLabel(order)}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-zinc-950 dark:text-white">
                    S/ {Number(order.total || 0).toFixed(2)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <span className="mx-auto mb-4 block h-px w-10 bg-zinc-300 dark:bg-zinc-700" />
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {orders.length === 0 ? 'Aún no recibes pedidos' : 'No hay resultados con estos filtros'}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {orders.length === 0 ? 'Comparte tu tienda para comenzar a vender.' : 'Prueba con otro ID, cliente o estado.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-200/70 px-6 py-4 text-xs text-zinc-500 dark:border-zinc-800">
            <span>Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(page => page - 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 font-semibold transition-all hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(page => page + 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 font-semibold transition-all hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
