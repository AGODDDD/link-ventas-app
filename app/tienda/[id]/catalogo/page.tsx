import React from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, Product } from '@/types/tienda'
import ProductGrid from '@/components/tienda/ProductGrid'
import StoreNavbarKinetic from '@/components/tienda/StoreNavbarKinetic'
import StoreFooterKinetic from '@/components/tienda/StoreFooterKinetic'

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const { data: perfil } = await supabase
    .from('profiles')
    .select('store_name, description')
    .eq('id', params.id)
    .single();
    
  return {
    title: perfil?.store_name ? `CATÁLOGO - ${perfil.store_name}` : 'CATÁLOGO',
    description: perfil?.description || 'Encuentra las mejores ofertas y productos.',
  }
}

export default async function CatalogoPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  
  // Fetching
  const [perfilRes, productosRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase.from('products').select('*').eq('user_id', params.id).order('created_at', { ascending: false })
  ]);
  
  const perfil = perfilRes.data as Profile | null;
  const productos = (productosRes.data || []) as Product[];

  if (!perfil) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Tienda no encontrada 🛒</div>
  }

  const storeName = perfil.store_name || "TU TIENDA";

  return (
    <div className="font-body selection:bg-primary-container selection:text-on-primary-container bg-background text-on-background min-h-screen flex flex-col pt-24">
      {/* TopAppBar */}
      <StoreNavbarKinetic storeName={storeName} storeId={params.id} />

      {/* Main Content Canvas */}
      <main className="relative flex-grow overflow-hidden">
        <ProductGrid productos={productos} perfil={perfil} />
      </main>

      <StoreFooterKinetic storeName={storeName} />

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/?text=Hola%20asesor,%20necesito%20ayuda%20para%20concretar%20mi%20compra"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.122 1.54 5.862L.117 23.5l5.776-1.503C7.57 22.95 9.71 23.473 12 23.473c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.492c-1.803 0-3.518-.47-5.06-1.336l-.36-.211-3.411.89.91-3.32-.236-.376C2.868 15.688 2.213 13.9 2.213 12c0-5.398 4.39-9.78 9.787-9.78 5.397 0 9.787 4.382 9.787 9.78 0 5.397-4.39 9.78-9.787 9.78z"/>
        </svg>
      </a>
    </div>
  )
}
