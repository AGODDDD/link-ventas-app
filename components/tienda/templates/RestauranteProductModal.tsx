'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { X, Minus, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useCartStore } from '@/store/useCartStore'
import { Product, ProductModifierGroup } from '@/types/tienda'
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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({})
  const cartStore = useCartStore()

  const modifiers = (product.variants as ProductModifierGroup[]) || []

  if (!isOpen) return null

  const handleToggleOption = (groupId: string, optionId: string, max: number) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
         return { ...prev, [groupId]: current.filter(id => id !== optionId) }
      } else {
         if (max === 1) {
            return { ...prev, [groupId]: [optionId] }
         } else if (current.length < max) {
            return { ...prev, [groupId]: [...current, optionId] }
         }
         return prev;
      }
    })
  }

  const modifiersPrice = modifiers.reduce((sum, group) => {
    const selected = selectedOptions[group.id] || [];
    const groupSum = selected.reduce((s, optId) => {
       const opt = group.options.find(o => o.id === optId);
       return s + (opt?.price_modifier || 0);
    }, 0);
    return sum + groupSum;
  }, 0);

  const basePrice = product.price
  const totalPrice = (basePrice + modifiersPrice) * quantity

  const isValid = modifiers.every(group => {
    if (!group.required) return true;
    const selected = selectedOptions[group.id] || [];
    return selected.length >= group.min_selections;
  });

  const handleAddToCart = () => {
    if (!isValid) {
      toast.error('Por favor completa todas las opciones obligatorias')
      return
    }

    const cartOptions = { 
      notes: notes.trim() !== '' ? notes : undefined,
      options: selectedOptions
    }

    cartStore.addToCart(storeId, product, cartOptions)
    
    if (quantity > 1) {
      cartStore.updateQuantity(storeId, product.id, cartOptions, quantity - 1)
    }

    toast.success('Agregado a tu pedido')
    setQuantity(1)
    setNotes('')
    setSelectedOptions({})
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

              {/* Modifiers Sections */}
              {modifiers.length > 0 && (
                <div className="mt-8 space-y-6">
                   {modifiers.map(group => {
                     const selectedCount = (selectedOptions[group.id] || []).length;
                     const isSatisfied = !group.required || selectedCount >= group.min_selections;
                     
                     return (
                       <div key={group.id} className="space-y-4">
                         <div className="flex items-center justify-between bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-100">
                            <div>
                               <h3 className="font-bold text-sm text-neutral-800">{group.name}</h3>
                               <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">
                                 {group.required ? `Obligatorio (Mín ${group.min_selections})` : 'Opcional'} • Máx {group.max_selections}
                               </p>
                            </div>
                            {!isSatisfied && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full">Requerido</span>}
                         </div>
                         <div className="space-y-2">
                            {group.options.map(opt => {
                              const isSelected = (selectedOptions[group.id] || []).includes(opt.id);
                              
                              return (
                                <label key={opt.id} className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${isSelected ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300 bg-white'}`}>
                                  <input 
                                     type="checkbox" 
                                     className="hidden" 
                                     checked={isSelected} 
                                     onChange={() => handleToggleOption(group.id, opt.id, group.max_selections)} 
                                  />
                                  <div className="flex items-center gap-3">
                                     {group.max_selections === 1 ? (
                                       <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-black' : 'border-neutral-300'}`}>
                                          {isSelected && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                                       </div>
                                     ) : (
                                       <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-black border-black text-white' : 'border-neutral-300'}`}>
                                          {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                       </div>
                                     )}
                                     <span className={`text-sm ${isSelected ? 'font-bold text-black' : 'text-neutral-700'}`}>{opt.name}</span>
                                  </div>
                                  {opt.price_modifier > 0 && (
                                     <span className="text-sm font-bold text-neutral-500">+ S/ {opt.price_modifier.toFixed(2)}</span>
                                  )}
                                </label>
                              )
                            })}
                         </div>
                       </div>
                     )
                   })}
                </div>
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
