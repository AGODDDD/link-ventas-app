'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { optimizeImage } from '@/lib/optimizeImage'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, Upload, QrCode, Palette, Share2, Image as ImageIcon, Store, ShoppingBag, Shirt, Lock, Zap, Flame, LayoutDashboard, CreditCard, MapPin, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import CatalogBuilder from '@/components/dashboard/CatalogBuilder'
import dynamic from 'next/dynamic'
const StoreMapPicker = dynamic(() => import('@/components/dashboard/StoreMapPicker'), { ssr: false })
import ScheduleEditor from '@/components/dashboard/ScheduleEditor'
import { DEFAULT_SCHEDULE, StoreSchedule } from '@/lib/storeSchedule'
import FomoConfigModal from '@/components/dashboard/FomoConfigModal'

interface SettingsFormData {
  storeName: string;
  slug: string;
  description: string;
  avatarUrl: string;
  templateType: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  yapeUrl: string;
  plinUrl: string;
  culqiActive: boolean;
  culqiPublicKey: string;
  culqiSecretKey: string;
  storeAddress: string;
  storeLat: number | null;
  storeLng: number | null;
  storeSchedule: StoreSchedule;
  socialFacebook: string;
  socialInstagram: string;
  socialTikTok: string;
  whatsappPhone: string;
}

interface SystemData {
  userId: string;
  userEmail: string;
  planStatus: string | null;
  planExpiresAt: string | null;
}

const TABS = [
  { id: 'general', label: 'General & Perfil', icon: LayoutDashboard },
  { id: 'plantilla', label: 'Plantilla & Experiencia', icon: Store },
  { id: 'diseno', label: 'Diseño & Apariencia', icon: Palette },
  { id: 'pagos', label: 'Pagos & Facturación', icon: CreditCard },
  { id: 'logistica', label: 'Logística & Horarios', icon: MapPin },
  { id: 'marketing', label: 'Marketing & Redes', icon: Share2 },
]

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [showFomoConfig, setShowFomoConfig] = useState(false)

  const [systemData, setSystemData] = useState<SystemData>({
    userId: '',
    userEmail: '',
    planStatus: null,
    planExpiresAt: null
  })

  const [initialData, setInitialData] = useState<SettingsFormData | null>(null)
  const [formData, setFormData] = useState<SettingsFormData | null>(null)
  
  // Para la confirmación de plantilla
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)

  useEffect(() => {
    const cargarPerfil = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setSystemData({
          userId: user.id,
          userEmail: user.email || '',
          planStatus: data.plan ?? null,
          planExpiresAt: data.plan_expires_at ?? null
        })

        const fetchedData: SettingsFormData = {
          storeName: data.store_name || '',
          slug: data.slug || '',
          description: data.description || '',
          avatarUrl: data.avatar_url || '',
          templateType: data.template_type || 'comercio',
          bannerUrl: data.banner_url || '',
          primaryColor: data.primary_color || '#000000',
          secondaryColor: data.secondary_color || '#C31432',
          yapeUrl: data.yape_image_url || '',
          plinUrl: data.plin_image_url || '',
          culqiActive: data.culqi_active || false,
          culqiPublicKey: data.culqi_public_key || '',
          culqiSecretKey: '', // Starts empty
          storeAddress: data.store_address || '',
          storeLat: data.store_lat || null,
          storeLng: data.store_lng || null,
          storeSchedule: data.store_schedule ? { ...DEFAULT_SCHEDULE, ...data.store_schedule } : DEFAULT_SCHEDULE,
          socialFacebook: data.social_facebook || '',
          socialInstagram: data.social_instagram || '',
          socialTikTok: data.social_tiktok || '',
          whatsappPhone: data.whatsapp_phone || '',
        }
        setInitialData(fetchedData)
        setFormData(JSON.parse(JSON.stringify(fetchedData)))
      }
      setLoading(false)
    }
    cargarPerfil()
  }, [])

  const hasChanges = initialData && formData ? JSON.stringify(initialData) !== JSON.stringify(formData) : false

  const updateForm = (key: keyof SettingsFormData, value: any) => {
    if (!formData) return
    setFormData({ ...formData, [key]: value })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, bucket: string, key: keyof SettingsFormData) => {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, etc).')
        return
      }

      const { blob, fileName } = await optimizeImage(file, { maxDimension: 1400, quality: 0.90 })
      const filePath = `${systemData.userId}-${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { contentType: 'image/webp' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      updateForm(key, publicUrl)
    } catch (error: any) {
      alert('Error subiendo imagen: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const descartarCambios = () => {
    if (initialData) {
      setFormData(JSON.parse(JSON.stringify(initialData)))
      setPendingTemplate(null)
    }
  }

  const guardarCambios = async () => {
    if (!systemData.userId || !formData || !initialData) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('profiles')
        .update({
          store_name: formData.storeName,
          slug: formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || null,
          description: formData.description,
          avatar_url: formData.avatarUrl,
          yape_image_url: formData.yapeUrl,
          plin_image_url: formData.plinUrl,
          template_type: formData.templateType,
          banner_url: formData.bannerUrl,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          social_facebook: formData.socialFacebook,
          social_instagram: formData.socialInstagram,
          social_tiktok: formData.socialTikTok,
          whatsapp_phone: formData.whatsappPhone.replace(/\s/g, '') || null,
          store_address: formData.storeAddress || null,
          store_lat: formData.storeLat,
          store_lng: formData.storeLng,
          store_schedule: formData.storeSchedule,
          updated_at: new Date(),
        })
        .eq('id', systemData.userId)

      if (error) throw error

      // Culqi
      const paymentSettingsChanged =
        formData.culqiActive !== initialData.culqiActive ||
        formData.culqiPublicKey.trim() !== initialData.culqiPublicKey ||
        formData.culqiSecretKey.trim() !== ''

      if (paymentSettingsChanged) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const paymentRes = await fetch('/api/settings/payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              culqi_active: formData.culqiActive,
              culqi_public_key: formData.culqiPublicKey,
              culqi_secret_key: formData.culqiSecretKey,
            })
          })
          const paymentData = await paymentRes.json()
          if (!paymentRes.ok) {
            throw new Error(paymentData.error || 'Error cifrando credenciales de pasarela.')
          }
        }
      }

      const newInitialData = { ...formData, culqiSecretKey: '' }
      setInitialData(newInitialData)
      setFormData(JSON.parse(JSON.stringify(newInitialData)))
      setPendingTemplate(null)
      alert('Cambios guardados correctamente.')

    } catch (error: any) {
      if (error.code === '23505') {
        alert('Ese enlace ya está en uso por otra tienda. Por favor elige otro.')
      } else {
        alert('Error guardando: ' + error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmarCambioPlantilla = async () => {
    if (!systemData.userId || !pendingTemplate) return
    try {
      setSavingTemplate(true)
      const { error } = await supabase
        .from('profiles')
        .update({ template_type: pendingTemplate, updated_at: new Date() })
        .eq('id', systemData.userId)
      if (error) throw error

      if (initialData && formData) {
        setInitialData({ ...initialData, templateType: pendingTemplate })
        setFormData({ ...formData, templateType: pendingTemplate })
      }
      setPendingTemplate(null)
      alert('Plantilla cambiada correctamente.')
    } catch (error: any) {
      alert('Error cambiando plantilla: ' + error.message)
    } finally {
      setSavingTemplate(false)
    }
  }

  if (loading || !formData) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-zinc-400" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto pb-32">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Ajustes de Tienda</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Configura y personaliza la experiencia de tu negocio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* SIDEBAR NAVEGACIÓN */}
        <div className="md:col-span-1">
          {/* Mobile Select */}
          <div className="md:hidden mb-6">
            <select 
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg h-12 px-4"
            >
              {TABS.map(tab => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>
          
          {/* Desktop Menu */}
          <nav className="hidden md:flex flex-col space-y-1 sticky top-24">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${isActive ? 'bg-primary text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* CONTENIDO ACTIVO */}
        <div className="md:col-span-3 space-y-6">

          {/* 1. GENERAL & PERFIL */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Mi Cuenta y Suscripción</CardTitle>
                  <CardDescription>Información técnica y estado de facturación.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                    <div>
                      <Label className="text-zinc-500 text-xs">Correo Electrónico</Label>
                      <p className="font-medium text-sm mt-1 text-zinc-900 dark:text-zinc-100">{systemData.userEmail}</p>
                    </div>
                    <div>
                      <Label className="text-zinc-500 text-xs">ID de Usuario (UUID)</Label>
                      <p className="text-xs font-mono text-zinc-400 mt-1 select-all">{systemData.userId}</p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800/50 flex flex-col justify-between">
                    <div>
                      <Label className="text-zinc-500 text-xs block mb-2">Estado de Suscripción</Label>
                      {systemData.planStatus === 'pro' && <span className="inline-block px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-semibold rounded">PLAN PRO ACTIVO</span>}
                      {systemData.planStatus === 'trial' && <span className="inline-block px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-semibold rounded">PRUEBA PRO</span>}
                      {systemData.planStatus === 'free' && <span className="inline-block px-3 py-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold rounded">PLAN EMPRENDEDOR</span>}
                      {systemData.planStatus === 'inactivo' && <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">INACTIVO</span>}
                    </div>
                    {(systemData.planStatus === 'free' || systemData.planStatus === 'trial') && (
                      <a href="https://wa.me/51999999999" target="_blank" rel="noopener noreferrer" className="block text-center w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-md text-sm font-semibold transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200">
                        Mejorar Plan
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Identidad Visual</CardTitle>
                  <CardDescription>Información pública de la tienda.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="h-20 w-20 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center overflow-hidden">
                      {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <Store className="text-zinc-400" size={24} />
                      )}
                    </div>
                    <div className="space-y-2 text-center sm:text-left">
                      <Label htmlFor="logo" className="cursor-pointer inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors border border-zinc-200 dark:border-zinc-700">
                        <Upload size={16} />
                        {uploading ? 'Subiendo...' : 'Subir Logo'}
                      </Label>
                      <Input id="logo" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatars', 'avatarUrl')} disabled={uploading} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nombre de la Tienda</Label>
                    <Input value={formData.storeName} onChange={(e) => updateForm('storeName', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Enlace de tu Tienda (Slug)</Label>
                    <div className="flex items-center">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-3 py-2 border border-r-0 border-zinc-200 dark:border-zinc-700 rounded-l-md text-sm">linkventas.com/tienda/</span>
                      <Input value={formData.slug} onChange={(e) => updateForm('slug', e.target.value)} className="rounded-l-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción Corta (Bio)</Label>
                    <Input value={formData.description} onChange={(e) => updateForm('description', e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2. PLANTILLA & EXPERIENCIA */}
          {activeTab === 'plantilla' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Selección de Plantilla</CardTitle>
                  <CardDescription>Define el modelo operativo y la interfaz de tu negocio.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  
                  {pendingTemplate && pendingTemplate !== formData.templateType && (
                    <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={20} />
                        <div>
                          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-400">Atención: Cambio de Plantilla Detectado</h4>
                          <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 mb-3">
                            Cambiar de plantilla modifica el comportamiento completo de tu tienda pública y puede requerir que actualices tus productos.
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={confirmarCambioPlantilla} disabled={savingTemplate} className="bg-amber-600 hover:bg-amber-700 text-white">
                              {savingTemplate ? 'Guardando...' : 'Confirmar Cambio de Plantilla'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setPendingTemplate(null)} disabled={savingTemplate} className="border-amber-200 text-amber-700">
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: 'restaurante', icon: Store, title: 'Restaurante / Food', desc: 'Envío directo a WhatsApp. Destaca platos y menú. Sin carrito genérico.' },
                      { id: 'comercio', icon: ShoppingBag, title: 'Comercio General', desc: 'Flujo estándar. Carrito de compras y checkout estructurado.' },
                      { id: 'moda', icon: Shirt, title: 'Moda / Boutique', desc: 'Look premium. Soporta variantes obligatorias (talla/color).' }
                    ].map(tpl => {
                      const isCurrent = formData.templateType === tpl.id
                      const isPending = pendingTemplate === tpl.id
                      const Icon = tpl.icon
                      
                      return (
                        <div 
                          key={tpl.id}
                          onClick={() => { if (!isCurrent) setPendingTemplate(tpl.id) }}
                          className={`relative cursor-pointer border rounded-xl p-5 flex flex-col items-center text-center gap-3 transition-all ${isCurrent ? 'border-primary bg-primary/5 ring-1 ring-primary' : isPending ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-500' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50'}`}
                        >
                          <div className={`p-3 rounded-full ${isCurrent ? 'bg-primary text-white' : isPending ? 'bg-amber-500 text-white' : 'bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800'}`}>
                            <Icon size={24} />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{tpl.title}</h3>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{tpl.desc}</p>
                          </div>
                          {isCurrent && <div className="absolute top-2 right-2 text-primary"><CheckCircle2 size={18} /></div>}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3. DISEÑO & APARIENCIA */}
          {activeTab === 'diseno' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Diseño Visual</CardTitle>
                  <CardDescription>Colores y portada de la tienda.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-3">
                    <Label>Imagen de Portada (Banner)</Label>
                    <div className="relative w-full h-32 bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden flex items-center justify-center group">
                      {formData.bannerUrl ? (
                        <img src={formData.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
                      ) : (
                        <div className="text-zinc-400 flex flex-col items-center">
                          <ImageIcon size={20} />
                          <span className="text-xs mt-2">1200x400px</span>
                        </div>
                      )}
                      <Label htmlFor="banner" className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white text-black px-3 py-1 rounded text-xs font-medium">Cambiar</span>
                      </Label>
                      <Input id="banner" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatars', 'bannerUrl')} disabled={uploading} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Color Principal</Label>
                      <div className="flex gap-3">
                        <Input type="color" className="w-12 h-10 p-1 cursor-pointer border-zinc-200 dark:border-zinc-700" value={formData.primaryColor} onChange={(e) => updateForm('primaryColor', e.target.value)} />
                        <Input value={formData.primaryColor} onChange={(e) => updateForm('primaryColor', e.target.value)} className="font-mono uppercase" maxLength={7} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Color Secundario</Label>
                      <div className="flex gap-3">
                        <Input type="color" className="w-12 h-10 p-1 cursor-pointer border-zinc-200 dark:border-zinc-700" value={formData.secondaryColor} onChange={(e) => updateForm('secondaryColor', e.target.value)} />
                        <Input value={formData.secondaryColor} onChange={(e) => updateForm('secondaryColor', e.target.value)} className="font-mono uppercase" maxLength={7} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {systemData.userId && <CatalogBuilder userId={systemData.userId} />}
            </div>
          )}

          {/* 4. PAGOS & FACTURACIÓN */}
          {activeTab === 'pagos' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Culqi Global */}
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl overflow-hidden relative">
                {systemData.planStatus === 'free' && (
                  <div className="absolute inset-0 bg-zinc-100/90 dark:bg-zinc-950/90 z-10 flex flex-col items-center justify-center p-6 text-center">
                    <Lock size={24} className="text-zinc-400 mb-3" />
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Disponible en Plan Pro</h4>
                    <p className="text-xs text-zinc-500 max-w-sm mb-4">Automatiza tus ventas aceptando tarjetas de crédito y débito directamente en tu tienda.</p>
                    <a href="https://wa.me/51999999999" target="_blank" rel="noopener noreferrer" className="bg-zinc-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-md text-sm font-medium">Activar Pro</a>
                  </div>
                )}
                
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Pasarela Culqi</CardTitle>
                    <CardDescription>Cargos automáticos con tarjeta.</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="font-semibold text-sm cursor-pointer" htmlFor="culqi-switch">
                      {formData.culqiActive ? 'Activo' : 'Inactivo'}
                    </Label>
                    <div 
                      className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors ${formData.culqiActive ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      onClick={() => updateForm('culqiActive', !formData.culqiActive)}
                      id="culqi-switch"
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${formData.culqiActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </div>
                </CardHeader>
                {formData.culqiActive && (
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Llave Pública (pk_...)</Label>
                      <Input value={formData.culqiPublicKey} onChange={(e) => updateForm('culqiPublicKey', e.target.value)} className="font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label>Llave Privada (sk_...)</Label>
                      <Input type="password" value={formData.culqiSecretKey} onChange={(e) => updateForm('culqiSecretKey', e.target.value)} className="font-mono text-sm" placeholder="Ingresa para modificar" />
                      <p className="text-xs text-zinc-500">Solo visible al momento de editar. Se guarda cifrada en el servidor.</p>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Lógica Condicional de Pagos Manuales */}
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Métodos Manuales</CardTitle>
                  <CardDescription>Configuración según plantilla actual.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {formData.templateType === 'restaurante' ? (
                    <div className="space-y-6">
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <h4 className="text-sm font-semibold mb-2">WhatsApp Directo</h4>
                        <p className="text-xs text-zinc-500 mb-4">El checkout de restaurante agrupa Contra Entrega y Yape/Plin en la coordinación directa por WhatsApp.</p>
                        <div className="space-y-2">
                          <Label>Número de WhatsApp para pedidos</Label>
                          <Input value={formData.whatsappPhone} onChange={(e) => updateForm('whatsappPhone', e.target.value)} placeholder="51999123456" />
                        </div>
                      </div>
                      <div className="opacity-50 pointer-events-none border border-dashed border-zinc-300 dark:border-zinc-700 p-4 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Carga de QRs Yape/Plin</span>
                        <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded text-xs font-medium">Disponible en Comercio y Moda</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* YAPE */}
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
                        <Label className="font-semibold text-sm">QR Yape</Label>
                        <div className="aspect-square bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md flex items-center justify-center relative">
                          {formData.yapeUrl ? (
                            <img src={formData.yapeUrl} alt="Yape" className="w-full h-full object-contain p-2" />
                          ) : <span className="text-zinc-400 text-xs">Sin imagen</span>}
                        </div>
                        <Label htmlFor="yape-upload" className="block cursor-pointer text-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 py-2 rounded-md text-xs font-medium transition-colors">
                          Subir QR
                        </Label>
                        <Input id="yape-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatars', 'yapeUrl')} />
                      </div>

                      {/* PLIN */}
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4">
                        <Label className="font-semibold text-sm">QR Plin</Label>
                        <div className="aspect-square bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-md flex items-center justify-center relative">
                          {formData.plinUrl ? (
                            <img src={formData.plinUrl} alt="Plin" className="w-full h-full object-contain p-2" />
                          ) : <span className="text-zinc-400 text-xs">Sin imagen</span>}
                        </div>
                        <Label htmlFor="plin-upload" className="block cursor-pointer text-center border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 py-2 rounded-md text-xs font-medium transition-colors">
                          Subir QR
                        </Label>
                        <Input id="plin-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatars', 'plinUrl')} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 5. LOGÍSTICA & HORARIOS */}
          {activeTab === 'logistica' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Ubicación Faltante</CardTitle>
                  <CardDescription>Dirección para envíos o recojo en tienda.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Dirección Física</Label>
                    <Input value={formData.storeAddress} onChange={e => updateForm('storeAddress', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Punto en el Mapa</Label>
                    <StoreMapPicker
                      initialLat={formData.storeLat}
                      initialLng={formData.storeLng}
                      onPick={(lat, lng) => { updateForm('storeLat', lat); updateForm('storeLng', lng) }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Estrategia Horaria</CardTitle>
                  <CardDescription>Bloquea pedidos fuera del horario de atención.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ScheduleEditor value={formData.storeSchedule} onChange={(sch) => updateForm('storeSchedule', sch)} />
                </CardContent>
              </Card>

            </div>
          )}

          {/* 6. MARKETING & REDES */}
          {activeTab === 'marketing' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Redes Sociales</CardTitle>
                  <CardDescription>Enlaces visibles en el pie de página (Comercio/Moda).</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Instagram (Usuario)</Label>
                    <Input placeholder="usuario_insta" value={formData.socialInstagram} onChange={(e) => updateForm('socialInstagram', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>TikTok (Usuario)</Label>
                    <Input placeholder="usuario_tiktok" value={formData.socialTikTok} onChange={(e) => updateForm('socialTikTok', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Facebook (URL completa)</Label>
                    <Input placeholder="https://facebook.com/pagina" value={formData.socialFacebook} onChange={(e) => updateForm('socialFacebook', e.target.value)} />
                  </div>
                  {formData.templateType !== 'restaurante' && (
                    <div className="space-y-2">
                      <Label>WhatsApp de Contacto (Comercio/Moda)</Label>
                      <Input placeholder="51999123456" value={formData.whatsappPhone} onChange={(e) => updateForm('whatsappPhone', e.target.value)} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg flex items-center gap-2">Motor FOMO</CardTitle>
                  <CardDescription>Stock social y urgencia de compra.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Button onClick={() => setShowFomoConfig(true)} variant="outline" className="w-full border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    Configurar Motor FOMO
                  </Button>
                  <FomoConfigModal isOpen={showFomoConfig} onClose={() => setShowFomoConfig(false)} userId={systemData.userId} />
                </CardContent>
              </Card>

            </div>
          )}

        </div>
      </div>

      {/* STICKY SAVE BAR */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom-full duration-300">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-300 text-center sm:text-left">
              Tienes cambios sin guardar en esta pestaña o en otras.
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="ghost" onClick={descartarCambios} disabled={saving} className="flex-1 sm:flex-none text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                Descartar
              </Button>
              <Button onClick={guardarCambios} disabled={saving} className="flex-1 sm:flex-none bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
