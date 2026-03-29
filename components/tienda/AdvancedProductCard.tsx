'use client'

import React from 'react'
import Image from 'next/image'
import { Plus, Minus, Store, Star, Zap } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useCartStore } from '@/store/useCartStore'
import { Product, Profile } from '@/types/tienda'
import { toast } from 'sonner'


export default function AdvancedProductCard({ prod, perfil }: { prod: Product; perfil: Profile | null; }) {
  const storeId = perfil?.id || ''
  const storeName = perfil?.store_name || 'TU TIENDA'
  
  const cartStore = useCartStore()
  const storeCart = cartStore.carts[storeId] || []
  const inCart = storeCart.find(item => item.product.id === prod.id)

  const handleAddToCart = () => {
    cartStore.addToCart(storeId, prod)
    toast.success(`${prod.name} agregado al carrito`)
  }

  const handleUpdateQuantity = (delta: number) => {
    cartStore.updateQuantity(storeId, prod.id, delta)
  }

  const discountPercentage = prod.original_price && prod.original_price > prod.price
    ? Math.round((1 - prod.price / prod.original_price) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col bg-surface-variant rounded-none p-4 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-outline h-full">
      {/* Badges Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {prod.is_free_shipping && (
          <span className="bg-primary px-2 py-1 text-[10px] font-bold text-on-primary uppercase tracking-widest font-headline">
            Envío Gratis
          </span>
        )}
        {prod.shipping_today && (
          <span className="bg-white text-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 font-headline">
            <Zap size={10} className="fill-black" /> ¡HOY!
          </span>
        )}
      </div>

      {discountPercentage > 0 && (
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-black text-white px-2 py-1 text-xs font-black uppercase tracking-widest font-headline border border-primary">
            -{discountPercentage}%
          </span>
        </div>
      )}

      {/* Image Container */}
      <div className="aspect-[4/5] w-full overflow-hidden rounded-none bg-black relative mb-4">
        {prod.image_url ? (
          <Image
            src={prod.image_url}
            alt={prod.name}
            className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-in-out opacity-80 group-hover:opacity-100"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-outline-variant">
            <Store size={48} strokeWidth={1} />
          </div>
        )}

        {/* Quick Add Overlay (Desktop) */}
        <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block backdrop-blur-md bg-black/60 border-t border-primary/20">
          {inCart ? (
            <div className="flex items-center justify-between bg-zinc-900 border border-primary text-primary rounded-none px-4 py-2 shadow-xl">
              <button onClick={() => handleUpdateQuantity(-1)} className="hover:text-white transition-colors"><Minus size={16} /></button>
              <span className="font-bold text-sm font-headline">{inCart.quantity}</span>
              <button onClick={() => handleUpdateQuantity(1)} className="hover:text-white transition-colors"><Plus size={16} /></button>
            </div>
          ) : (
            <Button
              className="w-full rounded-none bg-primary text-on-primary hover:bg-primary/80 font-bold tracking-widest uppercase border-0 font-headline"
              onClick={handleAddToCart}
            >
              AÑADIR AL CARRO
            </Button>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="flex-col flex flex-grow justify-between">
        <div>
          {prod.brand && (
            <div className="font-headline font-black text-[11px] tracking-widest uppercase text-on-surface-variant mb-1">
              {prod.brand}
            </div>
          )}
          <h3 className="font-headline text-sm md:text-base font-bold text-on-background line-clamp-2 leading-tight uppercase mb-3">
            {prod.name}
          </h3>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
            <div>
              <span className="text-xl md:text-2xl font-black font-headline tracking-tighter text-on-background italic">
                S/ {prod.price.toFixed(2)}
              </span>
              {discountPercentage > 0 && prod.original_price && (
                <span className="text-xs text-on-surface-variant font-body line-through decoration-primary ml-2 block sm:inline">
                  S/ {prod.original_price.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-3 border-b border-white/10 pb-2">
            Vendido por <span className="text-primary">{storeName}</span>
          </div>

          <div className="flex items-center justify-between">
            {prod.rating ? (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={12} 
                    className={star <= Math.round(prod.rating!) ? "fill-primary text-primary" : "text-outline-variant"} 
                  />
                ))}
                <span className="text-[10px] text-on-surface-variant font-label ml-1">({prod.reviews_count || 0})</span>
              </div>
            ) : (
              <span className="text-[10px] text-on-surface-variant font-label bg-white/5 px-2 py-0.5">NUEVO</span>
            )}

            {/* Mobile Add Button */}
            <div className="md:hidden">
              {inCart ? (
                <div className="flex items-center gap-2 bg-zinc-900 border border-primary text-primary rounded-none px-2 py-1">
                  <button onClick={() => handleUpdateQuantity(-1)}><Minus size={12} /></button>
                  <span className="text-xs font-bold font-headline">{inCart.quantity}</span>
                  <button onClick={() => handleUpdateQuantity(1)}><Plus size={12} /></button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="rounded-none bg-primary text-on-primary font-bold font-headline uppercase text-[10px] h-7 px-3"
                  onClick={handleAddToCart}
                >
                  <Plus size={12} className="mr-1"/> AGREGAR
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
