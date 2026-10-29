import {
  getTextbookAlignmentCoverageSummary,
  getTextbookAlignmentsForUda,
  type TextbookAlignmentClassification,
} from '../application/textbook-alignment-catalog'
import { ADOPTED_TEXTBOOK } from '../domain/textbook-alignment'
import type { HumanTaskLessonProjection } from './human-task-content'

export type HumanTaskTextbookSupportStatus =
  | 'VERIFIED_PAGES'
  | 'SUPPORT_DETAILS_TO_VERIFY'
  | 'PARTIAL_GAP'
  | 'STRUCTURAL_GAP'

export type HumanTaskTextbookProvenance = {
  canonicalUdaCode: string
  textbook: {
    title: string
    configuration: string
    isbn: string
  }
  classification: TextbookAlignmentClassification
  status: HumanTaskTextbookSupportStatus
  detailStatus: 'VERIFIED_PAGE' | 'TO_VERIFY'
  pageRanges: Array<{ from: number; to: number }>
  chapterLabel: string | null
  message: string
}

function canonicalizeUdaCode(udaCode: string): string | null {
  const normalized = udaCode.trim().toUpperCase()
  if (/^CAN-UDA-\d-\d{2}$/.test(normalized)) return normalized
  if (/^\d-\d{2}$/.test(normalized)) return `CAN-UDA-${normalized}`
  return null
}

export function resolveTextbookSupportForUdaCode(
  udaCode: string,
): HumanTaskTextbookProvenance | null {
  const canonicalUdaCode = canonicalizeUdaCode(udaCode)
  if (!canonicalUdaCode) return null

  const entry = getTextbookAlignmentCoverageSummary().entries.find(
    (candidate) => candidate.udaCode === canonicalUdaCode,
  )
  if (!entry) return null

  const alignments = getTextbookAlignmentsForUda(canonicalUdaCode)
  const verifiedPages = alignments.filter(
    (alignment) =>
      alignment.evidenceLevel === 'VERIFIED_PAGE' && alignment.pageRange,
  )
  const pageRanges = verifiedPages.map((alignment) => ({
    from: alignment.pageRange!.from,
    to: alignment.pageRange!.to,
  }))

  const commonChapter =
    verifiedPages.length > 0 &&
    verifiedPages.every(
      (alignment) => alignment.chapter && alignment.chapter === verifiedPages[0].chapter,
    )
      ? verifiedPages[0].chapter ?? null
      : null

  const textbook = {
    title: ADOPTED_TEXTBOOK.title,
    configuration: ADOPTED_TEXTBOOK.configuration,
    isbn: ADOPTED_TEXTBOOK.isbn,
  }

  if (entry.classification === 'STRUCTURAL_GAP') {
    return {
      canonicalUdaCode,
      textbook,
      classification: entry.classification,
      status: 'STRUCTURAL_GAP',
      detailStatus: 'TO_VERIFY',
      pageRanges: [],
      chapterLabel: null,
      message:
        'La configurazione adottata non comprende Informatica: per questa UDA serve una fonte complementare approvata.',
    }
  }

  if (entry.classification === 'PARTIAL_GAP') {
    return {
      canonicalUdaCode,
      textbook,
      classification: entry.classification,
      status: 'PARTIAL_GAP',
      detailStatus: 'TO_VERIFY',
      pageRanges: [],
      chapterLabel: null,
      message:
        'Il libro adottato copre solo una parte di questa UDA: serve una fonte complementare.',
    }
  }

  if (pageRanges.length > 0) {
    return {
      canonicalUdaCode,
      textbook,
      classification: entry.classification,
      status: 'VERIFIED_PAGES',
      detailStatus: 'VERIFIED_PAGE',
      pageRanges,
      chapterLabel: commonChapter,
      message:
        'Il libro adottato contiene pagine già verificate come supporto a questa UDA.',
    }
  }

  return {
    canonicalUdaCode,
    textbook,
    classification: entry.classification,
    status: 'SUPPORT_DETAILS_TO_VERIFY',
    detailStatus: 'TO_VERIFY',
    pageRanges: [],
    chapterLabel: null,
    message:
      'Il libro adottato offre un supporto pertinente; capitoli e pagine specifici sono ancora da verificare.',
  }
}

export function resolveHumanTaskTextbookProvenance(
  projection: Pick<HumanTaskLessonProjection, 'udaCode'>,
): HumanTaskTextbookProvenance | null {
  return resolveTextbookSupportForUdaCode(projection.udaCode)
}
