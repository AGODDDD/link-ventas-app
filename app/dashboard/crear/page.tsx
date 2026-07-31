'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getProductMediaThumbnail, serializeProductMedia, uploadProductMediaFiles } from '@/lib/productMedia'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Image as ImageIcon, Plus, Trash2, Settings2, Play, Upload } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import { useEffect } from 'react'
import ModaVariantMatrix, { getModaVariantKey } from '@/components/dashboard/ModaVariantMatrix'

const COLOR_MAP: Record<string, string> = {
  negro: '#1a1a1a', black: '#1a1a1a', blanco: '#f5f5f0', white: '#f5f5f0',
  gris: '#8a8a8a', gray: '#8a8a8a', plomo: '#777777', azul: '#3b5998',
  blue: '#3b5998', navy: '#1a3a5c', rojo: '#c0392b', red: '#c0392b',
  verde: '#5a6e3f', green: '#5a6e3f', oliva: '#5a6e3f', beige: '#d4c5b2',
  crema: '#efe3d1', caqui: '#c4a882', khaki: '#c4a882', marron: '#7c5643',
  cafe: '#7c5643', rosa: '#d9a8b6',
}

const FALLBACK_COLORS = ['#1a1a1a', '#f5f5f0', '#1a3a5c', '#8a8a8a', '#d4c5b2'];

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function getColorHex(color: string, index = 0) {
  const normalized = normalize(color)
  const found = Object.entries(COLOR_MAP).find(([key]) => normalized.includes(key))
  return found?.[1] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

export default function CrearProducto() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(true)

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
  
  // Niche Fields
  const [templateType, setTemplateType] = useState('comercio')
  const [preparationTime, setPreparationTime] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [tallasInput, setTallasInput] = useState('')
  const [coloresList, setColoresList] = useState<{ color: string; image_url?: string }[]>([])
  const [colorInputTemp, setColorInputTemp] = useState('')
  const [uploadingColor, setUploadingColor] = useState<string | null>(null)
  const [modifiers, setModifiers] = useState<any[]>([])
  const [variantStocks, setVariantStocks] = useState<Record<string, string>>({})
  
  // Media handling
  const [mediaFiles, setMediaFiles] = useState<File[]>([])

  const addColor = () => {
    const trimmed = colorInputTemp.trim()
    if (!trimmed) return
    if (coloresList.some(c => c.color.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Este color ya está en la lista')
      return
    }
    setColoresList([...coloresList, { color: trimmed }])
    setColorInputTemp('')
  }

  const removeColor = (colorName: string) => {
    setColoresList(coloresList.filter(c => c.color !== colorName))
  }

  const uploadColorImage = async (colorName: string, file: File) => {
    setUploadingColor(colorName)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const { data, error } = await supabase.storage
        .from('productos')
        .upload(`variants/${fileName}`, file)

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('productos')
        .getPublicUrl(`variants/${fileName}`)

      setColoresList(coloresList.map(c => 
        c.color === colorName ? { ...c, image_url: publicUrlData.publicUrl } : c
      ))
      toast.success('Imagen subida correctamente')
    } catch (err: any) {
      toast.error('Error al subir imagen: ' + err.message)
    } finally {
      setUploadingColor(null)
    }
  }

  const [availableCategories, setAvailableCategories] = useState<any[]>([])

  useEffect(() => {
    async function loadStoreAndExtensions() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
        // 1. Cargar Identidad del Core
        const { data: store } = await supabase.from('stores').select('id, template_type').eq('owner_id', user.id).single()
        if (store) {
          setTemplateType(store.template_type)
          
          // 2. Cargar Extensión de Categorías (solo si es restaurante)
          if (store.template_type === 'restaurante') {
            const { data: cats } = await supabase.from('menu_categories').select('*').eq('store_id', store.id).order('position')
            if (cats) setAvailableCategories(cats)
          }
        } else {
          toast.error('No se encontró la tienda Core. Ejecuta la migración de configuración.')
        }
        }
      } finally {
        setTemplateLoading(false)
      }
    }
    loadStoreAndExtensions()
  }, [])

  const guardarProducto = async (e: any) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('No estás autenticado')
        return
      }

      // 1. Store Check (Identity Core)
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!store) throw new Error('No se encontró identidad de tienda Core.')

      const productMedia = mediaFiles.length > 0 ? await uploadProductMediaFiles(mediaFiles) : []
      const imageUrl = getProductMediaThumbnail(productMedia)

      const currentPrice = parseFloat(precio)
      const oldPrice = originalPrice ? parseFloat(originalPrice) : null

      // Formatear Variables Especiales
      let variants: any[] = []
      if (templateType === 'moda') {
        const tList = tallasInput.split(',').map(s => s.trim()).filter(Boolean)
        if (tList.length === 0) throw new Error('Agrega al menos una talla para publicar un producto de Moda.')
        if (coloresList.length === 0) throw new Error('Agrega al menos un color para publicar un producto de Moda.')

        for (const talla of tList) {
          for (const color of coloresList) {
            const stockValue = variantStocks[getModaVariantKey(talla, color.color)]
            variants.push({
              talla,
              color: color.color,
              ...(color.image_url ? { image_url: color.image_url } : {}),
              stock: stockValue === '' || stockValue === undefined ? null : Number.parseInt(stockValue, 10),
            })
          }
        }
      } else if (templateType === 'restaurante') {
        variants = modifiers
      }

      // 2. Guardar Producto Base
      const { data: newProduct, error: dbError } = await supabase
        .from('products')
        .insert({
          user_id: store.id,
          name: nombre,
          price: currentPrice,
          description: descripcion,
          image_url: imageUrl,
          media: productMedia,
          gallery: serializeProductMedia(productMedia),
          brand: brand.toUpperCase() || null,
          category: category || null,
          original_price: oldPrice,
          stock: templateType === 'moda'
            ? variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0)
            : (stock ? parseInt(stock) : null),
          is_free_shipping: isFreeShipping,
          shipping_today: shippingToday,
          is_active: false,
          rating: 5,
          variants: variants, // Mantenemos JSONB por ahora para compatibilidad UI
          preparation_time: preparationTime || null,
          is_available: isAvailable
        })
        .select()
        .single()

      if (dbError) throw dbError

      // 3. Extensión: product_variants (Relacional)
      if (templateType === 'moda' && variants.length > 0 && newProduct) {
        const relVariants = variants.map((v: any) => ({
            store_id: store.id,
            product_id: newProduct.id,
            name: v.talla ? (v.color ? `${v.talla} / ${v.color}` : v.talla) : v.color,
            value: v.talla || v.color,
            price_delta: 0,
            talla: v.talla || null,
            color: v.color || null,
            combination_key: [v.talla, v.color].filter(Boolean).join('|').toLowerCase() || null,
            stock: v.stock,
        }))
        await supabase.from('product_variants').insert(relVariants)
      }

      // Invalidar caché para refrescar la lista de productos.
      await useDashboardStore.getState().cargarProductos(user.id, true)

      toast.success('Producto guardado')
      router.push('/dashboard/productos')

    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error al guardar')
    } finally {
      setLoading(false)
    }
  }

  if (templateLoading) {
    return <div className="p-8 text-center font-bold text-on-surface-variant animate-pulse">Preparando el catálogo para tu negocio…</div>
  }

  const modaSizes = tallasInput.split(',').map((size) => size.trim()).filter(Boolean)

  return (
    <div className="space-y-6 pb-12 relative w-full max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <button onClick={() => router.back()} className="text-primary flex items-center gap-2 mb-4 hover:brightness-125 transition-all text-sm font-bold uppercase tracking-widest">
             <ArrowLeft size={16} /> Volver a Productos
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Nuevo producto</h1>
          <p className="text-on-surface-variant">Completa la información que verá tu cliente.</p>
        </div>
      </div>

      <div className="bg-surface-container-high rounded-2xl border border-outline-variant/10 shadow-2xl p-6 md:p-8">
        <form onSubmit={guardarProducto} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Información Principal</h3>
              
              <div className="space-y-2">
                <label htmlFor="product-name" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Nombre del Producto</label>
                <input id="product-name" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all" />
              </div>

              <div className="space-y-2">
                <label htmlFor="product-brand" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Marca / Opcional</label>
                <input id="product-brand" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all uppercase" />
              </div>

              <div className="space-y-2">
                <label htmlFor="product-category" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Categoría</label>
                <input 
                   id="product-category"
                   value={category} 
                   onChange={(e) => setCategory(e.target.value)} 
                   placeholder="Ej: Combos, Bebidas, Casacas..."
                   className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all" 
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {(availableCategories.length > 0 
                     ? availableCategories.map(c => c.name)
                     : (templateType === 'restaurante'
                        ? ["Promociones", "Platos", "Bebidas", "Postres"]
                        : templateType === 'moda'
                          ? ["Ropa", "Calzado", "Accesorios"]
                          : ["Destacados", "Novedades", "Hogar", "Tecnología"])
                  ).map(cat => (
                     <button 
                        key={cat} 
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`border text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-widest transition-colors ${category === cat ? 'bg-primary text-white border-primary' : 'bg-surface-variant text-on-surface hover:bg-primary/20 border-outline/30'}`}
                     >
                        {cat}
                     </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="product-description" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Descripción Pública</label>
                <textarea id="product-description" required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all min-h-[120px] resize-y" />
              </div>
            </div>

            <div className="space-y-6">
               <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Precios y Logística</h3>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="product-price" className="text-xs font-bold text-secondary uppercase tracking-widest">Precio Final (S/)</label>
                    <input id="product-price" type="number" step="0.01" min="0" required value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full bg-surface-container-highest border border-secondary/30 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary text-secondary font-bold p-3 transition-all text-xl" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="product-original-price" className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Precio anterior (S/)</label>
                    <input id="product-original-price" type="number" step="0.01" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface-variant line-through p-3 transition-all text-xl" />
                  </div>
               </div>

               <div className="space-y-2 pt-4">
                    <label htmlFor="product-stock" className="text-xs font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
                        Inventario Base (Unidades) <span className="bg-surface-container-highest px-2 py-0.5 rounded text-[9px]">Opcional</span>
                    </label>
                    <input id="product-stock" type="number" min="0" placeholder="Ej: 50 o vacío para ilimitado" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary text-on-surface p-3 transition-all font-mono" />
                </div>

               {templateType !== 'restaurante' && <div className="space-y-4 pt-4">
                  <label className="flex items-center justify-between p-4 border border-outline-variant/20 rounded-xl bg-surface-container cursor-pointer hover:bg-surface-container-high transition-colors group">
                    <div>
                      <p className="font-bold text-on-surface">Ofrecer Envío Gratis</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Badge oscuro en catálogo</p>
                    </div>
                    <input type="checkbox" checked={isFreeShipping} onChange={(e) => setIsFreeShipping(e.target.checked)} className="w-5 h-5 accent-primary" />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-secondary/20 rounded-xl bg-secondary/5 cursor-pointer hover:bg-secondary/10 transition-colors group">
                    <div>
                      <p className="font-bold text-secondary">Despacho hoy</p>
                      <p className="text-[10px] text-secondary/60 uppercase tracking-widest mt-1">Muestra esta disponibilidad en el catálogo</p>
                    </div>
                    <input type="checkbox" checked={shippingToday} onChange={(e) => setShippingToday(e.target.checked)} className="w-5 h-5 accent-secondary" />
                  </label>
               </div>}
            </div>
          </div>

          {/* Nicho: Restaurantes */}
          {templateType === 'restaurante' && (
            <div className="border-t border-outline-variant/10 pt-8 mt-8">
              <h3 className="text-[10px] font-bold text-[#9b5800] dark:text-[#f4b76a] uppercase tracking-widest mb-4">Ajustes de restaurante</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label htmlFor="preparation-time" className="text-xs font-bold text-on-surface uppercase tracking-widest">Tiempo Estimado de Preparación</label>
                  <input id="preparation-time" placeholder="Ej: 15-20 min" value={preparationTime} onChange={(e) => setPreparationTime(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg text-on-surface p-3" />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-4 border border-[#d78a33]/20 rounded-xl bg-[#d78a33]/5 cursor-pointer hover:bg-[#d78a33]/10 transition-colors">
                    <div>
                      <p className="font-bold text-[#d78a33]">Plato Disponible</p>
                      <p className="text-[10px] text-[#d78a33]/60 uppercase tracking-widest mt-1">Desactiva si se acabaron los ingredientes hoy.</p>
                    </div>
                    <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="w-5 h-5 accent-[#d78a33]" />
                  </label>
                </div>
              </div>

              {/* Modifiers Builder */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div>
                      <h4 className="text-sm font-bold text-on-surface">Constructor de Adicionales</h4>
                      <p className="text-xs text-on-surface-variant mt-1">Agrega guarniciones, combinaciones o acompañamientos extra.</p>
                   </div>
                   <button 
                     type="button" 
                     onClick={() => setModifiers([...modifiers, { id: crypto.randomUUID(), name: '', required: false, min_selections: 1, max_selections: 1, options: [] }])}
                     className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                   >
                     <Settings2 size={14} /> Añadir Opciones
                   </button>
                </div>

                <div className="space-y-4">
                  {modifiers.map((group, groupIndex) => (
                    <div key={group.id} className="border border-neutral-200 rounded-xl p-4 md:p-6 bg-white relative shadow-sm">
                       <button 
                         type="button" 
                         onClick={() => setModifiers(modifiers.filter(m => m.id !== group.id))}
                         className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-full"
                       >
                         <Trash2 size={16} />
                       </button>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pr-12">
                         <div className="space-y-2 md:col-span-2">
                           <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Nombre del Grupo</label>
                           <input placeholder="Ej: Elige tu guarnición" value={group.name} onChange={(e) => {
                             const n = [...modifiers]; n[groupIndex].name = e.target.value; setModifiers(n);
                           }} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg text-black p-3 font-bold" />
                         </div>
                         <label className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg bg-neutral-50 cursor-pointer">
                            <span className="text-xs font-bold text-neutral-700">Obligatorio</span>
                            <input type="checkbox" checked={group.required} onChange={(e) => {
                               const n = [...modifiers]; n[groupIndex].required = e.target.checked; setModifiers(n);
                            }} className="w-4 h-4 accent-neutral-800" />
                         </label>
                         <div className="flex gap-2">
                            <div className="flex-1 space-y-1">
                               <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Mín.</label>
                               <input type="number" min="0" value={group.min_selections} onChange={(e) => {
                                 const n = [...modifiers]; n[groupIndex].min_selections = parseInt(e.target.value) || 0; setModifiers(n);
                               }} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg text-black p-2" />
                            </div>
                            <div className="flex-1 space-y-1">
                               <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Máx.</label>
                               <input type="number" min="1" value={group.max_selections} onChange={(e) => {
                                 const n = [...modifiers]; n[groupIndex].max_selections = parseInt(e.target.value) || 1; setModifiers(n);
                               }} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg text-black p-2" />
                            </div>
                         </div>
                       </div>

                       {/* Options UI */}
                       <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                          <div className="flex items-center justify-between mb-3">
                             <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Elementos / Precios Extra</label>
                             <button type="button" onClick={() => {
                                 const n = [...modifiers];
                                 n[groupIndex].options.push({ id: crypto.randomUUID(), name: '', price_modifier: 0 });
                                 setModifiers(n);
                             }} className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                                <Plus size={14} /> Fila
                             </button>
                          </div>
                          <div className="space-y-2">
                             {group.options.length === 0 && <p className="text-xs text-neutral-400 italic text-center py-2">No hay elementos creados aún.</p>}
                             {group.options.map((opt: any, optIndex: number) => (
                               <div key={opt.id} className="flex gap-2 items-center">
                                 <input placeholder="Ej: Papas Fritas L" value={opt.name} onChange={(e) => {
                                    const n = [...modifiers]; n[groupIndex].options[optIndex].name = e.target.value; setModifiers(n);
                                 }} className="flex-1 bg-white border border-neutral-200 rounded-md p-2 text-sm text-black" />
                                 <div className="flex items-center bg-white border border-neutral-200 rounded-md overflow-hidden w-24">
                                     <span className="text-xs text-neutral-400 px-2">S/</span>
                                     <input type="number" step="0.01" value={opt.price_modifier} onChange={(e) => {
                                       const n = [...modifiers]; n[groupIndex].options[optIndex].price_modifier = parseFloat(e.target.value) || 0; setModifiers(n);
                                     }} className="w-full py-2 bg-transparent text-sm text-black outline-none" />
                                 </div>
                                 <button type="button" onClick={() => {
                                     const n = [...modifiers]; n[groupIndex].options.splice(optIndex, 1); setModifiers(n);
                                 }} className="p-2 text-neutral-400 hover:text-red-500">
                                   <Trash2 size={14} />
                                 </button>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Nicho: Moda */}
          {templateType === 'moda' && (
            <div className="border-t border-outline-variant/10 pt-8 mt-8">
              <h3 className="text-[10px] font-bold text-on-surface uppercase tracking-widest mb-4">Variaciones y atributos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="moda-sizes" className="text-xs font-bold text-on-surface uppercase tracking-widest">Tallas Disponibles</label>
                  <p className="text-[10px] text-on-surface-variant">Separadas por comas (Ej: S, M, L, XL)</p>
                  <input id="moda-sizes" value={tallasInput} onChange={(e) => setTallasInput(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg text-on-surface p-3" />
                </div>
                <div className="space-y-3">
                  <label htmlFor="moda-color" className="text-xs font-bold text-on-surface uppercase tracking-widest">Colores Disponibles</label>
                  <div className="flex gap-2">
                    <input
                      id="moda-color"
                      value={colorInputTemp} 
                      onChange={(e) => setColorInputTemp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addColor()
                        }
                      }}
                      placeholder="Ej: Rojo, Azul Marino"
                      className="flex-1 bg-surface-container-highest border border-outline-variant/30 rounded-lg text-on-surface p-3" 
                    />
                    <button type="button" onClick={addColor} className="bg-primary text-on-primary px-4 rounded-lg font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2">
                      <Plus size={16} /> Agregar
                    </button>
                  </div>
                  
                  {coloresList.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {coloresList.map((c, i) => (
                        <div key={c.color} className="flex items-center justify-between p-3 border border-outline-variant/20 rounded-xl bg-surface-container">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: getColorHex(c.color, i) }}></div>
                            <span className="font-bold text-sm text-on-surface">{c.color.toUpperCase()}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {c.image_url ? (
                              <div className="flex items-center gap-2">
                                <img src={c.image_url} alt={c.color} className="w-8 h-8 rounded-md object-cover border border-outline-variant/30" />
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        uploadColorImage(c.color, e.target.files[0])
                                      }
                                    }}
                                    disabled={uploadingColor === c.color}
                                  />
                                  <button type="button" disabled={uploadingColor === c.color} className="text-[10px] uppercase tracking-widest bg-surface-variant hover:bg-surface-variant/80 text-on-surface px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold">
                                    {uploadingColor === c.color ? 'Subiendo...' : <><Upload size={12}/> Cambiar</>}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      uploadColorImage(c.color, e.target.files[0])
                                    }
                                  }}
                                  disabled={uploadingColor === c.color}
                                />
                                <button type="button" disabled={uploadingColor === c.color} className="text-[10px] uppercase tracking-widest bg-surface-variant hover:bg-surface-variant/80 text-on-surface px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold">
                                  {uploadingColor === c.color ? 'Subiendo...' : <><Upload size={12}/> Añadir Foto</>}
                                </button>
                              </div>
                            )}
                            
                            <button type="button" onClick={() => removeColor(c.color)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <ModaVariantMatrix
                  sizes={modaSizes}
                  colors={coloresList.map((item) => item.color)}
                  stocks={variantStocks}
                  onStockChange={(key, value) => setVariantStocks((current) => ({ ...current, [key]: value }))}
                />
              </div>
            </div>
          )}

          <div className="border-t border-outline-variant/10 pt-8 mt-8">
            <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Galería del Producto</h3>
            <div className="flex flex-col md:flex-row gap-6 items-center">
               <div className="w-32 h-32 rounded-xl border border-outline-variant/20 bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                  {mediaFiles.length > 0 ? (
                    <div className="text-center px-3">
                      <div className="flex justify-center mb-2">
                        {mediaFiles.some(file => file.type.startsWith('video/')) ? <Play className="text-primary" size={30} /> : <ImageIcon className="text-primary" size={30} />}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface">{mediaFiles.length} archivo(s)</p>
                    </div>
                  ) : (
                    <ImageIcon className="text-on-surface-variant/30" size={32} />
                  )}
               </div>
               <div className="flex-1 w-full">
                 <p className="text-xs text-on-surface-variant mb-2">
                   Sube fotos o clips. Fotos: WebP hasta 1400px. Videos: max 8s, sin audio, 720p y ~1.8 Mbps cuando el navegador permite comprimir.
                 </p>
                 <input
                    aria-label="Fotos y videos del producto"
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    multiple
                    onChange={(e) => {
                      setMediaFiles(Array.from(e.target.files || []))
                    }}
                    className="w-full cursor-pointer h-12 py-3 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:brightness-110 text-on-surface"
                  />
                  {mediaFiles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {mediaFiles.map((file, index) => (
                        <span key={`${file.name}-${index}`} className="rounded-full bg-surface-container-highest border border-outline-variant/30 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          {file.type.startsWith('video/') ? 'Clip' : 'Foto'} · {file.name}
                        </span>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-8 border-t border-outline-variant/10">
            <button type="button" onClick={() => router.back()} className="px-6 py-3 font-bold text-on-surface-variant hover:text-on-surface">
              Descartar
            </button>
            <button type="submit" disabled={loading} className="px-8 py-3 bg-primary text-on-primary hover:brightness-110 font-bold rounded-xl shadow-[0_10px_20px_rgba(192,193,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center gap-2">
              {loading ? 'Guardando…' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
