'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'

export default function CrearProducto() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form Fields
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [isFreeShipping, setIsFreeShipping] = useState(false)
  const [shippingToday, setShippingToday] = useState(false)
  const [stock, setStock] = useState('')
  
  // Media handling
  const [archivo, setArchivo] = useState<File | null>(null)

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

      const currentPrice = parseFloat(precio)
      const oldPrice = originalPrice ? parseFloat(originalPrice) : null

      // Save to DB (Bodega initially)
      const { error: dbError } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: nombre,
          price: currentPrice,
          description: descripcion,
          image_url: imageUrl,
          brand: brand.toUpperCase() || null,
          category: category || null,
          original_price: oldPrice,
          stock: stock ? parseInt(stock) : null,
          is_free_shipping: isFreeShipping,
          shipping_today: shippingToday,
          is_active: false, // Por defecto se va a Bodega, no a la Vitrina
          rating: 5 // Default rating for new products to look good
        })

      if (dbError) throw dbError

      // Invalidar caché para que la tabla de Bodega se refresque
      await useDashboardStore.getState().cargarProductos(user.id, true)

      toast.success('¡Guardado en Bodega! 📦')
      router.push('/dashboard/productos')

    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 pb-12 relative w-full max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <button onClick={() => router.back()} className="text-primary flex items-center gap-2 mb-4 hover:brightness-125 transition-all text-sm font-bold uppercase tracking-widest">
             <ArrowLeft size={16} /> Volver a Inventario
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Nuevo SKU</h1>
          <p className="text-on-surface-variant">Agrega un nuevo producto a tu Bodega Maestra.</p>
        </div>
      </div>

      <div className="bg-surface-container-high rounded-2xl border border-outline-variant/10 shadow-2xl p-6 md:p-8">
        <form onSubmit={guardarProducto} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Información Principal</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-widest">Nombre del Producto</label>
                <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-widest">Marca (Badge)</label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all uppercase" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-widest">Categoría</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all">
                  <option value="">Sin categoría</option>
                  <option value="Ropa">Ropa</option>
                  <option value="Zapatos">Zapatos</option>
                  <option value="Accesorios">Accesorios</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Belleza">Belleza</option>
                  <option value="Hogar">Hogar</option>
                  <option value="Deportes">Deportes</option>
                  <option value="Alimentos">Alimentos</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-widest">Descripción Pública</label>
                <textarea required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all min-h-[120px] resize-y" />
              </div>
            </div>

            <div className="space-y-6">
               <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Precios y Logística</h3>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-widest">Precio Final (S/)</label>
                    <input type="number" step="0.01" required value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full bg-surface-container-highest border border-secondary/30 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary text-secondary font-bold p-3 transition-all text-xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Precio Tacha (S/)</label>
                    <input type="number" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface-variant line-through p-3 transition-all text-xl" />
                  </div>
               </div>

               <div className="space-y-2 pt-4">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
                        Inventario Base (Unidades) <span className="bg-surface-container-highest px-2 py-0.5 rounded text-[9px]">Opcional</span>
                    </label>
                    <input type="number" min="0" placeholder="Ej: 50 o vacío para ilimitado" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all font-mono" />
                </div>

               <div className="space-y-4 pt-4">
                  <label className="flex items-center justify-between p-4 border border-outline-variant/20 rounded-xl bg-surface-container cursor-pointer hover:bg-surface-container-high transition-colors group">
                    <div>
                      <p className="font-bold text-on-surface">Ofrecer Envío Gratis</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Badge oscuro en catálogo</p>
                    </div>
                    <input type="checkbox" checked={isFreeShipping} onChange={(e) => setIsFreeShipping(e.target.checked)} className="w-5 h-5 accent-primary" />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-secondary/20 rounded-xl bg-secondary/5 cursor-pointer hover:bg-secondary/10 transition-colors group">
                    <div>
                      <p className="font-bold text-secondary">Entrega Inmediata</p>
                      <p className="text-[10px] text-secondary/60 uppercase tracking-widest mt-1">Etiqueta verde de emergencia</p>
                    </div>
                    <input type="checkbox" checked={shippingToday} onChange={(e) => setShippingToday(e.target.checked)} className="w-5 h-5 accent-secondary" />
                  </label>
               </div>
            </div>
          </div>

          <div className="border-t border-outline-variant/10 pt-8 mt-8">
            <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Fotografía Módulo</h3>
            <div className="flex flex-col md:flex-row gap-6 items-center">
               <div className="w-32 h-32 rounded-xl border border-outline-variant/20 bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                  <ImageIcon className="text-on-surface-variant/30" size={32} />
               </div>
               <div className="flex-1 w-full">
                 <p className="text-xs text-on-surface-variant mb-2">Sube una imagen o foto para identificarlo en Bodega.</p>
                 <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setArchivo(e.target.files[0])
                    }}
                    className="w-full cursor-pointer h-12 py-3 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:brightness-110 text-on-surface"
                  />
               </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-8 border-t border-outline-variant/10">
            <button type="button" onClick={() => router.back()} className="px-6 py-3 font-bold text-on-surface-variant hover:text-on-surface">
              Descartar
            </button>
            <button type="submit" disabled={loading} className="px-8 py-3 bg-primary text-on-primary hover:brightness-110 font-bold rounded-xl shadow-[0_10px_20px_rgba(192,193,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center gap-2">
              {loading ? 'Enviando a Bodega...' : <><Save size={18} /> Guardar en Bodega</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}