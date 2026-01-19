'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Plus, Minus, Trash2, Store, Facebook, Instagram, Music2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
// import { toast } from 'sonner' 


// Tipo para el item del carrito
type CartItem = {
  product: any
  quantity: number
}

// Recibimos el ID del vendedor por la URL
export default function TiendaPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise)
  const router = useRouter()
  const [productos, setProductos] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Estado del Carrito
  const [cart, setCart] = useState<CartItem[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    // Cargar carrito del localStorage
    const savedCart = localStorage.getItem(`cart-${params.id}`)
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [params.id])

  // Guardar carrito cada vez que cambia
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(`cart-${params.id}`, JSON.stringify(cart))
    }
  }, [cart, isClient, params.id])

  useEffect(() => {
    async function cargarDatos() {
      try {
        // 1. Cargar datos de la TIENDA (Perfil)
        const { data: datosPerfil } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', params.id)
          .single()

        if (datosPerfil) setPerfil(datosPerfil)

        // 2. Cargar PRODUCTOS de este vendedor
        const { data: datosProductos } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', params.id)
          .order('created_at', { ascending: false })

        if (datosProductos) setProductos(datosProductos)

      } catch (error) {
        console.error('Error cargando tienda:', error)
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [params.id])

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(0, item.quantity + delta)
        return { ...item, quantity: newQuantity }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)
  const totalPrice = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)

  // Default Colors
  const primaryColor = perfil?.primary_color || '#000000'
  const secondaryColor = perfil?.secondary_color || '#C31432'

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando tienda... 🛒</div>

  return (
    <div className="min-h-screen bg-white">
      {/* 🟢 NAVBAR: Sticky & Dynamic Color */}
      <nav
        className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-md supports-[backdrop-filter]:bg-opacity-80 text-white transition-colors duration-300"
        style={{
          backgroundColor: `${primaryColor}CC` // Opacidad al color primario
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              {perfil?.avatar_url && (
                <img src={perfil.avatar_url} alt="Logo" className="h-9 w-9 rounded-full object-cover border-2 border-white/20" />
              )}
              <span className="text-xl font-bold tracking-tight text-white">
                {perfil?.store_name || 'Tienda'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-white hover:text-white/80 hover:bg-white/10"
                  onClick={() => {
                    const cartSection = document.getElementById('cart-summary');
                    cartSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <ShoppingCart size={22} strokeWidth={1.5} />
                  {totalItems > 0 && (
                    <span
                      className="absolute -top-1 -right-1 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      {totalItems}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 🖼️ HERO SECTION: Dynamic Gradient OR Banner */}
      <div
        className="relative border-b border-white/10 overflow-hidden"
        style={{
          background: perfil?.banner_url ? `url(${perfil.banner_url}) center/cover no-repeat` : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
        }}
      >
        {/* Overlay si hay imagen */}
        {perfil?.banner_url && <div className="absolute inset-0 bg-black/50"></div>}

        <div className="relative max-w-7xl mx-auto py-20 px-4 sm:py-28 sm:px-6 lg:px-8 text-center text-white z-10">

          {/* Logo Big */}
          <div className="mx-auto h-28 w-28 rounded-full bg-white/10 p-1 shadow-2xl mb-8 flex items-center justify-center overflow-hidden backdrop-blur-sm border border-white/20">
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} className="w-full h-full object-cover rounded-full" />
            ) : <Store className="text-white/80" size={48} />}
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl mb-6 drop-shadow-md">
            {perfil?.store_name || 'Bienvenido'}
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-white/90 font-light leading-relaxed drop-shadow-sm">
            {perfil?.description || 'Encuentra los mejores productos seleccionados especialmente para ti.'}
          </p>

          {/* Social Icons */}
          <div className="mt-8 flex justify-center gap-6">
            {perfil?.social_instagram && (
              <a href={`https://instagram.com/${perfil.social_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 transition-colors bg-white/10 p-2.5 rounded-full hover:bg-white/20 backdrop-blur-sm">
                <Instagram size={28} />
              </a>
            )}
            {perfil?.social_facebook && (
              <a href={perfil.social_facebook} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 transition-colors bg-white/10 p-2.5 rounded-full hover:bg-white/20 backdrop-blur-sm">
                <Facebook size={28} />
              </a>
            )}
            {perfil?.social_tiktok && (
              <a href={`https://tiktok.com/@${perfil.social_tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 transition-colors bg-white/10 p-2.5 rounded-full hover:bg-white/20 backdrop-blur-sm">
                <Music2 size={28} />
              </a>
            )}
          </div>
        </div>

        {/* Decorative Curve (Solo si no hay banner, para un look más limpio) */}
        {!perfil?.banner_url && <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent opacity-10"></div>}
      </div>

      {/* 🛍️ PRODUCT GRID: Minimalist & Clean */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2
          className="text-3xl font-bold tracking-tight mb-12 text-center md:text-left"
          style={{ color: primaryColor }}
        >
          Productos Destacados
        </h2>

        <div className="grid grid-cols-1 gap-y-12 gap-x-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
          {productos.map((prod) => {
            const inCart = cart.find(item => item.product.id === prod.id)

            return (
              <div key={prod.id} className="group relative flex flex-col bg-white rounded-2xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 ring-1 ring-slate-100 hover:ring-2" style={{ borderColor: 'transparent' }}>
                {/* Image Container */}
                <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-gray-100 relative">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-in-out"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <Store size={48} strokeWidth={1} />
                    </div>
                  )}

                  {/* Quick Add Overlay (Desktop) */}
                  <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block backdrop-blur-md bg-black/40">
                    {inCart ? (
                      <div className="flex items-center justify-between bg-white text-black rounded-full px-4 py-2 shadow-xl">
                        <button onClick={() => updateQuantity(prod.id, -1)} className="hover:text-red-500 transition-colors"><Minus size={16} /></button>
                        <span className="font-bold text-sm">{inCart.quantity}</span>
                        <button onClick={() => updateQuantity(prod.id, 1)} className="hover:text-green-600 transition-colors"><Plus size={16} /></button>
                      </div>
                    ) : (
                      <Button
                        className="w-full rounded-full bg-white text-black hover:bg-slate-100 shadow-xl font-medium border-0"
                        onClick={() => addToCart(prod)}
                      >
                        Agregar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="mt-4 px-2 pb-2 flex-col flex h-full">
                  <div className="mb-2">
                    <h3 className="text-base font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {prod.name}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{prod.description}</p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                    <span
                      className="text-lg font-extrabold"
                      style={{ color: secondaryColor }}
                    >
                      S/ {prod.price}
                    </span>
                    {/* Mobile Add Button */}
                    <div className="md:hidden">
                      {inCart ? (
                        <div className="flex items-center gap-3 bg-slate-100 rounded-lg px-2 py-1">
                          <button onClick={() => updateQuantity(prod.id, -1)}><Minus size={14} /></button>
                          <span className="text-sm font-bold">{inCart.quantity}</span>
                          <button onClick={() => updateQuantity(prod.id, 1)}><Plus size={14} /></button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-full text-white px-4 transition-colors duration-300 shadow-md"
                          style={{ backgroundColor: secondaryColor }}
                          onClick={() => addToCart(prod)}
                        >
                          Agregar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {productos.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 mt-8">
            <Store className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg">No hay productos disponibles por el momento.</p>
          </div>
        )}
      </main>

      {/* 🧾 CART SUMMARY FOOTER (Sticky Bottom) */}
      {totalItems > 0 && (
        <div id="cart-summary" className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 pb-8 md:pb-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="p-3 rounded-full"
                style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
              >
                <ShoppingCart size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Total ({totalItems} items)</p>
                <p
                  className="text-3xl font-extrabold tracking-tight"
                  style={{ color: primaryColor }}
                >
                  S/ {totalPrice.toFixed(2)}
                </p>
              </div>
            </div>

            <Button
              size="lg"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}
              className="w-full sm:w-auto text-white px-12 rounded-full font-bold text-lg h-14 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-0"
              onClick={() => router.push(`/tienda/${params.id}/checkout`)}
            >
              Pagar Ahora ✨
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}