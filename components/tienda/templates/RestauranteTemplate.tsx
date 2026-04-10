import React from 'react'
import { Profile, Product } from '@/types/tienda'
import { MapPin, Clock, MessageCircle, ExternalLink } from 'lucide-react'

interface Props {
  perfil: Profile;
  productos: Product[];
}

export default function RestauranteTemplate({ perfil, productos }: Props) {
  // Agrúpar platos por categoría
  const categorias = productos.reduce((acc: Record<string, Product[]>, item) => {
    const cat = item.category || 'Menú';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const handleWhatsAppOrder = (item: Product) => {
    if (!perfil.whatsapp_phone) return;
    const baseMsg = perfil.whatsapp_order_template || "Hola, quiero pedir:";
    const text = encodeURIComponent(`${baseMsg} ${item.name} (S/ ${item.price.toFixed(2)})`);
    window.open(`https://wa.me/${perfil.whatsapp_phone}?text=${text}`, '_blank');
  };

  return (
    <main className="relative min-h-screen pt-24 pb-24 bg-[#fffdfa] text-slate-900 font-body"> {/* Warm background */}
      
      {/* Restaurant Hero / Info */}
      <div className="max-w-4xl mx-auto px-6 mb-12 text-center space-y-6">
        <h1 className="font-headline font-black text-5xl md:text-7xl uppercase text-slate-900 tracking-tighter">
          {perfil.store_name}
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">{perfil.description}</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 text-sm font-medium text-slate-500 uppercase tracking-widest">
          {perfil.horario && (
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-orange-500" /> {perfil.horario}
            </div>
          )}
          {perfil.direccion && (
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-orange-500" /> {perfil.direccion}
            </div>
          )}
        </div>
      </div>

      {/* Menú Interactivo */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-16">
        {Object.entries(categorias).map(([categoria, items]) => (
          <section key={categoria} className="space-y-8">
            <h2 className="font-headline font-black text-3xl uppercase tracking-widest border-b-2 border-orange-500 pb-2 inline-block">
              {categoria}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {items.map((item) => (
                <div key={item.id} className="bg-white border hover:border-orange-200 transition-colors shadow-sm hover:shadow-md rounded-2xl overflow-hidden flex flex-col">
                  {/* Foto de la comida entra por los ojos */}
                  <div className="aspect-[4/3] bg-slate-100 relative group overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">Sin foto</div>
                    )}
                    {item.is_available === false && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                        <span className="bg-red-500 text-white font-bold uppercase tracking-widest px-4 py-1 text-sm rounded-full">AGOTADO HOY</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="font-bold text-xl leading-tight">{item.name}</h3>
                        <span className="font-headline font-black text-orange-600 text-xl shrink-0">S/ {item.price.toFixed(2)}</span>
                      </div>
                      {item.description && <p className="text-slate-500 text-sm mt-2 line-clamp-2">{item.description}</p>}
                      {item.preparation_time && (
                        <span className="inline-block mt-3 bg-orange-50 text-orange-700 text-xs font-bold px-2 py-1 rounded">
                          ⏳ {item.preparation_time}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleWhatsAppOrder(item)}
                      disabled={item.is_available === false || !perfil.whatsapp_phone}
                      className="w-full mt-4 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <MessageCircle size={18} /> Pedir por WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
