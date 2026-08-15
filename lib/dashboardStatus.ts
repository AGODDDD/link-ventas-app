export type DashboardRealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export function getDashboardGreeting(date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'America/Lima',
    }).format(date)
  )

  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function getRealtimeStatus(status: string): DashboardRealtimeStatus {
  switch (status) {
    case 'SUBSCRIBED':
      return 'connected'
    case 'TIMED_OUT':
      return 'reconnecting'
    case 'CHANNEL_ERROR':
      return 'error'
    case 'CLOSED':
      return 'disconnected'
    default:
      return 'connecting'
  }
}

export const DASHBOARD_REALTIME_COPY: Record<DashboardRealtimeStatus, string> = {
  connecting: 'Conectando',
  connected: 'Sincronizado',
  reconnecting: 'Reconectando',
  disconnected: 'Sin conexión',
  error: 'Realtime no disponible',
}
