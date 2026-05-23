'use client'

import DashboardSidebar from '@/components/DashboardSidebar'
import DashboardTopBar from '@/components/dashboard/DashboardTopBar'
import { useState, useEffect } from 'react'
import { Menu, Zap, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

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

      const userId = sessionData.session.user.id

      // Leer perfil actual
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, plan_expires_at')
        .eq('id', userId)
        .single()

      let planActual: string = profile?.plan ?? null
      let expiresAt: string | null = profile?.plan_expires_at ?? null

      // ─── PASO 2: Auto-asignación atómica del trial ───────────────────
      // Solo si el plan es estrictamente NULL (nunca ha tenido plan).
      // El .is('plan', null) es la guarda atómica que evita race conditions.
      if (planActual === null || planActual === undefined) {
        const trialExpiry = new Date()
        trialExpiry.setDate(trialExpiry.getDate() + 14)
        expiresAt = trialExpiry.toISOString()

        const { data: updated } = await supabase
          .from('profiles')
          .update({ plan: 'trial', plan_expires_at: expiresAt })
          .eq('id', userId)
          .is('plan', null) // ← Guarda atómica: solo escribe si plan ES NULL
          .select('plan, plan_expires_at')
          .single()

        // Si la actualización devolvió datos, la escritura fue exitosa.
        // Si no (otro tab ganó la carrera), releemos el perfil actualizado.
        if (updated) {
          planActual = updated.plan
          expiresAt = updated.plan_expires_at
        } else {
          const { data: reFetch } = await supabase
            .from('profiles')
            .select('plan, plan_expires_at')
            .eq('id', userId)
            .single()
          planActual = reFetch?.plan ?? 'trial'
          expiresAt = reFetch?.plan_expires_at ?? null
        }
      }

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
        setDiasRestantes(calcularDiasRestantes(expiresAt))
      }
    }

    initLayout()
  }, [router])

  const trialBannerColor = diasRestantes !== null && diasRestantes <= 3
    ? 'rgba(239,68,68,0.15)'
    : 'rgba(139,92,246,0.12)'
  const trialTextColor = diasRestantes !== null && diasRestantes <= 3
    ? '#f87171'
    : '#c4b5fd'
  const trialBorderColor = diasRestantes !== null && diasRestantes <= 3
    ? 'rgba(239,68,68,0.25)'
    : 'rgba(139,92,246,0.25)'

  return (
    <div className="dashboard-theme antialiased font-body selection:bg-primary/30 min-h-screen bg-surface flex flex-col text-on-surface">

      {/* ─── STICKY BANNER (TRIAL / FREE) ────────────────────────────────── */}
      {(planStatus === 'trial' || planStatus === 'free') && bannerVisible && (
        <div
          style={{
            background: planStatus === 'trial' ? trialBannerColor : 'rgba(59,130,246,0.12)',
            borderBottom: `1px solid ${planStatus === 'trial' ? trialBorderColor : 'rgba(59,130,246,0.25)'}`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          className="sticky top-0 z-50 w-full px-4 py-2.5 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Zap size={14} style={{ color: planStatus === 'trial' ? trialTextColor : '#93c5fd', flexShrink: 0 }} />
            <p className="text-xs font-semibold truncate" style={{ color: planStatus === 'trial' ? trialTextColor : '#93c5fd' }}>
              {planStatus === 'trial'
                ? (diasRestantes === 0
                  ? '⚠️ Tu prueba Pro vence hoy. Actualiza para no perder el acceso.'
                  : `✨ Prueba Pro gratis — Te quedan ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}. Actualiza por solo S/ 29/mes para no perder funciones avanzadas.`)
                : '📦 Estás usando el Plan Emprendedor (Gratis). Actualiza a Pro por S/ 29/mes para desbloquear Culqi, analíticas y más.'
              }
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="https://wa.me/51999999999?text=Hola,%20quiero%20activar%20el%20Plan%20Pro%20de%20LinkVentas."
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold px-3 py-1 rounded-full transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: '#fff',
                textDecoration: 'none',
              }}
            >
              Activar Pro
            </a>
            <button
              onClick={() => setBannerVisible(false)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Cerrar banner"
            >
              <X size={13} style={{ color: planStatus === 'trial' ? trialTextColor : '#93c5fd' }} />
            </button>
          </div>
        </div>
      )}

      {/* 1. BARRA SUPERIOR MÓVIL */}
      <div className="md:hidden bg-surface-container-low text-on-surface p-4 flex items-center justify-between sticky top-0 z-30 shadow-md border-b border-outline-variant/10">
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
      />

      {/* 3. TOP BAR + ANTENA WEBSOCKET */}
      <DashboardTopBar />

      {/* 4. CONTENIDO PRINCIPAL */}
      <main className="flex-1 md:ml-64 md:pt-24 pt-4 px-4 md:px-8 pb-12 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}