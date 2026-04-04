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
}

export default function DashboardSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [storeLink, setStoreLink] = useState<string | null>(null)

  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data } = await supabase.from('profiles').select('slug').eq('id', user.id).single()
        setStoreLink(data?.slug || user.id)
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
      <aside className={`
        fixed top-0 left-0 h-screen w-64 bg-surface-container-low font-body antialiased tracking-tight flex flex-col py-6 z-50
        transition-transform duration-300 ease-in-out border-r border-outline-variant/10
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 
      `}>

        {/* CABECERA CON LOGO */}
        <div className="px-6 mb-10 flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold text-on-surface tracking-wider uppercase">LinkVentas</h1>
                <p className="text-[10px] text-on-surface-variant tracking-[0.2em] uppercase mt-1">Panel de Control</p>
            </div>
            {/* Botón X solo visible en móvil */}
            <button onClick={onClose} className="md:hidden text-on-surface-variant hover:text-on-surface">
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
                    ? 'text-primary font-semibold relative bg-primary-container/10 before:absolute before:left-0 before:w-1 before:h-6 before:bg-primary before:rounded-r-full' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}
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
            className={`text-on-surface-variant hover:text-primary flex items-center gap-3 py-3 transition-colors ${!storeLink && 'opacity-50 pointer-events-none'}`}
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

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-outline-variant/10">
            <div className="w-8 h-8 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                LV
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-on-surface truncate">Administrador</p>
              <p className="text-[10px] text-on-surface-variant truncate">premium@ventas.com</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}