import { ImageResponse } from 'next/og'

export const alt = 'LinkVentas — Opera tu negocio con claridad'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const runtime = 'edge'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#FCFCFC',
          color: '#102A4C',
          display: 'flex',
          height: '100%',
          justifyContent: 'space-between',
          padding: '78px 96px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 680 }}>
          <div style={{ color: '#2F7EDA', display: 'flex', fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>
            LINKVENTAS
          </div>
          <div style={{ display: 'flex', fontSize: 74, fontWeight: 700, letterSpacing: -4, lineHeight: 1.05, marginTop: 30 }}>
            Opera tu negocio con claridad.
          </div>
          <div style={{ color: '#4B5563', display: 'flex', fontSize: 28, lineHeight: 1.35, marginTop: 28 }}>
            Catálogo, pedidos, pagos y operación en un solo lugar.
          </div>
        </div>
        <div
          style={{
            alignItems: 'center',
            background: '#102A4C',
            borderRadius: 64,
            display: 'flex',
            height: 250,
            justifyContent: 'center',
            position: 'relative',
            width: 250,
          }}
        >
          <div style={{ border: '22px solid #FFFFFF', borderRadius: 32, height: 112, position: 'absolute', transform: 'rotate(-45deg)', width: 112 }} />
          <div style={{ background: '#2F7EDA', height: 28, position: 'absolute', transform: 'rotate(-45deg)', width: 154 }} />
          <div style={{ borderLeft: '42px solid #2F7EDA', borderBottom: '26px solid transparent', borderTop: '26px solid transparent', position: 'absolute', right: 27, top: 49, transform: 'rotate(-45deg)' }} />
        </div>
      </div>
    ),
    size,
  )
}
