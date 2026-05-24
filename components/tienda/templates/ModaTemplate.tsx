'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Eye, Heart, Instagram, Menu, Minus, Plus, Search, Share2, ShoppingBag, X } from 'lucide-react'
import { toast } from 'sonner'
import { Profile, Product } from '@/types/tienda'
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

const colorMap: Record<string, string> = {
  negro: '#111111',
  black: '#111111',
  blanco: '#f8f7f2',
  white: '#f8f7f2',
  gris: '#8a8a86',
  gray: '#8a8a86',
  plomo: '#777775',
  azul: '#3f7390',
  blue: '#3f7390',
  navy: '#21344f',
  rojo: '#b7433d',
  red: '#b7433d',
  verde: '#8fa68f',
  green: '#8fa68f',
  oliva: '#7c8b62',
  beige: '#d6c3ad',
  crema: '#efe3d1',
  marron: '#7c5643',
  cafe: '#7c5643',
  rosa: '#d9a8b6',
}

function getVariants(product: Product): ModaVariant[] {
  return Array.isArray(product.variants) ? product.variants as ModaVariant[] : []
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function getTallas(product: Product) {
  return uniqueValues(getVariants(product).map(v => v.talla))
}

function getColores(product: Product) {
  return uniqueValues(getVariants(product).map(v => v.color))
}

function swatchColor(color: string, fallbackIndex = 0) {
  const normalized = color.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const found = Object.entries(colorMap).find(([key]) => normalized.includes(key))
  if (found) return found[1]
  const fallback = ['#111111', '#9db69d', '#7c8991', '#d7d2ca', '#b9a08e', '#e8e8e8']
  return fallback[fallbackIndex % fallback.length]
}

function getProductImage(product?: Product | null) {
  return product?.image_url || ''
}

function formatPrice(value?: number | null) {
  return `S/ ${(value ?? 0).toFixed(2)}`
}

export default function ModaTemplate({ perfil, productos, isReadOnly }: Props) {
  const storeId = perfil.id
  const storeName = perfil.store_name || 'Boutique'
  const description = perfil.description || 'Moda seleccionada para clientes que compran con intencion.'
  const cartStore = useCartStore()
  const cart = cartStore.carts[storeId] || []
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)

  const activeProducts = useMemo(() => productos.filter(product => product.is_active !== false), [productos])
  const featuredProduct = activeProducts.find(product => product.image_url) || activeProducts[0] || null
  const categories = useMemo(() => {
    const values = uniqueValues(activeProducts.map(product => product.category))
    return values.length ? values : ['Coleccion']
  }, [activeProducts])

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [selectedColorByProduct, setSelectedColorByProduct] = useState<Record<string, string>>({})
  const [selectedSizeByProduct, setSelectedSizeByProduct] = useState<Record<string, string>>({})
  const [modalQuantity, setModalQuantity] = useState(1)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return activeProducts.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
      const matchesSearch = !query
        || product.name.toLowerCase().includes(query)
        || product.description?.toLowerCase().includes(query)
        || product.brand?.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [activeProducts, searchQuery, selectedCategory])

  const heroImage = perfil.banner_url || getProductImage(featuredProduct)

  const openQuickView = (product: Product) => {
    setQuickViewProduct(product)
    setModalQuantity(1)
  }

  const chooseColor = (productId: string, color: string) => {
    setSelectedColorByProduct(prev => ({ ...prev, [productId]: color }))
  }

  const chooseSize = (productId: string, talla: string) => {
    setSelectedSizeByProduct(prev => ({ ...prev, [productId]: talla }))
  }

  const addProduct = (product: Product, quantity = 1, openCart = false) => {
    if (isReadOnly) return
    if (product.stock !== null && product.stock !== undefined && product.stock <= 0) {
      toast.error('Producto agotado')
      return
    }

    const colors = getColores(product)
    const sizes = getTallas(product)
    const selectedColor = selectedColorByProduct[product.id] || (colors.length === 1 ? colors[0] : '')
    const selectedTalla = selectedSizeByProduct[product.id] || (sizes.length === 1 ? sizes[0] : '')

    if (colors.length > 0 && !selectedColor) {
      toast.error('Elige un color antes de agregarlo')
      openQuickView(product)
      return
    }

    if (sizes.length > 0 && !selectedTalla) {
      toast.error('Elige una talla antes de agregarlo')
      openQuickView(product)
      return
    }

    const variantDetails = {
      ...(selectedTalla ? { talla: selectedTalla } : {}),
      ...(selectedColor ? { color: selectedColor } : {}),
    }

    Array.from({ length: quantity }).forEach(() => {
      cartStore.addToCart(storeId, product, variantDetails)
    })
    toast.success(`${product.name} agregado al carrito`)
    if (openCart) setIsCartOpen(true)
  }

  const selectedQuickColors = quickViewProduct ? getColores(quickViewProduct) : []
  const selectedQuickSizes = quickViewProduct ? getTallas(quickViewProduct) : []
  const quickColor = quickViewProduct
    ? selectedColorByProduct[quickViewProduct.id] || (selectedQuickColors.length === 1 ? selectedQuickColors[0] : '')
    : ''
  const quickSize = quickViewProduct
    ? selectedSizeByProduct[quickViewProduct.id] || (selectedQuickSizes.length === 1 ? selectedQuickSizes[0] : '')
    : ''

  return (
    <main className="min-h-screen bg-[#fbfaf8] text-[#151515] font-sans">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#fbfaf8]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 md:hidden"
            aria-label="Abrir menu"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <nav className="hidden items-center gap-8 text-xs font-black uppercase tracking-[0.12em] md:flex">
            <a href="#inicio" className="border-b-2 border-black pb-1">Inicio</a>
            <a href="#catalogo" className="text-black/60 transition hover:text-black">Productos</a>
            <a href="#catalogo" className="text-black/60 transition hover:text-black">Precios</a>
            <a href="#sobre" className="text-black/60 transition hover:text-black">Sobre nosotros</a>
          </nav>

          <a href="#inicio" className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-2xl font-black tracking-tight">
            {perfil.avatar_url ? (
              <span className="relative h-9 w-9 overflow-hidden rounded-lg bg-black">
                <Image src={perfil.avatar_url} alt={storeName} fill className="object-cover" sizes="36px" />
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm text-white">
                {storeName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="max-w-[180px] truncate md:max-w-[260px]">{storeName}</span>
          </a>

          <div className="flex items-center gap-3">
            {perfil.whatsapp_phone && (
              <a
                href={`https://wa.me/${perfil.whatsapp_phone}?text=Hola%20${encodeURIComponent(storeName)},%20quiero%20consultar%20por%20una%20prenda`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden rounded-full border border-black px-5 py-2 text-xs font-bold transition hover:bg-black hover:text-white lg:inline-flex"
              >
                Consultar por WhatsApp
              </a>
            )}
            {perfil.social_instagram && (
              <a href={perfil.social_instagram} target="_blank" rel="noopener noreferrer" className="hidden h-10 w-10 items-center justify-center rounded-full border border-black/20 md:flex">
                <Instagram size={16} />
              </a>
            )}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-black bg-black text-white transition hover:scale-105"
              aria-label="Abrir carrito"
            >
              <ShoppingBag size={17} />
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-black shadow">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-black/10 bg-white px-6 py-5 md:hidden">
            <div className="grid gap-4 text-sm font-black uppercase tracking-[0.1em]">
              <a href="#inicio" onClick={() => setIsMenuOpen(false)}>Inicio</a>
              <a href="#catalogo" onClick={() => setIsMenuOpen(false)}>Productos</a>
              <a href="#catalogo" onClick={() => setIsMenuOpen(false)}>Precios</a>
              <a href="#sobre" onClick={() => setIsMenuOpen(false)}>Sobre nosotros</a>
            </div>
          </div>
        )}
      </header>

      <section id="inicio" className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] md:px-8 md:py-12">
        <div className="relative min-h-[520px] overflow-hidden rounded-[8px] bg-[#d7d1c8] shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={storeName}
              fill
              priority
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 48vw"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#ece7df,#cfc7bc)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          <button className="absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black shadow-lg backdrop-blur">
            <ArrowLeft size={18} />
          </button>

          <div className="absolute left-[14%] top-[42%] hidden md:block">
            <Hotspot label="Tela premium, corte moderno" />
          </div>
          <div className="absolute right-[22%] top-[28%] hidden md:block">
            <Hotspot label="Nueva coleccion disponible" />
          </div>
          <div className="absolute right-[14%] top-[58%] hidden md:block">
            <Hotspot label="Detalles bordados" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-8">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/75">Lookbook boutique</p>
            <h1 className="max-w-xl text-4xl font-black leading-none tracking-tight md:text-6xl">{storeName}</h1>
            <p className="mt-4 max-w-md text-sm font-medium leading-6 text-white/82">{description}</p>
          </div>
        </div>

        <div id="catalogo" className="min-w-0">
          <div className="mb-6 flex flex-col gap-4 border-b border-black/10 pb-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/45">Seleccion curada</p>
              <h2 className="mt-2 text-4xl font-black uppercase tracking-tight md:text-5xl">
                Nuestro <span className="inline-block rotate-[-2deg] border-b-4 border-black/80 font-serif italic text-black/55">Catalogo</span>
              </h2>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={17} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar prenda"
                  className="h-11 w-full rounded-full border border-black/10 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-black"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition ${selectedCategory === 'all' ? 'bg-black text-white' : 'border border-black/10 bg-white text-black/65 hover:text-black'}`}
                >
                  Todo
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition ${selectedCategory === category ? 'bg-black text-white' : 'border border-black/10 bg-white text-black/65 hover:text-black'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[8px] border border-dashed border-black/15 bg-white text-center">
              <div>
                <p className="text-lg font-black uppercase tracking-tight">No hay prendas para mostrar</p>
                <p className="mt-2 text-sm text-black/50">Prueba con otra busqueda o categoria.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {filteredProducts.map((product, index) => (
                <ModaCatalogCard
                  key={product.id}
                  product={product}
                  index={index}
                  selectedColor={selectedColorByProduct[product.id]}
                  onColorSelect={(color) => chooseColor(product.id, color)}
                  onOpen={() => openQuickView(product)}
                  onQuickAdd={() => addProduct(product, 1, true)}
                  isReadOnly={isReadOnly}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="sobre" className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 md:grid-cols-3 md:px-8">
        {[
          ['Cambios faciles', 'Tus clientes pueden comprar talla/color con confianza.'],
          ['Compra guiada', 'Quick-view con detalle, variantes y cantidad sin abandonar catalogo.'],
          ['Checkout conectado', 'El carrito sigue conectado al flujo de pedidos de LinkVentas.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-[8px] border border-black/10 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-[0.12em]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-black/55">{body}</p>
          </div>
        ))}
      </section>

      {quickViewProduct && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm md:items-center">
          <div className="relative grid max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[8px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.28)] md:grid-cols-[0.92fr_1fr]">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow"
              aria-label="Cerrar vista rapida"
            >
              <X size={18} />
            </button>
            <div className="relative min-h-[360px] bg-[#d6c2ab] md:min-h-[560px]">
              {quickViewProduct.image_url ? (
                <Image src={quickViewProduct.image_url} alt={quickViewProduct.name} fill className="object-cover object-center" sizes="(max-width: 768px) 100vw, 45vw" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#eee9e2] text-black/25">
                  <ShoppingBag size={72} strokeWidth={1} />
                </div>
              )}
            </div>

            <div className="flex flex-col p-6 md:p-8">
              <div className="mb-5 flex items-start justify-between gap-6">
                <div>
                  {quickViewProduct.category && <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/45">{quickViewProduct.category}</p>}
                  <h3 className="mt-2 text-3xl font-black tracking-tight">{quickViewProduct.name}</h3>
                  <p className="mt-2 text-2xl font-black">{formatPrice(quickViewProduct.price)}</p>
                  {quickViewProduct.original_price && quickViewProduct.original_price > quickViewProduct.price && (
                    <p className="text-sm font-bold text-black/35 line-through">{formatPrice(quickViewProduct.original_price)}</p>
                  )}
                </div>
                <button className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-black/60">
                  <Share2 size={18} />
                </button>
              </div>

              <p className="mb-6 text-sm leading-6 text-black/60">
                {quickViewProduct.description || 'Prenda seleccionada para elevar tu catalogo con una experiencia premium.'}
              </p>

              {selectedQuickColors.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-black/45">Color {quickColor && <span className="text-black">/ {quickColor}</span>}</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedQuickColors.map((color, index) => (
                      <button
                        key={color}
                        onClick={() => chooseColor(quickViewProduct.id, color)}
                        className={`h-9 w-9 rounded-full border-2 transition ${quickColor === color ? 'border-black p-1' : 'border-transparent p-0 hover:border-black/30'}`}
                        aria-label={`Seleccionar color ${color}`}
                      >
                        <span className="block h-full w-full rounded-full border border-black/10" style={{ backgroundColor: swatchColor(color, index) }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedQuickSizes.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-black/45">Tamano</p>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedQuickSizes.map(size => (
                      <button
                        key={size}
                        onClick={() => chooseSize(quickViewProduct.id, size)}
                        className={`h-11 rounded-[6px] border text-sm font-black transition ${quickSize === size ? 'border-black bg-black text-white' : 'border-black/10 bg-white text-black hover:border-black'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-5 flex items-center justify-between rounded-[8px] border border-black/10 p-3">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-black/45">Cantidad</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5">
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm font-black">{modalQuantity}</span>
                  <button onClick={() => setModalQuantity(Math.min(10, modalQuantity + 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5">
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <button
                disabled={isReadOnly}
                onClick={() => addProduct(quickViewProduct, modalQuantity, true)}
                className="mt-auto flex h-14 w-full items-center justify-center gap-2 rounded-[6px] bg-black text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/25"
              >
                <ShoppingBag size={18} /> Agregar al carrito
              </button>
              {isReadOnly && <p className="mt-3 text-center text-xs font-bold text-red-600">Esta tienda no acepta pedidos por ahora.</p>}
            </div>
          </div>
        </div>
      )}

      <SlideOverCart storeId={storeId} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </main>
  )
}

function Hotspot({ label }: { label: string }) {
  return (
    <div className="group flex items-center gap-2">
      <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-black">
        <span className="absolute h-8 w-8 animate-ping rounded-full bg-white/50" />
        <span className="h-2 w-2 rounded-full bg-white" />
      </span>
      <span className="rounded-[6px] bg-black px-3 py-2 text-xs font-bold text-white opacity-90 shadow-lg">
        {label}
      </span>
    </div>
  )
}

function ModaCatalogCard({
  product,
  index,
  selectedColor,
  onColorSelect,
  onOpen,
  onQuickAdd,
  isReadOnly,
}: {
  product: Product;
  index: number;
  selectedColor?: string;
  onColorSelect: (color: string) => void;
  onOpen: () => void;
  onQuickAdd: () => void;
  isReadOnly?: boolean;
}) {
  const colors = getColores(product)
  const isOutOfStock = product.stock !== null && product.stock !== undefined && product.stock <= 0
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0

  return (
    <article
      className="group min-w-0 overflow-hidden rounded-[8px] bg-white shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.12)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button onClick={onOpen} className="relative block aspect-[4/3] w-full overflow-hidden bg-[#f0efec] text-left md:aspect-[3/4]">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover object-center transition duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 18vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-black/20">
            <ShoppingBag size={42} strokeWidth={1} />
          </div>
        )}
        {discount > 0 && <span className="absolute left-3 top-3 rounded-full bg-black px-2.5 py-1 text-[10px] font-black text-white">-{discount}%</span>}
        {isOutOfStock && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-black uppercase tracking-[0.2em] text-black">Agotado</span>}
        <div className="absolute bottom-3 right-3 flex translate-y-2 gap-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow"><Eye size={16} /></span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow"><Heart size={16} /></span>
        </div>
      </button>

      <div className="p-3 md:p-4">
        <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-black/40">{product.brand || product.category || 'Moda'}</p>
        <button onClick={onOpen} className="mt-1 block w-full text-left">
          <h3 className="line-clamp-2 min-h-[40px] text-sm font-black leading-tight text-black md:text-base">{product.name}</h3>
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-base font-black text-black">{formatPrice(product.price)}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-xs font-bold text-black/30 line-through">{formatPrice(product.original_price)}</span>
          )}
        </div>

        {colors.length > 0 && (
          <div className="mt-3 flex gap-1.5">
            {colors.slice(0, 5).map((color, colorIndex) => (
              <button
                key={color}
                onClick={() => onColorSelect(color)}
                className={`h-5 w-5 rounded-full border transition hover:scale-110 ${selectedColor === color ? 'border-black p-0.5' : 'border-black/10'}`}
                aria-label={`Ver color ${color}`}
              >
                <span className="block h-full w-full rounded-full" style={{ backgroundColor: swatchColor(color, colorIndex) }} />
              </button>
            ))}
            {colors.length > 5 && <span className="text-[10px] font-black text-black/35">+{colors.length - 5}</span>}
          </div>
        )}

        <button
          onClick={isReadOnly || isOutOfStock ? undefined : onQuickAdd}
          disabled={isReadOnly || isOutOfStock}
          className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-[4px] bg-black text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/20"
        >
          <ShoppingBag size={14} /> Comprar
        </button>
      </div>
    </article>
  )
}
