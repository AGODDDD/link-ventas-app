'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Search, Loader2, Store, Edit3, CheckCircle, PackageOpen, Lock, Zap, X } from 'lucide-react'

export default function CatalogBuilder({ userId }: { userId: string }) {
    const [productos, setProductos] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [planStatus, setPlanStatus] = useState<string | null>(null)
    const [showPaywallModal, setShowPaywallModal] = useState(false)

    // Editor en sitio
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!userId) return
        cargarInventario()
        // Leer plan del merchant
        supabase.from('profiles').select('plan').eq('id', userId).single()
            .then(({ data }) => { if (data) setPlanStatus(data.plan ?? null) })
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
        const activosActuales = productos.filter(p => p.is_active !== false).length

        // Si está intentando ACTIVAR (pasar a true) y está en plan free con 10+ activos
        if (nuevo === true && planStatus === 'free' && activosActuales >= 10) {
            setShowPaywallModal(true)
            return
        }

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
    const LIMIT_FREE = 10

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
                        {planStatus === 'free' && (
                            <p className="text-[10px] text-on-surface-variant mt-0.5">{activos}/{LIMIT_FREE} ítems</p>
                        )}
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

                {/* MODAL PAYWALL — LÍMITE 10 PRODUCTOS (plan free) */}
                {showPaywallModal && (
                    <div
                        style={{
                            position: 'fixed', inset: 0, zIndex: 60,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            padding: '24px',
                        }}
                        onClick={() => setShowPaywallModal(false)}
                    >
                        <div
                            style={{
                                maxWidth: '380px', width: '100%',
                                background: 'rgba(19,19,26,0.98)',
                                border: '1px solid rgba(139,92,246,0.35)',
                                borderRadius: '24px',
                                padding: '36px 28px',
                                textAlign: 'center',
                                boxShadow: '0 40px 80px rgba(0,0,0,0.8)',
                                animation: 'bounceIn 0.3s ease',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowPaywallModal(false)}
                                style={{
                                    position: 'absolute', top: '16px', right: '16px',
                                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                                    cursor: 'pointer', padding: '4px',
                                }}
                            >
                                <X size={18} />
                            </button>

                            <div style={{
                                width: '60px', height: '60px',
                                background: 'rgba(124,58,237,0.15)',
                                border: '1px solid rgba(139,92,246,0.4)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px',
                            }}>
                                <Lock size={26} style={{ color: '#a78bfa' }} />
                            </div>

                            <p style={{ fontSize: '19px', fontWeight: 700, color: '#ffffff', marginBottom: '10px' }}>
                                Límite de 10 productos alcanzado
                            </p>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.7', marginBottom: '24px' }}>
                                En el Plan Emprendedor puedes tener hasta <strong style={{ color: '#fff' }}>10 productos activos</strong> en vitrina.
                                Actualiza a Pro para agregar <strong style={{ color: '#a78bfa' }}>productos ilimitados</strong>.
                            </p>

                            <div style={{ display: 'grid', gap: '8px', marginBottom: '24px', textAlign: 'left' }}>
                                {[
                                    'Productos ilimitados en vitrina',
                                    'Pasarela de pago Culqi (tarjetas)',
                                    'Tickets térmicos PDF 80mm',
                                    'Analíticas avanzadas en tiempo real',
                                ].map((f, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
                                        <span style={{ color: '#a78bfa', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                                    </div>
                                ))}
                            </div>

                            <a
                                href={`https://wa.me/51999999999?text=${encodeURIComponent('Hola, quiero activar el Plan Pro de LinkVentas para tener productos ilimitados.')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    width: '100%', padding: '14px',
                                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                    borderRadius: '12px',
                                    fontSize: '14px', fontWeight: 700, color: '#fff',
                                    textDecoration: 'none',
                                    boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
                                }}
                                onClick={() => setShowPaywallModal(false)}
                            >
                                <Zap size={15} />
                                Activar Plan Pro — S/ 29/mes
                            </a>
                            <button
                                onClick={() => setShowPaywallModal(false)}
                                style={{ marginTop: '12px', background: 'none', border: 'none', fontSize: '12px', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                            >
                                Continuar con Plan Emprendedor
                            </button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
