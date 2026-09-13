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

// This legacy fixture intentionally authenticates with password only. Since M5-04,
// it is an AAL1 negative-control identity: application RLS/RPC boundaries must fail
// closed instead of silently retaining the pre-MFA authenticated behavior.
const aal1 = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const { data: session, error: signInError } = await aal1.auth.signInWithPassword({ email, password })
assert.equal(signInError, null, `E2E AAL1 sign-in failed: ${signInError?.message ?? ''}`)
assert.ok(session.user, 'E2E AAL1 user is required')

const assurance = await aal1.auth.mfa.getAuthenticatorAssuranceLevel()
assert.equal(assurance.error, null, `AAL lookup failed: ${assurance.error?.message ?? ''}`)
assert.equal(assurance.data.currentLevel, 'aal1', 'Password-only operational fixture must remain AAL1')

const { data: knowledgeRows, error: knowledgeReadError } = await aal1
  .from('knowledge_assets')
  .select('id')
  .limit(1)
assert.equal(knowledgeReadError, null, `AAL1 knowledge read should be filtered by RLS, not fail transport: ${knowledgeReadError?.message ?? ''}`)
assert.deepEqual(knowledgeRows, [], 'AAL1 must not read application Knowledge rows')

const { data: proposalRows, error: proposalReadError } = await aal1
  .from('assistant_write_proposals')
  .select('id,status')
  .limit(1)
assert.equal(proposalReadError, null, `AAL1 X4 read should be filtered by RLS, not fail transport: ${proposalReadError?.message ?? ''}`)
assert.deepEqual(proposalRows, [], 'AAL1 must not read X4 proposal rows')

const { data: discarded, error: discardError } = await aal1.rpc('discard_authored_document', {
  target_document_id: unavailableDocument,
})
assert.equal(discardError, null, `AAL1 guarded discard should fail closed without an RPC transport error: ${discardError?.message ?? ''}`)
assert.equal(discarded, false, 'AAL1 must not cross the guarded X5 discard boundary')

console.log('Operational security gate PASS: anonymous X5 RPC denied; password-only AAL1 cannot cross application RLS/RPC boundaries.')

async function expectAnonymousDenied(name, args) {
  const { error } = await anonymous.rpc(name, args)
  assert.ok(error, `Anonymous RPC ${name} unexpectedly succeeded`)
  const normalized = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
  assert.match(normalized, /(42501|permission denied|not allowed|unauthorized)/, `Anonymous RPC ${name} failed for an unexpected reason: ${normalized}`)
}
