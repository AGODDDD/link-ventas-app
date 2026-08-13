import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'

type StoreLayoutProps = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  const { id } = await params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  const { data: store } = await supabase
    .from('stores')
    .select('avatar_url')
    .eq(isUUID ? 'id' : 'slug', id)
    .maybeSingle()

  return {
    icons: {
      icon: store?.avatar_url || '/brand/linkventas-mark.svg',
    },
  }
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  return children
}
