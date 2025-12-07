'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CrearProducto() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)

  const guardarProducto = async (e: any) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Verificar usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No estás logueado')

      let imageUrl = null

      // 2. Subir la imagen (si seleccionó una)
      if (archivo) {
        // Creamos un nombre único para el archivo (ej: 123-cocacola.jpg)
        const fileName = `${Date.now()}-${archivo.name}`
        
        const { data, error: uploadError } = await supabase.storage
          .from('productos')
          .upload(fileName, archivo)

        if (uploadError) throw uploadError

        // Obtenemos la URL pública para guardarla en la BD
        const { data: publicData } = supabase.storage
          .from('productos')
          .getPublicUrl(fileName)
          
        imageUrl = publicData.publicUrl
      }

      // 3. Guardar en Base de Datos
      const { error: dbError } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: nombre,
          price: parseFloat(precio),
          description: descripcion,
          image_url: imageUrl // Aquí va el link real de Supabase
        })

      if (dbError) throw dbError

      alert('¡Producto creado con éxito! 🚀')
      router.push('/dashboard')

    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex justify-center items-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">📦 Nuevo Producto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarProducto} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Producto</Label>
              <Input 
                id="nombre"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Zapatillas Nike"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio">Precio (S/)</Label>
              <Input 
                id="precio"
                type="number" 
                required
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Descripción</Label>
              <Input 
                id="desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalles del producto..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foto">Foto del Producto</Label>
              <Input 
                id="foto"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) setArchivo(e.target.files[0])
                }}
                className="cursor-pointer bg-slate-50"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-1/2 bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Subiendo...' : 'Guardar Producto'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}