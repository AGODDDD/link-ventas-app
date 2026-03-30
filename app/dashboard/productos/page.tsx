'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Trash2, Edit3, Image as ImageIcon, PlusCircle, Search } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'

export default function ProductosPage() {
    const router = useRouter()
    const { productos, productosCargados, cargarProductos, eliminarProductoLocal } = useDashboardStore()
    const [loading, setLoading] = useState(!productosCargados)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }
            // Esto tomará 0ms si ya estaban en caché (productosCargados)
            await cargarProductos(user.id)
            setLoading(false)
        }
        init()
    }, [cargarProductos, router])

    const borrarProducto = async (id: string, imageUrl: string) => {
        const confirmar = confirm('¿Borrar producto de la Bodega para siempre? ESTA ACCIÓN NO SE PUEDE DESHACER.')
        if (!confirmar) return

        try {
            if (imageUrl) {
                const nombreArchivo = imageUrl.split('/').pop()
                if (nombreArchivo) {
                    await supabase.storage.from('productos').remove([nombreArchivo])
                }
            }

            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)

            if (error) throw error
            eliminarProductoLocal(id)

        } catch (error: any) {
            alert('Error al borrar: ' + error.message)
        }
    }

    const productosFiltrados = productos.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

    if (loading) return <div className="p-8 text-center text-on-surface-variant font-bold animate-pulse">Cargando Bodega Maestra... 📦</div>

    return (
        <div className="space-y-6 pb-12 relative w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Bodega General 🏢</h1>
                    <p className="text-on-surface-variant">Lista de inventario global. Activa estos productos en el Catálogo desde <b>Ajustes</b>.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-surface-container-high px-3 py-2 rounded-lg border border-outline-variant/20 flex-1 md:w-64">
                        <Search className="text-on-surface-variant w-4 h-4" />
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-sm focus:ring-0 placeholder:text-on-surface-variant/50 w-full text-on-surface outline-none" 
                            placeholder="Buscar en bodega..." 
                            type="text"
                        />
                    </div>
                    <button 
                        onClick={() => router.push('/dashboard/crear')}
                        className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-bold shadow-[0_10px_20px_rgba(192,193,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                    >
                        <PlusCircle size={18} /> Nuevo SKU
                    </button>
                </div>
            </div>

            {/* VISTA DE TABLA COMPACTA (LISTA) */}
            <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/5 shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-surface-container-high border-b border-outline-variant/10">
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest w-16">Foto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Nombre del Producto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Precio Base</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-center">Estado (Vitrina)</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5">
                            {productosFiltrados.length > 0 ? (
                                productosFiltrados.map((prod) => (
                                    <tr key={prod.id} className="hover:bg-surface-container-high/50 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="w-10 h-10 rounded bg-surface-bright flex items-center justify-center overflow-hidden border border-outline-variant/10">
                                                {prod.image_url ? (
                                                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon size={16} className="text-on-surface-variant/50" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <p className="font-bold text-sm text-on-surface line-clamp-1">{prod.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {prod.brand && <span className="text-[9px] uppercase tracking-widest text-on-surface-variant bg-surface-bright px-1.5 py-0.5 rounded">{prod.brand}</span>}
                                                <span className="text-[10px] text-on-surface-variant/70">Ref: #{prod.id.split('-')[0].toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-sm font-bold text-primary">
                                            S/ {parseFloat(prod.price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {prod.is_active !== false ? (
                                                <span className="px-3 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-full text-[10px] font-bold uppercase tracking-widest">En Catálogo</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-surface-bright text-on-surface-variant border border-outline-variant/20 rounded-full text-[10px] font-bold uppercase tracking-widest">Solo Bodega</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    onClick={() => router.push(`/dashboard/editar/${prod.id}`)}
                                                    title="Editar Datos Base"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button 
                                                    className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                                                    onClick={() => borrarProducto(prod.id, prod.image_url)}
                                                    title="Destruir de la Bodega"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-on-surface-variant text-sm border-2 border-dashed border-outline-variant/10 rounded-b-2xl">
                                        Bodega vacía. Añade nuevos SKUs para empezar tu inventario.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}