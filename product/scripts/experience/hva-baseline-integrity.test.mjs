import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import './provision-hva-baseline.test.mjs'
import './provision-hva-baseline-lease.test.mjs'
import './provision-hva-baseline-hash.test.mjs'
import {
  buildHvaBaselineIntegrityReceipt,
  classifyHvaBaselineIntegrity,
} from './hva-baseline-integrity.mjs'

const ACTIVE_ID = '00000000-0000-0000-0000-000000000001'
const FINGERPRINT = 'a'.repeat(64)
const acceptanceReportPath = fileURLToPath(new URL('./acceptance-report.mjs', import.meta.url))
const productRoot = fileURLToPath(new URL('../../', import.meta.url))

function runtimeInput(overrides = {}) {
  return {
    fingerprint: FINGERPRINT,
    activeTimetableVersionId: ACTIVE_ID,
    baselineErrors: [],
    persistentFixtureIntegrity: { status: 'PASS', errors: [] },
    ...overrides,
  }
}

function baselineReceipt(phase, overrides = {}) {
  return {
    baselineId: 'HVA-GOV-01/v1',
    phase,
    status: 'PASS',
    fingerprint: FINGERPRINT,
    activeTimetableVersionId: ACTIVE_ID,
    persistentFixtureIntegrity: { status: 'PASS', errors: [] },
    diagnostics: [],
    ...overrides,
  }
}

async function runAcceptanceReport(t, { target = 'local', preflight, postflight } = {}) {
  const outputDir = await mkdtemp(join(tmpdir(), 'hva-acceptance-report-'))
  t.after(() => rm(outputDir, { recursive: true, force: true }))

  for (const [name, value] of [['preflight', preflight], ['postflight', postflight]]) {
    if (!value) continue
    const path = join(outputDir, 'baseline', `${name}.json`)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  }

  const result = spawnSync(process.execPath, [acceptanceReportPath], {
    cwd: productRoot,
    env: {
      ...process.env,
      EXPERIENCE_OUTPUT_DIR: outputDir,
      EXPERIENCE_TARGET: target,
      EXPERIENCE_TEST_EXIT_CODE: '0',
      EXPECTED_COMMIT: 'task6-test',
      EXPERIENCE_SCOPE_MODE: 'FOCUSED',
      EXPERIENCE_SCOPE_SPECS: 'e2e/experience/today-teacher-first.spec.mjs',
    },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  return JSON.parse(await readFile(join(outputDir, 'receipt', 'acceptance.json'), 'utf8'))
}

test('classifies a clean governed baseline as PASS', () => {
  assert.equal(classifyHvaBaselineIntegrity(runtimeInput()), 'PASS')
})

test('classifies semantic baseline drift as FAIL_BASELINE_DRIFT', () => {
  assert.equal(
    classifyHvaBaselineIntegrity(runtimeInput({ baselineErrors: ['missing canonical Calendar event'] })),
    'FAIL_BASELINE_DRIFT',
  )
})

test('classifies persistent B01 provenance drift as FAIL_FIXTURE_DRIFT', () => {
  assert.equal(
    classifyHvaBaselineIntegrity(runtimeInput({
      persistentFixtureIntegrity: { status: 'FAIL', errors: ['source timetable version no longer covers 2026-10-26'] },
    })),
    'FAIL_FIXTURE_DRIFT',
  )
})

test('classifies operational scanner failures as ERROR', () => {
  assert.equal(
    classifyHvaBaselineIntegrity(runtimeInput({ error: new Error('Supabase unavailable') })),
    'ERROR',
  )
})

test('postflight fails closed when the semantic fingerprint changes', () => {
  const preflight = buildHvaBaselineIntegrityReceipt({ phase: 'preflight', ...runtimeInput() })
  const postflight = buildHvaBaselineIntegrityReceipt({
    phase: 'postflight',
    ...runtimeInput({ fingerprint: 'b'.repeat(64) }),
    preflightReceipt: preflight,
  })

  assert.equal(postflight.status, 'FAIL_BASELINE_DRIFT')
  assert.match(postflight.diagnostics.join('\n'), /fingerprint changed/i)
})

test('postflight fails closed when ACTIVE runtime identity changes even if semantics hash the same', () => {
  const preflight = buildHvaBaselineIntegrityReceipt({ phase: 'preflight', ...runtimeInput() })
  const postflight = buildHvaBaselineIntegrityReceipt({
    phase: 'postflight',
    ...runtimeInput({ activeTimetableVersionId: '00000000-0000-0000-0000-000000000002' }),
    preflightReceipt: preflight,
  })

  assert.equal(postflight.status, 'FAIL_BASELINE_DRIFT')
  assert.match(postflight.diagnostics.join('\n'), /ACTIVE timetable identity changed/i)
})

test('postflight without a preflight receipt is ERROR', () => {
  const postflight = buildHvaBaselineIntegrityReceipt({ phase: 'postflight', ...runtimeInput() })
  assert.equal(postflight.status, 'ERROR')
  assert.match(postflight.diagnostics.join('\n'), /preflight receipt is required/i)
})

test('runtime scanner source is read-only and cannot activate or mutate baseline state', async () => {
  const source = await readFile(new URL('../../e2e/support/hva-governed-baseline-runtime.mjs', import.meta.url), 'utf8')
  for (const forbidden of ['.insert(', '.update(', '.delete(', "rpc('activate_timetable_version'", 'rpc("activate_timetable_version"']) {
    assert.equal(source.includes(forbidden), false, `runtime scanner must not contain ${forbidden}`)
  }
})

test('local acceptance receipt exposes PASS baseline fields when preflight and postflight agree', async (t) => {
  const receipt = await runAcceptanceReport(t, {
    target: 'local',
    preflight: baselineReceipt('preflight'),
    postflight: baselineReceipt('postflight'),
  })
  assert.equal(receipt.baselineId, 'HVA-GOV-01/v1')
  assert.equal(receipt.preflightFingerprint, FINGERPRINT)
  assert.equal(receipt.postflightFingerprint, FINGERPRINT)
  assert.equal(receipt.baselineIntegrity, 'PASS')
  assert.equal(receipt.persistentFixtureIntegrity, 'PASS')
  assert.equal(receipt.gates.baselineIntegrity, 'PASS')
  assert.equal(receipt.gates.persistentFixtureIntegrity, 'PASS')
})

test('local acceptance fails closed when governed baseline receipts are missing', async (t) => {
  const receipt = await runAcceptanceReport(t, { target: 'local' })
  assert.equal(receipt.gates.baselineIntegrity, 'FAIL')
  assert.equal(receipt.gates.persistentFixtureIntegrity, 'FAIL')
  const codes = new Set(receipt.findings.map((item) => item.code))
  assert.equal(codes.has('HVA-BASELINE-DRIFT'), true)
  assert.equal(codes.has('HVA-PERSISTENT-FIXTURE-DRIFT'), true)
})

test('local acceptance reports semantic fingerprint drift as HVA-BASELINE-DRIFT', async (t) => {
  const receipt = await runAcceptanceReport(t, {
    target: 'local',
    preflight: baselineReceipt('preflight'),
    postflight: baselineReceipt('postflight', {
      status: 'FAIL_BASELINE_DRIFT',
      fingerprint: 'b'.repeat(64),
      diagnostics: ['Baseline fingerprint changed'],
    }),
  })
  assert.equal(receipt.gates.baselineIntegrity, 'FAIL')
  assert.equal(receipt.findings.some((item) => item.code === 'HVA-BASELINE-DRIFT'), true)
})

test('local acceptance reports persistent B01 invalidity separately from semantic drift', async (t) => {
  const receipt = await runAcceptanceReport(t, {
    target: 'local',
    preflight: baselineReceipt('preflight'),
    postflight: baselineReceipt('postflight', {
      status: 'FAIL_FIXTURE_DRIFT',
      persistentFixtureIntegrity: { status: 'FAIL', errors: ['historical source version no longer covers 2026-10-26'] },
    }),
  })
  assert.equal(receipt.gates.baselineIntegrity, 'PASS')
  assert.equal(receipt.gates.persistentFixtureIntegrity, 'FAIL')
  assert.equal(receipt.findings.some((item) => item.code === 'HVA-PERSISTENT-FIXTURE-DRIFT'), true)
})

test('beta and preview acceptance make governed-baseline fields explicitly NOT_APPLICABLE', async (t) => {
  for (const target of ['beta', 'preview']) {
    const receipt = await runAcceptanceReport(t, { target })
    assert.equal(receipt.baselineId, 'NOT_APPLICABLE')
    assert.equal(receipt.preflightFingerprint, 'NOT_APPLICABLE')
    assert.equal(receipt.postflightFingerprint, 'NOT_APPLICABLE')
    assert.equal(receipt.baselineIntegrity, 'NOT_APPLICABLE')
    assert.equal(receipt.persistentFixtureIntegrity, 'NOT_APPLICABLE')
    assert.equal(receipt.gates.baselineIntegrity, 'NOT_APPLICABLE')
    assert.equal(receipt.gates.persistentFixtureIntegrity, 'NOT_APPLICABLE')
    assert.equal(receipt.findings.some((item) => item.code.startsWith('HVA-BASELINE') || item.code === 'HVA-PERSISTENT-FIXTURE-DRIFT'), false)
  }
})
