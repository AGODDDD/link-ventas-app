'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'

export default function LeadCaptureForm({ storeId }: { storeId: string }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [preferencia, setPreferencia] = useState('50% de descuento')
  const [honeypot, setHoneypot] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Si el honeypot tiene contenido, es un bot
    if (honeypot) {
      console.warn("Fuego amigo detectado 🤖")
      setLoading(false)
      toast.success("¡Gracias por suscribirte!") // Fake success
      return
    }

    setLoading(true)
    
    try {
      const { error } = await supabase
        .from('store_leads')
        .insert({
          store_id: storeId,
          name: nombre,
          email: email,
          phone: telefono,
          preference: preferencia
        })

      if (error) throw error

      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold flex items-center gap-2 uppercase tracking-widest text-xs"><CheckCircle2 size={16}/> SUSCRIPCIÓN EXITOSA</p>
          <p className="font-semibold text-sm">Pronto recibirás nuestras mejores ofertas.</p>
        </div>,
        {
          duration: 4000
        }
      )

      // Limpiar formulario
      setNombre('')
      setTelefono('')
      setEmail('')

    } catch (error: any) {
      toast.error('Ocurrió un error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-20 bg-surface-container-high p-8 md:p-12 shadow-[40px_40px_0px_0px_rgba(255,59,48,0.1)] border border-white/5">
      <h2 className="font-headline font-bold text-3xl mb-8 tracking-tighter uppercase italic text-on-background">SUSCRÍBETE Y ANTICÍPATE</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Honeypot field (Bot Protection) */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <input 
            type="text" 
            name="last_name_extra" 
            tabIndex={-1} 
            autoComplete="off" 
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="lead-name" className="font-label text-[10px] uppercase tracking-widest text-primary">Nombre</label>
          <input 
            id="lead-name"
            required 
            value={nombre} 
            onChange={e => setNombre(e.target.value)}
            className="w-full bg-surface-container-highest border-none border-b-2 border-outline focus:border-primary focus:ring-0 text-on-background placeholder:text-on-surface-variant/30 py-3 px-0 font-body transition-all" 
            placeholder="Tu nombre completo" 
            type="text" 
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="lead-phone" className="font-label text-[10px] uppercase tracking-widest text-primary">Teléfono</label>
          <input 
            id="lead-phone"
            required
            value={telefono} 
            onChange={e => setTelefono(e.target.value)}
            className="w-full bg-surface-container-highest border-none border-b-2 border-outline focus:border-primary focus:ring-0 text-on-background placeholder:text-on-surface-variant/30 py-3 px-0 font-body transition-all" 
            placeholder="+51 999 000 000" 
            type="tel" 
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="lead-email" className="font-label text-[10px] uppercase tracking-widest text-primary">Email</label>
          <input 
            id="lead-email"
            required
            value={email} 
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-surface-container-highest border-none border-b-2 border-outline focus:border-primary focus:ring-0 text-on-background placeholder:text-on-surface-variant/30 py-3 px-0 font-body transition-all" 
            placeholder="hola@tuemail.com" 
            type="email" 
          />
        </div>

        <div className="space-y-4 pt-4">
          <p className="font-label text-[10px] uppercase tracking-widest text-primary">ELIGE TU OFERTA ESPECIAL</p>
          <label className="flex items-center gap-4 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input 
                checked={preferencia === '50% de descuento'} 
                onChange={() => setPreferencia('50% de descuento')} 
                className="peer h-5 w-5 appearance-none border-2 border-primary rounded-none checked:bg-primary transition-all cursor-pointer" 
                name="offer" 
                type="radio" 
              />
              <span className="material-symbols-outlined absolute text-on-primary text-xs opacity-0 peer-checked:opacity-100 pointer-events-none">done</span>
            </div>
            <span className="font-body text-sm uppercase tracking-tight group-hover:text-primary transition-colors text-on-background">50% de descuento VIP</span>
          </label>
          <label className="flex items-center gap-4 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input 
                checked={preferencia === '2x1 Exclusivo'} 
                onChange={() => setPreferencia('2x1 Exclusivo')} 
                className="peer h-5 w-5 appearance-none border-2 border-primary rounded-none checked:bg-primary transition-all cursor-pointer" 
                name="offer" 
                type="radio" 
              />
              <span className="material-symbols-outlined absolute text-on-primary text-xs opacity-0 peer-checked:opacity-100 pointer-events-none">done</span>
            </div>
            <span className="font-body text-sm uppercase tracking-tight group-hover:text-primary transition-colors text-on-background">Lanzamientos Privados (2x1)</span>
          </label>
        </div>

        <button 
          disabled={loading}
          className="w-full bg-primary text-on-primary pb-5 pt-6 font-headline font-black text-xl tracking-widest hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,59,48,0.3)] disabled:opacity-50 disabled:scale-100" 
          type="submit"
        >
          {loading ? 'PROCESANDO...' : 'SUSCRIBIRSE AL CLUB'}
        </button>
      </form>
    </div>
  )
}
