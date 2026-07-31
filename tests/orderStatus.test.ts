import assert from 'node:assert/strict'
import test from 'node:test'
import { getOrderStatusBadgeStyle, getOrderStatusLabel } from '../lib/orderStatus'

test('cada estado operativo conserva una etiqueta legible', () => {
  assert.equal(getOrderStatusLabel('pendiente'), 'Pendiente')
  assert.equal(getOrderStatusLabel('en_preparacion'), 'En preparación')
  assert.equal(getOrderStatusLabel('en_camino'), 'En camino')
  assert.equal(getOrderStatusLabel('completado'), 'Completado')
  assert.equal(getOrderStatusLabel('cancelado'), 'Cancelado')
})

test('los estados principales usan familias cromáticas distintas', () => {
  const styles = [
    getOrderStatusBadgeStyle('pendiente'),
    getOrderStatusBadgeStyle('en_preparacion'),
    getOrderStatusBadgeStyle('en_camino'),
    getOrderStatusBadgeStyle('completado'),
    getOrderStatusBadgeStyle('cancelado'),
  ]

  assert.equal(new Set(styles).size, styles.length)
  assert.match(styles[0], /amber/)
  assert.match(styles[1], /sky/)
  assert.match(styles[2], /cyan/)
  assert.match(styles[3], /emerald/)
  assert.match(styles[4], /red/)
})
