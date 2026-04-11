'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { optimizeImage } from '@/lib/optimizeImage'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, Upload, QrCode, Palette, Share2, Image as ImageIcon, Store, ShoppingBag, Shirt } from 'lucide-react'
import CatalogBuilder from '@/components/dashboard/CatalogBuilder'
import dynamic from 'next/dynamic'
const StoreMapPicker = dynamic(() => import('@/components/dashboard/StoreMapPicker'), { ssr: false })

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')

  // Datos del formulario
  const [storeName, setStoreName] = useState('')
  const [description, setDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [slug, setSlug] = useState('')

  // Nuevos campos para Personalización
  const [templateType, setTemplateType] = useState('comercio')
  const [bannerUrl, setBannerUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#000000')
  const [secondaryColor, setSecondaryColor] = useState('#C31432')
  const [socialFacebook, setSocialFacebook] = useState('')
  const [socialInstagram, setSocialInstagram] = useState('')
  const [socialTikTok, setSocialTikTok] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')

  // Ubicación del local
  const [storeAddress, setStoreAddress]   = useState('')
  const [storeLat, setStoreLat]           = useState<number | null>(null)
  const [storeLng, setStoreLng]           = useState<number | null>(null)
  const storeMapRef                       = useRef<any>(null)
  const storeMapContainerRef              = useRef<HTMLDivElement>(null)
  const storeMarkerRef                    = useRef<any>(null)

  // Nuevos campos para QRs
  const [yapeUrl, setYapeUrl] = useState('')
  const [plinUrl, setPlinUrl] = useState('')

  const [uploading, setUploading] = useState(false)

  // 1. Cargar datos al entrar
  useEffect(() => {
    const cargarPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setStoreName(data.store_name || '')
        setSlug(data.slug || '')
        setDescription(data.description || '')
        setAvatarUrl(data.avatar_url || '')
        setYapeUrl(data.yape_image_url || '')
        setPlinUrl(data.plin_image_url || '')
        // Load Personalization
        setTemplateType(data.template_type || 'comercio')
        setBannerUrl(data.banner_url || '')
        setPrimaryColor(data.primary_color || '#000000')
        setSecondaryColor(data.secondary_color || '#C31432')
        setSocialFacebook(data.social_facebook || '')
        setSocialInstagram(data.social_instagram || '')
        setSocialTikTok(data.social_tiktok || '')
        setWhatsappPhone(data.whatsapp_phone || '')
        setStoreAddress(data.store_address || '')
        setStoreLat(data.store_lat || null)
        setStoreLng(data.store_lng || null)
      }
    }
    cargarPerfil()
  }, [])

  // 2. Función genérica para subir Imágenes
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, bucket: string, setter: (url: string) => void) => {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, etc).')
        return
      }

      // Optimize: convert to WebP + resize if needed
      const { blob, fileName } = await optimizeImage(file, { maxDimension: 1400, quality: 0.90 })
      const filePath = `${userId}-${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { contentType: 'image/webp' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      setter(publicUrl)
    } catch (error: any) {
      alert('Error subiendo imagen: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 3. Guardar Cambios en Base de Datos
  const guardarCambios = async () => {
    if (!userId) {
      alert('Error de sesión: Por favor recarga la página para verificar tu usuario antes de guardar.');
      return;
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          store_name: storeName,
          slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || null,
          description: description,
          avatar_url: avatarUrl,
          yape_image_url: yapeUrl,
          plin_image_url: plinUrl,
          // Personalization
          template_type: templateType,
          banner_url: bannerUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          social_facebook: socialFacebook,
          social_instagram: socialInstagram,
          social_tiktok: socialTikTok,
          whatsapp_phone: whatsappPhone.replace(/\s/g, '') || null,
          store_address: storeAddress || null,
          store_lat: storeLat,
          store_lng: storeLng,
          updated_at: new Date(),
        })
        .eq('id', userId)

      if (error) throw error
      alert('✅ ¡Datos actualizados correctamente!')

    } catch (error: any) {
      if (error.code === '23505') {
        alert('❌ Ese enlace ya está en uso por otra tienda. Por favor elige otro.')
      } else {
        alert('Error guardando: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configurar Tienda 🏪</h1>
        <p className="text-slate-500">Personaliza tu perfil, métodos de pago y apariencia.</p>
      </div>

      <div className="grid gap-8">

        {/* VITRINA PÚBLICA (CATALOG BUILDER) */}
        {userId && <CatalogBuilder userId={userId} />}

        {/* PLANTILLA DE LA TIENDA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Store size={20} /> Experiencia de Compra (Plantilla)</CardTitle>
            <CardDescription>Elige cómo interactuarán tus clientes y cómo se verá tu catálogo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Restaurante */}
              <label className={`cursor-pointer border-2 rounded-xl p-4 transition-all flex flex-col items-center text-center gap-3 ${templateType === 'restaurante' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50 shadow-sm hover:shadow'}`}>
                <input type="radio" className="hidden" name="template" value="restaurante" checked={templateType === 'restaurante'} onChange={() => setTemplateType('restaurante')} />
                <div className={`p-4 rounded-full ${templateType === 'restaurante' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Store size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Restaurante / Food</h3>
                  <p className="text-xs text-slate-500 mt-1">El pedido se envía directamente al WhatsApp. Destaca platos y menú. Sin carrito.</p>
                </div>
              </label>

              {/* Comercio */}
              <label className={`cursor-pointer border-2 rounded-xl p-4 transition-all flex flex-col items-center text-center gap-3 ${templateType === 'comercio' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50 shadow-sm hover:shadow'}`}>
                <input type="radio" className="hidden" name="template" value="comercio" checked={templateType === 'comercio'} onChange={() => setTemplateType('comercio')} />
                <div className={`p-4 rounded-full ${templateType === 'comercio' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Comercio General</h3>
                  <p className="text-xs text-slate-500 mt-1">Flujo de compra estándar. Carrito de compras, checkout y métodos de pago.</p>
                </div>
              </label>

              {/* Moda */}
              <label className={`cursor-pointer border-2 rounded-xl p-4 transition-all flex flex-col items-center text-center gap-3 ${templateType === 'moda' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50 shadow-sm hover:shadow'}`}>
                <input type="radio" className="hidden" name="template" value="moda" checked={templateType === 'moda'} onChange={() => setTemplateType('moda')} />
                <div className={`p-4 rounded-full ${templateType === 'moda' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Shirt size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Moda / Boutique</h3>
                  <p className="text-xs text-slate-500 mt-1">Look premium aspiracional. Soporta variantes obligatorias por producto (talla/color).</p>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* IDENTIDAD VISUAL */}
        <Card>
          <CardHeader>
            <CardTitle>Identidad Visual</CardTitle>
            <CardDescription>Cómo te ven tus clientes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* LOGO UPLOAD */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-24 w-24 shrink-0 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">🏪</span>
                )}
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <Label htmlFor="logo" className="cursor-pointer inline-block">
                  <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors">
                    <Upload size={16} />
                    {uploading ? 'Subiendo...' : 'Subir Logo'}
                  </div>
                </Label>
                <Input id="logo" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatars', setAvatarUrl)} disabled={uploading} />
                <p className="text-xs text-slate-400">Recomendado: 400x400px (Cuadrado)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nombre de la Tienda</Label>
              <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ej: Bodega Mark" />
            </div>

            <div className="space-y-2">
              <Label>Enlace de tu Tienda (Slug)</Label>
              <div className="flex items-center">
                <span className="bg-slate-100 text-slate-500 px-3 py-2 border border-r-0 rounded-l-md text-sm whitespace-nowrap">linkventas.com/tienda/</span>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="mi-nombre" className="rounded-l-none" />
              </div>
              <p className="text-xs text-slate-400">Solo minúsculas, números y guiones. Ejemplo: ropa-lima</p>
            </div>

            <div className="space-y-2">
              <Label>Descripción Corta (Bio)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Las bebidas más frías de Pucusana 🌊" />
            </div>
          </CardContent>
        </Card>

        {/* PERSONALIZACIÓN (COLORES & BANNER) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette size={20} /> Personalización (Estilo)</CardTitle>
            <CardDescription>Define los colores y portada de tu tienda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Banner Upload */}
            <div className="space-y-3">
              <Label>Imagen de Portada (Banner)</Label>
              <div className="relative w-full h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden flex items-center justify-center group">
                {bannerUrl ? (
                  <img src={bannerUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <ImageIcon size={24} />
                    <span className="text-xs mt-1">Subir Banner (1200x400px)</span>
                  </div>
                )}
                <Label htmlFor="banner" className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                  <div className="bg-white text-black px-3 py-1 rounded shadow text-sm font-medium">Cambiar Imagen</div>
                </Label>
                <Input id="banner" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatars', setBannerUrl)} disabled={uploading} />
              </div>
            </div>

            <Separator />

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Color Principal (Texto/Fondos)</Label>
                <div className="flex gap-3">
                  <Input type="color" className="w-12 h-10 p-1 cursor-pointer" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono uppercase" maxLength={7} />
                </div>
                <p className="text-xs text-slate-400">Usado en textos oscuros y el tono base del gradiente.</p>
              </div>
              <div className="space-y-2">
                <Label>Color Secundario (Botones/Gradiente)</Label>
                <div className="flex gap-3">
                  <Input type="color" className="w-12 h-10 p-1 cursor-pointer" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
                  <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="font-mono uppercase" maxLength={7} />
                </div>
                <p className="text-xs text-slate-400">Usado en botones, acentos y el final del gradiente.</p>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-lg border text-center" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)` }}>
              <span className="text-white font-bold opacity-90">Vista Previa del Gradiente</span>
            </div>

          </CardContent>
        </Card>

        {/* REDES SOCIALES */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Share2 size={20} /> Redes Sociales</CardTitle>
            <CardDescription>Conecta tus perfiles sociales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Instagram (Usuario)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">@</span>
                <Input className="pl-8" placeholder="usuario_insta" value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Facebook (URL)</Label>
              <Input placeholder="https://facebook.com/paginatuya" value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>TikTok (Usuario)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">@</span>
                <Input className="pl-8" placeholder="usuario_tiktok" value={socialTikTok} onChange={(e) => setSocialTikTok(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp de Ventas (Número)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400">+</span>
                <Input className="pl-8" placeholder="51999123456" value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} />
              </div>
              <p className="text-xs text-slate-400">Código de país + número. Ej: 51999123456 (Perú)</p>
            </div>
          </CardContent>
        </Card>

        {/* MÉTODOS DE PAGO (QRs) */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago (QRs)</CardTitle>
            <CardDescription>Sube tus códigos QR de Yape y Plin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* YAPE */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-purple-600">Yape</Label>
                  <QrCode size={18} className="text-purple-600" />
                </div>
                <div className="aspect-square bg-slate-50 border-2 border-dashed rounded-md flex items-center justify-center overflow-hidden relative group">
                  {yapeUrl ? (
                    <img src={yapeUrl} alt="Yape QR" className="w-full h-full object-contain" />
                  ) : <span className="text-slate-300 text-sm">Sin QR</span>}
                  {uploading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Loader2 className="animate-spin text-purple-600" /></div>}
                </div>
                <Label htmlFor="yape-upload" className="block cursor-pointer">
                  <div className="w-full border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center justify-center gap-2 py-2 rounded-md transition-colors text-sm font-medium">
                    <Upload size={14} /> Subir Yape QR
                  </div>
                </Label>
                <Input id="yape-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatars', setYapeUrl)} disabled={uploading} />
              </div>

              {/* PLIN */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-cyan-600">Plin</Label>
                  <QrCode size={18} className="text-cyan-600" />
                </div>
                <div className="aspect-square bg-slate-50 border-2 border-dashed rounded-md flex items-center justify-center overflow-hidden relative group">
                  {plinUrl ? (
                    <img src={plinUrl} alt="Plin QR" className="w-full h-full object-contain" />
                  ) : <span className="text-slate-300 text-sm">Sin QR</span>}
                  {uploading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-600" /></div>}
                </div>
                <Label htmlFor="plin-upload" className="block cursor-pointer">
                  <div className="w-full border border-cyan-200 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 flex items-center justify-center gap-2 py-2 rounded-md transition-colors text-sm font-medium">
                    <Upload size={14} /> Subir Plin QR
                  </div>
                </Label>
                <Input id="plin-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatars', setPlinUrl)} disabled={uploading} />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ── UBICACIÓN DEL LOCAL ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📍</span> Ubicación del Local
            </CardTitle>
            <CardDescription>Marca en el mapa dónde está tu local. Esto se mostrará como punto de salida en el mapa del cliente cuando el pedido esté "en camino".</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Dirección del local (texto)</Label>
              <Input
                value={storeAddress}
                onChange={e => setStoreAddress(e.target.value)}
                placeholder="Ej: Av. Larco 1234, Miraflores"
              />
            </div>

            {storeLat && storeLng && (
              <p className="text-xs text-green-600 font-medium">✅ Ubicación guardada: {storeLat.toFixed(5)}, {storeLng.toFixed(5)}</p>
            )}

            <div className="space-y-2">
              <Label>Marca tu local en el mapa</Label>
              <p className="text-xs text-slate-500">Haz clic en el mapa para marcar la ubicación exacta de tu local.</p>
              <StoreMapPicker
                initialLat={storeLat}
                initialLng={storeLng}
                onPick={(lat, lng) => { setStoreLat(lat); setStoreLng(lng) }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-4 z-10">
          <Button onClick={guardarCambios} disabled={loading} size="lg" className="w-full text-lg shadow-2xl">
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Guardar Todos los Cambios
          </Button>
        </div>
      </div>
    </div>
  )
}