'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Importamos los componentes de diseño "Apple Style"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  // El Guardián de sesión (Igual que antes)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') router.push('/dashboard')
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogin = async (e: any) => {
    e.preventDefault()
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
        setMessage('¡Enlace enviado! Revisa tu bandeja de entrada.')
        setIsSuccess(true)
        setEmail('')
      }
    } catch (err: any) {
      setMessage('Error de conexión. Espera unos minutos e intenta de nuevo.')
      setIsSuccess(false)
    } finally {
      setLoading(false)
    }
  }


  return (
    // Fondo gris muy suave (Slate-50) para dar sensación de limpieza
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      
      {/* Tarjeta con sombra suave y bordes redondeados */}
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <span className="text-4xl">🚀</span>
          </div>
          <CardTitle className="text-2xl font-bold text-center tracking-tight">
            Link Ventas
          </CardTitle>
          <CardDescription className="text-center text-slate-500">
            Gestiona tu negocio de Instagram/TikTok en un solo lugar.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isSuccess ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@tuempresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white" // Input blanco puro
                />
              </div>
              
              {/* Botón negro sólido (estilo Vercel/Apple) */}
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium" disabled={loading}>
                {loading ? 'Enviando enlace...' : '✨ Iniciar con Email'}
              </Button>
            </form>
          ) : (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl">
                📩
              </div>
              <h3 className="text-lg font-medium">¡Revisa tu correo!</h3>
              <p className="text-sm text-slate-500 px-4">
                Te hemos enviado un enlace mágico para entrar. Ya puedes cerrar esta pestaña si deseas.
              </p>
              <Button variant="outline" onClick={() => setIsSuccess(false)} className="mt-4">
                Intentar con otro correo
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-center border-t border-slate-100 mt-4 pt-4">
          <p className="text-xs text-slate-400">
            Sistema seguro sin contraseñas.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}