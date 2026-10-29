export const ADOPTED_TEXTBOOK = {
  id: 'TECNOLOGIA_VERDE_2E_9788808950758',
  title: 'Tecnologia.verde',
  edition: 'seconda edizione',
  configuration: 'Tecnologia + Disegno',
  isbn: '9788808950758',
} as const

export type TextbookId = typeof ADOPTED_TEXTBOOK.id
export type TextbookVolume = 'TECNOLOGIA' | 'DISEGNO'
export type TextbookAlignmentRelation = 'DIRECT' | 'COMPOSED' | 'SUPPORT'
export type TextbookAlignmentCoverage = 'FULL' | 'PARTIAL'
export type TextbookAlignmentEvidenceLevel =
  | 'VERIFIED_PAGE'
  | 'VERIFIED_SECTION'
  | 'VERIFIED_FEATURE'
  | 'TO_VERIFY'

export type TextbookPageRange = {
  from: number
  to: number
}

export type TextbookAlignment = {
  udaCode: string
  textbookId: TextbookId
  volume: TextbookVolume
  section?: string
  chapter?: string
  paragraph?: string
  pageRange?: TextbookPageRange
  resourceRef?: string
  relation: TextbookAlignmentRelation
  coverage: TextbookAlignmentCoverage
  evidenceLevel: TextbookAlignmentEvidenceLevel
  note?: string
  verifiedByTeacherAt?: string
}

export type TextbookAlignmentValidationResult = {
  valid: boolean
  issues: string[]
}

export function validateTextbookAlignment(
  input: TextbookAlignment,
): TextbookAlignmentValidationResult {
  const issues: string[] = []

  if (input.textbookId !== ADOPTED_TEXTBOOK.id) {
    issues.push('UNSUPPORTED_TEXTBOOK_ID')
  }

  const pageRange = input.pageRange
  const validPageRange = Boolean(
    pageRange &&
      Number.isInteger(pageRange.from) &&
      Number.isInteger(pageRange.to) &&
      pageRange.from >= 1 &&
      pageRange.to >= pageRange.from,
  )

  if (input.evidenceLevel === 'VERIFIED_PAGE' && !validPageRange) {
    issues.push('VERIFIED_PAGE_REQUIRES_PAGE_RANGE')
  }

  if (input.evidenceLevel === 'TO_VERIFY' && pageRange) {
    issues.push('TO_VERIFY_FORBIDS_EXACT_PAGE')
  }

  if (
    input.evidenceLevel === 'VERIFIED_SECTION' &&
    !input.section &&
    !input.chapter
  ) {
    issues.push('VERIFIED_SECTION_REQUIRES_SECTION_OR_CHAPTER')
  }

  return { valid: issues.length === 0, issues }
}
