import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('LP-3B — Materiali prossima lezione: viste operative o fail-closed esplicito', async ({ page }, testInfo) => {
  await loginE2E(page)

  const response = await page.goto('/materiali/prossima')
  if (!response) throw new Error('No navigation response for /materiali/prossima')
  expect(response.status()).toBeLessThan(400)
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 })

  const viewNav = page.getByRole('navigation', { name: 'Scegli la vista dei materiali' })
  const hasMaterialWorkspace = await viewNav.count()

  if (!hasMaterialWorkspace) {
    await expect(
      page.getByRole('heading', { name: 'La preparazione non è disponibile con sufficiente certezza.' }),
      'Se la preparazione non è risolvibile, la superficie deve fallire chiusa in modo esplicito.',
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Torna a Oggi' })).toBeVisible()
    await screenshot(page, testInfo, 'lesson-materials-fail-closed')
    return
  }

  await expect(page.getByText(/Materiali pronti|Da rivedere/).first()).toBeVisible()

  const lim = page.getByRole('button', { name: 'Proietta' })
  const student = page.getByRole('button', { name: 'Scheda studenti' })
  const teacher = page.getByRole('button', { name: 'Guida docente' })

  await expect(lim).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Controlli proiezione' })).toBeVisible()
  await screenshot(page, testInfo, 'lesson-materials-lim')

  await student.click()
  await expect(student).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Scheda studenti', level: 2 }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Schede studenti stampabili' })).toBeVisible()
  await screenshot(page, testInfo, 'lesson-materials-student')

  await teacher.click()
  await expect(teacher).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Guida docente', level: 2 }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Guida docente' })).toBeVisible()
  await screenshot(page, testInfo, 'lesson-materials-teacher')

  await lim.click()
  await expect(lim).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Controlli proiezione' })).toBeVisible()

  const next = page.getByRole('button', { name: 'Avanti' })
  if (await next.isEnabled()) {
    await next.click()
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()
  }
})

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, `${safe(testInfo.project.name)}--journey-${safe(name)}.png`),
    fullPage: true,
  })
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
