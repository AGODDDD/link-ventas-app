'use client'

import { useState, useEffect, useMemo } from 'react'

interface UseFomoOptions {
  min: number
  max: number
  enabled: boolean
}

export function useFomo({ min, max, enabled }: UseFomoOptions) {
  const [viewers, setViewers] = useState<number>(() => {
      // Valor inicial (estimación segura)
      return Math.floor(Math.random() * (max - min + 1)) + min
  })

  useEffect(() => {
    if (!enabled) return

    // Simular que la gente entra y sale (fluctuación) cada 12 segundos
    const interval = setInterval(() => {
      setViewers((prev) => {
        // Fluctuar aleatoriamente entre -2 y +3 personas
        const fluctuation = Math.floor(Math.random() * 6) - 2 
        let next = prev + fluctuation
        
        // Asegurar que no se salga de los límites
        if (next < min) next = min
        if (next > max) next = max
        return next
      })
    }, 12000)

    return () => clearInterval(interval)
  }, [min, max, enabled])

  return { viewers: enabled ? viewers : 0 }
}
