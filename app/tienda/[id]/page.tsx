import React from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, Product } from '@/types/tienda'
import StoreNavbar from '@/components/tienda/StoreNavbar'
import StoreHero from '@/components/tienda/StoreHero'
import ProductGrid from '@/components/tienda/ProductGrid'
import CartFooter from '@/components/tienda/CartFooter'

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const { data: perfil } = await supabase
    .from('profiles')
    .select('store_name, description')
    .eq('id', params.id)
    .single();
    
  return {
    title: perfil?.store_name || 'Tienda',
    description: perfil?.description || 'Encuentra los mejores productos.',
  }
}

export default async function TiendaPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  
  // Fetching de datos de forma paralela en el Servidor para mejor TTI/SEO
  const [perfilRes, productosRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase.from('products').select('*').eq('user_id', params.id).order('created_at', { ascending: false })
  ]);
  
  const perfil = perfilRes.data as Profile | null;
  const productos = (productosRes.data || []) as Product[];

  if (!perfil) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Tienda no encontrada 🛒</div>
  }

  return (
    <div className="min-h-screen bg-white">
      <StoreNavbar perfil={perfil} />
      <StoreHero perfil={perfil} />
      <ProductGrid productos={productos} perfil={perfil} />
      <CartFooter perfil={perfil} />
    </div>
  )
}