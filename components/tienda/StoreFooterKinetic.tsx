import React from 'react'
import { Instagram, Facebook, Video } from 'lucide-react'

export interface Socials {
  instagram?: string | null
  facebook?: string | null
  tiktok?: string | null
}

export default function StoreFooterKinetic({ storeName, socials }: { storeName: string, socials?: Socials }) {
  return (
    <footer id="contacto" className="w-full py-12 border-t border-white/5 bg-background relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-center px-12 gap-8">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="text-lg font-bold text-on-background font-headline tracking-widest uppercase">{storeName}</div>
          
          {/* Social Links */}
          <div className="flex gap-4">
            {socials?.instagram && (
              <a href={`https://instagram.com/${socials.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                <Instagram size={20} />
              </a>
            )}
            {socials?.facebook && (
              <a href={socials.facebook.startsWith('http') ? socials.facebook : `https://facebook.com/${socials.facebook}`} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                <Facebook size={20} />
              </a>
            )}
            {socials?.tiktok && (
              <a href={`https://tiktok.com/@${socials.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                <Video size={20} />
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-8">
          <a className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Privacidad</a>
          <a className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Términos</a>
          <a className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Soporte</a>
        </div>
        <div className="font-label text-[10px] uppercase tracking-widest text-primary text-center">
          © {new Date().getFullYear()} {storeName}.<br className="md:hidden" /> TODOS LOS DERECHOS RESERVADOS.
        </div>
      </div>
    </footer>
  )
}
