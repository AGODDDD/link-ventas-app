'use client'

import React from 'react'
import Image from 'next/image'
import { Plus, Minus, Store } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useCartStore } from '@/store/useCartStore'
import { Product, Profile } from '@/types/tienda'
import { toast } from 'sonner'

interface Props {
  productos: Product[];
  perfil: Profile | null;
}

export default function ProductGrid({ productos, perfil }: Props) {
  const storeId = perfil?.id || ''
  
  const cartStore = useCartStore()
  const storeCart = cartStore.carts[storeId] || []

  const handleAddToCart = (prod: Product) => {
    cartStore.addToCart(storeId, prod)
    toast.success(`${prod.name} agregado al carrito`)
  }

  const handleUpdateQuantity = (prodId: string, delta: number) => {
    cartStore.updateQuantity(storeId, prodId, delta)
  }

  return (
    <section id="catalogo" className="max-w-7xl mx-auto px-6 py-16">
      <h2 className="font-headline font-bold text-4xl mb-12 tracking-tighter uppercase italic text-on-background">
        CATÁLOGO DE <span className="text-primary">PRODUCTOS</span>
      </h2>

      <div className="grid grid-cols-1 gap-y-12 gap-x-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
        {productos.map((prod) => {
          const inCart = storeCart.find(item => item.product.id === prod.id)

          return (
            <div key={prod.id} className="group relative flex flex-col bg-surface-variant rounded-none p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-outline">
              {/* Image Container */}
              <div className="aspect-[4/5] w-full overflow-hidden rounded-none bg-black relative">
                {prod.image_url ? (
                  <Image
                    src={prod.image_url}
                    alt={prod.name}
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-in-out opacity-80 group-hover:opacity-100"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
                      <button onClick={() => handleUpdateQuantity(prod.id, -1)} className="hover:text-white transition-colors"><Minus size={16} /></button>
                      <span className="font-bold text-sm font-headline">{inCart.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(prod.id, 1)} className="hover:text-white transition-colors"><Plus size={16} /></button>
                    </div>
                  ) : (
                    <Button
                      className="w-full rounded-none bg-primary text-on-primary hover:bg-primary/80 font-bold tracking-widest uppercase border-0 font-headline"
                      onClick={() => handleAddToCart(prod)}
                    >
                      AÑADIR AL CARRO
                    </Button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="mt-4 px-2 pb-2 flex-col flex h-full">
                <div className="mb-2">
                  <h3 className="font-headline text-lg font-bold text-on-background line-clamp-2 leading-snug tracking-tighter uppercase">
                    {prod.name}
                  </h3>
                </div>
                <p className="font-body text-xs text-on-surface-variant line-clamp-2 h-8">{prod.description}</p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline/50">
                  <span className="text-xl font-black font-headline tracking-tighter text-on-background italic">
                    S/ {prod.price}
                  </span>
                  {/* Mobile Add Button */}
                  <div className="md:hidden">
                    {inCart ? (
                      <div className="flex items-center gap-3 bg-zinc-900 border border-primary text-primary rounded-none px-2 py-1">
                        <button onClick={() => handleUpdateQuantity(prod.id, -1)}><Minus size={14} /></button>
                        <span className="text-sm font-bold font-headline">{inCart.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(prod.id, 1)}><Plus size={14} /></button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-none bg-primary text-on-primary font-bold font-headline uppercase"
                        onClick={() => handleAddToCart(prod)}
                      >
                        AÑADIR
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {productos.length === 0 && (
        <div className="text-center py-24 bg-surface-variant rounded-none border border-dashed border-outline mt-8">
          <Store className="mx-auto h-12 w-12 text-outline mb-4" />
          <p className="font-body text-on-surface-variant text-lg tracking-widest uppercase text-xs font-bold">Sin inventario disponible.</p>
        </div>
      )}
    </section>
  )
}
