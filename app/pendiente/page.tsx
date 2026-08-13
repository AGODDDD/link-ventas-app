'use client'

import { useEffect, useState } from 'react'
import { CreditCard, LockKeyhole } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LinkVentasLogo } from '@/components/brand/LinkVentasLogo'

export default function PendientePage() {
  const [nombre, setNombre] = useState('')
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const [{ data: profile }, { data: store }] = await Promise.all([
          supabase.from('profiles').select('plan').eq('id', user.id).single(),
          supabase.from('stores').select('name').eq('owner_id', user.id).single(),
        ])
        setNombre(store?.name || '')
        setPlan(profile?.plan ?? null)
      }
      setLoading(false)
    }
    void load()
  }, [])

  const handleLogout = async () => {
    document.cookie = 'sb-plan-status=; path=/; max-age=0'
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const downgrade = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const response = await fetch('/api/billing/status', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ plan: 'free' }) })
    if (!response.ok) { setLoading(false); return alert('No se pudo cambiar al plan gratuito.') }
    document.cookie = 'sb-plan-status=free; path=/; SameSite=Lax'
    window.location.href = '/dashboard'
  }

  const cancelSubscription = async () => {
    setPaying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Tu sesión expiró. Ingresa nuevamente.')
      const response = await fetch('/api/billing/mercadopago', { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo cancelar la suscripción.')
      alert(data.cancelled
        ? 'La suscripción fue cancelada. Si había un período Pro pagado, conservarás el acceso hasta su vencimiento.'
        : 'No tienes una suscripción activa ni una solicitud pendiente.')
      window.location.href = '/dashboard'
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo cancelar la suscripción.')
      setPaying(false)
    }
  }

  const subscribe = async () => {
    setPaying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Tu sesión expiró. Ingresa nuevamente.')
      const response = await fetch('/api/billing/mercadopago', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const data = await response.json()
      if (!response.ok || !data.checkout_url) throw new Error(data.error || 'No se pudo iniciar la suscripción.')
      window.location.assign(data.checkout_url)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo iniciar la suscripción.')
      setPaying(false)
    }
  }

  if (loading) return null
  const trialExpired = plan === 'trial' || plan === null
  const isInactive = plan === 'inactivo'
  const isFree = plan === 'free'
  const title = trialExpired
    ? 'Tu prueba gratuita ha finalizado'
    : isInactive
      ? 'Tu cuenta está inactiva'
      : isFree
        ? 'Elige el plan que impulsa tu negocio'
        : 'Activa tu cuenta'

  return <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(47,126,218,0.22)_0%,#0a0f18_60%)] p-6 font-sans">
    <div className="mb-10 text-center"><LinkVentasLogo tone="light" wordmarkClassName="text-2xl" /><p className="mt-2 text-xs uppercase tracking-[0.1em] text-white/40">Panel de control comercial</p></div>
    <div className="w-full max-w-[460px] rounded-[20px] border border-blue-300/20 bg-[#101923e6] px-9 py-10 text-center shadow-[0_40px_80px_rgba(0,0,0,0.5)] backdrop-blur-[20px]">
      <div className="mx-auto mb-6 flex size-[68px] items-center justify-center rounded-full border border-blue-300/30 bg-blue-400/10 text-blue-200">{trialExpired ? <CreditCard size={26} /> : <LockKeyhole size={25} />}</div>
      <h1 className="mb-3 text-[22px] font-bold text-white">{title}</h1>
      <p className="mb-8 text-sm leading-[1.7] text-white/45">
        {isFree
          ? <>Tu tienda{nombre ? ` ${nombre}` : ''} ya funciona con el plan Emprendedor. Activa <strong className="text-blue-300">Pro por S/ 25/mes</strong> cuando necesites analíticas, Mercado Pago y tickets.</>
          : <>Activa el <strong className="text-blue-300">Plan Pro por S/ 25/mes</strong>{nombre ? `, ${nombre}` : ''}, o continúa con el plan gratuito.</>}
      </p>
      <div className="mb-7 grid grid-cols-2 gap-3 text-left"><div className="rounded-[14px] border border-white/8 bg-white/[.03] p-3.5"><p className="text-xs font-bold uppercase text-white/35">Emprendedor</p><p className="mt-1 text-2xl font-extrabold text-white">S/ 0</p><p className="mt-2 text-xs text-white/40">Catálogo y panel básico</p></div><div className="rounded-[14px] border border-blue-300/35 bg-blue-500/10 p-3.5"><p className="text-xs font-bold uppercase text-blue-300">Pro</p><p className="mt-1 text-2xl font-extrabold text-white">S/ 25</p><p className="mt-2 text-xs text-white/60">Mercado Pago, tickets y analíticas</p></div></div>
      {plan === 'pro' ? <>
        <button onClick={cancelSubscription} disabled={paying} className="mb-3 w-full rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-sm font-semibold text-amber-100 disabled:cursor-wait disabled:opacity-70">{paying ? 'Cancelando...' : 'Cancelar renovación automática'}</button>
        <p className="mb-6 text-xs leading-5 text-white/40">Conservarás Pro hasta que termine tu período ya pagado.</p>
      </> : <>
        <button onClick={subscribe} disabled={paying} className="mb-3 w-full rounded-xl bg-gradient-to-br from-[#2f7eda] to-[#245da8] p-3.5 text-[15px] font-bold text-white shadow-[0_12px_30px_rgba(47,126,218,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:cursor-wait disabled:opacity-70">
          {paying ? 'Abriendo Mercado Pago...' : 'Suscribirme a Pro — S/ 25/mes'}
        </button>
        <p className="mb-3 text-xs leading-5 text-white/40">Serás redirigido a Mercado Pago para autorizar el cobro mensual. Puedes cancelar cuando quieras.</p>
        <button onClick={cancelSubscription} disabled={paying} className="mb-3 w-full text-xs font-medium text-amber-200/75 underline decoration-amber-200/30 underline-offset-4 disabled:cursor-wait disabled:opacity-70">
          {paying ? 'Cancelando solicitud...' : '¿Ya iniciaste una suscripción? Cancelar solicitud pendiente'}
        </button>
        <button onClick={downgrade} className="mb-6 w-full rounded-xl border border-white/10 bg-white/[.03] p-3.5 text-sm font-semibold text-white/80">Continuar con el Plan Emprendedor</button>
      </>}
      <button onClick={handleLogout} className="text-xs text-white/30 underline">Cerrar sesión</button>
    </div>
  </div>
}
