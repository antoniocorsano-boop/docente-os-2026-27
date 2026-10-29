import {
  validateCurriculumContextForClassV1,
  type CurriculumContextForClassV1,
} from './cml-local-handoff-v2'
import type { TextbookAdoptionWithBook } from './textbook-adoption'

export const CML_TEXTBOOK_ALIGNMENT_CONTRACT = 'CML_TEXTBOOK_ALIGNMENT_V1' as const

export type TextbookAlignmentRelation = 'DIRECT' | 'COMPOSED' | 'SUPPORT'
export type TextbookAlignmentCoverage = 'FULL' | 'PARTIAL'
export type TextbookAlignmentEvidenceLevel =
  | 'VERIFIED_PAGE'
  | 'VERIFIED_SECTION'
  | 'VERIFIED_FEATURE'
  | 'TO_VERIFY'
export type TextbookAlignmentSource =
  | 'TEACHER_VERIFIED'
  | 'PUBLISHER_PUBLIC'
  | 'PUBLISHER_ACCOUNT'

export type TextbookPageRange = {
  from: number
  to: number
}

export type TextbookCurriculumAlignmentV1 = {
  contract: typeof CML_TEXTBOOK_ALIGNMENT_CONTRACT
  alignmentId: string
  textbookAdoptionId: string
  textbookId: string
  teachingAssignmentId: string
  curriculumContextId: string
  requirementId: string
  udaCode?: string
  relation: TextbookAlignmentRelation
  coverage: TextbookAlignmentCoverage
  evidenceLevel: TextbookAlignmentEvidenceLevel
  sectionLabel?: string
  chapterLabel?: string
  pageRange?: TextbookPageRange
  resourceRef?: string
  note?: string
  source: TextbookAlignmentSource
  verifiedByTeacherAt?: string
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validPageRange(value: TextbookPageRange | undefined): value is TextbookPageRange {
  return Boolean(
    value
      && Number.isInteger(value.from)
      && Number.isInteger(value.to)
      && value.from >= 1
      && value.to >= value.from,
  )
}

function validIsoTimestamp(value: string | undefined): boolean {
  if (!nonEmpty(value)) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && value.includes('T')
}

export function validateTextbookCurriculumAlignmentV1(input: {
  alignment: TextbookCurriculumAlignmentV1
  adoption: TextbookAdoptionWithBook
  curricularContext: CurriculumContextForClassV1
}): TextbookCurriculumAlignmentV1 {
  const { alignment, adoption, curricularContext } = input

  if (alignment.contract !== CML_TEXTBOOK_ALIGNMENT_CONTRACT) {
    throw new Error('unsupported textbook alignment contract')
  }

  if (adoption.status !== 'CONFIRMED') {
    throw new Error('confirmed textbook adoption is required')
  }

  if (
    alignment.textbookAdoptionId !== adoption.id
    || alignment.textbookId !== adoption.textbookId
    || alignment.textbookId !== adoption.textbook.id
    || alignment.teachingAssignmentId !== adoption.teachingAssignmentId
  ) {
    throw new Error('textbook alignment does not match confirmed adoption')
  }

  const contextValidation = validateCurriculumContextForClassV1(curricularContext)
  if (!contextValidation.valid) {
    throw new Error(`invalid curricular context: ${contextValidation.errors.join('; ')}`)
  }

  if (alignment.curriculumContextId !== curricularContext.contextId) {
    throw new Error('curriculum context mismatch')
  }

  if (!curricularContext.requirements.some((requirement) => requirement.requirementId === alignment.requirementId)) {
    throw new Error('curriculum requirement not found')
  }

  if (!nonEmpty(alignment.alignmentId) || !nonEmpty(alignment.requirementId)) {
    throw new Error('alignmentId and requirementId are required')
  }

  if (!['DIRECT', 'COMPOSED', 'SUPPORT'].includes(alignment.relation)) {
    throw new Error('textbook alignment relation is invalid')
  }
  if (!['FULL', 'PARTIAL'].includes(alignment.coverage)) {
    throw new Error('textbook alignment coverage is invalid')
  }
  if (!['VERIFIED_PAGE', 'VERIFIED_SECTION', 'VERIFIED_FEATURE', 'TO_VERIFY'].includes(alignment.evidenceLevel)) {
    throw new Error('textbook alignment evidence level is invalid')
  }
  if (!['TEACHER_VERIFIED', 'PUBLISHER_PUBLIC', 'PUBLISHER_ACCOUNT'].includes(alignment.source)) {
    throw new Error('textbook alignment source is invalid')
  }

  if (alignment.evidenceLevel === 'VERIFIED_PAGE' && !validPageRange(alignment.pageRange)) {
    throw new Error('VERIFIED_PAGE requires a valid page range')
  }

  if (alignment.evidenceLevel === 'TO_VERIFY' && alignment.pageRange !== undefined) {
    throw new Error('TO_VERIFY alignment cannot expose exact pages')
  }

  if (alignment.pageRange !== undefined && !validPageRange(alignment.pageRange)) {
    throw new Error('textbook alignment page range is invalid')
  }

  if (alignment.source === 'TEACHER_VERIFIED' && !validIsoTimestamp(alignment.verifiedByTeacherAt)) {
    throw new Error('teacher-verified alignment requires verifiedByTeacherAt')
  }

  return {
    ...alignment,
    ...(alignment.pageRange ? { pageRange: { ...alignment.pageRange } } : {}),
  }
}
