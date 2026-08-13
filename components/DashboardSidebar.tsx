'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { XIcon as AnimatedX } from '@animateicons/react/lucide'
import { useDashboardStore } from '@/store/useDashboardStore'
import { CircleHelp } from 'lucide-react'
import { useDashboardSession } from '@/components/dashboard/DashboardSessionContext'
import { LinkVentasLogo } from '@/components/brand/LinkVentasLogo'

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  hasBanner?: boolean;
}

const menuItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
  },
  {
    name: 'Órdenes',
    href: '/dashboard/pedidos',
  },
  {
    name: 'Clientes',
    href: '/dashboard/clientes',
  },
  {
    name: 'Productos',
    href: '/dashboard/productos',
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
  },
  {
    name: 'Ajustes Tienda',
    href: '/dashboard/configuracion',
  },
]

export default function DashboardSidebar({ isOpen, onClose, hasBanner }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { userEmail, userId, store } = useDashboardSession()
  const storeLink = store?.slug || store?.id || userId
  const storeName = store?.name || 'Administrador'
  const nameParts = storeName.trim().split(/\s+/)
  const initials = (nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[1][0]}`
    : storeName.substring(0, 2)).toUpperCase() || 'LV'

  const handleLogout = async () => {
    useDashboardStore.getState().limpiarDashboard()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleStartTour = () => {
    onClose?.()
    window.setTimeout(() => window.dispatchEvent(new Event('linkventas:start-product-tour')), 200)
  }

  return (
    <>
      {/* FONDO OSCURO (Solo en móvil cuando está abierto) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* LA BARRA LATERAL */}
      <aside 
        style={{ top: hasBanner ? '45px' : '0', height: hasBanner ? 'calc(100vh - 45px)' : '100vh' }}
        className={`
        fixed left-0 w-56 bg-[var(--dash-sidebar)] font-body antialiased tracking-tight flex flex-col py-6 z-50
        transition-transform duration-300 ease-in-out border-r border-[var(--dash-border)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
      `}>

        <div className="mb-8 flex items-center justify-between px-6">
            <Link href="/dashboard" aria-label="LinkVentas, dashboard" onClick={onClose}>
              <LinkVentasLogo compact className="transition-opacity hover:opacity-70" />
            </Link>
            <button
              onClick={onClose}
              aria-label="Cerrar navegación"
              className="text-[var(--dash-text-muted)] transition-colors duration-300 hover:text-[var(--dash-text-primary)] md:hidden"
            >
              <AnimatedX size={24} duration={0.7} />
            </button>
        </div>

        {/* MENÚ */}
        <nav className="flex-1 space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                data-tour={item.href === '/dashboard/pedidos' ? 'orders' : item.href === '/dashboard/configuracion' ? 'settings' : undefined}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group flex items-center rounded-xl border px-4 py-2.5 transition-all duration-300 ease-out
                  ${isActive 
                    ? 'border-black/10 bg-[#171719] font-semibold text-white shadow-[0_10px_28px_rgba(0,0,0,0.16)] dark:border-white/10'
                    : 'nav-item border-transparent font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white'}
                `}
              >
                <span
                  aria-hidden="true"
                  className={`mr-3 h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.08)]'
                      : 'bg-zinc-300 group-hover:bg-zinc-500 dark:bg-zinc-600 dark:group-hover:bg-zinc-400'
                  }`}
                />
                <span className="text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* FOOTER - USER PROFILE */}
        <div className="px-6 mt-auto">
          <button
            type="button"
            onClick={handleStartTour}
            className="flex w-full items-center py-2.5 text-[var(--dash-text-muted)] transition-all duration-300 ease-out hover:text-[var(--dash-accent)] active:scale-[0.98]"
          >
            <CircleHelp size={16} className="mr-3 w-5 shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">Visita guiada</span>
          </button>
          <Link
            id="tour-public-store"
            href={storeLink ? `/tienda/${storeLink}` : '#'}
            target="_blank"
            className={`text-[var(--dash-text-muted)] hover:text-[var(--dash-accent)] flex items-center py-2.5 transition-colors ${!storeLink && 'opacity-50 pointer-events-none'}`}
          >
            <span className="mr-3 w-5 shrink-0 font-mono text-xs" aria-hidden="true">↗</span>
            <span className="text-sm font-medium">Ver tienda pública</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="w-full text-red-400 dark:text-red-400 hover:text-red-300 dark:hover:text-red-300 flex items-center py-2.5 transition-colors mt-2"
          >
            <span className="mr-3 w-5 shrink-0 font-mono text-xs" aria-hidden="true">→</span>
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>

          {/* User Profile Card */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--dash-border)]">
            <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center text-xs font-bold text-white uppercase">
                {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-[var(--dash-text-primary)] truncate">{storeName}</p>
              <p className="text-[10px] text-[var(--dash-text-muted)] truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
