import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD

if (!password) {
  throw new Error('E2E_PASSWORD is required for the authenticated H1 acceptance test')
}

test('H1 mobile comfort: Piano annuale usa esposizione progressiva senza scroll laterale', async ({ page }) => {
  await login(page)
  await page.goto('/piano-annuale')

  await expect(page.getByRole('heading', { name: 'Piano annuale' })).toBeVisible()
  const disclosure = page.locator('details.humanTaskSecondary').filter({ hasText: 'Sequenza didattica completa' })
  await expect(disclosure).not.toHaveAttribute('open', '')

  const firstBlock = disclosure.locator('.annualTable tbody tr').first()
  await expect(firstBlock).not.toBeVisible()
  await disclosure.locator('summary').click()
  await expect(disclosure).toHaveAttribute('open', '')
  await expect(firstBlock).toBeVisible()
  await expect(firstBlock.locator('td').first()).not.toBeEmpty()

  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.documentElement.scrollWidth,
  }))
  expect(metrics.body).toBeLessThanOrEqual(metrics.viewport + 1)

  const rowBox = await firstBlock.boundingBox()
  expect(rowBox).not.toBeNull()
  expect(rowBox.width).toBeLessThanOrEqual(metrics.viewport - 12)
  expect(rowBox.x).toBeGreaterThanOrEqual(0)

  await page.screenshot({ path: 'test-results/h1-01-annual-plan-mobile.png', fullPage: true })
})

test('H1 mobile comfort: Progetta mostra tutte le quattro fasi senza scroll laterale', async ({ page }) => {
  await login(page)
  await page.goto('/progetta?grade=prima')

  await expect(page.getByRole('heading', { name: 'Progetta' })).toBeVisible()
  const workflow = page.getByRole('region', { name: 'Percorso di progettazione' })
  await expect(workflow).toBeVisible()

  for (const label of ['Fonti', 'Quadro annuale', 'UDA', 'Materiali']) {
    await expect(workflow.getByText(label, { exact: true })).toBeVisible()
  }

  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    body: document.documentElement.scrollWidth,
  }))
  expect(metrics.body).toBeLessThanOrEqual(metrics.viewport + 1)

  const workflowBox = await workflow.boundingBox()
  expect(workflowBox).not.toBeNull()
  expect(workflowBox.x).toBeGreaterThanOrEqual(0)
  expect(workflowBox.width).toBeLessThanOrEqual(metrics.viewport + 1)

  await page.screenshot({ path: 'test-results/h1-02-progetta-mobile.png', fullPage: true })
})

async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await Promise.all([
    page.waitForURL(/\/workspace(?:$|\?)/, { timeout: 30_000 }),
    page.getByRole('button', { name: 'Entra nel tuo spazio docente' }).click(),
  ])
}
