'use client'

import React, { useState, useMemo } from 'react'
import { Product, Profile } from '@/types/tienda'
import CatalogFilters from './CatalogFilters'
import AdvancedProductCard from './AdvancedProductCard'

interface Props {
  initialProducts: Product[];
  perfil: Profile | null;
}

export default function ClientCatalog({ initialProducts, perfil }: Props) {
  // State for filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [shippingTodayOnly, setShippingTodayOnly] = useState(false)
  const [sortOption, setSortOption] = useState('relevance')

  // Extract unique brands for the filter dropdown
  const brands = useMemo(() => {
    const unique = new Set(initialProducts.map(p => p.brand).filter(Boolean) as string[])
    return Array.from(unique).sort()
  }, [initialProducts])

  // "Diccionario" in-memory core -> Instant filtering and sorting
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...initialProducts]

    // 1. Text Search (Name, Brand, Description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      )
    }

    // 2. Brand Filter
    if (selectedBrand) {
      result = result.filter(p => p.brand === selectedBrand)
    }

    // 3. Shipping Today Filter
    if (shippingTodayOnly) {
      result = result.filter(p => p.shipping_today)
    }

    // 4. Sorting
    switch (sortOption) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'newest':
        result.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        })
        break
      case 'relevance':
      default:
        // Original order
        break
    }

    return result

  }, [initialProducts, searchQuery, selectedBrand, shippingTodayOnly, sortOption])

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter italic text-on-background">CATÁLOGO DE PRODUCTOS</h1>
        <p className="text-on-surface-variant font-body mt-2">Mostrando <span className="font-bold text-primary">{filteredAndSortedProducts.length}</span> resultados ultra-rápidos ⚡</p>
      </div>

      <CatalogFilters 
        brands={brands}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        shippingTodayOnly={shippingTodayOnly}
        setShippingTodayOnly={setShippingTodayOnly}
        sortOption={sortOption}
        setSortOption={setSortOption}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {filteredAndSortedProducts.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-outline bg-surface-variant">
          <p className="font-headline font-bold text-xl uppercase tracking-widest text-on-surface-variant">NO HAY COINCIDENCIAS</p>
          <p className="font-body text-sm mt-2 text-on-surface-variant/70">Intenta cambiar los filtros o tu término de búsqueda. El motor funciona en 0ms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredAndSortedProducts.map((prod) => (
            <AdvancedProductCard key={prod.id} prod={prod} perfil={perfil} />
          ))}
        </div>
      )}
    </div>
  )
}
