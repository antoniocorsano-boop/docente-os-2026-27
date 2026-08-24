import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'
const sourceLocator = 'x5-e2e-uda-source'
const runId = process.env.GITHUB_RUN_ID ?? 'local'

if (!password) throw new Error('E2E_PASSWORD is required for the authenticated X5 acceptance test')

test('X5A UDA authoring: explicit entry, immutable source, versions and conflict protection', async ({ page }) => {
  const identity = await authenticatedSupabase()
  const source = await sourceFixture(identity)
  await cleanupAuthoredDocuments(identity, source.id)
  const sourceBefore = await sourceState(identity, source.id)
  await login(page)

  let documentId = null
  try {
    await page.goto('/progetta?grade=prima')
    await page.getByText('X5 E2E — UDA fonte controllata', { exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/progetta/documenti/nuovo/${source.id}`))
    await expect(page.getByRole('heading', { name: 'Prepara questa UDA' })).toBeVisible()
    await expect(page.getByText(/La fonte resta invariata/i)).toBeVisible()
    await expect(page.getByText(/non vengono creati eventi, attività Planner o modifiche al Piano annuale/i)).toBeVisible()

    expect(await authoredDocuments(identity, source.id)).toHaveLength(0)
    await page.screenshot({ path: 'test-results/x5a-01-entry-gate.png' })

    await Promise.all([
      page.waitForURL(/\/progetta\/documenti\/[0-9a-f-]+$/, { timeout: 30_000 }),
      page.getByRole('button', { name: 'Inizia documento di lavoro' }).click(),
    ])

    documentId = page.url().split('/').pop()
    expect(documentId).toBeTruthy()
    await expect(page.getByText('Versione 1', { exact: true })).toBeVisible()
    await expect(page.getByText(/fonte originale preservata/i)).toBeVisible()

    const initial = await authoredSnapshot(identity, documentId)
    expect(initial.document.current_version_no).toBe(1)
    expect(initial.versions).toHaveLength(1)
    expect(initial.versions[0].body_markdown).toBe(sourceBefore.original_text)
    await page.screenshot({ path: 'test-results/x5a-02-version-1.png' })

    const title = page.getByLabel('Titolo')
    const body = page.getByLabel('Contenuto')
    await title.fill(`X5 E2E — UDA versione ${runId}`)
    await body.fill(`${sourceBefore.original_text}\n\n## Nota di lavoro\nVersionamento verificato nel run ${runId}.`)
    await page.getByRole('button', { name: 'Salva nuova versione' }).click()
    await expect(page.getByText('Versione 2 salvata', { exact: true })).toBeVisible()
    await expect(page.getByText('Tutte le modifiche sono salvate.', { exact: true })).toBeVisible()

    const saved = await authoredSnapshot(identity, documentId)
    expect(saved.document.current_version_no).toBe(2)
    expect(saved.versions).toHaveLength(2)
    expect(saved.versions.find((item) => item.version_no === 1)?.body_markdown).toBe(sourceBefore.original_text)
    expect(saved.versions.find((item) => item.version_no === 2)?.body_markdown).toContain(`Versionamento verificato nel run ${runId}.`)

    const stale = await identity.supabase.rpc('save_authored_document_version', {
      target_document_id: documentId,
      expected_current_version: 1,
      next_title: 'Sovrascrittura obsoleta da rifiutare',
      next_body_markdown: 'Questa versione non deve essere creata.',
    })
    expect(stale.error).toBeTruthy()
    expect(stale.error.message).toMatch(/document changed|reload/i)

    const sourceAfter = await sourceState(identity, source.id)
    expect(sourceAfter).toEqual(sourceBefore)
    await page.screenshot({ path: 'test-results/x5a-03-version-2.png' })
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
  if (error || !data.user) throw new Error(`X5 fixture identity failed: ${error?.message ?? 'missing user'}`)
  return { supabase, userId: data.user.id }
}

async function sourceFixture({ supabase }) {
  const { data, error } = await supabase
    .from('knowledge_assets')
    .select('id,source_locator,original_name')
    .eq('source_locator', sourceLocator)
    .eq('content_category', 'UDA')
    .single()
  if (error || !data) throw new Error(`X5 UDA source fixture missing: ${error?.message ?? 'no data'}`)
  return data
}

async function sourceState({ supabase }, sourceAssetId) {
  const { data, error } = await supabase
    .from('knowledge_assets')
    .select('id,workspace_id,academic_year_id,original_name,original_text,current_generation_id,content_category,source_locator,updated_at')
    .eq('id', sourceAssetId)
    .single()
  if (error || !data) throw new Error(`X5 source state failed: ${error?.message ?? 'no data'}`)
  return data
}

async function authoredDocuments({ supabase }, sourceAssetId) {
  const { data, error } = await supabase
    .from('authored_documents')
    .select('id,current_version_no,created_by')
    .eq('source_asset_id', sourceAssetId)
  if (error) throw new Error(`X5 authored document lookup failed: ${error.message}`)
  return data ?? []
}

async function authoredSnapshot({ supabase }, documentId) {
  const { data, error } = await supabase.rpc('authored_document_snapshot', { target_document_id: documentId })
  if (error || !data) throw new Error(`X5 authored snapshot failed: ${error?.message ?? 'no data'}`)
  return data
}

async function cleanupAuthoredDocuments(identity, sourceAssetId) {
  const documents = await authoredDocuments(identity, sourceAssetId)
  for (const document of documents) {
    if (document.created_by !== identity.userId) throw new Error('X5 fixture found a document owned by another identity')
    const { data, error } = await identity.supabase.rpc('discard_authored_document', { target_document_id: document.id })
    if (error || data !== true) throw new Error(`X5 authored cleanup failed: ${error?.message ?? 'not deleted'}`)
  }
}
