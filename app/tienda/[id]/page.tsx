import React from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/types/tienda'
import StoreNavbarKinetic from '@/components/tienda/StoreNavbarKinetic'
import StoreFooterKinetic from '@/components/tienda/StoreFooterKinetic'
import LeadCaptureForm from '@/components/tienda/LeadCaptureForm'

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
  
  const { data: perfil } = await supabase
    .from('profiles')
    .select('store_name, description')
    .eq(isUUID ? 'id' : 'slug', params.id)
    .single();
    
  return {
    title: perfil?.store_name ? `OFERTAS BLACK - ${perfil.store_name}` : 'OFERTAS BLACK',
    description: perfil?.description || 'Encuentra las mejores ofertas.',
  }
}

export default async function TiendaPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);

  // Fetching
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, store_name, description, whatsapp_phone')
    .eq(isUUID ? 'id' : 'slug', params.id)
    .single();


  if (!perfil) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Tienda no encontrada 🛒</div>
  }

  const storeName = perfil.store_name || "TU TIENDA";

  return (
    <div className="font-body selection:bg-primary-container selection:text-on-primary-container bg-background text-on-background min-h-screen">
      {/* TopAppBar */}
      <StoreNavbarKinetic storeName={storeName} storeId={perfil.id} />

      {/* Main Content Canvas */}
      <main id="inicio" className="relative min-h-screen pt-24 overflow-hidden scroll-mt-24">
        {/* Hero Section Asymmetric Layout */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-12">
          {/* Left Column: Branding & Urgency */}
          <div className="lg:col-span-7 z-10 space-y-8">
            <div className="space-y-2">
              <span className="inline-block bg-primary-container text-on-primary-container px-4 py-1 font-label text-xs font-bold tracking-[0.3em] uppercase">MOMENTO EXCLUSIVO</span>
              <h1 className="font-headline font-black text-6xl md:text-8xl lg:text-[7rem] leading-[0.9] tracking-tighter uppercase kinetic-text">
                BLACK FRIDAY <br/> <span className="text-primary">está llegando</span>
              </h1>
            </div>
            <p className="font-body text-xl md:text-2xl text-on-surface-variant max-w-xl border-l-4 border-primary pl-6">
              Mantente atento y elige entre 3 ofertas especiales para ti.
            </p>

            {/* Countdown Timer Component */}
            <div className="space-y-4 pt-8">
              <h2 className="font-headline font-bold text-primary tracking-widest text-sm italic uppercase">¡TU TIEMPO ES AHORA!</h2>
              <div className="flex gap-4 md:gap-8 overflow-x-auto pb-4 md:pb-0">
                <div className="bg-surface-container-lowest/50 backdrop-blur-md p-4 min-w-[80px] md:min-w-[100px] border-b-4 border-primary">
                  <div className="font-headline font-black text-4xl md:text-6xl text-on-surface">03</div>
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pt-2">DÍAS</div>
                </div>
                <div className="bg-surface-container-lowest/50 backdrop-blur-md p-4 min-w-[80px] md:min-w-[100px] border-b-4 border-primary">
                  <div className="font-headline font-black text-4xl md:text-6xl text-on-surface">14</div>
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pt-2">HORAS</div>
                </div>
                <div className="bg-surface-container-lowest/50 backdrop-blur-md p-4 min-w-[80px] md:min-w-[100px] border-b-4 border-primary">
                  <div className="font-headline font-black text-4xl md:text-6xl text-on-surface">22</div>
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pt-2">MINUTOS</div>
                </div>
                <div className="bg-surface-container-lowest/50 backdrop-blur-md p-4 min-w-[80px] md:min-w-[100px] border-b-4 border-primary">
                  <div className="font-headline font-black text-4xl md:text-6xl text-on-surface">45</div>
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pt-2">SEGUNDOS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Lead Gen Form with Overlap */}
          <div className="lg:col-span-5 relative mt-8 lg:mt-0">
            <LeadCaptureForm storeId={perfil.id} />
          </div>
        </div>

        {/* Promotional Bento Grid Section */}
        <section id="ofertas" className="max-w-7xl mx-auto px-6 py-24 scroll-mt-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 bg-surface-container-low p-8 h-80 flex flex-col justify-end group overflow-hidden relative">
              <Image 
                alt="Luxury items" 
                className="absolute inset-0 object-cover opacity-20 group-hover:scale-110 transition-transform duration-700" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeeV5R743uZiRLWamjaLfwpXyd-W9fIvWgeuBAEn35jA1NQOWNVgXrcqsQQSc3_ZIvgSnaG_8PpWez-HFz17UztXE8PfsRX4AXL8FtakL0rsh6eXolfH3Sl-C-NmLWgRavPhkV7ZmvDSFbgxPDnBHG5JXQU93HcGvPvnO-rV_32j7CvDSdtowa_ctoCfnUT1_XbRmXCojOJspBdrRExoC92qoZ8Cfr8wP-h-l4sDqtYikSzEv8gRznRPwodhDQtD-qMGjEd0AolESK" 
                fill
                priority
              />
              <h2 className="font-headline font-bold text-4xl relative z-10 italic uppercase">ACCESORIOS <br/> <span className="text-primary">PREMIUM</span></h2>
            </div>
            
            <div className="bg-primary-container p-8 h-80 flex flex-col justify-between">
              <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <h3 className="font-headline font-bold text-2xl text-on-primary-container uppercase">ENVÍO <br/> PRIORITARIO</h3>
            </div>
            
            <div className="bg-surface-container-high p-8 h-80 flex flex-col justify-between border-t-4 border-primary">
              <div className="font-label text-xs tracking-widest opacity-50 uppercase">STOCK LIMITADO</div>
              <h3 className="font-headline font-bold text-2xl uppercase italic text-primary">SOLO 500 <br/> UNIDADES</h3>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <StoreFooterKinetic storeName={storeName} />

      {/* Floating WhatsApp Button */}
      {perfil.whatsapp_phone && (
        <a
          href={`https://wa.me/${perfil.whatsapp_phone}?text=Hola%20${encodeURIComponent(storeName)},%20necesito%20ayuda%20con%20mi%20pedido`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.122 1.54 5.862L.117 23.5l5.776-1.503C7.57 22.95 9.71 23.473 12 23.473c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.492c-1.803 0-3.518-.47-5.06-1.336l-.36-.211-3.411.89.91-3.32-.236-.376C2.868 15.688 2.213 13.9 2.213 12c0-5.398 4.39-9.78 9.787-9.78 5.397 0 9.787 4.382 9.787 9.78 0 5.397-4.39 9.78-9.787 9.78z"/>
          </svg>
        </a>
      )}
    </div>
  )
}