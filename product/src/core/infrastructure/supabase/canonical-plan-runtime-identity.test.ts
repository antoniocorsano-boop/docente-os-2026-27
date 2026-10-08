import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const migrationUrl = new URL('../../../../supabase/migrations/0088_canonical_plan_runtime_identity.sql', import.meta.url)
const repositorySource = readFileSync(new URL('./supabase-canonical-plan-source-repository.ts', import.meta.url), 'utf8')

test('canonical plan runtime identity is governed by a workspace/year binding table', () => {
  assert.equal(
    existsSync(migrationUrl),
    true,
    'CPRI-01 requires migration 0088_canonical_plan_runtime_identity.sql before runtime resolution can be authoritative',
  )

  const migrationSource = readFileSync(migrationUrl, 'utf8')

  assert.match(migrationSource, /create table(?: if not exists)? public\.canonical_plan_runtime_bindings/i)
  assert.match(
    migrationSource,
    /unique\s*\(\s*workspace_id\s*,\s*academic_year_id\s*,\s*canonical_plan_code\s*\)/i,
    'one CAN-PLAN binding must exist per workspace and academic year',
  )
  assert.match(migrationSource, /CAN-PLAN-(?:1|2|3)/i, 'the database contract must bound the supported logical CAN-PLAN identities')
  assert.match(migrationSource, /SUCCEEDED/i, 'the database contract must reject a generation that is not ready')
  assert.match(
    migrationSource,
    /workspace_id[\s\S]*academic_year_id[\s\S]*asset_id[\s\S]*generation_id/i,
    'the binding must preserve workspace, academic year, asset and generation integrity as one governed identity',
  )
})

test('canonical plan resolver reads the governed binding instead of JSON metadata', () => {
  assert.ok(
    repositorySource.includes(".from('canonical_plan_runtime_bindings')"),
    'runtime resolution must read the governed CAN-PLAN binding table',
  )
  assert.doesNotMatch(
    repositorySource,
    /canonicalExecCode/,
    'source_metadata.canonicalExecCode is transitional discovery metadata and must not remain runtime authority',
  )
})

test('the governed identity contract keeps cross-workspace materializations fail-closed', () => {
  assert.equal(existsSync(migrationUrl), true)
  const migrationSource = readFileSync(migrationUrl, 'utf8')

  assert.match(
    migrationSource,
    /canonical_plan_runtime_bindings[\s\S]*(?:trigger|function)[\s\S]*workspace/i,
    'the database must enforce workspace coherence rather than trusting caller-supplied UUIDs',
  )
  assert.match(
    migrationSource,
    /generation_id[\s\S]*asset_id|asset_id[\s\S]*generation_id/i,
    'the database must enforce generation-to-asset coherence',
  )
})
