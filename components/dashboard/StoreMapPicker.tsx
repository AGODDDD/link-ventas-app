'use client'

import { useEffect, useRef, useState } from 'react'

let L: any = null

interface Props {
  initialLat?: number | null
  initialLng?: number | null
  onPick: (lat: number, lng: number) => void
}

export default function StoreMapPicker({ initialLat, initialLng, onPick }: Props) {
  const mapRef       = useRef<any>(null)
  const markerRef    = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!L) {
        const leaflet = await import('leaflet')
        L = leaflet.default || leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl
      }
      setReady(true)
    }
    load()
  }, [])

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'; link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'
      document.head.appendChild(link)
    }

    const defaultLat = initialLat || -12.0464
    const defaultLng = initialLng || -77.0428

    const map = L.map(containerRef.current, { zoomControl: true })
      .setView([defaultLat, defaultLng], 14)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

    // Ícono verde de local
    const storeIcon = L.divIcon({
      html: `<div style="width:36px;height:36px;background:#16a34a;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.35)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="1.5" fill="none"/></svg>
      </div>`,
      iconSize: [36, 36], iconAnchor: [18, 18], className: '',
    })

    // Si ya hay coordenadas, poner marcador
    if (initialLat && initialLng) {
      markerRef.current = L.marker([initialLat, initialLng], { icon: storeIcon }).addTo(map)
    }

    // Click en el mapa: mover/crear marcador
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { icon: storeIcon }).addTo(map)
      }
      onPick(lat, lng)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [ready])

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={containerRef} style={{ height: '280px', width: '100%' }} />
      <div className="bg-slate-50 px-3 py-2 text-[11px] text-slate-500 border-t border-slate-100">
        🟢 Haz clic en el mapa para marcar la ubicación de tu local
      </div>
    </div>
  )
}
