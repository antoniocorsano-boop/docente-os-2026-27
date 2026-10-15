const SHA_RE = /^[0-9a-f]{40}$/
const DEVELOPMENT_STATES = new Set(['success', 'pending', 'failure', 'error'])

const malformedLease = (expectedSha, liveSha, developmentStatus) => ({
  schema: 'cv2-candidate-lease.v1',
  expectedSha: expectedSha ?? null,
  liveSha: liveSha ?? null,
  developmentStatus: developmentStatus ?? null,
  authorized: false,
  reason: 'MALFORMED_INPUT',
  mergeAuthorized: false,
})

export function evaluateCandidateLease({ expectedSha, liveSha, developmentStatus } = {}) {
  if (!SHA_RE.test(expectedSha ?? '') || !SHA_RE.test(liveSha ?? '')) {
    return malformedLease(expectedSha, liveSha, developmentStatus)
  }
  if (developmentStatus !== null && developmentStatus !== undefined && !DEVELOPMENT_STATES.has(developmentStatus)) {
    return malformedLease(expectedSha, liveSha, developmentStatus)
  }

  let reason = 'AUTHORIZED'
  let authorized = true
  if (expectedSha !== liveSha) {
    authorized = false
    reason = 'STALE_HEAD'
  } else if (developmentStatus !== 'success') {
    authorized = false
    reason = developmentStatus == null ? 'DEVELOPMENT_STATUS_MISSING' : `DEVELOPMENT_${developmentStatus.toUpperCase()}`
  }

  return {
    schema: 'cv2-candidate-lease.v1',
    expectedSha,
    liveSha,
    developmentStatus: developmentStatus ?? null,
    authorized,
    reason,
    mergeAuthorized: false,
  }
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

export function evaluateCandidateQualification({ lease, required, results } = {}) {
  const receipt = {
    schema: 'cv2-candidate-qualification.v1',
    outcome: 'FAIL',
    reasons: [],
    required: isPlainObject(required) ? { ...required } : null,
    results: isPlainObject(results) ? { ...results } : null,
    mergeAuthorized: false,
  }

  if (!lease || lease.schema !== 'cv2-candidate-lease.v1' || lease.authorized !== true || lease.mergeAuthorized !== false) {
    receipt.reasons.push('LEASE_DENIED')
    return receipt
  }
  if (!isPlainObject(required) || !isPlainObject(results)) {
    receipt.reasons.push('MALFORMED_GATE_INPUT')
    return receipt
  }

  for (const [gate, isRequired] of Object.entries(required)) {
    if (typeof isRequired !== 'boolean') {
      receipt.reasons.push(`MALFORMED_REQUIRED:${gate}`)
      return receipt
    }
    const state = results[gate]
    if (isRequired) {
      if (state !== 'success') receipt.reasons.push(`REQUIRED_NOT_SUCCESS:${gate}`)
      continue
    }
    if (state !== undefined && state !== 'success' && state !== 'skipped') {
      receipt.reasons.push(`OPTIONAL_INVALID_STATE:${gate}`)
    }
  }

  for (const [gate, state] of Object.entries(results)) {
    if (!(gate in required)) {
      receipt.reasons.push(`UNDECLARED_RESULT:${gate}`)
      continue
    }
    if (state === 'skipped' && required[gate] !== false) {
      receipt.reasons.push(`ILLEGAL_SKIP:${gate}`)
    }
  }

  if (receipt.reasons.length === 0) receipt.outcome = 'PASS'
  return receipt
}
