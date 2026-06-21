'use client'

import React, { FormEvent, useMemo, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ProductMedia, Profile, Product } from '@/types/tienda'
import { useCartStore } from '@/store/useCartStore'
import { useCustomerStore } from '@/store/useCustomerStore'
import SlideOverCart from '@/components/tienda/SlideOverCart'
import OrderHistoryPanel from '@/components/tienda/templates/OrderHistoryPanel'
import AddressMapModal from '@/components/tienda/templates/AddressMapModal'
import { Search, User, ClipboardList, ShoppingBag, Eye, Play, MapPin, X, ChevronDown, ChevronRight, Check, Menu } from 'lucide-react'

interface Props {
  perfil: Profile;
  productos: Product[];
  extensionData?: {
    deliverySettings?: unknown;
    menuCategories?: unknown[];
  };
  isReadOnly?: boolean;
}

type ModaVariant = {
  talla?: string;
  color?: string;
}

const COLOR_MAP: Record<string, string> = {
  negro: '#1a1a1a',
  black: '#1a1a1a',
  blanco: '#f5f5f0',
  white: '#f5f5f0',
  gris: '#8a8a8a',
  gray: '#8a8a8a',
  plomo: '#777777',
  azul: '#3b5998',
  blue: '#3b5998',
  navy: '#1a3a5c',
  rojo: '#c0392b',
  red: '#c0392b',
  verde: '#5a6e3f',
  green: '#5a6e3f',
  oliva: '#5a6e3f',
  beige: '#d4c5b2',
  crema: '#efe3d1',
  caqui: '#c4a882',
  khaki: '#c4a882',
  marron: '#7c5643',
  cafe: '#7c5643',
  rosa: '#d9a8b6',
}

const FALLBACK_COLORS = ['#1a1a1a', '#f5f5f0', '#1a3a5c', '#8a8a8a', '#d4c5b2'];
const CARD_BG_COLORS = ['#f5f0e8', '#f0f0f0', '#eef2f5', '#f5f0e8'];

function getVariants(product: Product): ModaVariant[] {
  return Array.isArray(product.variants) ? product.variants as ModaVariant[] : []
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function getColors(product: Product) {
  return uniqueValues(getVariants(product).map(variant => variant.color))
}

function getSizes(product: Product) {
  return uniqueValues(getVariants(product).map(variant => variant.talla))
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function getColorHex(color: string, index = 0) {
  const normalized = normalize(color)
  const found = Object.entries(COLOR_MAP).find(([key]) => normalized.includes(key))
  return found?.[1] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

function formatPrice(price?: number | null) {
  return `S/ ${(price || 0).toFixed(2)}`
}

function getProductMedia(product?: Product | null): ProductMedia[] {
  if (!product) return [{ type: 'image', url: 'https://picsum.photos/seed/linkventas-moda/600/800' }]

  const media = Array.isArray(product.media)
    ? product.media.filter(item => item?.url && (item.type === 'image' || item.type === 'video'))
    : []

  if (media.length > 0) {
    // Si un item es video sin poster, usar image_url del producto como fallback
    return media.map(item =>
      item.type === 'video' && !item.poster_url && product.image_url
        ? { ...item, poster_url: product.image_url }
        : item
    )
  }

  const galleryMedia = Array.isArray(product.gallery)
    ? product.gallery
        .map((item): ProductMedia | null => {
          try {
            const parsed = JSON.parse(item) as Partial<ProductMedia>
            return parsed?.url && (parsed.type === 'image' || parsed.type === 'video') ? parsed as ProductMedia : null
          } catch {
            return item ? { type: 'image', url: item } : null
          }
        })
        .filter((item): item is ProductMedia => Boolean(item))
    : []

  if (galleryMedia.length > 0) return galleryMedia
  return [{ type: 'image', url: product.image_url || 'https://picsum.photos/seed/linkventas-moda/600/800' }]
}

function categoryLabel(category?: string) {
  if (!category) return 'Moda'
  const normalized = normalize(category)
  if (normalized.includes('polo')) return 'Polo'
  if (normalized.includes('pantal')) return 'Pantalon'
  return category
}

function playVideo(video: HTMLVideoElement) {
  video.play().catch(() => {})
}

function playHoverVideo(event: React.MouseEvent<HTMLVideoElement>) {
  playVideo(event.currentTarget)
}

function playReadyVideo(event: React.SyntheticEvent<HTMLVideoElement>) {
  if (!event.currentTarget.autoplay) return
  event.currentTarget.play().catch(() => {})
}

function pauseHoverVideo(event: React.MouseEvent<HTMLVideoElement>) {
  const video = event.currentTarget
  video.pause()
  video.currentTime = 0
  video.load() // Recarga el poster
}

function ProductMediaFrame({
  media,
  alt,
  className,
  hoverPlay = false,
  autoplay = false,
}: {
  media: ProductMedia;
  alt: string;
  className?: string;
  hoverPlay?: boolean;
  autoplay?: boolean;
}) {
  const [isHovering, setIsHovering] = useState(false)
  const [isVideoReady, setIsVideoReady] = useState(false)

  if (media.type === 'video') {
    if (hoverPlay) {
      const showHoverVideo = isHovering && isVideoReady
      const hasPoster = Boolean(media.poster_url)

      return (
        <>
          <div className={`${className || ''} video-poster video-placeholder ${hasPoster ? 'has-poster' : 'no-poster'}`} aria-label={alt}>
            {hasPoster && <img src={media.poster_url} alt={alt} loading="eager" />}
            <span className="flex items-center justify-center"><Play fill="currentColor" size={24} /></span>
          </div>
          <video
            className={`${className || ''} hover-video`}
            src={media.url}
            poster={media.poster_url}
            muted
            loop
            playsInline
            preload={hasPoster ? 'metadata' : 'auto'}
            data-ready={showHoverVideo || !hasPoster ? 'true' : 'false'}
            onCanPlay={(event) => {
              setIsVideoReady(true)
              if (isHovering) playVideo(event.currentTarget)
            }}
            onMouseEnter={(event) => {
              setIsHovering(true)
              if (isVideoReady) playHoverVideo(event)
            }}
            onMouseLeave={(event) => {
              setIsHovering(false)
              pauseHoverVideo(event)
            }}
            aria-label={alt}
          />
        </>
      )
    }

    return (
      <video
        className={className}
        src={media.url}
        poster={media.poster_url}
        muted
        loop
        playsInline
        preload={autoplay ? 'auto' : 'metadata'}
        autoPlay={autoplay}
        onCanPlay={autoplay ? playReadyVideo : undefined}
        onMouseEnter={hoverPlay ? playHoverVideo : undefined}
        onMouseLeave={hoverPlay ? pauseHoverVideo : undefined}
        aria-label={alt}
      />
    )
  }

  return <img className={className} src={media.url} alt={alt} loading="lazy" />
}

export default function ModaTemplate({ perfil, productos, isReadOnly }: Props) {
  const storeId = perfil.id
  const storeName = perfil.store_name || 'MODA URBAN'
  const description = perfil.description || 'Prendas exclusivas de diseño. Explora nuestra coleccion.'
  const cartStore = useCartStore()
  const cart = cartStore.carts[storeId] || []
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const customerStore = useCustomerStore()
  const savedAddress = customerStore.savedAddress

  const activeProducts = useMemo(() => productos.filter(product => product.is_active !== false), [productos])
  const categories = useMemo(() => uniqueValues(activeProducts.map(product => product.category)), [activeProducts])

  const [searchQuery, setSearchQuery] = useState('')
  const [currentFilter, setCurrentFilter] = useState('all')
  const [catalogVisible, setCatalogVisible] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [selectedColorIndex, setSelectedColorIndex] = useState<Record<string, number>>({})
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({})
  const [modalQty, setModalQty] = useState(1)
  const [detailQty, setDetailQty] = useState(1)
  const [detailMediaIndex, setDetailMediaIndex] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  
  // Customer portal state
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const filteredProducts = useMemo(() => {
    return activeProducts.filter(product => {
      const matchesCategory = currentFilter === 'all' || product.category === currentFilter
      const query = normalize(searchQuery)
      const matchesSearch = query === '' || normalize(product.name).includes(query) || normalize(product.category || '').includes(query)
      return matchesCategory && matchesSearch
    })
  }, [activeProducts, currentFilter, searchQuery])

  const currentProductColor = (product: Product) => {
    const colors = getColors(product)
    const index = selectedColorIndex[product.id] || 0
    return colors[index] || ''
  }

  const currentProductSize = (product: Product) => {
    const sizes = getSizes(product)
    return selectedSize[product.id] || sizes[0] || ''
  }

  const addToCart = (product: Product, qty = 1, closeModal = false) => {
    if (isReadOnly) return
    if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
      toast.error('Producto agotado')
      return
    }

    const sizes = getSizes(product)
    const colors = getColors(product)
    const hasExplicitSize = Object.prototype.hasOwnProperty.call(selectedSize, product.id)
    const hasExplicitColor = Object.prototype.hasOwnProperty.call(selectedColorIndex, product.id)

    if (sizes.length > 0 && !hasExplicitSize) {
      toast.error('Selecciona una talla')
      return
    }

    if (colors.length > 0 && !hasExplicitColor) {
      toast.error('Selecciona un color')
      return
    }

    const color = currentProductColor(product)
    const size = currentProductSize(product)
    const variantDetails = {
      ...(color ? { color } : {}),
      ...(size ? { talla: size } : {}),
    }

    Array.from({ length: qty }).forEach(() => cartStore.addToCart(storeId, product, variantDetails))
    toast.success('Agregado al carrito')
    if (closeModal) setQuickViewProduct(null)
    setCartOpen(true)
  }

  const openDetail = (product: Product) => {
    setSelectedProduct(product)
    setCatalogVisible(false)
    setDetailQty(1)
    setDetailMediaIndex(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToCatalog = (event?: React.MouseEvent) => {
    event?.preventDefault()
    setCatalogVisible(true)
    setSelectedProduct(null)
    setQuickViewProduct(null)
    setMobileMenuOpen(false)
    setSearchQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filterCatalog = (filter: string) => {
    setCurrentFilter(filter)
    setCatalogVisible(true)
    setSelectedProduct(null)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAddressSaved = (data: { direccion: string; referencia: string; lat: number; lng: number }) => {
    customerStore.setSavedAddress(data)
    setIsAddressModalOpen(false)
  }

  return (
    <div className="moda-urban-template">
      <style>{modaUrbanStyles}</style>

      {/* HEADER */}
      <header className="header" id="header">
        <div className="header-inner">
          <div className="header-left">
            <button className="menu-toggle" aria-label="Menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><Menu size={20} /></button>
            <a href="#" className="logo" onClick={goToCatalog}>
              <span className="logo-icon">{storeName.slice(0, 2).toUpperCase()}</span> <span className="logo-text">{storeName}</span>
            </a>
          </div>

          <div className="header-center hidden md:flex">
             <div className="search-container">
               <Search size={16} className="search-icon" />
               <input 
                 type="search" 
                 placeholder="Buscar productos..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="search-input"
               />
             </div>
          </div>

          <div className="header-right">
            <button className="icon-btn hidden md:flex" onClick={() => setIsProfileOpen(true)}>
              <User size={20} />
            </button>
            <button className="icon-btn relative hidden md:flex" onClick={() => setIsOrderHistoryOpen(true)}>
              <ClipboardList size={20} />
              {mounted && customerStore.orders.filter(o => o.storeId === storeId).length > 0 && (
                <span className="badge-count">
                  {customerStore.orders.filter(o => o.storeId === storeId).length}
                </span>
              )}
            </button>
            <button className="cart-btn" onClick={() => setCartOpen(true)}>
              <ShoppingBag size={18} />
              <span className="hidden sm:inline ml-1">Carrito</span>
              <span className={`cart-count ${totalItems > 0 ? 'bump' : ''}`}>{totalItems}</span>
            </button>
          </div>
        </div>

        {/* MOBILE NAV AND SEARCH (Slides down) */}
        <div className={`mobile-menu-drawer ${mobileMenuOpen ? 'show' : ''}`}>
          <div className="p-4 border-b border-zinc-100">
            <div className="search-container w-full">
               <Search size={16} className="search-icon" />
               <input 
                 type="search" 
                 placeholder="Buscar productos..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="search-input"
               />
             </div>
          </div>
          <nav>
            <ul className="nav-links">
              <li><a href="#" onClick={goToCatalog}>Inicio</a></li>
              {categories.map(category => (
                <li key={category}><a href="#" onClick={(event) => { event.preventDefault(); filterCatalog(category) }}>{categoryLabel(category)}</a></li>
              ))}
              <li className="border-t border-zinc-100 mt-2 pt-2"><a href="#" onClick={(e) => { e.preventDefault(); setIsProfileOpen(true); setMobileMenuOpen(false); }}>Mi Perfil</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setIsOrderHistoryOpen(true); setMobileMenuOpen(false); }}>Mis Pedidos</a></li>
            </ul>
          </nav>
        </div>
        {/* DESKTOP SUB-NAV */}
        <div className="header-subnav hidden md:flex">
          <ul className="subnav-links">
             <li><a href="#" className={currentFilter === 'all' && catalogVisible ? 'active' : ''} onClick={goToCatalog}>Inicio</a></li>
             {categories.map(category => (
                <li key={category}><a href="#" className={currentFilter === category && catalogVisible ? 'active' : ''} onClick={(event) => { event.preventDefault(); filterCatalog(category) }}>{categoryLabel(category)}</a></li>
             ))}
          </ul>
        </div>
      </header>

      <main className="main-container" id="mainContent">
        {catalogVisible ? (
          <div id="catalogView">
            {/* Solo mostramos hero si no hay busqueda activa */}
            {!searchQuery && (
              <section className="hero-editorial">
                <div className="hero-editorial-inner">
                  <span className="hero-tag">Nueva Coleccion</span>
                  <h1 className="hero-heading">
                    {storeName.toUpperCase()}
                    <span className="hero-heading-underline">COLECCION</span>
                  </h1>
                  <p className="hero-desc">{description}</p>
                </div>
              </section>
            )}

            {!searchQuery && (
              <div className="filters-bar" id="filtersBar">
                <button className={`filter-btn ${currentFilter === 'all' ? 'active' : ''}`} onClick={() => filterCatalog('all')}>Todos</button>
                {categories.map(category => (
                  <button
                    key={category}
                    className={`filter-btn ${currentFilter === category ? 'active' : ''}`}
                    onClick={() => filterCatalog(category)}
                  >
                    {categoryLabel(category)}
                  </button>
                ))}
              </div>
            )}

            {searchQuery && (
              <div className="mb-6 pb-2 border-b border-zinc-200">
                <h2 className="text-lg font-semibold text-zinc-900">Resultados para: "{searchQuery}"</h2>
              </div>
            )}

            <div className="catalog-grid" id="catalogGrid">
              {filteredProducts.length === 0 ? (
                <div className="empty-catalog">
                  <strong>No encontramos productos para tu busqueda</strong>
                  <span>Intenta con otras palabras o categorias.</span>
                </div>
              ) : (
                filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    selectedColorIndex={selectedColorIndex[product.id] || 0}
                    onColorChange={(colorIndex) => setSelectedColorIndex(prev => ({ ...prev, [product.id]: colorIndex }))}
                    onOpenDetail={() => openDetail(product)}
                    onOpenQuickView={() => { setQuickViewProduct(product); setModalQty(1) }}
                    onQuickAdd={() => {
                      if (getVariants(product).length > 0) {
                        setQuickViewProduct(product)
                        setModalQty(1)
                        return
                      }
                      addToCart(product)
                    }}
                    isReadOnly={isReadOnly}
                  />
                ))
              )}
            </div>
          </div>
        ) : selectedProduct ? (
          <DetailView
            product={selectedProduct}
            perfil={perfil}
            selectedColorIndex={selectedColorIndex[selectedProduct.id] || 0}
            selectedSize={currentProductSize(selectedProduct)}
            quantity={detailQty}
            storeName={storeName}
            whatsappPhone={perfil.whatsapp_phone}
            onBack={() => goToCatalog()}
            selectedMediaIndex={detailMediaIndex}
            onMediaChange={setDetailMediaIndex}
            onColorChange={(colorIndex) => setSelectedColorIndex(prev => ({ ...prev, [selectedProduct.id]: colorIndex }))}
            onSizeChange={(size) => setSelectedSize(prev => ({ ...prev, [selectedProduct.id]: size }))}
            onQuantityChange={(delta) => setDetailQty(value => Math.max(1, Math.min(10, value + delta)))}
            onAddToCart={() => addToCart(selectedProduct, detailQty)}
            isReadOnly={isReadOnly}
          />
        ) : null}
      </main>

      {/* QUICK VIEW MODAL */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          selectedColorIndex={selectedColorIndex[quickViewProduct.id] || 0}
          selectedSize={currentProductSize(quickViewProduct)}
          quantity={modalQty}
          onClose={() => setQuickViewProduct(null)}
          onColorChange={(colorIndex) => setSelectedColorIndex(prev => ({ ...prev, [quickViewProduct.id]: colorIndex }))}
          onSizeChange={(size) => setSelectedSize(prev => ({ ...prev, [quickViewProduct.id]: size }))}
          onQuantityChange={(delta) => setModalQty(value => Math.max(1, Math.min(10, value + delta)))}
          onAddToCart={() => addToCart(quickViewProduct, modalQty, true)}
          onOpenDetail={() => {
            setQuickViewProduct(null)
            openDetail(quickViewProduct)
          }}
          isReadOnly={isReadOnly}
        />
      )}

      {/* CUSTOMER PORTAL MODALS */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setIsProfileOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg text-zinc-900">Mi Perfil</h2>
              <button onClick={() => setIsProfileOpen(false)} className="text-zinc-400 hover:text-zinc-800"><X size={20}/></button>
            </div>
            
            <div>
              <label className="text-sm font-medium text-zinc-600 mb-1 block">Nombre completo:</label>
              <input 
                type="text" 
                value={customerStore.profile.nombre} 
                onChange={e => customerStore.setProfile({ nombre: e.target.value })} 
                placeholder="Tu nombre" 
                className="w-full border border-zinc-200 rounded-lg h-11 px-4 text-sm text-zinc-900 bg-white focus:border-zinc-800 outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-zinc-600 mb-1 block">Telefono:</label>
              <div className="flex rounded-lg border border-zinc-200 overflow-hidden h-11 focus-within:border-zinc-800 transition-colors">
                <div className="bg-zinc-50 px-3 flex items-center justify-center border-r border-zinc-200 text-sm text-zinc-500">
                  +51
                </div>
                <input 
                  type="tel" 
                  value={customerStore.profile.telefono} 
                  onChange={e => customerStore.setProfile({ telefono: e.target.value })} 
                  placeholder="(9XX) XXX XXX" 
                  className="flex-1 px-3 text-sm text-zinc-900 bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-600 mb-1 block">Correo electronico:</label>
              <input 
                type="email" 
                value={customerStore.profile.correo} 
                onChange={e => customerStore.setProfile({ correo: e.target.value })} 
                placeholder="correo@ejemplo.com" 
                className="w-full border border-zinc-200 rounded-lg h-11 px-4 text-sm text-zinc-900 bg-white focus:border-zinc-800 outline-none transition-colors"
              />
            </div>

            <div>
              <h3 className="text-sm font-bold text-zinc-800 mb-2 mt-4">Direccion de entrega</h3>
              <div className="border border-zinc-200 rounded-xl p-4 flex flex-col items-center text-center bg-zinc-50">
                <span className="text-sm text-zinc-700 font-medium">{savedAddress ? savedAddress.direccion : 'No hay direcciones registradas'}</span>
                {savedAddress?.referencia && <span className="text-xs text-zinc-500 mt-1">{savedAddress.referencia}</span>}
                <button onClick={() => { setIsProfileOpen(false); setIsAddressModalOpen(true); }} className="mt-3 text-xs font-bold text-zinc-900 underline underline-offset-2">
                  {savedAddress ? 'Modificar direccion' : 'Agregar direccion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ADDRESS MAP MODAL */}
      <AddressMapModal
         isOpen={isAddressModalOpen}
         onClose={() => setIsAddressModalOpen(false)}
         onSave={handleAddressSaved}
      />

      <OrderHistoryPanel
         isOpen={isOrderHistoryOpen}
         onClose={() => setIsOrderHistoryOpen(false)}
         storeId={storeId}
         storeLat={(perfil as any).store_lat ?? null}
         storeLng={(perfil as any).store_lng ?? null}
         whatsappPhone={(perfil as any).whatsapp_phone ?? null}
      />

      <footer className="footer">
        © 2026 {storeName}. Todos los derechos reservados.
      </footer>

      <SlideOverCart storeId={storeId} isOpen={cartOpen} onClose={() => setCartOpen(false)} templateType="moda" />
    </div>
  )
}

function ProductCard({
  product,
  index,
  selectedColorIndex,
  onColorChange,
  onOpenDetail,
  onOpenQuickView,
  onQuickAdd,
  isReadOnly,
}: {
  product: Product;
  index: number;
  selectedColorIndex: number;
  onColorChange: (index: number) => void;
  onOpenDetail: () => void;
  onOpenQuickView: () => void;
  onQuickAdd: () => void;
  isReadOnly?: boolean;
}) {
  const colors = getColors(product)
  const primaryMedia = getProductMedia(product)[0]
  const cardBg = primaryMedia.type === 'video' ? '#000' : CARD_BG_COLORS[index % 4]
  const displaySwatches = colors.slice(0, 5)
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0
  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0

  return (
    <div className="product-card animate-in" style={{ animationDelay: `${index * 0.07}s` }}>
      <div className="product-image-wrapper" style={{ background: cardBg }} onClick={onOpenDetail}>
        {discount > 0 && <span className="product-tag">Oferta</span>}
        {!discount && product.created_at && <span className="product-tag new">Nuevo</span>}
        <ProductMediaFrame media={primaryMedia} alt={`${product.name}${colors[selectedColorIndex] ? ` - ${colors[selectedColorIndex]}` : ''}`} hoverPlay className="product-media" />
        {primaryMedia.type === 'video' && <span className="video-indicator"><Play fill="currentColor" size={12}/></span>}
        {isOutOfStock && <div className="soldout-layer">Agotado</div>}
        <div className="product-actions-overlay">
          <button className="action-btn" title="Vista rapida" onClick={(event) => { event.stopPropagation(); onOpenQuickView() }}><Eye size={18}/></button>
          <button className="action-btn" title="Agregar" disabled={isReadOnly || isOutOfStock} onClick={(event) => { event.stopPropagation(); onQuickAdd() }}><ShoppingBag size={18}/></button>
        </div>
      </div>
      <div className="product-info">
        <div className="product-category">{categoryLabel(product.category)}</div>
        <div className="product-name">{product.name}</div>
        <div className="product-price">
          {formatPrice(product.price)}
          {product.original_price && product.original_price > product.price && <span className="old-price">{formatPrice(product.original_price)}</span>}
        </div>
        {displaySwatches.length > 0 && (
          <div className="color-swatches-row">
            {displaySwatches.map((color, colorIndex) => (
              <button
                type="button"
                key={color}
                className={`color-swatch-mini ${colorIndex === selectedColorIndex ? 'active' : ''}`}
                style={{ background: getColorHex(color, colorIndex) }}
                title={color}
                onClick={(event) => { event.stopPropagation(); onColorChange(colorIndex) }}
              />
            ))}
            {colors.length > 5 && <span className="color-swatch-mini more-colors">+{colors.length - 5}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickViewModal({
  product,
  selectedColorIndex,
  selectedSize,
  quantity,
  onClose,
  onColorChange,
  onSizeChange,
  onQuantityChange,
  onAddToCart,
  onOpenDetail,
  isReadOnly,
}: {
  product: Product;
  selectedColorIndex: number;
  selectedSize: string;
  quantity: number;
  onClose: () => void;
  onColorChange: (index: number) => void;
  onSizeChange: (size: string) => void;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
  onOpenDetail: () => void;
  isReadOnly?: boolean;
}) {
  const colors = getColors(product)
  const sizes = getSizes(product)
  const selectedColor = colors[selectedColorIndex]
  const primaryMedia = getProductMedia(product)[0]

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-quick-view" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20}/></button>
        <div className="modal-image-section">
          <ProductMediaFrame media={primaryMedia} alt={product.name} autoplay className="product-media" />
          {primaryMedia.type === 'video' && <span className="video-indicator modal-video-indicator"><Play fill="currentColor" size={16}/></span>}
        </div>
        <div className="modal-details-section">
          <h2>{product.name}</h2>
          <div className="modal-price">
            {formatPrice(product.price)}
            {product.original_price && product.original_price > product.price && <span className="inline-old-price">{formatPrice(product.original_price)}</span>}
          </div>
          <p className="modal-description">{product.description || 'Prenda disponible en el catalogo.'}</p>
          {colors.length > 0 && (
            <>
              <div className="modal-colors-label">Color: <strong>{selectedColor}</strong></div>
              <div className="modal-swatches">
                {colors.map((color, colorIndex) => (
                  <button
                    key={color}
                    className={`modal-swatch ${colorIndex === selectedColorIndex ? 'selected' : ''}`}
                    style={{ background: getColorHex(color, colorIndex) }}
                    title={color}
                    onClick={() => onColorChange(colorIndex)}
                  />
                ))}
              </div>
            </>
          )}
          {sizes.length > 0 && (
            <>
              <div className="modal-colors-label">Talla:</div>
              <div className="modal-sizes">
                {sizes.map(size => (
                  <button key={size} className={`size-btn ${size === selectedSize ? 'selected' : ''}`} onClick={() => onSizeChange(size)}>{size}</button>
                ))}
              </div>
            </>
          )}
          <div className="qty-row">
            <span>Cantidad:</span>
            <div className="qty-selector">
              <button onClick={() => onQuantityChange(-1)}>−</button>
              <input type="number" value={quantity} min="1" max="10" readOnly />
              <button onClick={() => onQuantityChange(1)}>+</button>
            </div>
          </div>
          <button className="btn-add-cart" disabled={isReadOnly} onClick={onAddToCart}>
            <span className="flex items-center justify-center gap-2"><ShoppingBag size={18}/> AGREGAR AL CARRITO</span>
          </button>
          <button className="btn-view-details" onClick={onOpenDetail}>Ver detalles completos</button>
        </div>
      </div>
    </div>
  )
}

function DetailView({
  product,
  perfil,
  selectedColorIndex,
  selectedSize,
  quantity,
  storeName,
  whatsappPhone,
  onBack,
  selectedMediaIndex,
  onMediaChange,
  onColorChange,
  onSizeChange,
  onQuantityChange,
  onAddToCart,
  isReadOnly,
}: {
  product: Product;
  perfil: any;
  selectedColorIndex: number;
  selectedSize: string;
  quantity: number;
  storeName: string;
  whatsappPhone?: string;
  onBack: () => void;
  selectedMediaIndex: number;
  onMediaChange: (index: number) => void;
  onColorChange: (index: number) => void;
  onSizeChange: (size: string) => void;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
  isReadOnly?: boolean;
}) {
  const colors = getColors(product)
  const sizes = getSizes(product)
  const selectedColor = colors[selectedColorIndex]
  const media = getProductMedia(product)
  const activeMedia = media[selectedMediaIndex] || media[0]
  
  // Dynamic blocks
  const benefits = Array.isArray(perfil.benefits) ? perfil.benefits : []
  
  const benefitsRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!benefitsRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    const cards = benefitsRef.current.querySelectorAll('.benefit-item')
    cards.forEach((card, index) => {
      ;(card as HTMLElement).style.transitionDelay = `${index * 0.1}s`
      observer.observe(card)
    })

    return () => observer.disconnect()
  }, [benefits])
  const faqs = Array.isArray(perfil.faqs) ? perfil.faqs : []
  const promoTitle = perfil.promo_title || ''
  const promoDesc = perfil.promo_description || ''

  return (
    <div className="detail-page active" id="detailPage">
      <button className="back-to-shop" onClick={onBack}>
        Volver a la tienda
      </button>
      <div className="detail-layout">
        <div className="gallery-section">
          <div className="gallery-main">
            <ProductMediaFrame media={activeMedia} alt={product.name} autoplay={activeMedia.type === 'video'} className="product-media" />
            {activeMedia.type === 'video' && <span className="video-indicator gallery-video-indicator"><Play fill="currentColor" size={20}/></span>}
          </div>
          <div className="gallery-thumbs">
            {media.map((item, mediaIndex) => (
              <button
                key={`${item.url}-${mediaIndex}`}
                className={`gallery-thumb ${mediaIndex === selectedMediaIndex ? 'active' : ''}`}
                onClick={() => onMediaChange(mediaIndex)}
                aria-label={`${item.type === 'video' ? 'Video' : 'Foto'} ${mediaIndex + 1}`}
              >
                {item.type === 'video' && item.poster_url ? (
                  <img src={item.poster_url} alt={`${product.name} video ${mediaIndex + 1}`} className="product-media" loading="lazy" />
                ) : (
                  <ProductMediaFrame media={item} alt={`${product.name} ${mediaIndex + 1}`} className="product-media" />
                )}
                {item.type === 'video' && <span className="thumb-play"><Play fill="currentColor" size={14}/></span>}
              </button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <div className="product-category">{categoryLabel(product.category)}</div>
          <h1>{product.name}</h1>
          <div className="detail-price">
            {formatPrice(product.price)}
            {product.original_price && product.original_price > product.price && <span className="inline-old-price detail-old-price">{formatPrice(product.original_price)}</span>}
          </div>
          <p className="detail-description">{product.description || 'Prenda disponible en el catalogo.'}</p>
          {colors.length > 0 && (
            <>
              <p className="detail-label">Color: <span>{selectedColor}</span></p>
              <div className="detail-swatches">
                {colors.map((color, colorIndex) => (
                  <button
                    key={color}
                    className={`detail-swatch ${colorIndex === selectedColorIndex ? 'selected' : ''}`}
                    style={{ background: getColorHex(color, colorIndex) }}
                    title={color}
                    onClick={() => onColorChange(colorIndex)}
                  />
                ))}
              </div>
            </>
          )}
          {sizes.length > 0 && (
            <>
              <p className="detail-label">Talla:</p>
              <div className="detail-sizes">
                {sizes.map(size => <button key={size} className={`size-btn ${size === selectedSize ? 'selected' : ''}`} onClick={() => onSizeChange(size)}>{size}</button>)}
              </div>
            </>
          )}
          <div className="qty-row detail-qty">
            <span>Cantidad:</span>
            <div className="qty-selector">
              <button onClick={() => onQuantityChange(-1)}>−</button>
              <input type="number" value={quantity} readOnly min="1" max="10" />
              <button onClick={() => onQuantityChange(1)}>+</button>
            </div>
          </div>
          <button className="btn-add-cart detail-add" disabled={isReadOnly} onClick={onAddToCart}>
            <span className="flex items-center justify-center gap-2"><ShoppingBag size={18}/> AGREGAR AL CARRITO</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC EDITABLE BLOCKS */}
      <div className="detail-blocks-container">
        {benefits.length > 0 && (
          <div className="detail-section benefits-editorial" id="benefitsSection">
            <div className="benefits-editorial-header">
              <h2 className="benefits-editorial-title">
                POR QUE<br/>
                <span className="benefits-underline">ELEGIRNOS</span>
              </h2>
            </div>

            <div className="benefits-editorial-body">
              <div className="benefits-list" ref={benefitsRef}>
                {benefits.slice(0, 4).map((b: any, i: number) => (
                  <div className="benefit-item" key={i}>
                    <span className="benefit-item-number">{String(i + 1).padStart(2, '0')}</span>
                    <div className="benefit-item-content">
                      <h3>{b.title}</h3>
                      <p>{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {promoTitle && (
          <div className="promo-banner animate-in" id="promoSection">
            <div className="promo-banner-inner">
              <span className="promo-banner-tag">Promocion</span>
              <h2 className="promo-banner-title">{promoTitle}</h2>
              {promoDesc && <p className="promo-banner-desc">{promoDesc}</p>}
            </div>
          </div>
        )}

        {faqs.length > 0 && (
          <div className="detail-section" id="faqSection">
            <h2>Preguntas Frecuentes</h2>
            <div className="faq-list">
              {faqs.map((faq: any, i: number) => (
                <details className="faq-item" key={i}>
                  <summary className="faq-question">
                    {faq.question} 
                    <span className="faq-arrow"><ChevronDown size={18}/></span>
                  </summary>
                  <div className="faq-answer">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        )}

        {whatsappPhone && (
          <div className="detail-section contact-section animate-in" id="contactSection">
            <div className="contact-info">
              <h2>Atencion al Cliente</h2>
              <p>Estamos aqui para ayudarte con tu compra. Escribenos directamente.</p>
              <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noopener noreferrer" className="whatsapp-btn">
                Contactar por WhatsApp
              </a>
            </div>
          </div>
        )}

        <ReviewsSection productId={product.id} storeId={perfil.id} />
      </div>
    </div>
  )
}

function StarDisplay({ rating, size = '1rem' }: { rating: number; size?: string }) {
  return (
    <span className="reviews-stars-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`review-star${n > rating ? ' empty' : ''}`} style={{ fontSize: size }}>
          {n <= rating ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

function ReviewsSection({ productId, storeId }: { productId: string; storeId: string }) {
  type Review = {
    id: string
    customer_name: string
    rating: number
    comment: string
    verified_purchase: boolean
    created_at: string
  }

  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(true)

  // Form state
  const [hoverStar, setHoverStar] = useState(0)
  const [selectedStar, setSelectedStar] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    async function fetchReviews() {
      setLoadingReviews(true)
      const { data } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
      setReviews(data ?? [])
      setLoadingReviews(false)
    }
    fetchReviews()
  }, [productId, storeId])

  const avgRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (selectedStar === 0) {
      setFeedback({ type: 'error', message: 'Selecciona una calificación.' })
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          product_id: productId,
          customer_name: name,
          customer_email: email,
          rating: selectedStar,
          comment,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Error al enviar la reseña.' })
      } else {
        setFeedback({ type: 'success', message: 'Tu reseña fue enviada correctamente.' })
        setName('')
        setEmail('')
        setComment('')
        setSelectedStar(0)
        // Reload reviews
        const { data: updated } = await supabase
          .from('product_reviews')
          .select('*')
          .eq('product_id', productId)
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
        setReviews(updated ?? [])
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexion. Intenta de nuevo.' })
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="detail-section reviews-section" id="reviewsSection">
      {/* Header with average */}
      <div className="reviews-header">
        {reviews.length > 0 && (
          <span className="reviews-avg-score">{avgRating.toFixed(1)}</span>
        )}
        <div className="reviews-avg-meta">
          <h2>Resenas</h2>
          {reviews.length > 0 && (
            <>
              <StarDisplay rating={Math.round(avgRating)} />
              <span className="reviews-count">{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* Reviews list */}
      <div className="reviews-list">
        {loadingReviews ? (
          <p className="reviews-empty">Cargando reseñas...</p>
        ) : reviews.length === 0 ? (
          <p className="reviews-empty">Sé el primero en dejar una reseña.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="review-card">
              <div className="review-card-top">
                <span className="review-author">{r.customer_name}</span>
                <div className="review-meta">
                  {r.verified_purchase && (
                    <span className="verified-badge">Compra verificada</span>
                  )}
                  <span className="review-date">{formatDate(r.created_at)}</span>
                </div>
              </div>
              <StarDisplay rating={r.rating} size="0.95rem" />
              <p className="review-comment">{r.comment}</p>
            </div>
          ))
        )}
      </div>

      {/* Form */}
      <div className="review-form-section">
        <h3>Dejar una reseña</h3>
        <form className="review-form" onSubmit={handleSubmit}>
          <div>
            <div className="star-selector" role="group" aria-label="Calificacion">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`star-btn${n <= (hoverStar || selectedStar) ? ' active' : ''}`}
                  aria-label={`${n} estrella${n !== 1 ? 's' : ''}`}
                  onMouseEnter={() => setHoverStar(n)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setSelectedStar(n)}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <input
            id="review-name"
            className="review-input"
            type="text"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
          <input
            id="review-email"
            className="review-input"
            type="email"
            placeholder="Correo electronico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <textarea
            id="review-comment"
            className="review-input review-textarea"
            placeholder="Escribe tu comentario..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            maxLength={600}
          />
          {feedback && (
            <div className={`review-feedback ${feedback.type}`} role="alert">
              {feedback.message}
            </div>
          )}
          <button
            id="review-submit"
            type="submit"
            className="review-submit-btn"
            disabled={submitting}
          >
            {submitting ? 'Enviando...' : 'Enviar reseña'}
          </button>
        </form>
      </div>
    </div>
  )
}

const modaUrbanStyles = `
.moda-urban-template {
  --bg: #fafafa;
  --surface: #ffffff;
  --text: #1a1a1a;
  --text-light: #666;
  --border: #e8e8e8;
  --accent: #1a1a1a;
  --accent-hover: #333;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.18);
  --radius: 12px;
  --radius-sm: 8px;
  --transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --bounce: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
.moda-urban-template * { box-sizing: border-box; }
@keyframes modaFadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes modaSlideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes modaBounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.08); } 70% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }
@keyframes modaFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.moda-urban-template .animate-in { animation: modaFadeInUp 0.7s ease forwards; }

.moda-urban-template .header {
  position: sticky; top: 0; z-index: 80; background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border); transition: var(--transition);
}
.moda-urban-template .header-inner {
  max-width: 1300px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 70px; padding: 0 2rem;
}
.moda-urban-template .header-left, .moda-urban-template .header-right { display: flex; align-items: center; gap: 1rem; }
.moda-urban-template .header-center { flex: 1; max-width: 400px; margin: 0 2rem; }

.moda-urban-template .logo {
  font-size: 1.4rem; font-weight: 800; letter-spacing: -0.5px; text-decoration: none; color: var(--text);
  display: flex; align-items: center; gap: 10px; transition: var(--transition);
}
.moda-urban-template .logo:hover { transform: scale(1.02); }
.moda-urban-template .logo-icon {
  width: 34px; height: 34px; background: var(--accent); border-radius: 8px; display: flex;
  align-items: center; justify-content: center; color: #fff; font-size: 0.8rem; font-weight: 900;
}
.moda-urban-template .search-container {
  display: flex; align-items: center; background: #f5f5f5; border-radius: 50px; padding: 0 16px; height: 42px; width: 100%; border: 1px solid transparent; transition: var(--transition);
}
.moda-urban-template .search-container:focus-within { background: #fff; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }
.moda-urban-template .search-icon { color: #999; }
.moda-urban-template .search-input { border: none; background: transparent; height: 100%; width: 100%; padding: 0 12px; font-size: 0.95rem; outline: none; }

.moda-urban-template .icon-btn {
  width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; cursor: pointer; color: var(--text); transition: var(--transition);
}
.moda-urban-template .icon-btn:hover { background: #f0f0f0; }
.moda-urban-template .badge-count {
  position: absolute; top: 0px; right: 0px; background: var(--text); color: #fff; width: 18px; height: 18px;
  border-radius: 50%; font-size: 0.65rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
}

.moda-urban-template .header-subnav { border-top: 1px solid var(--border); background: #fff; padding: 0 2rem; }
.moda-urban-template .subnav-links {
  max-width: 1300px; margin: 0 auto; display: flex; gap: 2rem; list-style: none; padding: 0; overflow-x: auto; scrollbar-width: none;
}
.moda-urban-template .subnav-links::-webkit-scrollbar { display: none; }
.moda-urban-template .subnav-links a {
  text-decoration: none; color: var(--text-light); font-weight: 500; font-size: 0.9rem; padding: 12px 0; white-space: nowrap; border-bottom: 2px solid transparent; transition: var(--transition);
}
.moda-urban-template .subnav-links a:hover { color: var(--text); }
.moda-urban-template .subnav-links a.active { color: var(--text); border-bottom-color: var(--text); font-weight: 600; }

.moda-urban-template .cart-btn {
  position: relative; background: var(--accent); color: #fff; border: none; padding: 10px 18px; border-radius: 50px;
  cursor: pointer; font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; transition: var(--transition); white-space: nowrap;
}
.moda-urban-template .cart-btn:hover { background: var(--accent-hover); transform: translateY(-2px); box-shadow: var(--shadow); }
.moda-urban-template .cart-count {
  background: #fff; color: var(--accent); border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700; transition: var(--bounce);
}
.moda-urban-template .cart-count.bump { animation: modaBounceIn 0.5s ease; }
.moda-urban-template .menu-toggle { display: none; background: none; border: none; font-size: 1.6rem; cursor: pointer; padding: 4px; color: var(--text); margin-right: 8px; }

.moda-urban-template .mobile-menu-drawer {
  display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; flex-direction: column; 
  box-shadow: var(--shadow-lg); border-bottom: 1px solid var(--border); border-top: 1px solid var(--border);
}
.moda-urban-template .mobile-menu-drawer.show { display: flex; animation: modaSlideDown 0.3s ease; }
.moda-urban-template .nav-links { list-style: none; padding: 1rem; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.moda-urban-template .nav-links a { display: block; padding: 10px; color: var(--text); text-decoration: none; font-weight: 500; border-radius: 8px; }
.moda-urban-template .nav-links a:hover { background: #f5f5f5; }

.moda-urban-template .hero-editorial {
  padding: 4rem 0 2rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 2.5rem;
}
.moda-urban-template .hero-editorial-inner {
  max-width: 700px;
}
.moda-urban-template .hero-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-light);
  margin-bottom: 1rem;
  border: 1px solid var(--border);
  padding: 4px 12px;
  border-radius: 50px;
}
.moda-urban-template .hero-heading {
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 900;
  letter-spacing: -2px;
  line-height: 1;
  text-transform: uppercase;
  color: var(--text);
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.moda-urban-template .hero-heading-underline {
  display: inline-block;
  position: relative;
  color: var(--text);
}
.moda-urban-template .hero-heading-underline::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--text);
  border-radius: 2px;
}
.moda-urban-template .hero-desc {
  font-size: 1rem;
  color: var(--text-light);
  max-width: 500px;
  line-height: 1.6;
  margin: 0;
}
.moda-urban-template .main-container { max-width: 1300px; margin: 0 auto; padding: 2rem; }
.moda-urban-template .filters-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 2rem; align-items: center; animation: modaFadeInUp 0.6s ease; }
.moda-urban-template .filter-btn {
  padding: 8px 18px; border-radius: 50px; border: 1px solid var(--border); background: #fff; cursor: pointer; font-weight: 500;
  font-size: 0.9rem; transition: var(--transition); white-space: nowrap; color: var(--text-light);
}
.moda-urban-template .filter-btn:hover, .moda-urban-template .filter-btn.active {
  background: var(--text); color: #fff; border-color: var(--text); transform: translateY(-1px); box-shadow: var(--shadow-sm);
}
.moda-urban-template .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; }
.moda-urban-template .empty-catalog {
  grid-column: 1 / -1; min-height: 300px; border: 1px dashed #d0d0d0; border-radius: var(--radius); background: #fff; display: flex;
  flex-direction: column; align-items: center; justify-content: center; color: #888; text-align: center; gap: 8px;
}
.moda-urban-template .empty-catalog strong { color: var(--text); font-size: 1.1rem; }
.moda-urban-template .product-card {
  background: var(--surface); border-radius: var(--radius); overflow: hidden; position: relative; transition: var(--transition);
  border: 1px solid var(--border); cursor: pointer; animation: modaFadeInUp 0.6s ease both;
}
.moda-urban-template .product-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: #d0d0d0; }
.moda-urban-template .product-image-wrapper {
  position: relative;
  overflow: hidden;
  aspect-ratio: 3/4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.moda-urban-template .product-media { width: 100%; height: 100%; object-fit: cover; display: block; }
.moda-urban-template video.product-media { background: #f3f3f3; }
.moda-urban-template .product-image-wrapper .product-media { transition: transform 0.6s cubic-bezier(0.4,0,0.2,1); }
.moda-urban-template .product-card:hover .product-image-wrapper .product-media { transform: scale(1.05); }
.moda-urban-template .product-image-wrapper .video-poster { position: absolute; inset: 0; z-index: 1; opacity: 1; transition: opacity 0.2s ease, transform 0.6s cubic-bezier(0.4,0,0.2,1); }
.moda-urban-template .product-image-wrapper .hover-video { position: absolute; inset: 0; z-index: 2; opacity: 0; transition: opacity 0.2s ease, transform 0.6s cubic-bezier(0.4,0,0.2,1); }
.moda-urban-template .product-card:hover .product-image-wrapper .hover-video[data-ready="true"] { opacity: 1; }
.moda-urban-template .product-image-wrapper .video-poster.no-poster + .hover-video[data-ready="true"] { opacity: 1; }
.moda-urban-template .video-placeholder {
  background: #f6f6f6; color: #1a1a1a; display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.moda-urban-template .video-placeholder img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
.moda-urban-template .video-placeholder span {
  position: relative; z-index: 2; width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.moda-urban-template .video-indicator {
  position: absolute; right: 12px; top: 12px; width: 30px; height: 30px; border-radius: 50%; background: rgba(0,0,0,0.6);
  color: #fff; display: flex; align-items: center; justify-content: center; z-index: 3;
}
.moda-urban-template .modal-video-indicator, .moda-urban-template .gallery-video-indicator { right: 16px; top: 16px; width: 40px; height: 40px; }
.moda-urban-template .product-actions-overlay {
  position: absolute; bottom: 12px; right: 12px; display: flex; flex-direction: column; gap: 8px; opacity: 0; transform: translateX(10px);
  transition: var(--transition); z-index: 2;
}
.moda-urban-template .product-card:hover .product-actions-overlay { opacity: 1; transform: translateX(0); }
.moda-urban-template .action-btn {
  width: 38px; height: 38px; border-radius: 50%; background: #fff; border: 1px solid var(--border); cursor: pointer; box-shadow: var(--shadow-sm);
  transition: var(--transition); display: flex; align-items: center; justify-content: center; color: var(--text);
}
.moda-urban-template .action-btn:hover { background: var(--accent); color: #fff; border-color: var(--accent); transform: scale(1.05); }
.moda-urban-template .action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.moda-urban-template .product-tag {
  position: absolute; top: 12px; left: 12px; background: var(--text); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; z-index: 2; text-transform: uppercase; letter-spacing: 0.5px;
}
.moda-urban-template .product-tag.new { background: #fff; color: var(--text); border: 1px solid var(--border); }
.moda-urban-template .soldout-layer {
  position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; font-weight: 800; text-transform: uppercase; color: var(--text); font-size: 1.1rem; letter-spacing: 1px; z-index: 4;
}
.moda-urban-template .product-info { padding: 1rem; }
.moda-urban-template .product-category { font-size: 0.75rem; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 4px; }
.moda-urban-template .product-name { font-weight: 700; font-size: 1rem; margin-bottom: 6px; line-height: 1.3; }
.moda-urban-template .product-price { font-weight: 800; font-size: 1.1rem; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.moda-urban-template .old-price, .moda-urban-template .inline-old-price { text-decoration: line-through; color: #999; font-size: 0.85rem; font-weight: 500; }
.moda-urban-template .color-swatches-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.moda-urban-template .color-swatch-mini {
  width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(0,0,0,0.1); transition: var(--transition);
}
.moda-urban-template .color-swatch-mini:hover { transform: scale(1.15); border-color: var(--text); }
.moda-urban-template .color-swatch-mini.active { border-color: var(--text); box-shadow: 0 0 0 2px #fff, 0 0 0 3px var(--text); }
.moda-urban-template .color-swatch-mini.more-colors {
  background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; color: #666; cursor: default;
}

/* Modals */
.moda-urban-template .modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none; transition: opacity 0.3s ease; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
}
.moda-urban-template .modal-overlay.active { opacity: 1; pointer-events: all; }
.moda-urban-template .modal-quick-view {
  background: #fff; border-radius: var(--radius); width: 90%; max-width: 800px; max-height: 85vh; overflow-y: auto; display: flex; flex-direction: row;
  position: relative; transform: translateY(0) scale(1); transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275); box-shadow: var(--shadow-lg);
}
.moda-urban-template .modal-close {
  position: absolute; top: 12px; right: 12px; background: #fff; border: 1px solid var(--border); cursor: pointer; z-index: 10;
  width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: var(--transition); color: var(--text);
}
.moda-urban-template .modal-close:hover { background: #f0f0f0; transform: rotate(90deg); }
.moda-urban-template .modal-image-section {
  flex: 1; min-width: 300px; background: #f9f9f9; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
}
.moda-urban-template .modal-details-section { flex: 1; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; min-width: 280px; }
.moda-urban-template .modal-details-section h2 { font-size: 1.4rem; font-weight: 800; margin: 0; line-height: 1.2; }
.moda-urban-template .modal-price { font-size: 1.4rem; font-weight: 800; color: var(--text); }
.moda-urban-template .modal-description { color: #666; font-size: 0.9rem; margin: 0; line-height: 1.5; }
.moda-urban-template .modal-colors-label { font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-light); }
.moda-urban-template .modal-swatches, .moda-urban-template .modal-sizes { display: flex; gap: 8px; flex-wrap: wrap; }
.moda-urban-template .modal-swatch, .moda-urban-template .detail-swatch {
  width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(0,0,0,0.1); transition: var(--transition);
}
.moda-urban-template .modal-swatch:hover, .moda-urban-template .detail-swatch:hover { transform: scale(1.1); }
.moda-urban-template .modal-swatch.selected, .moda-urban-template .detail-swatch.selected { box-shadow: 0 0 0 2px #fff, 0 0 0 3px var(--text); }
.moda-urban-template .size-btn {
  padding: 8px 14px; border-radius: 4px; border: 1px solid var(--border); background: #fff; cursor: pointer; font-weight: 500; transition: var(--transition); font-size: 0.85rem; color: var(--text);
}
.moda-urban-template .size-btn:hover { border-color: #999; }
.moda-urban-template .size-btn.selected { background: var(--text); color: #fff; border-color: var(--text); }
.moda-urban-template .qty-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-weight: 500; font-size: 0.9rem; }
.moda-urban-template .qty-selector { display: flex; align-items: center; gap: 0; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.moda-urban-template .qty-selector button { width: 34px; height: 34px; border: none; background: #f9f9f9; cursor: pointer; font-size: 1rem; transition: var(--transition); color: var(--text); }
.moda-urban-template .qty-selector button:hover { background: #eaeaea; }
.moda-urban-template .qty-selector input { width: 40px; text-align: center; border: none; font-weight: 600; font-size: 0.95rem; background: #fff; color: var(--text); }
.moda-urban-template .btn-add-cart {
  background: var(--accent); color: #fff; border: none; padding: 14px; border-radius: 50px; font-weight: 600; font-size: 0.95rem;
  cursor: pointer; transition: var(--transition); width: 100%;
}
.moda-urban-template .btn-add-cart:hover { background: var(--accent-hover); transform: translateY(-2px); box-shadow: var(--shadow); }
.moda-urban-template .btn-add-cart:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
.moda-urban-template .btn-view-details {
  background: transparent; color: var(--text); border: none; padding: 10px; font-weight: 500; font-size: 0.9rem; text-decoration: underline; text-underline-offset: 4px;
  cursor: pointer; transition: var(--transition); text-align: center; display: inline-block;
}
.moda-urban-template .btn-view-details:hover { color: #666; }

/* Detail Page */
.moda-urban-template .detail-page { animation: modaFadeInUp 0.5s ease; max-width: 1100px; margin: 0 auto; }
.moda-urban-template .back-to-shop {
  display: inline-flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; font-weight: 500; font-size: 0.9rem;
  color: var(--text-light); padding: 8px 0; margin-bottom: 1rem; transition: var(--transition);
}
.moda-urban-template .back-to-shop:hover { color: var(--text); }
.moda-urban-template .back-to-shop::before { content: '←'; font-size: 1.1rem; }
.moda-urban-template .detail-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
.moda-urban-template .gallery-section { position: sticky; top: 100px; align-self: start; }
.moda-urban-template .gallery-main { border-radius: var(--radius-sm); overflow: hidden; aspect-ratio: 3/4; background: #f9f9f9; margin-bottom: 1rem; position: relative; border: 1px solid var(--border); }
.moda-urban-template .gallery-main .product-media { width: 100%; height: 100%; object-fit: cover; }
.moda-urban-template .gallery-thumbs { display: flex; gap: 10px; flex-wrap: wrap; }
.moda-urban-template .gallery-thumb {
  width: 60px; height: 80px; border-radius: 4px; overflow: hidden; cursor: pointer; border: 1px solid transparent; transition: var(--transition);
  opacity: 0.6; flex-shrink: 0; padding: 0; background: #fff; position: relative;
}
.moda-urban-template .gallery-thumb:hover, .moda-urban-template .gallery-thumb.active { opacity: 1; border-color: var(--text); }
.moda-urban-template .gallery-thumb .product-media { width: 100%; height: 100%; object-fit: cover; }
.moda-urban-template .thumb-play {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff;
  background: rgba(0,0,0,0.3); pointer-events: none;
}
.moda-urban-template .detail-info h1 { font-size: 2rem; font-weight: 800; letter-spacing: -1px; margin: 0 0 1rem; line-height: 1.1; }
.moda-urban-template .detail-price { font-size: 1.8rem; font-weight: 800; margin-bottom: 1.5rem; display: flex; align-items: baseline; gap: 10px; }
.moda-urban-template .detail-old-price { font-size: 1.2rem; font-weight: 500; color: #999; text-decoration: line-through; }
.moda-urban-template .detail-description { color: var(--text-light); margin-bottom: 2rem; line-height: 1.6; font-size: 0.95rem; }
.moda-urban-template .detail-label { font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.moda-urban-template .detail-swatches, .moda-urban-template .detail-sizes { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1.5rem; }
.moda-urban-template .detail-qty { margin-bottom: 1.5rem; }
.moda-urban-template .detail-add { max-width: 400px; }

/* Dynamic Editable Blocks */
.moda-urban-template .detail-blocks-container {
  max-width: 800px; margin: 4rem auto; display: flex; flex-direction: column; gap: 3rem; border-top: 1px solid var(--border); padding-top: 3rem;
}
.moda-urban-template .detail-section { background: transparent; }
.moda-urban-template .detail-section h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; text-align: center; }

/* Benefits Editorial */
.moda-urban-template .benefits-editorial { padding: 2rem 0; border-bottom: 1px solid var(--border); margin-bottom: 2rem; }
.moda-urban-template .benefits-editorial-header { text-align: center; margin-bottom: 1.5rem; }
.moda-urban-template .benefits-editorial-title { font-size: 1.5rem; font-weight: 700; }
.moda-urban-template .benefits-editorial-body { }
.moda-urban-template .benefits-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
@media (max-width: 768px) { .moda-urban-template .benefits-list { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 380px) { .moda-urban-template .benefits-list { grid-template-columns: 1fr; } }
.moda-urban-template .benefit-item { position: relative; padding: 1.5rem; background: #fff; border: 1px solid #e8e8e8; border-radius: 12px; transition: all 0.3s ease; opacity: 0; transform: translateY(20px); }
.moda-urban-template .benefit-item.visible { opacity: 1; transform: translateY(0); }
.moda-urban-template .benefit-item:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-4px); }
.moda-urban-template .benefit-item-number { font-size: 3rem; font-weight: 800; color: #e8e8e8; margin-bottom: 0.5rem; line-height: 1; }
.moda-urban-template .benefit-item-content h3 { font-size: 0.95rem; font-weight: 600; color: #1a1a1a; margin-bottom: 0.5rem; }
.moda-urban-template .benefit-item-content p { font-size: 0.85rem; color: #666; margin: 0; }

.moda-urban-template .benefits-underline { display: inline-block; position: relative; }
.moda-urban-template .benefits-underline::after { content: ''; position: absolute; bottom: 2px; left: 0; width: 100%; height: 4px; background: var(--text); border-radius: 2px; }

.moda-urban-template .promo-banner {
  background: var(--text);
  color: #fff;
  border-radius: var(--radius);
  padding: 4rem 3rem;
  text-align: center;
}
.moda-urban-template .promo-banner-tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
  margin-bottom: 1rem;
  border: 1px solid rgba(255,255,255,0.2);
  padding: 4px 12px;
  border-radius: 50px;
}
.moda-urban-template .promo-banner-title {
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 900;
  letter-spacing: -1px;
  text-transform: uppercase;
  color: #fff;
  margin: 0 0 1rem;
  line-height: 1.1;
}
.moda-urban-template .promo-banner-desc {
  font-size: 1rem;
  color: rgba(255,255,255,0.7);
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.6;
}

.moda-urban-template .faq-list { display: flex; flex-direction: column; gap: 1rem; }
.moda-urban-template .faq-item { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.moda-urban-template .faq-question { padding: 1.2rem; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none; transition: background 0.2s; }
.moda-urban-template .faq-question::-webkit-details-marker { display: none; }
.moda-urban-template .faq-question:hover { background: #fafafa; }
.moda-urban-template .faq-arrow { color: var(--text-light); transition: transform 0.3s; }
.moda-urban-template .faq-item[open] .faq-arrow { transform: rotate(180deg); }
.moda-urban-template .faq-answer { padding: 0 1.2rem 1.2rem; color: var(--text-light); font-size: 0.95rem; line-height: 1.6; border-top: 1px solid #f5f5f5; margin-top: 0.5rem; padding-top: 1rem; }

.moda-urban-template .contact-section { text-align: center; }
.moda-urban-template .contact-info { background: #fff; padding: 2.5rem; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.moda-urban-template .contact-info p { color: var(--text-light); margin-bottom: 1.5rem; font-size: 0.95rem; }
.moda-urban-template .whatsapp-btn {
  display: inline-block; background: #25D366; color: #fff; text-decoration: none; font-weight: 600; padding: 12px 24px;
  border-radius: 50px; font-size: 0.95rem; transition: transform 0.2s;
}
.moda-urban-template .whatsapp-btn:hover { transform: translateY(-2px); }

.moda-urban-template .footer { border-top: 1px solid var(--border); padding: 2rem; text-align: center; color: var(--text-light); font-size: 0.85rem; margin-top: 4rem; }

@media (max-width: 768px) {
  .moda-urban-template .header { padding: 0; }
  .moda-urban-template .header-inner { height: 60px; padding: 0 1rem; }
  .moda-urban-template .logo { font-size: 1.1rem; }
  .moda-urban-template .logo-icon { width: 28px; height: 28px; font-size: 0.7rem; }
  .moda-urban-template .header-subnav { display: none; }
  .moda-urban-template .cart-btn { padding: 8px 12px; font-size: 0.85rem; }
  .moda-urban-template .hero h1 { font-size: 2rem; }
  .moda-urban-template .detail-layout { grid-template-columns: 1fr; gap: 2rem; }
  .moda-urban-template .gallery-section { position: static; }
  .moda-urban-template .modal-quick-view { flex-direction: column; max-height: 90vh; }
  .moda-urban-template .modal-image-section { border-radius: var(--radius) var(--radius) 0 0; aspect-ratio: 3/4; }
  .moda-urban-template .catalog-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
  .moda-urban-template .filters-bar { gap: 8px; }
  .moda-urban-template .filter-btn { padding: 6px 14px; font-size: 0.85rem; }
  .moda-urban-template .detail-blocks-container { padding: 2rem 1rem; }
}
@media (max-width: 480px) {
  .moda-urban-template .main-container { padding: 1rem; }
  .moda-urban-template .catalog-grid { grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  .moda-urban-template .product-info { padding: 0.8rem; }
  .moda-urban-template .product-name { font-size: 0.9rem; }
  .moda-urban-template .product-price { font-size: 1rem; }
  .moda-urban-template .color-swatch-mini { width: 18px; height: 18px; }
  .moda-urban-template .modal-details-section { padding: 1.2rem; }
  .moda-urban-template .detail-layout { gap: 1.5rem; }
  .moda-urban-template .logo-text { display: none; }
}

/* Reviews Section */
.moda-urban-template .reviews-section { border-top: 1px solid var(--border); padding-top: 3rem; }
.moda-urban-template .reviews-header { display: flex; align-items: baseline; gap: 1rem; margin-bottom: 2rem; }
.moda-urban-template .reviews-header h2 { font-size: 1.5rem; font-weight: 700; margin: 0; }
.moda-urban-template .reviews-avg-score { font-size: 2rem; font-weight: 800; color: var(--text); }
.moda-urban-template .reviews-avg-meta { display: flex; flex-direction: column; gap: 2px; }
.moda-urban-template .reviews-stars-row { display: flex; align-items: center; gap: 2px; }
.moda-urban-template .review-star { color: #f5a623; font-size: 1.1rem; line-height: 1; }
.moda-urban-template .review-star.empty { color: #e0e0e0; }
.moda-urban-template .reviews-count { font-size: 0.85rem; color: var(--text-light); }

.moda-urban-template .reviews-list { display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 3rem; }
.moda-urban-template .review-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1.25rem 1.5rem; }
.moda-urban-template .review-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem; }
.moda-urban-template .review-author { font-weight: 600; font-size: 0.95rem; color: var(--text); }
.moda-urban-template .review-meta { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.moda-urban-template .verified-badge { font-size: 0.72rem; font-weight: 600; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.moda-urban-template .review-date { font-size: 0.8rem; color: var(--text-light); }
.moda-urban-template .review-comment { font-size: 0.9rem; color: #444; line-height: 1.6; margin-top: 0.5rem; }
.moda-urban-template .reviews-empty { color: var(--text-light); font-size: 0.95rem; padding: 1.5rem 0; }

.moda-urban-template .review-form-section { border-top: 1px solid var(--border); padding-top: 2rem; }
.moda-urban-template .review-form-section h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 1.5rem; }
.moda-urban-template .review-form { display: flex; flex-direction: column; gap: 1rem; max-width: 560px; }
.moda-urban-template .star-selector { display: flex; gap: 4px; margin-bottom: 0.25rem; }
.moda-urban-template .star-btn { background: none; border: none; cursor: pointer; padding: 2px; font-size: 1.6rem; color: #e0e0e0; line-height: 1; transition: color 0.15s, transform 0.15s; }
.moda-urban-template .star-btn.active { color: #f5a623; }
.moda-urban-template .star-btn:hover { transform: scale(1.15); }
.moda-urban-template .review-input { width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.9rem; background: #fff; color: var(--text); outline: none; font-family: inherit; transition: border-color 0.2s; }
.moda-urban-template .review-input:focus { border-color: var(--accent); }
.moda-urban-template .review-textarea { resize: vertical; min-height: 100px; }
.moda-urban-template .review-submit-btn { align-self: flex-start; background: var(--accent); color: #fff; border: none; padding: 11px 24px; border-radius: 50px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: background 0.2s, transform 0.2s; }
.moda-urban-template .review-submit-btn:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); }
.moda-urban-template .review-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.moda-urban-template .review-feedback { font-size: 0.88rem; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid; margin-top: 0.25rem; }
.moda-urban-template .review-feedback.success { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
.moda-urban-template .review-feedback.error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
`
