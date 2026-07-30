'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import {
  ChevronDownIcon as AnimatedChevronDown,
  MailIcon as AnimatedMail,
  MenuIcon as AnimatedMenu,
  PhoneCallIcon as AnimatedPhone,
  SearchIcon as AnimatedSearch,
  ShieldCheckIcon as AnimatedShield,
  ShoppingCartIcon as AnimatedCart,
  XIcon as AnimatedClose,
} from '@animateicons/react/lucide'
import { useCartStore } from '@/store/useCartStore'
import SlideOverCart from './SlideOverCart'

type Props = {
  storeId: string
  storeName: string
  avatarUrl?: string | null
  whatsappPhone?: string | null
  categories?: string[]
}

export default function ComercioNavbar({ storeId, storeName, avatarUrl, whatsappPhone, categories = [] }: Props) {
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const carts = useCartStore((state) => state.carts)
  const cart = carts[storeId] || []
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0)

  useEffect(() => setMounted(true), [])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('commerce-search', { detail: query }))
    window.location.hash = 'catalogo'
  }

  return (
    <>
      <header className="relative z-50 border-b border-zinc-200 bg-white text-[#182331]">
        <div className="hidden bg-[#182331] text-white lg:block">
          <div className="mx-auto flex h-8 max-w-[1480px] items-center justify-between px-6 text-[10px]">
            <div className="flex items-center gap-5 text-white/70">
              {whatsappPhone && <a href={`https://wa.me/${whatsappPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-[#66D8BB]"><AnimatedPhone size={12} duration={0.45} />Atención al cliente: {whatsappPhone}</a>}
              <span className="flex items-center gap-1.5"><AnimatedShield size={12} duration={0.45} />Compra protegida</span>
            </div>
            <div className="flex items-center gap-5 text-white/60"><span className="flex items-center gap-1.5"><AnimatedMail size={12} duration={0.45} />Pedidos y soporte online</span><Link href={`/tienda/${storeId}/checkout`} className="font-semibold text-white transition-colors hover:text-[#66D8BB]">Finalizar compra</Link></div>
          </div>
        </div>

        <div className="mx-auto flex min-h-20 max-w-[1480px] items-center gap-4 px-4 py-3 sm:px-6 lg:gap-8 lg:py-4">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 transition-all hover:border-zinc-300 hover:text-zinc-900 active:scale-95 lg:hidden">{menuOpen ? <AnimatedClose size={20} duration={0.4} /> : <AnimatedMenu size={20} duration={0.4} />}</button>

          <Link href={`/tienda/${storeId}`} className="flex min-w-0 shrink-0 items-center gap-3 lg:w-64">
            {avatarUrl ? <span className="relative h-12 w-16 overflow-hidden"><Image src={avatarUrl} alt={storeName} fill className="object-contain" sizes="64px" /></span> : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#182331] text-xs font-black text-[#66D8BB]">{storeName.slice(0, 2).toUpperCase()}</span>}
            <span className="min-w-0"><strong className="block truncate text-base font-black uppercase tracking-[-0.035em] lg:text-lg">{storeName}</strong><span className="hidden text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400 sm:block">Tu tienda especializada</span></span>
          </Link>

          <form onSubmit={submitSearch} className="hidden h-12 min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-[#f7f8f8] transition-all focus-within:border-[#66D8BB] focus-within:bg-white lg:flex">
            <label className="flex items-center gap-2 border-r border-zinc-200 px-4 text-[11px] font-semibold text-zinc-500">Categorías <AnimatedChevronDown size={13} duration={0.4} /></label>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en toda la tienda..." className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-zinc-400" />
            <button type="submit" className="flex w-28 items-center justify-center gap-2 bg-[#66D8BB] text-xs font-bold text-[#182331] transition-colors hover:bg-[#7ce2c7]"><AnimatedSearch size={17} duration={0.45} />Buscar</button>
          </form>

          <button type="button" onClick={() => setCartOpen(true)} aria-label="Abrir carrito" className="relative ml-auto flex h-12 shrink-0 items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3.5 transition-all hover:border-[#66D8BB] hover:shadow-[0_8px_24px_rgba(24,35,49,0.08)] active:scale-95">
            <AnimatedCart size={23} duration={0.5} />
            <span className="hidden text-left sm:block"><span className="block text-[10px] text-zinc-400">{mounted ? totalItems : 0} productos</span><strong className="block text-xs">Tu carrito</strong></span>
            {mounted && totalItems > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#66D8BB] px-1 text-[9px] font-black text-[#182331]">{totalItems}</span>}
          </button>
        </div>

        <div className="border-t border-white/10 bg-[#182331] text-white">
          <nav className="mx-auto flex h-11 max-w-[1480px] items-center overflow-x-auto px-4 [scrollbar-width:none] sm:px-6">
            <a href="#catalogo" className="flex h-full shrink-0 items-center gap-2 border-r border-white/10 pr-6 text-[10px] font-bold uppercase tracking-[0.08em] text-[#66D8BB]"><AnimatedMenu size={16} duration={0.45} />Por categoría</a>
            <div className="flex h-full items-center">
              {categories.slice(0, 5).map((category) => <a key={category} href="#catalogo" onClick={() => window.dispatchEvent(new CustomEvent('commerce-category', { detail: category }))} className="flex h-full shrink-0 items-center px-5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white/70 transition-colors hover:bg-white/5 hover:text-white">{category}</a>)}
              <a href="#ofertas" className="flex h-full shrink-0 items-center px-5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#D9F15E]">Ofertas</a>
              <a href="#pagos" className="flex h-full shrink-0 items-center px-5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white/70 transition-colors hover:text-white">Formas de pago</a>
            </div>
          </nav>
        </div>

        {menuOpen && <div className="border-t border-zinc-200 bg-white p-4 shadow-xl lg:hidden"><form onSubmit={submitSearch} className="flex h-12 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos..." className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none" /><button type="submit" className="flex w-12 items-center justify-center bg-[#66D8BB] text-[#182331]"><AnimatedSearch size={18} /></button></form><div className="mt-3 grid grid-cols-2 gap-2">{categories.slice(0, 8).map((category) => <a key={category} href="#catalogo" onClick={() => { window.dispatchEvent(new CustomEvent('commerce-category', { detail: category })); setMenuOpen(false) }} className="rounded-lg border border-zinc-200 px-3 py-3 text-xs font-semibold text-zinc-600">{category}</a>)}</div></div>}
      </header>

      <SlideOverCart storeId={storeId} isOpen={cartOpen} onClose={() => setCartOpen(false)} templateType="comercio" />
    </>
  )
}
