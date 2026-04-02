'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Con el flujo implicit, Supabase inyecta los tokens en el hash de la URL (#access_token=...)
    // El cliente de Supabase los detecta automáticamente al llamar getSession() o onAuthStateChange()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        router.replace('/dashboard')
      }
      if (event === 'INITIAL_SESSION' && session) {
        router.replace('/dashboard')
      }
    })

    // Safety check: si después de un momento hay sesión pero no se disparó el evento
    const checkSession = async () => {
      // Esperar un poco para que Supabase procese el hash
      await new Promise(resolve => setTimeout(resolve, 1000))
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace('/dashboard')
      }
    }
    checkSession()

    // Timeout de seguridad: si en 10 segundos no hay sesión, volver al login
    const timeout = setTimeout(() => {
      router.replace('/')
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto" 
          style={{ borderColor: '#474750', borderTopColor: '#c0c1ff' }} 
        />
        <p className="text-lg font-bold" style={{ color: '#e6e4ef' }}>
          Validando tu acceso...
        </p>
        <p className="text-sm" style={{ color: '#75747e' }}>
          No cierres esta ventana.
        </p>
      </div>
    </div>
  )
}
