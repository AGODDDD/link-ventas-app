'use client'

import DashboardSidebar from '@/components/DashboardSidebar'
import DashboardTopBar from '@/components/dashboard/DashboardTopBar'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="dashboard-theme antialiased font-body selection:bg-primary/30 min-h-screen bg-surface flex flex-col text-on-surface">
      
      {/* 1. BARRA SUPERIOR MÓVIL (Solo visible en celular para abrir el menú) */}
      <div className="md:hidden bg-surface-container-low text-on-surface p-4 flex items-center justify-between sticky top-0 z-30 shadow-md border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center font-bold text-primary">LV</div>
          <span className="font-bold text-lg tracking-widest uppercase">LinkVentas</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="text-on-surface hover:bg-surface-container">
          <Menu size={24} />
        </Button>
      </div>

      {/* 2. EL MENÚ LATERAL (Controlado por estado en móvil) */}
      <DashboardSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* 3. TOP BAR (Solo Desktop o flotante) */}
      <div className="hidden md:block">
         <DashboardTopBar />
      </div>

      {/* 4. EL CONTENIDO PRINCIPAL */}
      {/* En desktop tiene margen izquierdo (ml-64) y padding superior (pt-24) por el TopBar extra. */}
      <main className="flex-1 md:ml-64 md:pt-24 pt-4 px-4 md:px-8 pb-12 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}