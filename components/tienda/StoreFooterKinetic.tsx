import React from 'react'

export default function StoreFooterKinetic({ storeName }: { storeName: string }) {
  return (
    <footer id="contacto" className="w-full py-12 border-t border-white/5 bg-background relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-center px-12 gap-6">
        <div className="text-lg font-bold text-on-background font-headline tracking-widest uppercase">{storeName}</div>
        <div className="flex gap-8">
          <a className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Privacidad</a>
          <a className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Términos</a>
          <a className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">Soporte</a>
        </div>
        <div className="font-label text-[10px] uppercase tracking-widest text-primary">
          © {new Date().getFullYear()} {storeName}. TODOS LOS DERECHOS RESERVADOS.
        </div>
      </div>
    </footer>
  )
}
