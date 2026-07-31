'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { XIcon as AnimatedX } from '@animateicons/react/lucide'

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
  const [storeLink, setStoreLink] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [storeName, setStoreName] = useState<string>('Administrador')
  const [initials, setInitials] = useState<string>('LV')

  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
        
        const { data } = await supabase
          .from('stores')
          .select('slug, name')
          .eq('owner_id', user.id)
          .single()
          
        if (data) {
          setStoreLink(data.slug || user.id)
          if (data.name) {
            setStoreName(data.name)
            const parts = data.name.trim().split(/\s+/)
            const initialsText = parts.length >= 2
              ? (parts[0][0] + parts[1][0]).toUpperCase()
              : data.name.substring(0, 2).toUpperCase()
            setInitials(initialsText || 'LV')
          }
        }
      }
    }
    obtenerUsuario()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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

        {/* CABECERA CON LOGO */}
        <div className="px-6 mb-10 flex justify-between items-center">
            <div>
                {/* tracking-tight + uppercase tal como en Stitch */}
                <h1 className="text-xl font-bold tracking-tight text-[var(--dash-text-primary)] uppercase">LINKVENTAS</h1>
                {/* font-medium + tracking-widest tal como en Stitch */}
                <p className="text-[10px] text-[var(--dash-text-muted)] font-medium tracking-widest uppercase mt-1">Panel de Control</p>
            </div>
            {/* Botón X solo visible en móvil — SVG inline (consistencia con Stitch) */}
            <button onClick={onClose} className="md:hidden text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
              <AnimatedX size={24} duration={0.7} />
            </button>
        </div>

        {/* MENÚ */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  flex items-center py-2.5 px-4 group
                  ${isActive 
                    ? 'active-nav text-zinc-900 dark:text-white font-medium' 
                    : 'nav-item font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}
                `}
              >
                <span className="mr-3 w-5 shrink-0 font-mono text-[10px] font-semibold tracking-wider opacity-60">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* FOOTER - USER PROFILE */}
        <div className="px-6 mt-auto">
          <Link
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
