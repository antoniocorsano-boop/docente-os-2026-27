import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const BLOCKED = 'BLOCKED_FOR_AUTOMATIC_RECONCILIATION'
const PREPARED_ONLY = 'PREPARED_ONLY'
const RECONCILABLE = 'RECONCILABLE'
const REVALIDATION_REQUIRED = 'REVALIDATION_REQUIRED'

const LEGACY_MATERIAL_IDENTITY_TERMS = [
  'CLASS_LESSON_MATERIAL',
  'selectPreparedClassMaterials',
]

const LEGACY_APPROVAL_TERMS = [
  'approvalState',
  'PENDING_HUMAN',
  'APPROVED',
  'Confermato',
  'Predisposto',
]

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

function isRuntimeSourceFile(filename) {
  return /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(filename)
    && !/\.(?:test|spec)\./.test(filename)
}

async function walkRuntimeSources(rootDir, currentDir, results) {
  const entries = await readdir(currentDir, { withFileTypes: true })

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      await walkRuntimeSources(rootDir, absolutePath, results)
      continue
    }

    if (!entry.isFile() || !isRuntimeSourceFile(entry.name)) continue

    const source = await readFile(absolutePath, 'utf8')
    const identityMatches = LEGACY_MATERIAL_IDENTITY_TERMS.filter((term) => source.includes(term))
    const approvalMatches = LEGACY_APPROVAL_TERMS.filter((term) => source.includes(term))

    if (!identityMatches.length || !approvalMatches.length) continue

    results.push({
      path: path.relative(rootDir, absolutePath).split(path.sep).join('/'),
      identityMatches,
      approvalMatches,
    })
  }
}

/**
 * Scan all runtime source files for direct consumers of the legacy material
 * identity together with approval/display semantics. This deliberately avoids
 * a hand-curated file list and excludes tests/specs from the runtime inventory.
 */
export async function scanLegacyMaterialConsumers(rootDir) {
  const results = []
  await walkRuntimeSources(rootDir, rootDir, results)
  return results.sort((left, right) => left.path.localeCompare(right.path))
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
