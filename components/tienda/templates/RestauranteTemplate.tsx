'use client'

import React, { useState, useEffect } from 'react'
import { Profile, Product } from '@/types/tienda'
import { Search, ShoppingCart, User, ClipboardList, MapPin } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { useCustomerStore } from '@/store/useCustomerStore'
import RestauranteProductModal from './RestauranteProductModal'
import RestauranteCheckoutModal from './RestauranteCheckoutModal'
import AddressMapModal from './AddressMapModal'
import OrderHistoryPanel from './OrderHistoryPanel'
import SlideOverCart from '../SlideOverCart'
import { isStoreClosed, getTodayScheduleText } from '@/lib/storeSchedule'

interface Props {
  perfil: Profile;
  productos: Product[];
}

export default function RestauranteTemplate({ perfil, productos }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false)
  
  // Persistent customer data
  const customerStore = useCustomerStore()
  const savedAddress = customerStore.savedAddress
  const profileName = customerStore.profile.nombre
  const profilePhone = customerStore.profile.telefono
  const profileEmail = customerStore.profile.correo
  
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
      const y = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveCategory(catName);
    }
  };

  const handleWhatsAppCheckout = () => {
    if (!perfil.whatsapp_phone) return alert('El restaurante no ha configurado su WhatsApp.')
    
    let text = `*NUEVO PEDIDO: ${perfil.store_name}*%0A%0A`
    cart.forEach(item => {
      let itemModifiersPrice = 0;
      let optionsText = '';
      if (item.variantDetails?.options && item.product.variants) {
         const groups = item.product.variants as any[];
         Object.entries(item.variantDetails.options as Record<string, string[]>).forEach(([groupId, optionIds]) => {
            const group = groups.find(g => g.id === groupId);
            if (group && optionIds.length > 0) {
               optionsText += `   _${group.name}:_%0A`;
               optionIds.forEach(optId => {
                  const opt = group.options.find((o:any) => o.id === optId);
                  if (opt) {
                     itemModifiersPrice += opt.price_modifier;
                     optionsText += `   - ${opt.name}${opt.price_modifier > 0 ? ` (+S/ ${opt.price_modifier.toFixed(2)})` : ''}%0A`;
                  }
               });
            }
         });
      }
      
      const unitPrice = item.product.price + itemModifiersPrice;
      text += `• ${item.quantity}x ${item.product.name} - S/ ${(unitPrice * item.quantity).toFixed(2)}%0A`
      if (optionsText) {
         text += optionsText;
      }
      if (item.variantDetails?.notes) {
        text += `   _Nota: ${item.variantDetails.notes}_%0A`
      }
    })
    const total = cartStore.getTotalPrice(perfil.id)
    text += `%0A*TOTAL: S/ ${total.toFixed(2)}*%0A%0A`
    text += `Hola, deseo realizar este pedido.`
    
    window.open(`https://wa.me/${perfil.whatsapp_phone}?text=${text}`, '_blank')
    cartStore.clearCart(perfil.id) // Optional: Clear after sending
  }

  const handleOpenCheckout = () => {
    setIsCartOpen(false)
    if (!savedAddress) {
      setTimeout(() => setIsAddressModalOpen(true), 150)
    } else {
      setTimeout(() => setIsCheckoutOpen(true), 150)
    }
  }

  const handleAddressSaved = (data: { direccion: string; referencia: string; lat: number; lng: number }) => {
    customerStore.setSavedAddress(data)
    setIsAddressModalOpen(false)
    setTimeout(() => setIsCheckoutOpen(true), 150)
  }

  const handleOpenAddressFromSidebar = () => {
    setIsAddressModalOpen(true)
  }

  const setProfileName = (v: string) => customerStore.setProfile({ nombre: v })
  const setProfilePhone = (v: string) => customerStore.setProfile({ telefono: v })
  const setProfileEmail = (v: string) => customerStore.setProfile({ correo: v })

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-body flex flex-col relative pt-[60px]"> {/* Main Background */}
      
      {/* GLOBAL TOP NAVBAR (Black with white pill for name) */}
      <header className="fixed top-0 left-0 w-full h-[60px] bg-black flex items-center justify-between px-3 z-50 shadow-md">
        <div className="flex items-center gap-2 bg-white rounded-full pl-1 pr-4 py-1">
          {perfil.avatar_url ? (
            <img src={perfil.avatar_url} alt="Logo" className="w-9 h-9 rounded-full object-cover border border-neutral-200 bg-white" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
              {perfil.store_name?.charAt(0) || 'R'}
            </div>
          )}
          <span className="font-bold text-base text-[#444] tracking-wide">{perfil.store_name}</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-white/30 transition-colors">
          <Search size={17} strokeWidth={2.5} />
        </div>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-[320px] lg:w-[350px] bg-white border-r border-neutral-200 fixed top-[60px] left-0 h-[calc(100vh-60px)] z-40">
        
        {/* Banner with Address Card overlapping */}
        <div className="relative pb-6">
          <div className="w-full h-[180px] bg-neutral-200 overflow-hidden relative">
            {(perfil.banner_url || perfil.avatar_url) ? (
              <img src={perfil.banner_url || perfil.avatar_url || ''} className="w-full h-full object-cover opacity-90" alt="Banner" />
            ) : (
              <div className="w-full h-full flex justify-center items-center text-neutral-400 text-xs">Sin Banner</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/30"></div>
          </div>

          {/* ── Banner CERRADO si está fuera de horario ── */}
          {isStoreClosed((perfil as any).store_schedule ?? null) && (
            <div className="mx-4 mt-3 bg-red-600 text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-md">
              <span className="text-xl">🔴</span>
              <div>
                <p className="font-bold text-sm leading-tight">Tienda cerrada en este momento</p>
                <p className="text-xs opacity-80 mt-0.5">
                  {getTodayScheduleText((perfil as any).store_schedule ?? null) === 'Cerrado hoy'
                    ? 'Hoy no hay servicio de delivery'
                    : `Horario de hoy: ${getTodayScheduleText((perfil as any).store_schedule ?? null)}`
                  }
                </p>
              </div>
            </div>
          )}
          
          {/* Floating Address Card */}
          <div className="relative -mt-10 px-4 z-10 w-full">
            <div className="bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-neutral-100 flex flex-col items-center text-center gap-2 relative">
              <span className="font-bold text-sm text-neutral-800 leading-tight block w-2/3 mx-auto">
                {savedAddress ? savedAddress.direccion : 'Agrega tu dirección para activar promociones'}
              </span>
              <button onClick={handleOpenAddressFromSidebar} className="flex items-center gap-2 text-xs font-medium text-neutral-700 mt-2 hover:text-black">
                <MapPin size={14} /> {savedAddress ? 'Cambiar dirección' : 'Agregar dirección'}
              </button>
              <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 font-bold">
                 <span>🛵</span> {savedAddress ? 'Dirección guardada ✓' : '---'}
              </div>
            </div>
          </div>
        </div>

        {/* Category List */}
        <div className="flex-1 overflow-y-auto px-4 pb-20 custom-scrollbar">
          <nav className="space-y-1">
            {catNames.map((cat) => (
              <button
                key={cat}
                onClick={() => handleScrollToCategory(cat)}
                className={`w-full text-left px-4 py-3 text-[13px] uppercase transition-all tracking-wider font-semibold rounded-lg ${
                  activeCategory === cat 
                    ? 'text-black font-bold bg-neutral-100/80 shadow-sm' 
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Nav Icons inside Sidebar */}
        <div className="absolute bottom-0 left-0 w-full bg-black text-white h-14 flex items-center justify-around px-4">
           <button onClick={() => setIsProfileOpen(true)} className="hover:text-neutral-300 cursor-pointer"><User size={20} /></button>
           <button onClick={() => setIsOrderHistoryOpen(true)} className="relative hover:text-neutral-300 cursor-pointer">
             <ClipboardList size={20} />
             {mounted && customerStore.orders.filter(o => o.storeId === perfil.id).length > 0 && (
               <div className="absolute -top-1 -right-1 bg-white text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                 {customerStore.orders.filter(o => o.storeId === perfil.id).length}
               </div>
             )}
           </button>
           <svg onClick={() => setIsOrderHistoryOpen(true)} className="w-5 h-5 hover:text-neutral-300 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
      </aside>

      {/* MOBILE LAYOUT SUPPORT (Banner & Horizontal nav) */}
      <div className="md:hidden">
        <div className="w-full h-40 relative">
           {(perfil.banner_url || perfil.avatar_url) ? (
              <img src={perfil.banner_url || perfil.avatar_url || ''} className="w-full h-full object-cover" alt="Banner" />
            ) : (
              <div className="w-full h-full bg-neutral-200"></div>
            )}
        </div>
        <div className="bg-white p-4 -mt-4 relative rounded-t-2xl shadow-sm z-10 border-b border-neutral-100 flex flex-col items-center text-center">
            <span className="font-bold text-sm text-neutral-800 leading-tight">{savedAddress ? savedAddress.direccion : 'Agrega tu dirección para activar promociones'}</span>
            <button onClick={handleOpenAddressFromSidebar} className="flex items-center gap-2 text-xs font-medium text-neutral-500 mt-2"><MapPin size={14}/> {savedAddress ? 'Cambiar dirección' : 'Agregar dirección'}</button>
        </div>
        <div className="w-full overflow-x-auto whitespace-nowrap px-4 py-3 bg-white sticky top-[60px] z-30 shadow-sm hide-scrollbar">
           <div className="flex gap-2">
             {catNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleScrollToCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                    activeCategory === cat ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* RIGHT MAIN CONTENT */}
      <main className="flex-1 md:ml-[320px] lg:ml-[350px] p-4 sm:p-6 lg:p-8 pb-32 max-w-6xl w-full mx-auto self-start">
         <div className="space-y-12">
            {catNames.map((categoria) => (
              <section key={categoria} id={categoria} className="scroll-mt-28 md:scroll-mt-[100px]">
                
                {/* Section Title with Lines */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-[2px] flex-1 bg-neutral-200 rounded-full"></div>
                  <h2 className="font-bold text-[15px] md:text-lg text-[#555761] uppercase tracking-widest whitespace-nowrap px-2">
                    {categoria}
                  </h2>
                  <div className="h-[2px] flex-1 bg-neutral-200 rounded-full"></div>
                </div>
                
                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                  {categorias[categoria].map((item) => {
                    const priceDiscount = item.original_price && item.original_price > item.price 
                        ? item.original_price - item.price : null;

                    return (
                    <button 
                      key={item.id}
                      onClick={() => setSelectedProduct(item)}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left flex flex-col relative w-full h-full"
                    >
                      <div className="relative w-full aspect-[4/3] bg-neutral-100">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-50 font-bold uppercase tracking-widest text-xs">Sin foto</div>
                        )}
                        
                        {/* Status overlays */}
                        {item.is_available === false && (
                          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                            <span className="bg-red-500 text-white font-bold uppercase tracking-widest px-3 py-1 text-[10px] rounded-full">AGOTADO</span>
                          </div>
                        )}

                        {/* White Price Pill (Top Left) */}
                        <div className="absolute top-2 left-2 z-10 flex items-center bg-white rounded-full pl-3 pr-2 py-1 shadow-sm border border-neutral-100 gap-2 h-7 group">
                          {item.original_price && item.original_price > item.price && (
                             <span className="text-neutral-400 text-[10px] line-through font-medium">S/ {item.original_price.toFixed(2)}</span>
                          )}
                          <span className="font-black text-black text-[13px] tracking-tight">S/ {item.price.toFixed(2)}</span>
                        </div>

                        {/* Black Discount Pill (Top Right) */}
                        {priceDiscount && (
                           <div className="absolute top-2 right-2 z-10 bg-black text-white h-7 px-3 rounded-full flex items-center justify-center font-bold text-[11px] shadow-sm">
                             -S/ {priceDiscount.toFixed(2)}
                           </div>
                        )}
                      </div>
                      
                      <div className="p-4 flex-1 flex flex-col bg-white">
                        <h3 className="font-bold text-black text-[15px] leading-tight mb-2 line-clamp-2">{item.name}</h3>
                        {item.description && (
                          <p className="text-neutral-600 text-[12px] leading-snug line-clamp-3">{item.description}</p>
                        )}
                      </div>
                    </button>
                    )
                  })}
                </div>
              </section>
            ))}
         </div>
      </main>

      {/* FLOATING CART BUBBLE BUTTON */}
      <div 
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-0 right-0 z-50 cursor-pointer flex flex-col items-end"
      >
        <div className="w-24 h-24 bg-black rounded-tl-full flex items-end justify-end p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-transform origin-bottom-right relative">
          <ShoppingCart size={32} className="text-white" strokeWidth={1.5} />
          {mounted && totalItems > 0 && (
            <span className="absolute top-3 left-3 bg-white text-black text-xs w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-md">
              {totalItems}
            </span>
          )}
        </div>
      </div>

      {/* PROFILE PANEL */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setIsProfileOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg text-[#111] text-center">Mi perfil</h2>
            
            <div>
              <label className="text-sm font-medium text-[#555] mb-1 block">Nombre:</label>
              <input 
                type="text" 
                value={profileName} 
                onChange={e => setProfileName(e.target.value)} 
                placeholder="Tu nombre" 
                className="w-full border border-neutral-300 rounded-lg h-11 px-4 text-sm text-[#111] bg-white focus:border-black outline-none"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-[#555] mb-1 block">* Teléfono:</label>
              <div className="flex rounded-lg border border-neutral-300 overflow-hidden h-11">
                <div className="bg-neutral-50 px-3 flex items-center justify-center border-r border-neutral-300 gap-1">
                  <span className="text-sm">🇵🇪</span>
                </div>
                <input 
                  type="tel" 
                  value={profilePhone} 
                  onChange={e => setProfilePhone(e.target.value)} 
                  placeholder="+51 (9XX) XXX XXX" 
                  className="flex-1 px-3 text-sm text-[#111] bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#555] mb-1 block">Correo electrónico:</label>
              <input 
                type="email" 
                value={profileEmail} 
                onChange={e => setProfileEmail(e.target.value)} 
                placeholder="correo@ejemplo.com" 
                className="w-full border border-neutral-300 rounded-lg h-11 px-4 text-sm text-[#111] bg-white focus:border-black outline-none"
              />
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#333] mb-2">Mis direcciones</h3>
              <div className="border border-dashed border-neutral-300 rounded-xl p-6 text-center">
                <p className="text-sm text-[#999]">{savedAddress ? savedAddress.direccion : 'No hay direcciones registradas'}</p>
              </div>
            </div>

            <button 
              onClick={() => { setIsProfileOpen(false); setIsAddressModalOpen(true); }}
              className="w-full bg-black text-white rounded-full h-12 font-bold text-sm flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all"
            >
              + Agregar Dirección
            </button>

            <div className="flex justify-center pt-2">
              <button onClick={() => setIsProfileOpen(false)} className="px-6 py-2 text-sm font-medium text-[#666] border border-neutral-300 rounded-full bg-white hover:bg-neutral-50 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER MODAL */}
      {selectedProduct && (
        <RestauranteProductModal 
           product={selectedProduct}
           storeId={perfil.id}
           isOpen={true}
           onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* RENDER FULLSCREEN CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <RestauranteCheckoutModal
           isOpen={isCheckoutOpen}
           onClose={() => setIsCheckoutOpen(false)}
           perfil={perfil}
           savedAddress={savedAddress}
           profileData={{ nombre: profileName, telefono: profilePhone, correo: profileEmail }}
           onProfileUpdate={(data) => { setProfileName(data.nombre); setProfilePhone(data.telefono); setProfileEmail(data.correo); }}
        />
      )}

      {/* RENDER ADDRESS MAP MODAL */}
      <AddressMapModal
         isOpen={isAddressModalOpen}
         onClose={() => setIsAddressModalOpen(false)}
         onSave={handleAddressSaved}
      />

      {/* RENDER SLIDE OVER CART */}
      <SlideOverCart 
         storeId={perfil.id} 
         isOpen={isCartOpen} 
         onClose={() => setIsCartOpen(false)}
         onCheckout={handleOpenCheckout}
         templateType="restaurante"
      />

      {/* ORDER HISTORY PANEL */}
      <OrderHistoryPanel
         isOpen={isOrderHistoryOpen}
         onClose={() => setIsOrderHistoryOpen(false)}
         storeId={perfil.id}
         storeLat={(perfil as any).store_lat ?? null}
         storeLng={(perfil as any).store_lng ?? null}
         whatsappPhone={(perfil as any).whatsapp_phone ?? null}
      />
    </div>
  )
}
