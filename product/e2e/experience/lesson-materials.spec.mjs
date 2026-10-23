import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('RV-1 / LP-3B — Materiali prossima lezione: RoleView operativa o fail-closed esplicito', async ({ page }, testInfo) => {
  await loginE2E(page)

  const response = await page.goto('/materiali/prossima')
  if (!response) throw new Error('No navigation response for /materiali/prossima')
  expect(response.status()).toBeLessThan(400)
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 })

  const viewNav = page.getByRole('navigation', { name: 'Scegli la vista dei materiali' })
  const hasMaterialWorkspace = await viewNav.count()

  if (!hasMaterialWorkspace) {
    const blockedRoleView = page.locator('[data-roleview-status="blocked"]')
    if (await blockedRoleView.count()) {
      await expect(blockedRoleView).toBeVisible()
      await expect(blockedRoleView.getByRole('heading', { name: 'Preparazione della lezione bloccata' })).toBeVisible()
      await expect(blockedRoleView.getByRole('link', { name: 'Torna a Oggi' })).toBeVisible()
      await screenshot(page, testInfo, 'lesson-materials-roleview-blocked')
      return
    }

    await expect(
      page.getByRole('heading', { name: 'La preparazione non è disponibile con sufficiente certezza.' }),
      'Se la preparazione non è risolvibile, la superficie deve fallire chiusa in modo esplicito.',
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Torna a Oggi' })).toBeVisible()
    await screenshot(page, testInfo, 'lesson-materials-fail-closed')
    return
  }

  const roleView = page.locator('[data-roleview-status]')
  await expect(roleView, 'La superficie materiali deve mostrare la RoleView docente derivata dal manifesto.').toBeVisible()
  await expect(roleView.getByText(/PREPARAZIONE · (PRONTA|DA COMPLETARE)/)).toBeVisible()
  await expect(roleView.getByRole('definition')).toHaveCount(4)
  await expect(roleView.getByRole('link').first()).toBeVisible()
  await screenshot(page, testInfo, 'lesson-materials-roleview')

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

test('LP-4 — la nuova IA non genera la route materiali legacy', async ({ page }, testInfo) => {
  await loginE2E(page)

  let response = await page.goto('/planner')
  if (!response) throw new Error('No navigation response for /planner')
  expect(response.status()).toBeLessThan(400)
  await expect(page.getByRole('heading', { name: 'Oggi', level: 1 })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('a[href="/materiali/prossima"]')).toHaveCount(0)
  await screenshot(page, testInfo, 'lesson-materials-no-legacy-today')

  response = await page.goto('/')
  if (!response) throw new Error('No navigation response for /')
  expect(response.status()).toBeLessThan(400)
  await expect(page).toHaveURL(/\/planner(?:[?#]|$)/)
  await expect(page.getByRole('heading', { name: 'Oggi', level: 1 })).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('a[href="/materiali/prossima"]')).toHaveCount(0)

  response = await page.goto('/classi')
  if (!response) throw new Error('No navigation response for /classi')
  expect(response.status()).toBeLessThan(400)
  const classCard = page.locator('a.canonicalClassCard').first()
  await expect(classCard, 'La journey LP-4 richiede almeno una classe canonica nel workspace HVA.').toBeVisible({ timeout: 30_000 })
  await classCard.click()
  await expect(page.locator('details#altro-della-classe')).toHaveCount(1, { timeout: 30_000 })
  await expect(page.locator('a[href="/materiali/prossima"]')).toHaveCount(0)
  await screenshot(page, testInfo, 'lesson-materials-no-legacy-class')
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
