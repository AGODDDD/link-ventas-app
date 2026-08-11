'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, Mail, MessageCircle, Phone, Search, ShoppingBag, Sparkles, Trash2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useDashboardStore } from '@/store/useDashboardStore'

type View = 'customers' | 'opportunities'

type Customer = {
  id: string
  name: string
  email: string
  phone: string
  ordersCount: number
  totalSpent: number
  lastOrderAt: string
}

const VALID_CUSTOMER_STATUSES = new Set([
  'pendiente',
  'en_preparacion',
  'alistando',
  'en_camino',
  'completado',
])

function normalizePhone(value?: string) {
  return String(value || '').replace(/\D/g, '')
}

function customerKey(order: any) {
  const email = String(order.customer_email || '').trim().toLowerCase()
  const phone = normalizePhone(order.customer_phone)
  if (email) return `email:${email}`
  if (phone) return `phone:${phone}`
  return `order:${order.id}`
}

function LoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map(item => <div key={item} className="h-28 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />)}
      </div>
      <div className="h-80 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  )
}

export default function ClientesPage() {
  const {
    orders,
    ordersLastFetch,
    cargarOrders,
    leads,
    leadsLastFetch,
    cargarLeads,
    eliminarLeadLocal,
  } = useDashboardStore()
  const [view, setView] = useState<View>('customers')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(ordersLastFetch === 0 || leadsLastFetch === 0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await Promise.all([cargarOrders(user.id), cargarLeads(user.id)])
      }
      setLoading(false)
    }
    void load()
  }, [cargarLeads, cargarOrders])

  const customers = useMemo(() => {
    const grouped = new Map<string, Customer>()

    orders
      .filter(order => VALID_CUSTOMER_STATUSES.has(order.status))
      .forEach(order => {
        const id = customerKey(order)
        const current = grouped.get(id)
        const createdAt = String(order.created_at)
        const total = Number(order.total || 0)

        if (!current) {
          grouped.set(id, {
            id,
            name: order.customer_name || 'Cliente sin nombre',
            email: order.customer_email || '',
            phone: order.customer_phone || '',
            ordersCount: 1,
            totalSpent: total,
            lastOrderAt: createdAt,
          })
          return
        }

        current.ordersCount += 1
        current.totalSpent += total
        if (new Date(createdAt).getTime() > new Date(current.lastOrderAt).getTime()) {
          current.lastOrderAt = createdAt
          current.name = order.customer_name || current.name
          current.email = order.customer_email || current.email
          current.phone = order.customer_phone || current.phone
        }
      })

    return Array.from(grouped.values()).sort((a, b) =>
      new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime()
    )
  }, [orders])

  const term = searchTerm.trim().toLowerCase()
  const filteredCustomers = useMemo(
    () => customers.filter(customer => !term || [
      customer.name,
      customer.email,
      customer.phone,
    ].some(value => value.toLowerCase().includes(term))),
    [customers, term]
  )
  const filteredLeads = useMemo(
    () => leads.filter(lead => !term || [
      lead.name,
      lead.email,
      lead.phone,
      lead.preference,
    ].some(value => String(value || '').toLowerCase().includes(term))),
    [leads, term]
  )

  const totalCustomerRevenue = customers.reduce((total, customer) => total + customer.totalSpent, 0)
  const repeatCustomers = customers.filter(customer => customer.ordersCount > 1).length

  const deleteOpportunity = async (id: string) => {
    if (!window.confirm('¿Eliminar esta oportunidad? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('store_leads').delete().eq('id', id)
    if (!error) eliminarLeadLocal(id)
  }

  if (loading) return <LoadingState />

  return (
    <div id="tour-page-customers" className="mx-auto max-w-7xl space-y-8 pb-12">
      <header data-tour="customers-header" className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Relación comercial</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">Clientes</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Compradores reales y oportunidades captadas, sin mezclar sus métricas.
          </p>
        </div>
        <label className="relative w-full lg:w-80">
          <span className="sr-only">Buscar {view === 'customers' ? 'clientes' : 'oportunidades'}</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            placeholder={view === 'customers' ? 'Nombre, email o teléfono' : 'Buscar oportunidades'}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white/80 pl-10 pr-3 text-sm outline-none transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 dark:border-zinc-700 dark:bg-zinc-900/70"
          />
        </label>
      </header>

      <nav data-tour="customers-views" className="inline-flex rounded-2xl border border-zinc-200 bg-white/80 p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/70" aria-label="Vistas de relación comercial">
        <button
          onClick={() => { setView('customers'); setSearchTerm('') }}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${view === 'customers' ? 'bg-zinc-950 text-white shadow-lg dark:bg-white dark:text-zinc-950' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
        >
          Clientes <span className="ml-1 opacity-60">{customers.length}</span>
        </button>
        <button
          onClick={() => { setView('opportunities'); setSearchTerm('') }}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${view === 'opportunities' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
        >
          Oportunidades <span className="ml-1 opacity-60">{leads.length}</span>
        </button>
      </nav>

      {view === 'customers' ? (
        <>
          <section data-tour="customers-metrics" className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Clientes compradores', value: customers.length, icon: Users, tone: 'text-violet-500 bg-violet-500/10' },
              { label: 'Clientes recurrentes', value: repeatCustomers, icon: ShoppingBag, tone: 'text-emerald-500 bg-emerald-500/10' },
              { label: 'Valor acumulado', value: `S/ ${totalCustomerRevenue.toFixed(2)}`, icon: Sparkles, tone: 'text-amber-500 bg-amber-500/10' },
            ].map(({ label, value, icon: Icon, tone }) => (
              <article key={label} className="rounded-2xl border border-zinc-200/80 bg-white/75 p-5 shadow-[0_12px_40px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/65">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                  <span className={`rounded-xl p-2 ${tone}`}><Icon size={17} /></span>
                </div>
                <p className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">{value}</p>
              </article>
            ))}
          </section>

          <section data-tour="customers-list" className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_16px_50px_rgb(0,0,0,0.05)] dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead className="bg-zinc-50/80 dark:bg-zinc-950/40">
                  <tr className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Contacto</th>
                    <th className="px-6 py-4">Pedidos</th>
                    <th className="px-6 py-4">Última compra</th>
                    <th className="px-6 py-4 text-right">Valor total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                    <tr key={customer.id} className="transition-colors duration-300 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{customer.name}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          {customer.ordersCount > 1 ? 'Cliente recurrente' : 'Primera compra'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs text-zinc-500">
                          {customer.email && <p className="flex items-center gap-1.5"><Mail size={12} />{customer.email}</p>}
                          {customer.phone && <p className="flex items-center gap-1.5"><Phone size={12} />{customer.phone}</p>}
                          {!customer.email && !customer.phone && <span>Sin contacto registrado</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-zinc-900 dark:text-zinc-100">{customer.ordersCount}</td>
                      <td className="px-6 py-4 text-sm text-zinc-500">
                        {new Date(customer.lastOrderAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">S/ {customer.totalSpent.toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center">
                        <Users size={32} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                        <p className="font-semibold text-zinc-700 dark:text-zinc-300">{customers.length === 0 ? 'Aún no tienes compradores' : 'No encontramos clientes'}</p>
                        <p className="mt-1 text-sm text-zinc-500">{customers.length === 0 ? 'Los clientes aparecerán al recibir su primer pedido válido.' : 'Prueba con otro nombre, email o teléfono.'}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section data-tour="customers-opportunities" className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/80 shadow-[0_16px_50px_rgb(0,0,0,0.05)] dark:border-zinc-800 dark:bg-zinc-900/70">
          <div className="border-b border-zinc-200/70 p-6 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">Leads y carritos por recuperar</h2>
            <p className="mt-1 text-sm text-zinc-500">Son personas interesadas; todavía no cuentan como clientes compradores.</p>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredLeads.length > 0 ? filteredLeads.map(lead => (
              <article key={lead.id} className="flex flex-col gap-4 p-5 transition-colors duration-300 hover:bg-zinc-50/80 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-zinc-800/30">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {(lead.name || 'OP').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{lead.name || 'Oportunidad sin nombre'}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      {lead.email && <span className="flex items-center gap-1"><Mail size={12} />{lead.email}</span>}
                      {lead.phone && <span className="flex items-center gap-1"><Phone size={12} />{lead.phone}</span>}
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(lead.created_at).toLocaleDateString('es-PE')}</span>
                    </div>
                    {lead.preference && <span className="mt-2 inline-flex rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">{lead.preference}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {lead.phone && (
                    <a
                      href={`https://wa.me/${normalizePhone(lead.phone)}?text=${encodeURIComponent(`Hola ${lead.name || ''}, te escribimos de nuestra tienda.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Contactar a ${lead.name || 'oportunidad'} por WhatsApp`}
                      className="rounded-xl p-2.5 text-emerald-600 transition-all duration-300 hover:bg-emerald-500/10 active:scale-95"
                    >
                      <MessageCircle size={18} />
                    </a>
                  )}
                  <button
                    onClick={() => void deleteOpportunity(lead.id)}
                    aria-label={`Eliminar oportunidad ${lead.name || ''}`}
                    className="rounded-xl p-2.5 text-red-500 transition-all duration-300 hover:bg-red-500/10 active:scale-95"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            )) : (
              <div className="px-8 py-16 text-center">
                <Sparkles size={32} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
                <p className="font-semibold text-zinc-700 dark:text-zinc-300">{leads.length === 0 ? 'No hay oportunidades pendientes' : 'No encontramos oportunidades'}</p>
                <p className="mt-1 text-sm text-zinc-500">Los formularios y carritos por recuperar aparecerán aquí.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
