'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ChevronRightIcon as AnimatedChevron,
  MinusIcon as AnimatedMinus,
  PackageOpenIcon as AnimatedPackage,
  PlusIcon as AnimatedPlus,
  ShoppingCartIcon as AnimatedCart,
  Trash2Icon as AnimatedTrash,
  XIcon as AnimatedClose,
} from '@animateicons/react/lucide'
import { useCartStore } from '@/store/useCartStore'
import { CartItem, ProductModifierGroup } from '@/types/tienda'

interface Props {
  storeId: string
  isOpen: boolean
  onClose: () => void
  onCheckout?: () => void
  templateType?: string
}

function unitPrice(item: CartItem) {
  let modifiers = 0
  if (item.variantDetails?.options && item.product.variants) {
    const groups = item.product.variants as ProductModifierGroup[]
    Object.entries(item.variantDetails.options).forEach(([groupId, optionIds]) => {
      const group = groups.find((candidate) => candidate.id === groupId)
      optionIds.forEach((optionId) => { modifiers += group?.options.find((option) => option.id === optionId)?.price_modifier || 0 })
    })
  }
  return item.product.price + modifiers
}

function VariantSummary({ item }: { item: CartItem }) {
  if (!item.variantDetails) return null
  const labels: string[] = []
  if (item.variantDetails.talla) labels.push(`Talla ${item.variantDetails.talla}`)
  if (item.variantDetails.color) labels.push(item.variantDetails.color)
  if (item.variantDetails.options && item.product.variants) {
    Object.entries(item.variantDetails.options).forEach(([groupId, optionIds]) => {
      const group = (item.product.variants as ProductModifierGroup[]).find((candidate) => candidate.id === groupId)
      const names = optionIds.map((optionId) => group?.options.find((option) => option.id === optionId)?.name).filter(Boolean)
      if (group && names.length) labels.push(`${group.name}: ${names.join(', ')}`)
    })
  }
  return labels.length ? <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-400">{labels.join(' · ')}</p> : null
}

export default function SlideOverCart({ storeId, isOpen, onClose, onCheckout, templateType }: Props) {
  const router = useRouter()
  const cartStore = useCartStore()
  const cart = cartStore.carts[storeId] || []
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0)
  const totalPrice = cartStore.getTotalPrice(storeId)
  const isCommerce = templateType === 'comercio'
  const isSoftTheme = isCommerce || templateType === 'restaurante' || templateType === 'moda'

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const update = (item: CartItem, delta: number) => {
    if (delta > 0 && item.product.stock != null && item.quantity >= item.product.stock) {
      toast.error(`Solo hay ${item.product.stock} unidades disponibles.`)
      return
    }
    cartStore.updateQuantity(storeId, item.product.id, item.variantDetails, delta)
  }

  const checkout = () => {
    onClose()
    if (onCheckout) onCheckout()
    else router.push(`/tienda/${storeId}/checkout`)
  }

  return (
    <>
      <button type="button" aria-label="Cerrar carrito" onClick={onClose} className={`fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} />

      <aside aria-hidden={!isOpen} className={`fixed inset-y-0 right-0 z-[101] flex w-full max-w-[460px] flex-col border-l transition-transform duration-500 ease-out ${isSoftTheme ? 'border-zinc-200/80 bg-[#F5F7FA] text-[#172033] shadow-[-30px_0_80px_rgba(0,0,0,0.15)]' : 'border-outline bg-background text-on-background'} ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <header className={`flex items-center justify-between border-b px-6 py-5 ${isSoftTheme ? 'border-zinc-900/10' : 'border-outline'}`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isCommerce ? 'bg-[#EAF1FF] text-[#2563EB]' : isSoftTheme ? 'bg-white text-zinc-900' : 'bg-surface-variant text-primary'}`}><AnimatedCart size={20} duration={0.5} /></span>
            <div><h2 className="text-base font-semibold tracking-[-0.025em]">Tu carrito</h2><p className={`mt-0.5 text-[10px] ${isSoftTheme ? 'text-zinc-400' : 'text-on-surface-variant'}`}>{totalItems ? `${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}` : 'Listo para tu próxima compra'}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 active:scale-95 ${isSoftTheme ? 'border border-zinc-900/10 bg-white text-zinc-500 hover:text-zinc-900' : 'bg-surface-variant text-on-surface-variant hover:text-primary'}`}><AnimatedClose size={18} duration={0.4} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!cart.length ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <span className={`flex h-20 w-20 items-center justify-center rounded-3xl ${isCommerce ? 'bg-[#E9E9E3] text-zinc-400' : isSoftTheme ? 'bg-white text-zinc-300' : 'bg-surface-variant text-outline-variant'}`}><AnimatedPackage size={35} duration={0.7} /></span>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.035em]">Tu carrito está vacío</h3>
              <p className={`mt-2 max-w-xs text-xs leading-6 ${isSoftTheme ? 'text-zinc-500' : 'text-on-surface-variant'}`}>Explora el catálogo y agrega lo que necesitas. Solo toma un clic.</p>
              <button type="button" onClick={onClose} className={`mt-7 rounded-xl px-5 py-3 text-xs font-semibold transition-all duration-300 active:scale-95 ${isCommerce ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8]' : isSoftTheme ? 'border border-zinc-200 bg-white text-zinc-700' : 'bg-primary text-on-primary'}`}>Ver productos</button>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <article key={`${item.product.id}-${index}`} className={`group grid grid-cols-[76px_1fr] gap-4 rounded-2xl border p-3 transition-all duration-300 ${isSoftTheme ? 'border-zinc-900/[0.07] bg-white hover:border-zinc-900/15 hover:shadow-[0_12px_35px_rgba(0,0,0,0.055)]' : 'border-outline bg-surface-container-low'}`}>
                  <div className={`relative h-24 overflow-hidden rounded-xl ${isCommerce ? 'bg-[#ECECE7]' : isSoftTheme ? 'bg-zinc-100' : 'bg-black'}`}>
                    {item.product.image_url ? <Image src={item.product.image_url} alt={item.product.name} fill className={isCommerce ? 'object-contain p-2' : 'object-cover'} sizes="76px" /> : <span className="flex h-full items-center justify-center text-zinc-300"><AnimatedPackage size={24} /></span>}
                  </div>
                  <div className="min-w-0 py-0.5">
                    <div className="flex items-start gap-2"><div className="min-w-0 flex-1">{item.product.brand && <p className="mb-1 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{item.product.brand}</p>}<h3 className="line-clamp-2 text-sm font-semibold leading-4 tracking-[-0.02em]">{item.product.name}</h3><VariantSummary item={item} /></div><button type="button" onClick={() => cartStore.removeFromCart(storeId, item.product.id, item.variantDetails)} aria-label="Eliminar producto" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-300 transition-all hover:bg-red-50 hover:text-red-500"><AnimatedTrash size={14} duration={0.45} /></button></div>
                    <div className="mt-3 flex items-center justify-between"><p className="text-sm font-semibold">S/ {unitPrice(item).toFixed(2)}</p><div className={`flex items-center gap-1 rounded-lg p-1 ${isSoftTheme ? 'bg-zinc-100' : 'bg-surface-variant'}`}><button type="button" onClick={() => update(item, -1)} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white hover:text-zinc-900"><AnimatedMinus size={13} duration={0.4} /></button><span className="w-6 text-center text-xs font-semibold">{item.quantity}</span><button type="button" onClick={() => update(item, 1)} disabled={item.product.stock != null && item.quantity >= item.product.stock} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white hover:text-zinc-900 disabled:opacity-25"><AnimatedPlus size={13} duration={0.4} /></button></div></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <footer className={`border-t p-6 ${isSoftTheme ? 'border-zinc-900/10 bg-white' : 'border-primary/20 bg-surface-container-high'}`}>
            <div className="flex items-end justify-between"><div><p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isSoftTheme ? 'text-zinc-400' : 'text-on-surface-variant'}`}>Subtotal</p><p className={`mt-1 text-[10px] ${isSoftTheme ? 'text-zinc-400' : 'text-on-surface-variant'}`}>Envío calculado al confirmar</p></div><p className="text-2xl font-semibold tracking-[-0.05em]">S/ {totalPrice.toFixed(2)}</p></div>
            <button type="button" onClick={checkout} className={`group mt-5 flex h-14 w-full items-center justify-between rounded-xl px-5 text-sm font-semibold transition-all duration-300 active:scale-[0.98] ${isCommerce ? 'bg-[#F97316] text-white shadow-[0_10px_26px_rgba(249,115,22,0.2)] hover:bg-[#EA580C]' : isSoftTheme ? 'bg-zinc-900 text-white hover:bg-zinc-700' : 'bg-gradient-to-r from-primary to-secondary text-white'}`}><span>Continuar al pago</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isCommerce ? 'bg-white/20 text-white' : 'bg-white/10'}`}><AnimatedChevron size={17} duration={0.45} className="transition-transform group-hover:translate-x-0.5" /></span></button>
            <button type="button" onClick={onClose} className={`mt-2 h-11 w-full text-xs font-medium transition-colors ${isSoftTheme ? 'text-zinc-400 hover:text-zinc-900' : 'text-on-surface-variant hover:text-primary'}`}>Seguir comprando</button>
          </footer>
        )}
      </aside>
    </>
  )
}
