import { useFomo } from '@/hooks/useFomo'
import { Flame } from 'lucide-react'

interface FomoBannerProps {
  minViewers: number
  maxViewers: number
  messageTemplate: string
}

export default function FomoBanner({ minViewers, maxViewers, messageTemplate }: FomoBannerProps) {
  const { viewers: currentViewers } = useFomo({
      min: minViewers,
      max: maxViewers,
      enabled: true
  })

  if (currentViewers === null) return null

  // Reemplazar {count} por el número fuerte
  const parts = messageTemplate.split('{count}')
  
  return (
    <div className="w-full bg-error/10 border-t border-b border-error/20 py-2 px-3 mt-4 mb-2 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Flame className="w-4 h-4 text-error animate-pulse shrink-0" />
      <p className="text-[11px] md:text-xs text-error font-bold leading-tight uppercase tracking-wide">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <span className="text-sm md:text-base font-black mx-1 animate-pulse">
                {currentViewers}
              </span>
            )}
          </span>
        ))}
      </p>
    </div>
  )
}
