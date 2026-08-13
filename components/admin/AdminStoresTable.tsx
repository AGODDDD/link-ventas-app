'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Search, Store, Ban, RotateCcw, Crown, RefreshCw, TriangleAlert } from 'lucide-react'

export type Merchant = {
  store_id: string
  owner_id: string
  store_name: string
  slug: string
  whatsapp_phone: string | null
  is_active: boolean
  template_type: string
  store_created_at: string
  email: string | null
  email_source: 'profile' | 'auth' | 'unavailable'
  email_needs_sync: boolean
  plan: string | null
  plan_expires_at: string | null
}

interface AdminStoresTableProps {
  merchants: Merchant[]
  onUpdate: () => void
}

export default function AdminStoresTable({
  merchants: initialMerchants,
  onUpdate,
}: AdminStoresTableProps) {
  const [search, setSearch] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const filtered = initialMerchants.filter(
    (m) =>
      (m.store_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (m.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (m.slug?.toLowerCase() || '').includes(search.toLowerCase())
  )

  // ─── Helpers ─────────────────────────────────────────────────────────
  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error('No session')
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    }
  }

  // ─── Activar Plan Pro ────────────────────────────────────────────────
  const activatePlan = async (ownerId: string, months: number) => {
    const key = `activate-${ownerId}-${months}`
    setLoadingAction(key)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          merchantId: ownerId,
          action: 'activate',
          months,
        }),
      })
      if (!res.ok) throw new Error('Error del servidor')
      toast.success(`Plan Pro activado por ${months} ${months === 1 ? 'mes' : 'meses'}`)
      onUpdate()
    } catch {
      toast.error('Error al activar plan — revisa las variables de entorno')
    } finally {
      setLoadingAction(null)
    }
  }

  // ─── Suspender Tienda ────────────────────────────────────────────────
  const suspendStore = async (storeId: string) => {
    setLoadingAction(`suspend-${storeId}`)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/suspend', {
        method: 'POST',
        headers,
        body: JSON.stringify({ storeId, action: 'suspend' }),
      })
      if (!res.ok) throw new Error('Error del servidor')
      toast.success('Tienda suspendida correctamente')
      onUpdate()
    } catch {
      toast.error('Error al suspender tienda')
    } finally {
      setLoadingAction(null)
    }
  }

  // ─── Reactivar Tienda ───────────────────────────────────────────────
  const unsuspendStore = async (storeId: string) => {
    setLoadingAction(`unsuspend-${storeId}`)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/suspend', {
        method: 'POST',
        headers,
        body: JSON.stringify({ storeId, action: 'unsuspend' }),
      })
      if (!res.ok) throw new Error('Error del servidor')
      toast.success('Tienda reactivada — asigna un plan si es necesario')
      onUpdate()
    } catch {
      toast.error('Error al reactivar tienda')
    } finally {
      setLoadingAction(null)
    }
  }

  const synchronizeEmail = async (ownerId: string) => {
    setLoadingAction(`email-${ownerId}`)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/stores/contact', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ownerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo sincronizar el correo')
      toast.success(data.synchronized ? 'Correo sincronizado desde la cuenta de acceso' : 'El correo ya estaba sincronizado')
      onUpdate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo sincronizar el correo')
    } finally {
      setLoadingAction(null)
    }
  }

  const synchronizeMissingEmails = async () => {
    setLoadingAction('email-all')
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/stores/contact', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'sync-missing' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudieron sincronizar los correos')
      toast.success(data.synchronized === 1 ? '1 correo sincronizado desde Auth' : `${data.synchronized} correos sincronizados desde Auth`)
      if (data.unavailable) toast.warning(`${data.unavailable} cuenta(s) requiere(n) revisión manual`)
      onUpdate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron sincronizar los correos')
    } finally {
      setLoadingAction(null)
    }
  }

  // ─── Badge de Plan ──────────────────────────────────────────────────
  const getPlanBadge = (m: Merchant) => {
    if (!m.is_active) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 select-none">
          <Ban className="h-3 w-3" />
          SUSPENDIDA
        </span>
      )
    }

    const now = new Date()
    const expired = m.plan_expires_at
      ? new Date(m.plan_expires_at) < now
      : false

    if (m.plan === 'pro' && !expired) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 select-none">
          <Crown className="h-3 w-3" />
          PRO
        </span>
      )
    }

    if (m.plan === 'trial' && !expired) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 select-none">
          TRIAL
        </span>
      )
    }

    if (expired && (m.plan === 'pro' || m.plan === 'trial')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 select-none">
          VENCIDO
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 select-none">
        GRATIS
      </span>
    )
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const isButtonDisabled = loadingAction !== null
  const emailsNeedingSync = initialMerchants.filter((merchant) => merchant.email_needs_sync).length

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div>
      {/* Buscador */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
        </div>
        {emailsNeedingSync > 0 && (
          <button
            onClick={synchronizeMissingEmails}
            disabled={isButtonDisabled}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-300 transition hover:border-amber-400/30 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw className="size-3.5" />
            Sincronizar {emailsNeedingSync} correo{emailsNeedingSync === 1 ? '' : 's'}
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Tienda
              </th>
              <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">
                Email
              </th>
              <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">
                WhatsApp
              </th>
              <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">
                Expiración
              </th>
              <th className="px-4 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map((m) => (
              <tr
                key={m.store_id}
                className="hover:bg-white/[0.02] transition-colors duration-150"
              >
                {/* Tienda */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-white/[0.06] flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate text-[13px]">
                        {m.store_name || 'Sin nombre'}
                      </p>
                      <p className="text-[11px] text-zinc-600 truncate">
                        /{m.slug || m.store_id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3.5 text-zinc-400 text-xs hidden md:table-cell">
                  {m.email ? (
                    <div className="flex items-center gap-2">
                      <span>{m.email}</span>
                      {m.email_needs_sync && (
                        <span title="Visible desde Auth; pendiente de sincronizar al perfil" className="inline-flex size-4 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
                          <TriangleAlert className="size-3" aria-hidden="true" />
                          <span className="sr-only">Pendiente de sincronizar al perfil</span>
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-amber-300">Sin correo en Auth</span>
                  )}
                </td>

                {/* WhatsApp */}
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  {m.whatsapp_phone ? (
                    <a
                      href={`https://wa.me/${m.whatsapp_phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                    >
                      {m.whatsapp_phone}
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>

                {/* Plan Badge */}
                <td className="px-4 py-3.5">{getPlanBadge(m)}</td>

                {/* Expiración */}
                <td className="px-4 py-3.5 text-xs text-zinc-400 hidden md:table-cell">
                  {formatDate(m.plan_expires_at)}
                </td>

                {/* Acciones */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {m.email_needs_sync && (
                      <button
                        onClick={() => synchronizeEmail(m.owner_id)}
                        disabled={isButtonDisabled}
                        title="Copiar al perfil el correo verificado de Auth"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-400/30 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Sincronizar correo
                      </button>
                    )}
                    {m.is_active ? (
                      <>
                        {[1, 3, 6].map((months) => (
                          <button
                            key={months}
                            onClick={() => activatePlan(m.owner_id, months)}
                            disabled={isButtonDisabled}
                            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-400/30 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            +{months}m
                          </button>
                        ))}
                        <button
                          onClick={() => suspendStore(m.store_id)}
                          disabled={isButtonDisabled}
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-400/30 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Suspender
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => unsuspendStore(m.store_id)}
                        disabled={isButtonDisabled}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-400/30 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {/* Estado vacío */}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-16 text-center text-zinc-500 text-sm"
                >
                  {search
                    ? 'No se encontraron tiendas con ese criterio'
                    : 'No hay tiendas registradas aún'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Contador */}
      <p className="mt-3 text-[11px] text-zinc-600">
        Mostrando {filtered.length} de {initialMerchants.length} tiendas
      </p>
    </div>
  )
}
