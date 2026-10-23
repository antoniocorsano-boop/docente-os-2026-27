import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import baselineConfig from '../e2e/support/hva-governed-baseline-config.cjs'

const EXPECTED_RUNTIME_MIGRATION = '0103_material_reference_safety'
const { HVA_CANONICAL_NOW } = baselineConfig
const port = process.env.PORT?.trim() || '3000'
const nextBin = process.platform === 'win32' ? 'next.cmd' : 'next'

if (process.env.DOCENTE_OS_RUNTIME_SCHEMA_PREFLIGHT?.trim().toLowerCase() === 'on') {
  await assertRuntimeSchemaReady()
}

console.log('Timetable visual extractor:', process.env.OPENAI_TIMETABLE_API_KEY?.trim() ? 'CONFIGURED' : 'UNAVAILABLE')

const childEnv = buildChildEnvironment(process.env)
const child = spawn(nextBin, ['start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  env: childEnv,
  shell: process.platform === 'win32',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal)
  })
}

child.on('error', (error) => {
  console.error('Unable to start Next.js production server:', error)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exitCode = code ?? 1
})

function buildChildEnvironment(env) {
  const childEnv = { ...env }
  if (env.GITHUB_ACTIONS !== 'true' || env.EXPERIENCE_TARGET !== 'local') return childEnv

  const preloadPath = fileURLToPath(new URL('../e2e/support/hva-fixed-clock.cjs', import.meta.url))
  childEnv.HVA_FIXED_NOW = HVA_CANONICAL_NOW
  childEnv.NODE_OPTIONS = appendNodeRequire(childEnv.NODE_OPTIONS, preloadPath)
  console.log('HVA deterministic clock:', HVA_CANONICAL_NOW)
  return childEnv
}

function appendNodeRequire(existing, preloadPath) {
  const required = `--require=${preloadPath}`
  const normalized = existing?.trim()
  return normalized ? `${normalized} ${required}` : required
}

async function assertRuntimeSchemaReady() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !publishableKey) {
    throw new Error('Runtime schema preflight requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }

  const expectedMigration = EXPECTED_RUNTIME_MIGRATION
  const response = await fetch(
    supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/runtime_schema_contract_snapshot',
    {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        'content-type': 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(15_000),
    },
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error('Runtime schema preflight failed: database contract unavailable (' + response.status + ') ' + detail.slice(0, 240))
  }

  const payload = await response.json()
  const snapshot = Array.isArray(payload) ? payload[0] : payload
  const actualMigration = snapshot?.migrationId ?? null
  if (actualMigration !== expectedMigration) {
    throw new Error('Runtime schema mismatch: application requires ' + expectedMigration + ', database exposes ' + (actualMigration ?? 'none'))
  }

  if (snapshot?.lineageOk !== true) {
    const missing = Array.isArray(snapshot?.missingMigrations) ? snapshot.missingMigrations.join(', ') : 'unknown'
    throw new Error('Runtime schema lineage incomplete: missing ' + missing)
  }

  if (snapshot?.provenanceOk !== true) {
    const unexpected = Array.isArray(snapshot?.unexpectedMigrations) ? snapshot.unexpectedMigrations.join(', ') : 'unknown'
    throw new Error('Runtime schema provenance drift: unexpected ' + unexpected)
  }

  if (snapshot?.containmentOk !== true) {
    throw new Error('Runtime containment failed: ' + JSON.stringify(snapshot?.containment ?? null))
  }

  console.log('Runtime schema contract PASS:', expectedMigration, 'lineage=PASS provenance=PASS containment=PASS')
}
