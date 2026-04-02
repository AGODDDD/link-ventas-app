'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Mail, Key, ArrowRight, Shield, Zap, BarChart3, ShoppingBag } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'error' | 'success'>('error')

  // Guardián de sesión
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

  const handleAuth = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      if (isLogin) {
        // Flujo de Iniciar Sesión Tradicional
        const { error } = await supabase.auth.signInWithPassword({ 
          email,
          password
        })

        if (error) {
          throw error
        }
        
      } else {
        // Flujo de Crear Cuenta
        const { error } = await supabase.auth.signUp({
          email,
          password
        })

        if (error) {
          throw error
        } else {
          setMessageType('success')
          setMessage('¡Cuenta creada correctamente! Si tienes el Confirm Email activo en tu panel de Supabase tal vez requieras confirmar tu bandeja. Si no, haz login ya mismo.')
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      
      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-[120px]" style={{ background: 'linear-gradient(135deg, #c0c1ff, #494bd7)' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15 blur-[120px]" style={{ background: 'linear-gradient(135deg, #06b77f, #00452d)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5 blur-[100px]" style={{ background: '#c0c1ff' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(192,193,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(192,193,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        
        {/* Logo & Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 border border-[#474750]/50" style={{ background: 'linear-gradient(135deg, #1f1f26, #19191f)' }}>
            <Zap className="w-8 h-8" style={{ color: '#c0c1ff' }} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2" style={{ color: '#e6e4ef' }}>
            Link<span style={{ color: '#c0c1ff' }}>Ventas</span>
          </h1>
          <p className="text-sm" style={{ color: '#75747e' }}>
            Plataforma de comercio para emprendedores
          </p>
        </div>

        {/* Auth Toggle Tabs */}
        <div className="flex bg-[#131317] p-1 rounded-xl mb-4 border border-[#474750]/50 shadow-inner">
           <button 
             onClick={() => { setIsLogin(true); setMessage('') }}
             className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-[#c0c1ff] text-[#2724b8] shadow-md' : 'text-[#abaab5] hover:text-[#e6e4ef]'}`}
           >
             Entrar
           </button>
           <button 
             onClick={() => { setIsLogin(false); setMessage('') }}
             className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-[#c0c1ff] text-[#2724b8] shadow-md' : 'text-[#abaab5] hover:text-[#e6e4ef]'}`}
           >
             Nueva Cuenta
           </button>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border overflow-hidden transition-all duration-500" style={{ 
          backgroundColor: 'rgba(25, 25, 31, 0.8)',
          borderColor: '#474750',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(192,193,255,0.05) inset'
        }}>
          
          <div className="p-8 pb-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight mb-1" style={{ color: '#e6e4ef' }}>
                {isLogin ? 'Bienvenido de vuelta' : 'Crea tu espacio de trabajo'}
              </h2>
              <p className="text-sm" style={{ color: '#abaab5' }}>
                {isLogin ? 'Introduce tus credenciales para acceder.' : 'Usa un email y una contraseña segura.'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#abaab5' }}>
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#75747e' }} />
                  <input
                    type="email"
                    placeholder="tucorreo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all border focus:ring-2 focus:ring-offset-0"
                    style={{ 
                      backgroundColor: '#0e0e11',
                      borderColor: '#474750',
                      color: '#e6e4ef',
                      // @ts-ignore
                      '--tw-ring-color': 'rgba(192,193,255,0.3)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#c0c1ff'}
                    onBlur={(e) => e.target.style.borderColor = '#474750'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#abaab5' }}>
                  Contraseña
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#75747e' }} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all border focus:ring-2 focus:ring-offset-0"
                    style={{ 
                      backgroundColor: '#0e0e11',
                      borderColor: '#474750',
                      color: '#e6e4ef',
                      // @ts-ignore
                      '--tw-ring-color': 'rgba(192,193,255,0.3)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#c0c1ff'}
                    onBlur={(e) => e.target.style.borderColor = '#474750'}
                  />
                </div>
              </div>

              {/* Status messages */}
              {message && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm border" style={{ 
                  backgroundColor: messageType === 'error' ? 'rgba(236,124,138,0.08)' : 'rgba(6,183,127,0.08)', 
                  borderColor: messageType === 'error' ? 'rgba(236,124,138,0.2)' : 'rgba(6,183,127,0.2)',
                  color: messageType === 'error' ? '#ec7c8a' : '#06b77f'
                }}>
                  <Shield className="w-4 h-4 shrink-0" />
                  <span className="leading-snug">{message}</span>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                style={{ 
                  backgroundColor: '#c0c1ff',
                  color: '#2724b8',
                  boxShadow: '0 10px 30px rgba(192,193,255,0.2)'
                }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: '#2724b8', borderTopColor: 'transparent' }} />
                    {isLogin ? 'Ingresando...' : 'Creando...'}
                  </>
                ) : (
                  <>
                    {isLogin ? 'Acceder al Sistema' : 'Crear Cuenta'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 flex items-center justify-center gap-2 border-t" style={{ borderColor: '#474750', backgroundColor: 'rgba(14,14,17,0.5)' }}>
            <Shield className="w-3 h-3" style={{ color: '#75747e' }} />
            <p className="text-xs" style={{ color: '#75747e' }}>
              Protegido mediante Supabase Auth
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}