'use client'
import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  // Utiliza 3 vistas principales: login, register y forgot
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')

  useEffect(() => {
    let authSubscription: any = null

    const initSupabaseAuth = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        if (session) router.push('/dashboard')

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Lax; secure`
          } else {
            document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax; secure`
          }
          if (event === 'SIGNED_IN') router.push('/dashboard')
        })
        authSubscription = subscription
      } catch (err) {
        console.error("Error cargando el módulo de auth:", err)
      }
    }
    
    initSupabaseAuth()

    return () => {
      if (authSubscription) authSubscription.unsubscribe()
    }
  }, [router])

  const handleOAuth = async (providerName: 'google' | 'facebook') => {
      setLoading(true)
      try {
        const { supabase } = await import('@/lib/supabase')
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
      } catch (err: any) {
        setMessage('Error al cargar la plataforma de autenticación.')
        setMessageType('error')
        setLoading(false)
      }
  }

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      const { supabase } = await import('@/lib/supabase')
      
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (view === 'register') {
        if (password !== confirmPassword) {
            throw new Error("Las contraseñas no coinciden")
        }
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: { data: { full_name: name } }
        })
        if (error) { 
           throw error 
        } else {
          setMessageType('success')
          setMessage('¡Cuenta creada correctamente! Ingresa ahora.')
        }
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${location.origin}/dashboard/configuracion`, 
        })
        if (error) {
            throw error
        } else {
            setMessageType('success')
            setMessage('Si el correo pertenece a una cuenta, se ha enviado un enlace para recuperarla.')
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
        .glass-card {
            background: rgba(25, 25, 33, 0.7);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
        }
        .primary-gradient {
            background: linear-gradient(135deg, #bdbefe 0%, #9a9bd9 100%);
        }
        body {
            background-color: #0e0e15;
            background-image: radial-gradient(circle at 50% -20%, #1b1c52 0%, #0e0e15 80%);
        }
      `}} />

      {view === 'login' ? (
        // ==========================================
        // VISTA DE LOGIN
        // ==========================================
        <main className="flex-grow flex flex-col items-center justify-center px-4 md:px-6 py-4 md:py-12 relative overflow-hidden bg-transparent text-[#e7e4ee] font-body min-h-[100dvh] selection:bg-[#bdbefe]/30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#bdbefe]/5 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="mb-6 md:mb-10 text-center z-10 pt-4 md:pt-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#bdbefe] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <span className="font-headline text-3xl font-extrabold tracking-tighter text-[#bdbefe]">LinkVentas</span>
            </div>
            <div className="inline-flex bg-[#13131a] p-1 rounded-xl">
              <button 
                onClick={() => { setView('login'); setMessage('') }}
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-all text-[#bdbefe] bg-[#25252f] shadow-sm"
              >
                Acceder
              </button>
              <button 
                onClick={() => { setView('register'); setMessage('') }}
                className="px-6 py-2 rounded-lg text-sm font-semibold transition-all text-[#acaab4] hover:text-[#e7e4ee]"
              >
                Nueva Cuenta
              </button>
            </div>
          </div>

          <div className="w-full max-w-[440px] glass-effect rounded-[2rem] border border-[#48474f]/10 shadow-[0_40px_80px_rgba(0,0,0,0.4)] p-8 md:p-10 z-10">
            <div className="mb-8">
              <h1 className="font-headline text-2xl font-bold tracking-tight mb-2 text-[#e7e4ee]">
                Bienvenido de vuelta
              </h1>
              <p className="text-[#acaab4] text-sm font-medium">
                Introduce tus credenciales para acceder.
              </p>
            </div>
            
            <form className="space-y-6" onSubmit={handleAuth}>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#acaab4] ml-1">Correo Electrónico</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-[#76747e] text-xl group-focus-within:text-[#bdbefe] transition-colors">mail</span>
                  </div>
                  <input 
                    className="w-full bg-[#25252f] border-none rounded-xl py-4 pl-12 pr-4 text-[#e7e4ee] placeholder:text-[#76747e]/50 focus:ring-2 focus:ring-[#bdbefe]/20 transition-all outline-none" 
                    placeholder="nombre@ejemplo.com" 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#acaab4] ml-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-[#76747e] text-xl group-focus-within:text-[#bdbefe] transition-colors">lock</span>
                  </div>
                  <input 
                    className="w-full bg-[#25252f] border-none rounded-xl py-4 pl-12 pr-4 text-[#e7e4ee] placeholder:text-[#76747e]/50 focus:ring-2 focus:ring-[#bdbefe]/20 transition-all outline-none" 
                    placeholder="••••••••" 
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#76747e] hover:text-[#bdbefe] transition-colors" 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              
              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <button 
                  onClick={() => { setView('forgot'); setMessage(''); }}
                  type="button"
                  className="text-sm font-medium text-[#9193ff] hover:text-[#bdbefe] transition-colors decoration-2 underline-offset-4 hover:underline"
                >
                    Olvidé mi contraseña
                </button>
              </div>

              {/* Error/Success Message */}
              {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${messageType === 'error' ? 'bg-[#a70138]/20 text-[#d73357]' : 'bg-green-500/10 text-green-400'}`}>
                  {message}
                </div>
              )}
              
              {/* Submit Button */}
              <button 
                disabled={loading}
                className="w-full primary-gradient text-[#37396f] font-bold py-4 rounded-xl flex items-center justify-center gap-2 group active:scale-[0.98] transition-transform shadow-lg shadow-[#bdbefe]/10 disabled:opacity-50" 
                type="submit"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>Acceder al Sistema</span>
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </>
                )}
              </button>
              
              {/* Social Login Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#48474f]/20"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest">
                  <span className="bg-[#25252f] px-4 text-[#acaab4] font-semibold">O continuar con</span>
                </div>
              </div>
              
              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button onClick={() => handleOAuth('google')} type="button" className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#48474f]/20 bg-white/5 hover:bg-white/10 transition-all group">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                  </svg>
                  <span className="text-sm font-semibold text-[#e7e4ee]">Google</span>
                </button>
                
                <button onClick={() => handleOAuth('facebook')} type="button" className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#48474f]/20 bg-white/5 hover:bg-[#1877F2]/20 hover:border-[#1877F2]/40 transition-all group">
                  <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                  </svg>
                  <span className="text-sm font-semibold text-[#e7e4ee]">Facebook</span>
                </button>
              </div>
            </form>
            
            <div className="mt-8 pt-8 border-t border-[#48474f]/10 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 bg-[#e5e2ff]/5 px-4 py-2 rounded-full">
                <span className="material-symbols-outlined text-[#bdbefe] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#d7d4f0]">Conexión de alta seguridad</span>
              </div>
            </div>
          </div>

          {/* Social Proof/Secondary Content in Bento Style - Hidden on Mobile */}
          <div className="mt-8 md:mt-12 hidden md:grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-[440px] z-10">
            <div className="bg-[#13131a] p-4 rounded-2xl flex items-center gap-4 border border-[#48474f]/5">
              <div className="w-10 h-10 rounded-full bg-[#bdbefe]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#bdbefe]">analytics</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#e7e4ee]">Gestión Real</p>
                <p className="text-[10px] text-[#acaab4]">Analíticas en tiempo real.</p>
              </div>
            </div>
            <div className="bg-[#13131a] p-4 rounded-2xl flex items-center gap-4 border border-[#48474f]/5">
              <div className="w-10 h-10 rounded-full bg-[#9193ff]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#9193ff]">support_agent</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#e7e4ee]">Soporte 24/7</p>
                <p className="text-[10px] text-[#acaab4]">Estamos para ayudarte.</p>
              </div>
            </div>
          </div>

          {/* Footer from Shared Components - Hidden on Mobile */}
          <footer className="hidden md:flex w-full mt-auto py-12 border-t border-[#48474f]/20 bg-transparent flex-col md:flex-row items-center justify-between px-12 max-w-7xl mx-auto gap-4">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <p className="font-inter text-xs font-medium uppercase tracking-widest text-slate-500">© 2026 LinkVentas.</p>
              </div>
              <div className="flex gap-6">
                <a className="font-inter text-xs font-medium uppercase tracking-widest text-slate-500 hover:text-[#bdbefe] transition-all" href="#">Privacidad</a>
                <a className="font-inter text-xs font-medium uppercase tracking-widest text-slate-500 hover:text-[#bdbefe] transition-all" href="#">Términos</a>
              </div>
          </footer>
        </main>
      ) : view === 'register' ? (
        // ==========================================
        // VISTA DE REGISTRO
        // ==========================================
        <div className="font-body text-[#e7e4ee] min-h-[100dvh] flex flex-col items-center justify-center p-4 md:p-6 overflow-x-hidden bg-transparent selection:bg-[#bdbefe]/30">
            <header className="fixed top-0 left-0 w-full p-6 md:p-8 flex justify-center pointer-events-none">
                <div className="flex items-center gap-2 opacity-80">
                    {/* RAYITO EN VEZ DE HUB */}
                    <span className="material-symbols-outlined text-[#bdbefe] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    <span className="font-headline font-extrabold text-2xl tracking-tight text-[#bdbefe]">LinkVentas</span>
                </div>
            </header>
            
            <main className="w-full max-w-md mt-12 md:mt-16 mb-6 md:mb-16 relative flex flex-col justify-center min-h-screen">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#bdbefe]/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#9193ff]/10 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="glass-card rounded-xl p-8 shadow-2xl border border-white/5 relative z-10">
                    <div className="mb-10 text-center">
                        <h1 className="font-headline text-3xl font-extrabold text-[#e7e4ee] tracking-tight mb-3">Crear Nueva Cuenta</h1>
                        <p className="text-[#acaab4] text-sm leading-relaxed">Únete a la plataforma de comercio para emprendedores</p>
                    </div>
                    
                    <form className="space-y-6" onSubmit={handleAuth}>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#acaab4] ml-1">Nombre Completo</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#76747e] group-focus-within:text-[#bdbefe] transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">person</span>
                                </div>
                                <input 
                                    className="w-full bg-[#25252f] border-none rounded-xl py-3.5 pl-11 pr-4 text-[#e7e4ee] placeholder:text-[#76747e]/50 focus:ring-2 focus:ring-[#bdbefe]/20 transition-all outline-none" 
                                    placeholder="Tu nombre" 
                                    type="text" 
                                    required 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#acaab4] ml-1">Correo Electrónico</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#76747e] group-focus-within:text-[#bdbefe] transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">mail</span>
                                </div>
                                <input 
                                    className="w-full bg-[#25252f] border-none rounded-xl py-3.5 pl-11 pr-4 text-[#e7e4ee] placeholder:text-[#76747e]/50 focus:ring-2 focus:ring-[#bdbefe]/20 transition-all outline-none" 
                                    placeholder="ejemplo@linkventas.com" 
                                    type="email" 
                                    required 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#acaab4] ml-1">Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#76747e] group-focus-within:text-[#bdbefe] transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">lock</span>
                                </div>
                                <input 
                                    className="w-full bg-[#25252f] border-none rounded-xl py-3.5 pl-11 pr-4 text-[#e7e4ee] placeholder:text-[#76747e]/50 focus:ring-2 focus:ring-[#bdbefe]/20 transition-all outline-none" 
                                    placeholder="Mínimo 6 caracteres" 
                                    type="password" 
                                    required 
                                    minLength={6} 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#acaab4] ml-1">Confirmar Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#76747e] group-focus-within:text-[#bdbefe] transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                                </div>
                                <input 
                                    className="w-full bg-[#25252f] border-none rounded-xl py-3.5 pl-11 pr-4 text-[#e7e4ee] placeholder:text-[#76747e]/50 focus:ring-2 focus:ring-[#bdbefe]/20 transition-all outline-none" 
                                    placeholder="Repite tu contraseña" 
                                    type="password" 
                                    required 
                                    minLength={6} 
                                    value={confirmPassword} 
                                    onChange={e => setConfirmPassword(e.target.value)} 
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium ${messageType === 'error' ? 'bg-[#a70138]/20 text-[#d73357]' : 'bg-green-500/10 text-green-400'}`}>
                                {message}
                            </div>
                        )}
                        
                        <button 
                            disabled={loading}
                            className="w-full bg-gradient-to-br from-[#bdbefe] to-[#9a9bd9] text-[#1b1c52] font-headline font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-[#bdbefe]/10 group disabled:opacity-50" 
                            type="submit"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                    <span>Creando Cuenta...</span>
                                </>
                            ) : (
                                <>
                                    Registrarse
                                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                        </button>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#48474f]/20"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase tracking-widest">
                            <span className="bg-[#191921] px-4 text-[#acaab4] font-semibold">O registrarte con</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button onClick={() => handleOAuth('google')} type="button" className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#48474f]/20 bg-white/5 hover:bg-white/10 transition-all group">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                            </svg>
                            <span className="text-sm font-semibold text-[#e7e4ee]">Google</span>
                            </button>
                            
                            <button onClick={() => handleOAuth('facebook')} type="button" className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#48474f]/20 bg-white/5 hover:bg-[#1877F2]/20 hover:border-[#1877F2]/40 transition-all group">
                            <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
                            </svg>
                            <span className="text-sm font-semibold text-[#e7e4ee]">Facebook</span>
                            </button>
                        </div>
                    </form>
                    
                    <div className="mt-8 pt-8 border-t border-[#48474f]/10 text-center flex justify-center">
                        <button 
                            type="button" 
                            onClick={() => { setView('login'); setMessage(''); }} 
                            className="text-[#bdbefe] hover:text-[#afb1f0] transition-colors text-sm font-medium inline-flex items-center gap-1 group relative pb-1"
                        >
                            ¿Ya tienes cuenta? Inicia sesión
                            <div className="absolute bottom-0 left-0 h-[1px] w-full bg-[#bdbefe] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                        </button>
                    </div>
                </div>
                
                <div className="mt-10 hidden md:flex flex-col items-center gap-6">
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#25252f]/50 rounded-full border border-[#48474f]/10">
                        <span className="material-symbols-outlined text-sm text-[#f5f2ff]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                        <span className="text-[11px] uppercase tracking-widest font-bold text-[#acaab4]">Protegido mediante Supabase Auth</span>
                    </div>
                    <div className="flex gap-8">
                        <a className="text-[12px] text-[#76747e] hover:text-[#e7e4ee] transition-colors" href="#">Privacidad</a>
                        <a className="text-[12px] text-[#76747e] hover:text-[#e7e4ee] transition-colors" href="#">Términos</a>
                        <a className="text-[12px] text-[#76747e] hover:text-[#e7e4ee] transition-colors" href="#">Soporte</a>
                    </div>
                </div>
            </main>
            
            <div className="hidden lg:block fixed bottom-12 left-12 w-48 opacity-20 pointer-events-none">
                <div className="flex flex-col gap-4">
                    <div className="h-2 w-full bg-[#afb1f0] rounded-full"></div>
                    <div className="h-2 w-3/4 bg-[#afb1f0] rounded-full"></div>
                    <div className="h-2 w-1/2 bg-[#afb1f0] rounded-full"></div>
                </div>
            </div>
            <div className="hidden lg:block fixed top-24 right-12 text-[#76747e]/10 select-none pointer-events-none">
                <span className="font-headline font-black text-[120px] leading-none uppercase"><br/></span>
            </div>
        </div>
      ) : (
        // ==========================================
        // VISTA DE RECUPERAR CONTRASEÑA (Mismo diseño glasscard flotante)
        // ==========================================
        <div className="font-body text-[#e7e4ee] min-h-[100dvh] flex flex-col items-center justify-center p-4 md:p-6 overflow-x-hidden bg-transparent selection:bg-[#bdbefe]/30">
            <header className="fixed top-0 left-0 w-full p-6 md:p-8 flex justify-center pointer-events-none">
                <div className="flex items-center gap-2 opacity-80">
                    <span className="material-symbols-outlined text-[#bdbefe] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                    <span className="font-headline font-extrabold text-2xl tracking-tight text-[#bdbefe]">LinkVentas</span>
                </div>
            </header>
            
            <main className="w-full max-w-md mt-12 md:mt-16 mb-6 md:mb-16 relative flex flex-col justify-center min-h-screen">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#bdbefe]/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#9193ff]/10 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="glass-card rounded-xl p-8 shadow-2xl border border-white/5 relative z-10">
                    <div className="mb-10 text-center">
                        <h1 className="font-headline text-3xl font-extrabold text-[#e7e4ee] tracking-tight mb-3">Recuperar Acceso</h1>
                        <p className="text-[#acaab4] text-sm leading-relaxed">Ingresa tu correo y te enviaremos instrucciones para restaurar tu contraseña.</p>
                    </div>
                    
                    <form className="space-y-6" onSubmit={handleAuth}>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#acaab4] ml-1">Correo Electrónico</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#76747e] group-focus-within:text-[#bdbefe] transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">mail</span>
                                </div>
                                <input 
                                    className="w-full bg-[#25252f] border-none rounded-xl py-3.5 pl-11 pr-4 text-[#e7e4ee] placeholder:text-[#76747e]/50 focus:ring-2 focus:ring-[#bdbefe]/20 transition-all outline-none" 
                                    placeholder="ejemplo@linkventas.com" 
                                    type="email" 
                                    required 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-xl text-sm font-medium ${messageType === 'error' ? 'bg-[#a70138]/20 text-[#d73357]' : 'bg-green-500/10 text-green-400'}`}>
                                {message}
                            </div>
                        )}
                        
                        <button 
                            disabled={loading}
                            className="w-full bg-gradient-to-br from-[#bdbefe] to-[#9a9bd9] text-[#1b1c52] font-headline font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-[#bdbefe]/10 group disabled:opacity-50" 
                            type="submit"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                    <span>Enviando...</span>
                                </>
                            ) : (
                                <>
                                    Recuperar Contraseña
                                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">send</span>
                                </>
                            )}
                        </button>
                    </form>
                    
                    <div className="mt-8 pt-8 border-t border-[#48474f]/10 text-center flex justify-center">
                        <button 
                            type="button" 
                            onClick={() => { setView('login'); setMessage(''); }} 
                            className="text-[#bdbefe] hover:text-[#afb1f0] transition-colors text-sm font-medium inline-flex items-center gap-1 group relative pb-1"
                        >
                            <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            Volver al inicio de sesión
                            <div className="absolute bottom-0 left-0 h-[1px] w-full bg-[#bdbefe] scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                        </button>
                    </div>
                </div>
                
                <div className="mt-10 hidden md:flex flex-col items-center gap-6">
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#25252f]/50 rounded-full border border-[#48474f]/10">
                        <span className="material-symbols-outlined text-sm text-[#f5f2ff]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                        <span className="text-[11px] uppercase tracking-widest font-bold text-[#acaab4]">Protegido mediante Supabase Auth</span>
                    </div>
                    <div className="flex gap-8">
                        <a className="text-[12px] text-[#76747e] hover:text-[#e7e4ee] transition-colors" href="#">Privacidad</a>
                        <a className="text-[12px] text-[#76747e] hover:text-[#e7e4ee] transition-colors" href="#">Términos</a>
                        <a className="text-[12px] text-[#76747e] hover:text-[#e7e4ee] transition-colors" href="#">Soporte</a>
                    </div>
                </div>
            </main>
        </div>
      )}
    </>
  )
}