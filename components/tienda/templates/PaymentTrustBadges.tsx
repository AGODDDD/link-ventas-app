'use client'

import type React from 'react'

type PaymentTrustBadgesProps = {
  mercadopagoActive?: boolean
  className?: string
  labelClassName?: string
  iconClassName?: string
}

type Badge = {
  label: string
  icon: React.ReactNode
}

const cardBadgeClass = 'flex h-8 min-w-12 items-center justify-center rounded-md border border-black/10 bg-white px-2 shadow-sm'
const manualBadgeClass = 'flex h-8 min-w-12 items-center justify-center rounded-md border border-black/10 bg-white px-2 shadow-sm'

const secureBadges: Badge[] = [
  {
    label: 'Mercado Pago',
    icon: (
      <svg viewBox="0 0 80 32" aria-hidden="true" className="h-6 w-16">
        <rect width="80" height="32" rx="8" fill="#00B1EA" />
        <ellipse cx="40" cy="15" rx="23" ry="10" fill="#fff" opacity="0.95" />
        <path d="M24 15c5-4 9-4 14 0 5 4 9 4 14 0 2-2 4-2 6 0" fill="none" stroke="#007EB5" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26 20c8 5 20 5 28 0" fill="none" stroke="#007EB5" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Visa',
    icon: (
      <svg viewBox="0 0 64 32" aria-hidden="true" className="h-6 w-12">
        <rect width="64" height="32" rx="6" fill="#fff" />
        <text x="32" y="21" textAnchor="middle" fontSize="16" fontWeight="800" fontFamily="Arial, sans-serif" fill="#1A1F71">VISA</text>
      </svg>
    ),
  },
  {
    label: 'Mastercard',
    icon: (
      <svg viewBox="0 0 64 32" aria-hidden="true" className="h-6 w-12">
        <rect width="64" height="32" rx="6" fill="#fff" />
        <circle cx="26" cy="16" r="10" fill="#EB001B" />
        <circle cx="38" cy="16" r="10" fill="#F79E1B" fillOpacity="0.9" />
      </svg>
    ),
  },
  {
    label: 'American Express',
    icon: (
      <svg viewBox="0 0 64 32" aria-hidden="true" className="h-6 w-12">
        <rect x="3" y="4" width="58" height="24" rx="5" fill="#2E77BC" />
        <text x="32" y="15" textAnchor="middle" fontSize="8" fontWeight="800" fontFamily="Arial, sans-serif" fill="#fff">AMERICAN</text>
        <text x="32" y="23" textAnchor="middle" fontSize="8" fontWeight="800" fontFamily="Arial, sans-serif" fill="#fff">EXPRESS</text>
      </svg>
    ),
  },
]

const manualBadges: Badge[] = [
  {
    label: 'Yape',
    icon: (
      <svg viewBox="0 0 64 32" aria-hidden="true" className="h-6 w-12">
        <rect width="64" height="32" rx="8" fill="#642D8F" />
        <text x="32" y="21" textAnchor="middle" fontSize="14" fontWeight="800" fontFamily="Arial, sans-serif" fill="#20E0C4">Yape</text>
      </svg>
    ),
  },
  {
    label: 'Plin',
    icon: (
      <svg viewBox="0 0 64 32" aria-hidden="true" className="h-6 w-12">
        <rect width="64" height="32" rx="8" fill="#F5F7FB" />
        <circle cx="18" cy="16" r="8" fill="#00B2A9" />
        <circle cx="32" cy="16" r="8" fill="#7D3C98" fillOpacity="0.9" />
        <circle cx="46" cy="16" r="8" fill="#FFB000" fillOpacity="0.9" />
        <text x="32" y="20" textAnchor="middle" fontSize="10" fontWeight="900" fontFamily="Arial, sans-serif" fill="#fff">Plin</text>
      </svg>
    ),
  },
  {
    label: 'Efectivo',
    icon: (
      <svg viewBox="0 0 64 32" aria-hidden="true" className="h-6 w-12">
        <rect x="5" y="7" width="54" height="18" rx="4" fill="#DDE8D8" stroke="#9BB88D" strokeWidth="1.5" />
        <circle cx="32" cy="16" r="6" fill="#A8C69C" />
        <path d="M12 12h7M45 20h7" stroke="#6D8E60" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function PaymentTrustBadges({
  mercadopagoActive,
  className = '',
  labelClassName = '',
  iconClassName = '',
}: PaymentTrustBadgesProps) {
  const badges = mercadopagoActive ? secureBadges : manualBadges
  const title = mercadopagoActive ? 'Pago 100% Seguro' : 'Medios de pago manuales'
  const badgeClass = mercadopagoActive ? cardBadgeClass : manualBadgeClass

  return (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] text-current/55 ${labelClassName}`}>{title}</p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {badges.map((badge) => (
          <span
            key={badge.label}
            className={`${badgeClass} grayscale transition-all duration-300 hover:-translate-y-0.5 hover:grayscale-0 ${iconClassName}`}
            aria-label={badge.label}
            title={badge.label}
          >
            {badge.icon}
          </span>
        ))}
      </div>
    </div>
  )
}
