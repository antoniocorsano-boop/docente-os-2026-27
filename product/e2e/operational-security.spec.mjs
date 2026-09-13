import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'
const sourceLocator = 'x5-e2e-uda-source'
const transientProviderPattern = /(gateway timeout|timed out|timeout|temporarily unavailable|fetch failed|network|\b502\b|\b503\b|\b504\b)/i

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

// The hosted Beta still represents the pre-0051 data-plane until the candidate
// migration is promoted. Keep this gate read-only: it verifies the existing
// authenticated ACL/RLS fixture without creating state that an AAL1 session may
// no longer be allowed to clean up after promotion. AAL1→AAL2 enforcement itself
// is certified separately by the isolated MFA data-plane contract and AAL2 gates.
const authenticated = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
const { data: session, error: signInError } = await authenticated.auth.signInWithPassword({ email, password })
assert.equal(signInError, null, `E2E sign-in failed: ${signInError?.message ?? ''}`)
assert.ok(session.user, 'E2E authenticated user is required')

const assurance = await authenticated.auth.mfa.getAuthenticatorAssuranceLevel()
assert.equal(assurance.error, null, `AAL lookup failed: ${assurance.error?.message ?? ''}`)
assert.equal(assurance.data.currentLevel, 'aal1', 'Legacy hosted operational fixture must remain password-only AAL1')

const { data: source, error: sourceError } = await authenticated
  .from('knowledge_assets')
  .select('id,workspace_id,academic_year_id,created_by')
  .eq('source_locator', sourceLocator)
  .eq('content_category', 'UDA')
  .single()
assert.equal(sourceError, null, `Hosted X5 security fixture lookup failed: ${sourceError?.message ?? ''}`)
assert.ok(source, 'Hosted X5 UDA fixture is required')
assert.equal(source.created_by, session.user.id, 'Hosted X5 fixture must belong to the authenticated technical identity')

const { error: receiptReadError } = await authenticated
  .from('assistant_write_proposals')
  .select('id,status')
  .limit(1)
assert.equal(receiptReadError, null, `Hosted X4 receipt RLS read must remain valid: ${receiptReadError?.message ?? ''}`)

const { data: missingSnapshot, error: missingSnapshotError } = await authenticated.rpc('authored_document_snapshot', {
  target_document_id: unavailableDocument,
})
assert.equal(missingSnapshotError, null, `Authenticated snapshot probe failed: ${missingSnapshotError?.message ?? ''}`)
assert.equal(missingSnapshot, null, 'Authenticated snapshot probe must not expose an unavailable document')

console.log('Operational security gate PASS: anonymous X5 RPC denied; hosted authenticated ACL/RLS fixture verified read-only.')

async function expectAnonymousDenied(name, args) {
  let lastNormalized = ''
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { error } = await anonymous.rpc(name, args)
    assert.ok(error, `Anonymous RPC ${name} unexpectedly succeeded`)

    const normalized = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
    if (/(42501|permission denied|not allowed|unauthorized)/.test(normalized)) return

    lastNormalized = normalized
    if (!transientProviderPattern.test(normalized) || attempt === 3) break
    await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
  }

  assert.match(lastNormalized, /(42501|permission denied|not allowed|unauthorized)/, `Anonymous RPC ${name} failed for an unexpected reason after bounded retries: ${lastNormalized}`)
}
