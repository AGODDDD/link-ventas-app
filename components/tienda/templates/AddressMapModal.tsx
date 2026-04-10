'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, MapPin, Navigation } from 'lucide-react'

// Dynamically import Leaflet to avoid SSR issues
let L: any = null;

interface AddressData {
  direccion: string;
  referencia: string;
  lat: number;
  lng: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddressData) => void;
  initialAddress?: string;
}

export default function AddressMapModal({ isOpen, onClose, onSave, initialAddress }: Props) {
  const [direccion, setDireccion] = useState(initialAddress || '')
  const [referencia, setReferencia] = useState('')
  const [position, setPosition] = useState<[number, number]>([-12.0464, -77.0428]) // Lima default
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<any>(null)

  // Load Leaflet dynamically (client-side only)
  useEffect(() => {
    if (!isOpen) return;
    
    const loadLeaflet = async () => {
      if (!L) {
        const leaflet = await import('leaflet')
        L = leaflet.default || leaflet
        
        // Fix default marker icons (Leaflet bug with bundlers)
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        })
      }
      setMapReady(true)
    }
    
    loadLeaflet()
  }, [isOpen])

  // Initialize map
  useEffect(() => {
    if (!mapReady || !isOpen || !mapContainerRef.current || mapRef.current) return;

    // Add Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css'
      document.head.appendChild(link)
    }
    
    // Small delay for CSS to load
    setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;
      
      const map = L.map(mapContainerRef.current).setView(position, 15)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map)
      
      const marker = L.marker(position, { draggable: true }).addTo(map)
      markerRef.current = marker
      mapRef.current = map
      
      // Click on map to move marker
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        marker.setLatLng([lat, lng])
        setPosition([lat, lng])
      })
      
      // Drag marker
      marker.on('dragend', () => {
        const latlng = marker.getLatLng()
        setPosition([latlng.lat, latlng.lng])
      })
    }, 200)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [mapReady, isOpen])

  // Geolocate user
  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setPosition(newPos)
        if (mapRef.current) {
          mapRef.current.setView(newPos, 16)
        }
        if (markerRef.current) {
          markerRef.current.setLatLng(newPos)
        }
      },
      () => alert('No se pudo obtener tu ubicación. Verifica los permisos del navegador.')
    )
  }

  // Block scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  // Cleanup map when modal closes
  useEffect(() => {
    if (!isOpen && mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      markerRef.current = null
      setMapReady(false)
    }
  }, [isOpen])

  const handleSave = () => {
    if (!direccion.trim()) {
      alert('Por favor ingresa tu dirección')
      return
    }
    onSave({
      direccion: direccion.trim(),
      referencia: referencia.trim(),
      lat: position[0],
      lng: position[1],
    })
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
              <MapPin size={14} className="text-red-600" />
            </div>
            <h2 className="font-bold text-base text-neutral-800">Seleccione una dirección</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Map */}
        <div className="relative w-full h-[280px] md:h-[340px] bg-neutral-100">
          <div ref={mapContainerRef} className="w-full h-full" />
          
          {/* Geolocate button */}
          <button 
            onClick={handleGeolocate}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500] bg-white shadow-lg border border-neutral-200 rounded-full px-4 py-2 text-sm font-medium text-neutral-700 flex items-center gap-2 hover:bg-neutral-50 transition-colors active:scale-95"
          >
            <Navigation size={14} className="text-blue-600" />
            Actualizar Ubicación
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-sm font-bold text-neutral-700 mb-1.5 block">Dirección</label>
            <input 
              type="text"
              value={direccion}
              onChange={e => setDireccion(e.target.value)}
              placeholder="Ej. Av. Javier Prado 1234, San Isidro"
              className="w-full border border-neutral-300 rounded-lg h-11 px-4 text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-neutral-700 mb-1.5 block">Referencia</label>
            <textarea 
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              placeholder="Ej. Cerca de la plaza, edificio gris, piso 3"
              rows={2}
              className="w-full border border-neutral-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-neutral-100 bg-neutral-50/50">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 text-sm font-bold text-white bg-black rounded-lg hover:bg-neutral-800 transition-colors active:scale-[0.98]"
          >
            Guardar
          </button>
        </div>

      </div>
    </div>
  )
}
