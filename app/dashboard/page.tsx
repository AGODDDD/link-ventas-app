'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, MousePointer, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  
  // Datos Falsos (Placeholder) para que se vea bonito por ahora
  const stats = [
    { title: "Ventas Totales", value: "S/ 0.00", icon: DollarSign, color: "text-green-500" },
    { title: "Productos Activos", value: "3", icon: Package, color: "text-blue-500" }, // Aquí luego pondremos el count real
    { title: "Visitas a la Tienda", value: "12", icon: MousePointer, color: "text-purple-500" },
    { title: "Tasa de Conversión", value: "0%", icon: TrendingUp, color: "text-orange-500" },
  ]

  return (
    <div className="space-y-8">
      
      {/* Título de Bienvenida */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Resumen General</h1>
        <p className="text-slate-500">Bienvenido de vuelta, aquí está lo que pasa en tu negocio.</p>
      </div>

      {/* GRILLA DE TARJETAS (ESTILO TAILADMIN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-slate-400 mt-1">+0% desde ayer</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AQUÍ PUEDES PONER GRÁFICOS O TABLA RECIENTE DESPUÉS */}
      <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
        Gráfico de ventas próximamente... 📈
      </div>

    </div>
  )
}