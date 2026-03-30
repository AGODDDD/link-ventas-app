'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from 'sonner'

export default function CrearProducto() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  
  // Advanced fields
  const [brand, setBrand] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [isFreeShipping, setIsFreeShipping] = useState(false)
  const [shippingToday, setShippingToday] = useState(false)

  const guardarProducto = async (e: any) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No estás autenticado')
        return
      }

      // Profile Check/Create
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile) {
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({ id: user.id, email: user.email })

        if (createProfileError && createProfileError.code !== '23505') {
          throw new Error(`Error creando perfil: ${createProfileError.message}`)
        }
      }

      let imageUrl = null

      if (archivo) {
        const fileExt = archivo.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { data, error: uploadError } = await supabase.storage
          .from('productos')
          .upload(fileName, archivo)

        if (uploadError) throw uploadError

        const { data: publicData } = supabase.storage
          .from('productos')
          .getPublicUrl(fileName)

        imageUrl = publicData.publicUrl
      }

      // Validate pricing logic
      const currentPrice = parseFloat(precio)
      const oldPrice = originalPrice ? parseFloat(originalPrice) : null
      
      if (oldPrice && oldPrice <= currentPrice) {
         toast.warning('El Precio Original debería ser mayor al Precio Final para mostrar un descuento válido.')
      }

      // Save to DB
      const { error: dbError } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: nombre,
          price: currentPrice,
          description: descripcion,
          image_url: imageUrl,
          brand: brand.toUpperCase() || null,
          original_price: oldPrice,
          is_free_shipping: isFreeShipping,
          shipping_today: shippingToday,
          rating: 5 // Default rating for new products to look good
        })

      if (dbError) throw dbError

      toast.success('¡Producto publicado con éxito! 🚀')
      router.push('/dashboard/productos')

    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error al publicar el producto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center py-10 px-4">
      <Card className="w-full max-w-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-0">
        <CardHeader className="border-b bg-white rounded-t-xl pb-8">
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
            Nuevo Producto
          </CardTitle>
          <CardDescription className="text-base text-slate-500 mt-2">
            Completa los detalles comerciales para activar tu tarjeta avanzada en el catálogo.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 bg-white rounded-b-xl">
          <form onSubmit={guardarProducto} className="space-y-8">

            {/* Basic Info */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span>
                Información Básica
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nombre" className="text-slate-600">Nombre del Producto *</Label>
                  <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Zapatillas Nike Air Max" className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marca" className="text-slate-600">Marca (Opcional)</Label>
                  <Input id="marca" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: NIKE" className="h-11 uppercase" />
                  <p className="text-xs text-slate-400">Se mostrará como una etiqueta sobre el título.</p>
                </div>

                <div className="space-y-2">
                   {/* Empty column for alignment if needed, or make Marca col-span-2. Let's make Marca full width too */}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-slate-600">Descripción *</Label>
                <textarea 
                  id="desc" 
                  required
                  value={descripcion} 
                  onChange={(e) => setDescripcion(e.target.value)} 
                  placeholder="Detalles del producto, materiales, dimensiones..."
                  className="w-full flex min-h-[100px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
              </div>
            </div>

            {/* Pricing Details */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                Precios y Descuentos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="precio" className="text-slate-600">Precio Final / Oferta (S/) *</Label>
                  <Input id="precio" type="number" required step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" className="h-11 border-blue-200 focus-visible:ring-blue-600" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalPrice" className="text-slate-600">Precio de Mercado (Para tachar)</Label>
                  <Input id="originalPrice" type="number" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="0.00" className="h-11" />
                  <p className="text-xs text-slate-400">Deja en blanco si es precio regular. Si es mayor al Precio Final, se calculará el % descuento.</p>
                </div>
              </div>
            </div>

            {/* Fulfillment & Logistics */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-green-600 uppercase tracking-widest flex items-center gap-2">
                <span className="bg-green-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">3</span>
                Logística Promocional
              </h3>
              
              <div className="flex flex-col gap-4">
                <label className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-900">Ofrecer Envío Gratis</p>
                    <p className="text-xs text-slate-500">Agregará la insignia oscura "ENVÍO GRATIS" en tu catálogo.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={isFreeShipping} 
                    onChange={(e) => setIsFreeShipping(e.target.checked)}
                    className="w-5 h-5 accent-slate-900"
                  />
                </label>

                <label className="flex items-center justify-between p-4 border border-blue-100 rounded-lg bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-colors">
                  <div>
                    <p className="font-semibold text-blue-900">Entrega Inmediata (Envío Hoy)</p>
                    <p className="text-xs text-blue-700/70">Muestra el rayo promocional "¡HOY!" en el producto y lo destaca en búsquedas urgentes.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={shippingToday} 
                    onChange={(e) => setShippingToday(e.target.checked)}
                    className="w-5 h-5 accent-blue-600"
                  />
                </label>
              </div>
            </div>

            {/* Media Upload */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
               <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">4</span>
                Fotografía
              </h3>
              <div className="space-y-2">
                <Input
                  id="foto"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0]
                      if (!file.type.startsWith('image/')) {
                        toast.error('Por favor selecciona una imagen válida.')
                        e.target.value = ''
                        return
                      }
                      setArchivo(file)
                    }
                  }}
                  className="cursor-pointer h-12 py-3 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-8">
              <Button type="button" variant="outline" className="w-1/3 h-12" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" className="w-2/3 h-12 bg-blue-600 hover:bg-blue-700 text-base" disabled={loading}>
                {loading ? 'Subiendo a la Nube...' : 'Publicar Producto Ahora'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}