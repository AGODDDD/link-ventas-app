'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, ArrowLeft, LogOut, Shield, Trash2 } from 'lucide-react'
import { LinkVentasMark } from '@/components/brand/LinkVentasLogo'

interface AdminSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Eliminación de cuentas', href: '/admin/eliminacion-de-cuentas', icon: Trash2 },
]

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 flex flex-col py-6 z-50
          bg-[#08080d] border-r border-white/[0.06]
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* ─── Cabecera ─────────────────────────────────────────────────── */}
        <div className="px-6 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-lg shadow-blue-500/10">
              <LinkVentasMark className="size-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white uppercase">
                LinkVentas
              </h1>
              <p className="text-[10px] text-red-400 font-semibold tracking-widest uppercase">
                Super Admin
              </p>
            </div>
          </div>

          {/* Botón cerrar — solo móvil */}
          <button
            onClick={onClose}
            className="md:hidden text-zinc-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ─── Navegación ───────────────────────────────────────────────── */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }
                `}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-red-400' : ''}`} />
                {item.name}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-red-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* ─── Footer ───────────────────────────────────────────────────── */}
        <div className="px-3 mt-auto space-y-1">
          {/* Separador */}
          <div className="h-px bg-white/[0.06] mx-3 mb-2" />

          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
          >
            <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
            Panel Merchant
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  )
}
