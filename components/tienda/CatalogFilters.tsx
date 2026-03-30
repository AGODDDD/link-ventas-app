'use client'

import React from 'react'
import { Filter, ArrowUpDown } from 'lucide-react'

interface Props {
  brands: string[];
  categories: string[];
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  shippingTodayOnly: boolean;
  setShippingTodayOnly: (val: boolean) => void;
  sortOption: string;
  setSortOption: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export default function CatalogFilters({
  brands,
  categories,
  selectedBrand,
  setSelectedBrand,
  selectedCategory,
  setSelectedCategory,
  shippingTodayOnly,
  setShippingTodayOnly,
  sortOption,
  setSortOption,
  searchQuery,
  setSearchQuery
}: Props) {
  return (
    <div className="flex flex-col gap-4 border-b border-outline pb-6 mb-8 pt-4">
      {/* Search Bar Row */}
      <div className="flex-grow w-full">
        <input 
          type="text" 
          placeholder="BUSCAR UN PRODUCTO..." 
          className="w-full bg-surface-variant text-on-background border border-outline px-4 py-4 font-body focus:border-primary focus:ring-0 outline-none placeholder:text-on-surface-variant/50 font-bold tracking-widest uppercase text-xs shadow-inner"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 bg-surface-variant border border-outline px-4 py-2 hover:bg-surface-container-high transition-colors font-headline text-[10px] uppercase tracking-widest text-on-background font-bold shadow-sm">
            <Filter size={14} className="text-primary"/> TODOS LOS FILTROS
          </button>
          
          <select 
            className="bg-surface-variant border border-outline px-4 py-2 font-headline text-[10px] uppercase tracking-widest text-on-background appearance-none focus:border-primary outline-none font-bold shadow-sm"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="">MARCAS (Todas)</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select 
            className="bg-surface-variant border border-outline px-4 py-2 font-headline text-[10px] uppercase tracking-widest text-on-background appearance-none focus:border-primary outline-none font-bold shadow-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">CATEGORÍAS (Todas)</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="flex items-center gap-3 font-headline text-[10px] uppercase tracking-widest text-on-background bg-surface-variant border border-outline px-4 py-1.5 cursor-pointer font-bold shadow-sm shadow-primary/10">
            Envío Hoy
            <input 
              type="checkbox" 
              checked={shippingTodayOnly} 
              onChange={(e) => setShippingTodayOnly(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
          </label>
        </div>

        <div className="flex items-center gap-0">
          <select 
            className="bg-surface-variant border border-outline px-4 py-2 font-headline text-[10px] uppercase tracking-widest text-on-background appearance-none focus:border-primary outline-none font-bold"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="relevance">RELEVANCIA</option>
            <option value="price_asc">MENOR PRECIO</option>
            <option value="price_desc">MAYOR PRECIO</option>
            <option value="newest">MÁS RECIENTES</option>
          </select>
          <div className="bg-primary border border-primary p-2 text-on-primary">
            <ArrowUpDown size={14} />
          </div>
        </div>
      </div>
    </div>
  )
}
