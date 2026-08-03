'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { X, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'

interface FomoConfigModalProps {
    isOpen: boolean
    onClose: () => void
    storeId: string
}

export default function FomoConfigModal({ isOpen, onClose, storeId }: FomoConfigModalProps) {
    const [loading, setLoading] = useState(false)
    const [enabled, setEnabled] = useState(true)

    useEffect(() => {
        if (!isOpen || !storeId) return

        const fetchFomoData = async () => {
            const { data } = await supabase
                .from('store_config')
                .select('fomo_enabled')
                .eq('store_id', storeId)
                .single()

            if (data) {
                setEnabled(data.fomo_enabled ?? true)
            }
        }
        
        fetchFomoData()
    }, [isOpen, storeId])

    const handleSave = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('store_config')
                .update({
                    fomo_enabled: enabled,
                })
                .eq('store_id', storeId)

            if (error) {
                // If column does not exist error
                if (error.code === '42703') {
                    toast.error('¡Falta actualizar la Base de Datos!', {
                        description: 'La configuración de disponibilidad no está actualizada en la base de datos.'
                    })
                } else {
                    throw error
                }
            } else {
                toast.success('Señal de stock actualizada', {
                    description: 'La tienda mostrará solo disponibilidad basada en inventario real.'
                })
                onClose()
            }
        } catch (error: any) {
            toast.error('Error guardando', { description: error.message })
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-surface border-2 border-primary/20 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(255,59,48,0.15)] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-surface-container-highest p-6 flex justify-between items-center border-b border-outline-variant/10">
                    <div className="flex items-center gap-3">
                        <PackageCheck className="text-primary w-6 h-6" />
                        <h2 className="text-xl font-bold font-headline uppercase tracking-widest text-on-surface">SEÑAL DE STOCK</h2>
                    </div>
                    <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Master Switch */}
                    <div className="flex items-center justify-between bg-surface-container p-4 rounded-xl border border-outline-variant/10">
                        <div>
                            <p className="font-bold text-on-surface text-sm uppercase tracking-widest">Mostrar disponibilidad limitada</p>
                            <p className="text-xs text-on-surface-variant mt-1">Solo se muestra cuando el inventario real tiene entre 1 y 10 unidades.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-surface-bright peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className={`p-4 border border-primary/30 bg-primary/5 rounded-lg flex items-start gap-3 ${!enabled && 'opacity-50'}`}>
                        <PackageCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-on-surface font-medium">La cantidad se toma del stock del producto. No se muestran visitas, contadores ni mensajes simulados.</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-outline-variant/10 bg-surface-container-highest">
                    <Button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="w-full bg-primary text-on-primary hover:bg-primary/80 h-12 uppercase tracking-widest font-black"
                    >
                        {loading ? 'GUARDANDO...' : 'GUARDAR'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
