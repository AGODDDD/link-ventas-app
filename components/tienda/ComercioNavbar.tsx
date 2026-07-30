'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  MenuIcon as AnimatedMenu,
  SearchIcon as AnimatedSearch,
  ShoppingCartIcon as AnimatedCart,
  XIcon as AnimatedClose,
} from '@animateicons/react/lucide'
import { useCartStore } from '@/store/useCartStore'
import SlideOverCart from './SlideOverCart'

type Props = {
  storeId: string
  storeName: string
  avatarUrl?: string | null
}

export default function ComercioNavbar({ storeId, storeName, avatarUrl }: Props) {
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const carts = useCartStore((state) => state.carts)
  const cart = carts[storeId] || []
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0)

  useEffect(() => setMounted(true), [])

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <nav className="mx-auto flex h-16 max-w-[1480px] items-center justify-between rounded-2xl border border-white/10 bg-[#161817]/90 px-4 text-white shadow-[0_12px_45px_rgba(0,0,0,0.18)] backdrop-blur-2xl sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMenuOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95 md:hidden" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}>
              {menuOpen ? <AnimatedClose size={20} duration={0.45} /> : <AnimatedMenu size={20} duration={0.45} />}
            </button>
            <Link href={`/tienda/${storeId}`} className="flex min-w-0 items-center gap-3">
              {avatarUrl ? <span className="relative h-9 w-9 overflow-hidden rounded-xl bg-white/10"><Image src={avatarUrl} alt="" fill className="object-contain p-1" sizes="36px" /></span> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D7FF64] text-xs font-bold text-[#161817]">{storeName.slice(0, 2).toUpperCase()}</span>}
              <span className="truncate text-sm font-semibold tracking-[-0.02em] sm:text-base">{storeName}</span>
            </Link>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <Link href={`/tienda/${storeId}`} className="text-xs font-medium text-white transition-colors hover:text-[#D7FF64]">Inicio</Link>
            <a href="#catalogo" className="text-xs font-medium text-white/60 transition-colors hover:text-white">Productos</a>
            <a href="#servicio" className="text-xs font-medium text-white/60 transition-colors hover:text-white">Cómo compramos</a>
          </div>

          <div className="flex items-center gap-1.5">
            <a href="#catalogo" aria-label="Buscar productos" className="flex h-10 w-10 items-center justify-center rounded-xl text-white/65 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95">
              <AnimatedSearch size={19} duration={0.55} />
            </a>
            <button type="button" onClick={() => setCartOpen(true)} aria-label="Abrir carrito" className="relative flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-[#161817] transition-all duration-300 hover:bg-[#D7FF64] active:scale-95">
              <AnimatedCart size={19} duration={0.55} />
              <span className="hidden text-xs font-semibold sm:inline">Carrito</span>
              {mounted && totalItems > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#161817] px-1 text-[10px] font-bold text-white">{totalItems}</span>}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="mx-auto mt-2 grid max-w-[1480px] gap-1 rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-2xl md:hidden">
            <Link href={`/tienda/${storeId}`} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100">Inicio</Link>
            <a href="#catalogo" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">Productos</a>
            <a href="#servicio" onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">Cómo compramos</a>
          </div>
        )}
      </header>

      <SlideOverCart storeId={storeId} isOpen={cartOpen} onClose={() => setCartOpen(false)} templateType="comercio" />
    </>
  )
}
