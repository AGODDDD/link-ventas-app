'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { optimizeImage } from '@/lib/optimizeImage'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, Upload, QrCode, Palette, Share2, Image as ImageIcon, Store, ShoppingBag, Shirt, Lock, Zap, Flame, LayoutDashboard, CreditCard, MapPin, CheckCircle2, AlertTriangle, X, LayoutList, Trash2, Plus } from 'lucide-react'
import CatalogBuilder from '@/components/dashboard/CatalogBuilder'
import AccountCenter from '@/components/dashboard/AccountCenter'
import dynamic from 'next/dynamic'
const StoreMapPicker = dynamic(() => import('@/components/dashboard/StoreMapPicker'), { ssr: false })
import ScheduleEditor from '@/components/dashboard/ScheduleEditor'
import { DEFAULT_SCHEDULE, StoreSchedule } from '@/lib/storeSchedule'
import FomoConfigModal from '@/components/dashboard/FomoConfigModal'
import { toast } from 'sonner'
import { useDashboardSession } from '@/components/dashboard/DashboardSessionContext'

interface SettingsFormData {
  storeName: string;
  slug: string;
  description: string;
  avatarUrl: string;
  heroImageUrl: string;
  templateType: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  yapeUrl: string;
  plinUrl: string;
  mercadopagoActive: boolean;
  mercadopagoPublicKey: string;
  mercadopagoAccessToken: string;
  mercadopagoWebhookSecret: string;
  storeAddress: string;
  storeLat: number | null;
  storeLng: number | null;
  storeSchedule: StoreSchedule;
  deliveryFee: number;
  socialFacebook: string;
  socialInstagram: string;
  socialTikTok: string;
  whatsappPhone: string;
  benefits: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  promoTitle: string;
  promoDescription: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryRadiusKm: number;
  minOrderAmount: number;
  defaultPreparationTime: string;
  acceptsOrdersAlways: boolean;
  shippingMethods: string;
  coverageArea: string;
  dispatchTime: string;
  sizeGuide: string;
  returnsPolicy: string;
  exchangeDays: number;
}

interface SystemData {
  userId: string;
  storeId: string;
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
  { id: 'contenido', label: 'Contenido de Tienda', icon: LayoutList },
]

export default function ConfiguracionPage() {
  const dashboardSession = useDashboardSession()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [showFomoConfig, setShowFomoConfig] = useState(false)
  const [appOrigin, setAppOrigin] = useState('')

  useEffect(() => setAppOrigin(window.location.origin), [])

  useEffect(() => {
    const handleTourTab = (event: Event) => {
      const tabId = (event as CustomEvent<string>).detail
      if (TABS.some(tab => tab.id === tabId)) setActiveTab(tabId)
    }
    window.addEventListener('linkventas:tour-setting-tab', handleTourTab)
    return () => window.removeEventListener('linkventas:tour-setting-tab', handleTourTab)
  }, [])

  const [systemData, setSystemData] = useState<SystemData>({
    userId: '',
    storeId: '',
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
    let cancelled = false
    const cargarPerfil = async () => {
      setLoading(true)
      setLoadError(null)
      const { userId, userEmail, planStatus, planExpiresAt, store } = dashboardSession
      if (!store) {
        throw new Error('No se encontró la tienda principal.')
      }

      const [{ data: config, error: configError }, { data: delivery, error: deliveryError }] = await Promise.all([
        supabase.from('store_config').select('*').eq('store_id', store.id).maybeSingle(),
        supabase.from('delivery_settings').select('base_delivery_fee').eq('store_id', store.id).maybeSingle(),
      ])

      if (cancelled) return
      if (configError || deliveryError) throw new Error('No se pudieron cargar los ajustes de la tienda.')
      if (!config) throw new Error('No se encontró la configuración de la tienda.')

      if (config) {
        const operations = config.operations_config || {}
        setSystemData({
          userId,
          storeId: store.id,
          userEmail,
          planStatus,
          planExpiresAt
        })

        const fetchedData: SettingsFormData = {
          storeName: store.name || '',
          slug: store.slug || '',
          description: store.description || '',
          avatarUrl: store.avatar_url || '',
          heroImageUrl: config.hero_image_url || '',
          templateType: store.template_type || 'comercio',
          bannerUrl: store.banner_url || '',
          primaryColor: config.primary_color || '#000000',
          secondaryColor: config.secondary_color || '#C31432',
          yapeUrl: config.yape_image_url || '',
          plinUrl: config.plin_image_url || '',
          mercadopagoActive: config.mercadopago_active || false,
          mercadopagoPublicKey: config.mercadopago_public_key || '',
          mercadopagoAccessToken: '', // Never returned by the server
          mercadopagoWebhookSecret: '', // Never returned by the server
          storeAddress: config.store_address || '',
          storeLat: config.store_lat || null,
          storeLng: config.store_lng || null,
          storeSchedule: config.store_schedule ? { ...DEFAULT_SCHEDULE, ...config.store_schedule } : DEFAULT_SCHEDULE,
          deliveryFee: Number(delivery?.base_delivery_fee ?? 0),
          socialFacebook: config.social_facebook || '',
          socialInstagram: config.social_instagram || '',
          socialTikTok: config.social_tiktok || '',
          whatsappPhone: store.whatsapp_phone || '',
          benefits: config.benefits || [],
          faqs: config.faqs || [],
          promoTitle: config.promo_title || '',
          promoDescription: config.promo_description || '',
          deliveryEnabled: operations.delivery_enabled ?? true,
          pickupEnabled: operations.pickup_enabled ?? false,
          deliveryRadiusKm: Number(operations.delivery_radius_km ?? 5),
          minOrderAmount: Number(operations.min_order_amount ?? 0),
          defaultPreparationTime: operations.default_preparation_time || '30-45 min',
          acceptsOrdersAlways: operations.accepts_orders_always ?? true,
          shippingMethods: operations.shipping_methods || '',
          coverageArea: operations.coverage_area || '',
          dispatchTime: operations.dispatch_time || '1-2 días hábiles',
          sizeGuide: operations.size_guide || '',
          returnsPolicy: operations.returns_policy || '',
          exchangeDays: Number(operations.exchange_days ?? 7),
        }
        setInitialData(fetchedData)
        setFormData(JSON.parse(JSON.stringify(fetchedData)))
      }
      setLoading(false)
    }
    void cargarPerfil().catch((error) => {
      if (!cancelled) setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los ajustes.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [dashboardSession, loadAttempt])

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
        toast.error('Selecciona una imagen válida (JPG, PNG o WEBP).')
        return
      }

      const { blob, fileName } = await optimizeImage(file, { maxDimension: 1400, quality: 0.90 })
      const filePath = `${systemData.userId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, { contentType: 'image/webp' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      updateForm(key, publicUrl)
    } catch (error: any) {
      toast.error('No se pudo subir la imagen: ' + error.message)
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
    if (!systemData.userId || !systemData.storeId || !formData || !initialData) return

    try {
      setSaving(true)

      const { error: storeError } = await supabase
        .from('stores')
        .update({
          name: formData.storeName,
          slug: formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || null,
          description: formData.description,
          avatar_url: formData.avatarUrl,
          template_type: formData.templateType,
          banner_url: formData.bannerUrl,
          whatsapp_phone: formData.whatsappPhone.replace(/\s/g, '') || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', systemData.storeId)

      if (storeError) throw storeError

      const { error: configError } = await supabase
        .from('store_config')
        .update({
          hero_image_url: formData.heroImageUrl,
          yape_image_url: formData.yapeUrl,
          plin_image_url: formData.plinUrl,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          social_facebook: formData.socialFacebook,
          social_instagram: formData.socialInstagram,
          social_tiktok: formData.socialTikTok,
          benefits: formData.benefits,
          faqs: formData.faqs,
          promo_title: formData.promoTitle,
          promo_description: formData.promoDescription,
          store_address: formData.storeAddress || null,
          store_lat: formData.storeLat,
          store_lng: formData.storeLng,
          store_schedule: formData.storeSchedule,
          operations_config: {
            delivery_enabled: formData.deliveryEnabled,
            pickup_enabled: formData.pickupEnabled,
            delivery_radius_km: formData.deliveryRadiusKm,
            min_order_amount: formData.minOrderAmount,
            default_preparation_time: formData.defaultPreparationTime,
            accepts_orders_always: formData.acceptsOrdersAlways,
            shipping_methods: formData.shippingMethods,
            coverage_area: formData.coverageArea,
            dispatch_time: formData.dispatchTime,
            size_guide: formData.sizeGuide,
            returns_policy: formData.returnsPolicy,
            exchange_days: formData.exchangeDays,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('store_id', systemData.storeId)

      if (configError) throw configError

      if (formData.templateType === 'restaurante') {
        const fee = Number(formData.deliveryFee)
        if (!Number.isFinite(fee) || fee < 0) {
          throw new Error('La tarifa de delivery debe ser un número mayor o igual a cero.')
        }

        const { error: deliveryError } = await supabase
          .from('delivery_settings')
          .upsert({
            store_id: systemData.storeId,
            base_delivery_fee: fee,
            delivery_active: formData.deliveryEnabled,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'store_id' })

        if (deliveryError) throw deliveryError
      }

      // Mercado Pago
      const paymentSettingsChanged =
        formData.mercadopagoActive !== initialData.mercadopagoActive ||
        formData.mercadopagoPublicKey.trim() !== initialData.mercadopagoPublicKey ||
        formData.mercadopagoAccessToken.trim() !== '' ||
        formData.mercadopagoWebhookSecret.trim() !== ''

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
              mercadopago_active: formData.mercadopagoActive,
              mercadopago_public_key: formData.mercadopagoPublicKey,
              mercadopago_access_token: formData.mercadopagoAccessToken,
              mercadopago_webhook_secret: formData.mercadopagoWebhookSecret,
            })
          })
          const paymentData = await paymentRes.json()
          if (!paymentRes.ok) {
            throw new Error(paymentData.error || 'Error cifrando credenciales de pasarela.')
          }
        }
      }

      const newInitialData = { ...formData, mercadopagoAccessToken: '', mercadopagoWebhookSecret: '' }
      setInitialData(newInitialData)
      setFormData(JSON.parse(JSON.stringify(newInitialData)))
      setPendingTemplate(null)
      toast.success('Cambios guardados')

    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Ese enlace ya está en uso. Elige otro.')
      } else {
        toast.error('No se pudo guardar: ' + error.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmarCambioPlantilla = async () => {
    if (!systemData.storeId || !pendingTemplate) return
    try {
      setSavingTemplate(true)
      const { error } = await supabase
        .from('stores')
        .update({ template_type: pendingTemplate, updated_at: new Date() })
        .eq('id', systemData.storeId)
      if (error) throw error

      if (initialData && formData) {
        setInitialData({ ...initialData, templateType: pendingTemplate })
        setFormData({ ...formData, templateType: pendingTemplate })
      }
      setPendingTemplate(null)
      toast.success('Plantilla cambiada')
    } catch (error: any) {
      toast.error('No se pudo cambiar la plantilla: ' + error.message)
    } finally {
      setSavingTemplate(false)
    }
  }


  return (
    <div id="tour-page-settings" className="max-w-6xl mx-auto pb-32">
      <div data-tour="settings-header" className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Ajustes de Tienda</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Configura y personaliza la experiencia de tu negocio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* SIDEBAR NAVEGACIÓN */}
        <div className="md:col-span-1">
          {/* Mobile Select */}
          <div data-tour="settings-mobile-navigation" className="md:hidden mb-6">
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
          <nav data-tour="settings-navigation" className="hidden md:flex flex-col space-y-1 sticky top-24">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  data-tour={`settings-${tab.id}`}
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

          <div hidden={activeTab !== 'general'}>
            <AccountCenter key={dashboardSession.userId} />
          </div>

          {loading ? (
            <div role="status" className="flex min-h-40 items-center justify-center gap-3 rounded-xl border border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"><Loader2 size={18} className="animate-spin" />Cargando ajustes de la tienda…</div>
          ) : loadError || !formData ? (
            <div role="alert" className="rounded-xl border border-zinc-200 p-6 text-sm dark:border-zinc-800"><p>{loadError || 'No se pudieron cargar los ajustes.'}</p><Button variant="outline" className="mt-3" onClick={() => setLoadAttempt(value => value + 1)}>Reintentar</Button></div>
          ) : (<>
          {/* 1. GENERAL & PERFIL */}
          {activeTab === 'general' && (
            <div data-tour="settings-panel-general" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              

              <Card data-tour="settings-identity" className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
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
            <div data-tour="settings-panel-plantilla" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
            <div data-tour="settings-panel-diseno" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
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

                  <div className="space-y-3 mt-6">
                    <Label>Foto Hero (Plantilla Moda)</Label>
                    <p className="text-xs text-zinc-500">Imagen principal que aparece en el encabezado de tu tienda Moda. Recomendado: foto vertical de producto o modelo, mínimo 800x1000px.</p>
                    <div className="relative w-full h-48 bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden flex items-center justify-center group">
                      {formData.heroImageUrl ? (
                        <img src={formData.heroImageUrl} className="w-full h-full object-cover" alt="Hero" />
                      ) : (
                        <div className="text-zinc-400 flex flex-col items-center">
                          <ImageIcon size={20} />
                          <span className="text-xs mt-2">800x1000px recomendado</span>
                        </div>
                      )}
                      <Label htmlFor="hero" className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white text-black px-3 py-1 rounded text-xs font-medium">Cambiar</span>
                      </Label>
                      <Input id="hero" type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'avatars', 'heroImageUrl')} disabled={uploading} />
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
            <div data-tour="settings-panel-pagos" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Mercado Pago */}
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl overflow-hidden relative">
                {systemData.planStatus === 'free' && (
                  <div className="absolute inset-0 bg-zinc-100/90 dark:bg-zinc-950/90 z-10 flex flex-col items-center justify-center p-6 text-center">
                    <Lock size={24} className="text-zinc-400 mb-3" />
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Disponible en Plan Pro</h4>
                    <p className="text-xs text-zinc-500 max-w-sm mb-4">Automatiza tus ventas aceptando tarjetas de crédito y débito directamente en tu tienda.</p>
                    <a href="/pendiente" target="_blank" rel="noopener noreferrer" className="bg-zinc-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-md text-sm font-medium">Activar Pro</a>
                  </div>
                )}
                
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Pasarela Mercado Pago</CardTitle>
                    <CardDescription>Cargos automáticos con tarjeta.</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="font-semibold text-sm cursor-pointer" htmlFor="mercadopago-switch">
                      {formData.mercadopagoActive ? 'Activo' : 'Inactivo'}
                    </Label>
                    <div 
                      className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors ${formData.mercadopagoActive ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      onClick={() => updateForm('mercadopagoActive', !formData.mercadopagoActive)}
                      id="mercadopago-switch"
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${formData.mercadopagoActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </div>
                </CardHeader>
                {formData.mercadopagoActive && (
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Public Key</Label>
                      <Input value={formData.mercadopagoPublicKey} onChange={(e) => updateForm('mercadopagoPublicKey', e.target.value)} className="font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input type="password" value={formData.mercadopagoAccessToken} onChange={(e) => updateForm('mercadopagoAccessToken', e.target.value)} className="font-mono text-sm" placeholder="Ingresa para modificar" />
                      <p className="text-xs text-zinc-500">Solo visible al momento de editar. Se guarda cifrada en el servidor.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Firma secreta de Webhooks</Label>
                      <Input type="password" value={formData.mercadopagoWebhookSecret} onChange={(e) => updateForm('mercadopagoWebhookSecret', e.target.value)} className="font-mono text-sm" placeholder="Ingresa para modificar" />
                      <p className="text-xs text-zinc-500">Configura esta URL para eventos de pagos y copia aquí la firma secreta generada por Mercado Pago.</p>
                      <Input readOnly value={appOrigin && systemData.storeId ? `${appOrigin}/api/webhooks/mercadopago?store_id=${systemData.storeId}` : ''} className="font-mono text-xs" />
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
            <div data-tour="settings-panel-logistica" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Operación {formData.templateType}</p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  {formData.templateType === 'restaurante' && 'Configura preparación, delivery, recojo y horarios de atención.'}
                  {formData.templateType === 'comercio' && 'Define cómo despachas productos y dónde pueden recibirlos tus clientes.'}
                  {formData.templateType === 'moda' && 'Centraliza envíos, recojo, tallaje y políticas de cambio.'}
                </p>
              </div>

              {formData.templateType === 'restaurante' && (
                <>
                  <Card className="rounded-2xl border-zinc-200 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900">
                    <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800/50">
                      <CardTitle className="text-lg">Modalidades del pedido</CardTitle>
                      <CardDescription>Activa solo las opciones que tu equipo puede atender.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 p-4 transition-all duration-300 hover:border-primary/30 dark:border-zinc-700">
                        <div><p className="text-sm font-semibold">Delivery</p><p className="mt-1 text-xs text-zinc-500">Entrega a domicilio</p></div>
                        <input type="checkbox" checked={formData.deliveryEnabled} onChange={event => updateForm('deliveryEnabled', event.target.checked)} className="h-5 w-5 accent-primary" />
                      </label>
                      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 p-4 transition-all duration-300 hover:border-primary/30 dark:border-zinc-700">
                        <div><p className="text-sm font-semibold">Recojo en local</p><p className="mt-1 text-xs text-zinc-500">El cliente recoge su pedido</p></div>
                        <input type="checkbox" checked={formData.pickupEnabled} onChange={event => updateForm('pickupEnabled', event.target.checked)} className="h-5 w-5 accent-primary" />
                      </label>
                    </CardContent>
                  </Card>

                  {(formData.deliveryEnabled || formData.pickupEnabled) && (
                    <Card className="rounded-2xl border-zinc-200 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900">
                      <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800/50">
                        <CardTitle className="text-lg">Local y cobertura</CardTitle>
                        <CardDescription>La ubicación permite calcular entregas y orientar el recojo.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5 pt-6">
                        <div className="space-y-2"><Label htmlFor="restaurant-address">Dirección del local</Label><Input id="restaurant-address" value={formData.storeAddress} onChange={event => updateForm('storeAddress', event.target.value)} /></div>
                        {formData.deliveryEnabled && (
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2"><Label htmlFor="delivery-fee">Tarifa base (S/)</Label><Input id="delivery-fee" type="number" min="0" step="0.50" value={formData.deliveryFee} onChange={event => updateForm('deliveryFee', Number(event.target.value))} /></div>
                            <div className="space-y-2"><Label htmlFor="delivery-radius">Radio de cobertura (km)</Label><Input id="delivery-radius" type="number" min="1" value={formData.deliveryRadiusKm} onChange={event => updateForm('deliveryRadiusKm', Number(event.target.value))} /></div>
                            <div className="space-y-2"><Label htmlFor="minimum-order">Pedido mínimo (S/)</Label><Input id="minimum-order" type="number" min="0" step="0.50" value={formData.minOrderAmount} onChange={event => updateForm('minOrderAmount', Number(event.target.value))} /></div>
                          </div>
                        )}
                        <div className="space-y-2"><Label>Punto en el mapa</Label><StoreMapPicker initialLat={formData.storeLat} initialLng={formData.storeLng} onPick={(lat, lng) => { updateForm('storeLat', lat); updateForm('storeLng', lng) }} /></div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="rounded-2xl border-zinc-200 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900">
                    <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800/50">
                      <CardTitle className="text-lg">Preparación y horarios</CardTitle>
                      <CardDescription>Promesa operativa mostrada al cliente antes de ordenar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      <div className="max-w-sm space-y-2"><Label htmlFor="default-preparation">Tiempo de preparación por defecto</Label><Input id="default-preparation" placeholder="Ej: 30-45 min" value={formData.defaultPreparationTime} onChange={event => updateForm('defaultPreparationTime', event.target.value)} /></div>
                      <ScheduleEditor value={formData.storeSchedule} onChange={schedule => updateForm('storeSchedule', schedule)} />
                    </CardContent>
                  </Card>
                </>
              )}

              {formData.templateType === 'comercio' && (
                <>
                  <Card className="rounded-2xl border-zinc-200 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900">
                    <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800/50"><CardTitle className="text-lg">Despacho y cobertura</CardTitle><CardDescription>Indica cómo entregas tus productos y cuánto demora el despacho.</CardDescription></CardHeader>
                    <CardContent className="space-y-5 pt-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label htmlFor="commerce-shipping">Métodos de envío</Label><Input id="commerce-shipping" placeholder="Ej: Olva, Shalom, motorizado propio" value={formData.shippingMethods} onChange={event => updateForm('shippingMethods', event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="commerce-dispatch">Tiempo de despacho</Label><Input id="commerce-dispatch" placeholder="Ej: 1-2 días hábiles" value={formData.dispatchTime} onChange={event => updateForm('dispatchTime', event.target.value)} /></div>
                      </div>
                      <div className="space-y-2"><Label htmlFor="commerce-coverage">Cobertura</Label><Input id="commerce-coverage" placeholder="Ej: Lima Metropolitana y envíos a todo el Perú" value={formData.coverageArea} onChange={event => updateForm('coverageArea', event.target.value)} /></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"><div><p className="text-sm font-semibold">Aceptar pedidos 24/7</p><p className="mt-1 text-xs text-zinc-500">No bloquea el checkout por horario</p></div><input type="checkbox" checked={formData.acceptsOrdersAlways} onChange={event => updateForm('acceptsOrdersAlways', event.target.checked)} className="h-5 w-5 accent-primary" /></label>
                        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"><div><p className="text-sm font-semibold">Recojo en tienda</p><p className="mt-1 text-xs text-zinc-500">Ofrece retiro en un local</p></div><input type="checkbox" checked={formData.pickupEnabled} onChange={event => updateForm('pickupEnabled', event.target.checked)} className="h-5 w-5 accent-primary" /></label>
                      </div>
                    </CardContent>
                  </Card>
                  {formData.pickupEnabled && <Card className="rounded-2xl border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"><CardHeader><CardTitle className="text-lg">Punto de recojo</CardTitle></CardHeader><CardContent className="space-y-2"><Label htmlFor="commerce-address">Dirección</Label><Input id="commerce-address" value={formData.storeAddress} onChange={event => updateForm('storeAddress', event.target.value)} /></CardContent></Card>}
                  {!formData.acceptsOrdersAlways && <Card className="rounded-2xl border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"><CardHeader><CardTitle className="text-lg">Horario para recibir pedidos</CardTitle><CardDescription>Fuera de este horario el checkout se bloqueará.</CardDescription></CardHeader><CardContent><ScheduleEditor value={formData.storeSchedule} onChange={schedule => updateForm('storeSchedule', schedule)} /></CardContent></Card>}
                </>
              )}

              {formData.templateType === 'moda' && (
                <>
                  <Card className="rounded-2xl border-zinc-200 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900">
                    <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800/50"><CardTitle className="text-lg">Envíos y recojo</CardTitle><CardDescription>Comunica una promesa de entrega clara para reducir consultas.</CardDescription></CardHeader>
                    <CardContent className="space-y-5 pt-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2"><Label htmlFor="fashion-shipping">Métodos de envío</Label><Input id="fashion-shipping" placeholder="Ej: Courier Lima y envíos nacionales" value={formData.shippingMethods} onChange={event => updateForm('shippingMethods', event.target.value)} /></div>
                        <div className="space-y-2"><Label htmlFor="fashion-dispatch">Tiempo de despacho</Label><Input id="fashion-dispatch" value={formData.dispatchTime} onChange={event => updateForm('dispatchTime', event.target.value)} /></div>
                      </div>
                      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"><div><p className="text-sm font-semibold">Recojo en showroom o tienda</p><p className="mt-1 text-xs text-zinc-500">Muestra una dirección de retiro</p></div><input type="checkbox" checked={formData.pickupEnabled} onChange={event => updateForm('pickupEnabled', event.target.checked)} className="h-5 w-5 accent-primary" /></label>
                      {formData.pickupEnabled && <div className="space-y-2"><Label htmlFor="fashion-address">Dirección de recojo</Label><Input id="fashion-address" value={formData.storeAddress} onChange={event => updateForm('storeAddress', event.target.value)} /></div>}
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-zinc-200 bg-white shadow-[0_12px_40px_rgb(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-900">
                    <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800/50"><CardTitle className="text-lg">Tallaje, cambios y devoluciones</CardTitle><CardDescription>La información que más reduce fricción antes y después de comprar.</CardDescription></CardHeader>
                    <CardContent className="space-y-5 pt-6">
                      <div className="space-y-2"><Label htmlFor="size-guide">Guía de tallas</Label><textarea id="size-guide" rows={5} placeholder="Ej: S: busto 84-88 cm · cintura 64-68 cm..." value={formData.sizeGuide} onChange={event => updateForm('sizeGuide', event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none transition-all duration-300 focus:border-primary/50 dark:border-zinc-700" /></div>
                      <div className="max-w-xs space-y-2"><Label htmlFor="exchange-days">Días para solicitar un cambio</Label><Input id="exchange-days" type="number" min="0" value={formData.exchangeDays} onChange={event => updateForm('exchangeDays', Number(event.target.value))} /></div>
                      <div className="space-y-2"><Label htmlFor="returns-policy">Política de cambios y devoluciones</Label><textarea id="returns-policy" rows={5} placeholder="Explica condiciones, prendas excluidas y proceso de solicitud." value={formData.returnsPolicy} onChange={event => updateForm('returnsPolicy', event.target.value)} className="w-full rounded-xl border border-zinc-200 bg-transparent p-3 text-sm outline-none transition-all duration-300 focus:border-primary/50 dark:border-zinc-700" /></div>
                    </CardContent>
                  </Card>
                </>
              )}

            </div>
          )}

          {/* 6. MARKETING & REDES */}
          {activeTab === 'marketing' && (
            <div data-tour="settings-panel-marketing" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
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
                  <CardTitle className="text-lg flex items-center gap-2">Señal de Stock</CardTitle>
                  <CardDescription>Disponibilidad limitada basada en inventario real.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Button onClick={() => setShowFomoConfig(true)} variant="outline" className="w-full border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    Configurar señal de stock
                  </Button>
                  <FomoConfigModal isOpen={showFomoConfig} onClose={() => setShowFomoConfig(false)} storeId={systemData.storeId} />
                </CardContent>
              </Card>

            </div>
          )}


          {/* 7. CONTENIDO DE TIENDA */}
          {activeTab === 'contenido' && (
            <div data-tour="settings-panel-contenido" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50">
                  <CardTitle className="text-lg">Sección Promocional</CardTitle>
                  <CardDescription>Destaca ofertas o mensajes clave en tu tienda.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Título promocional</Label>
                    <Input 
                      placeholder="Ej: Envíos gratis este fin de semana" 
                      value={formData.promoTitle} 
                      onChange={(e) => updateForm('promoTitle', e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción promocional</Label>
                    <textarea 
                      className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md p-3 text-sm focus:ring-1 focus:ring-zinc-900 focus:outline-none min-h-[80px]"
                      placeholder="Ej: Aplica para compras mayores a S/150 a nivel nacional." 
                      value={formData.promoDescription} 
                      onChange={(e) => updateForm('promoDescription', e.target.value)} 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Beneficios Exclusivos</CardTitle>
                    <CardDescription>Agrega hasta 4 razones para comprar en tu tienda.</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={formData.benefits.length >= 4}
                    onClick={() => updateForm('benefits', [...formData.benefits, { title: '', description: '' }])}
                    className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800"
                  >
                    <Plus size={16} /> Agregar Beneficio
                  </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {formData.benefits.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      Aún no has agregado beneficios.
                    </div>
                  ) : (
                    formData.benefits.map((benefit, i) => (
                      <div key={i} className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-950/50 space-y-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => {
                            const newBenefits = [...formData.benefits];
                            newBenefits.splice(i, 1);
                            updateForm('benefits', newBenefits);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                        <div className="space-y-2 pr-8">
                          <Label>Título</Label>
                          <Input 
                            value={benefit.title} 
                            placeholder="Ej: Calidad Premium"
                            onChange={(e) => {
                              const newBenefits = [...formData.benefits];
                              newBenefits[i].title = e.target.value;
                              updateForm('benefits', newBenefits);
                            }} 
                          />
                        </div>
                        <div className="space-y-2 pr-8">
                          <Label>Descripción</Label>
                          <Input 
                            value={benefit.description} 
                            placeholder="Ej: Materiales importados de alta durabilidad."
                            onChange={(e) => {
                              const newBenefits = [...formData.benefits];
                              newBenefits[i].description = e.target.value;
                              updateForm('benefits', newBenefits);
                            }} 
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-xl">
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Preguntas Frecuentes (FAQ)</CardTitle>
                    <CardDescription>Resuelve dudas comunes de tus clientes (máximo 6).</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={formData.faqs.length >= 6}
                    onClick={() => updateForm('faqs', [...formData.faqs, { question: '', answer: '' }])}
                    className="flex items-center gap-2 border-zinc-200 dark:border-zinc-800"
                  >
                    <Plus size={16} /> Agregar Pregunta
                  </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {formData.faqs.length === 0 ? (
                    <div className="text-center py-6 text-zinc-500 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                      Aún no has agregado preguntas frecuentes.
                    </div>
                  ) : (
                    formData.faqs.map((faq, i) => (
                      <div key={i} className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-950/50 space-y-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => {
                            const newFaqs = [...formData.faqs];
                            newFaqs.splice(i, 1);
                            updateForm('faqs', newFaqs);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                        <div className="space-y-2 pr-8">
                          <Label>Pregunta</Label>
                          <Input 
                            value={faq.question} 
                            placeholder="Ej: ¿Hacen envíos a provincia?"
                            onChange={(e) => {
                              const newFaqs = [...formData.faqs];
                              newFaqs[i].question = e.target.value;
                              updateForm('faqs', newFaqs);
                            }} 
                          />
                        </div>
                        <div className="space-y-2 pr-8">
                          <Label>Respuesta</Label>
                          <textarea 
                            className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-md p-3 text-sm focus:ring-1 focus:ring-zinc-900 focus:outline-none min-h-[80px]"
                            value={faq.answer} 
                            placeholder="Ej: Sí, enviamos por Olva Courier a todo el Perú."
                            onChange={(e) => {
                              const newFaqs = [...formData.faqs];
                              newFaqs[i].answer = e.target.value;
                              updateForm('faqs', newFaqs);
                            }} 
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

            </div>
          )}

          </>)}
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
