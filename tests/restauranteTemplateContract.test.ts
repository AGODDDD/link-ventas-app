import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const storefrontPath = new URL('../app/tienda/[id]/page.tsx', import.meta.url)
const templatePath = new URL('../components/tienda/templates/RestauranteTemplate.tsx', import.meta.url)

test('la plantilla restaurante usa únicamente stores y store_config como fuente pública', async () => {
  const source = await readFile(storefrontPath, 'utf8')

  assert.match(source, /from\('stores'\)/)
  assert.match(source, /from\('store_config'\)/)
  assert.doesNotMatch(source, /mockPucusanaData|store-pucusana|MOCK_PUCUSANA/)
})

test('la interfaz restaurante deriva identidad y operación de la configuración de la tienda', async () => {
  const source = await readFile(templatePath, 'utf8')

  assert.match(source, /const accentColor = perfil\.primary_color/)
  assert.match(source, /const serviceLabel = deliveryEnabled/)
  assert.match(source, /const prepTime = perfil\.operations_config\?\.defaultPreparationTime/)
  assert.match(source, /const heroImage = perfil\.hero_image_url \|\| perfil\.banner_url \|\| perfil\.avatar_url/)
  assert.doesNotMatch(source, /Pucusana|51999999999|Av\. La Mar|images\.unsplash\.com/)
})
