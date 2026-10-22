import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: legacy Registra → gate docente nella Lezione unificata', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')

  const classCard = page.locator('a.canonicalClassCard').filter({ hasText: /2ª\s*A/i }).first()
  await expect(classCard, 'La fixture HVA deve avere una 2ª A utilizzabile.').toBeVisible()
  const sectionId = sectionIdFromHref(await classCard.getAttribute('href'))

  await page.goto(`/classi/${encodeURIComponent(sectionId)}/lezioni/B01?mode=record`)

  await expect(page.locator('[data-lesson-shell]')).toBeVisible()
  await expect(page.locator('[data-lesson-phase]')).toHaveCount(0)
  await expect(
    page.getByText(/Curricolo da rivalidare|Conferma del docente richiesta|La preparazione è cambiata/).first(),
    'Un deep link legacy alla registrazione non deve bypassare il gate di preparazione della Lezione.',
  ).toBeVisible()

  await expect(
    page.locator('form').filter({ hasText: 'Conferma ciò che hai svolto' }),
    'Il form di registrazione non deve essere disponibile prima dell’approvazione docente.',
  ).toHaveCount(0)
  await expect(page.locator('a[href*="mode="]')).toHaveCount(0)

  await screenshot(page, testInfo, 'lesson-record-approval-gate')
  await recordJourney(testInfo.project.name, {
    status: 'PASS',
    note: 'Il deep link legacy Registra resta accettato in ingresso, ma la Lezione unificata risolve il gate di preparazione senza reintrodurre fasi navigabili.',
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
    id: 'lesson-record-approval-gate',
    label: 'Legacy Registra → gate docente nella Lezione unificata',
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--lesson-record-approval-gate.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

function sectionIdFromHref(value) {
  const match = typeof value === 'string' ? value.match(/^\/classi\/([^/?#]+)$/) : null
  if (!match) throw new Error(`Section id not found in class href: ${value}`)
  return decodeURIComponent(match[1])
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
