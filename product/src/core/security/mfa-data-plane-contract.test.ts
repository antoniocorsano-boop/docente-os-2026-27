import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '0051_mfa_aal2_enforcement.sql')
const migration = fs.readFileSync(migrationPath, 'utf8')
const e2eAuthPath = path.join(process.cwd(), 'e2e', 'support', 'e2e-auth.mjs')
const e2eAuth = fs.readFileSync(e2eAuthPath, 'utf8')
const startProductionPath = path.join(process.cwd(), 'scripts', 'start-production.mjs')
const startProduction = fs.readFileSync(startProductionPath, 'utf8')

test('MFA migration defines a fail-closed AAL2 JWT guard', () => {
  assert.match(migration, /create or replace function private\.current_session_is_aal2\(\)/i)
  assert.match(migration, /auth\.jwt\(\)\s*->>\s*'aal'\)\s*=\s*'aal2'/i)
  assert.match(migration, /coalesce\([\s\S]*false\)/i)
})

test('canonical workspace membership requires AAL2', () => {
  assert.match(migration, /create or replace function private\.is_workspace_member\(target_workspace_id uuid\)/i)
  assert.match(migration, /select private\.current_session_is_aal2\(\)[\s\S]*and exists/i)
})

test('bootstrap SECURITY DEFINER boundary rejects AAL1 explicitly', () => {
  assert.match(migration, /create or replace function public\.bootstrap_personal_workspace/i)
  assert.match(migration, /if not private\.current_session_is_aal2\(\) then[\s\S]*raise exception 'aal2 required'/i)
})

test('all current public RLS tables receive a restrictive AAL2 policy', () => {
  assert.match(migration, /where n\.nspname = 'public'[\s\S]*c\.relrowsecurity/i)
  assert.match(migration, /create policy mfa_aal2_required[\s\S]*as restrictive for all to authenticated[\s\S]*using \(private\.current_session_is_aal2\(\)\)[\s\S]*with check \(private\.current_session_is_aal2\(\)\)/i)
})

test('Knowledge Storage and future public tables remain inside the AAL2 ratchet', () => {
  assert.match(migration, /on storage\.objects[\s\S]*as restrictive[\s\S]*private\.current_session_is_aal2\(\)/i)
  assert.match(migration, /create or replace function public\.rls_auto_enable\(\)/i)
  assert.match(migration, /enabled RLS \+ AAL2/i)
  assert.match(migration, /revoke execute on function public\.rls_auto_enable\(\) from public, anon, authenticated/i)
})

test('governed HVA MFA setup gives the server-rendered MFA boundary an explicit readiness budget', () => {
  assert.match(e2eAuth, /const MFA_PAGE_READY_TIMEOUT_MS\s*=\s*30_000/)
  assert.match(
    e2eAuth,
    /expect\(\s*page\.getByRole\('heading',\s*\{\s*name:\s*'Conferma il secondo fattore\.'\s*\}\),?\s*\)\.toBeVisible\(\{\s*timeout:\s*MFA_PAGE_READY_TIMEOUT_MS\s*\}\)/,
  )
  assert.doesNotMatch(
    e2eAuth,
    /expect\(\s*page\.getByRole\('heading',\s*\{\s*name:\s*'Conferma il secondo fattore\.'\s*\}\),?\s*\)\.toBeVisible\(\s*\)/,
  )
})

test('local HVA keeps deterministic browser time out of server-side JWT validation', () => {
  assert.match(
    e2eAuth,
    /page\.clock\.setFixedTime\(fixedEpochMs\)/,
    'local HVA should keep deterministic time at the browser boundary',
  )
  assert.doesNotMatch(
    startProduction,
    /childEnv\.NODE_OPTIONS\s*=\s*appendNodeRequire\(/,
    'the authenticated Next.js runtime must not preload the fixed HVA Date into server-side JWT validation',
  )
})
