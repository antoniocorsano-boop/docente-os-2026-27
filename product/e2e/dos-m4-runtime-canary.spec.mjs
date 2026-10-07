import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { loginE2E, requireE2ECredentials } from './support/e2e-auth.mjs'

const EXPECTED_HEAD = process.env.DOS_M4_EXPECTED_HEAD
const RELEASE_REF = process.env.DOS_M4_RELEASE_REF
const REPOSITORY = process.env.GITHUB_REPOSITORY ?? 'antoniocorsano-boop/docente-os-2026-27'

function isoRomeToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function italianDateToIso(value) {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null
}

function addDaysIso(value, days) {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function ensureDetailsOpen(details) {
  if (!(await details.evaluate((node) => node.open))) {
    await details.locator('summary').click()
  }
}

async function chooseEffectiveDate(page, activeDateIso = null) {
  const input = page.locator('input[name="effectiveFrom"]')
  await expect(input).toBeVisible()
  const min = await input.getAttribute('min')
  const max = await input.getAttribute('max')
  if (!min || !max) throw new Error('Timetable effective-date bounds are missing')

  let candidate = isoRomeToday()
  if (candidate < min) candidate = min
  if (activeDateIso && candidate <= activeDateIso) candidate = addDaysIso(activeDateIso, 1)
  if (candidate > max) throw new Error(`No valid canary effective date remains inside academic year (${min}..${max})`)

  await input.fill(candidate)
  return candidate
}

async function mutateDraft(page, marker) {
  await page.goto('/orario/aggiorna', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Modifica orario' })).toBeVisible()
  await expect(page.locator('.visualTimetable')).toBeVisible()

  const emptyCell = page.locator('button.emptyTimetableCell:visible').first()
  if (await emptyCell.count()) {
    await emptyCell.click()
    const editor = page.locator('.timetableEditor')
    await expect(editor).toBeVisible()
    await editor.locator('select[name="kind"]').selectOption('OTHER')
    const optional = editor.locator('details.editorOptionalDetails')
    await ensureDetailsOpen(optional)
    await editor.locator('input[name="note"]').fill(marker)
    await editor.getByRole('button', { name: 'Aggiungi', exact: true }).click()
    await expect(editor).toBeHidden()
    return { mutation: 'ADD_OTHER_SLOT', marker }
  }

  const occupiedCell = page.locator('button.occupiedTimetableCell:visible').first()
  if (!(await occupiedCell.count())) throw new Error('No editable timetable cell is available for the runtime canary')
  await occupiedCell.click()
  const editor = page.locator('.timetableEditor')
  await expect(editor).toBeVisible()
  const optional = editor.locator('details.editorOptionalDetails')
  await ensureDetailsOpen(optional)
  const note = editor.locator('input[name="note"]')
  const previous = await note.inputValue()
  const next = [previous.trim(), marker].filter(Boolean).join(' · ').slice(0, 1000)
  await note.fill(next)
  await editor.getByRole('button', { name: 'Salva modifiche', exact: true }).click()
  await expect(editor).toBeHidden()
  return { mutation: 'APPEND_SLOT_NOTE', marker, previousNotePreserved: Boolean(previous.trim()) }
}

async function activateDraft(page, marker, activeDateIso = null) {
  const mutation = await mutateDraft(page, marker)

  await page.getByRole('link', { name: 'Continua', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Da quando deve valere?' })).toBeVisible()
  const effectiveFrom = await chooseEffectiveDate(page, activeDateIso)
  await page.getByRole('button', { name: 'Continua', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Controlla e attiva' })).toBeVisible()
  await expect(page.getByText(marker, { exact: false }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Metti in uso', exact: true }).click()
  await page.waitForURL(/\/orario\?feedback=timetable_activated/, { timeout: 30_000 })

  await expect(page.getByRole('heading', { name: 'Il tuo orario' })).toBeVisible()
  await expect(page.locator('.timetableHero')).toContainText('In uso dal')
  await expect(page.getByText(marker, { exact: false }).first()).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Il tuo orario' })).toBeVisible()
  await expect(page.getByText(marker, { exact: false }).first()).toBeVisible()

  return { ...mutation, effectiveFrom }
}

async function verifyNextDraftCopy(page, marker) {
  await page.goto('/orario/aggiorna', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Modifica orario' })).toBeVisible()
  await expect(page.getByText(marker, { exact: false }).first()).toBeVisible()
}

test.beforeAll(() => {
  requireE2ECredentials()
  if (!EXPECTED_HEAD) throw new Error('DOS_M4_EXPECTED_HEAD is required')
  if (!RELEASE_REF) throw new Error('DOS_M4_RELEASE_REF is required')
})

test('DOS-M4 real timetable canary is persistent, version-bound and creates replacement lineage', async ({ page, request }) => {
  const observedAt = new Date().toISOString()
  const buildResponse = await request.get('/api/build-info')
  expect(buildResponse.ok()).toBeTruthy()
  const buildInfo = await buildResponse.json()
  expect(buildInfo.commit).toBe(EXPECTED_HEAD)

  await loginE2E(page)
  await page.goto('/orario', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Il tuo orario' })).toBeVisible()

  const initialHero = await page.locator('.timetableHero').innerText()
  const initialActiveDateIso = italianDateToIso(initialHero)
  const hadInitialActive = Boolean(initialActiveDateIso)
  const markerBase = `DOS-M4-CANARY-${Date.now()}`
  const activations = []

  activations.push(await activateDraft(page, markerBase, initialActiveDateIso))

  if (!hadInitialActive) {
    const historyMarker = `${markerBase}-HISTORY`
    activations.push(await activateDraft(page, historyMarker, activations[0].effectiveFrom))
  }

  const finalActivation = activations.at(-1)
  await page.goto('/orario', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(finalActivation.marker, { exact: false }).first()).toBeVisible()
  await mkdir('test-results', { recursive: true })
  await page.screenshot({ path: 'test-results/dos-m4-runtime-canary-active.png', fullPage: true })

  await verifyNextDraftCopy(page, finalActivation.marker)
  await page.screenshot({ path: 'test-results/dos-m4-runtime-canary-next-draft.png', fullPage: true })

  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : 'local'
  const receipt = [
    'id: EV-MAT-DOS-RUNTIME-CANARY-BROWSER-2026-10-07',
    'type: RUNTIME_CANARY_BROWSER',
    'area: docente-os',
    'status: PASS',
    'source:',
    `  repository: ${REPOSITORY}`,
    `  ref: ${RELEASE_REF}`,
    `observedAt: "${observedAt}"`,
    'freshness:',
    '  policy: RUNTIME_BOUND',
    'confidence: HIGH',
    'binding:',
    '  areaRef: docente-os',
    `  releaseRef: ${RELEASE_REF}`,
    `  exactHead: ${EXPECTED_HEAD}`,
    'evidence:',
    `  workflowRun: "${runUrl}"`,
    '  aal2: true',
    '  realSupabase: true',
    '  persistedAfterReload: true',
    '  replacementPerformed: true',
    '  nextDraftCopyObserved: true',
    '  historyObservation: EXTERNAL_READ_ONLY_REQUIRED',
    `  activationCount: ${activations.length}`,
    `  finalMarker: "${finalActivation.marker}"`,
    `  effectiveFrom: ${finalActivation.effectiveFrom}`,
    '',
  ].join('\n')

  await writeFile('test-results/dos-m4-runtime-canary-browser-receipt.yaml', receipt, 'utf8')
})
