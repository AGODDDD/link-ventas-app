'use client'

import React, { useState, useEffect } from 'react'
import { Profile, Product } from '@/types/tienda'
import { Search, ShoppingCart, User, ClipboardList, MapPin } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import RestauranteProductModal from './RestauranteProductModal'
import SlideOverCart from '../SlideOverCart'

interface Props {
  perfil: Profile;
  productos: Product[];
}

export default function RestauranteTemplate({ perfil, productos }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  
  const cartStore = useCartStore()
  const cart = cartStore.carts[perfil.id] || []
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Agrupar platos por categoría
  const categorias = productos.reduce((acc: Record<string, Product[]>, item) => {
    const cat = item.category || 'Otros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const catNames = Object.keys(categorias);
  if (catNames.length > 0 && !activeCategory) {
    setActiveCategory(catNames[0])
  }

  // Scroll Spy for Categories
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries.filter((entry) => entry.isIntersecting);
        if (visibleSections.length > 0) {
          // Sort by intersection ratio or just pick the first standard one
          setActiveCategory(visibleSections[0].target.id);
        }
      },
      { rootMargin: '-10% 0px -80% 0px' }
    );

    catNames.forEach((catName) => {
      const element = document.getElementById(catName);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [catNames]);

  const handleScrollToCategory = (catName: string) => {
    const element = document.getElementById(catName);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveCategory(catName);
    }
  };

  const handleWhatsAppCheckout = () => {
    if (!perfil.whatsapp_phone) return alert('El restaurante no ha configurado su WhatsApp.')
    
    let text = `*NUEVO PEDIDO: ${perfil.store_name}*%0A%0A`
    cart.forEach(item => {
      text += `• ${item.quantity}x ${item.product.name} - S/ ${(item.product.price * item.quantity).toFixed(2)}%0A`
      if (item.variantDetails?.notes) {
        text += `   _Nota: ${item.variantDetails.notes}_%0A`
      }
    })
    const total = cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0)
    text += `%0A*TOTAL: S/ ${total.toFixed(2)}*%0A%0A`
    text += `Hola, deseo realizar este pedido.`
    
    window.open(`https://wa.me/${perfil.whatsapp_phone}?text=${text}`, '_blank')
    cartStore.clearCart(perfil.id) // Optional: Clear after sending
  }

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-body flex flex-col md:flex-row relative">
      
      {/* LEFT SIDEBAR (Desktop) / TOP (Mobile) */}
      <aside className="w-full md:w-[320px] lg:w-[380px] bg-white border-r border-[#EFEFEF] md:fixed md:h-screen md:top-0 md:left-0 z-40 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        
        {/* Logo / Header */}
        <div className="p-6 md:p-8 flex items-center gap-4">
          {perfil.avatar_url ? (
            <img src={perfil.avatar_url} alt={perfil.store_name} className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border border-neutral-100 shadow-sm" />
          ) : (
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {perfil.store_name?.charAt(0) || 'R'}
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg md:text-xl text-neutral-900 leading-tight">{perfil.store_name}</h1>
          </div>
        </div>

        {/* Address Banner */}
        <div className="px-6 md:px-8 pb-6">
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 text-center space-y-3 shadow-inner shadow-neutral-100/50">
             <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Dirección de Entrega</p>
             <button className="w-full bg-white border border-neutral-200 hover:border-primary/50 text-neutral-700 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm">
                <MapPin size={16} className="text-primary"/> Agregar dirección
             </button>
             {perfil.direccion && (
               <p className="text-xs text-neutral-400 font-medium">De: {perfil.direccion}</p>
             )}
          </div>
        </div>

        {/* Desktop Category Navigation */}
        <div className="hidden md:block flex-1 overflow-y-auto px-4 pb-24 custom-scrollbar">
          <nav className="space-y-1">
            {catNames.map((cat) => (
              <button
                key={cat}
                onClick={() => handleScrollToCategory(cat)}
                className={`w-full text-left px-4 py-3 rounded-lg text-[13px] font-bold uppercase tracking-widest transition-all ${
                  activeCategory === cat 
                    ? 'bg-primary/10 text-primary bg-gradient-to-r from-primary/10 to-transparent' 
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Horizontal Category Scroller */}
        <div className="md:hidden w-full overflow-x-auto whitespace-nowrap px-4 pb-4 border-b border-neutral-200 hide-scrollbar sticky top-0 bg-white z-20">
           <div className="flex gap-2">
             {catNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleScrollToCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                    activeCategory === cat 
                      ? 'bg-primary text-white' 
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* Desktop Bottom Action Nav */}
        <div className="hidden md:flex absolute bottom-0 left-0 w-full bg-black text-white px-2 py-4 justify-between items-center z-50">
           <button className="flex-1 flex flex-col items-center gap-1 hover:text-primary transition-colors">
              <User size={20}/>
              <span className="text-[10px] uppercase font-bold tracking-widest">PERFIL</span>
           </button>
           <button className="flex-1 flex flex-col items-center gap-1 text-primary relative">
              <ClipboardList size={20}/>
              <span className="text-[10px] uppercase font-bold tracking-widest">MENÚ</span>
           </button>
           <button 
              onClick={() => setIsCartOpen(true)}
              className="flex-1 flex flex-col items-center gap-1 hover:text-primary transition-colors relative"
           >
              <ShoppingCart size={20}/>
              <span className="text-[10px] uppercase font-bold tracking-widest">ORDEN</span>
              {mounted && totalItems > 0 && (
                <span className="absolute top-0 right-4 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
           </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT */}
      <main className="flex-1 md:ml-[320px] lg:ml-[380px] p-4 md:p-8 lg:p-12 pb-24 md:pb-12 max-w-5xl">
         
         <div className="space-y-12 md:space-y-16">
            {catNames.map((categoria) => (
              <section key={categoria} id={categoria} className="scroll-mt-24 md:scroll-mt-8">
                <h2 className="font-headline font-black text-xl md:text-2xl uppercase tracking-widest text-[#2D3142] mb-6 md:mb-8 pb-2 border-b-2 inline-block relative">
                  {categoria}
                  <div className="absolute -bottom-[2px] left-0 w-1/2 h-[2px] bg-primary"></div>
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {categorias[categoria].map((item) => (
                    <button 
                      key={item.id}
                      onClick={() => setSelectedProduct(item)}
                      className="bg-white rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-[#F0F0F0] hover:border-primary/20 text-left flex flex-col group h-full relative"
                    >
                      <div className="relative w-full aspect-[4/3] bg-neutral-100 overflow-hidden shrink-0">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-50 font-bold uppercase tracking-widest text-xs">Sin foto</div>
                        )}
                        
                        {/* Status Tags */}
                        {item.is_available === false && (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                            <span className="bg-red-500 text-white font-bold uppercase tracking-widest px-4 py-1.5 text-[10px] rounded-full shadow-lg">AGOTADO</span>
                          </div>
                        )}

                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur shadow-sm px-3 py-1.5 rounded-full z-10 border border-neutral-100">
                          <span className="font-headline font-black text-primary text-sm tracking-tight">
                            S/ {item.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 md:p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-[#2D3142] text-[15px] leading-snug mb-1.5 line-clamp-2">{item.name}</h3>
                        {item.description && (
                          <p className="text-[#8E94A4] text-xs leading-relaxed line-clamp-2">{item.description}</p>
                        )}
                        <div className="mt-auto pt-4 flex items-center justify-end">
                           <span className="text-primary font-bold text-xs uppercase tracking-widest group-hover:underline">Elegir</span>
                        </div>
                      </div>

                    </button>
                  ))}
                </div>
              </section>
            ))}
         </div>

      </main>

      {/* FLOATING CART BUBBLE BUTTON (Mobile & Desktop overrides) */}
      <button 
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-6 right-6 z-50 md:hidden bg-black text-white w-14 h-14 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform flex items-center justify-center"
      >
        <ShoppingCart size={24} />
        {mounted && totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-white text-[11px] w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-background">
            {totalItems}
          </span>
        )}
      </button>

      {/* RENDER MODAL */}
      <RestauranteProductModal 
         product={selectedProduct!}
         storeId={perfil.id}
         isOpen={!!selectedProduct}
         onClose={() => setSelectedProduct(null)}
      />

      {/* RENDER SLIDE OVER CART */}
      <SlideOverCart 
         storeId={perfil.id} 
         isOpen={isCartOpen} 
         onClose={() => setIsCartOpen(false)}
         onCheckout={handleWhatsAppCheckout}
      />
    </div>
  )
}
