export const ORDER_STATUS_LABELS: Record<string, string> = {
  pendiente_pago: 'Pendiente de pago',
  pendiente_verificacion: 'Verificar pago',
  pending: 'Pendiente',
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  alistando: 'Alistando',
  shipped: 'En camino',
  en_camino: 'En camino',
  paid: 'Pagado',
  completado: 'Completado',
  cancelled: 'Cancelado',
  cancelado: 'Cancelado',
}

export const ORDER_STATUS_BADGE_STYLES: Record<string, string> = {
  pendiente_pago: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300',
  pendiente_verificacion: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-300',
  pending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
  pendiente: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
  en_preparacion: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300',
  alistando: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300',
  shipped: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300',
  en_camino: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
  completado: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
  cancelled: 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300',
  cancelado: 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300',
}

export function getOrderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] || status.replaceAll('_', ' ')
}

export function getOrderStatusBadgeStyle(status: string) {
  return ORDER_STATUS_BADGE_STYLES[status]
    || 'border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
}
