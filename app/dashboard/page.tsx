'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function Dashboard() {
  const router = useRouter()
  const [productos, setProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setProductos(data)
    setLoading(false)
  }

  const borrarProducto = async (id: string, imageUrl: string) => {
    const confirmar = confirm('¿Seguro que quieres borrar este producto? No hay vuelta atrás.')
    if (!confirmar) return

    try {
      // 1. Intentar borrar la imagen del Storage (si existe)
      if (imageUrl) {
        const nombreArchivo = imageUrl.split('/').pop() // Sacamos el nombre del link
        if (nombreArchivo) {
          await supabase.storage.from('productos').remove([nombreArchivo])
        }
      }

      // 2. Borrar el producto de la Base de Datos
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error

      // 3. Actualizar la lista en pantalla sin recargar
      setProductos(productos.filter(p => p.id !== id))
      alert('🗑️ Producto eliminado.')

    } catch (error: any) {
      alert('Error al borrar: ' + error.message)
    }
  }

  // Obtenemos el ID del usuario para el link de la tienda
  const [userId, setUserId] = useState('')
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || ''))
  }, [])

  if (loading) return <div className="p-8 text-center">Cargando tu imperio... 🚀</div>

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* HEADER DEL DASHBOARD */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Panel de Control 🎛️</h1>
          <p className="text-slate-500">Gestiona tus productos y stock.</p>
        </div>
        <div className="flex gap-2">
          {userId && (
             <Button variant="outline" onClick={() => window.open(`/tienda/${userId}`, '_blank')}>
               Ver mi Tienda Pública 👁️
             </Button>
          )}
          <Button onClick={() => router.push('/dashboard/crear')}>
            + Nuevo Producto
          </Button>
        </div>
      </div>

      {/* LISTA DE PRODUCTOS */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {productos.map((prod) => (
          <Card key={prod.id} className="overflow-hidden group">
            <div className="aspect-video bg-slate-200 relative">
              {prod.image_url ? (
                <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-2xl">📷</div>
              )}
              <Badge className="absolute top-2 right-2 bg-white text-black hover:bg-white">
                S/ {prod.price}
              </Badge>
            </div>
            
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-lg">{prod.name}</CardTitle>
            </CardHeader>
            
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-slate-500 line-clamp-2">
                {prod.description || 'Sin descripción'}
              </p>
            </CardContent>

            <CardFooter className="p-4 border-t bg-slate-50 flex justify-between">
              <span className="text-xs text-slate-400">Stock: ∞</span>
              
              {/* BOTÓN DE BORRAR 🗑️ */}
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => borrarProducto(prod.id, prod.image_url)}
              >
                Eliminar 🗑️
              </Button>
            </CardFooter>
          </Card>
        ))}

        {productos.length === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-slate-400 mb-4">No tienes productos todavía.</p>
            <Button variant="secondary" onClick={() => router.push('/dashboard/crear')}>
              Crear el primero 🚀
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}