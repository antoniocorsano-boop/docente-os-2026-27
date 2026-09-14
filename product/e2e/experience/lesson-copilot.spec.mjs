import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('V1-C1: Classe → Lezione → copilota contestuale → fallback senza provider', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')

  const classCard = page.locator('a.canonicalClassCard').filter({ hasText: /2ª\s*A/i }).first()
  await expect(classCard, 'La fixture governata deve offrire una 2ª A con percorso didattico.').toBeVisible()
  const classHref = await classCard.getAttribute('href')
  if (!classHref) throw new Error('Missing class href')

  await page.goto(classHref)
  const lessonLink = page.locator('a[href*="/lezioni/"]').first()
  await expect(lessonLink, 'La Classe deve offrire almeno un entry point Lezione per il copilota.').toBeVisible()
  const lessonHref = await lessonLink.getAttribute('href')
  if (!lessonHref) throw new Error('Missing lesson href')

  await page.goto(lessonHref)
  await expect(page.getByRole('button', { name: /Chiedi a DOCENTE OS/i })).toBeVisible()
  await page.getByRole('button', { name: /Chiedi a DOCENTE OS/i }).click()

  const panel = page.locator('.dosAssistantPanel')
  await expect(panel).toContainText('COPILOTA DELLA LEZIONE')
  await expect(panel).toContainText('Propone, non modifica')
  await expect(panel).toContainText(/2ª\s*A/i)

  // Failure injection: the product must remain useful even if the model/provider path fails.
  await page.route('**/api/assistant/lesson-respond', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"simulated_provider_failure"}' })
  })

  const input = page.getByRole('textbox', { name: 'Domanda per l’assistente contestuale' })
  await input.fill('Cosa devo preparare e cosa è già pronto?')
  await page.getByRole('button', { name: 'Invia domanda' }).click()

  const assistantBubble = page.locator('.dosAssistantBubble.assistant').last()
  await expect(assistantBubble).toContainText('Per preparare questa lezione')
  await expect(assistantBubble).toContainText('Già pronto')
  await expect(assistantBubble).toContainText(/non modifico|non modifica/i)

  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(geometry.document, 'Il copilota non deve introdurre overflow orizzontale.').toBeLessThanOrEqual(geometry.viewport)

  await screenshot(page, testInfo, 'lesson-copilot-fallback')
  await recordJourney(testInfo.project.name, {
    status: 'PASS',
    note: 'Lezione reale → context-bound copilot → provider failure → fallback utile senza perdita del task manuale',
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
    id: 'lesson-copilot-fallback',
    label: 'Classe → Lezione → copilota contestuale → fallback senza provider',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--lesson-copilot-fallback.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
