'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckIcon as AnimatedCheck,
  ChevronLeftIcon as AnimatedChevronLeft,
  ChevronRightIcon as AnimatedChevronRight,
  EyeIcon as AnimatedEye,
  MinusIcon as AnimatedMinus,
  PackageOpenIcon as AnimatedPackage,
  PlusIcon as AnimatedPlus,
  SearchIcon as AnimatedSearch,
  ShoppingCartIcon as AnimatedCart,
  XIcon as AnimatedClose,
} from '@animateicons/react/lucide'
import { toast } from 'sonner'
import { useCartStore } from '@/store/useCartStore'
import { Product, Profile } from '@/types/tienda'
import ComercioQuickView from './ComercioQuickView'

interface Props { productos: Product[]; perfil: Profile | null; isReadOnly?: boolean }
type ProductTab = 'new' | 'best'
const money = (value: number) => `S/ ${value.toFixed(2)}`

export default function ProductGrid({ productos, perfil, isReadOnly = false }: Props) {
  const storeId = perfil?.id || ''
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [tab, setTab] = useState<ProductTab>('new')
  const [carouselPaused, setCarouselPaused] = useState(false)
  const [quickView, setQuickView] = useState<Product | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const carts = useCartStore((state) => state.carts)
  const cart = carts[storeId] || []
  const addToCart = useCartStore((state) => state.addToCart)
  const updateQuantity = useCartStore((state) => state.updateQuantity)

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(productos.map((product) => product.category).filter(Boolean) as string[]))], [productos])

  useEffect(() => {
    const search = (event: Event) => { setQuery((event as CustomEvent<string>).detail || '') }
    const chooseCategory = (event: Event) => { setCategory((event as CustomEvent<string>).detail || 'Todos') }
    window.addEventListener('commerce-search', search)
    window.addEventListener('commerce-category', chooseCategory)
    return () => { window.removeEventListener('commerce-search', search); window.removeEventListener('commerce-category', chooseCategory) }
  }, [])

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es')
    return productos.filter((product) => {
      const text = `${product.name} ${product.brand || ''} ${product.description || ''}`.toLocaleLowerCase('es')
      return (category === 'Todos' || product.category === category) && (!term || text.includes(term))
    }).sort((a, b) => tab === 'best' ? ((b.reviews_count || 0) - (a.reviews_count || 0)) || ((b.rating || 0) - (a.rating || 0)) : new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  }, [category, productos, query, tab])

  const moveCarousel = (direction: number) => {
    const carousel = carouselRef.current
    if (!carousel) return
    const distance = Math.max(240, carousel.clientWidth * 0.82) * direction
    carousel.scrollBy({ left: distance, behavior: 'smooth' })
  }

  useEffect(() => {
    carouselRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
  }, [category, query, tab])

  useEffect(() => {
    if (carouselPaused || visible.length < 3) return
    const timer = window.setInterval(() => {
      const carousel = carouselRef.current
      if (!carousel) return
      const atEnd = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 12
      carousel.scrollTo({ left: atEnd ? 0 : carousel.scrollLeft + Math.max(240, carousel.clientWidth * 0.68), behavior: 'smooth' })
    }, 4300)
    return () => window.clearInterval(timer)
  }, [carouselPaused, visible.length])

  const cartLine = (productId: string) => cart.find((item) => item.product.id === productId && !item.variantDetails)
  const add = (product: Product) => {
    const current = cartLine(product.id)?.quantity || 0
    if (isReadOnly || (product.stock != null && product.stock <= 0)) return
    if (product.stock != null && current >= product.stock) { toast.error(`Solo hay ${product.stock} unidades disponibles.`); return }
    addToCart(storeId, product)
    toast.success(`${product.name} agregado al carrito`)
  }

  return (
    <>
    <section id="catalogo" className="scroll-mt-16 py-12 lg:py-16">
      <div className="mx-auto max-w-[1480px] px-4 sm:px-6">
        <div className="flex flex-col gap-5 border-b border-zinc-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#2A987B]">Catálogo actualizado</p><div className="mt-2 flex items-end gap-5"><button type="button" onClick={() => setTab('new')} className={`text-2xl font-black tracking-[-0.045em] transition-colors sm:text-3xl ${tab === 'new' ? 'text-[#131A22]' : 'text-zinc-300'}`}>Nuevos productos</button><button type="button" onClick={() => setTab('best')} className={`pb-1 text-sm font-bold transition-colors ${tab === 'best' ? 'text-[#131A22]' : 'text-zinc-400'}`}>Más vendidos</button></div></div>
          <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-black/[0.08] bg-white px-3.5 transition-all duration-300 focus-within:border-[#78DDBC] focus-within:shadow-[0_10px_30px_rgba(19,26,34,0.06)] lg:w-80"><AnimatedSearch size={16} duration={0.45} className="text-zinc-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-zinc-400" />{query && <button type="button" onClick={() => setQuery('')}><AnimatedClose size={14} className="text-zinc-400" /></button>}</label>
        </div>

        <div className="flex gap-2 overflow-x-auto py-5 [scrollbar-width:none]">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-[9px] font-bold uppercase tracking-[0.07em] transition-all duration-300 active:scale-95 ${category === item ? 'border-[#131A22] bg-[#131A22] text-white' : 'border-black/[0.08] bg-white text-zinc-500 hover:border-[#78DDBC] hover:text-[#131A22]'}`}>{item}</button>)}</div>

        {visible.length ? <div className="group/carousel relative" onMouseEnter={() => setCarouselPaused(true)} onMouseLeave={() => setCarouselPaused(false)}><div ref={carouselRef} data-product-carousel className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-5 [scrollbar-width:none]">{visible.map((product) => {
          const line = cartLine(product.id)
          const outOfStock = product.stock != null && product.stock <= 0
          const limitReached = product.stock != null && (line?.quantity || 0) >= product.stock
          const discount = product.original_price && product.original_price > product.price ? Math.round((1 - product.price / product.original_price) * 100) : 0
          return <article key={product.id} className="group relative flex w-[76vw] shrink-0 snap-start flex-col rounded-2xl border border-black/[0.07] bg-white p-3 transition-all duration-300 hover:z-10 hover:-translate-y-1 hover:border-[#78DDBC] hover:shadow-[0_20px_48px_rgba(19,26,34,0.11)] sm:w-[260px] lg:w-[calc((100%-36px)/4)]">
            <div className="relative aspect-square overflow-hidden bg-white">{product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-contain p-2 transition-transform duration-500 group-hover:scale-105" sizes="(max-width:640px) 50vw, 20vw" /> : <span className="flex h-full items-center justify-center text-zinc-200"><AnimatedPackage size={38} /></span>}<div className="absolute left-1 top-1 flex flex-col items-start gap-1">{product.created_at && <span className="bg-[#78DDBC] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#131A22]">Nuevo</span>}{discount > 0 && <span className="bg-[#FFCA68] px-2 py-1 text-[8px] font-black text-[#131A22]">−{discount}%</span>}</div><button type="button" onClick={() => setQuickView(product)} aria-label={`Vista rápida de ${product.name}`} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 opacity-100 shadow-sm transition-all focus:translate-y-0 focus:opacity-100 lg:translate-y-1 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"><AnimatedEye size={15} duration={0.45} /></button></div>
            <div className="mt-2 flex flex-1 flex-col"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-400">{product.brand || product.category || 'Producto'}</p><h3 className="mt-1.5 line-clamp-3 min-h-[48px] text-[11px] font-bold leading-4 text-[#294B69] transition-colors group-hover:text-[#131A22] sm:text-xs">{product.name}</h3><div className="mt-2 space-y-0.5 text-[9px] text-zinc-400"><p>Stock: <strong className={outOfStock ? 'text-red-500' : 'text-zinc-600'}>{product.stock == null ? 'Disponible' : `${product.stock} ${product.stock === 1 ? 'artículo' : 'artículos'}`}</strong></p>{product.brand && <p>Marca: <strong className="text-zinc-600">{product.brand}</strong></p>}</div><div className="mt-auto pt-3"><div className="flex flex-wrap items-baseline gap-x-2"><strong className="text-sm font-black text-[#131A22] sm:text-base">{money(product.price)}</strong>{product.original_price && product.original_price > product.price && <span className="text-[9px] text-zinc-400 line-through">{money(product.original_price)}</span>}</div>
              {!isReadOnly && !outOfStock && !line && <button type="button" onClick={() => add(product)} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#131A22] text-[9px] font-bold uppercase tracking-[0.05em] text-white transition-all duration-300 hover:bg-[#2A987B] active:scale-[0.98]"><AnimatedCart size={14} duration={0.45} />Añadir al carrito</button>}
              {outOfStock && <a href={perfil?.whatsapp_phone ? `https://wa.me/${perfil.whatsapp_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, quisiera consultar disponibilidad de ${product.name}`)}` : '#'} target={perfil?.whatsapp_phone ? '_blank' : undefined} rel="noreferrer" className="mt-3 flex h-9 w-full items-center justify-center rounded-md border border-zinc-200 text-[8px] font-bold uppercase tracking-[0.05em] text-zinc-500">Consultar disponibilidad</a>}
              {line && <div className="mt-3 flex h-9 items-center justify-between rounded-md bg-[#eef8f5] px-1"><span className="flex items-center gap-1 pl-1 text-[8px] font-bold uppercase text-[#26866d]"><AnimatedCheck size={12} />Carrito</span><div className="flex items-center"><button type="button" onClick={() => updateQuantity(storeId, product.id, undefined, -1)} className="flex h-7 w-7 items-center justify-center"><AnimatedMinus size={12} /></button><span className="w-5 text-center text-[10px] font-bold">{line.quantity}</span><button type="button" onClick={() => add(product)} disabled={limitReached} className="flex h-7 w-7 items-center justify-center disabled:opacity-25"><AnimatedPlus size={12} /></button></div></div>}
            </div></div>
          </article>
        })}</div>{visible.length > 2 && <><button type="button" onClick={() => moveCarousel(-1)} aria-label="Productos anteriores" className="absolute -left-3 top-[42%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#131A22] opacity-100 shadow-[0_8px_24px_rgba(19,26,34,0.14)] transition-all hover:border-[#78DDBC] active:scale-95 lg:opacity-0 lg:group-hover/carousel:opacity-100"><AnimatedChevronLeft size={18} duration={0.45} /></button><button type="button" onClick={() => moveCarousel(1)} aria-label="Productos siguientes" className="absolute -right-3 top-[42%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#131A22] opacity-100 shadow-[0_8px_24px_rgba(19,26,34,0.14)] transition-all hover:border-[#78DDBC] active:scale-95 lg:opacity-0 lg:group-hover/carousel:opacity-100"><AnimatedChevronRight size={18} duration={0.45} /></button></>}</div> : <div className="border border-dashed border-zinc-300 bg-white py-20 text-center"><AnimatedPackage size={38} className="mx-auto text-zinc-300" /><p className="mt-4 text-sm font-bold">No encontramos productos</p><p className="mt-1 text-xs text-zinc-400">Prueba otra búsqueda o categoría.</p></div>}
      </div>
    </section>
    <ComercioQuickView product={quickView} storeId={storeId} isReadOnly={isReadOnly} onClose={() => setQuickView(null)} />
    </>
  )
}
