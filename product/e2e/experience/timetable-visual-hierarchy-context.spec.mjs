import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const MOBILE_VIEWPORTS = [
  { width: 360, height: 800, label: 'mobile-compact' },
  { width: 390, height: 844, label: 'mobile-medium' },
  { width: 412, height: 915, label: 'mobile-pilot' },
  { width: 768, height: 1024, label: 'tablet-portrait' },
]

function viewportsFor(testInfo) {
  return testInfo.project.name.startsWith('mobile')
    ? MOBILE_VIEWPORTS
    : [{ width: 1440, height: 1000, label: 'desktop' }]
}

async function expectNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(geometry.scrollWidth, `${label}: il percorso guidato non deve creare overflow orizzontale.`)
    .toBeLessThanOrEqual(geometry.clientWidth + 1)
}

test('Orario guidato · passo 1: mostra solo modifica e continuazione', async ({ page }, testInfo) => {
  await loginE2E(page)

  for (const viewport of viewportsFor(testInfo)) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/orario/aggiorna')

    await expect(page.getByRole('heading', { level: 1, name: 'Modifica orario' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Orario settimanale' })).toBeVisible()
    await expect(page.locator('[data-visual-priority="operational-primary"]')).toHaveCount(1)
    await expect(page.locator('[data-visual-priority="decision-primary"]')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Continua', exact: true })).toBeVisible()
    await expect(page.getByText('Controllo monte ore')).toHaveCount(0)
    await expect(page.getByText('Importa da PDF o foto')).toHaveCount(0)
    await expectNoHorizontalOverflow(page, viewport.label)
  }
})

test('Orario guidato · passo 2: chiede soltanto la data', async ({ page }, testInfo) => {
  await loginE2E(page)

  for (const viewport of viewportsFor(testInfo)) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/orario/aggiorna?fase=data')

    await expect(page.getByRole('heading', { level: 1, name: 'Da quando deve valere?' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Da quando vuoi usare questo orario?' })).toBeVisible()
    await expect(page.getByLabel('In uso dal')).toBeVisible()
    await expect(page.getByRole('table', { name: 'Orario settimanale' })).toHaveCount(0)
    await expect(page.locator('[data-visual-priority="decision-primary"]')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Torna a modificare' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continua' })).toBeVisible()
    await expectNoHorizontalOverflow(page, viewport.label)
  }
})

test('Orario guidato · passo 3: mostra risultato e una sola decisione finale', async ({ page }, testInfo) => {
  await loginE2E(page)

  for (const viewport of viewportsFor(testInfo)) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/orario/aggiorna?fase=controllo')

    await expect(page.getByRole('heading', { level: 1, name: 'Controlla e attiva' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Questo sarà il nuovo orario' })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Orario settimanale' })).toBeVisible()
    await expect(page.locator('[data-visual-priority="operational-primary"]')).toHaveCount(1)
    await expect(page.locator('[data-visual-priority="decision-primary"]')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'Torna a modificare' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Metti in uso' }).or(page.getByRole('link', { name: 'Cambia la data' })),
    ).toBeVisible()
    await expect(page.getByText('Importa da PDF o foto')).toHaveCount(0)
    await expectNoHorizontalOverflow(page, viewport.label)
  }
})

test('La vecchia route Gestisci confluisce nel controllo guidato', async ({ page }) => {
  await loginE2E(page)
  await page.goto('/orario/gestisci')
  await expect(page).toHaveURL(/\/orario\/aggiorna\?fase=controllo/)
})
