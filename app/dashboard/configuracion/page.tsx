'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Save, Upload, QrCode } from 'lucide-react'

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')

  // Datos del formulario
  const [storeName, setStoreName] = useState('')
  const [description, setDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
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
        setDescription(data.description || '')
        setAvatarUrl(data.avatar_url || '')
        setYapeUrl(data.yape_image_url || '')
        setPlinUrl(data.plin_image_url || '')
      }
    }
    cargarPerfil()
  }, [])

  // 2. Función genérica para subir Imágenes (Avatar o QRs)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, bucket: string, setter: (url: string) => void) => {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]

      // Validación de tipo de archivo (Solo imágenes)
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, etc).')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Obtener URL pública
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
    try {
      setLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          store_name: storeName,
          description: description,
          avatar_url: avatarUrl,
          yape_image_url: yapeUrl,
          plin_image_url: plinUrl,
          updated_at: new Date(),
        })
        .eq('id', userId)

      if (error) throw error
      alert('✅ ¡Datos actualizados!')

    } catch (error: any) {
      alert('Error guardando: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configurar Tienda 🏪</h1>
        <p className="text-slate-500">Personaliza tu perfil y métodos de pago.</p>
      </div>

      <div className="grid gap-6">
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
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'avatars', setAvatarUrl)}
                  disabled={uploading}
                />
                <p className="text-xs text-slate-400">Recomendado: 400x400px (Cuadrado)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nombre de la Tienda</Label>
              <Input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ej: Bodega Mark"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción Corta (Bio)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Las bebidas más frías de Pucusana 🌊"
              />
            </div>

          </CardContent>
        </Card>

        {/* MÉTODOS DE PAGO (QRs) */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago (QRs)</CardTitle>
            <CardDescription>Sube tus códigos QR de Yape y Plin para que los clientes te paguen.</CardDescription>
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
                  ) : (
                    <span className="text-slate-300 text-sm">Sin QR</span>
                  )}
                  {uploading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Loader2 className="animate-spin text-purple-600" /></div>}
                </div>

                <Label htmlFor="yape-upload" className="block cursor-pointer">
                  <div className="w-full border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center justify-center gap-2 py-2 rounded-md transition-colors text-sm font-medium">
                    <Upload size={14} /> Subir Yape QR
                  </div>
                </Label>
                <Input
                  id="yape-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'avatars', setYapeUrl)} // Usamos 'avatars' o un bucket específico si existe
                  disabled={uploading}
                />
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
                  ) : (
                    <span className="text-slate-300 text-sm">Sin QR</span>
                  )}
                  {uploading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-600" /></div>}
                </div>

                <Label htmlFor="plin-upload" className="block cursor-pointer">
                  <div className="w-full border border-cyan-200 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 flex items-center justify-center gap-2 py-2 rounded-md transition-colors text-sm font-medium">
                    <Upload size={14} /> Subir Plin QR
                  </div>
                </Label>
                <Input
                  id="plin-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'avatars', setPlinUrl)}
                  disabled={uploading}
                />
              </div>

            </div>
          </CardContent>
        </Card>

        <Button onClick={guardarCambios} disabled={loading} size="lg" className="w-full text-lg">
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Guardar Configuración Completa
        </Button>
      </div>
    </div>
  )
}