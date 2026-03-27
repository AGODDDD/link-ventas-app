'use client'

import React from 'react'
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
  const primaryColor = perfil?.primary_color || '#000000'
  const secondaryColor = perfil?.secondary_color || '#C31432'
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h2
        className="text-3xl font-bold tracking-tight mb-12 text-center md:text-left"
        style={{ color: primaryColor }}
      >
        Productos Destacados
      </h2>

      <div className="grid grid-cols-1 gap-y-12 gap-x-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
        {productos.map((prod) => {
          const inCart = storeCart.find(item => item.product.id === prod.id)

          return (
            <div key={prod.id} className="group relative flex flex-col bg-white rounded-2xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 ring-1 ring-slate-100 hover:ring-2" style={{ borderColor: 'transparent' }}>
              {/* Image Container */}
              <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-gray-100 relative">
                {prod.image_url ? (
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-in-out"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-300">
                    <Store size={48} strokeWidth={1} />
                  </div>
                )}

                {/* Quick Add Overlay (Desktop) */}
                <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block backdrop-blur-md bg-black/40">
                  {inCart ? (
                    <div className="flex items-center justify-between bg-white text-black rounded-full px-4 py-2 shadow-xl">
                      <button onClick={() => handleUpdateQuantity(prod.id, -1)} className="hover:text-red-500 transition-colors"><Minus size={16} /></button>
                      <span className="font-bold text-sm">{inCart.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(prod.id, 1)} className="hover:text-green-600 transition-colors"><Plus size={16} /></button>
                    </div>
                  ) : (
                    <Button
                      className="w-full rounded-full bg-white text-black hover:bg-slate-100 shadow-xl font-medium border-0"
                      onClick={() => handleAddToCart(prod)}
                    >
                      Agregar
                    </Button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="mt-4 px-2 pb-2 flex-col flex h-full">
                <div className="mb-2">
                  <h3 className="text-base font-semibold text-slate-900 line-clamp-2 leading-snug">
                    {prod.name}
                  </h3>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{prod.description}</p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <span
                    className="text-lg font-extrabold"
                    style={{ color: secondaryColor }}
                  >
                    S/ {prod.price}
                  </span>
                  {/* Mobile Add Button */}
                  <div className="md:hidden">
                    {inCart ? (
                      <div className="flex items-center gap-3 bg-slate-100 rounded-lg px-2 py-1">
                        <button onClick={() => handleUpdateQuantity(prod.id, -1)}><Minus size={14} /></button>
                        <span className="text-sm font-bold">{inCart.quantity}</span>
                        <button onClick={() => handleUpdateQuantity(prod.id, 1)}><Plus size={14} /></button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-full text-white px-4 transition-colors duration-300 shadow-md"
                        style={{ backgroundColor: secondaryColor }}
                        onClick={() => handleAddToCart(prod)}
                      >
                        Agregar
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
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 mt-8">
          <Store className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">No hay productos disponibles por el momento.</p>
        </div>
      )}
    </main>
  )
}
