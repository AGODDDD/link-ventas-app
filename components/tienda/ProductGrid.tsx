'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowUpRight, Check, Minus, PackageSearch, Plus, Search, Store, X } from 'lucide-react'
import { ShoppingBagIcon as AnimatedShoppingBag } from '@animateicons/react/lucide'
import { useCartStore } from '@/store/useCartStore'
import { Product, Profile } from '@/types/tienda'
import { toast } from 'sonner'

interface Props {
  productos: Product[]
  perfil: Profile | null
  isReadOnly?: boolean
}

const money = (value: number) => `S/ ${value.toFixed(2)}`

export default function ProductGrid({ productos, perfil, isReadOnly = false }: Props) {
  const storeId = perfil?.id || ''
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const cartStore = useCartStore()
  const storeCart = cartStore.carts[storeId] || []

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(productos.map((product) => product.category).filter(Boolean) as string[]))], [productos])
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return productos.filter((product) => {
      const matchesCategory = activeCategory === 'Todos' || product.category === activeCategory
      const searchable = `${product.name} ${product.brand || ''} ${product.description || ''}`.toLowerCase()
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery))
    })
  }, [activeCategory, productos, query])

  const getLine = (product: Product) => storeCart.find((item) => item.product.id === product.id && !item.variantDetails)
  const stockLabel = (product: Product) => product.stock == null ? 'Disponible' : product.stock <= 0 ? 'Agotado' : product.stock <= 5 ? `Últimas ${product.stock} unidades` : 'En stock'

  const addProduct = (product: Product) => {
    const line = getLine(product)
    if (isReadOnly || (product.stock != null && product.stock <= 0)) return
    if (product.stock != null && (line?.quantity || 0) >= product.stock) {
      toast.error(`Solo quedan ${product.stock} unidades de ${product.name}.`)
      return
    }
    cartStore.addToCart(storeId, product)
    toast.success(`${product.name} agregado a tu bolsa`)
  }

  return (
    <section id="catalogo" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="flex flex-col gap-8 border-b border-zinc-900/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">Selección de {perfil?.store_name || 'la tienda'}</p>
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.07em] text-zinc-900 sm:text-6xl">Lo esencial, bien elegido.</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">Tecnología, hogar y soluciones que cumplen su función sin ocupar espacio innecesario.</p>
        </div>
        <div className="flex w-full max-w-sm items-center gap-3 rounded-full border border-zinc-900/10 bg-white/70 px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
          <Search size={16} className="text-zinc-400" strokeWidth={1.6} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto" className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400" aria-label="Buscar productos" />
          {query && <button onClick={() => setQuery('')} aria-label="Limpiar búsqueda" className="text-zinc-400 transition-colors hover:text-zinc-900"><X size={15} /></button>}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto py-6 [scrollbar-width:none]">
        {categories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300 active:scale-95 ${activeCategory === category ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-900/10 bg-white/60 text-zinc-500 hover:border-zinc-900/30 hover:text-zinc-900'}`}>{category}</button>)}
      </div>

      {visibleProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {visibleProducts.map((product, index) => {
            const line = getLine(product)
            const outOfStock = product.stock != null && product.stock <= 0
            const atStockLimit = product.stock != null && (line?.quantity || 0) >= product.stock
            const discount = product.original_price && product.original_price > product.price ? Math.round((1 - product.price / product.original_price) * 100) : 0
            const featured = index % 7 === 0
            return (
              <article key={product.id} className={`group relative flex min-h-[430px] flex-col overflow-hidden rounded-[1.75rem] border border-zinc-900/10 bg-[#F3F1EC] p-3 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-zinc-900/20 hover:shadow-[0_22px_55px_rgba(24,24,27,0.10)] ${featured ? 'lg:col-span-6 lg:row-span-2' : 'lg:col-span-3'}`}>
                <div className={`relative flex-1 overflow-hidden rounded-[1.25rem] bg-[#ebe8e1] ${featured ? 'min-h-[390px]' : 'min-h-[300px]'}`}>
                  {product.image_url ? <Image src={product.image_url} alt={product.name} fill sizes={featured ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 1024px) 50vw, 25vw'} className="object-contain p-8 transition-transform duration-700 ease-out group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center text-zinc-300"><Store size={42} strokeWidth={1} /></div>}
                  <div className="absolute left-4 top-4 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${outOfStock ? 'bg-zinc-900/80 text-white' : 'bg-white/75 text-zinc-600 backdrop-blur-md'}`}>{outOfStock ? 'Agotado' : product.category || 'Selección'}</span>{discount > 0 && <span className="rounded-full bg-[#d9e86f] px-3 py-1 text-[10px] font-semibold text-zinc-900">-{discount}%</span>}</div>
                  {!outOfStock && !isReadOnly && <button onClick={() => addProduct(product)} disabled={atStockLimit} className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-3 text-xs font-semibold text-white opacity-100 shadow-lg transition-all duration-300 hover:bg-zinc-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"><AnimatedShoppingBag size={16} />{atStockLimit ? 'Límite alcanzado' : line ? `En bolsa · ${line.quantity}` : 'Agregar'}<ArrowUpRight size={14} /></button>}
                  {outOfStock && <div className="absolute inset-0 flex items-center justify-center bg-[#f3f1ec]/35 backdrop-blur-[2px]"><span className="rounded-full border border-zinc-900/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">Sin stock</span></div>}
                </div>
                <div className="px-2 pb-2 pt-5">
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0">{product.brand && <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{product.brand}</p>}<h3 className="line-clamp-2 text-lg font-medium leading-tight tracking-[-0.04em] text-zinc-900">{product.name}</h3></div><span className="shrink-0 text-base font-semibold tracking-[-0.04em] text-zinc-900">{money(product.price)}</span></div>
                  <div className="mt-3 flex items-center justify-between gap-3"><span className="line-clamp-1 text-xs text-zinc-500">{product.description || 'Disponible para entrega coordinada.'}</span><span className={`shrink-0 text-[10px] font-medium ${outOfStock ? 'text-zinc-400' : product.stock != null && product.stock <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>{stockLabel(product)}</span></div>
                  {line && <div className="mt-4 flex items-center justify-between border-t border-zinc-900/10 pt-3"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400"><Check size={13} className="mr-1 inline text-emerald-600" />En tu bolsa</span><div className="flex items-center gap-3 rounded-full bg-white/80 px-2 py-1"><button onClick={() => cartStore.updateQuantity(storeId, product.id, undefined, -1)} className="text-zinc-500 transition hover:text-zinc-900"><Minus size={14} /></button><span className="w-4 text-center text-xs font-semibold">{line.quantity}</span><button onClick={() => addProduct(product)} disabled={atStockLimit} className="text-zinc-500 transition hover:text-zinc-900 disabled:opacity-30"><Plus size={14} /></button></div></div>}
                </div>
              </article>
            )
          })}
        </div>
      ) : <div className="rounded-[1.75rem] border border-dashed border-zinc-900/15 bg-[#F3F1EC] px-6 py-24 text-center"><PackageSearch className="mx-auto text-zinc-300" size={42} strokeWidth={1.2} /><p className="mt-5 text-sm text-zinc-500">No encontramos productos con esa búsqueda.</p></div>}
    </section>
  )
}
