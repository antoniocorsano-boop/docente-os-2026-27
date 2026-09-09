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
const largePdfFixtureName = 'k1-resumable-large.pdf'

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

test('K1 Knowledge: PDF testuale oltre 6 MB usa preflight locale e trasferimento resumable', async ({ page }) => {
  await login(page)
  await deleteAllKnowledgeFixtures(page, largePdfFixtureName)
  await deleteOrphanedKnowledgeFixtureObjects([largePdfFixtureName])
  let createdAssetId = null

  try {
    await openFileCapture(page)
    const buffer = buildLargeTextPdfFixture()
    expect(buffer.byteLength).toBeGreaterThan(6 * 1024 * 1024)
    expect(buffer.byteLength).toBeLessThan(20 * 1024 * 1024)

    await page.locator('input[type="file"][name="file"]').setInputFiles({
      name: largePdfFixtureName,
      mimeType: 'application/pdf',
      buffer,
    })

    await expect(page.getByText('Preflight locale superato')).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText(/preflight privacy superato/i)).toBeVisible()
    const privacyConfirmation = page.getByRole('checkbox')
    await privacyConfirmation.check()

    await page.getByRole('button', { name: 'Carica e organizza' }).click()
    await page.waitForURL(/\/knowledge\/[^/?#]+$/, { timeout: 120_000 })
    createdAssetId = page.url().match(/\/knowledge\/([^/?#]+)/)?.[1] ?? null
    expect(createdAssetId).toBeTruthy()

    const snapshot = await knowledgeFixtureSnapshot(largePdfFixtureName)
    expect(snapshot).toBeTruthy()
    expect(snapshot.asset.processing_status).toBe('INDEXED')
    expect(snapshot.asset.source_metadata?.captureMode).toBe('resumable-storage-upload')
    expect(snapshot.asset.source_metadata?.transferPath).toBe('browser-to-supabase-storage-tus-after-local-pdf-preflight')
    expect(snapshot.asset.source_metadata?.privacyPreflight).toBe('PDF_NATIVE_TEXT_LOCAL_BEFORE_STORAGE')
    await page.screenshot({ path: 'test-results/k1-02c-resumable-large-pdf.png' })
  } finally {
    if (createdAssetId) await deleteKnowledgeAsset(page, createdAssetId).catch(() => {})
    await deleteAllKnowledgeFixtures(page, largePdfFixtureName).catch(() => {})
    await deleteOrphanedKnowledgeFixtureObjects([largePdfFixtureName]).catch(() => {})
    expect(await knowledgeFixtureAssetIds(page, largePdfFixtureName)).toHaveLength(0)
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

function buildLargeTextPdfFixture(targetBytes = 7 * 1024 * 1024) {
  const baseContent = 'BT /F1 12 Tf 72 720 Td (K1 resumable acceptance Tecnologia) Tj ET\n'
  const paddingLine = `%${'A'.repeat(98)}\n`
  const paddingLength = Math.max(0, targetBytes - 1000 - Buffer.byteLength(baseContent))
  const padding = paddingLine.repeat(Math.ceil(paddingLength / paddingLine.length) + 1).slice(0, paddingLength)
  const content = `${baseContent}${padding}`

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ]

  const prefix = '%PDF-1.4\n'
  const offsets = [0]
  let cursor = Buffer.byteLength(prefix)
  for (const object of objects) {
    offsets.push(cursor)
    cursor += Buffer.byteLength(object)
  }
  const xrefOffset = cursor
  const xref = [
    'xref\n0 6\n',
    '0000000000 65535 f \n',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`),
  ].join('')
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(`${prefix}${objects.join('')}${xref}${trailer}`, 'latin1')
}

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
