#!/usr/bin/env node
/**
 * P0 / Issue #796: keep routine product CI on local or synthetic data.
 * No network calls, no database reads, no access to GitHub secrets.
 * This does not constrain external/browser cloud test infrastructure.
 */
import assert from 'node:assert/strict'
import { existsSync, lstatSync, readdirSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const DATABASE_TARGETS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_DB_URL',
  'DATABASE_URL',
  'DIRECT_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'PRODUCTION_SUPABASE_URL',
  'P7_REAL_DATABASE_URL',
]

const REMOTE_TEST_TARGETS = [
  'BROWSER_BASE_URL',
  'PLAYWRIGHT_BASE_URL',
  'E2E_BASE_URL',
  'TEST_BASE_URL',
  'INTEGRATION_TEST_BASE_URL',
  'PRODUCTION_BASE_URL',
]

const RESTRICTED_CREDS = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_S3_ACCESS_KEY_ID',
  'SUPABASE_S3_SECRET_ACCESS_KEY',
  'P7_REAL_PGPASSWORD',
  'P7_REAL_BACKUP_APPROVED',
]

const PROJECT_REFS = [
  'SUPABASE_PROJECT_ID',
  'SUPABASE_PROJECT_REF',
]

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])
const ACCEPTED_PROTOCOLS = new Set(['http:', 'https:', 'postgres:', 'postgresql:'])

export function isLoopbackUrl(value) {
  try {
    const parsed = new URL(value)
    return ACCEPTED_PROTOCOLS.has(parsed.protocol) && LOOPBACK.has(parsed.hostname)
  } catch {
    return false
  }
}

export function deniedSources(env) {
  const denied = []
  for (const name of [...DATABASE_TARGETS, ...REMOTE_TEST_TARGETS]) {
    const value = env[name]?.trim()
    if (value && !isLoopbackUrl(value)) denied.push(name)
  }
  for (const name of [...RESTRICTED_CREDS, ...PROJECT_REFS]) {
    if (env[name]?.trim()) denied.push(name)
  }
  return [...new Set(denied)].sort()
}

function loadEnvFile(filepath) {
  const content = readFileSync(filepath, 'utf8')
  const parsed = {}
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    let value = match[2]
    if (value.length >= 2 && (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )) value = value.slice(1, -1)
    parsed[match[1]] = value
  }
  return parsed
}

export function checkSources(env, directories) {
  const failures = []
  const inProcess = deniedSources(env)
  if (inProcess.length) failures.push({ source: 'CI process environment', names: inProcess })

  const visited = new Set()
  for (const directory of directories) {
    if (!existsSync(directory)) continue
    for (const name of readdirSync(directory)) {
      if (!/^\.env(?:\.|$)/.test(name) || /^\.env\.(?:example|sample|template)$/.test(name)) continue
      const file = path.join(directory, name)
      if (visited.has(file) || !lstatSync(file).isFile()) continue
      visited.add(file)
      const restricted = deniedSources(loadEnvFile(file))
      if (restricted.length) failures.push({ source: 'local dotenv configuration', names: restricted })
    }
  }
  return failures
}

function selfTest() {
  assert.deepEqual(deniedSources({}), [])
  assert.deepEqual(deniedSources({
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    DATABASE_URL: 'postgresql://local:local@localhost:54322/postgres',
    TEST_BASE_URL: 'http://localhost:3000',
  }), [])
  assert.deepEqual(deniedSources({
    NEXT_PUBLIC_SUPABASE_URL: 'https://fictional-live.supabase.co',
  }), ['NEXT_PUBLIC_SUPABASE_URL'])
  assert.deepEqual(deniedSources({
    DATABASE_URL: 'postgresql://user:secret@db.fictional-live.supabase.co:5432/postgres',
  }), ['DATABASE_URL'])
  assert.deepEqual(deniedSources({
    E2E_BASE_URL: 'https://fictional-production.example',
  }), ['E2E_BASE_URL'])
  assert.deepEqual(deniedSources({
    SUPABASE_ACCESS_TOKEN: 'fictional-token',
  }), ['SUPABASE_ACCESS_TOKEN'])
  assert.deepEqual(deniedSources({
    SUPABASE_PROJECT_REF: 'fictional-project-ref',
  }), ['SUPABASE_PROJECT_REF'])
  assert.deepEqual(deniedSources({
    NEXT_PUBLIC_SUPABASE_URL: 'not-an-url',
  }), ['NEXT_PUBLIC_SUPABASE_URL'])
  assert.deepEqual(deniedSources({
    NEXT_PUBLIC_SUPABASE_URL: 'https://fictional-live.supabase.co',
    DATABASE_URL: 'postgresql://u:p@db.fictional-live.supabase.co/postgres',
    SUPABASE_SECRET_KEY: 'private-value',
  }), ['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY'])
  const temp = mkdtempSync(path.join(tmpdir(), 'p0-supabase-guard-'))
  try {
    writeFileSync(path.join(temp, '.env.test'), 'NEXT_PUBLIC_SUPABASE_URL=https://fictional-live.supabase.co\\n')
    assert.deepEqual(checkSources({}, [temp]), [
      { source: 'local dotenv configuration', names: ['NEXT_PUBLIC_SUPABASE_URL'] },
    ])
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
  console.log('P0_CI_SUPABASE_ISOLATION_SELF_TEST=PASS')
}

function main() {
  if (process.argv[2] === '--self-test' && process.argv.length === 3) return selfTest()
  if (process.argv[2] !== '--check' || process.argv.length !== 3) {
    console.error('Usage: --self-test | --check')
    process.exitCode = 2
    return
  }

  const cwd = process.cwd()
  const failures = checkSources(process.env, [cwd, path.join(cwd, 'product')])
  if (failures.length) {
    // Intentionally print variable NAMES ONLY, never secret values or URLs.
    for (const failure of failures) {
      console.error('P0_CI_SUPABASE_ISOLATION_BLOCKED: ' + failure.source +
        ' contains non-isolated variable(s): ' + failure.names.join(', '))
    }
    process.exitCode = 1
    return
  }
  console.log('P0_CI_SUPABASE_ISOLATION=PASS (no real endpoints or privileged credentials detected)')
}

main()
