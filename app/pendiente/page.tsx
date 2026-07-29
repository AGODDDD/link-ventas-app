'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { supabase } from '@/lib/supabase'

export default function PendientePage() {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const culqiPublicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        const [{ data: profile }, { data: store }] = await Promise.all([
          supabase.from('profiles').select('plan, plan_expires_at').eq('id', user.id).single(),
          supabase.from('stores').select('name').eq('owner_id', user.id).single(),
        ])
        if (store?.name) setNombre(store.name)
        setPlan(profile?.plan ?? null)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    document.cookie = 'sb-plan-status=; path=/; max-age=0'
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleDowngradeToFree = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/billing/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ plan: 'free' }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setLoading(false)
      alert(data?.error || 'Error al cambiar de plan. Intenta de nuevo.')
      return
    }
    document.cookie = 'sb-plan-status=free; path=/; SameSite=Lax'
    window.location.href = '/dashboard'
  }

  useEffect(() => {
    const win = window as typeof window & { Culqi?: any; culqi?: () => Promise<void> }
    win.culqi = async () => {
      const token = win.Culqi?.token
      if (!token) {
        setPaying(false)
        alert(win.Culqi?.error?.user_message || 'El pago fue cancelado.')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setPaying(false)
        return alert('Tu sesión expiró. Ingresa nuevamente.')
      }
      const response = await fetch('/api/billing/culqi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ token_id: token.id, email: token.email || email }),
      })
      const data = await response.json()
      setPaying(false)
      try { win.Culqi.close() } catch {}
      if (!response.ok) return alert(data.error || 'No se pudo procesar el pago.')
      document.cookie = 'sb-plan-status=pro; path=/; SameSite=Lax'
      window.location.href = '/dashboard'
    }
    return () => { delete win.culqi }
  }, [email])

  const handleProPayment = () => {
    const win = window as typeof window & { Culqi?: any }
    if (!culqiPublicKey || !win.Culqi) return alert('El módulo de pago aún no está disponible.')
    setPaying(true)
    win.Culqi.publicKey = culqiPublicKey
    win.Culqi.settings({ title: 'LinkVentas Pro', currency: 'PEN', amount: 2900 })
    win.Culqi.options({ lang: 'es', installments: false, paymentMethods: { tarjeta: true, yape: true, bancaMovil: false } })
    win.Culqi.open()
  }

  const trialExpired = plan === 'trial' || plan === null
  const isInactive = plan === 'inactivo'
  const whatsappMessage = encodeURIComponent(`Hola, quiero activar mi Plan Pro de LinkVentas. Mi correo es: ${email}`)

  if (loading) return null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(109,40,217,0.15)_0%,#0a0a0f_60%)] p-6 font-sans">
      <Script src="https://checkout.culqi.com/js/v4" strategy="afterInteractive" />
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 text-2xl font-extrabold tracking-[0] text-white"><span className="text-violet-400">⚡</span> LinkVentas</div>
        <p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/30">Panel de control comercial</p>
      </div>

      <div className="w-full max-w-[460px] rounded-[20px] border border-violet-400/20 bg-[#13131ae6] px-9 py-10 text-center shadow-[0_40px_80px_rgba(0,0,0,0.5)] backdrop-blur-[20px]">
        <div className="mx-auto mb-6 flex h-[68px] w-[68px] items-center justify-center rounded-full border border-violet-400/35 bg-violet-700/15 text-[28px]">{trialExpired ? '⏰' : '🔐'}</div>
        <h1 className="mb-3 text-[22px] font-bold tracking-[0] text-white">{trialExpired ? 'Tu prueba gratuita ha finalizado' : isInactive ? 'Tu cuenta está inactiva' : 'Cuenta pendiente de activación'}</h1>
        <p className="mb-8 text-sm leading-[1.7] text-white/45">
          {trialExpired ? <>Tu prueba Pro de 14 días ha concluido{nombre ? `, ${nombre}` : ''}. Activa el <strong className="text-violet-400">Plan Pro por S/ 29/mes</strong> para recuperar el acceso completo a todas las funciones avanzadas, o continúa con el Plan Emprendedor gratuito.</> : isInactive ? <>Tu cuenta <strong className="text-white/70">{email}</strong> se encuentra inactiva. Puedes activar el Plan Pro o continuar con el Plan Emprendedor (Gratis).</> : <>{nombre ? `Hola ${nombre}, tu` : 'Tu'} cuenta <strong className="text-white/70">{email}</strong> requiere activación. Escríbenos por WhatsApp o elige el plan gratuito.</>}
        </p>

        <div className="mb-7 grid grid-cols-2 gap-3">
          <div className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3.5 py-[18px] text-left">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-white/35">Emprendedor</div><div className="mb-1 text-[26px] font-extrabold text-white">S/ 0</div><div className="mb-3 text-[11px] text-white/30">/mes · Gratis para siempre</div><div className="text-[11px] leading-[1.8] text-white/40">✓ Catálogo (hasta 10 productos)<br />✓ Pedidos ilimitados<br />✓ Panel básico</div>
          </div>
          <div className="relative rounded-[14px] border border-violet-400/40 bg-violet-700/15 px-3.5 py-[18px] text-left">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-br from-violet-600 to-violet-700 px-2.5 py-[3px] text-[9px] font-bold uppercase tracking-[0.08em] text-white">⭐ Más Popular</div><div className="mb-2 mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-400">Pro</div><div className="mb-1 text-[26px] font-extrabold text-white">S/ 29</div><div className="mb-3 text-[11px] text-white/40">/mes · Sin comisiones</div><div className="text-[11px] leading-[1.8] text-white/60">✓ Todo lo del Emprendedor<br />✓ Productos ilimitados<br />✓ Culqi + Tickets PDF<br />✓ Analytics avanzado</div>
          </div>
        </div>

        <button disabled={paying || !culqiPublicKey} onClick={handleProPayment} className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 p-3.5 text-[15px] font-bold text-white shadow-[0_8px_24px_rgba(109,40,217,0.25)] disabled:opacity-50">
          {paying ? 'Procesando pago...' : 'Pagar Plan Pro — S/ 29/mes'}
        </button>
        <a href={`https://wa.me/51999999999?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="mb-6 flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-semibold text-white/70 no-underline">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.848L.057 23.267a.75.75 0 0 0 .921.921l5.487-1.474A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.697 9.697 0 0 1-4.92-1.336l-.353-.209-3.644.978.997-3.543-.228-.366A9.698 9.698 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" /></svg>
          ¿Necesitas ayuda? Escríbenos por WhatsApp
        </a>
        <button onClick={handleDowngradeToFree} className="mb-6 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-sm font-semibold text-white/80 transition-all duration-200 hover:bg-white/[0.08]">Continuar con el Plan Emprendedor (Gratis)</button>
        <button onClick={handleLogout} className="p-1 text-xs text-white/30 underline underline-offset-[3px]">Cerrar sesión</button>
      </div>
      <p className="mt-6 text-center text-[11px] text-white/15">© 2026 LinkVentas · Sin comisiones · Sin permanencia</p>
    </div>
  )
}
