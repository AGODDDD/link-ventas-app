import React from 'react'
import Script from 'next/script'

export default function TiendaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* SDK Global de Culqi inyectado de forma segura en toda la tienda */}
      <Script src="https://checkout.culqi.com/js/v4" strategy="afterInteractive" />
      {children}
    </>
  )
}
