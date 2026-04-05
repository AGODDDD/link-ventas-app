'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import SlideOverCart from './SlideOverCart'

export default function StoreNavbarKinetic({ storeName, storeId, avatarUrl }: { storeName: string, storeId: string, avatarUrl?: string | null }) {
  const pathname = usePathname()

  const navLinks = [
    { name: 'INICIO', href: `/tienda/${storeId}` },
    { name: 'CATÁLOGO', href: `/tienda/${storeId}/catalogo` },
    { name: 'OFERTAS', href: `/tienda/${storeId}#ofertas` },
    { name: 'CONTACTO', href: '#contacto' },
  ]

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const cartStore = useCartStore()
  const cart = cartStore.carts[storeId] || []
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md shadow-[0_60px_60px_rgba(255,59,48,0.06)]">
      <div className="flex justify-between items-center px-4 md:px-8 py-4 max-w-full">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button 
            className="md:hidden text-on-background p-1 -ml-1 hover:text-primary transition-colors focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <Link href={`/tienda/${storeId}`} className="text-xl md:text-2xl font-black italic text-primary tracking-widest font-headline uppercase truncate flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt={storeName} className="h-8 w-8 object-contain" />
            ) : null}
            <span className={avatarUrl ? "hidden sm:inline" : ""}>{storeName}</span>
          </Link>
        </div>

        <div className="hidden md:flex gap-8 items-center justify-center flex-1">
          {navLinks.map((link) => {
            // For hash links, we just don't highlight them as 'active page' 
            // unless we want to do scroll spying, but simple path matching is what's requested.
            const isActive = pathname === link.href.split('#')[0] && !link.href.includes('#')

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`font-headline font-bold uppercase tracking-tighter transition-all duration-200 hover:scale-105 active:scale-95 ${
                  isActive 
                    ? 'text-primary border-b-2 border-primary pb-1' 
                    : 'text-on-background hover:text-primary'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href={`/tienda/${storeId}/catalogo`}
            className="hidden sm:flex bg-primary-container text-on-primary-container px-6 py-2 font-headline font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform duration-200 active:scale-95 text-center items-center justify-center cursor-pointer"
          >
            ¡COMPRAR AHORA!
          </Link>
          
          <button
            onClick={() => setIsCartOpen(true)}
            aria-label="Ver carrito de compras"
            className="relative p-2 bg-surface-variant text-on-background hover:text-primary transition-colors duration-200 border border-outline hover:border-primary active:scale-95 flex items-center justify-center"
          >
            <ShoppingBag size={20} />
            {mounted && totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-on-primary text-[10px] font-black font-headline w-5 h-5 flex items-center justify-center border border-background">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-background/95 backdrop-blur-xl border-b border-t border-outline p-6 flex flex-col gap-4 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          {navLinks.map((link) => {
            const isActive = pathname === link.href.split('#')[0] && !link.href.includes('#')
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`font-headline font-black uppercase tracking-widest text-lg p-2 transition-colors ${isActive ? 'text-primary' : 'text-on-background hover:text-primary'}`}
              >
                {link.name}
              </Link>
            )
          })}
          <Link 
            href={`/tienda/${storeId}/catalogo`}
            onClick={() => setIsMobileMenuOpen(false)}
            className="bg-primary hover:bg-primary/80 transition-colors text-on-primary px-6 py-4 font-headline font-black text-xl uppercase tracking-widest text-center mt-4 italic"
          >
            ¡COMPRAR AHORA!
          </Link>
        </div>
      )}
    </nav>
    
    <SlideOverCart storeId={storeId} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}
