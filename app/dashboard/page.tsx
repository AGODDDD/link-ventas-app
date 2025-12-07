'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([]) // Aquí guardamos tus productos
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getData = async () => {
      // 1. Verificar Usuario
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser(session.user)

      // 2. Cargar Productos de este usuario
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', session.user.id) // Solo MIS productos
        .order('created_at', { ascending: false })

      if (productsData) setProducts(productsData)
      
      setLoading(false)
    }

    getData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-black">
        <p className="text-xl font-bold animate-pulse">Cargando tu imperio... ⏳</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 text-gray-800">
      {/* Barra Superior */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-blue-600">Link Ventas 🚀</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 flex gap-2 items-center">
                      <span>🔗 Tu tienda:</span>
                      <a href={`/tienda/${user?.id}`} target="_blank" className="font-bold underline hover:text-blue-600">
                          ver mi tienda pública
                      </a>
                  </div>
        </div>
        <div className="flex gap-4">
          <Link href="/dashboard/crear">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-transform hover:scale-105">
              + Nuevo Producto
            </button>
          </Link>
          <button 
            onClick={handleLogout}
            className="bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-400 text-sm font-medium uppercase">Ventas de Hoy</h3>
          <p className="text-3xl font-bold text-gray-900">S/ 0.00</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-400 text-sm font-medium uppercase">Mis Productos</h3>
          {/* Aquí mostramos la cantidad real */}
          <p className="text-3xl font-bold text-blue-600">{products.length}</p>
        </div>
      </div>

      {/* Lista de Productos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold">Inventario</h2>
        </div>
        
        {products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tienes productos aún. ¡Crea el primero!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Precio</th>
                  <th className="p-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium">{product.name}</td>
                    <td className="p-4 text-green-600 font-bold">S/ {product.price}</td>
                    <td className="p-4">
                      <span className="bg-green-100 text-green-700 py-1 px-3 rounded-full text-xs font-bold">
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}