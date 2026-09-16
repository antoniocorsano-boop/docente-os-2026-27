import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('MDS-4 — domani espone solo pacchetti governati e apre la lezione selezionata', async ({ page }, testInfo) => {
  await loginE2E(page)

  const response = await page.goto('/materiali/domani')
  if (!response) throw new Error('No navigation response for /materiali/domani')
  expect(response.status()).toBeLessThan(400)
  await expect(page.getByText('MATERIALI DI DOMANI').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('h1').first()).toContainText('Lezioni predisposte per')

  const openPack = page.getByRole('link', { name: 'Apri pacchetto' })
  if (await openPack.count()) {
    await openPack.first().click()
    await expect(page.getByText('MATERIALI DI DOMANI').first()).toBeVisible({ timeout: 30_000 })

    const viewNav = page.getByRole('navigation', { name: 'Scegli la vista dei materiali' })
    if (await viewNav.count()) {
      await expect(viewNav).toBeVisible()
      await expect(page.getByRole('link', { name: '← Tutte le lezioni di domani' })).toBeVisible()
    } else {
      await expect(
        page.locator('[data-roleview-status="blocked"], h1:has-text("Il pacchetto richiesto non è disponibile")').first(),
        'Un pacchetto non risolvibile deve restare fail-closed.',
      ).toBeVisible()
    }
  } else {
    await expect(
      page.getByText(/Domani non risultano lezioni da predisporre|Non posso predisporre le lezioni di domani/).first(),
      'Un giorno senza pacchetti deve spiegare il motivo senza inventare lezioni.',
    ).toBeVisible()
  }

  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, `${safe(testInfo.project.name)}--journey-tomorrow-materials.png`),
    fullPage: true,
  })
})

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
