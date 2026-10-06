import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from './support/e2e-auth.mjs'

requireE2ECredentials()

const expectedRuntimeSha = process.env.EXPECTED_RUNTIME_SHA
const expectedDeployId = process.env.EXPECTED_DEPLOY_ID
const marker = process.env.CANARY_MARKER
const effectiveDate = process.env.CANARY_EFFECTIVE_DATE

for (const [name, value] of Object.entries({
  EXPECTED_RUNTIME_SHA: expectedRuntimeSha,
  EXPECTED_DEPLOY_ID: expectedDeployId,
  CANARY_MARKER: marker,
  CANARY_EFFECTIVE_DATE: effectiveDate,
})) {
  if (!value) throw new Error(`${name} is required for DOS-M4 runtime canary`)
}

function writeReceipt(receipt) {
  const outputDir = path.join(process.cwd(), 'test-results', 'dos-m4-canary')
  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(path.join(outputDir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
}

test('DOS-M4-01 runtime canary: Orario persists, activates and preserves lineage', async ({ page, request }) => {
  test.setTimeout(240_000)

  const buildInfoResponse = await request.get('/api/build-info')
  expect(buildInfoResponse.ok()).toBeTruthy()
  const buildInfo = await buildInfoResponse.json()
  expect(buildInfo.commit).toBe(expectedRuntimeSha)

  await loginE2E(page)

  await page.goto('/orario/gestisci')
  await expect(page.getByRole('heading', { name: 'Gestisci orario' })).toBeVisible()
  const archivedBefore = await page.getByText('Archiviata', { exact: true }).count()
  const hadActiveBefore = (await page.getByText('Attiva', { exact: true }).count()) > 0

  await page.goto('/orario/aggiorna')
  await expect(page.getByRole('heading', { name: 'Modifica orario' })).toBeVisible()

  const emptyCell = page.locator('button[aria-label^="Aggiungi attività:"]:visible').first()
  await expect(emptyCell, 'La canary richiede almeno una cella vuota visibile nell’account E2E governato').toBeVisible()
  await emptyCell.click()

  await expect(page.getByRole('heading', { name: 'Nuova voce' })).toBeVisible()
  await page.getByLabel('Che cosa fai in quest’ora?').selectOption({ label: 'Altro' })
  await page.getByText('Dettagli opzionali', { exact: true }).click()
  await page.getByLabel('Nota').fill(marker)
  await page.getByRole('button', { name: 'Aggiungi all’orario' }).click()

  const markerCell = page.locator('.occupiedTimetableCell').filter({ hasText: marker })
  await expect(markerCell).toHaveCount(1)

  await page.reload()
  await expect(page.locator('.occupiedTimetableCell').filter({ hasText: marker })).toHaveCount(1)

  await page.goto('/orario/aggiorna?fase=controllo')
  await page.getByLabel('Data di decorrenza').fill(effectiveDate)
  const activateButton = page.getByRole('button', { name: /^(?:Metti in uso|Attiva orario) dal / })
  await expect(activateButton).toBeEnabled()
  await activateButton.click()
  await page.waitForURL(/\/orario(?:\?.*)?$/, { timeout: 30_000 })

  await expect(page.getByText(/In uso dal/)).toBeVisible()
  await expect(page.locator('.occupiedTimetableCell').filter({ hasText: marker })).toHaveCount(1)

  await page.reload()
  await expect(page.locator('.occupiedTimetableCell').filter({ hasText: marker })).toHaveCount(1)

  await page.goto('/orario/gestisci')
  await expect(page.getByRole('heading', { name: 'Gestisci orario' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Versioni precedenti' })).toBeVisible()

  const archivedAfter = await page.getByText('Archiviata', { exact: true }).count()
  const activeAfter = await page.getByText('Attiva', { exact: true }).count()
  expect(activeAfter).toBeGreaterThanOrEqual(1)
  expect(archivedAfter).toBeGreaterThanOrEqual(archivedBefore + (hadActiveBefore ? 1 : 0))

  writeReceipt({
    id: 'EV-MAT-DOS-RUNTIME-CANARY-2026-10-06',
    type: 'RUNTIME_CANARY',
    area: 'docente-os',
    status: 'PASS',
    observedAt: new Date().toISOString(),
    confidence: 'HIGH',
    freshness: { policy: 'RUNTIME_BOUND' },
    supports: [{ level: 4 }],
    source: {
      repository: 'antoniocorsano-boop/docente-os-2026-27',
      ref: expectedDeployId,
    },
    binding: {
      areaRef: 'docente-os',
      releaseRef: expectedDeployId,
      exactHead: expectedRuntimeSha,
    },
    runtime: {
      buildInfo,
      baseUrl: process.env.E2E_BASE_URL,
    },
    canary: {
      marker,
      effectiveDate,
      draftPersistenceVerified: true,
      activationVerified: true,
      activePersistenceAfterReloadVerified: true,
      historyVerified: true,
      hadActiveBefore,
      archivedBefore,
      archivedAfter,
      activeAfter,
    },
  })
})
