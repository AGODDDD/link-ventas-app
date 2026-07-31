'use client'

import DashboardSidebar from '@/components/DashboardSidebar'
import DashboardTopBar from '@/components/dashboard/DashboardTopBar'
import { useState, useEffect } from 'react'
import { Menu, Zap, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ThemeProvider } from '@/components/dashboard/ThemeProvider'

// Tipos de plan válidos
type PlanStatus = 'trial' | 'pro' | 'free' | 'inactivo' | null

function calcularDiasRestantes(expiresAt: string): number {
  const ahora = new Date().getTime()
  const vencimiento = new Date(expiresAt).getTime()
  return Math.max(0, Math.ceil((vencimiento - ahora) / (1000 * 60 * 60 * 24)))
}

// Seteamos la cookie sb-plan-status para que el middleware edge la lea sin DB
function setPlanCookie(plan: string, expiresAt: string | null) {
  const valor = expiresAt ? `${plan}|${expiresAt}` : plan
  // Cookie de sesión (sin max-age para que expire al cerrar el navegador), 
  // se refresca en cada carga del layout
  document.cookie = `sb-plan-status=${encodeURIComponent(valor)}; path=/; SameSite=Lax`
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
  const router = useRouter()

  useEffect(() => {
    const initLayout = async () => {
      const { supabase } = await import('@/lib/supabase')
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.replace('/')
        return
      }

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


      // ─── Setear cookie para el Edge Middleware ───────────────────────
      setPlanCookie(planActual, expiresAt)

      // ─── Verificar expiración en cliente ─────────────────────────────
      const estaVencido = expiresAt ? new Date(expiresAt) < new Date() : false

      if ((planActual === 'inactivo') || (estaVencido && planActual !== 'free')) {
        // Limpiar cookie y redirigir
        document.cookie = 'sb-plan-status=; path=/; max-age=0'
        router.replace('/pendiente')
        return
      }

      setPlanStatus(planActual as PlanStatus)

      // ─── Paso 3: Calcular días para el Banner ────────────────────────
      if (planActual === 'trial' && expiresAt) {
        const dias = calcularDiasRestantes(expiresAt)
        setDiasRestantes(dias)
      }
    }

    initLayout()
  }, [router])

  const mostrarBanner = (planStatus === 'free' || (planStatus === 'trial' && diasRestantes !== null)) && bannerVisible;

  const trialUrgent = diasRestantes !== null && diasRestantes <= 3

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="dashboard-theme antialiased font-body selection:bg-primary/30 min-h-screen bg-[var(--dash-bg)] flex flex-col text-[var(--dash-text-primary)]">

        {/* ─── STICKY BANNER (TRIAL / FREE) ────────────────────────────────── */}
      {mostrarBanner && (
        <div id="global-plan-banner" className={`sticky top-0 z-[60] flex w-full items-center justify-between gap-4 border-b px-4 py-2.5 backdrop-blur ${planStatus === 'trial' ? (trialUrgent ? 'border-red-400/25 bg-red-500/15' : 'border-violet-400/25 bg-violet-500/15') : 'border-blue-400/25 bg-blue-500/15'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Zap size={14} className={`shrink-0 ${planStatus === 'trial' ? (trialUrgent ? 'text-red-400' : 'text-violet-300') : 'text-blue-300'}`} />
            <p className={`truncate text-xs font-semibold ${planStatus === 'trial' ? (trialUrgent ? 'text-red-400' : 'text-violet-300') : 'text-blue-300'}`}>
              {planStatus === 'trial'
                ? (diasRestantes === 0
                  ? '⚠️ Tu prueba Pro vence hoy. Actualiza para no perder el acceso.'
                  : `✨ Prueba Pro gratis — Te quedan ${diasRestantes ?? '...'} ${diasRestantes === 1 ? 'día' : 'días'}. Actualiza por solo S/ 25/mes para no perder funciones avanzadas.`)
                : '📦 Estás usando el Plan Emprendedor (Gratis). Actualiza a Pro para desbloquear Mercado Pago, analíticas y más.'
              }
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href="/pendiente" className="rounded-full bg-gradient-to-br from-violet-600 to-violet-700 px-3 py-1 text-[11px] font-bold text-white transition-all hover:scale-105">
              Activar Pro
            </a>
            <button onClick={() => setBannerVisible(false)} className="rounded-full p-1 transition-colors hover:bg-white/10" aria-label="Cerrar banner">
              <X size={13} className={planStatus === 'trial' ? (trialUrgent ? 'text-red-400' : 'text-violet-300') : 'text-blue-300'} />
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
    </div>
    </ThemeProvider>
  )
}
