'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  hasBanner?: boolean;
}

// SVG paths extraídos directamente del diseño Stitch (stitch_animated.html)
const menuItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    svgPaths: [
      'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    ],
  },
  {
    name: 'Órdenes',
    href: '/dashboard/pedidos',
    svgPaths: ['M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'],
  },
  {
    name: 'Clientes (Leads)',
    href: '/dashboard/clientes',
    svgPaths: [
      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    ],
  },
  {
    name: 'Productos',
    href: '/dashboard/productos',
    svgPaths: ['M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'],
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    svgPaths: [
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    ],
  },
  {
    name: 'Ajustes Tienda',
    href: '/dashboard/configuracion',
    // Dos paths: engranaje exterior + círculo interior
    svgPaths: [
      'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    ],
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
          .from('profiles')
          .select('slug, store_name')
          .eq('id', user.id)
          .single()
          
        if (data) {
          setStoreLink(data.slug || user.id)
          if (data.store_name) {
            setStoreName(data.store_name)
            const parts = data.store_name.trim().split(/\s+/)
            const initialsText = parts.length >= 2
              ? (parts[0][0] + parts[1][0]).toUpperCase()
              : data.store_name.substring(0, 2).toUpperCase()
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
        </div>

        {/* MENÚ */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center py-2.5 px-4 group
                  ${isActive 
                    ? 'active-nav text-zinc-900 dark:text-white font-medium' 
                    : 'nav-item font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'}
                `}
              >
                {/* SVG inline exacto del diseño Stitch */}
                <svg className="w-5 h-5 shrink-0 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.svgPaths.map((d, i) => (
                    <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} />
                  ))}
                </svg>
                <span className="text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* FOOTER - USER PROFILE */}
        <div className="px-6 mt-auto">
          {/* Ver Tienda Pública — SVG inline (casa) de Stitch */}
          <Link
            href={storeLink ? `/tienda/${storeLink}` : '#'}
            target="_blank"
            className={`text-[var(--dash-text-muted)] hover:text-[var(--dash-accent)] flex items-center py-2.5 transition-colors ${!storeLink && 'opacity-50 pointer-events-none'}`}
          >
            <svg className="w-5 h-5 shrink-0 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-sm font-medium">Ver Tienda Pública</span>
          </Link>
          
          {/* Cerrar Sesión — SVG inline (logout) de Stitch */}
          <button
            onClick={handleLogout}
            className="w-full text-red-400 dark:text-red-400 hover:text-red-300 dark:hover:text-red-300 flex items-center py-2.5 transition-colors mt-2"
          >
            <svg className="w-5 h-5 shrink-0 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-medium">Cerrar Sesión</span>
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