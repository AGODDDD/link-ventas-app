import React from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, Product } from '@/types/tienda'

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const { data: perfil } = await supabase
    .from('profiles')
    .select('store_name, description')
    .eq('id', params.id)
    .single();
    
  return {
    title: perfil?.store_name ? `OFERTAS BLACK - ${perfil.store_name}` : 'OFERTAS BLACK',
    description: perfil?.description || 'Encuentra las mejores ofertas.',
  }
}

export default async function TiendaPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  
  // Fetching
  const [perfilRes, productosRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase.from('products').select('*').eq('user_id', params.id).order('created_at', { ascending: false })
  ]);
  
  const perfil = perfilRes.data as Profile | null;
  // const productos = (productosRes.data || []) as Product[];

  if (!perfil) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Tienda no encontrada 🛒</div>
  }

  const storeName = perfil.store_name || "TU TIENDA";

  return (
    <div className="font-body selection:bg-primary-container selection:text-on-primary-container bg-background text-on-background min-h-screen">
      {/* TopAppBar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md shadow-[0_60px_60px_rgba(255,59,48,0.06)]">
        <div className="flex justify-between items-center px-8 py-4 max-w-full">
          <div className="text-2xl font-black italic text-primary tracking-widest font-headline uppercase truncate max-w-[200px] md:max-w-none">
            {storeName}
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <a className="font-headline font-bold uppercase tracking-tighter text-primary border-b-2 border-primary pb-1 transition-transform duration-200 hover:scale-105 active:scale-95" href="#">INICIO</a>
            <a className="font-headline font-bold uppercase tracking-tighter text-on-background hover:text-primary transition-colors transition-transform duration-200 hover:scale-105 active:scale-95" href="#">OFERTAS</a>
            <a className="font-headline font-bold uppercase tracking-tighter text-on-background hover:text-primary transition-colors transition-transform duration-200 hover:scale-105 active:scale-95" href="#">LIMITADAS</a>
            <a className="font-headline font-bold uppercase tracking-tighter text-on-background hover:text-primary transition-colors transition-transform duration-200 hover:scale-105 active:scale-95" href="#">CONTACTO</a>
          </div>
          <button className="bg-primary-container text-on-primary-container px-6 py-2 font-headline font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform duration-200 active:scale-95">
            ¡COMPRAR AHORA!
          </button>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="relative min-h-screen pt-24 overflow-hidden">
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
              <h3 className="font-headline font-bold text-primary tracking-widest text-sm italic uppercase">TU TIEMPO ES AHORA!</h3>
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
          <div className="lg:col-span-5 relative">
            <div className="absolute -top-32 -left-20 w-80 h-80 hidden xl:block z-0 opacity-40 mix-blend-screen pointer-events-none">
              <img alt="Woman with shopping bags" className="object-cover w-full h-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgb0wIlzJugZ2QY_sqyzpFLws68eAsSQuoq2f9I4WclgcIdO1Njtsi7sbj0pQcyiAeb6V0GQscd6kGQm4hLihtRYI9mZffVDfU0QTq4kM9JHwQArRhWGxDFRKUxbArL-ij7Kj1hL5u0YdotSDF9mzOWi6PjQjll-2-bRb5VP2zTtDYvVnJtR4NElkH44rpPlCMCCvdODpXlRqM-EO_jxlxLDsiiBFuKnT5RrfJwR6zkE0q-IMHj2W_PMHHfwPZ-AkB1Tr271DVXBHO"/>
            </div>
            <div className="relative z-20 bg-surface-container-high p-8 md:p-12 shadow-[40px_40px_0px_0px_rgba(255,59,48,0.1)] border border-white/5">
              <h2 className="font-headline font-bold text-3xl mb-8 tracking-tighter uppercase italic">SUSCRÍBETE Y ANTICÍPATE</h2>
              <form className="space-y-6" action="#">
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-widest text-primary-fixed-dim">Nombre</label>
                  <input className="w-full bg-surface-container-highest border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 text-on-surface placeholder:text-on-surface-variant/30 py-3 px-0 font-body transition-all" placeholder="Tu nombre completo" type="text" />
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-widest text-primary-fixed-dim">Teléfono</label>
                  <input className="w-full bg-surface-container-highest border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 text-on-surface placeholder:text-on-surface-variant/30 py-3 px-0 font-body transition-all" placeholder="+34 000 000 000" type="tel" />
                </div>
                <div className="space-y-1">
                  <label className="font-label text-[10px] uppercase tracking-widest text-primary-fixed-dim">Email</label>
                  <input className="w-full bg-surface-container-highest border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 text-on-surface placeholder:text-on-surface-variant/30 py-3 px-0 font-body transition-all" placeholder="hola@tuemail.com" type="email" />
                </div>

                <div className="space-y-4 pt-4">
                  <p className="font-label text-[10px] uppercase tracking-widest text-primary-fixed-dim">ELIGE TU OFERTA ESPECIAL</p>
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input className="peer h-5 w-5 appearance-none border-2 border-primary rounded-none checked:bg-primary transition-all" name="offer" type="radio" />
                      <span className="material-symbols-outlined absolute text-on-primary text-xs opacity-0 peer-checked:opacity-100">done</span>
                    </div>
                    <span className="font-body text-sm uppercase tracking-tight group-hover:text-primary transition-colors">50% de descuento</span>
                  </label>
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input className="peer h-5 w-5 appearance-none border-2 border-primary rounded-none checked:bg-primary transition-all" name="offer" type="radio" />
                      <span className="material-symbols-outlined absolute text-on-primary text-xs opacity-0 peer-checked:opacity-100">done</span>
                    </div>
                    <span className="font-body text-sm uppercase tracking-tight group-hover:text-primary transition-colors">Compra uno, llévate uno gratis</span>
                  </label>
                </div>

                <button className="w-full bg-primary-container text-on-primary-container py-5 font-headline font-black text-xl tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,59,48,0.3)]" type="button">
                  SUSCRIBIRSE
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Promotional Bento Grid Section */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 bg-surface-container-low p-8 h-80 flex flex-col justify-end group overflow-hidden relative">
              <img alt="Luxury items" className="absolute inset-0 object-cover opacity-20 group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAeeV5R743uZiRLWamjaLfwpXyd-W9fIvWgeuBAEn35jA1NQOWNVgXrcqsQQSc3_ZIvgSnaG_8PpWez-HFz17UztXE8PfsRX4AXL8FtakL0rsh6eXolfH3Sl-C-NmLWgRavPhkV7ZmvDSFbgxPDnBHG5JXQU93HcGvPvnO-rV_32j7CvDSdtowa_ctoCfnUT1_XbRmXCojOJspBdrRExoC92qoZ8Cfr8wP-h-l4sDqtYikSzEv8gRznRPwodhDQtD-qMGjEd0AolESK" />
              <h3 className="font-headline font-bold text-4xl relative z-10 italic uppercase">ACCESORIOS <br/> <span className="text-primary">PREMIUM</span></h3>
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
      <footer className="w-full py-12 border-t border-white/5 bg-background">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 gap-6">
          <div className="text-lg font-bold text-on-background font-headline tracking-widest uppercase">{storeName}</div>
          <div className="flex gap-8">
            <a className="font-label text-[10px] uppercase tracking-widest text-on-background/60 hover:text-primary transition-colors" href="#">Privacidad</a>
            <a className="font-label text-[10px] uppercase tracking-widest text-on-background/60 hover:text-primary transition-colors" href="#">Términos</a>
            <a className="font-label text-[10px] uppercase tracking-widest text-on-background/60 hover:text-primary transition-colors" href="#">Soporte</a>
          </div>
          <div className="font-label text-[10px] uppercase tracking-widest text-primary">
            © 2024 {storeName}. TODOS LOS DERECHOS RESERVADOS.
          </div>
        </div>
      </footer>
    </div>
  )
}