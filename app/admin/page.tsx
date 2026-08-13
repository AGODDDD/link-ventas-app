'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import AdminStoresTable, {
  type Merchant,
} from '@/components/admin/AdminStoresTable'
import {
  Store,
  Crown,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

type KPIs = {
  totalStores: number
  proActive: number
  freeStores: number
  trialStores: number
  suspendedStores: number
  estimatedRevenue: number
  accountsNeedingEmailSync: number
}

export default function AdminPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    try {
      const res = await fetch('/api/admin/stores', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setMerchants(data.merchants)
      setKpis(data.kpis)
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Skeleton de carga ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-8">
          {/* Header skeleton */}
          <div>
            <div className="h-7 w-56 bg-white/[0.04] rounded-lg" />
            <div className="h-4 w-80 bg-white/[0.03] rounded-lg mt-2" />
          </div>
          {/* KPI cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[108px] bg-white/[0.03] rounded-2xl border border-white/[0.04]"
              />
            ))}
          </div>
          {/* Table skeleton */}
          <div className="h-[500px] bg-white/[0.03] rounded-2xl border border-white/[0.04]" />
        </div>
      </div>
    )
  }

  // ─── KPI Cards Config ───────────────────────────────────────────────
  const kpiCards = kpis
    ? [
        {
          label: 'Total Tiendas',
          value: kpis.totalStores,
          icon: Store,
          gradient: 'from-blue-500/20 to-cyan-500/20',
          iconBg: 'bg-blue-500/10',
          iconColor: 'text-blue-400',
          border: 'border-blue-500/10 hover:border-blue-500/20',
        },
        {
          label: 'Plan Pro Activo',
          value: kpis.proActive,
          icon: Crown,
          gradient: 'from-emerald-500/20 to-teal-500/20',
          iconBg: 'bg-emerald-500/10',
          iconColor: 'text-emerald-400',
          border: 'border-emerald-500/10 hover:border-emerald-500/20',
          subtitle: kpis.trialStores > 0 ? `${kpis.trialStores} en trial` : undefined,
        },
        {
          label: 'Plan Emprendedor',
          value: kpis.freeStores,
          icon: Users,
          gradient: 'from-zinc-500/15 to-zinc-600/15',
          iconBg: 'bg-zinc-500/10',
          iconColor: 'text-zinc-400',
          border: 'border-zinc-500/10 hover:border-zinc-500/20',
          subtitle: 'Gratis',
        },
        {
          label: 'Ingresos Estimados',
          value: `S/ ${kpis.estimatedRevenue.toLocaleString('es-PE')}`,
          icon: TrendingUp,
          gradient: 'from-blue-500/20 to-sky-500/20',
          iconBg: 'bg-blue-500/10',
          iconColor: 'text-blue-400',
          border: 'border-blue-500/10 hover:border-blue-500/20',
          subtitle: '/mes · S/ 25 × Pro activas',
        },
        ...(kpis.accountsNeedingEmailSync > 0
          ? [{
              label: 'Cuentas por revisar',
              value: kpis.accountsNeedingEmailSync,
              icon: AlertTriangle,
              gradient: 'from-amber-500/20 to-orange-500/20',
              iconBg: 'bg-amber-500/10',
              iconColor: 'text-amber-400',
              border: 'border-amber-500/10 hover:border-amber-500/20',
              subtitle: 'Correo pendiente de sincronizar',
            }]
          : []),
      ]
    : []

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Panel de Control SaaS
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gestión centralizada de tiendas, planes y métricas de LinkVentas
        </p>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div
              key={i}
              className={`relative overflow-hidden rounded-2xl border ${card.border} bg-white/[0.02] p-5 transition-all duration-300 hover:bg-white/[0.04] hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group`}
            >
              {/* Fondo gradiente al hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {card.label}
                  </span>
                  <div
                    className={`h-8 w-8 rounded-lg ${card.iconBg} flex items-center justify-center ${card.iconColor}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white tracking-tight">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    {card.subtitle}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Alerta de tiendas suspendidas ──────────────────────────── */}
      {kpis && kpis.suspendedStores > 0 && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300/80">
            <span className="font-bold text-amber-400">
              {kpis.suspendedStores}
            </span>{' '}
            tienda{kpis.suspendedStores !== 1 ? 's' : ''} suspendida
            {kpis.suspendedStores !== 1 ? 's' : ''} actualmente
          </p>
        </div>
      )}

      {/* ─── Tabla de Tiendas ──────────────────────────────────────── */}
      <div className="bg-white/[0.015] border border-white/[0.06] rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Gestor de Tiendas
          </h2>
          <span className="text-[11px] text-zinc-600 font-medium">
            {merchants.length} registradas
          </span>
        </div>
        <AdminStoresTable merchants={merchants} onUpdate={fetchData} />
      </div>

      {/* ─── Footer informativo ────────────────────────────────────── */}
      <div className="mt-8 text-center">
        <p className="text-[11px] text-zinc-700">
          Precio Plan Pro: S/ 25/mes · Ingresos calculados sobre suscripciones
          Pro activas
        </p>
      </div>
    </div>
  )
}
