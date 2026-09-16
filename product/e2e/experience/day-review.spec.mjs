import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('MDS-5 — il resoconto chiude oggi e prepara domani senza scritture implicite', async ({ page }, testInfo) => {
  await loginE2E(page)

  const response = await page.goto('/giornata/resoconto')
  if (!response) throw new Error('No navigation response for /giornata/resoconto')
  expect(response.status()).toBeLessThan(400)

  await expect(page.getByText('RESOCONTO DELLA GIORNATA').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Chiudi oggi, prepara domani' })).toBeVisible()
  await expect(page.getByLabel('Stato chiusura giornata')).toBeVisible()
  await expect(page.getByText('Oggi · lezioni concluse').first()).toBeVisible()
  await expect(page.getByText('Dal Diario · continuità e idee emerse').first()).toBeVisible()
  await expect(page.getByText('Domani · pacchetti delle lezioni').first()).toBeVisible()
  await expect(page.getByRole('link', { name: '← Oggi' })).toHaveAttribute('href', '/planner')
  await expect(page.getByRole('link', { name: 'Apri la vista completa dei materiali di domani' })).toHaveAttribute('href', '/materiali/domani')

  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, `${safe(testInfo.project.name)}--journey-day-review.png`),
    fullPage: true,
  })
})

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
