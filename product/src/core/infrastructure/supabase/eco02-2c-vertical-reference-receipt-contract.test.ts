import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const file = path.resolve(
  process.cwd(),
  'supabase/migrations/0105_eco02_2c_governed_vertical_reference_receipt.sql',
)

function sql() {
  return fs.readFileSync(file, 'utf8').toLowerCase()
}

test('separate, append-only receipt preserves the P7 adoption and the lesson decision', () => {
  const source = sql()
  assert.match(source, /create table public\.annual_plan_2c_vertical_reference_receipts/)
  assert.match(source, /legacy_adoption_id uuid not null references public\.annual_plan_curriculum_adoptions\(id\) on delete restrict/)
  assert.match(source, /preparation_receipt_id uuid not null references public\.lesson_preparation_receipts\(id\) on delete restrict/)
  assert.match(source, /create trigger annual_plan_2c_vertical_reference_receipts_append_only/)
  assert.match(source, /before update or delete/)
  assert.doesNotMatch(source, /update public\.annual_plan_curriculum_adoptions|delete from public\.annual_plan_curriculum_adoptions/)
  assert.doesNotMatch(source, /update public\.lesson_preparation_receipts|delete from public\.lesson_preparation_receipts/)
})

test('source and institution attestation tables are private, empty and closed by default', () => {
  const source = sql()
  assert.match(source, /create table private\.arena_2c_verified_sources/)
  assert.match(source, /create table private\.arena_2c_institution_bindings/)
  assert.match(source, /enabled boolean not null default false/)
  assert.match(source, /revoke all on private\.arena_2c_verified_sources from public, anon, authenticated/)
  assert.match(source, /revoke all on private\.arena_2c_institution_bindings from public, anon, authenticated/)
  assert.doesNotMatch(source, /insert into private\.arena_2c_verified_sources/)
  assert.doesNotMatch(source, /insert into private\.arena_2c_institution_bindings/)
})

test('authenticated SQL boundary rejects a missing confirmation and unauthorized scopes', () => {
  const source = sql()
  assert.match(source, /create function public\.confirm_eco02_2c_vertical_reference/)
  assert.match(source, /security definer/)
  assert.match(source, /set search_path = ''/)
  assert.match(source, /auth\.uid\(\)/)
  assert.match(source, /private\.is_workspace_member\(target_workspace_id\)/)
  assert.match(source, /confirmed_provisional_reference is not true/)
  assert.match(source, /section_grade <> 'seconda'/)
  assert.match(source, /section_code <> 'c'/)
  assert.match(source, /target_discipline_ref = 'technology'/)
  assert.match(source, /private\.eco02_curriculum_intake_scopes/)
})

test('the database validates the live P7 receipt, current baseline, trusted release and institutional binding', () => {
  const source = sql()
  assert.match(source, /from public\.lesson_preparation_receipts/)
  assert.match(source, /preparation_fingerprint = '311770ecff1401c4d9c7db855f4eeb3be983c6ece2ff39a1143889dd4782667e'/)
  assert.match(source, /from public\.annual_plan_curriculum_adoptions/)
  assert.match(source, /v_legacy\.id is distinct from expected_legacy_adoption_id/)
  assert.match(source, /v_legacy\.source_handoff_footprint_hash is distinct from expected_legacy_source_hash/)
  assert.match(source, /from private\.arena_2c_verified_sources/)
  assert.match(source, /from private\.arena_2c_institution_bindings/)
  assert.match(source, /v_source\.source_revision_id = '27'/)
  assert.match(source, /v_source\.source_content_footprint = '99c4ccc3'/)
  assert.match(source, /v_source\.release_structural_footprint = '8588371c'/)
  assert.match(source, /v_source\.curricolo_vigente = false/)
  assert.match(source, /from public\.teacher_workspace_settings/)
})

test('serializes competing decisions and disallows mutation access to receipt records', () => {
  const source = sql()
  assert.match(source, /for update of s/)
  assert.match(source, /unique \(workspace_id, academic_year_id, section_id, decision_request_id\)/)
  assert.match(source, /unique \(section_id, source_evidence_id\)/)
  assert.match(source, /revoke all on public\.annual_plan_2c_vertical_reference_receipts from public, anon, authenticated/)
  assert.match(source, /grant select on public\.annual_plan_2c_vertical_reference_receipts to authenticated/)
  assert.match(source, /revoke all on function public\.confirm_eco02_2c_vertical_reference/)
  assert.match(source, /grant execute on function public\.confirm_eco02_2c_vertical_reference/)
})
