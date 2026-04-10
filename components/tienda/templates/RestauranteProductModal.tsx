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
          className="bg-white w-full sm:w-[500px] h-[85vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col relative shadow-2xl translate-y-0 animate-in slide-in-from-bottom-10"
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button Top Right (Outside image) */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-[120] bg-black text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors shadow-md"
          >
            <X size={16} strokeWidth={3} />
          </button>

          <div className="overflow-y-auto flex-1 pb-24 custom-scrollbar">
            {/* Header Image bleed with Price Pill */}
            <div className="relative w-full aspect-video bg-neutral-100">
              {product.image_url ? (
                <Image src={product.image_url} alt={product.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">Sin foto</div>
              )}
              {/* Floating Price Pill inside the image */}
              <div className="absolute top-4 left-4 z-10 flex items-center bg-white rounded-full px-4 py-1.5 shadow-md">
                <span className="font-bold text-black text-sm">S/ {product.price.toFixed(2)}</span>
              </div>
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
              <div className="mt-6 space-y-4">
                <h3 className="font-bold text-sm text-neutral-800">Nota</h3>
                <textarea 
                  className="w-full bg-white border border-neutral-300 rounded-lg p-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-black resize-none"
                  rows={3}
                  placeholder="Ej: Sin mayonesa, papas bien doradas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

            </div>
          </div>

          {/* Sticky Bottom Footer */}
          <div className="absolute bottom-0 left-0 w-full bg-white border-t border-neutral-100 p-6 flex flex-col shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-50">
            <div className="flex justify-between items-center w-full mb-4 px-2">
               <span className="font-bold text-sm text-neutral-500">Total:</span>
               <span className="font-bold text-lg text-black">S/ {totalPrice.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between gap-4 mt-2">
              
              {/* Quantity */}
              <div className="flex items-center gap-4 bg-white rounded-full px-2 py-2 border border-neutral-200">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-neutral-400 hover:text-black p-1 bg-neutral-100 rounded-full w-8 h-8 flex items-center justify-center">
                  <Minus size={14} strokeWidth={3} />
                </button>
                <span className="font-bold text-sm w-4 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="text-neutral-400 hover:text-black p-1 bg-neutral-100 rounded-full w-8 h-8 flex items-center justify-center">
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-1 gap-3">
                 <button 
                  onClick={onClose}
                  className="flex-1 rounded-full border border-neutral-300 text-neutral-700 h-12 font-bold text-sm hover:bg-neutral-50 transition-colors"
                 >
                   Cancelar
                 </button>
                 <Button 
                  onClick={handleAddToCart}
                  disabled={product.is_available === false}
                  className="flex-1 rounded-full bg-black text-white h-12 font-bold text-sm hover:bg-neutral-800 transition-colors border-none"
                 >
                   Agregar
                 </Button>
              </div>
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
