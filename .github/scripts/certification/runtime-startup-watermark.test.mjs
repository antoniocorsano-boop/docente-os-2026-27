import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateMigrationInventory } from '../runtime-release-contract.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const STARTUP_PATH = path.join(ROOT, 'product/scripts/start-production.mjs')
const MIGRATION_DIR = path.join(ROOT, 'product/supabase/migrations')
const EXPECTED = '0100_contain_provenance_anchor_and_column_grants'

test('production startup release watermark matches repository migration inventory', () => {
  const source = readFileSync(STARTUP_PATH, 'utf8')
  const match = source.match(/const EXPECTED_RUNTIME_MIGRATION = ['\"]([^'\"]+)['\"]/)
  assert.ok(match, 'startup must declare an explicit EXPECTED_RUNTIME_MIGRATION release watermark')
  assert.equal(match[1], validateMigrationInventory(MIGRATION_DIR).latestMigrationId)
})

test('production startup does not derive its required migration from a pruned runtime filesystem', async () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'dos-runtime-startup-'))
  const productRoot = path.join(tempRoot, 'product')
  mkdirSync(path.join(productRoot, 'scripts'), { recursive: true })
  mkdirSync(path.join(productRoot, 'supabase/migrations'), { recursive: true })
  writeFileSync(path.join(productRoot, 'scripts/start-production.mjs'), readFileSync(STARTUP_PATH, 'utf8'))
  writeFileSync(
    path.join(productRoot, 'supabase/migrations/0097_generalized_authored_documents.sql'),
    '-- deployment fixture intentionally pruned after 0097\n',
  )

  const result = await runStartup(productRoot, {
    migrationId: EXPECTED,
    lineageOk: true,
    missingMigrations: [],
    provenanceOk: true,
    unexpectedMigrations: [],
    containmentOk: true,
    containment: {
      legacyAtlasRuntimeExposed: false,
      atlasBundleInsertGuardPresent: true,
      cpriRuntimeMutationGrants: false,
    },
  })

  assert.doesNotMatch(result.stderr, /Runtime schema mismatch:/)
  assert.match(result.stdout, new RegExp(`Runtime schema contract PASS: ${EXPECTED}`))
  assert.match(result.stdout, /Timetable visual extractor:/)
})

async function runStartup(productRoot, snapshot) {
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
        cwd: productRoot,
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
