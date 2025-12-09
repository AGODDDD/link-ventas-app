'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Settings, LogOut, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react' // 👈 Importamos esto

export default function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null) // 👈 Estado para guardar tu ID

  // 1. Buscamos tu ID apenas carga el menú
  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    obtenerUsuario()
  }, [])

  const menuItems = [
    { name: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Mis Productos', href: '/dashboard/productos', icon: ShoppingBag },
    { name: 'Configurar Tienda', href: '/dashboard/configuracion', icon: Settings },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 border-r border-slate-800 z-50">
      
      {/* LOGO */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-2">
        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">L</div>
        <span className="text-xl font-bold">LinkVentas</span>
      </div>

      {/* MENÚ */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* PIE DE PÁGINA (Con el link arreglado) */}
      <div className="p-4 border-t border-slate-800">
         {/* Botón que ahora sí funciona 👇 */}
         <Link 
            href={userId ? `/tienda/${userId}` : '#'} 
            target="_blank"
            className={`flex items-center gap-3 px-4 py-3 text-emerald-400 hover:bg-slate-800 rounded-lg mb-2 ${!userId && 'opacity-50 cursor-not-allowed'}`}
          >
            <Store size={20} />
            <span>Ver mi Tienda</span>
          </Link>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  )
}