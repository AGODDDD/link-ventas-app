import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/20260810000000_account_privacy_and_deletion_requests.sql', 'utf8')
const accountRoute = readFileSync('app/api/account/route.ts', 'utf8')
const deletionRoute = readFileSync('app/api/account/deletion-request/route.ts', 'utf8')
const adminRoute = readFileSync('app/api/admin/account-deletion-requests/route.ts', 'utf8')
const adminAuth = readFileSync('lib/admin.ts', 'utf8')

test('las solicitudes de eliminación están cerradas a Data API y vencen en siete días', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.account_deletion_requests/)
  assert.match(migration, /interval '7 days'/)
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/)
  assert.match(migration, /REVOKE ALL ON TABLE public\.account_deletion_requests FROM PUBLIC, anon, authenticated/)
})

test('la cuenta permite actualizar solo el nombre visible autenticado', () => {
  assert.match(accountRoute, /getAuthenticatedUser/)
  assert.match(accountRoute, /fullName.length < 2 \|\| fullName.length > 80/)
  assert.match(accountRoute, /auth\.admin\.updateUserById/)
})

test('la cuenta identifica Google y conserva Facebook solo como acceso anterior', () => {
  assert.match(accountRoute, /identity\.provider === 'google'/)
  assert.match(accountRoute, /Facebook \(acceso anterior\)/)
})

test('la eliminación exige confirmación y revisión de Super Admin', () => {
  assert.match(deletionRoute, /confirmation !== 'ELIMINAR'/)
  assert.match(adminAuth, /user\.id !== adminUserId/)
  assert.match(adminRoute, /getAdminContext/)
  assert.match(adminRoute, /confirmation !== 'ELIMINAR CUENTA'/)
  assert.match(adminRoute, /anonymize_account_for_deletion/)
})
