'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  CheckIcon as AnimatedCheck,
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

interface Props {
  productos: Product[]
  perfil: Profile | null
  isReadOnly?: boolean
}

const money = (value: number) => `S/ ${value.toFixed(2)}`

export default function ProductGrid({ productos, perfil, isReadOnly = false }: Props) {
  const storeId = perfil?.id || ''
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const carts = useCartStore((state) => state.carts)
  const cart = carts[storeId] || []
  const addToCart = useCartStore((state) => state.addToCart)
  const updateQuantity = useCartStore((state) => state.updateQuantity)

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(productos.map((product) => product.category).filter(Boolean) as string[]))], [productos])
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('es')
    return productos.filter((product) => {
      const text = `${product.name} ${product.brand || ''} ${product.description || ''}`.toLocaleLowerCase('es')
      return (category === 'Todos' || product.category === category) && (!term || text.includes(term))
    })
  }, [category, productos, query])

  const cartLine = (productId: string) => cart.find((item) => item.product.id === productId && !item.variantDetails)

  const add = (product: Product) => {
    const current = cartLine(product.id)?.quantity || 0
    if (isReadOnly || (product.stock != null && product.stock <= 0)) return
    if (product.stock != null && current >= product.stock) {
      toast.error(`Solo hay ${product.stock} unidades disponibles.`)
      return
    }
    addToCart(storeId, product)
    toast.success(`${product.name} está en tu carrito`)
  }

  return (
    <section id="catalogo" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1380px]">
        <div className="grid gap-8 border-b border-zinc-900/10 pb-9 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Catálogo · {productos.length} productos</p><h2 className="mt-4 text-4xl font-medium tracking-[-0.055em] sm:text-6xl">Todo lo que necesitas.</h2></div>
          <label className="flex h-12 w-full items-center gap-3 rounded-xl border border-zinc-900/10 bg-white px-4 shadow-[0_8px_30px_rgba(0,0,0,0.025)] transition-all duration-300 focus-within:border-zinc-900/30 lg:w-80">
            <AnimatedSearch size={18} duration={0.5} className="shrink-0 text-zinc-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en el catálogo" className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda" className="text-zinc-400 hover:text-zinc-900"><AnimatedClose size={16} duration={0.4} /></button>}
          </label>
        </div>

        <div className="flex gap-2 overflow-x-auto py-7 [scrollbar-width:none]">
          {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-300 active:scale-95 ${category === item ? 'bg-[#181A19] text-white' : 'border border-zinc-900/10 bg-transparent text-zinc-500 hover:border-zinc-900/25 hover:text-zinc-900'}`}>{item}</button>)}
        </div>

        {filtered.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => {
              const line = cartLine(product.id)
              const outOfStock = product.stock != null && product.stock <= 0
              const limitReached = product.stock != null && (line?.quantity || 0) >= product.stock
              const discount = product.original_price && product.original_price > product.price ? Math.round((1 - product.price / product.original_price) * 100) : 0

              return (
                <article key={product.id} className="group min-w-0">
                  <div className="relative aspect-[1/1.08] overflow-hidden rounded-[1.4rem] border border-zinc-900/[0.06] bg-[#ECECE7] transition-all duration-500 ease-out group-hover:-translate-y-1 group-hover:border-zinc-900/15 group-hover:shadow-[0_24px_55px_rgba(24,26,25,0.10)]">
                    {product.image_url ? <Image src={product.image_url} alt={product.name} fill className="object-contain p-8 transition-transform duration-700 ease-out group-hover:scale-[1.045]" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw" /> : <div className="flex h-full items-center justify-center text-zinc-300"><AnimatedPackage size={44} duration={0.7} /></div>}

                    <div className="absolute left-3 top-3 flex gap-2">
                      {product.category && <span className="rounded-lg border border-white/60 bg-white/75 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-600 backdrop-blur-xl">{product.category}</span>}
                      {discount > 0 && <span className="rounded-lg bg-[#D7FF64] px-2.5 py-1.5 text-[9px] font-bold text-zinc-900">−{discount}%</span>}
                    </div>

                    {!isReadOnly && !outOfStock && !line && <button type="button" onClick={() => add(product)} className="absolute inset-x-3 bottom-3 flex h-12 translate-y-2 items-center justify-center gap-2 rounded-xl bg-[#181A19] text-xs font-semibold text-white opacity-0 shadow-xl transition-all duration-300 hover:bg-[#303330] active:scale-[0.98] group-hover:translate-y-0 group-hover:opacity-100 max-sm:translate-y-0 max-sm:opacity-100"><AnimatedCart size={18} duration={0.5} />Agregar al carrito</button>}
                    {outOfStock && <div className="absolute inset-0 flex items-center justify-center bg-[#ECECE7]/65 backdrop-blur-[2px]"><span className="rounded-xl border border-zinc-900/10 bg-white/85 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Agotado</span></div>}
                    {isReadOnly && !outOfStock && <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 backdrop-blur-xl">Venta temporalmente pausada</div>}
                  </div>

                  <div className="px-1 pt-5">
                    {product.brand && <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{product.brand}</p>}
                    <div className="mt-1.5 flex items-start justify-between gap-4"><h3 className="line-clamp-2 text-base font-semibold leading-5 tracking-[-0.025em] text-zinc-900">{product.name}</h3><div className="shrink-0 text-right"><p className="text-sm font-semibold text-zinc-900">{money(product.price)}</p>{product.original_price && product.original_price > product.price && <p className="mt-0.5 text-[10px] text-zinc-400 line-through">{money(product.original_price)}</p>}</div></div>
                    <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-zinc-500">{product.description || 'Disponible para entrega coordinada.'}</p>

                    <div className="mt-4 flex min-h-9 items-center justify-between border-t border-zinc-900/[0.07] pt-3">
                      <span className={`text-[10px] font-medium ${outOfStock ? 'text-zinc-400' : product.stock != null && product.stock <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>{outOfStock ? 'Sin stock' : product.stock != null && product.stock <= 5 ? `Solo ${product.stock} disponibles` : 'Disponible'}</span>
                      {line && <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-[0_4px_16px_rgba(0,0,0,0.05)]"><span className="mr-1 flex items-center gap-1 px-1 text-[9px] font-semibold text-emerald-700"><AnimatedCheck size={12} duration={0.4} />Carrito</span><button type="button" onClick={() => updateQuantity(storeId, product.id, undefined, -1)} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"><AnimatedMinus size={13} duration={0.4} /></button><span className="w-5 text-center text-xs font-semibold">{line.quantity}</span><button type="button" onClick={() => add(product)} disabled={limitReached} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-25"><AnimatedPlus size={13} duration={0.4} /></button></div>}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-zinc-900/15 bg-[#ECECE7] px-6 py-24 text-center"><AnimatedPackage size={42} duration={0.65} className="mx-auto text-zinc-300" /><h3 className="mt-5 text-base font-semibold">No encontramos coincidencias</h3><p className="mt-2 text-xs text-zinc-500">Prueba otra búsqueda o selecciona “Todos”.</p></div>
        )}
      </div>
    </section>
  )
}
