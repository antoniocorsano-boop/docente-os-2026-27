import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { experienceUdaFixtureTitle } from '../support/experience-uda-fixture.mjs'

requireE2ECredentials()

const outputRoot = process.env.EXPERIENCE_OUTPUT_DIR ?? 'test-results/experience'

for (const journey of [
  { id: 'class-next-task', label: 'Classe → prossimo compito', run: classNextTask },
  { id: 'uda-reading', label: 'Progetta → UDA', run: udaReading },
  { id: 'knowledge-document', label: 'Conoscenza → documento', run: knowledgeDocument },
  { id: 'calendar-controls', label: 'Calendario → controlli intenzionali', run: calendarControls },
]) {
  test(`Journey: ${journey.label}`, async ({ page }, testInfo) => {
    await loginE2E(page)
    const result = await journey.run(page, testInfo)
    await recordJourney(testInfo.project.name, journey, result)
  })
}

async function classNextTask(page, testInfo) {
  await page.goto('/classi')
  const firstClass = page.locator('a.canonicalClassCard').first()
  if (!(await firstClass.count())) return na('Nessuna classe configurata nel profilo tecnico.')

  await firstClass.click()
  await expect(page.locator('.classLessonFocus')).toBeVisible()
  await expect(page.locator('h1').first()).toBeVisible()
  const primary = page.locator('.classLessonFocusActions a.primary').first()
  if (await primary.count()) await expect(primary).toBeVisible()
  await screenshot(page, testInfo, 'class-next-task')
  return pass(await page.locator('h1').first().innerText())
}

async function udaReading(page, testInfo) {
  const expectedTitle = experienceUdaFixtureTitle()
  await page.goto('/progetta?grade=prima')
  const udaGroup = page.locator('.progettaGroup').filter({ hasText: /Unità di apprendimento|UDA/i }).first()
  await expect(
    udaGroup,
    'Progetta deve esporre il gruppo UDA dopo il provisioning della fixture tecnica.',
  ).toBeVisible()

  const resource = udaGroup.locator('.progettaItems a').filter({ hasText: expectedTitle }).first()
  await expect(
    resource,
    'La UDA tecnica della run corrente deve essere raggiungibile da Progetta; la sua assenza è un FAIL di copertura.',
  ).toBeVisible()

  await resource.click()
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.locator('.provenanceBar, .focusedKnowledgeHero').first()).toBeVisible()
  await screenshot(page, testInfo, 'uda-reading')
  return pass(await page.locator('h1').first().innerText())
}

async function knowledgeDocument(page, testInfo) {
  await page.goto('/knowledge')
  const resource = page.locator('a.knowledgeAssetRow').first()
  if (!(await resource.count())) return na('La Conoscenza tecnica non contiene ancora documenti.')

  await resource.click()
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Contesto del contenuto' })).toBeVisible()
  await screenshot(page, testInfo, 'knowledge-document')
  return pass(await page.locator('h1').first().innerText())
}

async function calendarControls(page, testInfo) {
  await page.goto('/calendario')
  await expect(page.locator('.humanTaskFocus')).toBeVisible()
  await expect(page.locator('.calendarBoundary')).toBeVisible()
  const add = page.locator('details.calendarAdd')
  await expect(add).toBeVisible()
  if (!(await add.getAttribute('open') !== null)) await add.locator(':scope > summary').click()

  const choices = add.locator('details.calendarAddChoice')
  await expect(choices).toHaveCount(2)
  const dayForm = choices.nth(0).locator('form')
  const eventForm = choices.nth(1).locator('form')

  await expect(dayForm).not.toBeVisible()
  await expect(eventForm).not.toBeVisible()

  await choices.nth(0).locator('summary').click()
  await expect(dayForm).toBeVisible()
  await expect(eventForm).not.toBeVisible()
  await screenshot(page, testInfo, 'calendar-controls')

  await choices.nth(1).locator('summary').click()
  await expect(dayForm).not.toBeVisible()
  await expect(eventForm).toBeVisible()

  return pass('Una sola modalità di registrazione è aperta per volta.')
}

async function recordJourney(project, journey, result) {
  const dir = path.join(outputRoot, 'journeys')
  await fs.mkdir(dir, { recursive: true })
  const payload = {
    schemaVersion: 1,
    id: journey.id,
    label: journey.label,
    project,
    status: result.status,
    note: result.note,
    capturedAt: new Date().toISOString(),
  }
  await fs.writeFile(path.join(dir, `${safe(project)}--${safe(journey.id)}.json`), `${JSON.stringify(payload, null, 2)}\n`)
}

async function screenshot(page, testInfo, name) {
  const dir = path.join(outputRoot, 'screenshots')
  await fs.mkdir(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, `${safe(testInfo.project.name)}--journey-${safe(name)}.png`), fullPage: true })
}

function pass(note) { return { status: 'PASS', note } }
function na(note) { return { status: 'NOT_APPLICABLE', note } }
function safe(value) { return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-') }
