'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { ThemeProvider } from '@/components/dashboard/ThemeProvider'
import { Menu, Shield } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/')
        return
      }

      try {
        const res = await fetch('/api/admin/check', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (!res.ok) {
          router.replace('/')
          return
        }

        const data = await res.json()
        if (!data.isAdmin) {
          router.replace('/')
          return
        }

        setIsAuthorized(true)
      } catch {
        router.replace('/')
      }
    }

    checkAdmin()
  }, [router])

  // ─── Loading / Verificación ──────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-white/[0.06] flex items-center justify-center">
              <Shield className="h-6 w-6 text-red-400" />
            </div>
            <div className="absolute -inset-1 rounded-2xl border-2 border-red-500/30 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">Verificando acceso</p>
            <p className="text-xs text-zinc-600 mt-1">Validación de Super Admin...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className="min-h-screen bg-[#08080d] antialiased text-white">
        {/* Sidebar exclusivo Admin */}
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Barra superior móvil */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-[#08080d]/90 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">
                Super Admin
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-400 hover:text-white transition-colors p-1"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido principal */}
        <main className="md:ml-64 pt-14 md:pt-0 min-h-screen">{children}</main>
      </div>
    </ThemeProvider>
  )
}
