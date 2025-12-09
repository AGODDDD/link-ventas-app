import DashboardSidebar from '@/components/DashboardSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. EL MENÚ LATERAL (Fijo) */}
      <DashboardSidebar />

      {/* 2. EL CONTENIDO PRINCIPAL (Variable) */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}