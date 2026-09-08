import { normalizeIsbn13, type TextbookUsageKind } from './textbook-adoption'

export type MimTextbookRecord = {
  schoolCode: string
  gradeNumber: number
  sectionCode: string
  schoolGradeType: string | null
  combination: string | null
  discipline: string
  isbn13: string
  authors: string | null
  title: string
  subtitle: string | null
  volume: string | null
  publisher: string
  price: string | null
  newAdoption: string | null
  toPurchase: string | null
  recommended: string | null
  sourceDataset: string
  sourceSubject: string
}

export type MimTeachingContext = {
  teachingAssignmentId: string
  grade: 'PRIMA' | 'SECONDA' | 'TERZA'
  sectionCode: string
  disciplineName: string
}

export type MimTextbookMatch = {
  teachingAssignmentId: string
  record: MimTextbookRecord
  usageKind: TextbookUsageKind
  disciplineScore: number
}

const GRADE_NUMBER: Record<MimTeachingContext['grade'], number> = {
  PRIMA: 1,
  SECONDA: 2,
  TERZA: 3,
}

export function matchMimTextbookAdoptions(
  records: MimTextbookRecord[],
  contexts: MimTeachingContext[],
): MimTextbookMatch[] {
  const scopedRecords = resolveMimSchoolScope(records, contexts)
  const matches: MimTextbookMatch[] = []
  const seen = new Set<string>()

  for (const context of contexts) {
    const expectedGrade = GRADE_NUMBER[context.grade]
    const expectedSection = normalizeSectionCode(context.sectionCode)

    for (const record of scopedRecords) {
      if (!recordMatchesContext(record, context, expectedGrade, expectedSection)) continue

      const disciplineScore = scoreDiscipline(context.disciplineName, record.discipline)
      let isbn13: string
      try {
        isbn13 = normalizeIsbn13(record.isbn13)
      } catch {
        continue
      }

      const key = `${context.teachingAssignmentId}:${isbn13}:${usageKindFromMim(record)}`
      if (seen.has(key)) continue
      seen.add(key)

      matches.push({
        teachingAssignmentId: context.teachingAssignmentId,
        record: { ...record, isbn13 },
        usageKind: usageKindFromMim(record),
        disciplineScore,
      })
    }
  }

  return matches.sort((a, b) => {
    if (a.teachingAssignmentId !== b.teachingAssignmentId) {
      return a.teachingAssignmentId.localeCompare(b.teachingAssignmentId)
    }
    return b.disciplineScore - a.disciplineScore || a.record.title.localeCompare(b.record.title, 'it')
  })
}

/**
 * The MIM school registry can resolve an institute code to several plessi. Teacher settings currently
 * carry the institute code, not a separate plesso code. We therefore accept a plesso implicitly only
 * when one school code has strictly better coverage of the confirmed Cattedra than every other code.
 * A tie is intentionally fail-closed: no cross-plesso proposal is emitted.
 */
export function resolveMimSchoolScope(
  records: MimTextbookRecord[],
  contexts: MimTeachingContext[],
): MimTextbookRecord[] {
  if (!records.length || !contexts.length) return []

  const recordsBySchool = new Map<string, MimTextbookRecord[]>()
  for (const record of records) {
    const schoolCode = record.schoolCode.trim().toUpperCase()
    if (!schoolCode) continue
    const bucket = recordsBySchool.get(schoolCode) ?? []
    bucket.push(record)
    recordsBySchool.set(schoolCode, bucket)
  }

  if (recordsBySchool.size <= 1) return [...records]

  const ranked = [...recordsBySchool.entries()]
    .map(([schoolCode, schoolRecords]) => ({
      schoolCode,
      schoolRecords,
      coverage: contexts.reduce((count, context) => (
        schoolRecords.some((record) => recordMatchesContext(record, context)) ? count + 1 : count
      ), 0),
    }))
    .sort((a, b) => b.coverage - a.coverage || a.schoolCode.localeCompare(b.schoolCode))

  const best = ranked[0]
  const second = ranked[1]
  if (!best || best.coverage === 0) return []
  if (second && best.coverage === second.coverage) return []

  return best.schoolRecords
}

export function usageKindFromMim(record: Pick<MimTextbookRecord, 'recommended'>): TextbookUsageKind {
  const recommended = normalizeComparable(record.recommended ?? '')
  return recommended && recommended !== 'NO' ? 'RECOMMENDED' : 'ADOPTED'
}

export function scoreDiscipline(localName: string, mimName: string) {
  const local = normalizeComparable(localName)
  const remote = normalizeComparable(mimName)
  if (!local || !remote) return 0
  if (local === remote) return 1
  if (remote.includes(local) || local.includes(remote)) return 0.95

  const localTokens = new Set(significantTokens(local))
  const remoteTokens = new Set(significantTokens(remote))
  if (!localTokens.size || !remoteTokens.size) return 0

  let intersection = 0
  for (const token of localTokens) if (remoteTokens.has(token)) intersection += 1
  return intersection / Math.max(localTokens.size, remoteTokens.size)
}

export function normalizeComparable(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function recordMatchesContext(
  record: MimTextbookRecord,
  context: MimTeachingContext,
  expectedGrade = GRADE_NUMBER[context.grade],
  expectedSection = normalizeSectionCode(context.sectionCode),
) {
  if (record.gradeNumber !== expectedGrade) return false
  if (normalizeSectionCode(record.sectionCode) !== expectedSection) return false
  if (scoreDiscipline(context.disciplineName, record.discipline) < 0.75) return false
  try {
    normalizeIsbn13(record.isbn13)
  } catch {
    return false
  }
  return true
}

function normalizeSectionCode(value: string) {
  return normalizeComparable(value).replace(/\s+/g, '')
}

function significantTokens(value: string) {
  const stop = new Set(['E', 'ED', 'DI', 'DEL', 'DELLA', 'DELLE', 'PER', 'LA', 'IL', 'I', 'LE'])
  return value.split(' ').filter((token) => token.length > 1 && !stop.has(token))
}
