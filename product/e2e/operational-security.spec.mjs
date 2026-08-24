import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'

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

const { data: snapshot, error: snapshotError } = await authenticated.rpc('authored_document_snapshot', {
  target_document_id: unavailableDocument,
})
assert.equal(snapshotError, null, `Authenticated X5 snapshot RPC must remain callable: ${snapshotError?.message ?? ''}`)
assert.equal(snapshot, null, 'Unknown authored document must return no snapshot')

const { error: receiptReadError } = await authenticated
  .from('assistant_write_proposals')
  .select('id,status')
  .limit(1)
assert.equal(receiptReadError, null, `Authenticated X4 receipt RLS read must remain valid: ${receiptReadError?.message ?? ''}`)

console.log('Operational security gate PASS: anonymous X5 RPC denied; authenticated X5/X4 boundaries preserved.')

async function expectAnonymousDenied(name, args) {
  const { error } = await anonymous.rpc(name, args)
  assert.ok(error, `Anonymous RPC ${name} unexpectedly succeeded`)
  const normalized = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  assert.match(normalized, /(42501|permission denied|not allowed|unauthorized)/, `Anonymous RPC ${name} failed for an unexpected reason: ${normalized}`)
}
