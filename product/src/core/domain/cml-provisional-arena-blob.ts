import { createHash } from 'node:crypto'
import { selectArenaVerticalCurricoloSlice } from './cml-discipline-binding'
import { verifyCanonicalArenaReleaseForThreeGrades } from './cml-arena-three-grade-preflight'
import {
  projectProvisionalTechnologyReference,
  provisionalTechnologyGradeRef,
  type ProvisionalTechnologyGrade,
  type ProvisionalTechnologyReference,
} from './cml-provisional-technology-reference'

// Attested against the actual Arena v1.3 rev.27 emission in TRAMA #302.
// This is a source-integrity PIN, not an institute's formal approval.
export const TRUSTED_ARENA_2026_RELEASE_SHA256 =
  'de58f418b4d1fe0be449895736d6267f6c5a58c1b1a476b1f36558579a200809'
export const TRUSTED_ARENA_2026_SOURCE_FOOTPRINT = '99c4ccc3'
export const TRUSTED_ARENA_2026_REVISION = '27'
export const TRUSTED_ARENA_2026_INSTITUTION_ID = 'ics-lorenzo-milani'
export const TRUSTED_ARENA_2026_MAX_BYTES = 2_000_000

export function assertArenaReleaseDigest(
  input: Uint8Array,
  expectedSha256: string,
): void {
  if (input.byteLength < 1 || input.byteLength > TRUSTED_ARENA_2026_MAX_BYTES) {
    throw new Error('Arena release byte length rejected')
  }
  if (!/^[0-9a-f]{64}$/.test(expectedSha256)) {
    throw new Error('Arena release expected SHA-256 is malformed')
  }
  const computed = createHash('sha256').update(input).digest('hex')
  if (computed !== expectedSha256) {
    throw new Error('Arena release SHA-256 differs from qualified emission')
  }
}

/**
 * Authenticate exact release BYTES before parsing. The selection is read-only:
 * class-specific planning never changes the master or existing P7 receipts.
 * This function must only be called after the authenticated server has
 * established workspace/year/section/Technology assignment eligibility.
 */
export function projectPinnedArenaReleaseForClass(input: {
  bytes: Uint8Array
  grade: ProvisionalTechnologyGrade
  schoolYearRef: string
}): ProvisionalTechnologyReference {
  assertArenaReleaseDigest(input.bytes, TRUSTED_ARENA_2026_RELEASE_SHA256)
  const source = new TextDecoder('utf-8', { fatal: true }).decode(input.bytes)
  const release: unknown = JSON.parse(source)
  verifyCanonicalArenaReleaseForThreeGrades({
    release,
    targetInstitutionId: TRUSTED_ARENA_2026_INSTITUTION_ID,
    schoolYearRef: input.schoolYearRef,
    expectedRevisionId: TRUSTED_ARENA_2026_REVISION,
    expectedSourceContentFootprint: TRUSTED_ARENA_2026_SOURCE_FOOTPRINT,
  })
  const selected = selectArenaVerticalCurricoloSlice({
    release,
    target: {
      institutionId: TRUSTED_ARENA_2026_INSTITUTION_ID,
      schoolYearRef: input.schoolYearRef,
      schoolOrder: 'secondaria',
      gradeRef: provisionalTechnologyGradeRef(input.grade),
      disciplineRef: 'technology',
    },
  })
  return projectProvisionalTechnologyReference({
    selected,
    grade: input.grade,
    schoolYearRef: input.schoolYearRef,
  })
}
