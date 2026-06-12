import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Link Ventas",
  description: "Tu tienda online en un solo link",
};
  
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
