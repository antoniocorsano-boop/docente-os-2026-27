import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('MDS-1 — il pacchetto standard espone la mappa visuale già presente nel bundle canonico', async ({ page }, testInfo) => {
  await loginE2E(page)

  const response = await page.goto('/materiali/prossima')
  if (!response) throw new Error('No navigation response for /materiali/prossima')
  expect(response.status()).toBeLessThan(400)
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 })

  const viewNav = page.getByRole('navigation', { name: 'Scegli la vista dei materiali' })
  if (!await viewNav.count()) {
    await expect(
      page.locator('[data-roleview-status="blocked"], h1:has-text("La preparazione non è disponibile")').first(),
      'La superficie deve restare fail-closed quando il bundle canonico non è disponibile.',
    ).toBeVisible()
    return
  }

  const visual = page.getByRole('button', { name: 'Mappa visuale' })
  await expect(visual).toBeVisible()
  await visual.click()
  await expect(visual).toHaveAttribute('aria-pressed', 'true')

  const map = page.getByRole('region', { name: 'Mappa visuale della lezione' })
  await expect(map).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mappa visuale', level: 2 }).first()).toBeVisible()
  expect(await map.getByRole('listitem').count()).toBeGreaterThan(0)

  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, `${safe(testInfo.project.name)}--journey-lesson-materials-standard-pack.png`),
    fullPage: true,
  })
})

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
