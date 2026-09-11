import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migrationPath = new URL('../../../../supabase/migrations/0050_workspace_selection_fail_closed.sql', import.meta.url)
const sql = readFileSync(migrationPath, 'utf8')

function functionBody(name: string) {
  const marker = `create or replace function public.${name}`
  const start = sql.indexOf(marker)
  assert.notEqual(start, -1, `${name} must exist in workspace isolation migration`)
  const next = sql.indexOf('\ncreate or replace function public.', start + marker.length)
  return sql.slice(start, next === -1 ? sql.length : next)
}

test('workspace preference is scoped to the authenticated user and a membership', () => {
  assert.match(sql, /create table public\.user_workspace_preferences/)
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/)
  assert.match(sql, /private\.is_workspace_member\(current_workspace_id\)/)
})

test('bootstrap pins the owned personal workspace without overriding an explicit preference', () => {
  const bootstrap = functionBody('bootstrap_personal_workspace')
  assert.match(bootstrap, /w\.owner_user_id = uid/)
  assert.match(bootstrap, /w\.kind = 'PERSONAL'/)
  assert.match(bootstrap, /insert into public\.user_workspace_preferences\(user_id, current_workspace_id\)/)
  assert.match(bootstrap, /on conflict \(user_id\) do nothing/)
})

test('current context prefers explicit selection and otherwise falls back only to an owned personal workspace', () => {
  const currentContext = functionBody('current_workspace_context')
  assert.match(currentContext, /pref\.current_workspace_id/)
  assert.match(currentContext, /wm\.user_id = actor\.uid/)
  assert.match(currentContext, /w\.owner_user_id = actor\.uid/)
  assert.match(currentContext, /where w\.kind = 'PERSONAL'/)
  assert.doesNotMatch(currentContext, /order by wm\.created_at asc\s+limit 1/)
})

test('current workspace context runs as invoker and is unavailable to anonymous callers', () => {
  const currentContext = functionBody('current_workspace_context')
  assert.match(currentContext, /security invoker/)
  assert.match(sql, /revoke execute on function public\.current_workspace_context\(\) from anon/)
  assert.match(sql, /grant execute on function public\.current_workspace_context\(\) to authenticated/)
})
