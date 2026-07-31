import assert from 'node:assert/strict'
import test from 'node:test'
import {
  INITIAL_DASHBOARD_TEMPLATE_STATE,
  resolveDashboardTemplate,
} from '../lib/dashboardTemplate'

test('la plantilla permanece sin resolver durante la hidratación inicial', () => {
  assert.deepEqual(INITIAL_DASHBOARD_TEMPLATE_STATE, { status: 'loading' })
})

test('la plantilla restaurante se conserva al resolver la tienda', () => {
  assert.equal(resolveDashboardTemplate('restaurante'), 'restaurante')
})

test('una plantilla antigua o vacía usa comercio solo después de resolverse', () => {
  assert.equal(resolveDashboardTemplate(undefined), 'comercio')
  assert.equal(resolveDashboardTemplate('desconocida'), 'comercio')
})
