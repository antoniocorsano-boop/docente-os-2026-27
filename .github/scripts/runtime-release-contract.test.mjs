import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  classifyPaths,
  lintChangedPlpgsqlMigrations,
  validateMigrationInventory,
  validateRuntimeLineageInventory,
} from './runtime-release-contract.mjs'

const contract = {
  impact: {
    databaseDeep: ['product/supabase/migrations/', 'product/src/core/infrastructure/supabase/'],
    criticalWrite: ['product/src/core/application/record-teaching-session', 'product/supabase/migrations/'],
    capabilityRuntime: ['render.yaml', 'product/src/core/application/voice/'],
  },
}

test('ordinary UI/docs change keeps deep database replay off', () => {
  const impact = classifyPaths(['docs/example.md', 'product/src/app/page.tsx'], contract)
  assert.equal(impact.databaseDeep, false)
  assert.equal(impact.criticalWrite, false)
  assert.equal(impact.capabilityRuntime, false)
})

test('migration change activates database and critical-write layers', () => {
  const impact = classifyPaths(['product/supabase/migrations/0075_example.sql'], contract)
  assert.equal(impact.databaseDeep, true)
  assert.equal(impact.criticalWrite, true)
})

test('post-0074 migrations must advance exact sequential watermark and register lineage', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dos-runtime-contract-'))
  writeFileSync(path.join(dir, '0074_runtime_schema_contract.sql'), 'select 1;')
  writeFileSync(
    path.join(dir, '0075_example.sql'),
    "insert into private.runtime_schema_required_migrations(version,migration_id) values (75,'0075_example');\nselect private.advance_runtime_schema_contract('0075_example');",
  )
  const result = validateMigrationInventory(dir)
  assert.equal(result.latestMigrationId, '0075_example')
})

test('post-0074 migration gap fails closed', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dos-runtime-contract-gap-'))
  writeFileSync(path.join(dir, '0074_runtime_schema_contract.sql'), 'select 1;')
  writeFileSync(path.join(dir, '0076_gap.sql'), "select private.advance_runtime_schema_contract('0076_gap');")
  assert.throws(() => validateMigrationInventory(dir), /sequence gap/)
})

test('runtime lineage from 0060 must be contiguous', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dos-runtime-lineage-'))
  writeFileSync(path.join(dir, '0060_first.sql'), 'select 1;')
  writeFileSync(path.join(dir, '0061_second.sql'), 'select 1;')
  writeFileSync(path.join(dir, '0062_third.sql'), 'select 1;')
  const result = validateRuntimeLineageInventory(dir)
  assert.equal(result.lineageStartVersion, 60)
  assert.equal(result.lineageLatestMigrationId, '0062_third')
  assert.equal(result.lineageMigrationCount, 3)
})

test('runtime lineage gap before 0074 fails closed', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dos-runtime-lineage-gap-'))
  writeFileSync(path.join(dir, '0060_first.sql'), 'select 1;')
  writeFileSync(path.join(dir, '0062_gap.sql'), 'select 1;')
  assert.throws(() => validateRuntimeLineageInventory(dir), /runtime lineage gap/)
})

test('post-0074 migration without lineage registration fails closed', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'dos-runtime-contract-register-'))
  writeFileSync(path.join(dir, '0074_runtime_schema_contract.sql'), 'select 1;')
  writeFileSync(path.join(dir, '0075_example.sql'), "select private.advance_runtime_schema_contract('0075_example');")
  assert.throws(() => validateMigrationInventory(dir), /must register itself/)
})

test('collision-prone local identifiers fail static preflight', () => {
  const root = process.cwd()
  const relativeDir = 'product/supabase/migrations'
  const absoluteDir = path.join(root, relativeDir)
  mkdirSync(absoluteDir, { recursive: true })
  const filename = '9999_runtime_contract_collision_fixture.sql'
  const absolute = path.join(absoluteDir, filename)
  writeFileSync(absolute, 'do $$ declare\n  session_id uuid;\nbegin null; end $$;')
  try {
    assert.throws(
      () => lintChangedPlpgsqlMigrations([relativeDir + '/' + filename]),
      /identifier ambiguity risk/,
    )
  } finally {
    unlinkSync(absolute)
  }
})
