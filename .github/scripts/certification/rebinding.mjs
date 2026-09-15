const REQUIRED_EQUIVALENCE = [
  'productTreeEquivalent',
  'lockfileEquivalent',
  'migrationSetEquivalent',
  'certificationContractEquivalent',
  'sourceCertificationComplete',
]

export function evaluateCertificationRebinding(input = {}) {
  const sourceSha = String(input.sourceSha ?? '').trim()
  const targetSha = String(input.targetSha ?? '').trim()
  const missing = []
  const failed = []

  if (!sourceSha) missing.push('sourceSha')
  if (!targetSha) missing.push('targetSha')
  if (sourceSha && targetSha && sourceSha === targetSha) failed.push('sourceSha must differ from targetSha')

  for (const key of REQUIRED_EQUIVALENCE) {
    if (typeof input[key] !== 'boolean') missing.push(key)
    else if (input[key] !== true) failed.push(key)
  }

  const eligible = missing.length === 0 && failed.length === 0

  return {
    schema: 'certification-rebinding.v1',
    sourceSha,
    targetSha,
    decision: eligible ? 'ELIGIBLE' : 'BLOCKED',
    checks: Object.fromEntries(
      REQUIRED_EQUIVALENCE.map((key) => [key, input[key] === true]),
    ),
    missing,
    failed,
    promotionAuthorized: false,
    persistentEffect: 'NONE',
    requiresRuntimeSmokeBeforePromotion: true,
  }
}
