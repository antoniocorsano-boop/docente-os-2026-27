import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/0104_teaching_session_civic_education.sql')
const repositoryPath = resolve(process.cwd(), 'src/core/infrastructure/supabase/supabase-teaching-session-repository.ts')

function migrationSql() {
  return readFileSync(migrationPath, 'utf8')
}

test('QL2-A persists civic education beside the real TeachingSession without creating a subject assignment', () => {
  const sql = migrationSql()

  assert.match(sql, /create table public\.teaching_session_civic_contributions/i)
  assert.match(sql, /session_id uuid[^;]+references public\.teaching_sessions\(id\)/is)
  assert.match(sql, /primary key \(session_id\)/i)
  assert.match(sql, /minutes integer/i)
  assert.match(sql, /minutes > 0/i)
  assert.match(sql, /char_length\(evidence_note\) <= 4000/i)
  assert.doesNotMatch(sql, /insert into public\.teaching_assignments/i)
  assert.doesNotMatch(sql, /insert into public\.timetable_slots/i)
})

test('QL2-A exposes one atomic composite write while preserving the historical TeachingSession RPC', () => {
  const sql = migrationSql()

  assert.match(sql, /create or replace function public\.record_teaching_session_with_civic_contribution/i)
  assert.match(sql, /public\.record_teaching_session\(/i)
  assert.match(sql, /target_civic_education_minutes/i)
  assert.match(sql, /target_civic_education_evidence_note/i)
  assert.match(sql, /target_civic_education_minutes > target_actual_minutes/i)
  assert.match(sql, /teaching_session_civic_registration_receipts/i)
  assert.match(sql, /request_signature/i)
  assert.match(sql, /reused with different civic education payload/i)
})

test('QL2-A civic persistence is read-only to authenticated table clients and advances runtime lineage', () => {
  const sql = migrationSql()

  assert.match(sql, /enable row level security/i)
  assert.match(sql, /revoke insert, update, delete/i)
  assert.match(sql, /grant select/i)
  assert.match(sql, /values \(104, '0104_teaching_session_civic_education'\)/i)
  assert.match(sql, /advance_runtime_schema_contract\(\s*'0104_teaching_session_civic_education'\s*\)/i)
})

test('QL2-A repository writes through the composite RPC and reads civic contributions with sessions', () => {
  const source = readFileSync(repositoryPath, 'utf8')

  assert.match(source, /record_teaching_session_with_civic_contribution/)
  assert.match(source, /target_civic_education_minutes/)
  assert.match(source, /target_civic_education_evidence_note/)
  assert.match(source, /teaching_session_civic_contributions/)
  assert.match(source, /civicEducation/)
})
