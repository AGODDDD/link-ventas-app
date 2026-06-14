'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Trash2, Edit3, Image as ImageIcon, PlusCircle, Search, FileSpreadsheet } from 'lucide-react'
import { useDashboardStore } from '@/store/useDashboardStore'
import ImportProductsModal from '@/components/dashboard/ImportProductsModal'


const ProductosSkeleton = () => (
    <div className="space-y-6 pb-12 relative w-full">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <div className="space-y-3 w-full">
                <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                <div className="h-4 w-96 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
            </div>
            <div className="flex gap-3">
                <div className="h-10 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
                <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
                <div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
            </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800/50">
                            <th className="px-6 py-4"><div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div></th>
                            <th className="px-6 py-4"><div className="h-3 w-40 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div></th>
                            <th className="px-6 py-4"><div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div></th>
                            <th className="px-6 py-4"><div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mx-auto"></div></th>
                            <th className="px-6 py-4"><div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mx-auto"></div></th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i}>
                                <td className="px-6 py-3">
                                    <div className="w-10 h-10 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2"></div>
                                    <div className="h-3 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div>
                                </td>
                                <td className="px-6 py-3"><div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"></div></td>
                                <td className="px-6 py-3"><div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse mx-auto"></div></td>
                                <td className="px-6 py-3"><div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mx-auto"></div></td>
                                <td className="px-6 py-3">
                                    <div className="flex justify-end gap-2">
                                        <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
                                        <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse"></div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
)

export default function ProductosPage() {
    const router = useRouter()
    const { productos, productosLastFetch, cargarProductos, eliminarProductoLocal } = useDashboardStore()
    const [isInitialLoad, setIsInitialLoad] = useState(productosLastFetch === 0)
    const [searchTerm, setSearchTerm] = useState('')
    const [isImportOpen, setIsImportOpen] = useState(false)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }
            await cargarProductos(user.id)
            setIsInitialLoad(false)
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

    if (isInitialLoad) return <ProductosSkeleton />

    return (
        <div className="space-y-6 pb-12 relative w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">Bodega General</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Lista de inventario global. Activa estos productos en el Catálogo desde <b>Ajustes</b>.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 flex-1 md:w-64">
                        <Search className="text-zinc-500 dark:text-zinc-400 w-4 h-4" />
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-sm focus:ring-0 placeholder:text-zinc-500 dark:text-zinc-400/50 w-full text-zinc-900 dark:text-zinc-100 outline-none" 
                            placeholder="Buscar en bodega..." 
                            type="text"
                        />
                    </div>
                    <button 
                        onClick={() => setIsImportOpen(true)}
                        className="flex bg-white dark:bg-zinc-900 hover:bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-4 py-2 rounded-lg text-sm font-bold border border-zinc-200 dark:border-zinc-800/50 transition-all items-center gap-2"
                    >
                        <FileSpreadsheet size={18} /> Importar
                    </button>
                    <button 
                        onClick={() => router.push('/dashboard/crear')}
                        className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-bold shadow-[0_10px_20px_rgba(192,193,255,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
                    >
                        <PlusCircle size={18} /> Nuevo SKU
                    </button>
                </div>
            </div>

            <ImportProductsModal 
                isOpen={isImportOpen} 
                onClose={() => setIsImportOpen(false)}
                onSuccess={async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) await cargarProductos(user.id, true)
                }}
            />

            {/* VISTA DE TABLA COMPACTA (LISTA) */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl animate-fade-in-up delay-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800/50">
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest w-16">Foto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Nombre del Producto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Precio Base</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-center">Estado (Vitrina)</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-center">Existencia</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5">
                            {productosFiltrados.length > 0 ? (
                                productosFiltrados.map((prod) => (
                                    <tr key={prod.id} className="hover:bg-zinc-50 dark:bg-zinc-900/50 transition-colors group">
                                        <td className="px-6 py-3">
                                            <div className="w-10 h-10 rounded bg-white dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-800/50">
                                                {prod.image_url ? (
                                                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ImageIcon size={16} className="text-zinc-500 dark:text-zinc-400/50" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">{prod.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {prod.brand && <span className="text-[9px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded">{prod.brand}</span>}
                                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400/70">Ref: #{prod.id.split('-')[0].toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-sm font-bold text-primary">
                                            S/ {parseFloat(prod.price).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {prod.is_active !== false ? (
                                                <span className="px-3 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-full text-[10px] font-bold uppercase tracking-widest">En Catálogo</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-full text-[10px] font-bold uppercase tracking-widest">Solo Bodega</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {prod.stock === null || prod.stock === undefined ? (
                                                <span className="text-xl font-bold font-mono text-zinc-500 dark:text-zinc-400/50">∞</span>
                                            ) : prod.stock <= 0 ? (
                                                <span className="px-3 py-1 bg-error/10 text-error border border-error/20 rounded text-[10px] font-black uppercase tracking-widest">Agotado (0)</span>
                                            ) : prod.stock <= 5 ? (
                                                <span className="px-3 py-1 bg-[#d78a33]/10 text-[#d78a33] border border-[#d78a33]/20 rounded text-[10px] font-black uppercase tracking-widest">Quedan {prod.stock}</span>
                                            ) : (
                                                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{prod.stock} Und.</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    onClick={() => router.push(`/dashboard/editar/${prod.id}`)}
                                                    title="Editar Datos Base"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button 
                                                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-error hover:bg-error/10 rounded-lg transition-colors"
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
                                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-500 dark:text-zinc-400 text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-800/50 rounded-b-2xl">
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