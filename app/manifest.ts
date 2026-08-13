import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LinkVentas',
    short_name: 'LinkVentas',
    description: 'Catálogo, pedidos, pagos y operación para negocios que venden en Perú.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FCFCFC',
    theme_color: '#102A4C',
    lang: 'es-PE',
    icons: [
      {
        src: '/brand/linkventas-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
