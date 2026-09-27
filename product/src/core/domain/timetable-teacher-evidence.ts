export const TT_TEACHER_UNICODE_VERSION = '17.0.0' as const

export type TeacherEvidenceResult = 'SAME' | 'DISTINCT' | 'UNKNOWN'
export type TeacherEvidenceSignal = Readonly<{ kind: string; value: string }>
export type TeacherEvidenceOccurrence = Readonly<{
  occurrenceId: string
  signals: readonly TeacherEvidenceSignal[]
}>

export type TeacherEvidenceComparator = 'EQUAL' | 'NOT_EQUAL'
export type TeacherEvidenceRule = Readonly<{
  kind: string
  comparator: TeacherEvidenceComparator
}>

export type TeacherEvidenceProfile = Readonly<{
  profileId: string
  profileVersion: string
  parserFamily: string
  parserVersion: string
  allowedSignalKinds: readonly string[]
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
 * PREVIEW-ONLY normalization scaffold.
 *
 * This is deliberately NOT advertised as a complete TT-TEACHER-NORM-1
 * implementation. JavaScript's platform NFC/lowercasing is retained only for
 * current preview fixtures. G1.6-A cannot close until frozen Unicode 17.0.0 NFC
 * and full non-Turkic CaseFolding data are vendored/generated and verified.
 */
export function normalizeTeacherLabelPreview(value: string): string {
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
  if (profile.allowedSignalKinds.length === 0) return false

  const allowed = new Set(profile.allowedSignalKinds)
  if (allowed.size !== profile.allowedSignalKinds.length || [...allowed].some((kind) => !kind.trim())) return false

  const allRules = [...profile.sameRules, ...profile.distinctRules]
  if (allRules.length === 0) return false
  if (allRules.some((rule) => !rule.kind.trim() || !allowed.has(rule.kind))) return false

  const keys = allRules.map(ruleKey)
  if (new Set(keys).size !== keys.length) return false

  // The same signal kind cannot govern both SAME and DISTINCT: value comparison
  // semantics must have one unambiguous owner in a profile.
  const sameKinds = new Set(profile.sameRules.map((rule) => rule.kind))
  if (profile.distinctRules.some((rule) => sameKinds.has(rule.kind))) return false

  if (profile.sameRules.some((rule) => rule.comparator !== 'EQUAL')) return false
  if (profile.distinctRules.some((rule) => rule.comparator !== 'NOT_EQUAL')) return false
  return true
}

export function sameTeacherEvidence(
  a: TeacherEvidenceOccurrence,
  b: TeacherEvidenceOccurrence,
  profile: TeacherEvidenceProfile | null | undefined,
): TeacherEvidenceResult {
  if (!validateTeacherEvidenceProfile(profile) || !profile) return 'UNKNOWN'
  if (!a.occurrenceId || !b.occurrenceId) return 'UNKNOWN'

  const aSignals = uniqueSignalMap(a.signals, profile.allowedSignalKinds)
  const bSignals = uniqueSignalMap(b.signals, profile.allowedSignalKinds)
  if (!aSignals || !bSignals) return 'UNKNOWN'

  const same = profile.sameRules.some((rule) => compareRule(rule, aSignals, bSignals))
  const distinct = profile.distinctRules.some((rule) => compareRule(rule, aSignals, bSignals))
  if (same === distinct) return 'UNKNOWN'
  return same ? 'SAME' : 'DISTINCT'
}

function uniqueSignalMap(signals: readonly TeacherEvidenceSignal[], allowedKinds: readonly string[]): Map<string, string> | null {
  const allowed = new Set(allowedKinds)
  const result = new Map<string, string>()
  for (const signal of signals) {
    if (!allowed.has(signal.kind) || !signal.value) continue
    if (result.has(signal.kind)) return null
    result.set(signal.kind, signal.value)
  }
  return result
}

function compareRule(rule: TeacherEvidenceRule, a: Map<string, string>, b: Map<string, string>): boolean {
  const left = a.get(rule.kind)
  const right = b.get(rule.kind)
  if (left === undefined || right === undefined) return false
  return rule.comparator === 'EQUAL' ? left === right : left !== right
}

function ruleKey(rule: TeacherEvidenceRule): string {
  return `${rule.kind}:${rule.comparator}`
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
