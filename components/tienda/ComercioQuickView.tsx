'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import {
  CheckIcon as AnimatedCheck,
  ChevronRightIcon as AnimatedChevron,
  PackageOpenIcon as AnimatedPackage,
  ShieldCheckIcon as AnimatedShield,
  ShoppingCartIcon as AnimatedCart,
  XIcon as AnimatedClose,
} from '@animateicons/react/lucide'
import { toast } from 'sonner'
import { useCartStore } from '@/store/useCartStore'
import { Product } from '@/types/tienda'

type Props = {
  product: Product | null
  storeId: string
  isReadOnly?: boolean
  onClose: () => void
}

const money = (value: number) => `S/ ${value.toFixed(2)}`

export default function ComercioQuickView({ product, storeId, isReadOnly = false, onClose }: Props) {
  const carts = useCartStore((state) => state.carts)
  const addToCart = useCartStore((state) => state.addToCart)
  const cart = carts[storeId] || []
  const line = product ? cart.find((item) => item.product.id === product.id && !item.variantDetails) : undefined

  useEffect(() => {
    if (!product) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose, product])

  if (!product) return null

  const outOfStock = product.stock != null && product.stock <= 0
  const limitReached = product.stock != null && (line?.quantity || 0) >= product.stock
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0
  const technicalDetails = [
    product.brand && ['Marca', product.brand],
    product.category && ['Categoría', product.category],
    ['Disponibilidad', outOfStock ? 'Agotado' : product.stock == null ? 'En stock' : `${product.stock} unidades`],
    ['Entrega', product.shipping_today ? 'Disponible hoy' : product.is_free_shipping ? 'Envío gratis' : 'Coordinada'],
    product.rating != null && ['Calificación', `${product.rating.toFixed(1)} / 5`],
  ].filter(Boolean) as string[][]

  const add = (openCart = false) => {
    if (isReadOnly || outOfStock || limitReached) return
    addToCart(storeId, product)
    toast.success(`${product.name} agregado al carrito`)
    if (openCart) {
      onClose()
      window.setTimeout(() => window.dispatchEvent(new Event('commerce-open-cart')), 180)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Vista rápida de ${product.name}`}>
      <button type="button" aria-label="Cerrar vista rápida" onClick={onClose} className="absolute inset-0 bg-[#090d12]/70 backdrop-blur-md" />
      <article className="relative grid max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#F7F9FC] shadow-[0_40px_120px_rgba(0,0,0,0.3)] sm:grid-cols-[1.05fr_0.95fr] sm:rounded-[28px]">
        <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-zinc-500 backdrop-blur-xl transition-all duration-300 hover:rotate-3 hover:text-[#172033] active:scale-95"><AnimatedClose size={18} duration={0.4} /></button>

        <div className="relative min-h-[330px] overflow-hidden bg-[#EAF0F8] sm:min-h-[620px]">
          <div className="absolute inset-5 rounded-[22px] border border-blue-100 bg-white/45" />
          {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-contain p-10 transition-transform duration-700 hover:scale-[1.025] sm:p-16" sizes="(max-width: 640px) 100vw, 50vw" /> : <span className="flex h-full items-center justify-center text-zinc-300"><AnimatedPackage size={72} duration={0.7} /></span>}
          <div className="absolute left-7 top-7 flex gap-2">{discount > 0 && <span className="rounded-full bg-[#F97316] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white">Ahorra {discount}%</span>}{product.is_free_shipping && <span className="rounded-full bg-white/85 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1D5ED8] backdrop-blur">Envío gratis</span>}</div>
        </div>

        <div className="flex flex-col p-7 sm:p-8 lg:p-10">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">{product.brand || product.category || 'Selección del catálogo'}</p>
          <h2 className="mt-4 text-3xl font-black leading-[0.98] tracking-[-0.055em] text-[#172033] sm:text-4xl">{product.name}</h2>
          <div className="mt-6 flex flex-wrap items-baseline gap-3"><strong className="text-3xl font-black tracking-[-0.05em] text-[#172033]">{money(product.price)}</strong>{product.original_price && product.original_price > product.price && <span className="text-sm text-zinc-400 line-through">{money(product.original_price)}</span>}</div>
          <p className="mt-5 line-clamp-4 text-sm leading-7 text-zinc-500">{product.description || 'Disponible para compra inmediata. Stock validado al momento de agregar al carrito.'}</p>

          <div className="mt-6"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Ficha del producto</p><div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white">{technicalDetails.map(([label, value]) => <div key={label} className="border-b border-r border-slate-100 px-4 py-3 last:border-b-0"><p className="text-[8px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</p><p className={`mt-1 text-[11px] font-bold ${label === 'Disponibilidad' && outOfStock ? 'text-red-500' : 'text-[#172033]'}`}>{value}</p></div>)}</div><div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-slate-500"><AnimatedShield size={14} duration={0.45} className="text-[#2563EB]" />Stock validado antes de finalizar la compra</div></div>

          <div className="mt-auto pt-5">
            {!isReadOnly && !outOfStock && <div className="grid gap-2 sm:grid-cols-[0.8fr_1.2fr]"><button type="button" onClick={() => add(false)} disabled={limitReached} className="flex h-13 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-[#172033] transition-all duration-300 hover:border-blue-300 hover:shadow-[0_10px_30px_rgba(37,99,235,0.08)] active:scale-[0.98] disabled:opacity-40">{line ? <AnimatedCheck size={17} duration={0.4} /> : <AnimatedCart size={17} duration={0.45} />}{line ? `${line.quantity} en carrito` : 'Agregar'}</button><button type="button" onClick={() => add(true)} disabled={limitReached} className="group flex h-13 items-center justify-between rounded-xl bg-[#F97316] px-5 text-xs font-bold text-white shadow-[0_10px_26px_rgba(249,115,22,0.22)] transition-all duration-300 hover:bg-[#EA580C] hover:shadow-[0_14px_34px_rgba(249,115,22,0.3)] active:scale-[0.98] disabled:opacity-40"><span>{line ? 'Agregar otro y ver carrito' : 'Comprar ahora'}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white"><AnimatedChevron size={16} duration={0.45} className="transition-transform group-hover:translate-x-0.5" /></span></button></div>}
            {outOfStock && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-center text-xs font-semibold text-red-600">Este producto está temporalmente agotado.</div>}
          </div>
        </div>
      </article>
    </div>
  )
}
