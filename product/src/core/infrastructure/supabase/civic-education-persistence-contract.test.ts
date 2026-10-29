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

test('QL2-A refuses to attach a new civic payload to a TeachingSession that already existed before the civic receipt boundary', () => {
  const sql = migrationSql()

  assert.match(sql, /public\.teaching_session_registration_receipts/i)
  assert.match(
    sql,
    /if preexisting_registration_session_id is not null\s+and preexisting_civic_receipt_session_id is null\s+and target_civic_education_minutes is not null then\s+raise exception 'teaching session cannot gain civic education on retry';/i,
  )
})

test('QL2-A serializes keyed civic and legacy writes and protects direct historical retries', () => {
  const sql = migrationSql()

  assert.match(sql, /create or replace function private\.lock_teaching_session_registration_key/i)
  assert.ok(
    (sql.match(/perform private\.lock_teaching_session_registration_key\(/gi) ?? []).length >= 2,
    'both civic and historical public write boundaries must acquire the same keyed transaction lock',
  )
  assert.match(sql, /create table private\.teaching_session_civic_atomic_authorizations/i)
  assert.match(sql, /revoke all on private\.teaching_session_civic_atomic_authorizations from public, anon, authenticated/i)
  assert.match(
    sql,
    /create or replace function public\.record_teaching_session\([\s\S]*teaching_session_civic_atomic_authorizations[\s\S]*teaching session with civic contribution requires composite retry boundary/i,
  )
})

test('QL2-A migration avoids PostgreSQL reserved AUTHORIZATION as an unquoted relation alias', () => {
  const sql = migrationSql()

  assert.doesNotMatch(
    sql,
    /\b(?:from|delete\s+from)\s+(?:private|public)\.[a-z0-9_]+\s+authorization\b/i,
    'AUTHORIZATION is a PostgreSQL keyword and must not be used unquoted as a relation alias',
  )
})

test('QL2-A civic persistence is read-only to authenticated table clients and advances runtime lineage', () => {
  const sql = migrationSql()

  assert.match(sql, /enable row level security/i)
  assert.match(sql, /revoke insert, update, delete/i)
  assert.match(sql, /grant select/i)
  assert.match(sql, /values \(104, '0104_teaching_session_civic_education'\)/i)
  assert.match(sql, /advance_runtime_schema_contract\(\s*'0104_teaching_session_civic_education'\s*\)/i)
})

test('QL2-A repository routes all current-schema writes through civic payload validation and bounds previous-schema fallback', () => {
  const source = readFileSync(repositoryPath, 'utf8')

  assert.match(source, /record_teaching_session_with_civic_contribution/)
  assert.match(source, /record_teaching_session/)
  assert.match(source, /selectTeachingSessionWriteRpc/)
  assert.match(source, /shouldFallbackToLegacyTeachingSessionRpc/)
  assert.match(source, /isMissingCivicEducationSchemaError/)
  assert.match(source, /civicEducationSchemaCompatibility/)
  assert.match(source, /target_civic_education_minutes/)
  assert.match(source, /target_civic_education_evidence_note/)
  assert.match(source, /teaching_session_civic_contributions/)
  assert.match(source, /civicEducation/)
})
