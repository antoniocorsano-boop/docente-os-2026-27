import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

test('Journey: accesso diretto a Registra → gate docente → Prima della lezione', async ({ page }, testInfo) => {
  await loginE2E(page)
  await page.goto('/classi')

  const classCard = page.locator('a.canonicalClassCard').filter({ hasText: /2ª\s*A/i }).first()
  await expect(classCard, 'La fixture HVA deve avere una 2ª A utilizzabile.').toBeVisible()
  const sectionId = sectionIdFromHref(await classCard.getAttribute('href'))

  await page.goto(`/classi/${encodeURIComponent(sectionId)}/lezioni/B01?mode=record`)

  await expect(page).toHaveURL(
    new RegExp(`/classi/${escapeRegExp(encodeURIComponent(sectionId))}/lezioni/B01\\?mode=prepare&approval=required`),
  )

  await expect(
    page.getByText(/Curricolo da rivalidare|Conferma del docente richiesta|La preparazione è cambiata/).first(),
    'Una lezione futura non deve entrare direttamente nella registrazione senza una preparazione approvata.',
  ).toBeVisible()

  await expect(
    page.locator('form').filter({ hasText: 'Conferma ciò che hai svolto' }),
    'Il form di registrazione non deve essere disponibile prima dell’approvazione docente.',
  ).toHaveCount(0)

  await screenshot(page, testInfo, 'lesson-record-approval-gate')
  await recordJourney(testInfo.project.name, {
    status: 'PASS',
    note: 'L’accesso diretto a Registra viene riportato a Prima della lezione; nessuna superficie operativa è disponibile senza una ricevuta di approvazione corrente.',
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
    label: 'Accesso diretto a Registra → gate docente → Prima della lezione',
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function safe(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
}
