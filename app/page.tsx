'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.push('/dashboard')
    })
    return () => subscription.unsubscribe()
  }, [router])

  const handleOAuth = async (providerName: 'google' | 'facebook' | 'apple') => {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerName,
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      })
      if(error){
          setMessage(error.message)
          setMessageType('error')
          setLoading(false)
      }
  }

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) { 
           throw error 
        } else {
          setMessageType('success')
          setMessage('¡Cuenta creada correctamente!')
        }
      }
    } catch (err: any) {
      setMessageType('error')
      setMessage(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .glass-effect {
            backdrop-filter: blur(20px);
            background: rgba(31, 31, 40, 0.7);
        }
        .primary-gradient {
            background: linear-gradient(135deg, #bdbefe 0%, #9a9bd9 100%);
        }
      `}} />
      
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden min-h-screen bg-background text-on-background font-body selection:bg-primary/30">
        
        {/* Ambient Glow Background Decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        {/* Logo Header */}
        <div className="mb-10 text-center z-10 mt-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
            <span className="font-headline text-3xl font-extrabold tracking-tighter text-primary">LinkVentas</span>
          </div>
          
          <div className="inline-flex bg-surface-container-low p-1 rounded-xl">
            <button 
              onClick={() => { setIsLogin(true); setMessage('') }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${isLogin ? 'text-primary bg-surface-container-highest shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Acceder
            </button>
            <button 
              onClick={() => { setIsLogin(false); setMessage('') }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${!isLogin ? 'text-primary bg-surface-container-highest shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Nueva Cuenta
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-[440px] glass-effect rounded-[2rem] border border-outline-variant/10 shadow-[0_40px_80px_rgba(0,0,0,0.4)] p-8 md:p-10 z-10 relative">
          
          <div className="mb-8">
            <h1 className="font-headline text-2xl font-bold tracking-tight mb-2 text-on-surface">
              {isLogin ? 'Bienvenido de vuelta' : 'Crea tu espacio'}
            </h1>
            <p className="text-on-surface-variant text-sm font-medium">
              {isLogin ? 'Introduce tus credenciales para acceder.' : 'Usa tu email para registrar una nueva cuenta.'}
            </p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-xl group-focus-within:text-primary transition-colors">mail</span>
                </div>
                <input 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                  placeholder="nombre@ejemplo.com" 
                  type="email" 
                  required 
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-xl group-focus-within:text-primary transition-colors">lock</span>
                </div>
                <input 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-12 text-on-surface placeholder:text-outline/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  minLength={6}
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-outline hover:text-primary transition-colors" 
                  type="button"
                >
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            
            {/* Forgot Password (only shown on Login) */}
            {isLogin && (
              <div className="flex justify-end">
                <a className="text-sm font-medium text-secondary hover:text-primary transition-colors decoration-2 underline-offset-4 hover:underline" href="#">
                    Olvidé mi contraseña
                </a>
              </div>
            )}

            {/* Status Messages */}
            {message && (
              <div className={`p-4 rounded-xl text-sm font-semibold border ${messageType === 'error' ? 'bg-error/10 text-error border-error/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                {message}
              </div>
            )}
            
            {/* Submit Button */}
            <button 
              disabled={loading}
              className="w-full primary-gradient text-on-primary font-bold py-4 rounded-xl flex items-center justify-center gap-2 group active:scale-[0.98] transition-transform shadow-lg shadow-primary/10 disabled:opacity-50" 
              type="submit"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Acceder al Sistema' : 'Registrar Cuenta'}</span>
                  <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                </>
              )}
            </button>
            
            {/* Social Login Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/20"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="px-4 text-on-surface-variant font-semibold" style={{background: 'rgba(31, 31, 40, 1)'}}>O continuar con</span>
              </div>
            </div>
            
            {/* Social Login Buttons (Added Apple to the list grid) */}
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleOAuth('google')}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-outline-variant/20 bg-white/5 hover:bg-white/10 transition-all group disabled:opacity-50" 
                  type="button"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                  <span className="text-sm font-semibold text-on-surface">Google</span>
                </button>
                <button 
                  onClick={() => handleOAuth('facebook')}
                  disabled={loading}
                  className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-outline-variant/20 bg-white/5 hover:bg-[#1877F2]/20 hover:border-[#1877F2]/40 transition-all group disabled:opacity-50" 
                  type="button"
                >
                  <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                  </svg>
                  <span className="text-sm font-semibold text-on-surface">Facebook</span>
                </button>
              </div>
              <button 
                onClick={() => handleOAuth('apple')}
                disabled={loading}
                className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-outline-variant/20 bg-white/5 hover:bg-white/10 transition-all group disabled:opacity-50 w-full" 
                type="button"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.641-.026 2.669-1.48 3.666-2.947 1.152-1.688 1.631-3.313 1.657-3.396-.039-.013-3.182-1.22-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.68.827-1.34 2.274-1.145 3.639 1.353.104 2.686-.615 3.432-1.627z"/>
                </svg>
                <span className="text-sm font-semibold text-on-surface">Apple</span>
              </button>
            </div>
          </form>
          
          {/* Trust Badge Section */}
          <div className="mt-8 pt-8 border-t border-outline-variant/10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 bg-tertiary-container/5 px-4 py-2 rounded-full">
              <span className="material-symbols-outlined text-primary text-sm" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary-dim">Conexión de alta seguridad</span>
            </div>
          </div>
        </div>

        {/* Social Proof/Secondary Content in Bento Style */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-[440px] z-10 pb-12">
          <div className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-4 border border-outline-variant/5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">Gestión Real</p>
              <p className="text-[10px] text-on-surface-variant">Analíticas en tiempo real.</p>
            </div>
          </div>
          <div className="bg-surface-container-low p-4 rounded-2xl flex items-center gap-4 border border-outline-variant/5">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">support_agent</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">Soporte 24/7</p>
              <p className="text-[10px] text-on-surface-variant">Estamos para ayudarte.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer from Shared Components */}
      <footer className="w-full py-12 border-t border-outline-variant/20 bg-background absolute bottom-0 left-0">
        <div className="flex flex-col md:flex-row items-center justify-between px-12 max-w-7xl mx-auto gap-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <p className="font-inter text-xs font-medium uppercase tracking-widest text-slate-500">© 2026 LinkVentas. Protegido mediante Supabase Auth.</p>
          </div>
          <div className="flex gap-6">
            <a className="font-inter text-xs font-medium uppercase tracking-widest text-slate-500 hover:text-primary transition-all" href="#">Privacidad</a>
            <a className="font-inter text-xs font-medium uppercase tracking-widest text-slate-500 hover:text-primary transition-all" href="#">Términos</a>
            <a className="font-inter text-xs font-medium uppercase tracking-widest text-slate-500 hover:text-primary transition-all" href="#">Soporte</a>
          </div>
        </div>
      </footer>
    </>
  )
}