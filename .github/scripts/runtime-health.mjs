import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appUrl = process.env.DOCENTE_OS_BETA_URL ?? 'https://docente-os-2026-27-beta.onrender.com'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://gnshgapmwyjamhmlikeg.supabase.co'
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_4Hqwe3dIqEWGrqSZmmQB8w_TgsfKc7L'
const email = process.env.E2E_EMAIL ?? 'docente-os-e2e-2dbf49e1@example.invalid'
const password = process.env.E2E_PASSWORD

if (!password) throw new Error('E2E_PASSWORD is required for the runtime health probe')

const receipt = {
  checkedAt: new Date().toISOString(),
  appUrl,
  checks: {},
}

const build = await timedFetchWithRetry(`${appUrl}/api/build-info`, undefined, {
  attempts: 3,
  timeoutMs: 20_000,
  delayMs: 2_000,
})
assert.equal(build.response.status, 200, `build-info returned ${build.response.status}`)
const buildInfo = await build.response.json()
assert.match(buildInfo.commit ?? '', /^[0-9a-f]{40}$/i, 'build-info must expose a 40-char commit SHA')
receipt.deployedCommit = buildInfo.commit
receipt.checks.buildInfoMs = build.elapsedMs
receipt.checks.buildInfoAttempts = build.attempts
receipt.checks.buildInfoColdStartRecovered = build.attempts > 1 ? 'YES' : 'NO'

const loginPage = await timedFetch(`${appUrl}/login`)
assert.equal(loginPage.response.status, 200, `login page returned ${loginPage.response.status}`)
const loginHtml = await loginPage.response.text()
assert.match(loginHtml, /Ho dimenticato la password/i, 'login must expose the password recovery path')
assert.match(loginHtml, /Invia collegamento di recupero/i, 'login must expose an explicit recovery action')
receipt.checks.loginPageMs = loginPage.elapsedMs
receipt.checks.recoverySurface = 'PASS'

const passwordSetup = await timedFetch(`${appUrl}/imposta-password`, { redirect: 'manual' })
if ([302, 303, 307, 308].includes(passwordSetup.response.status)) {
  const location = passwordSetup.response.headers.get('location') ?? ''
  assert.match(location, /\/login\?error=session_required/, 'password setup redirect must require a verified session')
} else {
  assert.equal(passwordSetup.response.status, 200, `password setup without session returned ${passwordSetup.response.status}`)
  const passwordSetupHtml = await passwordSetup.response.text()
  assert.doesNotMatch(passwordSetupHtml, /Salva password e continua/i, 'password form must not be exposed without a verified session')
  assert.match(
    passwordSetupHtml,
    /NEXT_REDIRECT;replace;\/login\?error=session_required;307;|url=\/login\?error=session_required/i,
    'unauthenticated password setup must encode the Next.js redirect to login',
  )
}
receipt.checks.passwordSetupBoundaryMs = passwordSetup.elapsedMs
receipt.checks.passwordSetupBoundary = 'PASS'

const auth = await timedFetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    apikey: publishableKey,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
})
assert.equal(auth.response.status, 200, `Supabase authentication returned ${auth.response.status}`)
const authPayload = await auth.response.json()
assert.ok(authPayload.access_token, 'Supabase authentication did not return an access token')
receipt.checks.authMs = auth.elapsedMs

const db = await timedFetch(`${supabaseUrl}/rest/v1/assistant_write_proposals?select=id&limit=1`, {
  headers: {
    apikey: publishableKey,
    authorization: `Bearer ${authPayload.access_token}`,
  },
})
assert.equal(db.response.status, 200, `Authenticated database probe returned ${db.response.status}`)
receipt.checks.databaseMs = db.elapsedMs

const expectedMigration = latestMigrationId()
const schemaContract = await timedFetch(`${supabaseUrl}/rest/v1/runtime_schema_contract_state?select=migration_id&singleton=eq.true`, {
  headers: {
    apikey: publishableKey,
    authorization: `Bearer ${authPayload.access_token}`,
  },
})
assert.equal(schemaContract.response.status, 200, `Runtime schema contract returned ${schemaContract.response.status}`)
const schemaRows = await schemaContract.response.json()
const actualMigration = Array.isArray(schemaRows) ? schemaRows[0]?.migration_id : null
assert.equal(
  actualMigration,
  expectedMigration,
  `Runtime schema drift: repository requires ${expectedMigration}, Beta exposes ${actualMigration ?? 'none'}`,
)
receipt.checks.runtimeSchemaContract = 'PASS'
receipt.checks.expectedMigration = expectedMigration
receipt.checks.actualMigration = actualMigration
receipt.checks.runtimeSchemaMs = schemaContract.elapsedMs

console.log(JSON.stringify(receipt, null, 2))

async function timedFetch(url, init) {
  const started = performance.now()
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) })
  return { response, elapsedMs: Math.round(performance.now() - started) }
}

async function timedFetchWithRetry(url, init, options = {}) {
  const attempts = options.attempts ?? 3
  const timeoutMs = options.timeoutMs ?? 20_000
  const delayMs = options.delayMs ?? 2_000
  const retryableStatuses = new Set([502, 503, 504])
  const started = performance.now()
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
      const retryableStatus = retryableStatuses.has(response.status)

      if (!retryableStatus || attempt === attempts) {
        return {
          response,
          elapsedMs: Math.round(performance.now() - started),
          attempts: attempt,
        }
      }
    } catch (error) {
      lastError = error
      if (!isTransientFetchError(error) || attempt === attempts) throw error
    }

    await sleep(delayMs)
  }

  throw lastError ?? new Error('Runtime health retry exhausted without a response')
}

function isTransientFetchError(error) {
  return error?.name === 'TimeoutError'
    || error?.name === 'AbortError'
    || error instanceof TypeError
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function latestMigrationId() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const migrations = readdirSync(path.join(root, 'product/supabase/migrations'))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .map((name) => ({ id: name.replace(/\.sql$/, ''), version: Number(name.slice(0, 4)) }))
    .sort((a, b) => a.version - b.version || a.id.localeCompare(b.id))
  const latest = migrations.at(-1)
  if (!latest || latest.version < 74) throw new Error('Runtime schema migration inventory is missing 0074+ contract')
  return latest.id
}
