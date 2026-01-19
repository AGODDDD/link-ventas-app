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
    <div className="min-h-screen bg-slate-50 pb-24 relative">
      {/* 🟢 CABECERA PERSONALIZADA */}
      <div className="bg-slate-900 text-white py-12 px-4 shadow-xl">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 text-center md:text-left">

          {/* Logo Dinámico */}
          <div className="h-24 w-24 rounded-full bg-white p-1 overflow-hidden shadow-lg mx-auto md:mx-0 shrink-0">
            {perfil?.avatar_url || perfil?.yape_image_url ? (
              <img
                src={perfil.avatar_url || perfil.yape_image_url}
                alt="Logo"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-500">
                <Store size={40} />
              </div>
            )}
          </div>

          {/* Nombre y Descripción Dinámicos */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {perfil?.store_name || perfil?.business_name || 'Tienda Online'}
            </h1>
            <p className="text-slate-300 text-lg max-w-xl mx-auto md:mx-0">
              {perfil?.description || 'Los mejores productos al mejor precio.'}
            </p>
          </div>

        </div>
      </div>

      {/* 🛍️ LISTA DE PRODUCTOS */}
      <div className="max-w-4xl mx-auto p-4 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productos.map((prod) => {
            const inCart = cart.find(item => item.product.id === prod.id)

            return (
              <Card key={prod.id} className="hover:shadow-lg transition-all border-0 shadow-md group">

                {/* Imagen del Producto */}
                <div className="aspect-video bg-slate-200 relative overflow-hidden">
                  {prod.image_url ? (
                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📷</div>
                  )}
                  <Badge className="absolute top-3 right-3 text-lg px-3 py-1 bg-white/95 text-black hover:bg-white shadow-sm backdrop-blur-sm">
                    S/ {prod.price}
                  </Badge>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-xl leading-tight">{prod.name}</CardTitle>
                </CardHeader>

                <CardContent className="pb-4 min-h-[60px]">
                  <p className="text-slate-500 text-sm line-clamp-2">
                    {prod.description || 'Sin descripción disponible.'}
                  </p>
                </CardContent>

                <CardFooter className="pt-0">
                  {inCart ? (
                    <div className="flex items-center justify-between w-full bg-slate-100 rounded-lg p-1">
                      <Button variant="ghost" size="icon" onClick={() => updateQuantity(prod.id, -1)} className="h-10 w-10">
                        <Minus size={18} />
                      </Button>
                      <span className="font-bold text-lg">{inCart.quantity}</span>
                      <Button variant="ghost" size="icon" onClick={() => updateQuantity(prod.id, 1)} className="h-10 w-10">
                        <Plus size={18} />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 h-12 text-lg transition-all active:scale-95"
                      onClick={() => addToCart(prod)}
                    >
                      <ShoppingCart size={20} />
                      Agregar
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* Estado Vacío */}
        {productos.length === 0 && (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-slate-100 mt-4">
            <p className="text-slate-400 text-xl mb-2">Esta tienda aún no tiene productos. 🛍️</p>
            <p className="text-sm text-slate-300">Vuelve pronto para ver novedades.</p>
          </div>
        )}
      </div>

      {/* 🚀 BOTÓN FLOTANTE DEL CARRITO */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-slate-500">Total a Pagar</span>
              <span className="text-2xl font-bold text-slate-900">S/ {totalPrice.toFixed(2)}</span>
            </div>

            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 text-lg h-14 shadow-lg shadow-green-200"
              onClick={() => router.push(`/tienda/${params.id}/checkout`)}
            >
              Ir a Pagar ({totalItems}) 💳
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}