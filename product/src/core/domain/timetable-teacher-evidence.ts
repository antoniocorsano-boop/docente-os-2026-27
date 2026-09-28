import {
  UNICODE17_CANONICAL_COMPOSE,
  UNICODE17_CANONICAL_DECOMP,
  UNICODE17_CCC,
  UNICODE17_FULL_DEFAULT_FOLD,
  UNICODE17_VERSION,
} from './generated/unicode17-teacher-normalization'

export const TT_TEACHER_UNICODE_VERSION = UNICODE17_VERSION

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

const S_BASE = 0xac00
const L_BASE = 0x1100
const V_BASE = 0x1161
const T_BASE = 0x11a7
const L_COUNT = 19
const V_COUNT = 21
const T_COUNT = 28
const N_COUNT = V_COUNT * T_COUNT
const S_COUNT = L_COUNT * N_COUNT

/** Authoritative TT-TEACHER-NORM-1 implementation pinned to frozen Unicode 17.0.0 data. */
export function normalizeTeacherLabel(value: string): string {
  assertUnicodeScalarString(value)
  const input = Array.from(value, (char) => char.codePointAt(0)!)
  const decomposed = nfd(input)
  const folded = decomposed.flatMap((cp) => UNICODE17_FULL_DEFAULT_FOLD.get(cp) ?? [cp])
  const normalized = codePointsToString(nfc(folded))
  return normalized
    .replace(WHITE_SPACE, ' ')
    .trim()
    .replace(APOSTROPHES, "'")
    .replace(HYPHENS, '-')
}

/** @deprecated Compatibility alias while G1.6-A remains PREVIEW_ONLY. */
export function normalizeTeacherLabelPreview(value: string): string {
  return normalizeTeacherLabel(value)
}

function nfd(input: readonly number[]): number[] {
  const decomposed: number[] = []
  for (const cp of input) decomposeCanonical(cp, decomposed)
  return canonicalOrder(decomposed)
}

function decomposeCanonical(cp: number, output: number[]): void {
  const hangul = decomposeHangul(cp)
  if (hangul) {
    for (const part of hangul) decomposeCanonical(part, output)
    return
  }
  const mapped = UNICODE17_CANONICAL_DECOMP.get(cp)
  if (mapped) {
    for (const part of mapped) decomposeCanonical(part, output)
    return
  }
  output.push(cp)
}

function canonicalOrder(input: readonly number[]): number[] {
  const result: number[] = []
  for (const cp of input) {
    const ccc = UNICODE17_CCC.get(cp) ?? 0
    let index = result.length
    while (ccc !== 0 && index > 0) {
      const previousCcc = UNICODE17_CCC.get(result[index - 1]) ?? 0
      if (previousCcc === 0 || previousCcc <= ccc) break
      index -= 1
    }
    result.splice(index, 0, cp)
  }
  return result
}

function nfc(input: readonly number[]): number[] {
  const ordered = nfd(input)
  if (ordered.length === 0) return []
  const result = [ordered[0]]
  let starterIndex = 0
  let starter = ordered[0]
  let lastCcc = 0

  for (let i = 1; i < ordered.length; i += 1) {
    const cp = ordered[i]
    const ccc = UNICODE17_CCC.get(cp) ?? 0
    const composite = composePair(starter, cp)
    if (composite !== undefined && (lastCcc < ccc || lastCcc === 0)) {
      result[starterIndex] = composite
      starter = composite
    } else {
      if (ccc === 0) {
        starterIndex = result.length
        starter = cp
      }
      result.push(cp)
      lastCcc = ccc
    }
  }
  return result
}

function composePair(a: number, b: number): number | undefined {
  const hangul = composeHangul(a, b)
  if (hangul !== undefined) return hangul
  return UNICODE17_CANONICAL_COMPOSE.get(`${a},${b}`)
}

function decomposeHangul(cp: number): number[] | null {
  const sIndex = cp - S_BASE
  if (sIndex < 0 || sIndex >= S_COUNT) return null
  const l = L_BASE + Math.floor(sIndex / N_COUNT)
  const v = V_BASE + Math.floor((sIndex % N_COUNT) / T_COUNT)
  const tIndex = sIndex % T_COUNT
  return tIndex === 0 ? [l, v] : [l, v, T_BASE + tIndex]
}

function composeHangul(a: number, b: number): number | undefined {
  const lIndex = a - L_BASE
  if (lIndex >= 0 && lIndex < L_COUNT) {
    const vIndex = b - V_BASE
    if (vIndex >= 0 && vIndex < V_COUNT) return S_BASE + (lIndex * V_COUNT + vIndex) * T_COUNT
  }
  const sIndex = a - S_BASE
  if (sIndex >= 0 && sIndex < S_COUNT && sIndex % T_COUNT === 0) {
    const tIndex = b - T_BASE
    if (tIndex > 0 && tIndex < T_COUNT) return a + tIndex
  }
  return undefined
}

function codePointsToString(codePoints: readonly number[]): string {
  return codePoints.map((cp) => String.fromCodePoint(cp)).join('')
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
