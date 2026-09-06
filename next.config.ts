import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      // Structural restrictions are enforced immediately. Script restrictions
      // are staged in report-only mode to preserve payment SDKs and Next hydration.
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'" },
      { key: 'Content-Security-Policy-Report-Only', value: "default-src 'self'; script-src 'self' https://sdk.mercadopago.com https://*.mercadopago.com https://*.mercadolibre.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https: data: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss:; frame-src https://*.mercadopago.com https://*.mercadolibre.com; media-src 'self' https: blob:; worker-src 'self' blob:" },
    ] }]
  },
  serverExternalPackages: ['pdfkit'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

export default nextConfig;
