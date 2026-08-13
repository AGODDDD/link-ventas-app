'use client'

import Image from 'next/image'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Store, UserRound } from 'lucide-react'

type View = 'login' | 'register' | 'forgot'

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" className="size-5 fill-[#1877f2]" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')

  const changeView = (nextView: View) => {
    setView(nextView)
    setMessage('')
  }

  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | null = null

    const initSupabaseAuth = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        if (session) router.push('/dashboard')

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
          if (currentSession) {
            document.cookie = `sb-access-token=${currentSession.access_token}; path=/; max-age=3600; SameSite=Lax; secure`
          } else {
            document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax; secure'
          }
          if (event === 'SIGNED_IN') router.push('/dashboard')
        })
        authSubscription = subscription
      } catch (err) {
        console.error('Error cargando el módulo de auth:', err)
      }
    }

    initSupabaseAuth()
    return () => authSubscription?.unsubscribe()
  }, [router])

  const handleOAuth = async (providerName: 'google' | 'facebook') => {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerName,
        options: { redirectTo: `${location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al cargar la plataforma de autenticación.')
      setMessageType('error')
      setLoading(false)
    }
  }

  const handleAuth = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { supabase } = await import('@/lib/supabase')
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }

      if (view === 'register') {
        if (password !== confirmPassword) throw new Error('Las contraseñas no coinciden')
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) throw error
        setMessageType('success')
        setMessage('¡Cuenta creada correctamente! Revisa tu correo para confirmarla e inicia sesión.')
      }

      if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/dashboard/configuracion`,
        })
        if (error) throw error
        setMessageType('success')
        setMessage('Si el correo pertenece a una cuenta, te enviamos un enlace para recuperar el acceso.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No se pudo completar la solicitud.'
      setMessageType('error')
      setMessage(errorMessage === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const copy = {
    login: { eyebrow: 'Acceso seguro', title: 'Qué bueno verte de nuevo.', description: 'Ingresa a tu centro de operaciones y mantén tu negocio en movimiento.', action: 'Entrar a LinkVentas' },
    register: { eyebrow: 'Empieza hoy', title: 'Crea tu espacio de venta.', description: 'Configura tu tienda, recibe pedidos y gestiona tu negocio desde un solo lugar.', action: 'Crear mi cuenta' },
    forgot: { eyebrow: 'Recupera tu acceso', title: 'Volvamos a conectarte.', description: 'Te enviaremos instrucciones sencillas para restablecer tu contraseña.', action: 'Enviar instrucciones' },
  }[view]

  const inputClass = 'peer h-14 w-full border-0 border-b border-[#17261d]/35 bg-transparent px-0 pr-10 text-[15px] text-[#17261d] placeholder:text-[#17261d]/45 outline-none transition-all duration-300 ease-out focus:border-[#176cf0] focus:ring-0'

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#edf1e9] text-white selection:bg-[#76a2ff]/45">
      <Image
        alt="Emprendedor gestionando los pedidos de su negocio"
        className="object-cover object-[30%_center]"
        fill
        priority
        sizes="100vw"
        src="/images/login-commerce-daylight-v1.png"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,32,19,0.14)_0%,transparent_46%,rgba(255,255,255,0.04)_100%)]" />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-[1600px] lg:grid-cols-[minmax(0,1fr)_minmax(460px,0.92fr)]">
        <section className="hidden flex-col justify-between p-8 lg:flex xl:p-12">
          <a className="group inline-flex w-fit items-center gap-3 transition-opacity duration-300 hover:opacity-80" href="/">
            <span className="grid size-11 place-items-center rounded-2xl border border-white/20 bg-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-md">
              <Store className="size-5 text-[#b8d0ff]" strokeWidth={2.2} />
            </span>
            <span className="text-xl font-semibold tracking-[-0.05em]">LinkVentas</span>
          </a>

          <div className="max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/15 px-3.5 py-2 text-xs font-medium tracking-wide text-white/80 backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-[#8db5ff] shadow-[0_0_12px_#8db5ff]" />
              Comercio conectado, todos los días
            </span>
            <h1 className="max-w-lg text-5xl font-semibold leading-[1.02] tracking-[-0.065em] text-white xl:text-6xl">
              Tu negocio, siempre listo para vender.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/75">
              Pedidos, catálogo e información clave para tomar mejores decisiones desde un mismo lugar.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-white/55">
            <ShieldCheck className="size-4 text-[#9cc0ff]" />
            Tu información viaja de forma segura
          </div>
        </section>

        <section className="flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-7 lg:px-12 xl:px-20">
          <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-5 duration-700">
            <a className="mb-10 flex items-center justify-center gap-2.5 lg:hidden" href="/">
              <span className="grid size-10 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md"><Store className="size-5 text-[#b8d0ff]" /></span>
              <span className="text-xl font-semibold tracking-[-0.05em]">LinkVentas</span>
            </a>

            <div className="rounded-[2rem] border border-white/55 bg-white/[0.13] p-6 shadow-[0_24px_70px_rgba(44,52,32,0.18)] backdrop-blur-xl sm:p-9">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#195dc3]">{copy.eyebrow}</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.055em] text-[#17261d]">{copy.title}</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#17261d]/70">{copy.description}</p>
              </div>

              <form className="space-y-4" onSubmit={handleAuth}>
                {view === 'register' && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-[#17261d]/75">Nombre completo</span>
                    <span className="relative block"><UserRound className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#17261d]/55" /><input className={inputClass} placeholder="¿Cómo te llamas?" required type="text" value={name} onChange={(event) => setName(event.target.value)} /></span>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[#17261d]/75">Correo electrónico</span>
                  <span className="relative block"><Mail className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#17261d]/55" /><input autoComplete="email" className={inputClass} placeholder="nombre@negocio.com" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></span>
                </label>

                {view !== 'forgot' && (
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-xs font-medium text-[#17261d]/75">Contraseña {view === 'login' && <button className="font-medium text-[#195dc3] transition-colors hover:text-[#0d3f93]" type="button" onClick={() => changeView('forgot')}>¿La olvidaste?</button>}</span>
                    <span className="relative block"><LockKeyhole className="pointer-events-none absolute right-10 top-1/2 size-4 -translate-y-1/2 text-[#17261d]/55" /><input autoComplete={view === 'login' ? 'current-password' : 'new-password'} className={inputClass} minLength={6} placeholder="••••••••" required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} /><button aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#17261d]/55 transition-colors hover:text-[#17261d]" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span>
                  </label>
                )}

                {view === 'register' && (
                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-[#17261d]/75">Confirma tu contraseña</span>
                    <span className="relative block"><ShieldCheck className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#17261d]/55" /><input autoComplete="new-password" className={inputClass} minLength={6} placeholder="••••••••" required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></span>
                  </label>
                )}

                {message && <p aria-live="polite" className={`rounded-2xl border px-4 py-3 text-sm leading-5 ${messageType === 'error' ? 'border-red-300/15 bg-red-400/10 text-red-100' : 'border-emerald-300/15 bg-emerald-400/10 text-emerald-100'}`}>{message}</p>}

                <button className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#76a2ff] px-5 text-sm font-bold text-[#081426] shadow-[0_12px_32px_rgba(82,133,238,0.28)] transition-all duration-300 ease-out hover:bg-[#91b5ff] hover:shadow-[0_16px_40px_rgba(82,133,238,0.38)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55" disabled={loading} type="submit">
                  {loading ? <><span className="size-4 animate-spin rounded-full border-2 border-[#081426]/30 border-t-[#081426]" />Procesando...</> : <>{copy.action}<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></>}
                </button>
              </form>

              {view !== 'forgot' && <>
                <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-[#17261d]/20" /><span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#17261d]/50">o continúa con</span><div className="h-px flex-1 bg-[#17261d]/20" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/[0.16] text-sm font-medium text-[#17261d] transition-all duration-300 hover:bg-white/[0.34] active:scale-[0.98] disabled:opacity-50" disabled={loading} type="button" onClick={() => handleOAuth('google')}><GoogleIcon />Google</button>
                  <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/[0.16] text-sm font-medium text-[#17261d] transition-all duration-300 hover:border-[#1877f2]/35 hover:bg-[#1877f2]/12 active:scale-[0.98] disabled:opacity-50" disabled={loading} type="button" onClick={() => handleOAuth('facebook')}><FacebookIcon />Facebook</button>
                </div>
              </>}

              <div className="mt-7 border-t border-[#17261d]/15 pt-6 text-center text-sm text-[#17261d]/70">
                {view === 'login' && <>¿Aún no tienes cuenta? <button className="font-semibold text-[#195dc3] transition-colors hover:text-[#0d3f93]" type="button" onClick={() => changeView('register')}>Crear una cuenta</button></>}
                {view === 'register' && <>¿Ya tienes una cuenta? <button className="font-semibold text-[#195dc3] transition-colors hover:text-[#0d3f93]" type="button" onClick={() => changeView('login')}>Inicia sesión</button></>}
                {view === 'forgot' && <button className="inline-flex items-center gap-2 font-semibold text-[#195dc3] transition-colors hover:text-[#0d3f93]" type="button" onClick={() => changeView('login')}><ArrowLeft className="size-4" />Volver al inicio de sesión</button>}
              </div>
              <p className="mt-5 text-center text-[11px] leading-5 text-[#17261d]/50">Al continuar, consultas nuestra <a className="font-semibold text-[#195dc3] underline decoration-[#195dc3]/30 underline-offset-4" href="/privacidad">Política de privacidad</a> y las <a className="font-semibold text-[#195dc3] underline decoration-[#195dc3]/30 underline-offset-4" href="/eliminacion-de-datos">instrucciones de eliminación de datos</a>.</p>
            </div>

            <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-white/45 lg:hidden"><ShieldCheck className="size-4 text-[#9cc0ff]" />Conexión protegida para tu negocio</p>
          </div>
        </section>
      </div>
    </main>
  )
}
