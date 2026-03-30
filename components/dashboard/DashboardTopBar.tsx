'use client'
import { Search, Bell, PlusCircle, UserCircle } from 'lucide-react'

export default function DashboardTopBar() {
  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-16 z-40 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-4 md:px-8 shadow-[0_20px_40px_rgba(0,0,0,0.4)] border-b border-white/5">
      <div className="flex items-center gap-4 bg-surface-container-high px-4 py-2 rounded-lg w-full max-w-sm ml-12 md:ml-0">
        <Search className="text-on-surface-variant w-5 h-5" />
        <input 
          className="bg-transparent border-none text-sm focus:ring-0 placeholder:text-on-surface-variant/50 w-full text-on-surface outline-none" 
          placeholder="Buscar pedidos, clientes..." 
          type="text"
        />
      </div>
      <div className="flex items-center gap-4 md:gap-6 ml-4">
        <div className="relative cursor-pointer hover:text-primary transition-colors text-on-surface">
          <Bell className="w-6 h-6" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
        </div>
        <PlusCircle className="cursor-pointer hover:text-primary transition-colors text-on-surface w-6 h-6 hidden sm:block" />
        <UserCircle className="cursor-pointer hover:text-primary transition-colors text-on-surface w-8 h-8" />
      </div>
    </header>
  )
}
