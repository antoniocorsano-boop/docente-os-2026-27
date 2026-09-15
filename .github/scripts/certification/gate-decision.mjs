import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

export const KNOWN_CERTIFICATION_GATES = Object.freeze([
  'HVA',
  'WCAG_2_2_AA',
  'P6_PERFORMANCE',
  'X4_PLANNER_WRITE',
  'ASVS_5_0',
])

function runFailClosed(gate, reason) {
  return {
    schema: 'certification-gate-decision.v1',
    gate,
    decision: 'RUN',
    run: true,
    failClosed: true,
    reason,
    mergeAuthorized: false,
  }
}

export function decideGateExecution({ receipt, gate, expectedBaseSha, expectedTestedSha }) {
  if (!KNOWN_CERTIFICATION_GATES.includes(gate)) {
    return runFailClosed(gate, `unknown gate ${String(gate ?? '')}`)
  }

  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    return runFailClosed(gate, 'impact receipt missing or invalid')
  }

  if (receipt.schema !== 'certification-impact.v1') {
    return runFailClosed(gate, 'unexpected impact receipt schema')
  }

  if (receipt.orchestrationAuthorized !== true || receipt.advisoryOnly !== false) {
    return runFailClosed(gate, 'impact receipt is not authorized for selective orchestration')
  }

  if (receipt.mergeAuthorized !== false) {
    return runFailClosed(gate, 'impact receipt violates merge authority boundary')
  }

  if (!Array.isArray(receipt.requiredGates)) {
    return runFailClosed(gate, 'requiredGates is missing or invalid')
  }

  if (typeof expectedBaseSha === 'string' && expectedBaseSha.length > 0 && receipt.baseSha !== expectedBaseSha) {
    return runFailClosed(gate, 'base SHA mismatch')
  }

  if (
    typeof expectedTestedSha === 'string' &&
    expectedTestedSha.length > 0 &&
    receipt.testedSha !== expectedTestedSha
  ) {
    return runFailClosed(gate, 'tested SHA mismatch')
  }

  if (receipt.conservative !== false) {
    return runFailClosed(gate, 'conservative impact receipt requires full certification')
  }

  if (receipt.requiredGates.includes(gate)) {
    return {
      schema: 'certification-gate-decision.v1',
      gate,
      decision: 'RUN',
      run: true,
      failClosed: false,
      reason: 'gate explicitly required by exact-head impact receipt',
      mergeAuthorized: false,
    }
  }

  return {
    schema: 'certification-gate-decision.v1',
    gate,
    decision: 'SKIP',
    run: false,
    failClosed: false,
    reason: 'gate not required by exact-head impact receipt',
    mergeAuthorized: false,
  }
}

function runCli() {
  const [gate, receiptPath, expectedBaseSha = '', expectedTestedSha = ''] = process.argv.slice(2)
  let receipt = null
  try {
    receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
  } catch {
    const decision = runFailClosed(gate, 'impact receipt cannot be read or parsed')
    process.stdout.write(`${JSON.stringify(decision)}\n`)
    return
  }

  const decision = decideGateExecution({ receipt, gate, expectedBaseSha, expectedTestedSha })
  process.stdout.write(`${JSON.stringify(decision)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli()
}
