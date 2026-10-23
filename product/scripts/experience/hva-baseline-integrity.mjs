import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import { validateHvaBaselineSnapshot } from '../../e2e/support/hva-governed-baseline-contract.mjs'

const require = createRequire(import.meta.url)
const { HVA_BASELINE_ID } = require('../../e2e/support/hva-governed-baseline-config.cjs')

const RECEIPT_DIR = resolve(process.cwd(), 'test-results/experience/baseline')
const PREFLIGHT_PATH = resolve(RECEIPT_DIR, 'preflight.json')
const POSTFLIGHT_PATH = resolve(RECEIPT_DIR, 'postflight.json')

export function classifyHvaBaselineIntegrity({
  baselineErrors = [],
  persistentFixtureIntegrity = { status: 'PASS', errors: [] },
  error = null,
} = {}) {
  if (error) return 'ERROR'
  if (baselineErrors.length > 0) return 'FAIL_BASELINE_DRIFT'
  if (persistentFixtureIntegrity?.status !== 'PASS') return 'FAIL_FIXTURE_DRIFT'
  return 'PASS'
}

export function buildHvaBaselineIntegrityReceipt({
  phase,
  fingerprint = null,
  activeTimetableVersionId = null,
  baselineErrors = [],
  persistentFixtureIntegrity = { status: 'PASS', errors: [] },
  preflightReceipt = null,
  error = null,
} = {}) {
  if (!['preflight', 'postflight'].includes(phase)) {
    throw new Error('HVA baseline integrity phase must be preflight or postflight')
  }

  const diagnostics = []
  let status = classifyHvaBaselineIntegrity({ baselineErrors, persistentFixtureIntegrity, error })

  if (error) diagnostics.push(error instanceof Error ? error.message : String(error))
  diagnostics.push(...baselineErrors)
  diagnostics.push(...(persistentFixtureIntegrity?.errors ?? []))

  if (phase === 'postflight') {
    if (!preflightReceipt) {
      status = 'ERROR'
      diagnostics.push('Preflight receipt is required before postflight integrity comparison')
    } else if (status !== 'ERROR') {
      if (preflightReceipt.fingerprint !== fingerprint) {
        status = 'FAIL_BASELINE_DRIFT'
        diagnostics.push(`Baseline fingerprint changed: ${preflightReceipt.fingerprint ?? 'null'} -> ${fingerprint ?? 'null'}`)
      }
      if (preflightReceipt.activeTimetableVersionId !== activeTimetableVersionId) {
        status = 'FAIL_BASELINE_DRIFT'
        diagnostics.push(
          `ACTIVE timetable identity changed: ${preflightReceipt.activeTimetableVersionId ?? 'null'} -> ${activeTimetableVersionId ?? 'null'}`,
        )
      }
    }
  }

  return {
    baselineId: HVA_BASELINE_ID,
    phase,
    status,
    fingerprint,
    activeTimetableVersionId,
    persistentFixtureIntegrity,
    diagnostics,
  }
}

export async function runHvaBaselineIntegrityCli({
  phase,
  receiptDir = RECEIPT_DIR,
} = {}) {
  if (!['preflight', 'postflight'].includes(phase)) {
    throw new Error('Usage: node scripts/experience/hva-baseline-integrity.mjs preflight|postflight')
  }
  if (process.env.EXPERIENCE_TARGET && process.env.EXPERIENCE_TARGET !== 'local') {
    throw new Error('HVA governed baseline integrity applies only to EXPERIENCE_TARGET=local')
  }

  const preflightPath = resolve(receiptDir, 'preflight.json')
  const outputPath = phase === 'preflight' ? preflightPath : resolve(receiptDir, 'postflight.json')
  await mkdir(receiptDir, { recursive: true })

  let receipt
  try {
    if (phase === 'preflight') {
      const { runHvaBaselineProvisioning } = await import('./provision-hva-baseline.mjs')
      const dryRun = await runHvaBaselineProvisioning({
        argv: ['--dry-run', '--plan-file', resolve(receiptDir, 'provision-plan.json')],
      })
      process.stdout.write(
        `HVA baseline provision dry-run: ${dryRun.status} · ${dryRun.plan.baselineId} · ${dryRun.plan.planSha256}\n`,
      )
    }

    const { readHvaGovernedBaselineRuntime } = await import('../../e2e/support/hva-governed-baseline-runtime.mjs')
    const runtime = await readHvaGovernedBaselineRuntime()
    const baselineErrors = validateHvaBaselineSnapshot(runtime.snapshot)
    const preflightReceipt = phase === 'postflight' ? await readJsonIfExists(preflightPath) : null

    receipt = buildHvaBaselineIntegrityReceipt({
      phase,
      fingerprint: runtime.fingerprint,
      activeTimetableVersionId: runtime.runtimeIds?.activeTimetableVersionId ?? null,
      baselineErrors,
      persistentFixtureIntegrity: runtime.persistentFixtureIntegrity,
      preflightReceipt,
    })
  } catch (error) {
    receipt = buildHvaBaselineIntegrityReceipt({ phase, error })
  }

  receipt.generatedAt = new Date().toISOString()
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  process.stdout.write(
    `HVA baseline ${phase}: ${receipt.status} · ${receipt.baselineId} · ${receipt.fingerprint ?? 'no-fingerprint'}\n`,
  )
  return receipt
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  const receipt = await runHvaBaselineIntegrityCli({ phase: process.argv[2] })
  if (receipt.status !== 'PASS') process.exitCode = 1
}

export const HVA_BASELINE_PREFLIGHT_PATH = PREFLIGHT_PATH
export const HVA_BASELINE_POSTFLIGHT_PATH = POSTFLIGHT_PATH
