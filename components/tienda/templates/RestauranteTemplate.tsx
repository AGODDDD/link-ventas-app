'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Profile, Product } from '@/types/tienda'
import { Search, ShoppingCart, User, ClipboardList, MapPin, Clock3, Bike, Store, MessageCircle, Sparkles, ChevronRight, House, List, Info, FileText, CircleHelp, Instagram, Plus } from 'lucide-react'
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
  const heroImage = perfil.banner_url || perfil.hero_image_url
  const preparationTime = perfil.operations_config?.defaultPreparationTime || '30–45 min'
  const deliveryEnabled = perfil.operations_config?.deliveryEnabled !== false
  const pickupEnabled = perfil.operations_config?.pickupEnabled === true
  const totalPrice = cartStore.getTotalPrice(perfil.id)

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
    <div className="min-h-screen bg-[#f8f7f5] font-body pt-[60px] text-[#241d19]">
      <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between bg-black px-3 shadow-md">
        <div className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-4">
          {perfil.avatar_url ? <img src={perfil.avatar_url} alt="Logo" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17120f] text-sm font-black text-white">{perfil.store_name?.charAt(0) || 'R'}</span>}
          <span className="text-sm font-bold text-neutral-700">{perfil.store_name || 'Restaurante'}</span>
        </div>
        <button aria-label="Buscar" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"><Search size={17} /></button>
      </header>

      <aside className="fixed bottom-0 left-0 top-[60px] z-40 hidden w-[290px] flex-col overflow-y-auto bg-[linear-gradient(160deg,#11100f,#26211d)] text-white md:flex">
        <div className="flex flex-col items-center px-5 pb-5 pt-7 text-center">
          {perfil.avatar_url ? <img src={perfil.avatar_url} alt="Logo" className="h-20 w-20 rounded-full object-cover shadow-lg" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 text-3xl font-black">{perfil.store_name?.charAt(0) || 'R'}</span>}
          <h1 className="mt-3 font-serif text-3xl font-semibold tracking-wide">{perfil.store_name || 'Tu restaurante'}</h1>
          {perfil.description && <p className="mt-2 max-w-[220px] text-xs leading-5 text-white/65">{perfil.description}</p>}
        </div>
        <div className="mx-4 rounded-2xl bg-white px-4 py-4 text-left text-[#2b2622] shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Entregar a</p>
          <button onClick={handleOpenAddressFromSidebar} className="mt-2 flex w-full items-center gap-2 text-left"><MapPin size={17} className="shrink-0 text-[#a8522d]" /><span className="truncate text-sm font-bold">{savedAddress ? savedAddress.direccion : 'Elige tu ubicación'}</span><ChevronRight size={15} className="ml-auto text-neutral-400" /></button>
          <button onClick={handleOpenAddressFromSidebar} className="mt-3 text-xs font-semibold text-[#bf5b32]">Cambiar ubicación</button>
        </div>
        <nav className="mt-5 space-y-2 px-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex w-full items-center gap-3 rounded-xl bg-[#bd572f] px-4 py-3.5 text-sm font-bold shadow-[0_8px_20px_rgba(189,87,47,0.24)]"><House size={19} /> Inicio</button>
          <button onClick={() => catNames[0] && handleScrollToCategory(catNames[0])} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"><List size={19} /> Menú</button>
        </nav>
        {perfil.whatsapp_phone && <div className="mx-4 mt-8 rounded-2xl border border-white/5 bg-white/[0.06] p-4"><p className="font-serif text-lg font-semibold leading-5">¿Tienes un antojo especial?</p><p className="mt-2 text-xs text-white/55">Escríbenos por WhatsApp</p><a href={`https://wa.me/${perfil.whatsapp_phone}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#2a9e5d] px-3 py-2 text-xs font-bold"><MessageCircle size={14} /> WhatsApp</a></div>}
        <div className="mt-auto border-t border-white/10 px-5 py-5 text-xs text-white/45"><button className="flex items-center gap-2 py-2"><Info size={14} /> Sobre nosotros</button><button className="flex items-center gap-2 py-2"><FileText size={14} /> Términos y condiciones</button><button className="flex items-center gap-2 py-2"><CircleHelp size={14} /> Preguntas frecuentes</button><div className="mt-3 flex gap-4"><Instagram size={16} /><button onClick={() => setIsProfileOpen(true)}><User size={16} /></button><button onClick={() => setIsOrderHistoryOpen(true)}><ClipboardList size={16} /></button></div></div>
      </aside>

      <div className="md:hidden"><div className="relative overflow-hidden bg-[#201713] px-5 pb-5 pt-7 text-white"><img src={heroImage || '/images/restaurant-hero-default-v1.png'} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" /><div className="absolute inset-0 bg-gradient-to-r from-[#201713] via-[#201713]/85 to-[#201713]/30" /><div className="relative"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5b894]">Pide directo</p><h1 className="mt-2 font-serif text-3xl">{perfil.store_name || 'Tu restaurante'}</h1><button onClick={handleOpenAddressFromSidebar} className="mt-4 flex items-center gap-2 text-xs font-semibold text-white/75"><MapPin size={14} /> {savedAddress ? savedAddress.direccion : 'Elige tu ubicación'}</button></div></div></div>

      <main className="md:ml-[290px]">
        <section className="relative min-h-[250px] overflow-hidden bg-[#20130f] px-6 py-9 text-white sm:min-h-[285px] md:px-10">
              <img src={heroImage || '/images/restaurant-hero-default-v1.png'} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65" />
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

          <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-7 md:px-9">
            {catNames.length > 1 && <div className="flex gap-3 overflow-x-auto pb-6 hide-scrollbar">{catNames.map((cat) => <button key={cat} onClick={() => handleScrollToCategory(cat)} className={`shrink-0 rounded-full border px-5 py-2.5 text-xs font-bold transition-all ${activeCategory === cat ? 'border-[#bd572f] bg-[#bd572f] text-white shadow-md' : 'border-[#e7dfd9] bg-white text-neutral-600 hover:border-[#bd572f]/40'}`}>{cat}</button>)}</div>}

            {productos.length > 1 && <section className="mb-9"><div className="mb-5"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#bd572f]"><Sparkles size={14} /> Para pedir ahora</p><h2 className="mt-2 font-serif text-3xl font-semibold">Favoritos del menú</h2><p className="mt-1 text-xs text-neutral-500">Nuestros platos más pedidos, preparados al momento.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{productos.slice(0, 4).map((item) => <button key={`featured-${item.id}`} onClick={() => setSelectedProduct(item)} className="group overflow-hidden rounded-xl border border-[#e9e2dc] bg-white text-left shadow-[0_5px_16px_rgba(44,30,20,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(44,30,20,0.12)]"><div className="relative aspect-[16/10] overflow-hidden bg-[#eee9e4]">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs font-bold text-neutral-400">Sin foto</div>}<span className="absolute left-3 top-3 rounded-full bg-[#5b3716]/90 px-3 py-1 text-[10px] font-bold text-white">Más pedido</span></div><div className="p-3"><h3 className="line-clamp-1 text-sm font-bold">{item.name}</h3><p className="mt-1 line-clamp-2 min-h-9 text-xs leading-4 text-neutral-500">{item.description || 'Disponible para pedir ahora.'}</p><div className="mt-3 flex items-center justify-between text-[#bd572f]"><strong className="text-sm">S/ {item.price.toFixed(2)}</strong><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#bd572f] text-white"><Plus size={16} /></span></div></div></button>)}</div></section>}

            <section className="mb-8 grid overflow-hidden rounded-xl border border-[#e7dfd9] bg-white sm:grid-cols-3"><div className="flex items-center gap-3 border-b border-[#eee7e2] p-4 sm:border-b-0 sm:border-r"><Bike size={19} className="text-[#bd572f]" /><div><p className="text-xs font-bold">{deliveryEnabled ? 'Delivery disponible' : 'Recojo disponible'}</p><p className="text-[11px] text-neutral-500">{deliveryFee > 0 ? `Envío desde S/ ${deliveryFee.toFixed(2)}` : 'Coordina tu pedido fácilmente'}</p></div></div><div className="flex items-center gap-3 border-b border-[#eee7e2] p-4 sm:border-b-0 sm:border-r"><Clock3 size={19} className="text-[#bd572f]" /><div><p className="text-xs font-bold">Preparado al momento</p><p className="text-[11px] text-neutral-500">Tiempo estimado: {preparationTime}</p></div></div><div className="flex items-center gap-3 p-4"><Store size={19} className="text-[#bd572f]" /><div><p className="text-xs font-bold">Compra con confianza</p><p className="text-[11px] text-neutral-500">Pagos y atención directa</p></div></div></section>

            {catNames.map((categoria) => <section key={categoria} id={categoria} className="mb-12 scroll-mt-24"><div className="mb-5 flex items-end justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#bd572f]">Menú</p><h2 className="mt-1 font-serif text-3xl font-semibold">{productos.length === 1 ? categoria : `Explora ${categoria}`}</h2></div></div><div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${categorias[categoria].length === 1 ? 'w-full max-w-[280px]' : ''}`} style={categorias[categoria].length === 1 ? { gridTemplateColumns: 'minmax(0, 280px)' } : undefined}>{categorias[categoria].map((item) => <button key={item.id} onClick={() => setSelectedProduct(item)} className="group w-full overflow-hidden rounded-xl border border-[#e9e2dc] bg-white text-left shadow-[0_5px_16px_rgba(44,30,20,0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(44,30,20,0.12)]"><div className="relative aspect-[16/10] overflow-hidden bg-[#eee9e4]">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-xs font-bold text-neutral-400">Sin foto</div>}{item.is_available === false && <div className="absolute inset-0 flex items-center justify-center bg-black/45"><span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold">AGOTADO</span></div>}</div><div className="p-3"><h3 className="line-clamp-1 text-sm font-bold">{item.name}</h3><p className="mt-1 line-clamp-2 min-h-9 text-xs leading-4 text-neutral-500">{item.description || 'Disponible para pedir ahora.'}</p><div className="mt-3 flex items-center justify-between text-[#bd572f]"><strong className="text-sm">S/ {item.price.toFixed(2)}</strong><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#bd572f] text-white"><Plus size={16} /></span></div></div></button>)}</div></section>)}

            <footer className="border-t border-[#e7dfd9] py-8 text-center"><PaymentTrustBadges mercadopagoActive={perfil.mercadopago_active === true} className="mx-auto mb-4 text-neutral-800" /><p className="text-xs text-neutral-500">© {new Date().getFullYear()} {perfil.store_name || 'Restaurante'}. Todos los derechos reservados.</p></footer>
          </div>
      </main>

      {!isReadOnly && <><button onClick={() => setIsCartOpen(true)} aria-label="Abrir carrito" className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-[#201713] py-3 pl-4 pr-5 text-white shadow-xl md:hidden"><span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#bd572f]"><ShoppingCart size={18} />{mounted && totalItems > 0 && <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#201713]">{totalItems}</span>}</span><span className="text-left text-sm font-bold">Ver carrito</span></button><aside className="fixed bottom-5 right-5 z-50 hidden w-[300px] rounded-[24px] border border-[#e8e0da] bg-white p-5 shadow-[0_16px_44px_rgba(44,30,20,0.18)] md:block"><button onClick={() => setIsCartOpen(true)} className="w-full text-left"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5e4dc] text-[#bd572f]"><ShoppingCart size={20} /></span><div><p className="font-bold">Tu pedido {totalItems > 0 && <span className="ml-1 rounded-full bg-[#bd572f] px-2 py-0.5 text-xs text-white">{totalItems}</span>}</p><p className="text-xs text-neutral-500">{totalItems > 0 ? `${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}` : 'Aún no agregas productos'}</p></div></div><div className="my-4 border-t border-[#eee7e2]" />{totalItems > 0 ? <><div className="flex justify-between text-sm font-bold"><span>Total</span><span>S/ {totalPrice.toFixed(2)}</span></div><span className="mt-4 block rounded-xl bg-[#bd572f] py-3 text-center text-sm font-bold text-white">Ver carrito</span></> : <span className="block rounded-xl border border-[#e8e0da] py-3 text-center text-sm font-bold text-[#bd572f]">Explora el menú</span>}</button></aside></>}

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
