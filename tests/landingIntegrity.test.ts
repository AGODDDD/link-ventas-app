import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const landingPath = new URL('../app/page.tsx', import.meta.url)

test('la landing no publica métricas de adopción sin verificar', async () => {
  const source = await readFile(landingPath, 'utf8')

  assert.doesNotMatch(source, /\+2,400/)
  assert.match(source, /Sin comisión/)
  assert.match(source, /Mercado Pago/)
})

test('el CTA final inicia el registro en vez de simular una captura', async () => {
  const source = await readFile(landingPath, 'utf8')

  assert.match(source, /router\.push\('\/login'\)/)
  assert.doesNotMatch(source, /setEmailSent/)
})
