import React from 'react'
import Image from 'next/image'
import { Profile } from '@/types/tienda'
import LeadCaptureForm from '@/components/tienda/LeadCaptureForm'

interface Props {
  perfil: Profile;
}

export default function ComercioTemplate({ perfil }: Props) {
  return (
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
            Mantente atento y elige entre múltiples ofertas especiales para ti.
          </p>

          {/* Countdown Timer Component */}
          {perfil.fomo_enabled !== false && (
            <div className="space-y-4 pt-8">
              <h2 className="font-headline font-bold text-primary tracking-widest text-sm italic uppercase">¡TU TIEMPO ES AHORA!</h2>
              <div className="flex gap-4 md:gap-8 overflow-x-auto pb-4 md:pb-0">
                <div className="bg-surface-container-lowest/50 backdrop-blur-md p-4 min-w-[80px] md:min-w-[100px] border-b-4 border-primary shadow-lg shadow-primary/5">
                  <div className="font-headline font-black text-4xl md:text-6xl text-on-surface">03</div>
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pt-2">DÍAS</div>
                </div>
                <div className="bg-surface-container-lowest/50 backdrop-blur-md p-4 min-w-[80px] md:min-w-[100px] border-b-4 border-primary shadow-lg shadow-primary/5">
                  <div className="font-headline font-black text-4xl md:text-6xl text-on-surface">14</div>
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pt-2">HORAS</div>
                </div>
                <div className="bg-surface-container-lowest/50 backdrop-blur-md p-4 min-w-[80px] md:min-w-[100px] border-b-4 border-primary shadow-lg shadow-primary/5">
                  <div className="font-headline font-black text-4xl md:text-6xl text-on-surface">22</div>
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant pt-2">MINUTOS</div>
                </div>
              </div>
            </div>
          )}
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
              alt="Store Banner" 
              className="absolute inset-0 object-cover opacity-20 group-hover:scale-110 transition-transform duration-700" 
              src={perfil.banner_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuAeeV5R743uZiRLWamjaLfwpXyd-W9fIvWgeuBAEn35jA1NQOWNVgXrcqsQQSc3_ZIvgSnaG_8PpWez-HFz17UztXE8PfsRX4AXL8FtakL0rsh6eXolfH3Sl-C-NmLWgRavPhkV7ZmvDSFbgxPDnBHG5JXQU93HcGvPvnO-rV_32j7CvDSdtowa_ctoCfnUT1_XbRmXCojOJspBdrRExoC92qoZ8Cfr8wP-h-l4sDqtYikSzEv8gRznRPwodhDQtD-qMGjEd0AolESK"} 
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
            <h3 className="font-headline font-bold text-2xl uppercase italic text-primary">EDICIÓN <br/> LIMITADA</h3>
          </div>
        </div>
      </section>
    </main>
  )
}
