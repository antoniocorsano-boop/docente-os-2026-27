import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('V1-C1: accesso diretto a Teach → gate docente prima del copilota', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')

  const classCard = page.locator('a.canonicalClassCard').filter({ hasText: /2ª\s*A/i }).first()
  await expect(classCard, 'La fixture governata deve offrire una 2ª A con percorso didattico.').toBeVisible()
  const classHref = await classCard.getAttribute('href')
  if (!classHref) throw new Error('Missing class href')

  await page.goto(classHref)
  const lessonLink = page.locator('a[href*="/lezioni/"]').first()
  await expect(lessonLink, 'La Classe deve offrire almeno un entry point Lezione.').toBeVisible()
  const lessonHref = await lessonLink.getAttribute('href')
  if (!lessonHref) throw new Error('Missing lesson href')

  const lessonPath = lessonHref.split('?')[0]
  await page.goto(`${lessonPath}?mode=teach`)

  await expect(page).toHaveURL(/mode=prepare&approval=required/)
  await expect(
    page.getByText(/Curricolo da rivalidare|Conferma del docente richiesta|La preparazione è cambiata/).first(),
    'Teach deve restare dietro il confine di approvazione docente.',
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Chiedi a DOCENTE OS/i }),
    'Il copilota operativo della lezione non deve aprirsi prima dell’approvazione.',
  ).toHaveCount(0)

  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(geometry.document, 'Il gate docente non deve introdurre overflow orizzontale.').toBeLessThanOrEqual(geometry.viewport)

  await screenshot(page, testInfo, 'lesson-teach-approval-gate')
  await recordJourney(testInfo.project.name, {
    status: 'PASS',
    note: 'Teach e copilota restano inaccessibili finché la preparazione corrente non è stata esplicitamente approvata dal docente.',
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
    id: 'lesson-teach-approval-gate',
    label: 'Accesso diretto a Teach → gate docente prima del copilota',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--lesson-teach-approval-gate.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
