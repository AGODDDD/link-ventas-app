'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Plus, Minus, Store } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useCartStore } from '@/store/useCartStore'
import { Product, Profile } from '@/types/tienda'
import { toast } from 'sonner'

export default function ModaProductCard({ prod, perfil }: { prod: Product; perfil: Profile | null; }) {
  const storeId = perfil?.id || ''
  
  const cartStore = useCartStore()
  
  // Local state for Variants
  const variantsArray = Array.isArray(prod.variants) ? prod.variants : []
  const availableTallas = variantsArray.filter((v: any) => v.talla).map((v: any) => v.talla)
  const availableColores = variantsArray.filter((v: any) => v.color).map((v: any) => v.color)
  
  // Unique sets
  const tallas = Array.from(new Set(availableTallas)) as string[]
  const colores = Array.from(new Set(availableColores)) as string[]

  const [selectedTalla, setSelectedTalla] = useState<string>(tallas.length === 1 ? tallas[0] : '')
  const [selectedColor, setSelectedColor] = useState<string>(colores.length === 1 ? colores[0] : '')

  // Current selected exact variant lookup (simplified)
  const currentVariantDetails = { 
    talla: selectedTalla || undefined, 
    color: selectedColor || undefined 
  }

  // Find if this exact variant is in the cart
  const storeCart = cartStore.carts[storeId] || []
  const inCart = storeCart.find(item => 
    item.product.id === prod.id && 
    JSON.stringify(item.variantDetails || {}) === JSON.stringify(currentVariantDetails)
  )

  const isOutOfStock = prod.stock !== null && prod.stock !== undefined && prod.stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    
    // Validation
    if (tallas.length > 0 && !selectedTalla) {
      toast.error('Por favor, selecciona una talla.')
      return
    }
    if (colores.length > 0 && !selectedColor) {
      toast.error('Por favor, selecciona un color.')
      return
    }

    cartStore.addToCart(storeId, prod, currentVariantDetails)
    toast.success(`${prod.name} agregado al carrito`)
  }

  const handleUpdateQuantity = (delta: number) => {
    cartStore.updateQuantity(storeId, prod.id, currentVariantDetails, delta)
  }

  return (
    <div className="group relative flex flex-col bg-transparent rounded-none p-0 transition-all duration-300 h-full font-sans">
      
      {/* Image Container */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-stone-100 relative mb-4">
        {prod.image_url ? (
          <Image
            src={prod.image_url}
            alt={prod.name}
            className="object-cover object-center group-hover:scale-105 transition-transform duration-1000 ease-in-out"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-stone-300">
            <Store size={48} strokeWidth={1} />
          </div>
        )}

        {/* Agotado Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
             <span className="font-serif tracking-[0.2em] text-neutral-800 uppercase text-lg">Agotado</span>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex-col flex flex-grow justify-between text-center px-2">
        <div className="mb-4">
          <h3 className="font-light text-base md:text-lg text-neutral-900 line-clamp-2 uppercase tracking-widest mb-1">
            {prod.name}
          </h3>
          <span className="text-sm md:text-base font-medium tracking-widest text-neutral-500">
            S/ {prod.price.toFixed(2)}
          </span>
        </div>

        {!isOutOfStock && (
          <div className="space-y-4">
            {/* Variants Selectors */}
            {tallas.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {tallas.map(t => (
                  <button 
                    key={t}
                    onClick={() => setSelectedTalla(t)}
                    className={`w-8 h-8 text-xs border flex items-center justify-center uppercase transition-colors ${
                      selectedTalla === t 
                        ? 'border-neutral-900 bg-neutral-900 text-white font-medium' 
                        : 'border-neutral-300 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
            
            {colores.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {colores.map(c => (
                  <button 
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`px-3 h-8 text-xs border flex items-center justify-center uppercase transition-colors ${
                      selectedColor === c 
                        ? 'border-neutral-900 bg-neutral-900 text-white font-medium' 
                        : 'border-neutral-300 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Add to cart */}
            {inCart ? (
              <div className="flex items-center justify-between border border-neutral-900 text-neutral-900 px-4 py-2 mt-4 mx-8">
                <button onClick={() => handleUpdateQuantity(-1)} className="hover:opacity-50"><Minus size={16} /></button>
                <span className="font-medium text-sm">{inCart.quantity}</span>
                <button onClick={() => handleUpdateQuantity(1)} className="hover:opacity-50"><Plus size={16} /></button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full rounded-none border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white uppercase tracking-widest font-light mt-4"
                onClick={handleAddToCart}
              >
                Agregar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
