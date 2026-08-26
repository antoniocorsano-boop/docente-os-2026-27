export type TextbookSourceKind = 'MANUAL' | 'MIM_OPEN_DATA' | 'ISBN_LOOKUP'
export type TextbookAdoptionStatus = 'PROPOSED' | 'CONFIRMED'
export type TextbookUsageKind = 'ADOPTED' | 'RECOMMENDED' | 'OTHER'

export type Textbook = {
  id: string
  workspaceId: string
  academicYearId: string
  isbn13: string
  title: string
  subtitle: string | null
  authors: string | null
  publisher: string
  editionLabel: string | null
  volumeLabel: string | null
  officialUrl: string | null
  publisherProductRef: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type TextbookAdoption = {
  id: string
  workspaceId: string
  academicYearId: string
  teachingAssignmentId: string
  textbookId: string
  usageKind: TextbookUsageKind
  sourceKind: TextbookSourceKind
  sourceRef: string | null
  status: TextbookAdoptionStatus
  confirmedBy: string | null
  confirmedAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type TextbookAdoptionWithBook = TextbookAdoption & {
  textbook: Textbook
}

export type TextbookAdoptionDraft = {
  teachingAssignmentId: string
  isbn13: string
  title: string
  subtitle: string | null
  authors: string | null
  publisher: string
  editionLabel: string | null
  volumeLabel: string | null
  officialUrl: string | null
  publisherProductRef: string | null
  usageKind: TextbookUsageKind
  sourceKind: TextbookSourceKind
  sourceRef: string | null
}

export type TextbookSettingsCoverage = {
  assignmentCount: number
  coveredAssignmentCount: number
  confirmedBookCount: number
  proposedBookCount: number
  missingAssignmentIds: string[]
}

export function normalizeIsbn13(value: string) {
  const normalized = value.replace(/[\s-]+/g, '')
  if (!/^\d{13}$/.test(normalized)) throw new Error('ISBN must contain 13 digits')
  const digits = normalized.split('').map(Number)
  const checksum = digits.slice(0, 12).reduce((sum, digit, index) => sum + digit * (index % 2 === 0 ? 1 : 3), 0)
  const expected = (10 - (checksum % 10)) % 10
  if (digits[12] !== expected) throw new Error('Invalid ISBN-13 checksum')
  return normalized
}

export function normalizeTextbookText(value: string | null | undefined, maxLength: number) {
  const normalized = (value ?? '').trim().replace(/\s+/g, ' ')
  if (normalized.length > maxLength) throw new Error(`Value exceeds ${maxLength} characters`)
  return normalized
}

export function normalizeOptionalUrl(value: string | null | undefined) {
  const normalized = normalizeTextbookText(value, 1000)
  if (!normalized) return null
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error('Invalid textbook URL')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Textbook URL must use HTTP or HTTPS')
  return parsed.toString()
}

export function validateTextbookDraft(input: TextbookAdoptionDraft): TextbookAdoptionDraft {
  const title = normalizeTextbookText(input.title, 320)
  const publisher = normalizeTextbookText(input.publisher, 200)
  if (!input.teachingAssignmentId.trim()) throw new Error('Teaching assignment is required')
  if (!title) throw new Error('Textbook title is required')
  if (!publisher) throw new Error('Publisher is required')
  if (!['ADOPTED', 'RECOMMENDED', 'OTHER'].includes(input.usageKind)) throw new Error('Unsupported textbook usage kind')
  if (!['MANUAL', 'MIM_OPEN_DATA', 'ISBN_LOOKUP'].includes(input.sourceKind)) throw new Error('Unsupported textbook source kind')

  return {
    teachingAssignmentId: input.teachingAssignmentId.trim(),
    isbn13: normalizeIsbn13(input.isbn13),
    title,
    subtitle: nullableText(input.subtitle, 320),
    authors: nullableText(input.authors, 400),
    publisher,
    editionLabel: nullableText(input.editionLabel, 160),
    volumeLabel: nullableText(input.volumeLabel, 120),
    officialUrl: normalizeOptionalUrl(input.officialUrl),
    publisherProductRef: nullableText(input.publisherProductRef, 200),
    usageKind: input.usageKind,
    sourceKind: input.sourceKind,
    sourceRef: nullableText(input.sourceRef, 500),
  }
}

export function buildTextbookSettingsCoverage(input: {
  assignmentIds: string[]
  adoptions: Pick<TextbookAdoption, 'teachingAssignmentId' | 'status' | 'usageKind'>[]
}): TextbookSettingsCoverage {
  const assignmentIds = [...new Set(input.assignmentIds.filter(Boolean))]
  const assignmentSet = new Set(assignmentIds)
  const relevant = input.adoptions.filter((adoption) => assignmentSet.has(adoption.teachingAssignmentId))
  const confirmed = relevant.filter((adoption) => adoption.status === 'CONFIRMED')
  const confirmedAdopted = confirmed.filter((adoption) => adoption.usageKind === 'ADOPTED')
  const covered = new Set(confirmedAdopted.map((adoption) => adoption.teachingAssignmentId))

  return {
    assignmentCount: assignmentIds.length,
    coveredAssignmentCount: covered.size,
    confirmedBookCount: confirmed.length,
    proposedBookCount: relevant.filter((adoption) => adoption.status === 'PROPOSED').length,
    missingAssignmentIds: assignmentIds.filter((id) => !covered.has(id)),
  }
}

function nullableText(value: string | null | undefined, maxLength: number) {
  const normalized = normalizeTextbookText(value, maxLength)
  return normalized || null
}
