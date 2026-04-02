'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get('code')

      if (code) {
        // PKCE flow: intercambiar el código usando el verificador de localStorage
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          router.push('/dashboard')
          return
        }
        console.error('Error exchanging code:', error.message)
      }

      // Fallback: verificar si ya hay sesión (implicit flow / hash fragment)
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push('/dashboard')
        return
      }

      // Último recurso: escuchar cambios de estado de auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          router.push('/dashboard')
        }
      })

      // Timeout: si en 8 segundos nada funciona, volver al login
      setTimeout(() => {
        router.push('/')
      }, 8000)

      return () => subscription.unsubscribe()
    }

    handleAuth()
  }, [router, searchParams])

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

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#0a0a0f' }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" 
          style={{ borderColor: '#474750', borderTopColor: '#c0c1ff' }} 
        />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
