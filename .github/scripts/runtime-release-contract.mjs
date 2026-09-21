import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CONTRACT_PATH = path.join(ROOT, 'ops/runtime-release-contract.json')
const MIGRATION_DIR = path.join(ROOT, 'product/supabase/migrations')
const OUTPUT_PATH = process.env.RUNTIME_RELEASE_CONTRACT_OUTPUT
  ?? path.join(ROOT, 'test-results/release-runtime-contract/impact.json')

const COLLISION_PRONE_LOCALS = new Set([
  'id',
  'session_id',
  'registration_key',
  'workspace_id',
  'academic_year_id',
  'section_id',
  'observation_ids',
  'evidence_reference_ids',
  'request_signature',
  'status',
  'state',
  'source',
  'ordinal',
])

export function classifyPaths(changedFiles, contract) {
  const files = [...new Set(changedFiles.map(normalizePath).filter(Boolean))].sort()
  const matchesAny = (rules) => files.some((file) => rules.some((rule) => file === rule || file.startsWith(rule)))
  return {
    changedFiles: files,
    databaseDeep: matchesAny(contract.impact.databaseDeep),
    criticalWrite: matchesAny(contract.impact.criticalWrite),
    capabilityRuntime: matchesAny(contract.impact.capabilityRuntime),
  }
}

export function validateMigrationInventory(migrationDir = MIGRATION_DIR) {
  const files = readdirSync(migrationDir)
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort()

  const parsed = files.map((name) => ({
    name,
    id: name.replace(/\.sql$/, ''),
    version: Number(name.slice(0, 4)),
    content: readFileSync(path.join(migrationDir, name), 'utf8'),
  }))

  const bootstrap = parsed.find((item) => item.id === '0074_runtime_schema_contract')
  if (!bootstrap) throw new Error('0074_runtime_schema_contract.sql is required')

  const postBootstrap = parsed.filter((item) => item.version >= 74)
  const seen = new Set()
  for (const item of postBootstrap) {
    if (seen.has(item.version)) throw new Error('duplicate post-0074 migration number: ' + item.version)
    seen.add(item.version)
  }

  const ordered = [...postBootstrap].sort((a, b) => a.version - b.version)
  for (let index = 0; index < ordered.length; index += 1) {
    const expected = 74 + index
    if (ordered[index].version !== expected) {
      throw new Error('runtime migration sequence gap: expected ' + String(expected).padStart(4, '0') + ', found ' + ordered[index].id)
    }
    if (ordered[index].version > 74) {
      const escaped = ordered[index].id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      const marker = new RegExp("select\\s+private\\.advance_runtime_schema_contract\\(\\s*['\"]" + escaped + "['\"]\\s*\\)\\s*;", 'i')
      if (!marker.test(ordered[index].content)) {
        throw new Error(ordered[index].name + " must advance private.advance_runtime_schema_contract('" + ordered[index].id + "')")
      }
    }
  }

  const latest = ordered.at(-1)
  if (!latest) throw new Error('runtime migration inventory is empty')
  return { latestMigrationId: latest.id, migrationCount: parsed.length }
}

export function lintChangedPlpgsqlMigrations(changedFiles) {
  const findings = []
  for (const file of changedFiles.map(normalizePath)) {
    if (!file.startsWith('product/supabase/migrations/') || !file.endsWith('.sql')) continue
    const absolute = path.join(ROOT, file)
    let source = ''
    try {
      source = readFileSync(absolute, 'utf8')
    } catch {
      continue
    }

    for (const line of source.split(/\r?\n/)) {
      const match = /^\s*([a-z][a-z0-9_]*)\s+(uuid|text|integer|int|bigint|jsonb|boolean|date|time|timestamp|timestamptz|[a-z_]+\[\])(?:\s*:=.*)?;\s*$/i.exec(line)
      if (!match) continue
      const variable = match[1].toLowerCase()
      if (COLLISION_PRONE_LOCALS.has(variable)) {
        findings.push({ file, variable })
      }
    }
  }

  if (findings.length) {
    const summary = findings.map((item) => item.file + ': ' + item.variable).join(', ')
    throw new Error('PL/pgSQL identifier ambiguity risk: ' + summary)
  }
  return findings
}

export function validateCapabilityDeclaration(root = ROOT) {
  const render = readFileSync(path.join(root, 'render.yaml'), 'utf8')
  if (!/key:\s*GROQ_STT_API_KEY\s*\n\s*sync:\s*false/.test(render)) {
    throw new Error('Render Voice contract must keep GROQ_STT_API_KEY as a protected sync:false secret')
  }
  if (!/key:\s*DOCENTE_OS_VOICE_CAPTURE\s*\n\s*value:\s*on/.test(render)) {
    throw new Error('Render Voice contract must declare DOCENTE_OS_VOICE_CAPTURE=on explicitly')
  }
}

export function changedFilesFromGit(baseSha, testedSha) {
  if (baseSha && testedSha) {
    const stdout = execFileSync('git', ['diff', '--name-only', baseSha, testedSha], { cwd: ROOT, encoding: 'utf8' })
    return stdout.split(/\r?\n/).filter(Boolean)
  }
  const stdout = execFileSync('git', ['show', '--pretty=', '--name-only', testedSha || 'HEAD'], { cwd: ROOT, encoding: 'utf8' })
  return stdout.split(/\r?\n/).filter(Boolean)
}

function normalizePath(value) {
  return String(value ?? '').trim().replaceAll('\\\\', '/').replace(/^\.\//, '')
}

function main() {
  const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'))
  const baseSha = process.env.RUNTIME_CONTRACT_BASE_SHA ?? ''
  const testedSha = process.env.RUNTIME_CONTRACT_TESTED_SHA ?? process.env.GITHUB_SHA ?? 'HEAD'
  const changedFiles = changedFilesFromGit(baseSha, testedSha)
  const impact = classifyPaths(changedFiles, contract)
  const inventory = validateMigrationInventory()
  lintChangedPlpgsqlMigrations(changedFiles)
  validateCapabilityDeclaration()

  const receipt = {
    schema: contract.schema,
    generatedAt: new Date().toISOString(),
    baseSha: baseSha || null,
    testedSha,
    ...impact,
    ...inventory,
    checks: {
      migrationInventory: 'PASS',
      plpgsqlIdentifierPreflight: 'PASS',
      capabilityDeclaration: 'PASS',
    },
    runtimeReconciliationRequired: impact.databaseDeep || impact.criticalWrite || impact.capabilityRuntime,
    browserWriteFixtureRequired: impact.criticalWrite,
    browserWriteAutomated: false,
    browserWriteReason: impact.criticalWrite
      ? 'critical write changed; isolated E2E fixture must exist before automated Beta mutation is enabled'
      : 'not applicable',
  }

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(receipt, null, 2) + '\n')
  process.stdout.write(JSON.stringify(receipt, null, 2) + '\n')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
