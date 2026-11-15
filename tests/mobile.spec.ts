import { expect, test } from '@playwright/test'

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
  launchOptions: { executablePath: process.env.MOSCA_CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
})

test('phone layout fits and the demo advances through a ruling', async ({ page }) => {
  test.setTimeout(45_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/3d/?modo=demo')
  await expect(page.getByTestId('hearing-canvas')).toBeVisible()
  const pause = page.getByRole('button', { name: 'Pausar' })
  await expect(pause).toBeEnabled()
  const box = await pause.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await expect(page.getByRole('heading', { name: 'Pipas para las colonias' })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('img', { name: /Raster neural: [1-9][0-9]* disparos/ })).toBeVisible()
  expect(errors).toEqual([])
})
