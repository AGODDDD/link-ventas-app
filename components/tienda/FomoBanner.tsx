import { PackageCheck } from 'lucide-react'

interface FomoBannerProps {
  stock: number | null | undefined
}

export default function FomoBanner({ stock }: FomoBannerProps) {
  if (stock === null || stock === undefined || stock < 1 || stock > 10) return null

  return (
    <div className="w-full rounded-2xl bg-[#f5eee8] border border-[#e9d8cc] py-3 px-4 mt-5 mb-3 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-[0_8px_24px_rgba(91,67,52,0.06)]">
      <PackageCheck className="w-4 h-4 text-[#9b5740] shrink-0" />
      <p className="text-[11px] md:text-xs text-[#6f4030] font-semibold leading-tight tracking-wide">
        Edición limitada · quedan <span className="text-sm md:text-base font-bold mx-1">{stock}</span> unidades disponibles
      </p>
    </div>
  )
}
