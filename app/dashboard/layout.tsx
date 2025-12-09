'use client' // Necesario para usar estados (abrir/cerrar)

import DashboardSidebar from '@/components/DashboardSidebar'
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* 1. BARRA SUPERIOR MÓVIL (Solo visible en celular) */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">L</div>
          <span className="font-bold text-lg">LinkVentas</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="text-white hover:bg-slate-800">
          <Menu size={24} />
        </Button>
      </div>

      {/* 2. EL MENÚ LATERAL (Controlado por estado) */}
      <DashboardSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* 3. EL CONTENIDO PRINCIPAL */}
      {/* En desktop tiene margen izquierdo (ml-64), en móvil no (ml-0) */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}