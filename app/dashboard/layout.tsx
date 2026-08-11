'use client'

import DashboardSidebar from '@/components/DashboardSidebar'
import DashboardTopBar from '@/components/dashboard/DashboardTopBar'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ThemeProvider } from '@/components/dashboard/ThemeProvider'
import { useDashboardStore } from '@/store/useDashboardStore'
import ProductTour from '@/components/dashboard/ProductTour'

// Tipos de plan válidos
type PlanStatus = 'trial' | 'pro' | 'free' | 'inactivo' | null

function calcularDiasRestantes(expiresAt: string): number {
  const ahora = new Date().getTime()
  const vencimiento = new Date(expiresAt).getTime()
  return Math.max(0, Math.ceil((vencimiento - ahora) / (1000 * 60 * 60 * 24)))
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [planStatus, setPlanStatus] = useState<PlanStatus>(null)
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null)
  const [bannerVisible, setBannerVisible] = useState(true)
  const [dashboardReady, setDashboardReady] = useState(false)
  const [dashboardUserId, setDashboardUserId] = useState('')
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const initLayout = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData.session) {
          useDashboardStore.getState().limpiarDashboard()
          router.replace('/')
          return
        }

        // Una entrada nueva al panel debe consultar una fotografía fresca. El
        // cache se conserva únicamente durante la navegación interna.
        useDashboardStore.getState().prepararParaUsuario(sessionData.session.user.id, true)

        const statusRes = await fetch('/api/billing/status', {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        })
        if (!statusRes.ok) {
          router.replace('/pendiente')
          return
        }

        const billing = await statusRes.json()
        const planActual: string = billing.plan ?? null
        const expiresAt: string | null = billing.plan_expires_at ?? null


      // ─── Verificar expiración en cliente ─────────────────────────────
        const estaVencido = expiresAt ? new Date(expiresAt) < new Date() : false

        if ((planActual === 'inactivo') || (estaVencido && planActual !== 'free')) {
          router.replace('/pendiente')
          return
        }

        if (!isMounted) return
        setDashboardUserId(sessionData.session.user.id)
        setPlanStatus(planActual as PlanStatus)

      // ─── Paso 3: Calcular días para el Banner ────────────────────────
        if (planActual === 'trial' && expiresAt) {
          const dias = calcularDiasRestantes(expiresAt)
          setDiasRestantes(dias)
        }

        setDashboardReady(true)
      } catch (error) {
        console.error('No se pudo preparar la sesión del dashboard:', error)
        useDashboardStore.getState().limpiarDashboard()
        router.replace('/')
      }
    }

    void initLayout()

    return () => {
      isMounted = false
    }
  }, [router])

  const mostrarBanner = (planStatus === 'free' || (planStatus === 'trial' && diasRestantes !== null)) && bannerVisible;

  const trialUrgent = diasRestantes !== null && diasRestantes <= 3

  if (!dashboardReady) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <div className="dashboard-theme flex min-h-screen items-center justify-center bg-[var(--dash-bg)] text-[var(--dash-text-muted)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="Cargando panel" />
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="dashboard-theme antialiased font-body selection:bg-primary/30 min-h-screen bg-[var(--dash-bg)] flex flex-col text-[var(--dash-text-primary)]">

        {/* ─── STICKY BANNER (TRIAL / FREE) ────────────────────────────────── */}
      {mostrarBanner && (
        <div id="global-plan-banner" className={`sticky top-0 z-[60] flex w-full items-center justify-between gap-4 border-b px-4 py-2.5 backdrop-blur ${planStatus === 'trial' ? (trialUrgent ? 'border-red-700/20 bg-[#fdecec] dark:border-red-400/25 dark:bg-red-500/15' : 'border-violet-700/20 bg-[#f0eafa] dark:border-violet-400/25 dark:bg-violet-500/15') : 'border-blue-700/20 bg-[#e8f0fb] dark:border-blue-400/25 dark:bg-blue-500/15'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-[0.16em] ${planStatus === 'trial' ? (trialUrgent ? 'border-red-700/35 text-[#9f2638] dark:border-red-400/40 dark:text-red-300' : 'border-violet-700/35 text-[#5b2b91] dark:border-violet-400/40 dark:text-violet-200') : 'border-blue-700/35 text-[#234f8c] dark:border-blue-400/40 dark:text-blue-200'}`}>PRO</span>
            <p className={`truncate text-xs font-semibold ${planStatus === 'trial' ? (trialUrgent ? 'text-[#9f2638] dark:text-red-400' : 'text-[#5b2b91] dark:text-violet-300') : 'text-[#234f8c] dark:text-blue-300'}`}>
              {planStatus === 'trial'
                ? (diasRestantes === 0
                  ? 'Tu prueba Pro vence hoy. Actualiza para no perder el acceso.'
                  : `Prueba Pro — Te quedan ${diasRestantes ?? '...'} ${diasRestantes === 1 ? 'día' : 'días'}. Actualiza por S/ 25/mes para mantener las funciones avanzadas.`)
                : 'Plan Emprendedor activo. Actualiza a Pro para desbloquear Mercado Pago y analíticas.'
              }
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href="/pendiente" className="rounded-full bg-gradient-to-br from-violet-600 to-violet-700 px-3 py-1 text-[11px] font-bold text-white transition-all hover:scale-105">
              Activar Pro
            </a>
            <button onClick={() => setBannerVisible(false)} className="rounded-full p-1 transition-colors hover:bg-white/10" aria-label="Cerrar banner">
              <X size={13} className={planStatus === 'trial' ? (trialUrgent ? 'text-[#9f2638] dark:text-red-400' : 'text-[#5b2b91] dark:text-violet-300') : 'text-[#234f8c] dark:text-blue-300'} />
            </button>
          </div>
        </div>
      )}

      {/* 1. BARRA SUPERIOR MÓVIL */}
      <div className="md:hidden bg-[var(--dash-surface)] text-[var(--dash-text-primary)] p-4 flex items-center justify-between sticky top-0 z-30 shadow-md border-b border-[var(--dash-border)]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center font-bold text-primary">LV</div>
          <span className="font-bold text-lg tracking-widest uppercase">LinkVentas</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="text-on-surface hover:bg-surface-container">
          <Menu size={24} />
        </Button>
      </div>

      {/* 2. EL MENÚ LATERAL */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        hasBanner={mostrarBanner}
      />

      {/* 3. TOP BAR + ANTENA WEBSOCKET */}
      <DashboardTopBar hasBanner={mostrarBanner} />

      {/* 4. CONTENIDO PRINCIPAL */}
      <main className={`flex-1 md:ml-56 bg-[var(--dash-bg)] ${mostrarBanner ? 'md:pt-32 pt-20' : 'md:pt-24 pt-4'} px-4 md:px-8 pb-12 overflow-x-hidden`}>
        {children}
      </main>
      {dashboardUserId ? <ProductTour userId={dashboardUserId} /> : null}
    </div>
    </ThemeProvider>
  )
}
