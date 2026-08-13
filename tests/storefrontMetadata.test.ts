import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const storefrontPath = new URL('../app/tienda/[id]/page.tsx', import.meta.url)
const storefrontLayoutPath = new URL('../app/tienda/[id]/layout.tsx', import.meta.url)

test('cada tienda pública usa su propio nombre en los metadatos', async () => {
  const source = await readFile(storefrontPath, 'utf8')

  assert.match(source, /title: store\?\.name \|\| 'Tienda LinkVentas'/)
  assert.doesNotMatch(source, /OFERTAS BLACK/)
})

test('cada tienda pública usa su logo como favicon y conserva un respaldo de LinkVentas', async () => {
  const source = await readFile(storefrontLayoutPath, 'utf8')

  assert.match(source, /select\('avatar_url'\)/)
  assert.match(source, /icon: store\?\.avatar_url \|\| '\/brand\/linkventas-mark\.svg'/)
})
