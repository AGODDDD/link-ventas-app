import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_SCHEDULE, getTodayScheduleText, isStoreClosed } from '../../lib/storeSchedule'

test('una tienda sin horario se considera abierta', () => {
  assert.equal(isStoreClosed(null, new Date(2026, 6, 27, 12, 0)), false)
})

test('el horario bloquea pedidos fuera de su rango', () => {
  const monday = new Date(2026, 6, 27, 8, 59)
  const openMonday = new Date(2026, 6, 27, 9, 0)
  const closedMonday = new Date(2026, 6, 27, 22, 0)

  assert.equal(isStoreClosed(DEFAULT_SCHEDULE, monday), true)
  assert.equal(isStoreClosed(DEFAULT_SCHEDULE, openMonday), false)
  assert.equal(isStoreClosed(DEFAULT_SCHEDULE, closedMonday), true)
})

test('el texto de hoy refleja un dia inactivo', () => {
  const sunday = new Date(2026, 6, 26, 12, 0)
  assert.equal(getTodayScheduleText(DEFAULT_SCHEDULE, sunday), 'Cerrado hoy')
})
