import { PackageCheck } from 'lucide-react'

interface FomoBannerProps {
  stock: number | null | undefined
}

export default function FomoBanner({ stock }: FomoBannerProps) {
  if (stock === null || stock === undefined || stock < 1 || stock > 10) return null

  return (
    <div className="w-full bg-error/10 border-t border-b border-error/20 py-2 px-3 mt-4 mb-2 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PackageCheck className="w-4 h-4 text-error shrink-0" />
      <p className="text-[11px] md:text-xs text-error font-bold leading-tight uppercase tracking-wide">
        Disponibilidad limitada: quedan <span className="text-sm md:text-base font-black mx-1">{stock}</span> unidades
      </p>
    </div>
  )
}
