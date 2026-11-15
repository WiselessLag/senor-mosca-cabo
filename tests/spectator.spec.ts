import { expect, test } from '@playwright/test'

test.use({launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}})

test('the 3D session presents cases, records spikes and applies rulings without input', async ({page}) => {
  test.setTimeout(45_000)
  const errors: string[] = []
  page.on('pageerror',error => errors.push(error.message))
  await page.goto('/3d/?modo=demo')
  await expect(page.getByTestId('hearing-canvas')).toBeVisible()
  await expect(page.getByText('WebGL 2 no está disponible', {exact:false})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Pipas para las colonias'})).toBeVisible({timeout:15_000})
  await expect(page.getByRole('img',{name:/Raster neural: [1-9][0-9]* disparos/})).toBeVisible()
  await expect(page.getByText('$10.15 M',{exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'La avenida de los primos'})).toBeVisible({timeout:19_000})
  await expect(page.getByText('Día 2 de 10')).toBeVisible()
  expect(errors).toEqual([])
})

test('the 3D session runs a FlyWire turn automatically when the model is installed', async ({page}) => {
  test.skip(process.env.MOSCA_TEST_FULL !== '1','Requires pinned FlyWire v783 tables')
  test.setTimeout(95_000)
  await page.goto('/3d/')
  await expect(page.getByRole('combobox',{name:'Modo neural'})).toHaveValue('flywire')
  await expect(page.getByRole('heading',{name:'Pipas para las colonias'})).toBeVisible({timeout:75_000})
  await expect(page.getByText('Se puntúan los primeros 30 ms.',{exact:false})).toBeVisible()
  await expect(page.getByText('$10.15 M',{exact:true})).toBeVisible()
})
