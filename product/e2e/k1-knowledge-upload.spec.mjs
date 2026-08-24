import { expect, test } from '@playwright/test'
import {
  deleteAllKnowledgeFixtures,
  deleteKnowledgeAsset,
  knowledgeFixtureAssetIds,
  retainNewestKnowledgeFixture,
} from './support/knowledge-fixture-hygiene.mjs'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD
const fixtureName = 'k1-upload-recovery.txt'

if (!password) {
  throw new Error('E2E_PASSWORD is required for the authenticated K1 acceptance test')
}

test('K1 Knowledge: stato comprensibile, errore recuperabile, retry reale e cleanup', async ({ page }) => {
  await login(page)

  await retainNewestKnowledgeFixture(page, 'x3-responsible-ai')
  expect(await knowledgeFixtureAssetIds(page, 'x3-responsible-ai')).toHaveLength(1)
  await deleteAllKnowledgeFixtures(page, fixtureName)
  let createdAssetId = null

  try {
    await page.goto('/knowledge')

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
  } finally {
    await page.unroute('**/api/knowledge/upload').catch(() => {})
    if (createdAssetId) {
      await deleteKnowledgeAsset(page, createdAssetId)
    } else {
      await deleteAllKnowledgeFixtures(page, fixtureName)
    }
  }
})

async function login(page) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await Promise.all([
    page.waitForURL(/\/workspace(?:$|\?)/, { timeout: 30_000 }),
    page.getByRole('button', { name: 'Entra nel tuo spazio docente' }).click(),
  ])
}
