import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  WORKSPACE_PINNED_RESOURCE_SLOTS,
  asWorkspacePinnedResourceKind,
  normalizeWorkspacePinnedResourceNote,
  normalizeWorkspacePinnedResourceTarget,
} from './workspace-pinned-resource'

const isolationMigration = readFileSync(
  new URL('../../../supabase/migrations/0050_workspace_selection_fail_closed.sql', import.meta.url),
  'utf8',
)

function migrationFunctionBody(name: string) {
  const marker = `create or replace function public.${name}`
  const start = isolationMigration.indexOf(marker)
  assert.notEqual(start, -1, `${name} must exist in workspace isolation migration`)
  const next = isolationMigration.indexOf('\ncreate or replace function public.', start + marker.length)
  return isolationMigration.slice(start, next === -1 ? isolationMigration.length : next)
}

test('workspace Home slots are fixed and unique', () => {
  assert.deepEqual(
    WORKSPACE_PINNED_RESOURCE_SLOTS.map((slot) => slot.kind),
    ['TODAY', 'SECTION', 'PLANNING', 'DIARY', 'PROBATION'],
  )
  assert.equal(new Set(WORKSPACE_PINNED_RESOURCE_SLOTS.map((slot) => slot.kind)).size, 5)
})

test('pinned resource kind rejects unknown slots', () => {
  assert.equal(asWorkspacePinnedResourceKind('DIARY'), 'DIARY')
  assert.throws(() => asWorkspacePinnedResourceKind('SHARED'), /Unsupported workspace pinned resource kind/)
})

test('pinned resource targets accept internal routes and HTTPS only', () => {
  assert.equal(normalizeWorkspacePinnedResourceTarget(' /impostazioni '), '/impostazioni')
  assert.equal(
    normalizeWorkspacePinnedResourceTarget('https://drive.google.com/drive/folders/example'),
    'https://drive.google.com/drive/folders/example',
  )
  assert.throws(() => normalizeWorkspacePinnedResourceTarget('http://example.com'), /must use HTTPS/)
  assert.throws(() => normalizeWorkspacePinnedResourceTarget('javascript:alert(1)'), /must use HTTPS/)
})

test('pinned resource notes are trimmed and bounded', () => {
  assert.equal(normalizeWorkspacePinnedResourceNote('  Diario della sezione  '), 'Diario della sezione')
  assert.equal(normalizeWorkspacePinnedResourceNote('   '), null)
  assert.throws(() => normalizeWorkspacePinnedResourceNote('x'.repeat(501)), /note too long/)
})

test('workspace preference is scoped to the authenticated user and a membership', () => {
  assert.match(isolationMigration, /create table public\.user_workspace_preferences/)
  assert.match(isolationMigration, /user_id = \(select auth\.uid\(\)\)/)
  assert.match(isolationMigration, /private\.is_workspace_member\(current_workspace_id\)/)
})

test('bootstrap pins the owned personal workspace without overriding an explicit preference', () => {
  const bootstrap = migrationFunctionBody('bootstrap_personal_workspace')
  assert.match(bootstrap, /w\.owner_user_id = uid/)
  assert.match(bootstrap, /w\.kind = 'PERSONAL'/)
  assert.match(bootstrap, /insert into public\.user_workspace_preferences\(user_id, current_workspace_id\)/)
  assert.match(bootstrap, /on conflict \(user_id\) do nothing/)
})

test('current context never falls back to the first arbitrary membership', () => {
  const currentContext = migrationFunctionBody('current_workspace_context')
  assert.match(currentContext, /pref\.current_workspace_id/)
  assert.match(currentContext, /wm\.user_id = actor\.uid/)
  assert.match(currentContext, /w\.owner_user_id = actor\.uid/)
  assert.match(currentContext, /where w\.kind = 'PERSONAL'/)
  assert.doesNotMatch(currentContext, /order by wm\.created_at asc\s+limit 1/)
})

test('current workspace context runs as invoker and rejects anonymous execution', () => {
  const currentContext = migrationFunctionBody('current_workspace_context')
  assert.match(currentContext, /security invoker/)
  assert.match(isolationMigration, /revoke execute on function public\.current_workspace_context\(\) from anon/)
  assert.match(isolationMigration, /grant execute on function public\.current_workspace_context\(\) to authenticated/)
})
