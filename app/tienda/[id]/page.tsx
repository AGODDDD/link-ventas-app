'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, Store } from 'lucide-react'

// Recibimos el ID del vendedor por la URL
export default function TiendaPage({ params }: { params: { id: string } }) {
  const [productos, setProductos] = useState<any[]>([])
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Cargando tienda... 🛒</div>

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* 🟢 CABECERA PERSONALIZADA */}
      <div className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          
          {/* Logo Dinámico (Busca en avatar_url O en yape_image_url) */}
          <div className="h-24 w-24 rounded-full bg-white p-1 overflow-hidden shadow-lg mx-auto md:mx-0">
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
              {/* Prioridad: Nombre nuevo -> Nombre viejo -> Genérico */}
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
          {productos.map((prod) => (
            <Card key={prod.id} className="hover:shadow-lg transition-shadow overflow-hidden border-0 shadow-md">
              
              {/* Imagen del Producto */}
              <div className="aspect-video bg-slate-200 relative">
                {prod.image_url ? (
                  <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📷</div>
                )}
                <Badge className="absolute top-3 right-3 text-lg px-3 py-1 bg-white/90 text-black hover:bg-white shadow-sm backdrop-blur-sm">
                  S/ {prod.price}
                </Badge>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{prod.name}</CardTitle>
              </CardHeader>
              
              <CardContent className="pb-4">
                <p className="text-slate-500 text-sm line-clamp-2">
                  {prod.description || 'Sin descripción disponible.'}
                </p>
              </CardContent>

              <CardFooter>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 h-12 text-lg transition-colors" 
                  onClick={() => {
                    // LÓGICA DE WHATSAPP REAL 🟢
                    // 1. Usa el número de la BD o uno por defecto
                    const telefono = perfil?.whatsapp_number || '999999999'
                    
                    // 2. Crea el mensaje bonito
                    const mensaje = `Hola! 👋 Vengo de tu tienda online. Me interesa: *${prod.name}* (Precio: S/ ${prod.price})`
                    
                    // 3. Abre WhatsApp
                    window.open(`https://wa.me/51${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank')
                  }}
                >
                  <MessageCircle size={20} />
                  Pedir por WhatsApp
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Estado Vacío */}
        {productos.length === 0 && (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-slate-100 mt-4">
            <p className="text-slate-400 text-xl mb-2">Esta tienda aún no tiene productos. 🛍️</p>
            <p className="text-sm text-slate-300">Vuelve pronto para ver novedades.</p>
          </div>
        )}
      </div>
    </div>
  )
}