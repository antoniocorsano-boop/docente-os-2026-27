import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'
const sourceLocator = 'x5-e2e-uda-source'
const runId = process.env.GITHUB_RUN_ID ?? 'local'

if (!password) throw new Error('E2E_PASSWORD is required for the operational security gate')

const anonymous = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const unavailableDocument = randomUUID()
const unavailableWorkspace = randomUUID()
const unavailableYear = randomUUID()
const unavailableSource = randomUUID()

await expectAnonymousDenied('authored_document_snapshot', { target_document_id: unavailableDocument })
await expectAnonymousDenied('discard_authored_document', { target_document_id: unavailableDocument })
await expectAnonymousDenied('save_authored_document_version', {
  target_document_id: unavailableDocument,
  expected_current_version: 1,
  next_title: 'Denied anonymous save',
  next_body_markdown: '',
})
await expectAnonymousDenied('open_uda_authoring', {
  target_workspace_id: unavailableWorkspace,
  target_academic_year_id: unavailableYear,
  target_source_asset_id: unavailableSource,
  initial_title: 'Denied anonymous authoring',
  initial_body_markdown: '',
})

const authenticated = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const { data: session, error: signInError } = await authenticated.auth.signInWithPassword({ email, password })
assert.equal(signInError, null, `E2E sign-in failed: ${signInError?.message ?? ''}`)
assert.ok(session.user, 'E2E authenticated user is required')

const { data: source, error: sourceError } = await authenticated
  .from('knowledge_assets')
  .select('id,workspace_id,academic_year_id,original_name,original_text')
  .eq('source_locator', sourceLocator)
  .eq('content_category', 'UDA')
  .single()
assert.equal(sourceError, null, `X5 security fixture lookup failed: ${sourceError?.message ?? ''}`)
assert.ok(source, 'X5 UDA fixture is required')
assert.ok(source.academic_year_id, 'X5 UDA fixture must belong to an academic year')

await cleanupAuthoredDocuments(authenticated, source.id)

let documentId = null
try {
  const { data: openedId, error: openError } = await authenticated.rpc('open_uda_authoring', {
    target_workspace_id: source.workspace_id,
    target_academic_year_id: source.academic_year_id,
    target_source_asset_id: source.id,
    initial_title: `Operational security X5 ${runId}`,
    initial_body_markdown: source.original_text ?? 'Operational security fixture body',
  })
  assert.equal(openError, null, `Authenticated X5 open RPC failed: ${openError?.message ?? ''}`)
  assert.equal(typeof openedId, 'string', 'Authenticated X5 open RPC must return a document id')
  documentId = openedId

  const initial = await authoredSnapshot(authenticated, documentId)
  assert.equal(initial.document.current_version_no, 1, 'New X5 security document must start at version 1')

  const { data: versionNo, error: saveError } = await authenticated.rpc('save_authored_document_version', {
    target_document_id: documentId,
    expected_current_version: 1,
    next_title: `Operational security X5 v2 ${runId}`,
    next_body_markdown: `${source.original_text ?? ''}\n\nHardening authenticated save ${runId}.`,
  })
  assert.equal(saveError, null, `Authenticated X5 save RPC failed: ${saveError?.message ?? ''}`)
  assert.equal(versionNo, 2, 'Authenticated X5 save must create version 2')

  const saved = await authoredSnapshot(authenticated, documentId)
  assert.equal(saved.document.current_version_no, 2, 'X5 snapshot must expose the saved current version')
  assert.equal(saved.versions.length, 2, 'X5 snapshot must preserve both immutable versions')

  const { error: receiptReadError } = await authenticated
    .from('assistant_write_proposals')
    .select('id,status')
    .limit(1)
  assert.equal(receiptReadError, null, `Authenticated X4 receipt RLS read must remain valid: ${receiptReadError?.message ?? ''}`)

  const { data: discarded, error: discardError } = await authenticated.rpc('discard_authored_document', {
    target_document_id: documentId,
  })
  assert.equal(discardError, null, `Authenticated X5 discard RPC failed: ${discardError?.message ?? ''}`)
  assert.equal(discarded, true, 'Authenticated X5 discard must remove the owned fixture document')
  documentId = null

  assert.equal((await authoredDocuments(authenticated, source.id)).length, 0, 'X5 security gate must leave no authored document fixture')
} finally {
  if (documentId) await cleanupAuthoredDocuments(authenticated, source.id)
}

console.log('Operational security gate PASS: anonymous X5 RPC denied; authenticated X5 lifecycle and X4 RLS preserved.')

async function expectAnonymousDenied(name, args) {
  const { error } = await anonymous.rpc(name, args)
  assert.ok(error, `Anonymous RPC ${name} unexpectedly succeeded`)
  const normalized = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  assert.match(normalized, /(42501|permission denied|not allowed|unauthorized)/, `Anonymous RPC ${name} failed for an unexpected reason: ${normalized}`)
}

async function authoredSnapshot(client, documentId) {
  const { data, error } = await client.rpc('authored_document_snapshot', { target_document_id: documentId })
  assert.equal(error, null, `Authenticated X5 snapshot RPC failed: ${error?.message ?? ''}`)
  assert.ok(data, 'Authenticated X5 snapshot must return the owned document')
  return data
}

async function authoredDocuments(client, sourceAssetId) {
  const { data, error } = await client
    .from('authored_documents')
    .select('id,created_by')
    .eq('source_asset_id', sourceAssetId)
  assert.equal(error, null, `X5 authored document lookup failed: ${error?.message ?? ''}`)
  return data ?? []
}

async function cleanupAuthoredDocuments(client, sourceAssetId) {
  const documents = await authoredDocuments(client, sourceAssetId)
  for (const document of documents) {
    const { data, error } = await client.rpc('discard_authored_document', { target_document_id: document.id })
    assert.equal(error, null, `X5 hardening cleanup failed: ${error?.message ?? ''}`)
    assert.equal(data, true, 'X5 hardening cleanup must discard each owned fixture document')
  }
}
