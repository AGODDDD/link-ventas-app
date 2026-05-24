'use client'

import React, { FormEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ProductMedia, Profile, Product } from '@/types/tienda'
import { useCartStore } from '@/store/useCartStore'
import SlideOverCart from '@/components/tienda/SlideOverCart'

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

const FALLBACK_COLORS = ['#1a1a1a', '#f5f5f0', '#1a3a5c', '#8a8a8a', '#d4c5b2']

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

  if (media.length > 0) return media

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

function averageRating(product: Product) {
  return product.rating || 5
}

function reviewCount(product: Product) {
  return product.reviews_count || 0
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
  event.currentTarget.pause()
  event.currentTarget.currentTime = 0
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
            <span>▶</span>
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
  const description = perfil.description || 'Polos y pantalones con diseno premium. Explora todos los colores sin salir del catalogo.'
  const cartStore = useCartStore()
  const cart = cartStore.carts[storeId] || []
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  const activeProducts = useMemo(() => productos.filter(product => product.is_active !== false), [productos])
  const categories = useMemo(() => uniqueValues(activeProducts.map(product => product.category)), [activeProducts])

  const [currentFilter, setCurrentFilter] = useState('all')
  const [catalogVisible, setCatalogVisible] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [selectedColorIndex, setSelectedColorIndex] = useState<Record<string, number>>({})
  const [selectedSize, setSelectedSize] = useState<Record<string, string>>({})
  const [modalQty, setModalQty] = useState(1)
  const [detailQty, setDetailQty] = useState(1)
  const [detailMediaIndex, setDetailMediaIndex] = useState(0)
  const [selectedReviewStar, setSelectedReviewStar] = useState(5)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  const filteredProducts = currentFilter === 'all'
    ? activeProducts
    : activeProducts.filter(product => product.category === currentFilter)

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

    const color = currentProductColor(product)
    const size = currentProductSize(product)
    const variantDetails = {
      ...(color ? { color } : {}),
      ...(size ? { talla: size } : {}),
    }

    Array.from({ length: qty }).forEach(() => cartStore.addToCart(storeId, product, variantDetails))
    toast.success('✅ ¡Agregado al carrito!')
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filterCatalog = (filter: string) => {
    setCurrentFilter(filter)
    setCatalogVisible(true)
    setSelectedProduct(null)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    toast.success('✅ ¡Mensaje enviado! Te responderemos pronto.')
    event.currentTarget.reset()
  }

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    toast.success('✅ ¡Reseña publicada!')
    event.currentTarget.reset()
  }

  return (
    <div className="moda-urban-template">
      <style>{modaUrbanStyles}</style>

      <header className="header" id="header">
        <div className="header-inner">
          <a href="#" className="logo" onClick={goToCatalog}>
            <span className="logo-icon">{storeName.slice(0, 2).toUpperCase()}</span> {storeName}
          </a>
          <button className="menu-toggle" aria-label="Menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
          <nav>
            <ul className={`nav-links ${mobileMenuOpen ? 'show' : ''}`}>
              <li><a href="#" onClick={goToCatalog}>Inicio</a></li>
              {categories.slice(0, 3).map(category => (
                <li key={category}><a href="#" onClick={(event) => { event.preventDefault(); filterCatalog(category) }}>{categoryLabel(category)}</a></li>
              ))}
              <li><a href="#whyUsSection" onClick={() => setMobileMenuOpen(false)}>Nosotros</a></li>
              <li><a href="#faqSection" onClick={() => setMobileMenuOpen(false)}>FAQ</a></li>
              <li><a href="#contactSection" onClick={() => setMobileMenuOpen(false)}>Contacto</a></li>
            </ul>
          </nav>
          <button className="cart-btn" onClick={() => setCartOpen(true)}>
            🛒 Carrito <span className={`cart-count ${totalItems > 0 ? 'bump' : ''}`}>{totalItems}</span>
          </button>
        </div>
      </header>

      <main className="main-container" id="mainContent">
        {catalogVisible ? (
          <div id="catalogView">
            <section className="hero">
              <span className="hero-badge">✨ Nueva Coleccion 2026</span>
              <h1>Descubre tu estilo</h1>
              <p>{description}</p>
            </section>

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

            <div className="catalog-grid" id="catalogGrid">
              {filteredProducts.length === 0 ? (
                <div className="empty-catalog">
                  <strong>No hay prendas para mostrar</strong>
                  <span>Agrega productos activos para esta plantilla.</span>
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
                    onQuickAdd={() => addToCart(product)}
                    isReadOnly={isReadOnly}
                  />
                ))
              )}
            </div>
          </div>
        ) : selectedProduct ? (
          <DetailView
            product={selectedProduct}
            selectedColorIndex={selectedColorIndex[selectedProduct.id] || 0}
            selectedSize={currentProductSize(selectedProduct)}
            quantity={detailQty}
            selectedReviewStar={selectedReviewStar}
            storeName={storeName}
            whatsappPhone={perfil.whatsapp_phone}
            onBack={() => goToCatalog()}
            selectedMediaIndex={detailMediaIndex}
            onMediaChange={setDetailMediaIndex}
            onColorChange={(colorIndex) => setSelectedColorIndex(prev => ({ ...prev, [selectedProduct.id]: colorIndex }))}
            onSizeChange={(size) => setSelectedSize(prev => ({ ...prev, [selectedProduct.id]: size }))}
            onQuantityChange={(delta) => setDetailQty(value => Math.max(1, Math.min(10, value + delta)))}
            onAddToCart={() => addToCart(selectedProduct, detailQty)}
            onReviewStarChange={setSelectedReviewStar}
            onSubmitReview={submitReview}
            onSubmitContact={submitContact}
            isReadOnly={isReadOnly}
          />
        ) : null}
      </main>

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

      <footer className="footer">
        © 2026 {storeName}. Todos los derechos reservados.
      </footer>

      <SlideOverCart storeId={storeId} isOpen={cartOpen} onClose={() => setCartOpen(false)} />
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
  const displaySwatches = colors.slice(0, 5)
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0
  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0

  return (
    <div className="product-card animate-in" style={{ animationDelay: `${index * 0.07}s` }}>
      <div className="product-image-wrapper" onClick={onOpenDetail}>
        {discount > 0 && <span className="product-tag">Oferta</span>}
        {!discount && product.created_at && <span className="product-tag new">Nuevo</span>}
        <ProductMediaFrame media={primaryMedia} alt={`${product.name}${colors[selectedColorIndex] ? ` - ${colors[selectedColorIndex]}` : ''}`} hoverPlay className="product-media" />
        {primaryMedia.type === 'video' && <span className="video-indicator">▶</span>}
        {isOutOfStock && <div className="soldout-layer">Agotado</div>}
        <div className="product-actions-overlay">
          <button className="action-btn" title="Vista rapida" onClick={(event) => { event.stopPropagation(); onOpenQuickView() }}>👁</button>
          <button className="action-btn" title="Agregar rapido" disabled={isReadOnly || isOutOfStock} onClick={(event) => { event.stopPropagation(); onQuickAdd() }}>🛒</button>
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
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-image-section">
          <ProductMediaFrame media={primaryMedia} alt={product.name} autoplay className="product-media" />
          {primaryMedia.type === 'video' && <span className="video-indicator modal-video-indicator">▶</span>}
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
          <button className="btn-add-cart" disabled={isReadOnly} onClick={onAddToCart}>🛒 AGREGAR AL CARRITO</button>
          <button className="btn-view-details" onClick={onOpenDetail}>Ver detalles completos →</button>
        </div>
      </div>
    </div>
  )
}

function DetailView({
  product,
  selectedColorIndex,
  selectedSize,
  quantity,
  selectedReviewStar,
  storeName,
  whatsappPhone,
  onBack,
  selectedMediaIndex,
  onMediaChange,
  onColorChange,
  onSizeChange,
  onQuantityChange,
  onAddToCart,
  onReviewStarChange,
  onSubmitReview,
  onSubmitContact,
  isReadOnly,
}: {
  product: Product;
  selectedColorIndex: number;
  selectedSize: string;
  quantity: number;
  selectedReviewStar: number;
  storeName: string;
  whatsappPhone?: string;
  onBack: () => void;
  selectedMediaIndex: number;
  onMediaChange: (index: number) => void;
  onColorChange: (index: number) => void;
  onSizeChange: (size: string) => void;
  onQuantityChange: (delta: number) => void;
  onAddToCart: () => void;
  onReviewStarChange: (star: number) => void;
  onSubmitReview: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitContact: (event: FormEvent<HTMLFormElement>) => void;
  isReadOnly?: boolean;
}) {
  const colors = getColors(product)
  const sizes = getSizes(product)
  const selectedColor = colors[selectedColorIndex]
  const rating = averageRating(product)
  const reviews = reviewCount(product)
  const media = getProductMedia(product)
  const activeMedia = media[selectedMediaIndex] || media[0]

  return (
    <div className="detail-page active" id="detailPage">
      <button className="back-to-shop" onClick={onBack}>← Volver a la tienda</button>
      <div className="detail-layout">
        <div className="gallery-section">
          <div className="gallery-main">
            <ProductMediaFrame media={activeMedia} alt={product.name} autoplay={activeMedia.type === 'video'} className="product-media" />
            {activeMedia.type === 'video' && <span className="video-indicator gallery-video-indicator">▶</span>}
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
                {item.type === 'video' && <span className="thumb-play">▶</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <div className="product-category">{categoryLabel(product.category)}</div>
          <h1>{product.name}</h1>
          <div className="detail-rating">
            <span className="stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
            <span>({reviews} reseñas)</span>
          </div>
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
          <button className="btn-add-cart detail-add" disabled={isReadOnly} onClick={onAddToCart}>🛒 AGREGAR AL CARRITO</button>
        </div>
      </div>

      <div className="detail-section" id="reviewsSection">
        <h2>📝 Reseñas de clientes</h2>
        <div className="rating-distribution animate-in">
          <div className="rating-summary">
            <div>
              <div className="rating-big-number">{rating.toFixed(1)}</div>
              <div className="stars detail-stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</div>
              <div className="review-count">{reviews} reseña(s)</div>
            </div>
            <div className="rating-breakdown">
              {[5, 4, 3, 2, 1].map(star => (
                <div className="rating-row" key={star}>
                  <span className="star-label">{star} ★</span>
                  <div className="rating-bar-bg"><div className="rating-bar-fill" style={{ width: `${star === Math.round(rating) ? 80 : 12}%` }} /></div>
                  <span className="percentage">{star === Math.round(rating) ? 80 : 5}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <form className="review-form animate-in" onSubmit={onSubmitReview}>
          <h3>Deja tu reseña</h3>
          <div className="star-rating-input">
            {[1, 2, 3, 4, 5].map(star => (
              <button type="button" key={star} className={star <= selectedReviewStar ? 'active' : ''} onClick={() => onReviewStarChange(star)}>
                {star <= selectedReviewStar ? '★' : '☆'}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Tu nombre" required />
          <textarea rows={3} placeholder="Cuéntanos tu experiencia..." required />
          <button className="btn-submit">Enviar reseña</button>
        </form>
      </div>

      <div className="detail-section" id="whyUsSection">
        <h2>🌟 ¿Por qué elegirnos?</h2>
        <div className="why-us-grid">
          {[
            ['🚚', 'Envio Rapido', 'Despachamos tus pedidos en el menor tiempo posible.'],
            ['🔄', 'Cambios', 'Tallas y colores claros para comprar con confianza.'],
            ['🏅', 'Calidad Premium', 'Catalogo pensado para resaltar el valor de cada prenda.'],
            ['💬', 'Soporte', 'Atencion directa por los canales de la tienda.'],
            ['🔒', 'Pago Seguro', 'Checkout conectado al flujo de LinkVentas.'],
            ['✨', 'Look Boutique', 'Experiencia visual diferenciada para moda.'],
          ].map(([icon, title, body]) => (
            <div className="why-us-card animate-in" key={title}>
              <div className="why-us-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section" id="faqSection">
        <h2>❓ Preguntas Frecuentes</h2>
        {[
          ['¿Cuánto demora el envío?', 'El tiempo de entrega depende de la zona y la modalidad elegida en checkout.'],
          ['¿Puedo cambiar la talla?', 'Coordina cambios directamente con la tienda segun disponibilidad.'],
          ['¿Los colores son exactos?', 'Puede haber ligeras variaciones por pantalla, pero el catalogo muestra la referencia principal.'],
          ['¿Métodos de pago?', 'Los metodos disponibles aparecen al finalizar la compra.'],
        ].map(([question, answer]) => (
          <details className="faq-item" key={question}>
            <summary className="faq-question">{question} <span className="faq-arrow">▼</span></summary>
            <div className="faq-answer">{answer}</div>
          </details>
        ))}
      </div>

      <div className="detail-section contact-section" id="contactSection">
        <div className="contact-info">
          <h2>📬 Contáctanos</h2>
          <p>Estamos aqui para ayudarte. Escribenos y te responderemos pronto.</p>
          {whatsappPhone && <div className="contact-info-item"><span className="contact-info-icon">📞</span> {whatsappPhone}</div>}
          <div className="contact-info-item"><span className="contact-info-icon">🏬</span> {storeName}</div>
        </div>
        <form className="contact-form" onSubmit={onSubmitContact}>
          <input type="text" placeholder="Tu nombre" required />
          <input type="email" placeholder="Tu email" required />
          <textarea rows={4} placeholder="Escribe tu mensaje..." required />
          <button type="submit" className="btn-submit">Enviar mensaje</button>
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
  --star: #f0c040;
  --danger: #e74c3c;
  --success: #2ecc71;
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
  position: sticky; top: 0; z-index: 80; background: rgba(255,255,255,0.92);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border); padding: 0 2rem; transition: var(--transition);
}
.moda-urban-template .header-inner {
  max-width: 1300px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 68px;
}
.moda-urban-template .logo {
  font-size: 1.6rem; font-weight: 800; letter-spacing: -1px; text-decoration: none; color: var(--text);
  display: flex; align-items: center; gap: 8px; transition: var(--transition);
}
.moda-urban-template .logo:hover { transform: scale(1.03); }
.moda-urban-template .logo-icon {
  width: 38px; height: 38px; background: var(--accent); border-radius: 10px; display: flex;
  align-items: center; justify-content: center; color: #fff; font-size: 0.85rem; font-weight: 900;
}
.moda-urban-template .nav-links { display: flex; gap: 2rem; list-style: none; align-items: center; margin: 0; padding: 0; }
.moda-urban-template .nav-links a {
  text-decoration: none; color: var(--text); font-weight: 500; font-size: 0.95rem; position: relative; transition: var(--transition); padding: 4px 0;
}
.moda-urban-template .nav-links a::after {
  content: ''; position: absolute; bottom: -2px; left: 0; width: 0; height: 2px; background: var(--accent); transition: width var(--transition);
}
.moda-urban-template .nav-links a:hover::after { width: 100%; }
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
.moda-urban-template .menu-toggle { display: none; background: none; border: none; font-size: 1.6rem; cursor: pointer; padding: 8px; color: var(--text); }
.moda-urban-template .hero {
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 40%, #f0f0f0 100%); padding: 3rem 2rem; text-align: center;
  position: relative; overflow: hidden; border-radius: var(--radius); margin-bottom: 2rem;
}
.moda-urban-template .hero::before {
  content: ''; position: absolute; width: 400px; height: 400px; background: radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%);
  top: -100px; right: -100px; border-radius: 50%;
}
.moda-urban-template .hero h1 { font-size: 3rem; font-weight: 900; letter-spacing: -2px; margin: 0 0 0.5rem; animation: modaSlideDown 0.7s ease; }
.moda-urban-template .hero p { font-size: 1.2rem; color: var(--text-light); margin: 0; animation: modaSlideDown 0.7s ease 0.15s both; }
.moda-urban-template .hero-badge {
  display: inline-block; background: var(--accent); color: #fff; padding: 6px 16px; border-radius: 50px; font-size: 0.85rem; font-weight: 600;
  margin-bottom: 1rem; animation: modaBounceIn 0.7s ease 0.3s both;
}
.moda-urban-template .main-container { max-width: 1300px; margin: 0 auto; padding: 2rem; }
.moda-urban-template .filters-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 2rem; align-items: center; animation: modaFadeInUp 0.6s ease; }
.moda-urban-template .filter-btn {
  padding: 10px 20px; border-radius: 50px; border: 2px solid var(--border); background: #fff; cursor: pointer; font-weight: 500;
  font-size: 0.9rem; transition: var(--transition); white-space: nowrap;
}
.moda-urban-template .filter-btn:hover, .moda-urban-template .filter-btn.active {
  background: var(--accent); color: #fff; border-color: var(--accent); transform: translateY(-2px); box-shadow: var(--shadow-sm);
}
.moda-urban-template .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.8rem; }
.moda-urban-template .empty-catalog {
  grid-column: 1 / -1; min-height: 320px; border: 1px dashed #ddd; border-radius: var(--radius); background: #fff; display: flex;
  flex-direction: column; align-items: center; justify-content: center; color: #999; text-align: center; gap: 6px;
}
.moda-urban-template .empty-catalog strong { color: var(--text); font-size: 1.1rem; }
.moda-urban-template .product-card {
  background: var(--surface); border-radius: var(--radius); overflow: hidden; position: relative; transition: var(--transition);
  border: 1px solid transparent; cursor: pointer; animation: modaFadeInUp 0.6s ease both;
}
.moda-urban-template .product-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); border-color: var(--border); }
.moda-urban-template .product-image-wrapper {
  position: relative; overflow: hidden; aspect-ratio: 3/4; background: #f9f9f9; display: flex; align-items: center; justify-content: center;
}
.moda-urban-template .product-media { width: 100%; height: 100%; object-fit: cover; display: block; }
.moda-urban-template video.product-media { background: #f3f3f3; }
.moda-urban-template .product-image-wrapper .product-media { transition: transform 0.6s cubic-bezier(0.4,0,0.2,1); }
.moda-urban-template .product-card:hover .product-image-wrapper .product-media { transform: scale(1.08); }
.moda-urban-template .product-image-wrapper .video-poster { position: absolute; inset: 0; z-index: 1; opacity: 1; transition: opacity 0.2s ease, transform 0.6s cubic-bezier(0.4,0,0.2,1); }
.moda-urban-template .product-image-wrapper .hover-video { position: absolute; inset: 0; z-index: 2; opacity: 0; transition: opacity 0.2s ease, transform 0.6s cubic-bezier(0.4,0,0.2,1); }
.moda-urban-template .product-card:hover .product-image-wrapper .hover-video[data-ready="true"] { opacity: 1; }
.moda-urban-template .product-image-wrapper .video-poster.no-poster + .hover-video[data-ready="true"] { opacity: 1; }
.moda-urban-template .video-placeholder {
  background: #f6f6f6; color: #1a1a1a; display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.moda-urban-template .video-placeholder img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1;
}
.moda-urban-template .video-placeholder span {
  position: relative; z-index: 2;
  width: 58px; height: 58px; border-radius: 50%; background: rgba(255,255,255,0.88); display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem; box-shadow: 0 12px 30px rgba(0,0,0,0.18);
}
.moda-urban-template .video-indicator {
  position: absolute; right: 12px; top: 12px; width: 34px; height: 34px; border-radius: 50%; background: rgba(0,0,0,0.7);
  color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; z-index: 3; box-shadow: var(--shadow-sm);
}
.moda-urban-template .modal-video-indicator, .moda-urban-template .gallery-video-indicator { right: 16px; top: 16px; width: 42px; height: 42px; font-size: 1rem; }
.moda-urban-template .product-actions-overlay {
  position: absolute; bottom: 12px; right: 12px; display: flex; flex-direction: column; gap: 8px; opacity: 0; transform: translateX(20px);
  transition: var(--transition); z-index: 2;
}
.moda-urban-template .product-card:hover .product-actions-overlay { opacity: 1; transform: translateX(0); }
.moda-urban-template .action-btn {
  width: 40px; height: 40px; border-radius: 50%; background: #fff; border: none; cursor: pointer; font-size: 1rem; box-shadow: var(--shadow);
  transition: var(--transition); display: flex; align-items: center; justify-content: center; color: var(--text);
}
.moda-urban-template .action-btn:hover { background: var(--accent); color: #fff; transform: scale(1.1); }
.moda-urban-template .action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.moda-urban-template .product-tag {
  position: absolute; top: 12px; left: 12px; background: var(--danger); color: #fff; padding: 4px 10px; border-radius: 50px; font-size: 0.75rem; font-weight: 700; z-index: 2;
}
.moda-urban-template .product-tag.new { background: var(--success); }
.moda-urban-template .soldout-layer {
  position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; font-weight: 900; text-transform: uppercase;
}
.moda-urban-template .product-info { padding: 1rem 1.2rem 1.2rem; }
.moda-urban-template .product-category { font-size: 0.78rem; color: var(--text-light); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 2px; }
.moda-urban-template .product-name { font-weight: 700; font-size: 1.05rem; margin-bottom: 4px; }
.moda-urban-template .product-price { font-weight: 800; font-size: 1.2rem; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.moda-urban-template .old-price, .moda-urban-template .inline-old-price { text-decoration: line-through; color: #999; font-size: 0.85rem; font-weight: 500; margin-left: 8px; }
.moda-urban-template .color-swatches-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
.moda-urban-template .color-swatch-mini {
  width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: var(--transition);
  position: relative; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.moda-urban-template .color-swatch-mini:hover { transform: scale(1.25); border-color: var(--text); z-index: 3; }
.moda-urban-template .color-swatch-mini.active { border-color: var(--text); box-shadow: 0 0 0 3px rgba(0,0,0,0.1); }
.moda-urban-template .color-swatch-mini.more-colors {
  background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; color: #666; cursor: default;
}
.moda-urban-template .modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 2000; display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none; transition: opacity 0.35s ease; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
}
.moda-urban-template .modal-overlay.active { opacity: 1; pointer-events: all; }
.moda-urban-template .modal-quick-view {
  background: #fff; border-radius: var(--radius); width: 90%; max-width: 850px; max-height: 85vh; overflow-y: auto; display: flex; flex-direction: row;
  position: relative; transform: translateY(0) scale(1); transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275); box-shadow: var(--shadow-lg);
}
.moda-urban-template .modal-close {
  position: absolute; top: 12px; right: 16px; background: #fff; border: none; font-size: 1.5rem; cursor: pointer; z-index: 10;
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm); transition: var(--transition);
}
.moda-urban-template .modal-close:hover { background: #f0f0f0; transform: rotate(90deg); }
.moda-urban-template .modal-image-section {
  flex: 1; min-width: 300px; background: #f9f9f9; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;
  border-radius: var(--radius) 0 0 var(--radius);
}
.moda-urban-template .modal-image-section .product-media { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.moda-urban-template .modal-details-section { flex: 1; padding: 2rem; display: flex; flex-direction: column; gap: 1rem; min-width: 280px; }
.moda-urban-template .modal-details-section h2 { font-size: 1.5rem; font-weight: 800; margin: 0; }
.moda-urban-template .modal-price { font-size: 1.6rem; font-weight: 800; color: var(--text); }
.moda-urban-template .modal-description { color: #666; font-size: 0.9rem; margin: 0; }
.moda-urban-template .modal-colors-label { font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-light); }
.moda-urban-template .modal-swatches, .moda-urban-template .modal-sizes { display: flex; gap: 10px; flex-wrap: wrap; }
.moda-urban-template .modal-swatch, .moda-urban-template .detail-swatch {
  width: 34px; height: 34px; border-radius: 50%; cursor: pointer; border: 3px solid transparent; transition: var(--transition); box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}
.moda-urban-template .modal-swatch:hover, .moda-urban-template .detail-swatch:hover { transform: scale(1.2); border-color: #999; }
.moda-urban-template .modal-swatch.selected, .moda-urban-template .detail-swatch.selected { border-color: var(--accent); box-shadow: 0 0 0 5px rgba(0,0,0,0.08); }
.moda-urban-template .size-btn {
  padding: 8px 16px; border-radius: 6px; border: 2px solid var(--border); background: #fff; cursor: pointer; font-weight: 600; transition: var(--transition); font-size: 0.9rem;
}
.moda-urban-template .size-btn:hover { border-color: #999; }
.moda-urban-template .size-btn.selected { background: var(--accent); color: #fff; border-color: var(--accent); }
.moda-urban-template .qty-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-weight: 600; }
.moda-urban-template .qty-selector { display: flex; align-items: center; gap: 0; border: 2px solid var(--border); border-radius: 8px; overflow: hidden; width: fit-content; }
.moda-urban-template .qty-selector button { width: 38px; height: 38px; border: none; background: #f5f5f5; cursor: pointer; font-size: 1.2rem; font-weight: 700; transition: var(--transition); }
.moda-urban-template .qty-selector button:hover { background: #e0e0e0; }
.moda-urban-template .qty-selector input { width: 50px; text-align: center; border: none; font-weight: 700; font-size: 1rem; background: #fff; }
.moda-urban-template .btn-add-cart {
  background: var(--accent); color: #fff; border: none; padding: 14px 28px; border-radius: 50px; font-weight: 700; font-size: 1rem;
  cursor: pointer; transition: var(--transition); width: 100%; letter-spacing: 0.5px;
}
.moda-urban-template .btn-add-cart:hover { background: var(--accent-hover); transform: translateY(-2px); box-shadow: var(--shadow); }
.moda-urban-template .btn-add-cart:disabled { opacity: 0.45; cursor: not-allowed; }
.moda-urban-template .btn-view-details {
  background: transparent; color: var(--accent); border: 2px solid var(--accent); padding: 12px 24px; border-radius: 50px; font-weight: 700;
  cursor: pointer; transition: var(--transition); text-align: center; text-decoration: none; display: inline-block;
}
.moda-urban-template .btn-view-details:hover { background: var(--accent); color: #fff; }
.moda-urban-template .detail-page { animation: modaFadeInUp 0.5s ease; }
.moda-urban-template .back-to-shop {
  display: inline-flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; font-weight: 600; font-size: 0.95rem;
  color: var(--text); padding: 8px 0; margin-bottom: 1.5rem; transition: var(--transition);
}
.moda-urban-template .back-to-shop:hover { color: var(--accent); gap: 10px; }
.moda-urban-template .detail-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
.moda-urban-template .gallery-section { position: sticky; top: 90px; align-self: start; }
.moda-urban-template .gallery-main { border-radius: var(--radius); overflow: hidden; aspect-ratio: 3/4; background: #f9f9f9; margin-bottom: 1rem; position: relative; cursor: zoom-in; }
.moda-urban-template .gallery-main .product-media { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.moda-urban-template .gallery-main:hover .product-media { transform: scale(1.5); }
.moda-urban-template .gallery-thumbs { display: flex; gap: 8px; flex-wrap: wrap; }
.moda-urban-template .gallery-thumb {
  width: 64px; height: 80px; border-radius: 6px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: var(--transition);
  opacity: 0.7; flex-shrink: 0; padding: 0; background: #fff; position: relative;
}
.moda-urban-template .gallery-thumb:hover, .moda-urban-template .gallery-thumb.active { opacity: 1; border-color: var(--accent); }
.moda-urban-template .gallery-thumb .product-media { width: 100%; height: 100%; object-fit: cover; }
.moda-urban-template .thumb-play {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.8rem;
  background: rgba(0,0,0,0.28); text-shadow: 0 1px 8px rgba(0,0,0,0.55); pointer-events: none;
}
.moda-urban-template .detail-info h1 { font-size: 2rem; font-weight: 900; letter-spacing: -1px; margin: 0 0 0.3rem; }
.moda-urban-template .detail-rating { display: flex; align-items: center; gap: 6px; margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-light); }
.moda-urban-template .stars { color: var(--star); letter-spacing: 2px; }
.moda-urban-template .detail-price { font-size: 2rem; font-weight: 900; margin-bottom: 1.5rem; }
.moda-urban-template .detail-old-price { font-size: 1.2rem; }
.moda-urban-template .detail-description { color: var(--text-light); margin-bottom: 1.5rem; line-height: 1.7; }
.moda-urban-template .detail-label { font-weight: 700; }
.moda-urban-template .detail-swatches, .moda-urban-template .detail-sizes { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 1.5rem; }
.moda-urban-template .detail-qty { margin-bottom: 1rem; }
.moda-urban-template .detail-add { max-width: 350px; }
.moda-urban-template .detail-section { margin: 3.5rem 0; animation: modaFadeInUp 0.7s ease both; }
.moda-urban-template .detail-section h2 { font-size: 1.7rem; font-weight: 800; margin-bottom: 1.4rem; letter-spacing: -0.5px; position: relative; display: inline-block; }
.moda-urban-template .detail-section h2::after { content: ''; position: absolute; bottom: -4px; left: 0; width: 50px; height: 4px; background: var(--accent); border-radius: 4px; }
.moda-urban-template .rating-distribution, .moda-urban-template .review-card, .moda-urban-template .review-form, .moda-urban-template .why-us-card, .moda-urban-template .faq-item, .moda-urban-template .contact-section {
  background: #fff; border-radius: var(--radius-sm); padding: 1.5rem; border: 1px solid var(--border);
}
.moda-urban-template .rating-summary { display: flex; align-items: center; gap: 2rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
.moda-urban-template .rating-big-number { font-size: 3.5rem; font-weight: 900; line-height: 1; letter-spacing: -2px; }
.moda-urban-template .review-count { color: var(--text-light); font-size: 0.85rem; }
.moda-urban-template .rating-breakdown { flex: 1; min-width: 200px; }
.moda-urban-template .rating-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.85rem; }
.moda-urban-template .star-label { width: 50px; text-align: right; font-weight: 600; color: var(--text); }
.moda-urban-template .rating-bar-bg { flex: 1; height: 10px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
.moda-urban-template .rating-bar-fill { height: 100%; background: var(--star); border-radius: 10px; transition: width 1.2s cubic-bezier(0.4,0,0.2,1); }
.moda-urban-template .percentage { width: 38px; font-weight: 600; color: var(--text-light); font-size: 0.8rem; }
.moda-urban-template .review-form h3 { margin-bottom: 0.8rem; }
.moda-urban-template .review-form input, .moda-urban-template .review-form textarea, .moda-urban-template .contact-form input, .moda-urban-template .contact-form textarea {
  width: 100%; padding: 10px 14px; border: 2px solid var(--border); border-radius: 8px; margin-bottom: 10px; font-family: inherit; font-size: 0.95rem; transition: var(--transition);
}
.moda-urban-template .review-form input:focus, .moda-urban-template .review-form textarea:focus, .moda-urban-template .contact-form input:focus, .moda-urban-template .contact-form textarea:focus {
  border-color: var(--accent); outline: none; box-shadow: 0 0 0 4px rgba(0,0,0,0.04);
}
.moda-urban-template .star-rating-input { display: flex; gap: 6px; font-size: 1.8rem; cursor: pointer; margin-bottom: 12px; user-select: none; }
.moda-urban-template .star-rating-input button { color: #ddd; transition: transform 0.15s ease, color 0.15s ease; display: inline-block; border: 0; background: transparent; font-size: inherit; cursor: pointer; }
.moda-urban-template .star-rating-input button:hover { transform: scale(1.3); }
.moda-urban-template .star-rating-input button.active { color: var(--star); }
.moda-urban-template .why-us-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; }
.moda-urban-template .why-us-card { text-align: center; transition: var(--transition); cursor: default; }
.moda-urban-template .why-us-card:hover { transform: translateY(-8px); box-shadow: var(--shadow-lg); border-color: transparent; }
.moda-urban-template .why-us-icon { font-size: 2.8rem; margin-bottom: 0.8rem; display: inline-block; animation: modaFloat 3s ease-in-out infinite; }
.moda-urban-template .why-us-card h3 { font-weight: 700; margin-bottom: 4px; font-size: 1rem; }
.moda-urban-template .why-us-card p { color: var(--text-light); font-size: 0.85rem; line-height: 1.5; }
.moda-urban-template .faq-item { margin-bottom: 10px; overflow: hidden; padding: 0; }
.moda-urban-template .faq-question { padding: 1.2rem 1.5rem; cursor: pointer; font-weight: 600; display: flex; justify-content: space-between; align-items: center; user-select: none; transition: var(--transition); }
.moda-urban-template .faq-question:hover { background: #fafafa; }
.moda-urban-template .faq-answer { padding: 0 1.5rem 1.2rem; color: var(--text-light); line-height: 1.7; }
.moda-urban-template .contact-section { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; border-radius: var(--radius); padding: 2.5rem; }
.moda-urban-template .contact-info { display: flex; flex-direction: column; gap: 1.2rem; justify-content: center; }
.moda-urban-template .contact-info p { color: var(--text-light); }
.moda-urban-template .contact-info-item { display: flex; align-items: center; gap: 12px; font-weight: 500; }
.moda-urban-template .contact-info-icon { width: 44px; height: 44px; border-radius: 50%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.moda-urban-template .btn-submit { background: var(--accent); color: #fff; border: none; padding: 14px 32px; border-radius: 50px; font-weight: 700; cursor: pointer; transition: var(--transition); font-size: 1rem; }
.moda-urban-template .btn-submit:hover { background: var(--accent-hover); transform: translateY(-2px); box-shadow: var(--shadow); }
.moda-urban-template .footer { background: #1a1a1a; color: #aaa; text-align: center; padding: 2rem; margin-top: 3rem; font-size: 0.9rem; }
@media (max-width: 768px) {
  .moda-urban-template .header { padding: 0 1rem; }
  .moda-urban-template .header-inner { height: 58px; }
  .moda-urban-template .nav-links {
    display: none; position: absolute; top: 58px; left: 0; right: 0; background: #fff; flex-direction: column; padding: 1.5rem; gap: 1rem;
    box-shadow: var(--shadow); border-bottom: 1px solid var(--border);
  }
  .moda-urban-template .nav-links.show { display: flex; animation: modaSlideDown 0.3s ease; }
  .moda-urban-template .menu-toggle { display: block; }
  .moda-urban-template .logo { font-size: 1.1rem; }
  .moda-urban-template .cart-btn { padding: 8px 12px; font-size: 0.8rem; }
  .moda-urban-template .hero h1 { font-size: 2rem; }
  .moda-urban-template .detail-layout { grid-template-columns: 1fr; gap: 2rem; }
  .moda-urban-template .gallery-section { position: static; }
  .moda-urban-template .modal-quick-view { flex-direction: column; max-height: 90vh; }
  .moda-urban-template .modal-image-section { border-radius: var(--radius) var(--radius) 0 0; aspect-ratio: 3/4; }
  .moda-urban-template .catalog-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
  .moda-urban-template .product-actions-overlay { opacity: 1; transform: translateX(0); }
  .moda-urban-template .why-us-grid { grid-template-columns: 1fr 1fr; }
  .moda-urban-template .contact-section { grid-template-columns: 1fr; }
  .moda-urban-template .filters-bar { gap: 8px; }
  .moda-urban-template .filter-btn { padding: 8px 14px; font-size: 0.8rem; }
}
@media (max-width: 480px) {
  .moda-urban-template .main-container { padding: 1rem; }
  .moda-urban-template .catalog-grid { grid-template-columns: 1fr 1fr; gap: 0.7rem; }
  .moda-urban-template .product-info { padding: 0.7rem; }
  .moda-urban-template .product-name { font-size: 0.9rem; }
  .moda-urban-template .product-price { font-size: 1rem; }
  .moda-urban-template .color-swatch-mini { width: 18px; height: 18px; }
  .moda-urban-template .modal-details-section { padding: 1.2rem; }
  .moda-urban-template .why-us-grid { grid-template-columns: 1fr; }
  .moda-urban-template .detail-layout { gap: 1.5rem; }
  .moda-urban-template .rating-big-number { font-size: 2.8rem; }
}
`
