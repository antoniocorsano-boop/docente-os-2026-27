import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const repositorySource = readFileSync(
  new URL('./supabase-lesson-design-repository.ts', import.meta.url),
  'utf8',
)
const migrationSource = readFileSync(
  new URL('../../../../supabase/migrations/0069_lesson_design_tool_reproposal_after_dismissal.sql', import.meta.url),
  'utf8',
)

test('dedupe conflict recovery never returns a dismissed proposal', () => {
  assert.ok(repositorySource.includes(".neq('status', 'DISMISSED')"))
})

test('dismissed proposals release the active dedupe key without deleting audit history', () => {
  assert.match(migrationSource, /status <> 'DISMISSED'/)
  assert.match(migrationSource, /drop index if exists public\.uq_lesson_design_extensions_context_dedupe_key/)
  assert.match(migrationSource, /create unique index uq_lesson_design_extensions_context_dedupe_key/)
  assert.match(migrationSource, /Dismissed rows remain immutable audit history/)
})
