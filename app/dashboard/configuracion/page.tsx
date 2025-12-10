'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Upload } from 'lucide-react'

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  
  // Datos del formulario
  const [storeName, setStoreName] = useState('')
  const [description, setDescription] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
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
      }
    }
    cargarPerfil()
  }, [])

  // 2. Función para subir Logo
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Subir a Supabase Storage (bucket 'avatars')
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Configurar Tienda 🏪</h1>
      <p className="text-slate-500">Personaliza cómo ven tus clientes tu negocio.</p>

      <Card>
        <CardHeader>
          <CardTitle>Identidad Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* LOGO UPLOAD */}
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl">🏪</span>
              )}
            </div>
            <div>
              <Label htmlFor="logo" className="cursor-pointer">
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
                onChange={handleImageUpload}
                disabled={uploading}
              />
              <p className="text-xs text-slate-400 mt-2">Recomendado: 400x400px (Cuadrado)</p>
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

          <Button onClick={guardarCambios} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Cambios
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}