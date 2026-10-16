import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  classifyPaths,
  lintChangedPlpgsqlMigrations,
  validateMigrationInventory,
  validateRuntimeLineageInventory,
  validateSensitiveRuntimeContainment,
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

test('sensitive containment rejects a legacy Atlas RPC that stays executable', () => {
  const migration = `
    create table if not exists public.canonical_plan_runtime_bindings (id uuid primary key);
    comment on table public.canonical_plan_runtime_bindings is 'CONTAIN-01 salvaged historical CPRI binding state; runtime mutation remains deferred';
    create or replace function public.accept_atlas_material_bundle(
      p_workspace_id uuid,
      p_academic_year_id uuid,
      p_section_id uuid,
      p_canonical_plan_asset_id uuid,
      p_canonical_generation_id uuid,
      p_block_id text,
      p_projection_id text,
      p_items jsonb
    ) returns void language plpgsql security definer as $$ begin null; end $$;
    grant execute on function public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) to authenticated;
  `
  assert.throws(
    () => validateSensitiveRuntimeContainment(migration),
    /legacy Atlas material write boundary must be revoked/,
  )
})

test('sensitive containment requires an authoritative Atlas bundle insert guard', () => {
  const migration = `
    create table if not exists public.canonical_plan_runtime_bindings (id uuid primary key);
    comment on table public.canonical_plan_runtime_bindings is 'CONTAIN-01 salvaged historical CPRI binding state; runtime mutation remains deferred';
    revoke all on function public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) from public, anon, authenticated, service_role;
  `
  assert.throws(
    () => validateSensitiveRuntimeContainment(migration),
    /legacy Studio Atlas bundle inserts must be blocked at the database boundary/,
  )
})

test('over-broad Atlas insert guard is rejected because ECO-02 manual reuse is protected', () => {
  const migration = `
    create table if not exists public.canonical_plan_runtime_bindings (id uuid primary key);
    comment on table public.canonical_plan_runtime_bindings is 'CONTAIN-01 salvaged historical CPRI binding state; runtime mutation remains deferred';
    revoke all on function public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) from public, anon, authenticated, service_role;
    create or replace function private.reject_deferred_atlas_lesson_design_insert() returns trigger language plpgsql as $$ begin if new.source_kind = 'ATLAS' then raise exception 'Studio Atlas lesson material runtime is deferred'; end if; return new; end $$;
    create trigger lesson_design_extensions_reject_deferred_atlas_insert before insert on public.lesson_design_extensions for each row execute function private.reject_deferred_atlas_lesson_design_insert();
  `
  assert.throws(
    () => validateSensitiveRuntimeContainment(migration),
    /containment guard must preserve governed ECO-02 Atlas reuse/,
  )
})

test('sensitive containment targets legacy bundle signatures while preserving governed Atlas reuse', () => {
  const migration = `
    create table if not exists public.canonical_plan_runtime_bindings (id uuid primary key);
    comment on table public.canonical_plan_runtime_bindings is 'CONTAIN-01 salvaged historical CPRI binding state; runtime mutation remains deferred';
    revoke all on function public.accept_atlas_material_bundle(uuid,uuid,uuid,uuid,uuid,text,text,jsonb) from public, anon, authenticated, service_role;
    create or replace function private.reject_deferred_atlas_lesson_design_insert() returns trigger language plpgsql as $$ begin if new.source_kind = 'ATLAS' and (new.payload ->> 'area' = 'atlas_materials' or new.payload ? 'bundleId' or new.payload ? 'sourceUdaId') then raise exception 'Studio Atlas lesson material runtime is deferred'; end if; return new; end $$;
    create trigger lesson_design_extensions_reject_deferred_atlas_insert before insert on public.lesson_design_extensions for each row execute function private.reject_deferred_atlas_lesson_design_insert();
  `
  const result = validateSensitiveRuntimeContainment(migration)
  assert.deepEqual(result, {
    canonicalPlanBindingAdopted: true,
    legacyAtlasWriteRevoked: true,
    atlasBundleInsertGuardDeclared: true,
  })
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

test('production startup preflight fails closed on provenance drift', async () => {
  const result = await runProductionStartupPreflight({
    migrationId: '0103_material_reference_safety',
    lineageOk: true,
    missingMigrations: [],
    provenanceOk: false,
    unexpectedMigrations: ['0102_rogue'],
    containmentOk: true,
    containment: { legacyAtlasRuntimeExposed: false, cpriRuntimeMutationGrants: false },
  })

  assert.notEqual(result.code, 0)
  assert.match(result.stderr, /Runtime schema provenance drift:.*0102_rogue/)
  assert.doesNotMatch(result.stdout, /Timetable visual extractor:/)
})

test('production startup preflight fails closed on containment drift', async () => {
  const result = await runProductionStartupPreflight({
    migrationId: '0103_material_reference_safety',
    lineageOk: true,
    missingMigrations: [],
    provenanceOk: true,
    unexpectedMigrations: [],
    containmentOk: false,
    containment: { legacyAtlasRuntimeExposed: true, cpriRuntimeMutationGrants: false },
  })

  assert.notEqual(result.code, 0)
  assert.match(result.stderr, /Runtime containment failed:.*legacyAtlasRuntimeExposed/)
  assert.doesNotMatch(result.stdout, /Timetable visual extractor:/)
})

async function runProductionStartupPreflight(snapshot) {
  const server = createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/rest/v1/rpc/runtime_schema_contract_snapshot') {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(snapshot))
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')

  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/start-production.mjs'], {
        cwd: path.resolve(process.cwd(), 'product'),
        env: {
          ...process.env,
          DOCENTE_OS_RUNTIME_SCHEMA_PREFLIGHT: 'on',
          NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${address.port}`,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
          PATH: '',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (chunk) => { stdout += chunk })
      child.stderr.on('data', (chunk) => { stderr += chunk })
      child.once('error', reject)
      child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }))
    })
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}
