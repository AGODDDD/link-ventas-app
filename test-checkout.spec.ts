import { expect, test } from '@playwright/test'

const STORE_URL = process.env.CHECKOUT_STORE_URL || ''
const SCREENSHOT_PATH = 'checkout-exito.png'
const CARD_NUMBER = process.env.MP_TEST_CARD_NUMBER || ''
const CARD_EXPIRATION = process.env.MP_TEST_CARD_EXPIRATION || ''
const CARD_SECURITY_CODE = process.env.MP_TEST_CARD_SECURITY_CODE || ''
const hasSandboxConfiguration = Boolean(STORE_URL && CARD_NUMBER && CARD_EXPIRATION && CARD_SECURITY_CODE)

test.skip(!hasSandboxConfiguration, 'Requiere una tienda sandbox y credenciales explícitas de Mercado Pago.')

test.afterEach(async ({ page }) => {
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true }).catch(() => {})
})

async function clickFirstVisibleByText(page: import('@playwright/test').Page, text: RegExp | string) {
  const locator = page.getByText(text).first()
  await expect(locator).toBeVisible({ timeout: 30_000 })
  await locator.click()
}

async function fillFirstMatchingFrame(page: import('@playwright/test').Page, matcher: RegExp, value: string) {
  await expect
    .poll(async () => page.frames().some(frame => matcher.test(frame.url()) || matcher.test(frame.name())), { timeout: 45_000 })
    .toBe(true)

  for (const frame of page.frames()) {
    if (!matcher.test(frame.url()) && !matcher.test(frame.name())) continue
    const input = frame.locator('input, textarea').first()
    await expect(input).toBeVisible({ timeout: 15_000 })
    await input.fill(value)
    return
  }

  throw new Error(`No frame matched ${matcher}`)
}

async function fillFirstFrameField(page: import('@playwright/test').Page, selector: string, value: string) {
  await expect
    .poll(async () => {
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue
        try {
          if (await frame.locator(selector).first().count()) return true
        } catch {
          // Mercado Pago can detach/remount secure-field frames while initializing.
        }
      }
      return false
    }, { timeout: 60_000 })
    .toBe(true)

  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue
    try {
      const field = frame.locator(selector).first()
      if (!(await field.count())) continue
      await expect(field).toBeVisible({ timeout: 15_000 })
      await field.fill(value)
      return
    } catch {
      // Try the next still-attached frame.
    }
  }

  throw new Error(`No iframe field matched ${selector}`)
}

async function fillMercadoPagoField(page: import('@playwright/test').Page, selectors: string[], value: string) {
  for (const selector of selectors) {
    const field = page.locator(selector).first()
    if (await field.count()) {
      try {
        await field.fill(value, { timeout: 2_000 })
        return
      } catch {
        // Try iframe fallbacks below.
      }
    }
  }

  const frameMatchers = selectors
    .map(selector => selector.match(/name\*="([^"]+)"/)?.[1] || selector.match(/id\*="([^"]+)"/)?.[1])
    .filter(Boolean)
    .map(value => new RegExp(value!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))

  for (const matcher of frameMatchers) {
    try {
      await fillFirstMatchingFrame(page, matcher, value)
      return
    } catch {
      // Try the next field naming convention.
    }
  }

  throw new Error(`Could not fill Mercado Pago field with selectors: ${selectors.join(', ')}`)
}

test('checkout Mercado Pago AMEX approval path', async ({ page }) => {
  test.setTimeout(180_000)

  page.on('console', msg => console.log(`[browser:${msg.type()}] ${msg.text()}`))
  page.on('pageerror', error => console.log(`[pageerror] ${error.message}`))
  page.on('response', async response => {
    const url = response.url()
    if (!url.includes('mercadopago') || response.status() < 400) return
    const body = await response.text().catch(() => '')
    console.log(`[mp:${response.status()}] ${url} ${body.slice(0, 500)}`)
  })

  await page.goto(STORE_URL, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/tienda\/barres/)

  await clickFirstVisibleByText(page, 'Combo 1')
  await clickFirstVisibleByText(page, 'Clasica G')
  await page.getByRole('button', { name: /^Agregar$/ }).click()
  await expect(page.getByText(/Agregado a tu pedido/i)).toBeVisible({ timeout: 10_000 })

  await page.locator('div.fixed.bottom-0.right-0').click()
  await page.getByRole('button', { name: /Realizar el pedido/i }).click()
  await page.getByPlaceholder(/Av\. Javier Prado/i).fill('Av. Javier Prado 1234, San Isidro')
  await page.getByPlaceholder(/Cerca de la plaza/i).fill('Prueba automatizada Mercado Pago')
  await page.getByRole('button', { name: /Guardar/i }).click()

  await expect(page.getByText(/Detalles del pedido/i)).toBeVisible({ timeout: 20_000 })

  await page.locator('input[type="text"]:visible').nth(1).fill('APRO')
  await page.locator('input[type="tel"]:visible').fill('987654321')
  await page.locator('input[type="email"]:visible').fill('apro@linkventas.pe')
  await page.getByText('Mercado Pago').click()
  await page.locator('input[type="checkbox"]:visible').last().check()
  await page.getByRole('button', { name: /^Pagar$/i }).click()

  await expect(page.getByText(/Pago seguro con Mercado Pago/i)).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => page.frames().length, { timeout: 60_000 }).toBeGreaterThan(1)

  await fillFirstFrameField(page, 'input[placeholder*="1234"]', CARD_NUMBER)
  await fillFirstFrameField(page, 'input[placeholder="MM/AA"]', CARD_EXPIRATION)
  await fillFirstFrameField(page, 'input[placeholder="Ej.: 123"]', CARD_SECURITY_CODE)
  await page.getByPlaceholder('María López').fill('APRO')
  await page.getByPlaceholder('99999999').fill('12345678')

  await page.locator('.z-\\[130\\]').getByRole('button', { name: /^Pagar$/i }).click()

  const success = page.getByText(/Pago aprobado|¡Pago aprobado!|pedido confirmado|exito|éxito/i).first()
  const failure = page.getByText(/Pago no aprobado|No se pudo|No pudimos|Completa todos|Ha ocurrido|rechazad|error|fraude|invalid/i).first()
  await Promise.race([
    success.waitFor({ state: 'visible', timeout: 75_000 }),
    failure.waitFor({ state: 'visible', timeout: 75_000 }),
  ])

  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })
  await expect(success).toBeVisible({ timeout: 1_000 })
})
