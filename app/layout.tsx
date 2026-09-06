import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: 'LinkVentas | Opera tu negocio con claridad',
    template: '%s | LinkVentas',
  },
  description: 'Catálogo, pedidos, pagos y operación para negocios que venden en Perú.',
  applicationName: 'LinkVentas',
  category: 'business',
  icons: { icon: '/brand/linkventas-mark.svg', apple: '/brand/linkventas-mark.svg' },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: 'LinkVentas',
    title: 'LinkVentas | Opera tu negocio con claridad',
    description: 'Catálogo, pedidos, pagos y operación para negocios que venden en Perú.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LinkVentas | Opera tu negocio con claridad',
    description: 'Catálogo, pedidos, pagos y operación para negocios que venden en Perú.',
  },
};
  
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className="antialiased">
        <Toaster richColors position="top-center" duration={4000} visibleToasts={3} closeButton toastOptions={{ className: 'z-[99999]' }} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
