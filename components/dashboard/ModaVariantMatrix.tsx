'use client'

interface ModaVariantMatrixProps {
  sizes: string[]
  colors: string[]
  stocks: Record<string, string>
  onStockChange: (key: string, value: string) => void
}

export function getModaVariantKey(size: string, color: string) {
  return `${size}|${color}`.toLowerCase()
}

export default function ModaVariantMatrix({ sizes, colors, stocks, onStockChange }: ModaVariantMatrixProps) {
  if (sizes.length === 0 || colors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline-variant/40 bg-surface-container p-5 text-sm text-on-surface-variant">
        Agrega al menos una talla y un color para configurar el stock por variante.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/20">
      <div className="bg-surface-container px-4 py-3">
        <h4 className="text-sm font-bold text-on-surface">Stock por talla y color</h4>
        <p className="mt-1 text-xs text-on-surface-variant">Déjalo vacío si una combinación no tiene límite de stock.</p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {sizes.flatMap((size) =>
          colors.map((color) => {
            const key = getModaVariantKey(size, color)
            const inputId = `variant-stock-${key.replace(/[^a-z0-9]+/g, '-')}`
            return (
              <label key={key} htmlFor={inputId} className="rounded-lg border border-outline-variant/20 bg-surface-container-high p-3">
                <span className="block text-xs font-bold text-on-surface">{size} / {color}</span>
                <span className="mt-1 block text-[10px] uppercase tracking-widest text-on-surface-variant">Unidades</span>
                <input
                  id={inputId}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={stocks[key] ?? ''}
                  onChange={(event) => onStockChange(key, event.target.value)}
                  placeholder="Sin límite"
                  className="mt-2 w-full rounded-lg border border-outline-variant/30 bg-surface-container-highest p-2 font-mono text-on-surface"
                />
              </label>
            )
          }),
        )}
      </div>
    </div>
  )
}
