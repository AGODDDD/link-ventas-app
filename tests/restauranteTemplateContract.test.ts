import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { formatRestaurantMinimumOrder } from '../lib/restaurantStorefront'

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
  assert.match(source, /logoUrl=\{perfil\.avatar_url\}/)
  assert.match(source, /md:ml-\[266px\]/)
  assert.match(source, /<main className="flex-1 md:ml-\[266px\]/)
  assert.doesNotMatch(source, /<main className="flex-1 w-full md:ml-\[266px\]/)
  assert.match(source, /aria-label="Medios de pago aceptados"/)
  assert.match(source, /const handleScrollToMenu/)
  assert.match(source, /left: 0/)
  assert.match(source, /onClick=\{handleScrollToMenu\}/)
  assert.doesNotMatch(source, /scrollIntoView\(\{ behavior: 'smooth' \}\)/)
  assert.match(source, /<PaymentBrandMark brand="visa"/)
  assert.match(source, /<PaymentBrandMark brand="mastercard"/)
  assert.match(source, /<PaymentBrandMark brand="yape"/)
  assert.match(source, /<PaymentBrandMark brand="plin"/)
  assert.match(source, /<PaymentBrandMark brand="cash"/)
  assert.doesNotMatch(source, /perfil\.store_name\?\.charAt\(0\)/)
  assert.doesNotMatch(source, /Pucusana|51999999999|Av\. La Mar|images\.unsplash\.com/)
  assert.match(source, /setIsOrderHistoryOpen\(true\)/)
  assert.match(source, /aria-label="Agregar o cambiar dirección de entrega"/)
  assert.match(source, /isReadOnly=\{isReadOnly\}/)
  assert.doesNotMatch(source, /Pedido mínimo: S\/ \{perfil\.operations_config/)
})

test('el pedido mínimo se muestra solo cuando la tienda lo configuró', () => {
  assert.equal(formatRestaurantMinimumOrder(undefined), null)
  assert.equal(formatRestaurantMinimumOrder(0), null)
  assert.equal(formatRestaurantMinimumOrder(25), 'Pedido mínimo: S/ 25.00')
})
