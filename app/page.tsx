'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Mail, ArrowRight, Shield, Zap, BarChart3, ShoppingBag } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)

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

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleLogin = useCallback(async (e: any) => {
    e.preventDefault()
    if (cooldown > 0) return
    setLoading(true)
    setMessage('')
    
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`
        }
      })

      if (error) {
        setMessage(error.message)
        setIsSuccess(false)
      } else {
        setMessage('Enlace enviado. Revisa tu bandeja de entrada.')
        setIsSuccess(true)
        setCooldown(30)
        setEmail('')
      }
    } catch {
      setMessage('Error de conexión. Espera unos minutos e intenta de nuevo.')
      setIsSuccess(false)
    } finally {
      setLoading(false)
    }
  }, [email, cooldown])

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
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 border border-[#474750]/50" style={{ background: 'linear-gradient(135deg, #1f1f26, #19191f)' }}>
            <Zap className="w-8 h-8" style={{ color: '#c0c1ff' }} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2" style={{ color: '#e6e4ef' }}>
            Link<span style={{ color: '#c0c1ff' }}>Ventas</span>
          </h1>
          <p className="text-sm" style={{ color: '#75747e' }}>
            Plataforma de comercio para emprendedores digitales
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border overflow-hidden" style={{ 
          backgroundColor: 'rgba(25, 25, 31, 0.8)',
          borderColor: '#474750',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(192,193,255,0.05) inset'
        }}>
          
          {!isSuccess ? (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight mb-1" style={{ color: '#e6e4ef' }}>
                  Inicia sesión
                </h2>
                <p className="text-sm" style={{ color: '#abaab5' }}>
                  Te enviaremos un enlace seguro a tu correo.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#abaab5' }}>
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#75747e' }} />
                    <input
                      id="login-email"
                      type="email"
                      placeholder="nombre@tuempresa.com"
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

                {/* Error message */}
                {message && !isSuccess && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm border" style={{ 
                    backgroundColor: 'rgba(236,124,138,0.08)', 
                    borderColor: 'rgba(236,124,138,0.2)',
                    color: '#ec7c8a' 
                  }}>
                    <Shield className="w-4 h-4 shrink-0" />
                    {message}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || cooldown > 0}
                  className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: cooldown > 0 ? '#25252d' : '#c0c1ff',
                    color: cooldown > 0 ? '#75747e' : '#2724b8',
                    boxShadow: cooldown > 0 ? 'none' : '0 10px 30px rgba(192,193,255,0.2)'
                  }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: '#2724b8', borderTopColor: 'transparent' }} />
                      Enviando enlace...
                    </>
                  ) : cooldown > 0 ? (
                    <>Reenviar en {cooldown}s</>
                  ) : (
                    <>
                      Continuar con Email
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Success State */
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: 'rgba(6,183,127,0.1)', border: '1px solid rgba(6,183,127,0.2)' }}>
                <Mail className="w-8 h-8" style={{ color: '#06b77f' }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#e6e4ef' }}>¡Revisa tu correo!</h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: '#abaab5' }}>
                Te hemos enviado un enlace seguro. <br/>
                Haz clic en él para entrar a tu Dashboard.
              </p>
              
              {cooldown > 0 ? (
                <p className="text-xs font-mono" style={{ color: '#75747e' }}>
                  Puedes reenviar en <span style={{ color: '#c0c1ff' }}>{cooldown}s</span>
                </p>
              ) : (
                <button 
                  onClick={() => setIsSuccess(false)} 
                  className="text-sm font-medium transition-colors px-5 py-2.5 rounded-lg border"
                  style={{ borderColor: '#474750', color: '#abaab5' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c0c1ff'; e.currentTarget.style.color = '#e6e4ef' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#474750'; e.currentTarget.style.color = '#abaab5' }}
                >
                  Usar otro correo
                </button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-4 flex items-center justify-center gap-2 border-t" style={{ borderColor: '#474750', backgroundColor: 'rgba(14,14,17,0.5)' }}>
            <Shield className="w-3 h-3" style={{ color: '#75747e' }} />
            <p className="text-xs" style={{ color: '#75747e' }}>
              Login seguro sin contraseñas · Verificación por email
            </p>
          </div>
        </div>

        {/* Features pills */}
        <div className="flex items-center justify-center gap-3 flex-wrap mt-8">
          {[
            { icon: ShoppingBag, label: 'Tienda Online' },
            { icon: BarChart3, label: 'Analytics' },
            { icon: Zap, label: 'Tiempo Real' },
          ].map((feat) => (
            <div key={feat.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs" style={{ borderColor: '#474750', color: '#75747e' }}>
              <feat.icon className="w-3 h-3" />
              {feat.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}