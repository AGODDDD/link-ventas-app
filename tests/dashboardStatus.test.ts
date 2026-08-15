import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DASHBOARD_REALTIME_COPY,
  getDashboardGreeting,
  getRealtimeStatus,
} from '../lib/dashboardStatus'

test('el saludo se calcula con la hora de Lima', () => {
  assert.equal(getDashboardGreeting(new Date('2026-08-14T16:59:00.000Z')), 'Buenos días')
  assert.equal(getDashboardGreeting(new Date('2026-08-14T17:00:00.000Z')), 'Buenas tardes')
  assert.equal(getDashboardGreeting(new Date('2026-08-15T00:00:00.000Z')), 'Buenas noches')
})

test('Realtime comunica sus estados sin confundir un error con una sincronización', () => {
  assert.equal(getRealtimeStatus('SUBSCRIBED'), 'connected')
  assert.equal(getRealtimeStatus('TIMED_OUT'), 'reconnecting')
  assert.equal(getRealtimeStatus('CHANNEL_ERROR'), 'error')
  assert.equal(getRealtimeStatus('CLOSED'), 'disconnected')
  assert.equal(DASHBOARD_REALTIME_COPY.connected, 'Sincronizado')
})
