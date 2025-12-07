'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Esta función intenta intercambiar el código que viene en la URL por una sesión real
    const handleAuth = async () => {
      // Intentamos obtener la sesión. Supabase buscará automáticamente en la URL
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error al obtener sesión:', error.message)
        // Si falla, volvemos al login
        router.push('/')
      } else if (data.session) {
        console.log('Sesión encontrada, redirigiendo al dashboard...')
        router.push('/dashboard')
      } else {
        // A veces hay un hash en la URL (#) que supabase-js procesa
        // Escuchamos cambios de estado por si acaso
        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            router.push('/dashboard')
          }
        })
      }
    }

    handleAuth()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white flex-col gap-4">
      <div className="text-4xl animate-spin">⏳</div>
      <p className="text-xl font-bold">Validando tu acceso...</p>
      <p className="text-sm text-gray-400">No cierres esta ventana.</p>
    </div>
  )
}