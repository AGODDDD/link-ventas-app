import { cn } from '@/lib/utils'

type LogoTone = 'brand' | 'light' | 'current'

type LinkVentasMarkProps = {
  className?: string
  title?: string
  tone?: LogoTone
}

const toneClass: Record<LogoTone, { primary: string; accent: string }> = {
  brand: { primary: '#102A4C', accent: '#2F7EDA' },
  light: { primary: '#FFFFFF', accent: '#FFFFFF' },
  current: { primary: 'currentColor', accent: 'currentColor' },
}

/**
 * Símbolo LinkVentas: dos eslabones en ascenso.
 * Las líneas redondeadas preservan la lectura incluso en favicon y tamaños de 16 px.
 */
export function LinkVentasMark({ className, title, tone = 'brand' }: LinkVentasMarkProps) {
  const colors = toneClass[tone]

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn('shrink-0', className)}
      fill="none"
      role={title ? 'img' : undefined}
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      <path
        d="m45 20-21 21a14 14 0 0 0 0 20l11 11a14 14 0 0 0 20 0l9-9"
        stroke={colors.primary}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="11"
      />
      <path
        d="m51 76 21-21a14 14 0 0 0 0-20L61 24a14 14 0 0 0-20 0l-9 9"
        stroke={colors.accent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="11"
      />
      <path d="m62 18 19 1-1 19-7-7-14 14-7-7 14-14-7-6Z" fill={colors.accent} />
    </svg>
  )
}

type LinkVentasLogoProps = LinkVentasMarkProps & {
  compact?: boolean
  wordmarkClassName?: string
}

export function LinkVentasLogo({
  className,
  compact = false,
  title = 'LinkVentas',
  tone = 'brand',
  wordmarkClassName,
}: LinkVentasLogoProps) {
  const isLight = tone === 'light'

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LinkVentasMark className="size-8" title={title} tone={tone} />
      {!compact && (
        <span
          className={cn(
            'font-headline text-[1.125rem] font-semibold tracking-[-0.065em]',
            isLight ? 'text-white' : 'text-[#102A4C]',
            wordmarkClassName,
          )}
        >
          Link<span className={isLight ? 'text-white' : 'text-[#2F7EDA]'}>Ventas</span>
        </span>
      )}
    </span>
  )
}
