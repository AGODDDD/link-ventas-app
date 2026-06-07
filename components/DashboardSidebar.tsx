'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  hasBanner?: boolean;
}

export default function DashboardSidebar({ isOpen, onClose, hasBanner }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [storeLink, setStoreLink] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [storeName, setStoreName] = useState<string>('Administrador')
  const [initials, setInitials] = useState<string>('LV')

  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
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

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { name: 'Órdenes', href: '/dashboard/pedidos', icon: 'payments' },
    { name: 'Clientes (Leads)', href: '/dashboard/clientes', icon: 'group' },
    { name: 'Productos', href: '/dashboard/productos', icon: 'inventory_2' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: 'analytics' },
    { name: 'Ajustes Tienda', href: '/dashboard/configuracion', icon: 'settings' },
  ]

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
        fixed left-0 w-64 bg-[var(--dash-sidebar)] font-body antialiased tracking-tight flex flex-col py-6 z-50
        transition-transform duration-300 ease-in-out border-r border-[var(--dash-border)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
      `}>

        {/* CABECERA CON LOGO */}
        <div className="px-6 mb-10 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold text-[var(--dash-text-primary)] tracking-wider uppercase">LinkVentas</h1>
                <p className="text-[10px] text-[var(--dash-text-muted)] tracking-[0.2em] uppercase mt-1">Panel de Control</p>
            </div>
            {/* Botón X solo visible en móvil */}
            <button onClick={onClose} className="md:hidden text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)]">
              <X size={24} />
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
                  flex items-center gap-3 py-3 px-6 transition-colors group
                  ${isActive 
                    ? 'text-[var(--dash-accent)] font-semibold relative bg-[var(--dash-accent)]/10 before:absolute before:left-0 before:w-1 before:h-6 before:bg-[var(--dash-accent)] before:rounded-r-full' 
                    : 'text-[var(--dash-text-muted)] hover:text-[var(--dash-text-primary)] hover:bg-[var(--dash-surface-2)]'}
                `}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
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
            className={`text-[var(--dash-text-muted)] hover:text-[var(--dash-accent)] flex items-center gap-3 py-3 transition-colors ${!storeLink && 'opacity-50 pointer-events-none'}`}
          >
            <span className="material-symbols-outlined text-[20px]">storefront</span>
            <span className="text-sm font-medium">Ver Tienda Pública</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="w-full text-error/80 hover:text-error flex items-center gap-3 py-3 transition-colors mt-2"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[var(--dash-border)]">
            <div className="w-8 h-8 rounded-full border border-[var(--dash-accent)]/20 bg-[var(--dash-accent)]/10 flex items-center justify-center text-[var(--dash-accent)] font-bold text-xs uppercase">
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