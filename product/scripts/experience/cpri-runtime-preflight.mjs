import {
  classifyCpriRuntimeBaseline,
  readCpriRuntimeBaselineEnvironment,
} from './cpri-runtime-baseline-preflight.mjs'
import { scanCpriStaticRuntimeAuthority } from './cpri-static-runtime-authority.mjs'

const CPRI_RUNTIME_CONTRACT_VERSION = 102

export function classifyCpriRuntimePreflight({ runtimeSnapshot, staticAuthority }) {
  const baseline = classifyCpriRuntimeBaseline(runtimeSnapshot)
  const blockers = [...baseline.blockers]
  const contractVersion = runtimeSnapshot?.runtimeContract?.contractVersion

  if (!Number.isFinite(contractVersion) || contractVersion < CPRI_RUNTIME_CONTRACT_VERSION) {
    blockers.push('CPRI_RUNTIME_CONTRACT_BELOW_V102')
  }
  if (staticAuthority?.ok !== true) blockers.push('STATIC_RUNTIME_AUTHORITY_INVALID')

  const uniqueBlockers = [...new Set(blockers)]
  return uniqueBlockers.length > 0
    ? { status: 'BLOCKED', blockers: uniqueBlockers }
    : { status: 'READY', blockers: [] }
}

export async function runCpriRuntimePreflight({ repoRoot, ...environmentOptions }) {
  try {
    const runtimeSnapshot = await readCpriRuntimeBaselineEnvironment(environmentOptions)
    const staticAuthority = scanCpriStaticRuntimeAuthority(repoRoot ? { repoRoot } : undefined)
    return classifyCpriRuntimePreflight({ runtimeSnapshot, staticAuthority })
  } catch (error) {
    return {
      status: 'BLOCKED',
      blockers: [`CPRI_PREFLIGHT_FAILED:${safeErrorCode(error)}`],
    }
  }
}

function safeErrorCode(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[^A-Za-z0-9_.:-]+/g, '_').slice(0, 160) || 'UNKNOWN'
}
