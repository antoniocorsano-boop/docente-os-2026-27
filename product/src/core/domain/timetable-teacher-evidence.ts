export const TT_TEACHER_UNICODE_VERSION = '17.0.0' as const

export type TeacherEvidenceResult = 'SAME' | 'DISTINCT' | 'UNKNOWN'
export type TeacherEvidenceSignal = Readonly<{ kind: string; value: string }>

export type TeacherEvidenceRule = Readonly<{
  allOf: readonly string[]
}>

export type TeacherEvidenceProfile = Readonly<{
  profileId: string
  profileVersion: string
  parserFamily: string
  parserVersion: string
  sameRules: readonly TeacherEvidenceRule[]
  distinctRules: readonly TeacherEvidenceRule[]
}>

export type TeacherSelectionCandidate = Readonly<{
  occurrenceIds: readonly string[]
}>

const WHITE_SPACE = /[\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/gu
const APOSTROPHES = /[\u2019\u2018\u02BC]/gu
const HYPHENS = /[\u2010\u2011\u2012\u2013\u2014\u2212]/gu

/**
 * TT-TEACHER-NORM-1.
 *
 * IMPORTANT: String#normalize and toLowerCase are used only for the subset whose
 * behaviour is locked by the G1.6 fixtures. Full Unicode 17 case folding must
 * be backed by frozen Unicode 17 data before this function may leave PREVIEW_ONLY.
 */
export function normalizeTeacherLabel(value: string): string {
  assertUnicodeScalarString(value)
  return value
    .normalize('NFC')
    .replace(WHITE_SPACE, ' ')
    .trim()
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(HYPHENS, '-')
}

export function validateTeacherEvidenceProfile(profile: TeacherEvidenceProfile | null | undefined): boolean {
  if (!profile) return false
  if (!profile.profileId.trim() || !profile.profileVersion.trim() || !profile.parserFamily.trim() || !profile.parserVersion.trim()) return false
  const rules = [...profile.sameRules, ...profile.distinctRules]
  return rules.every((rule) => rule.allOf.length > 0 && rule.allOf.every((kind) => kind.trim().length > 0))
}

export function sameTeacherEvidence(
  signals: readonly TeacherEvidenceSignal[],
  profile: TeacherEvidenceProfile | null | undefined,
): TeacherEvidenceResult {
  if (!validateTeacherEvidenceProfile(profile) || !profile) return 'UNKNOWN'
  const kinds = new Set(signals.map((signal) => signal.kind))
  const same = profile.sameRules.some((rule) => rule.allOf.every((kind) => kinds.has(kind)))
  const distinct = profile.distinctRules.some((rule) => rule.allOf.every((kind) => kinds.has(kind)))
  if (same === distinct) return 'UNKNOWN'
  return same ? 'SAME' : 'DISTINCT'
}

function assertUnicodeScalarString(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error('NO_MATCH_SAFE: invalid Unicode scalar sequence')
      index += 1
      continue
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) throw new Error('NO_MATCH_SAFE: invalid Unicode scalar sequence')
  }
}
