'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import SlideOverCart from './SlideOverCart'

export default function StoreNavbarKinetic({ storeName, storeId }: { storeName: string, storeId: string }) {
  const pathname = usePathname()

  const navLinks = [
    { name: 'INICIO', href: `/tienda/${storeId}` },
    { name: 'CATÁLOGO', href: `/tienda/${storeId}/catalogo` },
    { name: 'OFERTAS', href: `/tienda/${storeId}#ofertas` },
    { name: 'CONTACTO', href: '#contacto' },
  ]

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const cartStore = useCartStore()
  const cart = cartStore.carts[storeId] || []
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md shadow-[0_60px_60px_rgba(255,59,48,0.06)]">
      <div className="flex justify-between items-center px-8 py-4 max-w-full">
        <Link href={`/tienda/${storeId}`} className="text-2xl font-black italic text-primary tracking-widest font-headline uppercase truncate max-w-[200px] md:max-w-none">
          {storeName}
        </Link>
        <div className="hidden md:flex gap-8 items-center">
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
      <SlideOverCart storeId={storeId} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </nav>
  )
}
