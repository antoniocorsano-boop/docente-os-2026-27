import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('MDS-6 — il Copilota TODAY usa la coda governata di chiusura giornata', async ({ page }, testInfo) => {
  await loginE2E(page)

  const response = await page.goto('/planner')
  if (!response) throw new Error('No navigation response for /planner')
  expect(response.status()).toBeLessThan(400)

  const trigger = page.getByRole('button', { name: /Chiedi a DOCENTE OS/i })
  await expect(trigger).toBeVisible({ timeout: 30_000 })
  await trigger.click()

  const input = page.getByRole('textbox', { name: 'Domanda per l’assistente contestuale' })
  await expect(input).toBeVisible()
  await input.fill('Cosa devo sistemare prima di domani?')
  await page.getByRole('button', { name: 'Invia domanda' }).click()

  await expect(page.getByText('Prima di domani', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(
    page.getByText(/Da sistemare, in ordine|Non risultano decisioni aperte|coda governata di chiusura non è stata caricata/i).first(),
  ).toBeVisible()
  await expect(page.getByText(/sola lettura|Non ricostruisco priorità per deduzione/i).first()).toBeVisible()

  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, `${safe(testInfo.project.name)}--today-copilot-day-review.png`),
    fullPage: true,
  })
})

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
