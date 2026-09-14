import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: Lezione → Registra → Fatto senza modello interno', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')

  const classCard = page.locator('a.canonicalClassCard').filter({ hasText: /2ª\s*A/i }).first()
  await expect(classCard, 'La fixture HVA deve avere una 2ª A utilizzabile.').toBeVisible()
  const classHref = await classCard.getAttribute('href')
  const sectionId = sectionIdFromHref(classHref)

  await page.goto(`/classi/${encodeURIComponent(sectionId)}/lezioni/B01?mode=record`)

  const closeCard = page.locator('form').filter({ hasText: 'Conferma ciò che hai svolto' }).first()
  await expect(closeCard).toBeVisible()
  await expect(closeCard).toContainText('Data della lezione')
  await expect(closeCard).toContainText('Minuti effettivi')
  await expect(closeCard).toContainText('Cosa succede quando registri')
  await expect(closeCard).toContainText('Il percorso annuale non viene segnato automaticamente come completato')

  await expect(closeCard, 'Il presenter docente non deve esporre il Product Model.').not.toContainText(/TeachingSession|AnnualPlanBlockProgress|EvidenceReference|Piano annuale:\s|attribuisce i minuti a B01/)

  const primaryActions = closeCard.locator('button.primary')
  await expect(primaryActions, 'UX-0D richiede una sola CTA primaria visibile.').toHaveCount(1)
  await expect(primaryActions).toHaveText(/Registra e torna alla classe/)

  const beforeRegister = closeCard.locator('details').filter({ hasText: 'Prima di registrare' }).first()
  await expect(beforeRegister).toBeVisible()
  await expect(beforeRegister).not.toHaveAttribute('open', '')
  await expect(beforeRegister.getByRole('link', { name: 'Rivedi le osservazioni' })).toBeHidden()
  await expect(beforeRegister.getByRole('link', { name: 'Torna alla guida della lezione' })).toBeHidden()

  await beforeRegister.locator('summary').click()
  await expect(beforeRegister.getByRole('link', { name: 'Rivedi le osservazioni' })).toBeVisible()
  await expect(beforeRegister.getByRole('link', { name: 'Torna alla guida della lezione' })).toBeVisible()

  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(geometry.document, 'Registra non deve produrre overflow orizzontale.').toBeLessThanOrEqual(geometry.viewport)

  await screenshot(page, testInfo, 'lesson-close-task-first')
  await recordJourney(testInfo.project.name, {
    status: 'PASS',
    note: 'Registra espone data/durata, una CTA primaria e confini professionali in linguaggio docente; modello interno non visibile.',
  })
})

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${safe(testInfo.project.name)}--journey-${safe(name)}.png`), fullPage: true })
}

async function recordJourney(project, result) {
  const dir = path.join(outputRoot, 'journeys')
  await fs.mkdir(dir, { recursive: true })
  const payload = {
    schemaVersion: 1,
    id: 'lesson-close-task-first',
    label: 'Lezione → Registra → Fatto senza modello interno',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--lesson-close-task-first.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

function sectionIdFromHref(value) {
  const match = typeof value === 'string' ? value.match(/^\/classi\/([^/?#]+)$/) : null
  if (!match) throw new Error(`Section id not found in class href: ${value}`)
  return decodeURIComponent(match[1])
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
