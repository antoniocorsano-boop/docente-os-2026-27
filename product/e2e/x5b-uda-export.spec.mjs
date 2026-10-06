import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { E2E_EMAIL, E2E_PASSWORD, E2E_TOTP_SECRET, loginE2E, requireE2ECredentials } from './support/e2e-auth.mjs'
import { generateTotp, governedMfaRetryJitterMs, millisecondsUntilNextTotpStep } from './support/totp.mjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'
const runId = process.env.GITHUB_RUN_ID ?? 'local'
const sourceTitle = `X5B E2E — UDA fonte controllata — ${runId}`
const sourceBody = `# X5B E2E — UDA fonte controllata\n\nFonte tecnica creata dal run ${runId} per verificare l’export professionale senza dipendere da fixture permanenti.`

requireE2ECredentials()

test('X5B export: saved immutable version, provenance, no write and explicit print', async ({ page }) => {
  const identity = await authenticatedSupabase()
  await loginE2E(page)

  let sourceId = null
  let documentId = null

  try {
    sourceId = await createSourceFixture(page)
    await cleanupAuthoredDocuments(identity, sourceId)

    await page.goto(`/progetta/documenti/nuovo/${sourceId}`)
    await Promise.all([
      page.waitForURL(/\/progetta\/documenti\/[0-9a-f-]+$/, { timeout: 30_000 }),
      page.getByRole('button', { name: 'Inizia documento di lavoro' }).click(),
    ])
    documentId = page.url().split('/').pop()

    const initial = await authoredSnapshot(identity, documentId)
    expect(initial.document.current_version_no).toBe(1)
    expect(initial.versions).toHaveLength(1)

    await page.addInitScript(() => {
      window.__x5bPrintCalls = 0
      window.print = () => { window.__x5bPrintCalls += 1 }
    })
    await page.goto(`/progetta/documenti/${documentId}/export?version=1`)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(initial.current.title)
    const versionFact = page.locator('.udaExportHeader dl div').filter({ hasText: 'Versione' })
    await expect(versionFact).toContainText('1')
    await expect(page.getByText(/Fonte originale preservata/i)).toBeVisible()
    await expect(page.getByText(/versione esportata v1/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Stampa / Salva PDF' })).toBeVisible()

    expect(await page.evaluate(() => window.__x5bPrintCalls)).toBe(0)
    const beforePrint = await authoredSnapshot(identity, documentId)
    await page.getByRole('button', { name: 'Stampa / Salva PDF' }).click()
    expect(await page.evaluate(() => window.__x5bPrintCalls)).toBe(1)
    expect(await authoredSnapshot(identity, documentId)).toEqual(beforePrint)

    const bodyText = await page.locator('.udaExportBody').innerText()
    expect(bodyText).toContain(initial.current.body_markdown.split('\n').find((line) => line.trim())?.replace(/^#+\s*/, '') ?? '')

    await assertNoHorizontalOverflow(page)
    await page.screenshot({ path: 'test-results/x5b-01-export-mobile.png', fullPage: true })

    await page.setViewportSize({ width: 1440, height: 1000 })
    await assertNoHorizontalOverflow(page)
    await expect(page.locator('.udaExportDocument')).toBeVisible()
    await page.screenshot({ path: 'test-results/x5b-02-export-desktop.png', fullPage: true })

    await page.emulateMedia({ media: 'print' })
    await expect(page.locator('.udaExportActions')).not.toBeVisible()
    await expect(page.locator('.udaExportDocument')).toBeVisible()
    await page.emulateMedia({ media: 'screen' })
  } finally {
    if (sourceId) {
      await cleanupAuthoredDocuments(identity, sourceId)
      expect(await authoredDocuments(identity, sourceId)).toHaveLength(0)
      await deleteSourceFixture(page, sourceId)
    }
  }
})

async function assertNoHorizontalOverflow(page) {
  expect(await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth))).toBeLessThanOrEqual(1)
}

async function createSourceFixture(page) {
  await page.goto('/knowledge')
  const capture = page.locator('details.knowledgeCaptureDisclosure')
  await expect(capture).toBeVisible()
  if (await capture.getAttribute('open') === null) await capture.locator(':scope > summary').click()
  await expect(capture).toHaveAttribute('open', '')
  await page.locator('input[name="title"]').fill(sourceTitle)
  await page.locator('textarea[name="text"]').fill(sourceBody)

  await Promise.all([
    page.waitForURL(/\/knowledge\/[^/?#]+$/, { timeout: 60_000 }),
    page.getByRole('button', { name: 'Salva e organizza' }).click(),
  ])

  const sourceId = assetIdFromUrl(page.url())
  const contextForm = page.locator('form.contextForm')
  await expect(contextForm).toBeVisible()
  await contextForm.locator('select[name="contentCategory"]').selectOption('UDA')
  await contextForm.locator('input[name="disciplines"]').fill('Tecnologia')
  await contextForm.locator('input[name="classLabels"]').fill('1A')
  await expect(contextForm.locator('input[name="contextStatus"]')).toHaveValue('REVIEWED')
  await Promise.all([
    page.waitForURL(new RegExp(`/knowledge/${escapeRegExp(sourceId)}\\?context=updated$`), { timeout: 30_000 }),
    contextForm.getByRole('button', { name: 'Salva correzione' }).click(),
  ])

  return sourceId
}

async function authenticatedSupabase() {
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASSWORD })
  if (error || !data.user) throw new Error(`X5B fixture identity failed: ${error?.message ?? 'missing user'}`)

  await promoteToAal2(supabase)
  const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assurance.error || assurance.data.currentLevel !== 'aal2') {
    throw new Error(`X5B fixture did not reach AAL2: ${assurance.error?.message ?? assurance.data.currentLevel}`)
  }

  return { supabase, userId: data.user.id }
}

async function promoteToAal2(supabase) {
  const factor = await findGovernedVerifiedFactor(supabase)
  const runJitter = governedMfaRetryJitterMs()

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const remaining = millisecondsUntilNextTotpStep()
    if (remaining < 6_000 + runJitter) await sleep(remaining + 750 + runJitter)
    else if (runJitter) await sleep(runJitter)

    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challenge.error) {
      if (attempt === 4) throw new Error(`X5B MFA challenge failed: ${challenge.error.message}`)
      await sleep(millisecondsUntilNextTotpStep() + 750 + runJitter)
      continue
    }

    const verified = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.data.id,
      code: generateTotp(E2E_TOTP_SECRET),
    })

    if (!verified.error) {
      const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (!assurance.error && assurance.data.currentLevel === 'aal2') return
    }

    if (attempt === 4) throw new Error(`X5B MFA verification failed: ${verified.error?.message ?? 'session did not reach aal2'}`)
    await sleep(millisecondsUntilNextTotpStep() + 750 + runJitter)
  }
}

async function findGovernedVerifiedFactor(supabase) {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const listed = await supabase.auth.mfa.listFactors()
    if (!listed.error) {
      const verified = listed.data.totp.filter((factor) => factor.status === 'verified')
      const factor = verified.find((candidate) => candidate.friendly_name === 'Docente OS CI')
        ?? (verified.length === 1 ? verified[0] : null)
      if (factor) return factor
    }
    await sleep(Math.min(1_000 * attempt, 4_000) + governedMfaRetryJitterMs())
  }
  throw new Error('X5B governed verified TOTP factor is unavailable')
}

async function authoredDocuments({ supabase }, sourceAssetId) {
  const { data, error } = await supabase.from('authored_documents').select('id,created_by').eq('source_asset_id', sourceAssetId)
  if (error) throw new Error(`X5B authored document lookup failed: ${error.message}`)
  return data ?? []
}

async function authoredSnapshot({ supabase }, documentId) {
  const { data, error } = await supabase.rpc('authored_document_snapshot', { target_document_id: documentId })
  if (error || !data) throw new Error(`X5B authored snapshot failed: ${error?.message ?? 'no data'}`)
  return data
}

async function cleanupAuthoredDocuments(identity, sourceAssetId) {
  const documents = await authoredDocuments(identity, sourceAssetId)
  for (const document of documents) {
    if (document.created_by !== identity.userId) throw new Error('X5B fixture found a document owned by another identity')
    const { data, error } = await identity.supabase.rpc('discard_authored_document', { target_document_id: document.id })
    if (error || data !== true) throw new Error(`X5B authored cleanup failed: ${error?.message ?? 'not deleted'}`)
  }
}

async function deleteSourceFixture(page, sourceAssetId) {
  const response = await page.request.delete(`/api/knowledge/${encodeURIComponent(sourceAssetId)}`)
  if (response.status() === 204 || response.status() === 404) return
  const body = await response.text().catch(() => '')
  throw new Error(`X5B source cleanup failed for ${sourceAssetId}: HTTP ${response.status()} ${body}`)
}

function assetIdFromUrl(url) {
  const match = new URL(url).pathname.match(/^\/knowledge\/([^/?#]+)$/)
  if (!match) throw new Error(`Knowledge asset id not found in URL: ${url}`)
  return decodeURIComponent(match[1])
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
