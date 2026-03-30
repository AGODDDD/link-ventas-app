'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Search, Loader2, Store, Edit3, CheckCircle, PackageOpen } from 'lucide-react'

export default function CatalogBuilder({ userId }: { userId: string }) {
    const [productos, setProductos] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Editor en sitio
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!userId) return
        cargarInventario()
    }, [userId])

    const cargarInventario = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        if (data) setProductos(data)
        setLoading(false)
    }

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const nuevo = !currentStatus
        try {
             await supabase.from('products').update({ is_active: nuevo }).eq('id', id)
             setProductos(productos.map(p => p.id === id ? { ...p, is_active: nuevo } : p))
             if (editingProduct && editingProduct.id === id) {
                 setEditingProduct({ ...editingProduct, is_active: nuevo })
             }
        } catch(e) { console.error(e) }
    }

    const saveFastEdit = async () => {
        if (!editingProduct) return
        setSaving(true)
        try {
            await supabase
              .from('products')
              .update({ price: editingProduct.price, is_free_shipping: editingProduct.is_free_shipping })
              .eq('id', editingProduct.id)
            
            setProductos(productos.map(p => p.id === editingProduct.id ? editingProduct : p))
            setEditingProduct(null)
        } catch (e) {
            console.error(e)
        } finally {
            setSaving(false)
        }
    }

    const filtered = productos.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Contadores
    const activos = productos.filter(p => p.is_active !== false).length

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-surface-container to-surface shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <CardHeader className="border-b border-outline-variant/10 pb-6 bg-surface-container-low rounded-t-xl">
                <div className="flex justify-between items-center">
                   <div>
                        <CardTitle className="text-xl flex items-center gap-2 text-on-surface">
                            <Store className="text-primary" /> Constructor de Vitrina
                        </CardTitle>
                        <CardDescription className="text-on-surface-variant mt-1">Busca en tu Bodega y decide qué vender hoy.</CardDescription>
                   </div>
                   <div className="text-center px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                        <p className="text-xs font-bold text-primary tracking-widest uppercase">En Vitrina</p>
                        <p className="text-2xl font-black text-on-surface">{activos}</p>
                   </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 text-on-surface">
                <div className="flex gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-on-surface-variant w-5 h-5" />
                        <input 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar en bodega global..." 
                            className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 flex justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>
                ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {filtered.length === 0 ? (
                           <div className="text-center py-10 text-on-surface-variant flex flex-col items-center">
                                <PackageOpen size={40} className="mb-3 opacity-50" />
                                <p>No hay SKUs en bodega.</p>
                           </div>
                        ) : (
                            filtered.map(prod => (
                                <div key={prod.id} className="flex items-center justify-between p-3 bg-surface-container-high border border-outline-variant/10 rounded-xl hover:border-primary/30 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded bg-surface-bright overflow-hidden">
                                           {prod.image_url ? <img src={prod.image_url} className="w-full h-full object-cover" /> : null}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm tracking-tight">{prod.name}</p>
                                            <p className="font-mono text-primary text-xs font-bold mt-0.5">S/ {parseFloat(prod.price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setEditingProduct(prod)}
                                            className="p-2 text-on-surface-variant hover:text-primary transition-colors bg-surface-bright rounded-lg border border-outline-variant/10"
                                            title="Ajuste Rápido (Precio)"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => toggleStatus(prod.id, prod.is_active !== false)}
                                            className={`px-4 py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all border ${
                                                prod.is_active !== false 
                                                ? 'bg-secondary/20 text-secondary border-secondary/50 shadow-[0_0_15px_rgba(6,183,127,0.2)]'
                                                : 'bg-surface-bright text-on-surface-variant border-outline-variant/30 hover:bg-primary hover:text-on-primary hover:border-transparent'
                                            }`}
                                        >
                                            {prod.is_active !== false ? '✅ En Tienda' : 'Subir a Vitrina'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* MODAL HOLOGRAMA - EDICIÓN RÁPIDA (FAST EDIT) */}
                {editingProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-surface-container-low border border-primary/20 rounded-2xl p-6 w-full max-w-sm shadow-[0_40px_80px_rgba(0,0,0,0.8)]">
                           <h3 className="text-lg font-bold text-primary mb-4 truncate">{editingProduct.name}</h3>
                           
                           <div className="space-y-4">
                               <div>
                                   <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant block mb-1">Precio Específico Oferta</label>
                                   <input 
                                      type="number"
                                      value={editingProduct.price}
                                      onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                                      className="w-full bg-surface-container-high border-b-2 border-primary outline-none px-3 py-2 font-mono font-bold text-xl text-on-surface"
                                   />
                               </div>
                               <label className="flex items-center gap-3 p-3 bg-surface-container-high rounded-xl cursor-pointer">
                                  <input 
                                     type="checkbox" 
                                     className="w-4 h-4 accent-secondary" 
                                     checked={!!editingProduct.is_free_shipping} 
                                     onChange={(e) => setEditingProduct({...editingProduct, is_free_shipping: e.target.checked})}
                                  />
                                  <span className="font-bold text-sm">Promoción: Envío Gratis</span>
                               </label>
                           </div>

                           <div className="flex gap-3 mt-8">
                               <button 
                                 onClick={() => setEditingProduct(null)}
                                 className="flex-1 py-2 rounded-lg font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm"
                               >
                                 Cancelar
                               </button>
                               <button 
                                 onClick={saveFastEdit}
                                 disabled={saving}
                                 className="flex-1 py-2 bg-primary text-on-primary rounded-lg font-bold shadow-[0_5px_15px_rgba(192,193,255,0.2)] hover:brightness-110 flex items-center justify-center text-sm"
                               >
                                 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                               </button>
                           </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
