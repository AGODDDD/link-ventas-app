/**
 * Estrategia Horaria — helper compartido
 *
 * Formato de schedule:
 * {
 *   "lun": { "active": true,  "open": "09:00", "close": "22:00" },
 *   "mar": { "active": true,  "open": "09:00", "close": "22:00" },
 *   "mie": { "active": true,  "open": "09:00", "close": "22:00" },
 *   "jue": { "active": true,  "open": "09:00", "close": "22:00" },
 *   "vie": { "active": true,  "open": "09:00", "close": "23:00" },
 *   "sab": { "active": true,  "open": "10:00", "close": "23:00" },
 *   "dom": { "active": false, "open": "10:00", "close": "20:00" },
 * }
 */

export type DayKey = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom'

export interface DaySchedule {
  active: boolean
  open: string   // "HH:MM"
  close: string  // "HH:MM"
}

export type StoreSchedule = Record<DayKey, DaySchedule>

export const DAY_KEYS: DayKey[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']

export const DAY_LABELS: Record<DayKey, string> = {
  lun: 'Lunes',
  mar: 'Martes',
  mie: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sab: 'Sábado',
  dom: 'Domingo',
}

export const DEFAULT_SCHEDULE: StoreSchedule = {
  lun: { active: true,  open: '09:00', close: '22:00' },
  mar: { active: true,  open: '09:00', close: '22:00' },
  mie: { active: true,  open: '09:00', close: '22:00' },
  jue: { active: true,  open: '09:00', close: '22:00' },
  vie: { active: true,  open: '09:00', close: '23:00' },
  sab: { active: true,  open: '10:00', close: '23:00' },
  dom: { active: false, open: '10:00', close: '20:00' },
}

/** Mapeo JS getDay() (0=dom, 1=lun...) a DayKey */
const JS_DAY_TO_KEY: Record<number, DayKey> = {
  0: 'dom', 1: 'lun', 2: 'mar', 3: 'mie', 4: 'jue', 5: 'vie', 6: 'sab',
}

/**
 * Devuelve true si la tienda está CERRADA ahora mismo.
 * Si no hay horario configurado → asume abierta (false).
 */
export function isStoreClosed(schedule?: StoreSchedule | null): boolean {
  if (!schedule) return false          // sin horario = siempre abierta

  const now     = new Date()
  const dayKey  = JS_DAY_TO_KEY[now.getDay()]
  const dayConf = schedule[dayKey]

  if (!dayConf || !dayConf.active) return true   // día inactivo = cerrado

  const [openH,  openM]  = dayConf.open.split(':').map(Number)
  const [closeH, closeM] = dayConf.close.split(':').map(Number)

  const nowMins = now.getHours() * 60 + now.getMinutes()
  const openMins  = openH  * 60 + openM
  const closeMins = closeH * 60 + closeM

  return nowMins < openMins || nowMins >= closeMins
}

/**
 * Devuelve el texto del horario de hoy, ej: "09:00 - 22:00"
 */
export function getTodayScheduleText(schedule?: StoreSchedule | null): string {
  if (!schedule) return ''
  const dayKey  = JS_DAY_TO_KEY[new Date().getDay()]
  const dayConf = schedule[dayKey]
  if (!dayConf || !dayConf.active) return 'Cerrado hoy'
  return `${dayConf.open} - ${dayConf.close}`
}
