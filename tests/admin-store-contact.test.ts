import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const storesRoute = readFileSync('app/api/admin/stores/route.ts', 'utf8')
const contactRoute = readFileSync('app/api/admin/stores/contact/route.ts', 'utf8')
const table = readFileSync('components/admin/AdminStoresTable.tsx', 'utf8')

test('el admin muestra el correo de Auth si un perfil histórico está incompleto', () => {
  assert.match(storesRoute, /auth\.admin\.getUserById/)
  assert.match(storesRoute, /email_needs_sync/)
  assert.match(storesRoute, /accountsNeedingEmailSync/)
})

test('la sincronización de correo está limitada al Super Admin y usa Auth como origen', () => {
  assert.match(contactRoute, /getAdminContext\(req, 'store-contact-sync', 10\)/)
  assert.match(contactRoute, /auth\.admin\.getUserById\(ownerId\)/)
  assert.match(contactRoute, /action === 'sync-missing'/)
  assert.match(contactRoute, /Never accept an e-mail from the browser/)
  assert.match(contactRoute, /\.update\(\{ email, updated_at:/)
})

test('el panel expone la atención pendiente y una acción explícita de sincronización', () => {
  assert.match(table, /Sincronizar correo/)
  assert.match(table, /sync-missing/)
  assert.match(table, /Sin correo en Auth/)
  assert.match(table, /email_needs_sync/)
})
