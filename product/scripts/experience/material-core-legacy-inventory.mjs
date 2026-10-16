const BLOCKED = 'BLOCKED_FOR_AUTOMATIC_RECONCILIATION'
const PREPARED_ONLY = 'PREPARED_ONLY'
const RECONCILABLE = 'RECONCILABLE'
const REVALIDATION_REQUIRED = 'REVALIDATION_REQUIRED'

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isExactMaterialDigest(value) {
  return Boolean(
    value
      && typeof value === 'object'
      && value.algorithm === 'SHA-256'
      && value.canonicalization === 'docente-os.material-content.v1'
      && typeof value.value === 'string'
      && /^[a-f0-9]{64}$/i.test(value.value),
  )
}

/**
 * Classify one legacy prepared-material record without mutating it.
 *
 * This helper deliberately does not promote legacy APPROVED metadata into
 * canonical authority. It only identifies rows that have enough exact,
 * digest-bound evidence to be candidates for a later governed reconciliation.
 */
export function classifyLegacyPreparedMaterial(material) {
  if (!material || typeof material !== 'object' || Array.isArray(material)) {
    return BLOCKED
  }

  const { approvalState, canonicalBinding } = material

  if (approvalState === 'PENDING_HUMAN') {
    return PREPARED_ONLY
  }

  if (approvalState !== 'APPROVED') {
    return BLOCKED
  }

  const hasExactIdentity = nonEmptyString(material.assetId)
    && nonEmptyString(material.generationId)
  const hasExactDigest = isExactMaterialDigest(material.contentDigest)
  const hasLessonContext = nonEmptyString(material.canonicalBlockId)
    && nonEmptyString(material.projectionRef)
  const hasAcceptanceEvidence = material.explicitTeacherAcceptance === true
  const isAligned = canonicalBinding === 'ALIGNED'

  if (
    hasExactIdentity
    && hasExactDigest
    && hasLessonContext
    && hasAcceptanceEvidence
    && isAligned
  ) {
    return RECONCILABLE
  }

  return REVALIDATION_REQUIRED
}
