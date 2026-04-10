'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { X, Minus, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useCartStore } from '@/store/useCartStore'
import { Product } from '@/types/tienda'
import { toast } from 'sonner'

interface Props {
  product: Product;
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function RestauranteProductModal({ product, storeId, isOpen, onClose }: Props) {
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const cartStore = useCartStore()

  if (!isOpen) return null

  // Calculate dynamic price based on options in the future. Right now, it's just price * quantity.
  const basePrice = product.price
  const totalPrice = basePrice * quantity

  const handleAddToCart = () => {
    cartStore.addToCart(storeId, product, { notes: notes.trim() !== '' ? notes : undefined })
    
    // If quantity is > 1 we need to update since default addToCart adds 1
    if (quantity > 1) {
      cartStore.updateQuantity(storeId, product.id, { notes: notes.trim() !== '' ? notes : undefined }, quantity - 1)
    }

    toast.success('Agregado a tu pedido')
    setQuantity(1)
    setNotes('')
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] transition-opacity flex items-end sm:items-center justify-center" onClick={onClose}>
        <div 
          className="bg-background w-full sm:w-[500px] h-[85vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col relative shadow-2xl translate-y-0 animate-in slide-in-from-bottom-10"
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button Top Right (Z-index high) */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-[120] bg-black/50 hover:bg-black/80 backdrop-blur-md text-white p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <div className="overflow-y-auto flex-1 pb-24">
            {/* Header Image bleed */}
            <div className="relative w-full aspect-video bg-neutral-100">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">Sin foto</div>
              )}
            </div>

            {/* Product Details */}
            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-bold font-headline text-on-background">{product.name}</h2>
              {product.description && (
                <p className="text-on-surface-variant text-sm mt-3 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Note Section */}
              <div className="mt-8 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold font-headline text-sm uppercase tracking-widest border-b-2 border-primary inline-block pb-1">Nota</h3>
                  <span className="text-xs text-on-surface-variant">Opcional</span>
                </div>
                <textarea 
                  className="w-full bg-surface-variant border border-outline rounded-xl p-4 text-sm text-on-background placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={3}
                  placeholder="Ej: Sin mayonesa, papas bien doradas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

            </div>
          </div>

          {/* Sticky Bottom Footer */}
          <div className="absolute bottom-0 left-0 w-full bg-background border-t border-outline/50 p-6 flex flex-col gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between gap-4">
              
              {/* Quantity */}
              <div className="flex items-center gap-4 bg-surface-variant rounded-full px-4 py-2 border border-outline/50">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-primary hover:opacity-70 p-1">
                  <Minus size={20} />
                </button>
                <span className="font-bold w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="text-primary hover:opacity-70 p-1">
                  <Plus size={20} />
                </button>
              </div>

              {/* Add Button */}
              <Button 
                onClick={handleAddToCart}
                disabled={product.is_available === false}
                className="flex-1 rounded-full bg-gradient-to-r from-primary to-secondary text-white h-12 font-headline font-bold text-lg uppercase shadow-lg shadow-primary/20 hover:brightness-110 border-none relative overflow-hidden group"
              >
                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></span>
                <span className="relative z-10 flex w-full items-center justify-between px-2">
                  <span>Agregar</span>
                  <span>S/ {totalPrice.toFixed(2)}</span>
                </span>
              </Button>
            </div>
            {product.is_available === false && (
              <p className="text-error text-center text-xs font-bold uppercase tracking-widest">Agotado hoy</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
