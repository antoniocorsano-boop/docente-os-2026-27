import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/0087_document_template_registry.sql')
const reviewFixMigrationPath = resolve(process.cwd(), 'supabase/migrations/0088_document_template_registry_review_fixes.sql')
const canonicalAlignmentMigrationPath = resolve(process.cwd(), 'supabase/migrations/0089_institutional_base_and_template_lifecycle.sql')
const lifecycleFixMigrationPath = resolve(process.cwd(), 'supabase/migrations/0090_document_template_lifecycle_contract_fixes.sql')
const institutionalBaseSnapshotMigrationPath = resolve(process.cwd(), 'supabase/migrations/0091_institutional_base_snapshot.sql')

function readGovernedMigrationSql() {
  return `${readFileSync(migrationPath, 'utf8')}\n${readFileSync(reviewFixMigrationPath, 'utf8')}\n${readFileSync(canonicalAlignmentMigrationPath, 'utf8')}\n${readFileSync(lifecycleFixMigrationPath, 'utf8')}\n${readFileSync(institutionalBaseSnapshotMigrationPath, 'utf8')}`
}

function readCanonicalAlignmentSql() {
  return `${readFileSync(canonicalAlignmentMigrationPath, 'utf8')}\n${readFileSync(lifecycleFixMigrationPath, 'utf8')}\n${readFileSync(institutionalBaseSnapshotMigrationPath, 'utf8')}`
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

test('canonical alignment adds a separately versioned institutional base registry', () => {
  const sql = readCanonicalAlignmentSql()
  assert.match(sql, /create table public\.institutional_bases/i)
  assert.match(sql, /create table public\.institutional_base_versions/i)
  assert.match(sql, /create table public\.institutional_base_quality_reviews/i)
  assert.match(sql, /create_institutional_base/i)
  assert.match(sql, /save_institutional_base_version/i)
  assert.match(sql, /record_institutional_base_quality_review/i)
  assert.match(sql, /activate_institutional_base_version/i)
  assert.match(sql, /institutional_base_snapshot/i)
  assert.match(sql, /institutional_base_version_snapshot/i)
})

test('both registries expose trusted block clear-block and retirement transitions', () => {
  const sql = readCanonicalAlignmentSql()
  for (const rpc of [
    'block_document_template',
    'clear_document_template_block',
    'retire_document_template',
    'block_institutional_base',
    'clear_institutional_base_block',
    'retire_institutional_base',
  ]) assert.match(sql, new RegExp(`function public\\.${rpc}`, 'i'))
  assert.match(sql, /lifecycle_decisions/i)
})

test('lifecycle mutation signatures trust only identity plus human note, never caller capability', () => {
  const sql = readCanonicalAlignmentSql()
  for (const rpc of [
    'block_document_template',
    'clear_document_template_block',
    'retire_document_template',
    'block_institutional_base',
    'clear_institutional_base_block',
    'retire_institutional_base',
  ]) {
    assert.match(sql, new RegExp(`function public\\.${rpc}\\(\\s*target_(?:template|base)_id uuid,\\s*target_note text\\s*\\)`, 'i'))
  }
  assert.match(sql, /drop function public\.block_document_template\(uuid, boolean, text\)/i)
  assert.match(sql, /drop function public\.block_institutional_base\(uuid, boolean, text\)/i)
  assert.doesNotMatch(sql, /target_(?:role|capability|governance_role)/i)
})

test('institutional lifecycle authority reuses canonical OWNER ADMIN workspace roles', () => {
  const sql = readCanonicalAlignmentSql()
  assert.match(sql, /workspace_memberships/i)
  assert.match(sql, /role\s+in\s*\(\s*'OWNER'\s*,\s*'ADMIN'\s*\)/i)
  assert.match(sql, /institutional lifecycle authority required/i)
})

test('lifecycle decision evidence persists the trusted actor workspace role', () => {
  const sql = readCanonicalAlignmentSql()
  assert.match(sql, /add column if not exists actor_workspace_role text/i)
  assert.match(sql, /alter column actor_workspace_role set not null/i)
  assert.match(sql, /actor_workspace_role\s+in\s*\(\s*'OWNER'\s*,\s*'ADMIN'\s*\)/i)
  assert.match(sql, /decided_by/i)
  assert.match(sql, /decided_at/i)
})

test('RETIRED is terminal for every mutating boundary in both registries', () => {
  const sql = readCanonicalAlignmentSql()
  const guards = sql.match(/cannot mutate RETIRED identity/gi) ?? []
  assert.ok(guards.length >= 12, `expected terminal guards on all mutating boundaries, found ${guards.length}`)
})

test('BLOCKED identities cannot activate directly and clearBlock only returns them to review', () => {
  const sql = readCanonicalAlignmentSql()
  assert.match(sql, /cannot activate BLOCKED identity/i)
  assert.match(sql, /set status = 'REVIEW_REQUIRED'/i)
})

test('save and quality review preserve BLOCKED until explicit clearBlock', () => {
  const sql = readCanonicalAlignmentSql()
  const preserveBlockGuards = sql.match(/preserve BLOCKED until clearBlock/gi) ?? []
  assert.ok(preserveBlockGuards.length >= 4, `expected BLOCKED preservation for save/review in both registries, found ${preserveBlockGuards.length}`)
})

test('retirement clears active pointers for future selection in both registries', () => {
  const sql = readCanonicalAlignmentSql()
  const clearPointers = sql.match(/active_version_no\s*=\s*null/gi) ?? []
  assert.ok(clearPointers.length >= 2, `expected both retirement paths to clear active pointers, found ${clearPointers.length}`)
})

test('historical exact-pin reads remain available after block or retirement', () => {
  const sql = readCanonicalAlignmentSql()
  assert.match(sql, /document_template_version_snapshot/i)
  assert.match(sql, /institutional_base_version_snapshot/i)
  assert.match(sql, /target_version_no/i)
})

test('canonical alignment advances the runtime schema contract at migration 0089', () => {
  const sql = readFileSync(canonicalAlignmentMigrationPath, 'utf8')
  assert.match(sql, /values \(89, '0089_institutional_base_and_template_lifecycle'\)/i)
  assert.match(sql, /advance_runtime_schema_contract\('0089_institutional_base_and_template_lifecycle'\)/i)
})

test('trusted lifecycle fixes advance the runtime schema contract at migration 0090', () => {
  const sql = readFileSync(lifecycleFixMigrationPath, 'utf8')
  assert.match(sql, /values \(90, '0090_document_template_lifecycle_contract_fixes'\)/i)
  assert.match(sql, /advance_runtime_schema_contract\('0090_document_template_lifecycle_contract_fixes'\)/i)
})

test('institutional base snapshot advances the runtime schema contract at migration 0091', () => {
  const sql = readFileSync(institutionalBaseSnapshotMigrationPath, 'utf8')
  assert.match(sql, /values \(91, '0091_institutional_base_snapshot'\)/i)
  assert.match(sql, /advance_runtime_schema_contract\('0091_institutional_base_snapshot'\)/i)
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
