'use client'
import React, { useState, useRef } from 'react'
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react'
import { csvToJSON, jsonToCSV, downloadFile } from '@/lib/csvUtils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportProductsModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const text = await selectedFile.text()
    const data = csvToJSON(text)
    setPreview(data.slice(0, 5)) // Solo mostrar los primeros 5 como previsualización
  }

  const downloadTemplate = () => {
    const template = [
      {
        nombre: "Ejemplo Brilla Mas",
        precio: "99.90",
        marca: "Kinetic",
        categoria: "Accesorios",
        stock: "50",
        descripcion: "Descripción potente del producto"
      }
    ];
    downloadFile(jsonToCSV(template), "Plantilla_Productos_LinkVentas.csv");
  }

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const text = await file.text()
      const rawData = csvToJSON(text)

      // 1. Limpiar y Validar
      const productsToInsert = rawData.map((row: any) => {
        const name = row.nombre || row.name || row.title;
        const priceStr = row.precio || row.price || row.monto;
        const price = parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));

        if (!name || isNaN(price)) return null;

        return {
          user_id: user.id,
          name: name.toUpperCase(),
          price: price,
          brand: (row.marca || row.brand || "").toUpperCase(),
          category: (row.categoria || row.category || "").toUpperCase(),
          stock: typeof row.stock !== 'undefined' ? parseInt(String(row.stock).replace(/[^0-9]/g, '')) || 0 : null,
          description: row.descripcion || row.description || "",
          is_active: true
        }
      }).filter(Boolean);

      if (productsToInsert.length === 0) {
        throw new Error("No se encontraron productos válidos en el archivo. Verifica los nombres de las columnas (Nombre, Precio).")
      }

      // 2. Insertar en Supabase (Bulk)
      const { error } = await supabase
        .from('products')
        .insert(productsToInsert)

      if (error) throw error

      toast.success(`¡Éxito! Se importaron ${productsToInsert.length} productos a tu bodega.`)
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Error al importar el archivo")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative bg-surface border-2 border-outline max-w-xl w-full p-8 md:p-10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] overflow-hidden">
        
        {/* Brutalist Decor */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-background transform rotate-45 translate-x-6 -translate-y-6 border-l-2 border-b-2 border-outline"></div>
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-primary transition-colors">
          <X size={24} />
        </button>

        <div className="flex items-center gap-4 mb-8 border-l-4 border-primary pl-4">
          <FileSpreadsheet className="text-primary w-8 h-8" />
          <div>
            <p className="font-label text-[10px] uppercase tracking-widest text-primary mb-1">DATA OPS // IMPORT</p>
            <h2 className="text-2xl font-black font-headline uppercase italic tracking-tighter">BODEGA MASIVA</h2>
          </div>
        </div>

        <div className="space-y-6">
          {/* Instrucciones */}
          <div className="bg-surface-container-high/50 p-4 border border-outline border-dashed">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Sube un archivo <strong className="text-on-surface">.CSV</strong> con las columnas: <br/> 
              <span className="font-mono text-[10px] text-primary">NOMBRE, PRECIO, MARCA, CATEGORIA, STOCK, DESCRIPCION</span>
            </p>
            <button 
                onClick={downloadTemplate}
                className="mt-3 text-[10px] font-black uppercase text-primary hover:text-on-background flex items-center gap-2 transition-colors"
                aria-label="Descargar plantilla CSV"
            >
                <Download size={12} /> Descargar Plantilla Base
            </button>
          </div>

          {/* Area de carga */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${file ? 'border-secondary bg-secondary/5' : 'border-outline hover:border-primary hover:bg-primary/5'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".csv" 
              className="hidden" 
            />
            
            {file ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-secondary" />
                <div className="text-center">
                  <p className="font-headline font-bold text-on-surface uppercase tracking-widest">{file.name}</p>
                  <p className="text-[10px] text-on-surface-variant mt-1 uppercase">{(file.size / 1024).toFixed(2)} KB · LISTO PARA PROCESAR</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-on-surface-variant/30" />
                <div className="text-center">
                  <p className="font-headline font-bold text-on-surface-variant uppercase tracking-widest">SUBIR ARCHIVO .CSV</p>
                  <p className="text-[10px] text-on-surface-variant/50 mt-1 uppercase">MÁXIMO 5MB · FORMATO UTF-8</p>
                </div>
              </>
            )}
          </div>

          {/* Previsualización */}
          {preview.length > 0 && (
            <div className="space-y-2">
               <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Previsualización (Primeras 5 filas):</p>
               <div className="max-h-32 overflow-y-auto border border-outline bg-black/20 font-mono text-[10px] p-2">
                 {preview.map((row, i) => (
                    <div key={i} className="py-1 border-b border-outline/20 last:border-0 truncate text-on-surface-variant">
                       {JSON.stringify(row)}
                    </div>
                 ))}
               </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <button 
              disabled={!file || importing}
              onClick={handleImport}
              className="w-full bg-primary text-on-primary py-4 font-headline uppercase font-black tracking-[0.2em] italic shadow-lg shadow-primary/20 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {importing ? 'INYECTANDO DATOS...' : 'INICIAR IMPORTACIÓN'}
            </button>
            <p className="text-center font-label text-[9px] text-on-surface-variant flex items-center justify-center gap-2">
               <AlertCircle size={10} /> ESTA ACCIÓN AGREGARÁ NUEVOS PRODUCTOS A TU BODEGA.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
