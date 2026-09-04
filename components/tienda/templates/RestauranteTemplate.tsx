'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Profile, Product } from '@/types/tienda'
import { Search, ShoppingCart, User, ClipboardList, MapPin, Clock3, Bike, Store, MessageCircle, Sparkles, ChevronRight } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { useCustomerStore } from '@/store/useCustomerStore'
import RestauranteProductModal from './RestauranteProductModal'
import RestauranteCheckoutModal from './RestauranteCheckoutModal'
import AddressMapModal from './AddressMapModal'
import OrderHistoryPanel from './OrderHistoryPanel'
import PaymentTrustBadges from './PaymentTrustBadges'
import SlideOverCart from '../SlideOverCart'
import { isStoreClosed, getTodayScheduleText, shouldEnforceStoreSchedule } from '@/lib/storeSchedule'

interface Props {
  perfil: Profile;
  productos: Product[];
  extensionData?: {
    deliverySettings?: any;
    menuCategories?: any[];
  };
  isReadOnly?: boolean;
}

export default function RestauranteTemplate({ perfil, productos, extensionData, isReadOnly }: Props) {
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
  const configuredDeliveryFee = Number(extensionData?.deliverySettings?.base_delivery_fee)
  const deliveryFee = Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee > 0 ? configuredDeliveryFee : 0
  const storeIsClosed = shouldEnforceStoreSchedule(perfil.operations_config?.acceptsOrdersAlways)
    && isStoreClosed(perfil.store_schedule ?? null)
  const heroImage = perfil.banner_url || perfil.hero_image_url || productos.find((product) => product.image_url)?.image_url
  const preparationTime = perfil.operations_config?.defaultPreparationTime || '30–45 min'
  const deliveryEnabled = perfil.operations_config?.deliveryEnabled !== false
  const pickupEnabled = perfil.operations_config?.pickupEnabled === true

  useEffect(() => {
    setMounted(true)
    // Saneamiento: Limpiar pedidos UUID (huérfanos de pruebas fallidas)
    if (customerStore.orders.some(o => o.id.length > 20)) {
        console.log('🧹 Limpiando historial de pruebas (UUIDs)...')
        const cleanOrders = customerStore.orders.filter(o => o.id.length <= 20)
        useCustomerStore.setState({ orders: cleanOrders })
    }
  }, [customerStore.orders])

  // Agrupar platos por categoría (Priorizando Extensiones)
  const categorias = useMemo(() => {
    // Si tenemos categorías reales de la extensión 'menu_categories'
    if (extensionData?.menuCategories && extensionData.menuCategories.length > 0) {
      const grouped: Record<string, Product[]> = {};
      extensionData.menuCategories.forEach(cat => {
        grouped[cat.name] = productos.filter(p => p.category === cat.name);
      });
      // Agregar productos sin categoría asignada en 'Otros'
      const assignedNames = extensionData.menuCategories.map(c => c.name);
      const others = productos.filter(p => !assignedNames.includes(p.category || ''));
      if (others.length > 0) grouped['Otros'] = others;
      return grouped;
    }

    // Fallback: Agrupamiento automático por string
    return productos.reduce((acc: Record<string, Product[]>, item) => {
      const cat = item.category || 'Otros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  }, [productos, extensionData]);

  const catNames = Object.keys(categorias);
  useEffect(() => {
    if (catNames.length > 0 && !activeCategory) setActiveCategory(catNames[0])
  }, [activeCategory, catNames])

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

          {/* Floating Address Card */}
          <div className="relative -mt-10 px-4 z-10 w-full">
            <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Entregar en</p>
              <p className="mt-1 truncate text-sm font-bold text-neutral-900">
                {savedAddress ? savedAddress.direccion : 'Elige tu ubicación'}
              </p>
              <button onClick={handleOpenAddressFromSidebar} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#b94e28] transition-colors hover:text-[#8f3518]">
                <MapPin size={14} /> {savedAddress ? 'Cambiar ubicación' : 'Agregar ubicación'} <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* ── Aviso CERRADO — debajo de la tarjeta, limpio y centrado ── */}
          {storeIsClosed && (
            <div className="mx-4 mt-4">
              <div className="bg-white border border-red-200 rounded-2xl px-5 py-4 text-center shadow-sm">
                <p className="text-[22px] mb-1">🔒</p>
                <p className="font-bold text-[15px] text-[#111] leading-snug">
                  Lo sentimos, nuestra tienda se encuentra cerrada.
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  {getTodayScheduleText(perfil.store_schedule ?? null) === 'Cerrado hoy'
                    ? 'Hoy no tenemos servicio de delivery.'
                    : `Nuestro horario de hoy es de ${getTodayScheduleText(perfil.store_schedule ?? null).replace(' - ', ' a ')}.`
                  }
                </p>
              </div>
            </div>
          )}
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
         <div className="space-y-10">
            <section className="relative min-h-[310px] overflow-hidden rounded-[28px] bg-[#20130f] px-6 py-8 text-white shadow-[0_24px_70px_rgba(32,19,15,0.22)] sm:min-h-[340px] sm:px-10 sm:py-10">
              {heroImage ? (
                <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_25%,rgba(219,101,54,0.72),transparent_35%),radial-gradient(circle_at_90%_100%,rgba(247,191,99,0.36),transparent_45%)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#160d0b] via-[#160d0b]/80 to-[#160d0b]/10" />
              <div className="relative flex h-full max-w-xl flex-col justify-end">
                <div className="mb-5 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold backdrop-blur-xl ${storeIsClosed ? 'border-red-200/25 bg-red-500/20 text-red-100' : 'border-emerald-200/25 bg-emerald-400/15 text-emerald-100'}`}>
                    <span className={`h-2 w-2 rounded-full ${storeIsClosed ? 'bg-red-300' : 'bg-emerald-300 animate-pulse'}`} />
                    {storeIsClosed ? 'Cerrado por ahora' : 'Abierto ahora'}
                  </span>
                  {(deliveryEnabled || pickupEnabled) && <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-xl"><Bike size={14} /> {deliveryEnabled && pickupEnabled ? 'Delivery y recojo' : deliveryEnabled ? 'Delivery disponible' : 'Recojo disponible'}</span>}
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-xl"><Clock3 size={14} /> {preparationTime}</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffbf8a]">Pide directo al restaurante</p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-5xl">{perfil.store_name || 'Tu restaurante'}</h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/75 sm:text-base">{perfil.description || 'Platos preparados al momento, ingredientes frescos y un pedido simple de principio a fin.'}</p>
                <button onClick={() => catNames[0] && handleScrollToCategory(catNames[0])} className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#df6438] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(223,100,56,0.38)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#ef7549] active:scale-95">
                  Ver el menú <ChevronRight size={17} />
                </button>
              </div>
            </section>

            <section className="grid gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-3">
              <div className="flex items-center gap-3 bg-white px-4 py-4"><Bike className="text-[#c6532b]" size={20} /><div><p className="text-xs font-bold text-neutral-900">{deliveryEnabled ? 'Delivery disponible' : 'Recojo en tienda'}</p><p className="mt-0.5 text-[11px] text-neutral-500">{deliveryFee > 0 ? `Envío desde S/ ${deliveryFee.toFixed(2)}` : 'Coordina tu pedido fácilmente'}</p></div></div>
              <div className="flex items-center gap-3 bg-white px-4 py-4"><Clock3 className="text-[#c6532b]" size={20} /><div><p className="text-xs font-bold text-neutral-900">Preparado al momento</p><p className="mt-0.5 text-[11px] text-neutral-500">Tiempo estimado: {preparationTime}</p></div></div>
              <div className="flex items-center gap-3 bg-white px-4 py-4"><Store className="text-[#c6532b]" size={20} /><div><p className="text-xs font-bold text-neutral-900">Compra con confianza</p><p className="mt-0.5 text-[11px] text-neutral-500">Pagos y atención directa</p></div></div>
            </section>

            {catNames.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {catNames.map((cat) => <button key={cat} onClick={() => handleScrollToCategory(cat)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all duration-300 active:scale-95 ${activeCategory === cat ? 'border-[#c6532b] bg-[#c6532b] text-white shadow-[0_8px_20px_rgba(198,83,43,0.22)]' : 'border-neutral-200 bg-white text-neutral-600 hover:border-[#c6532b]/35 hover:text-[#a94320]'}`}>{cat}</button>)}
            </div>}

            {productos.length > 0 && <section>
              <div className="mb-5 flex items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c6532b]"><Sparkles size={14} /> Para pedir ahora</p><h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-neutral-900">Favoritos del menú</h2></div><button onClick={() => catNames[0] && handleScrollToCategory(catNames[0])} className="hidden items-center gap-1 text-xs font-bold text-[#b94e28] sm:inline-flex">Ver todo <ChevronRight size={15} /></button></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {productos.slice(0, 4).map((item) => <button key={`featured-${item.id}`} onClick={() => setSelectedProduct(item)} className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(15,23,42,0.12)] active:scale-[0.99]"><div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-widest text-neutral-400">Próximamente</div>}<span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-black text-neutral-900 shadow-sm">S/ {item.price.toFixed(2)}</span></div><div className="p-4"><h3 className="line-clamp-1 text-sm font-bold text-neutral-900">{item.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">{item.description || 'Preparado especialmente para ti.'}</p></div></button>)}
              </div>
            </section>}
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
                <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5 ${categorias[categoria].length === 1 ? 'max-w-sm' : ''}`}>
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

      <footer className="md:ml-[320px] lg:ml-[350px] px-4 pb-28 pt-4 text-center text-neutral-500">
        <PaymentTrustBadges mercadopagoActive={perfil.mercadopago_active === true} className="mx-auto mb-6 text-neutral-800" />
        <div className="flex flex-col items-center gap-3"><p className="text-xs">© {new Date().getFullYear()} {perfil.store_name || 'Restaurante'}. Todos los derechos reservados.</p>{perfil.whatsapp_phone && <a href={`https://wa.me/${perfil.whatsapp_phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-[#b94e28] transition-colors hover:text-[#8f3518]"><MessageCircle size={15} /> ¿Necesitas ayuda con tu pedido?</a>}</div>
      </footer>

      {/* FLOATING CART BUBBLE BUTTON */}
      {!isReadOnly && (
      <button
        onClick={() => setIsCartOpen(true)}
        aria-label="Abrir carrito"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-[#17110f] py-3 pl-4 pr-5 text-white shadow-[0_16px_38px_rgba(23,17,15,0.30)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(23,17,15,0.38)] active:scale-95"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#df6438]">
          <ShoppingCart size={20} className="text-white" strokeWidth={2} />
          {mounted && totalItems > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#17110f] shadow-md">
              {totalItems}
            </span>
          )}
        </span>
        <span className="text-left"><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Tu pedido</span><span className="block text-sm font-bold">Ver carrito</span></span>
      </button>
      )}

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
           isReadOnly={isReadOnly}
        />
      )}

      {/* RENDER FULLSCREEN CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <RestauranteCheckoutModal
           isOpen={isCheckoutOpen}
           onClose={() => setIsCheckoutOpen(false)}
           onSuccess={() => {
              setIsCheckoutOpen(false);
              setIsOrderHistoryOpen(true);
           }}
           perfil={perfil}
           deliveryFee={deliveryFee}
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
