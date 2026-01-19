'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Plus, Minus, Trash2, Store } from 'lucide-react'
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando tienda... 🛒</div>

  return (
    <div className="min-h-screen bg-white">
      {/* 🟢 NAVBAR: Sticky & Glassmorphism */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              {perfil?.avatar_url && (
                <img src={perfil.avatar_url} alt="Logo" className="h-8 w-8 rounded-full object-cover" />
              )}
              <span className="text-xl font-bold tracking-tight text-slate-900">
                {perfil?.store_name || 'Tienda'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-slate-600 hover:text-black"
                  onClick={() => {
                    const cartSection = document.getElementById('cart-summary');
                    cartSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <ShoppingCart size={22} strokeWidth={1.5} />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 🖼️ HERO SECTION: Clean & Impactful */}
      <div className="relative bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8 text-center">

          {/* Logo Big (Optional or use Avatar) */}
          <div className="mx-auto h-24 w-24 rounded-full bg-white p-1 shadow-sm mb-6 flex items-center justify-center overflow-hidden">
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} className="w-full h-full object-cover rounded-full" />
            ) : <Store className="text-slate-300" size={40} />}
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">
            {perfil?.store_name || 'Bienvenido a nuestra tienda'}
          </h1>
          <p className="max-w-xl mx-auto text-lg text-slate-500">
            {perfil?.description || 'Encuentra los mejores productos seleccionados especialmente para ti.'}
          </p>
        </div>
      </div>

      {/* 🛍️ PRODUCT GRID: Minimalist & Premium */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-8">Productos Destacados</h2>

        <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
          {productos.map((prod) => {
            const inCart = cart.find(item => item.product.id === prod.id)

            return (
              <div key={prod.id} className="group relative flex flex-col">
                {/* Image Container */}
                <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-gray-100 relative">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <Store size={48} strokeWidth={1} />
                    </div>
                  )}

                  {/* Quick Add Overlay (Desktop) */}
                  <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:block backdrop-blur-sm bg-white/30">
                    {inCart ? (
                      <div className="flex items-center justify-between bg-black text-white rounded-full px-4 py-2 shadow-xl">
                        <button onClick={() => updateQuantity(prod.id, -1)} className="hover:text-gray-300"><Minus size={16} /></button>
                        <span className="font-medium text-sm">{inCart.quantity}</span>
                        <button onClick={() => updateQuantity(prod.id, 1)} className="hover:text-gray-300"><Plus size={16} /></button>
                      </div>
                    ) : (
                      <Button
                        className="w-full rounded-full bg-black text-white hover:bg-slate-800 shadow-xl"
                        onClick={() => addToCart(prod)}
                      >
                        Agregar al Carrito
                      </Button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="mt-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">
                      <span aria-hidden="true" className="absolute inset-0 z-0" />
                      {prod.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 line-clamp-1">{prod.description}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">S/ {prod.price}</p>
                </div>

                {/* Mobile Add Button (Always visible or different interaction) */}
                <div className="mt-4 md:hidden">
                  {inCart ? (
                    <div className="flex items-center justify-center gap-4 bg-slate-100 rounded-lg p-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(prod.id, -1)}><Minus size={16} /></Button>
                      <span className="font-medium text-sm">{inCart.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(prod.id, 1)}><Plus size={16} /></Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => addToCart(prod)}>
                      Agregar
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {productos.length === 0 && (
          <div className="text-center py-24">
            <p className="text-slate-500 text-lg">No hay productos disponibles por el momento.</p>
          </div>
        )}
      </main>

      {/* 🧾 CART SUMMARY FOOTER (Sticky Bottom) or Drawer replacement */}
      {/* Mantenemos el footer sticky por ahora pero con mejor diseño */}
      {totalItems > 0 && (
        <div id="cart-summary" className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 p-4 pb-8 md:pb-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 p-3 rounded-full">
                <ShoppingCart size={24} className="text-slate-900" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total ({totalItems} items)</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight">S/ {totalPrice.toFixed(2)}</p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full sm:w-auto bg-black hover:bg-slate-800 text-white px-10 rounded-full font-bold text-base h-14 shadow-lg hover:shadow-xl transition-all"
              onClick={() => router.push(`/tienda/${params.id}/checkout`)}
            >
              Finalizar Compra
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}