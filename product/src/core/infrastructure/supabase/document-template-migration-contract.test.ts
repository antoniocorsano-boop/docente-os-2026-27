import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/0087_document_template_registry.sql')
const reviewFixMigrationPath = resolve(process.cwd(), 'supabase/migrations/0088_document_template_registry_review_fixes.sql')

function readGovernedMigrationSql() {
  return `${readFileSync(migrationPath, 'utf8')}\n${readFileSync(reviewFixMigrationPath, 'utf8')}`
}

test('document template registry migration enforces governed persistence', () => {
  const sql = readFileSync(migrationPath, 'utf8')
  assert.match(sql, /enable row level security/i)
  assert.match(sql, /revoke insert, update, delete/i)
  assert.match(sql, /activate_document_template_version/i)
  assert.match(sql, /Human Review|quality_review/i)
  assert.match(sql, /document_template_versions/i)
  assert.match(sql, /source_asset_id uuid/i)
  assert.match(sql, /active_version_no/i)
  assert.match(sql, /runtime_schema_required_migrations/i)
  assert.match(sql, /advance_runtime_schema_contract\('0087_document_template_registry'\)/i)
})

test('quality review is independently recomputed inside the database boundary', () => {
  const sql = readFileSync(migrationPath, 'utf8')
  assert.match(sql, /create or replace function private\.compute_document_template_quality_review/i)
  assert.match(sql, /computed_review\s+jsonb/i)
  assert.match(sql, /computed_review\s*:=\s*private\.compute_document_template_quality_review\(version_schema\)/i)
  assert.match(sql, /quality review does not match deterministic review/i)
})

test('trusted quality review validates the complete field and section schema before PASS', () => {
  const sql = readFileSync(migrationPath, 'utf8')
  assert.match(sql, /INVALID_SECTION_RENDER_ROLE/)
  assert.match(sql, /INVALID_SECTION_REQUIRED/)
  assert.match(sql, /INVALID_SECTION_REPEATABLE/)
  assert.match(sql, /INVALID_FIELD_TYPE/)
  assert.match(sql, /INVALID_FIELD_REQUIRED/)
  assert.match(sql, /INVALID_FIELD_CARDINALITY/)
  assert.match(sql, /INVALID_FIELD_VALUE_POLICY/)
  assert.match(sql, /INVALID_FIELD_PRIVACY_CLASS/)
})

test('trusted quality review rejects malformed option collections before PASS', () => {
  const sql = readFileSync(migrationPath, 'utf8')
  assert.match(sql, /INVALID_FIELD_OPTIONS/)
  assert.match(sql, /INVALID_FIELD_OPTION_VALUE/)
  assert.match(sql, /INVALID_FIELD_OPTION_LABEL/)
})

test('trusted quality review binds schema identity to the persisted registry row', () => {
  const sql = readFileSync(migrationPath, 'utf8')
  assert.match(sql, /TEMPLATE_KIND_MISMATCH/)
  assert.match(sql, /TEMPLATE_VERSION_MISMATCH/)
  assert.match(sql, /jsonb_typeof\(version_schema->'version'\)\s*<>\s*'number'/)
})

test('trusted quality review fails closed when section or field arrays are absent', () => {
  const sql = readFileSync(migrationPath, 'utf8')
  assert.match(
    sql,
    /jsonb_typeof\(target_schema_json->'sections'\)\s+is\s+distinct\s+from\s+'array'/i,
  )
  assert.match(
    sql,
    /jsonb_typeof\(section_node->'fields'\)\s+is\s+distinct\s+from\s+'array'/i,
  )
})

test('saving and reviewing a draft preserves live ACTIVE and historical RETIRED status separately', () => {
  const sql = readFileSync(reviewFixMigrationPath, 'utf8')
  const activePreservationBranches = sql.match(/when status = 'ACTIVE' and active_version_no is not null then 'ACTIVE'/gi) ?? []
  const retiredPreservationBranches = sql.match(/when status = 'RETIRED' then 'RETIRED'/gi) ?? []
  assert.equal(activePreservationBranches.length, 2)
  assert.equal(retiredPreservationBranches.length, 2)
})

test('template source identity preserves provenance for identical bytes', () => {
  const sql = readGovernedMigrationSql()
  assert.match(sql, /uq_document_template_sources_provenance/i)
  assert.match(sql, /source\.source_asset_id\s+is\s+not\s+distinct\s+from\s+target_source_asset_id/i)
  assert.match(sql, /source\.source_revision_ref\s+is\s+not\s+distinct\s+from\s+safe_revision_ref/i)
  assert.match(sql, /source\.source_kind\s*=\s*target_source_kind/i)
})

test('trusted purity guard blocks actual serialized internal states and policies', () => {
  const sql = readGovernedMigrationSql()
  assert.match(sql, /AUTO_DOCUMENTED\|TEACHER_CONFIRMATION\|OPTIONAL_PROPOSAL\|RESTRICTED\|QUALITY_REVIEWED\|REVIEW_REQUIRED/)
})
