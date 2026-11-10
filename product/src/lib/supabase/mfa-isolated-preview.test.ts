import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { isIsolatedMfaPreview } from './mfa-isolated-preview'

const mfaProject = 'https://xyowtnivxnzgwewvvmyz.supabase.co'
const betaProject = 'https://gnshgapmwyjamhmlikeg.supabase.co'

test('MFA-only routing is strictly scoped to preview and dedicated test backend', () => {
  assert.equal(isIsolatedMfaPreview({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: mfaProject }), true)
  assert.equal(isIsolatedMfaPreview({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: mfaProject + '/' }), true)
  assert.equal(isIsolatedMfaPreview({ VERCEL_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: mfaProject }), false)
  assert.equal(isIsolatedMfaPreview({ VERCEL_ENV: 'preview', NEXT_PUBLIC_SUPABASE_URL: betaProject }), false)
  assert.equal(isIsolatedMfaPreview({ VERCEL_ENV: 'development', NEXT_PUBLIC_SUPABASE_URL: mfaProject }), false)
  assert.equal(isIsolatedMfaPreview({ VERCEL_ENV: undefined, NEXT_PUBLIC_SUPABASE_URL: undefined }), false)
})

test('anonymous home checks session BEFORE loading workspace RPC', () => {
  const home = readFileSync(new URL('../../app/page.tsx', import.meta.url), 'utf8')
  const userGuard = home.indexOf('auth.getClaims()')
  const redirect = home.indexOf("if (error || !data?.claims) redirect('/login')")
  const lookup = home.indexOf('new SupabaseWorkspaceRepository().getCurrentContext()')
  assert.ok(userGuard >= 0 && redirect > userGuard && lookup > redirect)
})

test('synthetic login stays in dedicated MFA preview without bootstrap', () => {
  const action = readFileSync(new URL('../../app/login/actions.ts', import.meta.url), 'utf8')
  const checkpoint = action.indexOf('if (isIsolatedMfaPreview()) redirect(')
  const bootstrap = action.indexOf('ensurePersonalWorkspace(supabase)')
  assert.ok(checkpoint >= 0 && bootstrap > checkpoint)
  const confirm = readFileSync(new URL('../../app/auth/confirm/route.ts', import.meta.url), 'utf8')
  const fallback = confirm.indexOf('const bootstrap = await ensurePersonalWorkspace')
  const isolated = confirm.indexOf('if (isIsolatedMfaPreview())')
  assert.ok(isolated >= 0 && isolated < fallback)
})
