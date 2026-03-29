'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function StoreNavbarKinetic({ storeName, storeId }: { storeName: string, storeId: string }) {
  const pathname = usePathname()

  const navLinks = [
    { name: 'INICIO', href: `/tienda/${storeId}` },
    { name: 'CATÁLOGO', href: `/tienda/${storeId}/catalogo` },
    { name: 'OFERTAS', href: `/tienda/${storeId}#ofertas` },
    { name: 'CONTACTO', href: '#contacto' },
  ]

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
        <Link 
          href={`/tienda/${storeId}/catalogo`}
          className="bg-primary-container text-on-primary-container px-6 py-2 font-headline font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform duration-200 active:scale-95 text-center flex items-center justify-center cursor-pointer"
        >
          ¡COMPRAR AHORA!
        </Link>
      </div>
    </nav>
  )
}
