#!/usr/bin/env node
/**
 * P0 / Issue #796: keep routine product CI on local or synthetic data.
 * No network calls, no database reads, no access to GitHub secrets.
 * This does not constrain external/browser cloud test infrastructure.
 */
import assert from 'node:assert/strict'
import {
  closeSync, constants, fstatSync, lstatSync, mkdirSync, mkdtempSync,
  openSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs'
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
    const authority = /^[a-z]+:\/\/([^/?#]+)/i.exec(value)?.[1]
    if (!authority || authority.includes('@') || /[\\$\s\x00-\x1f\x7f]/u.test(value)) return false

    const parsed = new URL(value)
    if (!ACCEPTED_PROTOCOLS.has(parsed.protocol) || !LOOPBACK.has(parsed.hostname) ||
        parsed.username || parsed.password) return false

    // PostgreSQL client parameters can replace the authority's host.
    return !parsed.protocol.startsWith('postgres') || (!value.includes('?') && !value.includes('#'))
  } catch {
    return false
  }
}

export function deniedSources(env) {
  const denied = []
  for (const name of [...DATABASE_TARGETS, ...REMOTE_TEST_TARGETS]) {
    const value = env[name]
    if (value && !isLoopbackUrl(value)) denied.push(name)
  }
  for (const name of [...RESTRICTED_CREDS, ...PROJECT_REFS]) {
    if (env[name]) denied.push(name)
  }
  return [...new Set(denied)].sort()
}

// A single-line subset of Next.js dotenv syntax. Reject ambiguous input before
// Next.js can interpret it differently or expand it using another source.
const DOTENV_ASSIGNMENT = /^(?:export[ \t]+)?([\w.-]+)(?:[ \t]*=[ \t]*|:[ \t]+)(.*)$/
const DOTENV_VALUE = /^(?:'([^'\\]*)'|"([^"\\]*)"|`([^`\\]*)`|([^#'"`\\]*?))[ \t]*(?:#.*)?$/

function loadEnvFile(filepath) {
  const metadata = lstatSync(filepath)
  if (!metadata.isFile() || !(metadata.mode & 0o444)) throw new Error('Unsafe dotenv file')

  const fd = openSync(filepath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
  try {
    const opened = fstatSync(fd)
    if (!opened.isFile() || opened.ino !== metadata.ino || opened.dev !== metadata.dev) {
      throw new Error('Dotenv file changed during inspection')
    }
    const parsed = Object.create(null)
    const content = readFileSync(fd, 'utf8')
    // Dotenv's multiline regex also recognizes these Unicode line boundaries.
    if (/[\u2028\u2029]/u.test(content)) throw new Error('Unsupported dotenv line separator')
    for (const raw of content.split(/\r\n?|\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      // Keep the trailing space in an empty colon assignment.
      const assignment = DOTENV_ASSIGNMENT.exec(raw.trimStart())
      const value = assignment && DOTENV_VALUE.exec(assignment[2])
      if (!value || Object.hasOwn(parsed, assignment[1])) throw new Error('Unsupported dotenv syntax')
      const normalized = value[1] ?? value[2] ?? value[3] ?? value[4].trim()
      if (normalized.includes('$')) throw new Error('Dotenv expansion is unsupported')
      parsed[assignment[1]] = normalized
    }
    return parsed
  } finally {
    closeSync(fd)
  }
}

export function checkSources(env, directories) {
  const failures = []
  const inProcess = deniedSources(env)
  if (inProcess.length) failures.push({ source: 'CI process environment', names: inProcess })

  const visited = new Set()
  for (const directory of directories) {
    let metadata
    try {
      metadata = lstatSync(directory)
    } catch (error) {
      if (error.code === 'ENOENT') continue
      failures.push({ source: 'dotenv directory', names: [] })
      continue
    }

    let names
    try {
      if (!metadata.isDirectory()) throw new Error('Unsafe dotenv directory')
      names = readdirSync(directory)
    } catch {
      failures.push({ source: 'dotenv directory', names: [] })
      continue
    }

    for (const name of names) {
      if (!/^\.env(?:\.|$)/.test(name) || /^\.env\.(?:example|sample|template)$/.test(name)) continue
      const file = path.join(directory, name)
      if (visited.has(file)) continue
      visited.add(file)
      try {
        const restricted = deniedSources(loadEnvFile(file))
        if (restricted.length) failures.push({ source: 'local dotenv configuration', names: restricted })
      } catch {
        failures.push({ source: 'local dotenv configuration', names: [] })
      }
    }
  }
  return failures
}

function selfTest() {
  assert.deepEqual(deniedSources({}), [])
  assert.deepEqual(deniedSources({
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    DATABASE_URL: 'postgresql://localhost:54322/postgres',
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
  for (const value of [
    'https://fictional.invalid@localhost',
    'https://localhost@fictional.invalid',
    'https://@localhost',
    'postgresql://local:local@localhost/postgres',
    'postgresql://localhost/postgres?host=fictional.invalid',
  ]) assert.equal(isLoopbackUrl(value), false, value)

  const temp = mkdtempSync(path.join(tmpdir(), 'p0-supabase-guard-'))
  try {
    const file = path.join(temp, '.env.production')
    const unsafe = [{ source: 'local dotenv configuration', names: [] }]
    const remote = [{ source: 'local dotenv configuration', names: ['NEXT_PUBLIC_SUPABASE_URL'] }]
    const cases = [
      ['remote equals assignment', 'NEXT_PUBLIC_SUPABASE_URL=https://fictional-live.supabase.co\n', remote],
      ['remote colon assignment', 'NEXT_PUBLIC_SUPABASE_URL: https://fictional-live.supabase.co\n', remote],
      ['Unicode line separator', '# comment\u2028SUPABASE_URL=https://fictional.invalid\n', unsafe],
      ['Unicode paragraph separator', '# comment\u2029SUPABASE_URL=https://fictional.invalid\n', unsafe],
      ['unset with comment', 'SUPABASE_SERVICE_ROLE_KEY= # intentionally unset\n', []],
      ['export and double quotes', 'export SUPABASE_URL="http://localhost:54321" # local\n', []],
      ['single quotes and CRLF', "SUPABASE_URL='http://[::1]:54321'\r\n", []],
      ['empty backticks', 'SUPABASE_SECRET_KEY=``\n', []],
      ['multiline value', 'SUPABASE_URL="http://localhost\n"\n', unsafe],
      ['duplicate assignment', 'SUPABASE_URL=https://fictional.invalid\nSUPABASE_URL=http://localhost\n', unsafe],
      ['variable expansion', 'SUPABASE_URL=http://localhost/${TARGET}\n', unsafe],
    ]
    for (const [label, contents, expected] of cases) {
      writeFileSync(file, contents)
      assert.deepEqual(checkSources({}, [temp]), expected, label)
    }
    rmSync(file)

    const target = path.join(temp, 'fixture')
    writeFileSync(target, 'NEXT_PUBLIC_SUPABASE_URL=https://fictional-live.supabase.co\n')
    symlinkSync(target, file)
    assert.deepEqual(checkSources({}, [temp]), unsafe, 'symlinked dotenv')
    rmSync(target)
    assert.deepEqual(checkSources({}, [temp]), unsafe, 'dangling dotenv symlink')
    rmSync(file)

    mkdirSync(file)
    assert.deepEqual(checkSources({}, [temp]), unsafe, 'non-regular dotenv')
    rmSync(file, { recursive: true })
    writeFileSync(file, 'SUPABASE_SERVICE_ROLE_KEY=fixture-only\n', { mode: 0o000 })
    assert.deepEqual(checkSources({}, [temp]), unsafe, 'unreadable dotenv')
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
      const reason = failure.names.length
        ? ' contains non-isolated variable(s): ' + failure.names.join(', ')
        : ' is unreadable, non-regular, or uses unsupported dotenv syntax'
      console.error('P0_CI_SUPABASE_ISOLATION_BLOCKED: ' + failure.source + reason)
    }
    process.exitCode = 1
    return
  }
  console.log('P0_CI_SUPABASE_ISOLATION=PASS (no real endpoints or privileged credentials detected)')
}

main()
