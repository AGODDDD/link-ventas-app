'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Trash2, Edit3, Image as ImageIcon, PlusCircle, Search } from 'lucide-react'

export default function ProductosPage() {
    const router = useRouter()
    const [productos, setProductos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        cargarProductos()
    }, [])

    const cargarProductos = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/')
            return
        }

        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (data) setProductos(data)
        setLoading(false)
    }

    const borrarProducto = async (id: string, imageUrl: string) => {
        const confirmar = confirm('¿Borrar producto para siempre? ESTA ACCIÓN NO SE PUEDE DESHACER.')
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
            setProductos(productos.filter(p => p.id !== id))

        } catch (error: any) {
            alert('Error al borrar: ' + error.message)
        }
    }

    const toggleVisibilidad = async (id: string, currentStatus: boolean) => {
        const nuevoEstado = !currentStatus;
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: nuevoEstado })
                .eq('id', id)
            
            if (error) throw error
            
            setProductos(productos.map(p => p.id === id ? { ...p, is_active: nuevoEstado } : p))
        } catch (error: any) {
             alert('Error al actualizar visibilidad: ' + error.message)
        }
    }

    const [userId, setUserId] = useState('')
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || ''))
    }, [])

    const productosFiltrados = productos.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

    if (loading) return <div className="p-8 text-center text-on-surface-variant font-bold animate-pulse">Sincronizando inventario... 📦</div>

    return (
        <div className="space-y-6 pb-12 relative w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-on-surface mb-2">Inventario Pro 🏷️</h1>
                    <p className="text-on-surface-variant">Control maestro de precios, stock y visibilidad del catálogo.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-surface-container-high px-3 py-2 rounded-lg border border-outline-variant/20 flex-1 md:w-64">
                        <Search className="text-on-surface-variant w-4 h-4" />
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-sm focus:ring-0 placeholder:text-on-surface-variant/50 w-full text-on-surface outline-none" 
                            placeholder="Buscar producto..." 
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {productosFiltrados.map((prod) => (
                    <div key={prod.id} className="bg-surface-container-high rounded-2xl border border-outline-variant/10 overflow-hidden group shadow-2xl transition-all hover:border-primary/30 flex flex-col justify-between">
                        
                        {/* IMAGEN Y BADGE */}
                        <div className="aspect-video bg-surface-background relative overflow-hidden flex items-center justify-center">
                            {prod.image_url ? (
                                <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <ImageIcon size={48} className="text-on-surface-variant/30" />
                            )}
                            
                            {/* PRECIO TAG */}
                            <div className="absolute top-3 left-3 bg-surface/80 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold text-on-surface shadow-xl border border-white/5 flex items-center gap-2">
                                <span className="text-primary tracking-widest text-[10px] uppercase">PEN</span> S/{prod.price}
                            </div>
                            
                            {/* ESTADO VISUAL (BADGE DE ALERTA) */}
                            {prod.is_active === false && (
                                <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
                                    <span className="px-4 py-1.5 bg-error-container/80 text-on-error-container border border-error/50 font-bold uppercase tracking-widest text-[10px] rounded-full">
                                        Oculto del público
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {/* INFO BODY */}
                        <div className="p-5 flex-1 flex flex-col relative z-20 bg-surface-container-high">
                            <h3 className="text-lg font-bold text-on-surface leading-tight mb-2 line-clamp-1">{prod.name}</h3>
                            <div className="flex items-center gap-2 mb-4">
                                {prod.brand && <span className="text-[10px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/10 px-2 py-0.5 rounded">{prod.brand}</span>}
                                {prod.is_free_shipping && <span className="text-[10px] uppercase tracking-widest text-secondary border border-secondary/20 bg-secondary/10 px-2 py-0.5 rounded">Envío Gratis</span>}
                            </div>
                            <p className="text-sm text-on-surface-variant line-clamp-2">
                                {prod.description || 'Sin descripción detallada.'}
                            </p>
                        </div>

                        {/* HOVER ACTIONS BAR */}
                        <div className="p-4 border-t border-outline-variant/10 bg-surface-container-low flex justify-between items-center relative z-20">
                            
                            {/* BOTÓN VISIBLE/OCULTO (El Toggle) */}
                            <label className="flex items-center cursor-pointer group/toggle gap-3">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only" 
                                        checked={prod.is_active !== false} 
                                        onChange={() => toggleVisibilidad(prod.id, prod.is_active !== false)}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${prod.is_active !== false ? 'bg-secondary' : 'bg-surface-container-highest border border-outline-variant'}`}></div>
                                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${prod.is_active !== false ? 'translate-x-4 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'translate-x-0'}`}></div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${prod.is_active !== false ? 'text-secondary' : 'text-on-surface-variant'}`}>
                                    {prod.is_active !== false ? 'Activo' : 'Oculto'}
                                </span>
                            </label>

                            <div className="flex gap-2">
                                <button 
                                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                    onClick={() => router.push(`/dashboard/editar/${prod.id}`)}
                                >
                                    <Edit3 size={18} />
                                </button>
                                <button 
                                    className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                                    onClick={() => borrarProducto(prod.id, prod.image_url)}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {productosFiltrados.length === 0 && (
                    <div className="col-span-full text-center py-20 border-2 border-dashed border-outline-variant/20 rounded-2xl bg-surface-container-low">
                        <p className="text-on-surface-variant text-xl font-bold mb-4">No se encontraron productos.</p>
                        <button onClick={() => router.push('/dashboard/crear')} className="bg-primary text-on-primary px-6 py-3 rounded-lg text-sm font-bold mx-auto shadow-lg hover:brightness-110 flex items-center gap-2">
                           <PlusCircle size={20} /> Crear el primero
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}