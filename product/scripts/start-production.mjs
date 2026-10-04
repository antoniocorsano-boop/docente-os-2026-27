import { spawn } from 'node:child_process'

const port = process.env.PORT?.trim() || '3000'
const nextBin = process.platform === 'win32' ? 'next.cmd' : 'next'

if (process.env.DOCENTE_OS_RUNTIME_SCHEMA_PREFLIGHT?.trim().toLowerCase() === 'on') {
  await assertRuntimeSchemaReady()
}

console.log('Timetable visual extractor:', process.env.OPENAI_TIMETABLE_API_KEY?.trim() ? 'CONFIGURED' : 'UNAVAILABLE')

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

  const expectedMigration = '0086_timetable_backdated_replacement'
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

  console.log('Runtime schema contract PASS:', expectedMigration, 'lineage=PASS')
}

