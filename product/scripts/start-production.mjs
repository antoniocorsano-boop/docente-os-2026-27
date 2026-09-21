import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const port = process.env.PORT?.trim() || '3000'
const nextBin = process.platform === 'win32' ? 'next.cmd' : 'next'

if (process.env.DOCENTE_OS_RUNTIME_SCHEMA_PREFLIGHT?.trim().toLowerCase() === 'on') {
  await assertRuntimeSchemaReady()
}

const child = spawn(nextBin, ['start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  env: process.env,
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

async function assertRuntimeSchemaReady() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!supabaseUrl || !publishableKey) {
    throw new Error('Runtime schema preflight requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  }

  const expectedMigration = latestMigrationId()
  const response = await fetch(
    supabaseUrl.replace(/\/$/, '') + '/rest/v1/runtime_schema_contract_state?select=migration_id&singleton=eq.true',
    {
      headers: { apikey: publishableKey },
      signal: AbortSignal.timeout(15_000),
    },
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error('Runtime schema preflight failed: database contract unavailable (' + response.status + ') ' + detail.slice(0, 240))
  }

  const rows = await response.json()
  const actualMigration = Array.isArray(rows) ? rows[0]?.migration_id : null
  if (actualMigration !== expectedMigration) {
    throw new Error('Runtime schema mismatch: application requires ' + expectedMigration + ', database exposes ' + (actualMigration ?? 'none'))
  }

  console.log('Runtime schema contract PASS:', expectedMigration)
}

function latestMigrationId() {
  const migrationDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/migrations')
  const migrations = readdirSync(migrationDir)
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .map((name) => ({
      id: name.replace(/\.sql$/, ''),
      version: Number(name.slice(0, 4)),
    }))
    .sort((a, b) => a.version - b.version || a.id.localeCompare(b.id))

  const latest = migrations.at(-1)
  if (!latest || latest.version < 74) throw new Error('Runtime schema migration inventory is missing 0074+ contract')
  return latest.id
}
