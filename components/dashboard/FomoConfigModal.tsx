'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Save, Flame, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

interface FomoConfigModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
}

export default function FomoConfigModal({ isOpen, onClose, userId }: FomoConfigModalProps) {
    const [loading, setLoading] = useState(false)
    const [enabled, setEnabled] = useState(true)
    const [minViewers, setMinViewers] = useState(3)
    const [maxViewers, setMaxViewers] = useState(24)
    const [message, setMessage] = useState('{count} personas están evaluando esta oferta ahora mismo')

    useEffect(() => {
        if (!isOpen || !userId) return

        const fetchFomoData = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('fomo_enabled, fomo_min_viewers, fomo_max_viewers, fomo_message')
                .eq('id', userId)
                .single()

            if (data) {
                // If it's the first time and values are null, use defaults
                setEnabled(data.fomo_enabled ?? true)
                setMinViewers(data.fomo_min_viewers ?? 3)
                setMaxViewers(data.fomo_max_viewers ?? 24)
                setMessage(data.fomo_message || '{count} personas están evaluando esta oferta ahora mismo')
            }
        }
        
        fetchFomoData()
    }, [isOpen, userId])

    const handleSave = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    fomo_enabled: enabled,
                    fomo_min_viewers: minViewers,
                    fomo_max_viewers: maxViewers,
                    fomo_message: message
                })
                .eq('id', userId)

            if (error) {
                // If column does not exist error
                if (error.code === '42703') {
                    toast.error('¡Falta actualizar la Base de Datos!', {
                        description: 'Abre el SQL Editor en Supabase y ejecuta los comandos ALTER TABLE para FOMO.'
                    })
                } else {
                    throw error
                }
            } else {
                toast.success('Motor FOMO actualizado 🔥', {
                    description: 'La urgencia social ahora está reflejada en tu escaparate.'
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
                        <Flame className="text-primary w-6 h-6 animate-pulse" />
                        <h2 className="text-xl font-bold font-headline uppercase tracking-widest text-on-surface">MOTOR FOMO</h2>
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
                            <p className="font-bold text-on-surface text-sm uppercase tracking-widest">Activar Urgencia Visual</p>
                            <p className="text-xs text-on-surface-variant mt-1">Refleja notificaciones the demanda The The as.</p>
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

                    <div className={`space-y-6 transition-opacity ${!enabled && 'opacity-50 pointer-events-none'}`}>
                        {/* Numbers */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Visitas Mínimas</Label>
                                <Input 
                                    type="number" 
                                    min="1"
                                    value={minViewers}
                                    onChange={(e) => setMinViewers(parseInt(e.target.value))}
                                    className="bg-surface-container font-mono text-center font-bold text-lg border-outline-variant/20 focus:border-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Visitas Máximas</Label>
                                <Input 
                                    type="number" 
                                    min={minViewers + 1}
                                    value={maxViewers}
                                    onChange={(e) => setMaxViewers(parseInt(e.target.value))}
                                    className="bg-surface-container font-mono text-center font-bold text-lg border-outline-variant/20 focus:border-primary"
                                />
                            </div>
                        </div>

                        {/* Copywriting */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Mensaje Persuasivo</Label>
                            <textarea 
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full h-24 bg-surface-container border border-outline-variant/20 rounded-lg p-3 text-sm focus:outline-none focus:border-primary resize-none placeholder:text-on-surface-variant/50 text-on-surface font-body"
                                placeholder="{count} personas quieren comprar esto..."
                            />
                            <p className="text-[10px] text-primary italic">Usa {'{count}'} the para inyectar el número the the The aleatorio The The de the as as.</p>
                        </div>

                        {/* Live Preview */}
                        <div className="mt-4 p-3 border border-primary/30 bg-primary/5 rounded-lg flex items-center gap-3">
                            <RefreshCcw className="w-4 h-4 text-primary animate-spin-slow" />
                            <p className="text-xs text-on-surface font-medium" dangerouslySetInnerHTML={{ 
                                __html: message.replace('{count}', `<strong>${Math.floor(Math.random() * (maxViewers - minViewers + 1) + minViewers)}</strong>`) 
                            }}></p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-outline-variant/10 bg-surface-container-highest">
                    <Button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="w-full bg-primary text-on-primary hover:bg-primary/80 h-12 uppercase tracking-widest font-black"
                    >
                        {loading ? 'CALIBRANDO MOTOR...' : 'ENCENDER FUEGO'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
