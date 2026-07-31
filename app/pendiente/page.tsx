'use client'

import { useEffect, useState } from 'react'
import { MercadoPagoCardPayment } from '@/components/payments/MercadoPagoCardPayment'
import { supabase } from '@/lib/supabase'

const PRO_AMOUNT = 25

export default function PendientePage() {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [plan, setPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [paying, setPaying] = useState(false)
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
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

  const submitPayment = async (payment: { token: string; payment_method_id: string; installments: number; issuer_id?: string; payer?: { email?: string } }) => {
    setPaying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Tu sesión expiró. Ingresa nuevamente.')
      const response = await fetch('/api/billing/mercadopago', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ...payment, email: payment.payer?.email || email }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Pago no aprobado.')
      alert('Pago recibido. Activaremos tu plan Pro cuando Mercado Pago confirme la operación.')
      setShowPayment(false)
    } finally { setPaying(false) }
  }

  if (loading) return null
  const trialExpired = plan === 'trial' || plan === null
  const isInactive = plan === 'inactivo'

  return <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(109,40,217,0.15)_0%,#0a0a0f_60%)] p-6 font-sans">
    <div className="mb-10 text-center"><div className="text-2xl font-extrabold text-white">⚡ LinkVentas</div><p className="mt-1 text-xs uppercase tracking-[0.1em] text-white/30">Panel de control comercial</p></div>
    <div className="w-full max-w-[460px] rounded-[20px] border border-violet-400/20 bg-[#13131ae6] px-9 py-10 text-center shadow-[0_40px_80px_rgba(0,0,0,0.5)] backdrop-blur-[20px]">
      <div className="mx-auto mb-6 flex size-[68px] items-center justify-center rounded-full border border-violet-400/35 bg-violet-700/15 text-[28px]">{trialExpired ? '⏰' : '🔐'}</div>
      <h1 className="mb-3 text-[22px] font-bold text-white">{trialExpired ? 'Tu prueba gratuita ha finalizado' : isInactive ? 'Tu cuenta está inactiva' : 'Cuenta pendiente de activación'}</h1>
      <p className="mb-8 text-sm leading-[1.7] text-white/45">Activa el <strong className="text-violet-400">Plan Pro por S/ 25/mes</strong>{nombre ? `, ${nombre}` : ''}, para recuperar todas las funciones avanzadas o continúa con el plan gratuito.</p>
      <div className="mb-7 grid grid-cols-2 gap-3 text-left"><div className="rounded-[14px] border border-white/8 bg-white/[.03] p-3.5"><p className="text-xs font-bold uppercase text-white/35">Emprendedor</p><p className="mt-1 text-2xl font-extrabold text-white">S/ 0</p><p className="mt-2 text-xs text-white/40">Catálogo y panel básico</p></div><div className="rounded-[14px] border border-violet-400/40 bg-violet-700/15 p-3.5"><p className="text-xs font-bold uppercase text-violet-400">Pro</p><p className="mt-1 text-2xl font-extrabold text-white">S/ 25</p><p className="mt-2 text-xs text-white/60">Mercado Pago, tickets y analíticas</p></div></div>
      {showPayment && publicKey ? <div className="mb-5 rounded-xl bg-white p-4 text-left"><MercadoPagoCardPayment publicKey={publicKey} amount={PRO_AMOUNT} payerEmail={email} onSubmit={submitPayment} onError={(message) => alert(message)} />{paying && <p className="mt-3 text-center text-sm text-zinc-600">Procesando pago...</p>}</div> : <button disabled={!publicKey} onClick={() => setShowPayment(true)} className="mb-3 w-full rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 p-3.5 text-[15px] font-bold text-white disabled:opacity-50">Pagar Plan Pro — S/ 25/mes</button>}
      <button onClick={downgrade} className="mb-6 w-full rounded-xl border border-white/10 bg-white/[.03] p-3.5 text-sm font-semibold text-white/80">Continuar con el Plan Emprendedor</button>
      <button onClick={handleLogout} className="text-xs text-white/30 underline">Cerrar sesión</button>
    </div>
  </div>
}
