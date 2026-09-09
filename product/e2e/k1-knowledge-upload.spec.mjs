import { expect, test } from '@playwright/test'
import {
  deleteAllKnowledgeFixtures,
  deleteKnowledgeAsset,
  deleteOrphanedKnowledgeFixtureObjects,
  knowledgeFixtureAssetIds,
  knowledgeFixtureSnapshot,
  retainNewestKnowledgeFixture,
} from './support/knowledge-fixture-hygiene.mjs'
import { buildSchoolDocxFixture, schoolDocxCorpus } from './support/school-docx-corpus.mjs'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD
const fixtureName = 'k1-upload-recovery.txt'

if (!password) {
  throw new Error('E2E_PASSWORD is required for the authenticated K1 acceptance test')
}

test('K1 Knowledge: scelta file, conferma privacy, errore recuperabile, retry reale e cleanup', async ({ page }) => {
  await login(page)

  await retainNewestKnowledgeFixture(page, 'x3-responsible-ai')
  expect(await knowledgeFixtureAssetIds(page, 'x3-responsible-ai')).toHaveLength(1)
  await deleteAllKnowledgeFixtures(page, fixtureName)
  expect(await knowledgeFixtureAssetIds(page, fixtureName)).toHaveLength(0)
  let createdAssetId = null

  try {
    await openFileCapture(page)

    const upload = page.locator('input[type="file"][name="file"]')
    await upload.setInputFiles({
      name: fixtureName,
      mimeType: 'text/plain',
      buffer: Buffer.from('K1 upload acceptance. Contenuto autonomo per verificare recupero, trasferimento e organizzazione nella Conoscenza.'),
    })

    await expect(page.getByText('Pronto a caricare')).toBeVisible()
    const journey = page.getByRole('list', { name: 'Avanzamento del caricamento' })
    await expect(journey).toBeVisible()
    await expect(journey.getByText('File scelto')).toBeVisible()
    await expect(journey.getByText('Originale al sicuro')).toBeVisible()
    await expect(journey.getByText('Organizzato')).toBeVisible()

    const privacyConfirmation = page.getByRole('checkbox')
    await expect(privacyConfirmation).not.toBeChecked()
    await privacyConfirmation.check()
    await expect(privacyConfirmation).toBeChecked()

    await page.route('**/api/knowledge/upload', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, code: 'storage_failed' }),
      })
    })

    await page.getByRole('button', { name: 'Carica e organizza' }).click()

    const error = page.locator('.knowledgeUploadFeedback[role="alert"]')
    await expect(error).toContainText('Serve un intervento')
    await expect(error).toContainText('Il file non è stato salvato nello spazio privato')
    await expect(page.getByText(fixtureName)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Riprova' })).toBeVisible()
    await expect(journey.locator('.knowledgeUploadStep.problem')).toContainText('Originale al sicuro')
    await page.screenshot({ path: 'test-results/k1-01-recovery.png' })

    await page.unroute('**/api/knowledge/upload')
    await page.route('**/api/knowledge/upload', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700))
      await route.continue()
    })

    await page.getByRole('button', { name: 'Riprova' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Sto mettendo al sicuro l’originale' })).toBeVisible()
    await expect(journey.locator('.knowledgeUploadStep.active')).toContainText('Originale al sicuro')

    await page.waitForURL(/\/knowledge\/[^/?#]+$/, { timeout: 60_000 })
    createdAssetId = page.url().match(/\/knowledge\/([^/?#]+)/)?.[1] ?? null
    expect(createdAssetId).toBeTruthy()

    const contentContext = page.getByRole('region', { name: 'Contesto del contenuto' })
    await expect(contentContext).toBeVisible()
    await expect(contentContext.getByText('Pronto', { exact: true })).toBeVisible()
    await page.screenshot({ path: 'test-results/k1-02-complete.png' })

    await Promise.all([
      page.waitForURL(new RegExp(`/knowledge/${createdAssetId}\\?reprocess=ok$`), { timeout: 60_000 }),
      page.getByRole('button', { name: 'Aggiorna analisi' }).click(),
    ])
    await expect(page.getByRole('status').filter({ hasText: 'Analisi aggiornata.' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Non sono riuscito ad aggiornare l’analisi.' })).toHaveCount(0)
    await page.screenshot({ path: 'test-results/k1-02b-reprocess-success.png' })
  } finally {
    await page.unroute('**/api/knowledge/upload').catch(() => {})
    if (createdAssetId) await deleteKnowledgeAsset(page, createdAssetId)
    await deleteAllKnowledgeFixtures(page, fixtureName)
    expect(await knowledgeFixtureAssetIds(page, fixtureName)).toHaveLength(0)
  }
})

test('K1 Knowledge: i cinque documenti scolastici attraversano davvero DOCX → KB → contesto auto-organizzato', async ({ page }) => {
  await login(page)
  const fixtureNames = schoolDocxCorpus.map((fixture) => fixture.filename)
  const createdAssetIds = []

  try {
    for (const fixture of schoolDocxCorpus) {
      await deleteAllKnowledgeFixtures(page, fixture.filename)
      await openFileCapture(page)

      const buffer = await buildSchoolDocxFixture(fixture)
      await page.locator('input[type="file"][name="file"]').setInputFiles({
        name: fixture.filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer,
      })

      await expect(page.getByText('Pronto a caricare')).toBeVisible({ timeout: 15_000 })
      const privacyConfirmation = page.getByRole('checkbox')
      await privacyConfirmation.check()
      await page.getByRole('button', { name: 'Carica e organizza' }).click()
      await page.waitForURL(/\/knowledge\/[^/?#]+$/, { timeout: 60_000 })

      const assetId = page.url().match(/\/knowledge\/([^/?#]+)/)?.[1] ?? null
      expect(assetId).toBeTruthy()
      createdAssetIds.push(assetId)

      const provenance = page.getByRole('region', { name: 'Contesto del contenuto' })
      await expect(provenance).toContainText('File caricato')
      await expect(provenance).toContainText(fixture.categoryLabel)
      await expect(provenance).toContainText('Pronto')

      const contextPanel = page.locator('#professional-context')
      const contextForm = contextPanel.locator('form.contextForm')
      await expect(contextForm.locator('select[name="contentCategory"]')).toHaveValue(fixture.category)
      await expect(contextForm.locator('input[name="disciplines"]')).toHaveValue(/Tecnologia/)
      await expect(contextPanel).toContainText('Organizzato automaticamente')
      await expect(contextPanel).toContainText('Non devi confermare ciò che è già corretto')
      await expect(contextForm.locator('select[name="contextStatus"]')).toHaveCount(0)
      await expect(contextForm.locator('select[name="reliability"]')).toHaveCount(0)
      // A context correction would become REVIEWED, but it must preserve the source's AUTO reliability.
      await expect(contextForm.locator('input[name="contextStatus"]')).toHaveValue('REVIEWED')
      await expect(contextForm.locator('input[name="reliability"]')).toHaveValue('AUTO')

      const classes = await contextForm.locator('input[name="classLabels"]').inputValue()
      for (const expectedClass of fixture.expectedClasses) expect(classes).toContain(expectedClass)

      const snapshot = await knowledgeFixtureSnapshot(fixture.filename)
      expect(snapshot).toBeTruthy()
      expect(snapshot.asset.content_category).toBe(fixture.category)
      expect(snapshot.asset.disciplines).toContain('Tecnologia')
      expect(snapshot.asset.context_status).toBe('NEEDS_REVIEW')
      expect(snapshot.asset.reliability).toBe('AUTO')
      expect(snapshot.asset.processing_status).toBe('INDEXED')
      for (const expectedClass of fixture.expectedClasses) expect(snapshot.asset.class_labels).toContain(expectedClass)

      const qualityRule = snapshot.units.find((unit) => unit.unit_type === 'RULE' && unit.structured_data?.qualityFlag === 'INSTITUTION_NAME_CANONICALIZATION_REQUIRED')
      expect(qualityRule).toBeTruthy()
      expect(qualityRule.structured_data.requiresHumanReview).toBe(true)
      expect(qualityRule.structured_data.expectedForm).toBe('Istituto Comprensivo Statale “don Lorenzo Milani” — Calvario–Covotta')
    }

    await page.screenshot({ path: 'test-results/k1-03-school-docx-corpus.png', fullPage: true })
  } finally {
    for (const assetId of createdAssetIds) await deleteKnowledgeAsset(page, assetId).catch(() => {})
    for (const fixtureName of fixtureNames) await deleteAllKnowledgeFixtures(page, fixtureName).catch(() => {})
    await deleteOrphanedKnowledgeFixtureObjects(fixtureNames).catch(() => {})
    for (const fixtureName of fixtureNames) expect(await knowledgeFixtureAssetIds(page, fixtureName)).toHaveLength(0)
  }
})

async function openFileCapture(page) {
  await page.goto('/knowledge')
  const capture = page.locator('details.knowledgeCaptureDisclosure')
  await expect(capture).toBeVisible()
  if (await capture.getAttribute('open') === null) await capture.locator(':scope > summary').click()
  await expect(capture).toHaveAttribute('open', '')

  const fileMode = page.getByRole('button', { name: /Carica un file/ })
  await expect(fileMode).toBeVisible()
  await fileMode.click()
  await expect(page.locator('[data-capture-mode-panel="file"]')).toBeVisible()
  await expect(page.locator('[data-capture-mode-panel="text"]')).not.toBeVisible()
}

async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await Promise.all([
    page.waitForURL(/\/workspace(?:$|\?)/, { timeout: 30_000 }),
    page.getByRole('button', { name: 'Entra nel tuo spazio docente' }).click(),
  ])
}