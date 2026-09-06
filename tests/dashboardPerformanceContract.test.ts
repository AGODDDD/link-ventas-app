import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('el layout paraleliza billing y tienda sin vaciar el cache del mismo usuario', async () => {
  const source = await read('app/dashboard/layout.tsx')
  assert.match(source, /Promise\.all\(\[/)
  assert.doesNotMatch(source, /prepararParaUsuario\([^\n]+,\s*true\)/)
  assert.match(source, /establecerStoreInfo/)
})

test('las vistas del dashboard reutilizan la sesión compartida', async () => {
  const files = await Promise.all([
    read('components/DashboardSidebar.tsx'),
    read('components/dashboard/DashboardTopBar.tsx'),
    read('app/dashboard/page.tsx'),
    read('app/dashboard/configuracion/page.tsx'),
  ])

  for (const source of files) {
    assert.match(source, /useDashboardSession/)
    assert.doesNotMatch(source, /auth\.getUser\(/)
  }

  assert.doesNotMatch(files[3], /from\('profiles'\)/)
  assert.doesNotMatch(files[3], /from\('stores'\)[\s\S]*owner_id/)
})
