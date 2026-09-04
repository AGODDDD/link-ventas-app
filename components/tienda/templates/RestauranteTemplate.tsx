'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Profile, Product } from '@/types/tienda'
import {
  Search,
  ShoppingCart,
  MapPin,
  ChevronDown,
  Home,
  Info,
  FileLock,
  HelpCircle,
  ShoppingBag,
  Plus,
  X,
  ChefHat,
} from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { useCustomerStore } from '@/store/useCustomerStore'
import RestauranteProductModal from './RestauranteProductModal'
import RestauranteCheckoutModal from './RestauranteCheckoutModal'
import AddressMapModal from './AddressMapModal'
import OrderHistoryPanel from './OrderHistoryPanel'
import SlideOverCart from '../SlideOverCart'
import PaymentTrustBadges from './PaymentTrustBadges'
import { isStoreClosed, getTodayScheduleText, shouldEnforceStoreSchedule } from '@/lib/storeSchedule'

interface Props {
  perfil: Profile
  productos: Product[]
  extensionData?: {
    deliverySettings?: any
    menuCategories?: any[]
  }
  isReadOnly?: boolean
}

export default function RestauranteTemplate({ perfil, productos, extensionData, isReadOnly }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('Combos')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCartWidgetDismissed, setIsCartWidgetDismissed] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false)
  const [activeInfoModal, setActiveInfoModal] = useState<'about' | 'terms' | 'faq' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  // Customer Data
  const customerStore = useCustomerStore()
  const savedAddress = customerStore.savedAddress
  const profileName = customerStore.profile.nombre
  const profilePhone = customerStore.profile.telefono
  const profileEmail = customerStore.profile.correo

  // Cart Data
  const cartStore = useCartStore()
  const cart = cartStore.carts[perfil.id] || []
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)
  const cartTotalPrice = cartStore.getTotalPrice(perfil.id)

  const [mounted, setMounted] = useState(false)
  const configuredDeliveryFee = Number(extensionData?.deliverySettings?.base_delivery_fee)
  const deliveryFee = Number.isFinite(configuredDeliveryFee) && configuredDeliveryFee > 0 ? configuredDeliveryFee : 0
  const storeIsClosed = shouldEnforceStoreSchedule(perfil.operations_config?.acceptsOrdersAlways)
    && isStoreClosed(perfil.store_schedule ?? null)
  const accentColor = perfil.primary_color || '#B8502E'
  const deliveryEnabled = perfil.operations_config?.deliveryEnabled !== false
  const pickupEnabled = perfil.operations_config?.pickupEnabled === true
  const serviceLabel = deliveryEnabled && pickupEnabled
    ? 'Delivery y recojo'
    : deliveryEnabled
      ? 'Delivery disponible'
      : pickupEnabled
        ? 'Recojo en tienda'
        : null
  const prepTime = perfil.operations_config?.defaultPreparationTime
  const storeAddress = perfil.store_address || perfil.direccion
  const heroImage = perfil.hero_image_url || perfil.banner_url || perfil.avatar_url

  useEffect(() => {
    setMounted(true)
  }, [])

  // Agrupamiento por categorías
  const categorias = useMemo(() => {
    if (extensionData?.menuCategories && extensionData.menuCategories.length > 0) {
      const grouped: Record<string, Product[]> = {}
      extensionData.menuCategories.forEach(cat => {
        const matching = productos.filter(p => p.category === cat.name)
        if (matching.length > 0) {
          grouped[cat.name] = matching
        }
      })
      const assignedNames = extensionData.menuCategories.map(c => c.name)
      const others = productos.filter(p => !assignedNames.includes(p.category || ''))
      if (others.length > 0) grouped['Otros'] = others
      return grouped
    }

    return productos.reduce((acc: Record<string, Product[]>, item) => {
      const cat = item.category || 'Otros'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
  }, [productos, extensionData])

  const catNames = Object.keys(categorias)

  useEffect(() => {
    if (catNames.length > 0 && !catNames.includes(activeCategory)) {
      setActiveCategory(catNames[0])
    }
  }, [catNames, activeCategory])

  const handleScrollToCategory = (catName: string) => {
    setActiveCategory(catName)
    const element = document.getElementById(catName)
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 90
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
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

  const handleQuickAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation()
    cartStore.addToCart(perfil.id, product)
    setIsCartWidgetDismissed(false)
  }

  const setProfileName = (v: string) => customerStore.setProfile({ nombre: v })
  const setProfilePhone = (v: string) => customerStore.setProfile({ telefono: v })
  const setProfileEmail = (v: string) => customerStore.setProfile({ correo: v })

  const whatsappPhone = perfil.whatsapp_phone?.replace(/[^0-9]/g, '') || ''
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=Hola%20${encodeURIComponent(perfil.store_name || '')},%20quisiera%20hacer%20una%20consulta`
    : null

  // 4 platos destacados para "Favoritos del menú"
  const featuredProducts = useMemo(() => {
    return productos.slice(0, 4)
  }, [productos])

  // Filtrado por búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    return productos.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
  }, [productos, searchQuery])

  return (
    <div className="min-h-screen bg-[#F5F6F8] font-body flex flex-col relative pt-[60px] select-text" style={{ '--restaurant-accent': accentColor } as React.CSSProperties}>
      
      {/* ── 1. GLOBAL TOP NAVBAR ── */}
      <header className="fixed top-0 left-0 w-full h-[60px] bg-black flex items-center justify-between px-4 z-50 shadow-md">
        {/* Left Pill (Nueva tienda / Store Name) */}
        <div className="flex items-center gap-2.5 bg-white rounded-full pl-1.5 pr-4 py-1 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm tracking-wide">
            {perfil.store_name?.charAt(0) || 'R'}
          </div>
          <span className="font-bold text-sm text-[#222] tracking-normal">
            {perfil.store_name || 'Restaurante'}
          </span>
        </div>

        {/* Right Search Button */}
        <div className="flex items-center gap-3">
          {isSearchOpen ? (
            <div className="flex items-center bg-white/10 rounded-full px-3 py-1 border border-white/20">
              <Search size={15} className="text-white/70 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar platos o bebidas..."
                className="bg-transparent text-white text-xs placeholder:text-white/50 outline-none w-48 sm:w-64"
                autoFocus
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-white/70 hover:text-white text-xs ml-1">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Buscar"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <Search size={17} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </header>

      {/* ── 2. DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-[300px] lg:w-[320px] bg-[#111315] text-white fixed top-[60px] left-0 h-[calc(100vh-60px)] z-40 border-r border-white/5 overflow-y-auto custom-scrollbar p-4 justify-between">
        
        {/* Top Group */}
        <div className="space-y-4">
          {/* Logo / Emblem */}
          <div className="py-2">
            <RestaurantWordmark storeName={perfil.store_name} accentColor={accentColor} />
          </div>

          {/* Floating Address Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm text-neutral-800 border border-neutral-100 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
              <MapPin size={13} className="text-neutral-500 shrink-0" />
              <span>Entregar a</span>
            </div>
            <div className="flex items-center justify-between text-[13px] font-bold text-neutral-900 leading-snug cursor-pointer" onClick={handleOpenAddressFromSidebar}>
              <span className="truncate pr-2">
                {savedAddress ? savedAddress.direccion : 'Agrega tu dirección de entrega'}
              </span>
              <ChevronDown size={14} className="text-neutral-500 shrink-0" />
            </div>
            <button
              onClick={handleOpenAddressFromSidebar}
              className="text-[11px] font-semibold hover:underline text-left mt-0.5 cursor-pointer"
              style={{ color: accentColor }}
            >
              Cambiar ubicación
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="space-y-1.5 pt-1">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--restaurant-accent)] text-white font-medium text-sm shadow-sm transition-all hover:brightness-95 cursor-pointer"
            >
              <Home size={18} />
              <span>Inicio</span>
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('menu-section') || document.getElementById(catNames[0])
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white hover:bg-white/5 font-medium text-sm transition-all cursor-pointer select-none"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white shrink-0">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              <span className="text-white font-medium text-sm">Menú</span>
            </button>
          </nav>

          {whatsappUrl && (
            <div className="bg-[#1E2024] rounded-2xl p-4 shadow-md overflow-hidden mt-3">
              <div className="flex-1 min-w-0">
              <p
                className="font-serif font-bold text-white text-[14.5px] leading-tight tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                  ¿Tienes una consulta<br />sobre tu pedido?
              </p>
              <p className="text-[11px] text-[#9CA3AF] leading-tight mt-1 mb-2 font-normal">
                Escríbenos por WhatsApp
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#174128] hover:bg-[#1c4e30] text-[#34D399] px-3.5 py-1.5 rounded-full transition-all active:scale-95 shadow-sm"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366" className="shrink-0">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.586 1.761.907 2.791.907 3.181 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.766-5.768-5.766zm3.389 8.243c-.144.405-.837.774-1.17.824-.312.045-.634.07-1.782-.406-1.464-.608-2.386-2.107-2.459-2.204-.073-.098-.592-.787-.592-1.501 0-.714.373-1.066.505-1.213.133-.146.29-.182.387-.182s.193.003.277.008c.089.005.207-.034.323.245.12.29.41 1.002.446 1.075.036.073.06.158.012.255-.048.098-.073.158-.145.242-.073.085-.153.19-.219.255-.073.073-.149.153-.064.298.085.146.377.621.809 1.006.557.496 1.026.65 1.171.722.145.073.23-.012.315-.11.085-.097.362-.423.459-.569.096-.146.193-.122.326-.073.133.048.845.399.99.471.145.073.241.11.277.17.036.06.036.35-.108.755z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.556 4.122 1.543 5.867L.117 24l6.27-1.644C8.067 23.243 9.987 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.87 0-3.61-.504-5.111-1.381l-.367-.216-3.804.997 1.016-3.708-.238-.379C2.537 15.77 2 13.944 2 12 2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                </svg>
                <span className="text-[#34D399] font-medium text-xs">WhatsApp</span>
              </a>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Group (1:1 con la captura) */}
        <div className="pt-6 space-y-4">
          <button onClick={() => setActiveInfoModal('about')} className="flex items-center gap-3 text-xs text-[#9CA3AF] hover:text-white transition-colors py-0.5 cursor-pointer w-full text-left">
            <Info size={15} className="text-[#9CA3AF] shrink-0" />
            <span>Sobre nosotros</span>
          </button>
          <button onClick={() => setActiveInfoModal('terms')} className="flex items-center gap-3 text-xs text-[#9CA3AF] hover:text-white transition-colors py-0.5 cursor-pointer w-full text-left">
            <FileLock size={15} className="text-[#9CA3AF] shrink-0" />
            <span>Términos y condiciones</span>
          </button>
          <button onClick={() => setActiveInfoModal('faq')} className="flex items-center gap-3 text-xs text-[#9CA3AF] hover:text-white transition-colors py-0.5 cursor-pointer w-full text-left">
            <HelpCircle size={15} className="text-[#9CA3AF] shrink-0" />
            <span>Preguntas frecuentes</span>
          </button>

          {/* Social Icons - Centered with spacious gap */}
          {(perfil.social_instagram || perfil.social_facebook || perfil.social_tiktok) && (
            <div className="flex items-center justify-center gap-8 text-[#9CA3AF] pt-6 pb-2">
            {perfil.social_instagram && <a href={`https://instagram.com/${perfil.social_instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            </a>}
            {perfil.social_facebook && <a href={normalizeFacebookUrl(perfil.social_facebook)} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>}
            {perfil.social_tiktok && <a href={`https://tiktok.com/@${perfil.social_tiktok.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="TikTok">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.068-.102a2.895 2.895 0 0 1 2.37-4.536c.307 0 .604.049.882.138V9.387a6.34 6.34 0 0 0-.882-.062 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.528a8.214 8.214 0 0 0 4.774 1.514v-3.356Z"/>
              </svg>
            </a>}
          </div>
          )}
        </div>
      </aside>

      {/* ── MOBILE HEADER / BANNER SUPPORT ── */}
      <div className="md:hidden bg-[#111315] text-white p-4">
        <div className="flex items-center justify-between">
          <RestaurantWordmark storeName={perfil.store_name} accentColor={accentColor} />
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-neutral-800 mt-4 flex items-center justify-between" onClick={handleOpenAddressFromSidebar}>
          <div className="flex items-center gap-2">
            <MapPin size={15} style={{ color: accentColor }} />
            <span className="text-xs font-bold truncate max-w-[220px]">
              {savedAddress ? savedAddress.direccion : 'Agrega tu dirección de entrega'}
            </span>
          </div>
          <span className="text-[11px] font-semibold" style={{ color: accentColor }}>Cambiar</span>
        </div>
      </div>

      {/* ── 3. MAIN CONTENT (RIGHT AREA) ── */}
      <main className="flex-1 md:ml-[300px] lg:ml-[320px] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-6xl w-full min-h-[calc(100vh-60px)] pb-32">


        {/* Closed Store Notice */}
        {storeIsClosed && (
          <div className="bg-white border border-red-200 rounded-2xl p-4 text-center shadow-sm">
            <span className="text-xl">🔒</span>
            <p className="font-bold text-sm text-neutral-900 mt-1">Lo sentimos, nuestra tienda se encuentra cerrada.</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {getTodayScheduleText(perfil.store_schedule ?? null) === 'Cerrado hoy'
                ? 'Hoy no tenemos servicio de delivery.'
                : `Nuestro horario de hoy es de ${getTodayScheduleText(perfil.store_schedule ?? null).replace(' - ', ' a ')}.`}
            </p>
          </div>
        )}

        {/* Hero driven by the store identity and its operational settings. */}
        <div className="relative w-full rounded-2xl bg-[#0C0D0E] overflow-hidden shadow-lg border border-neutral-800/80 text-white min-h-[220px] lg:min-h-[250px] flex flex-col lg:flex-row items-center justify-between">
          {/* Left Text */}
          <div className="p-6 sm:p-8 lg:p-10 flex-1 z-20 max-w-xl">
            <h1
              className="text-3xl sm:text-4xl lg:text-[42px] font-serif font-bold tracking-normal text-white leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {perfil.store_name || 'Tu restaurante'}
            </h1>
            <p
              className="font-serif text-xs sm:text-[13.5px] text-[#E5E7EB] max-w-md mt-2.5 leading-relaxed font-normal"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {perfil.description || 'Descubre el menú y realiza tu pedido en pocos pasos.'}
            </p>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2.5 mt-6">
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold select-none shadow-xs ${storeIsClosed ? 'bg-red-950/50 text-red-200 border border-red-400/30' : 'bg-[#0D2619] text-[#86EFAC] border border-[#17522D]'}`}>
                <span className={`w-2 h-2 rounded-full ${storeIsClosed ? 'bg-red-400' : 'bg-[#22C55E]'}`}></span>
                <span>{storeIsClosed ? 'Cerrado ahora' : 'Abierto ahora'}</span>
              </div>

              {serviceLabel && <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 border border-white/15 text-white text-xs font-medium backdrop-blur-md select-none shadow-xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80 shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{serviceLabel}</span>
              </div>}

              {prepTime && <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-xl bg-black/50 border border-white/15 text-white backdrop-blur-md select-none shadow-xs">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80 shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <div className="flex flex-col leading-none py-0.5">
                  <span className="text-xs font-bold text-white tracking-tight">{prepTime}</span>
                  <span className="text-[10px] text-white/60 font-normal mt-0.5">Tiempo estimado</span>
                </div>
              </div>}
            </div>
          </div>

          {/* Business-owned imagery, never a stock identity imposed on a merchant. */}
          <div className="relative w-full lg:w-[52%] h-52 sm:h-60 lg:h-full min-h-[220px] lg:min-h-[250px] flex items-center justify-end overflow-hidden bg-[#16120E]">
            {/* Smooth Left Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#0C0D0E] via-[#0C0D0E]/60 to-transparent z-10 pointer-events-none"></div>

            {heroImage ? <img src={heroImage} alt={`Portada de ${perfil.store_name || 'restaurante'}`} className="absolute inset-0 h-full w-full object-cover" /> : (
              <div className="absolute inset-0 flex items-center justify-center text-center p-8 text-sm text-white/60">Este restaurante aún no agregó una imagen de portada.</div>
            )}
          </div>
        </div>

        {/* ── CATEGORY PILLS HORIZONTAL BAR ── */}
        <div className="w-full overflow-x-auto custom-scrollbar py-1">
          <div className="flex items-center gap-2 min-w-max">
            {catNames.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => handleScrollToCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[var(--restaurant-accent)] text-white shadow-sm hover:brightness-95'
                      : 'bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/80 hover:bg-neutral-50 shadow-2xs'
                  }`}
                >
                  {isActive && <span>★</span>}
                  <span>{cat}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search Results (if searching) */}
        {filteredProducts && (
          <section className="space-y-4">
            <h2 className="text-base font-bold text-neutral-900">
              Resultados para &quot;{searchQuery}&quot; ({filteredProducts.length})
            </h2>
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-neutral-500 py-8 text-center bg-white rounded-2xl">
                No encontramos productos que coincidan con tu búsqueda.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredProducts.map(item => (
                  <ProductCardItem
                    key={item.id}
                    item={item}
                    onSelect={() => setSelectedProduct(item)}
                    onQuickAdd={(e) => handleQuickAddToCart(e, item)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Curated from the merchant's active catalog, without invented sales claims. */}
        {!filteredProducts && (
          <section className="space-y-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base" style={{ color: accentColor }}>★</span>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                  Destacados del menú
                </h2>
              </div>
              <p className="text-xs text-neutral-500 font-light mt-0.5">
                Una selección de platos disponibles para pedir hoy.
              </p>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map((item) => (
                <ProductCardItem
                  key={item.id}
                  item={item}
                  onSelect={() => setSelectedProduct(item)}
                  onQuickAdd={(e) => handleQuickAddToCart(e, item)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Store-safe service and payment information. */}
        <div className="bg-white rounded-2xl border border-neutral-200/70 shadow-xs px-6 py-4 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full xl:w-auto justify-between sm:justify-start">
            {/* 1. Ingredientes frescos */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F3F4F6] border border-neutral-200 flex items-center justify-center text-neutral-800 shrink-0">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <circle cx="12" cy="11" r="3.2"/>
                  <path d="M12 7.8v6.4"/>
                </svg>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold" style={{ color: accentColor }}>Catálogo actualizado</p>
                <p className="text-[11px] text-neutral-500 font-normal mt-0.5">Consulta la disponibilidad de cada plato</p>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden sm:block h-6 w-[1px] bg-neutral-200"></div>

            {/* 2. Delivery/recojo from actual configuration */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-neutral-300 flex items-center justify-center text-neutral-800 shrink-0 shadow-2xs">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="14" height="10" x="5" y="11" rx="2" ry="2"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                </svg>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold" style={{ color: accentColor }}>{serviceLabel || 'Pedidos pausados'}</p>
                <p className="text-[11px] text-neutral-500 font-normal mt-0.5">{storeAddress || 'Confirma la cobertura con el local'}</p>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden sm:block h-6 w-[1px] bg-neutral-200"></div>

            {/* 3. Estimated preparation only when configured */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-neutral-300 flex items-center justify-center text-neutral-800 shrink-0 shadow-2xs">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="13" x="3" y="5.5" rx="2"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                  <circle cx="7" cy="14" r="1" fill="currentColor"/>
                </svg>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold" style={{ color: accentColor }}>{prepTime ? 'Tiempo de preparación' : 'Pedido directo'}</p>
                <p className="text-[11px] text-neutral-500 font-normal mt-0.5">{prepTime || 'El local confirmará el tiempo estimado'}</p>
              </div>
            </div>
          </div>

          {perfil.mercadopago_active && perfil.mercadopago_public_key ? (
            <PaymentTrustBadges mercadopagoActive className="pt-3 xl:pt-0 border-t xl:border-t-0 border-neutral-100 w-full xl:w-auto" />
          ) : (
            <p className="pt-3 xl:pt-0 border-t xl:border-t-0 border-neutral-100 w-full xl:w-auto text-center text-[11px] font-medium text-neutral-500">Los medios de pago se confirman al realizar el pedido.</p>
          )}
        </div>

        {/* ── SECTION: EXPLORA NUESTRO MENÚ ── */}
        <section id="menu-section" className="space-y-6 pt-2">
          <div className="flex items-center gap-2">
            <ChefHat className="text-neutral-700 w-5 h-5" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              Explora nuestro menú
            </h2>
          </div>

          {/* Categorized Products */}
          <div className="space-y-10">
            {catNames.map((cat) => (
              <div key={cat} id={cat} className="space-y-3 scroll-mt-24">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">
                    {cat}
                  </h3>
                  <div className="h-[1px] flex-1 bg-neutral-200"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categorias[cat].map((item) => (
                    <ProductCardItem
                      key={item.id}
                      item={item}
                      onSelect={() => setSelectedProduct(item)}
                      onQuickAdd={(e) => handleQuickAddToCart(e, item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── 4. FLOATING CART CARD ("Tu pedido") ── */}
      {!isReadOnly && mounted && totalItems > 0 && !isCartWidgetDismissed && (
        <div className="fixed bottom-6 right-6 z-40 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-neutral-100 p-4 w-[280px] sm:w-[310px] animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-[#B8502E]" />
              <span className="font-bold text-neutral-900 text-sm">Tu pedido</span>
              <span className="w-5 h-5 rounded-full bg-[#B8502E] text-white text-[11px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            </div>
            <button
              onClick={() => setIsCartWidgetDismissed(true)}
              className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer transition-colors"
              aria-label="Cerrar widget de carrito"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs text-neutral-400 font-light mb-3">
            {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
          </p>

          {/* Price Row */}
          <div className="flex items-center justify-between font-bold text-sm text-neutral-900 mb-3">
            <span>Total</span>
            <span className="text-base">S/ {cartTotalPrice.toFixed(2)}</span>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[var(--restaurant-accent)] hover:brightness-95 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Ver carrito
          </button>

          <p className="text-[11px] text-neutral-400 text-center mt-2">
            Pedido mínimo: S/ {perfil.operations_config?.minOrderAmount ? perfil.operations_config.minOrderAmount.toFixed(2) : '25.00'}
          </p>
        </div>
      )}

      {/* Floating Re-open Button if widget dismissed */}
      {!isReadOnly && mounted && totalItems > 0 && isCartWidgetDismissed && (
        <button
          onClick={() => { setIsCartWidgetDismissed(false); setIsCartOpen(true); }}
          className="fixed bottom-6 right-6 z-40 bg-[var(--restaurant-accent)] text-white p-3.5 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
        >
          <ShoppingCart size={20} />
            <span className="w-5 h-5 rounded-full bg-white text-xs font-bold flex items-center justify-center" style={{ color: accentColor }}>
            {totalItems}
          </span>
        </button>
      )}

      {/* ── 5. MODALS & FLYOUTS ── */}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <RestauranteProductModal
          product={selectedProduct}
          storeId={perfil.id}
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Fullscreen Checkout Modal */}
      {isCheckoutOpen && (
        <RestauranteCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={() => {
            setIsCheckoutOpen(false)
            setIsOrderHistoryOpen(true)
          }}
          perfil={perfil}
          deliveryFee={deliveryFee}
          savedAddress={savedAddress}
          profileData={{ nombre: profileName, telefono: profilePhone, correo: profileEmail }}
          onProfileUpdate={(data) => {
            setProfileName(data.nombre)
            setProfilePhone(data.telefono)
            setProfileEmail(data.correo)
          }}
        />
      )}

      {/* Address Map Modal */}
      <AddressMapModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleAddressSaved}
      />

      {/* Slide-over Cart */}
      <SlideOverCart
        storeId={perfil.id}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleOpenCheckout}
        templateType="restaurante"
      />

      {/* Order History */}
      <OrderHistoryPanel
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
        storeId={perfil.id}
        storeLat={(perfil as any).store_lat ?? null}
        storeLng={(perfil as any).store_lng ?? null}
        whatsappPhone={(perfil as any).whatsapp_phone ?? null}
      />

      {/* Informational Modals (About, Terms, FAQ) */}
      {activeInfoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveInfoModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-neutral-900">
                {activeInfoModal === 'about' && 'Sobre nosotros'}
                {activeInfoModal === 'terms' && 'Términos y condiciones'}
                {activeInfoModal === 'faq' && 'Preguntas frecuentes'}
              </h3>
              <button onClick={() => setActiveInfoModal(null)} className="text-neutral-400 hover:text-neutral-700">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-neutral-600 leading-relaxed max-h-80 overflow-y-auto space-y-2">
              {activeInfoModal === 'about' && (
                <>
                  <p><strong>{perfil.store_name || 'Este restaurante'}</strong>{perfil.description ? `: ${perfil.description}` : ' comparte aquí su menú y opciones de pedido.'}</p>
                  {storeAddress && <p>📍 Dirección: {storeAddress}</p>}
                </>
              )}
              {activeInfoModal === 'terms' && (
                <>
                  <p>Los pedidos están sujetos a la disponibilidad del menú y a la cobertura configurada por el restaurante.</p>
                  {prepTime && <p>El tiempo de preparación informado por el local es de {prepTime}.</p>}
                  <p>Revisa los datos del pedido antes de confirmarlo.</p>
                </>
              )}
              {activeInfoModal === 'faq' && (
                <>
                  {perfil.operations_config?.minOrderAmount && <p><strong>¿Cuál es el pedido mínimo?</strong><br />El pedido mínimo configurado para delivery es S/ {perfil.operations_config.minOrderAmount.toFixed(2)}.</p>}
                  <p><strong>¿Qué medios de pago están disponibles?</strong><br />Los verás al confirmar tu pedido según la configuración del restaurante.</p>
                  {whatsappUrl && <p><strong>¿Tienes una consulta?</strong><br />Puedes escribir directamente al restaurante por WhatsApp.</p>}
                </>
              )}
            </div>

            <button
              onClick={() => setActiveInfoModal(null)}
              className="w-full py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── REUSABLE PRODUCT CARD (Identical to reference) ── */
function ProductCardItem({
  item,
  hasBadge = false,
  onSelect,
  onQuickAdd
}: {
  item: Product
  hasBadge?: boolean
  onSelect: () => void
  onQuickAdd: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onSelect}
      className="group bg-white rounded-2xl border border-neutral-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden relative cursor-pointer"
    >
      {/* Image Container */}
      <div className="aspect-[4/3] relative overflow-hidden bg-neutral-100">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-50 text-xs font-bold uppercase">
            Sin foto
          </div>
        )}

        {/* Optional merchant-controlled badge. */}
        {hasBadge && (
          <div
            className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full shadow-sm z-10 flex items-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          >
            <span
              className="text-white text-[10px] font-semibold tracking-wide"
              style={{ color: '#ffffff' }}
            >
              Más pedido
            </span>
          </div>
        )}

        {/* Unavailable overlay */}
        {item.is_available === false && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center z-10">
            <span className="bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-neutral-900 text-sm leading-snug line-clamp-1 group-hover:text-[#B8502E] transition-colors">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-neutral-500 text-xs leading-snug line-clamp-2 mt-1 min-h-[32px] font-light">
              {item.description}
            </p>
          )}
        </div>

        {/* Bottom Price & Add Action */}
        <div className="flex items-center justify-between pt-3 mt-1">
          <span className="font-bold text-sm" style={{ color: 'var(--restaurant-accent)' }}>
            S/ {item.price.toFixed(2)}
          </span>

          {item.is_available !== false && (
            <button
              onClick={onQuickAdd}
              aria-label={`Agregar ${item.name}`}
              className="w-7 h-7 rounded-full bg-[var(--restaurant-accent)] hover:brightness-95 text-white flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function normalizeFacebookUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://facebook.com/${value.replace(/^@/, '')}`
}

function RestaurantWordmark({ storeName, accentColor }: { storeName?: string; accentColor: string }) {
  const name = storeName || 'Restaurante'

  return (
    <div className="flex flex-col items-center justify-center py-2 text-center select-none">
      <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-lg font-bold text-white shadow-[0_10px_24px_rgba(0,0,0,0.2)]" style={{ boxShadow: `inset 0 0 0 1px ${accentColor}55, 0 10px 24px rgba(0,0,0,0.2)` }}>
        {name.charAt(0).toUpperCase()}
      </div>
      <h2 className="max-w-[250px] text-balance font-serif text-lg font-bold uppercase leading-tight tracking-[0.16em] text-white">
        {name}
      </h2>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-px w-5 bg-white/25" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.25em]" style={{ color: accentColor }}>Menú online</span>
        <span className="h-px w-5 bg-white/25" />
      </div>
    </div>
  )
}
