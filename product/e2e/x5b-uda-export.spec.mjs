import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'
const sourceLocator = 'x5-e2e-uda-source'

if (!password) throw new Error('E2E_PASSWORD is required for the authenticated X5B acceptance test')

test('X5B export: saved immutable version, provenance, no write and explicit print', async ({ page }) => {
  const identity = await authenticatedSupabase()
  const source = await sourceFixture(identity)
  await cleanupAuthoredDocuments(identity, source.id)
  await login(page)

  let documentId = null
  try {
    await page.goto(`/progetta/documenti/nuovo/${source.id}`)
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
    await expect(page.getByText('Versione').locator('..')).toContainText('1')
    await expect(page.getByText(/Fonte originale preservata/i)).toBeVisible()
    await expect(page.getByText(/versione esportata v1/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Stampa / Salva PDF' })).toBeVisible()

    const printCallsBefore = await page.evaluate(() => window.__x5bPrintCalls)
    expect(printCallsBefore).toBe(0)

    const beforePrint = await authoredSnapshot(identity, documentId)
    await page.getByRole('button', { name: 'Stampa / Salva PDF' }).click()
    expect(await page.evaluate(() => window.__x5bPrintCalls)).toBe(1)
    const afterPrint = await authoredSnapshot(identity, documentId)
    expect(afterPrint).toEqual(beforePrint)

    const bodyText = await page.locator('.udaExportBody').innerText()
    expect(bodyText).toContain(initial.current.body_markdown.split('\n').find((line) => line.trim())?.replace(/^#+\s*/, '') ?? '')
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)
    await page.screenshot({ path: 'test-results/x5b-01-export.png', fullPage: true })
  } finally {
    await cleanupAuthoredDocuments(identity, source.id)
    expect(await authoredDocuments(identity, source.id)).toHaveLength(0)
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

async function authenticatedSupabase() {
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new Error(`X5B fixture identity failed: ${error?.message ?? 'missing user'}`)
  return { supabase, userId: data.user.id }
}

async function sourceFixture({ supabase }) {
  const { data, error } = await supabase.from('knowledge_assets').select('id').eq('source_locator', sourceLocator).eq('content_category', 'UDA').single()
  if (error || !data) throw new Error(`X5B UDA source fixture missing: ${error?.message ?? 'no data'}`)
  return data
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
