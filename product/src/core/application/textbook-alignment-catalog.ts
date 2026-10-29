import {
  ADOPTED_TEXTBOOK,
  type TextbookAlignment,
} from '../domain/textbook-alignment'

export type TextbookAlignmentClassification =
  | 'DIRECT_CANDIDATE'
  | 'COMPOSED_CANDIDATE'
  | 'PARTIAL_GAP'
  | 'STRUCTURAL_GAP'

export type TextbookAlignmentCatalogEntry = {
  udaCode: string
  classification: TextbookAlignmentClassification
  alignments: readonly TextbookAlignment[]
}

export type TextbookAlignmentCoverageSummary = {
  total: number
  counts: Record<TextbookAlignmentClassification, number>
  entries: readonly TextbookAlignmentCatalogEntry[]
}

function support(
  udaCode: string,
  value: Omit<TextbookAlignment, 'udaCode' | 'textbookId'>,
): TextbookAlignment {
  return {
    udaCode,
    textbookId: ADOPTED_TEXTBOOK.id,
    ...value,
  }
}

const CATALOG: readonly TextbookAlignmentCatalogEntry[] = [
  {
    udaCode: 'CAN-UDA-1-00',
    classification: 'COMPOSED_CANDIDATE',
    alignments: [support('CAN-UDA-1-00', {
      volume: 'TECNOLOGIA',
      relation: 'COMPOSED',
      coverage: 'PARTIAL',
      evidenceLevel: 'VERIFIED_FEATURE',
      resourceRef: 'publisher:introductory-technology',
    })],
  },
  {
    udaCode: 'CAN-UDA-1-01',
    classification: 'COMPOSED_CANDIDATE',
    alignments: [
      support('CAN-UDA-1-01', {
        volume: 'TECNOLOGIA', relation: 'COMPOSED', coverage: 'PARTIAL', evidenceLevel: 'VERIFIED_PAGE',
        chapter: 'Sostenibilità: 2030 e oltre', pageRange: { from: 16, to: 18 }, resourceRef: 'teacher-verified:sustainability-pages-16-18',
      }),
      support('CAN-UDA-1-01', {
        volume: 'TECNOLOGIA', relation: 'COMPOSED', coverage: 'PARTIAL', evidenceLevel: 'VERIFIED_PAGE',
        chapter: 'Sostenibilità: 2030 e oltre', pageRange: { from: 19, to: 23 }, resourceRef: 'teacher-verified:sustainability-pages-19-23',
      }),
      support('CAN-UDA-1-01', {
        volume: 'TECNOLOGIA', relation: 'COMPOSED', coverage: 'PARTIAL', evidenceLevel: 'VERIFIED_PAGE',
        chapter: 'Sostenibilità: 2030 e oltre', pageRange: { from: 24, to: 27 }, resourceRef: 'teacher-verified:sustainability-pages-24-27',
      }),
      support('CAN-UDA-1-01', {
        volume: 'TECNOLOGIA', relation: 'COMPOSED', coverage: 'PARTIAL', evidenceLevel: 'VERIFIED_PAGE',
        chapter: 'Sostenibilità: 2030 e oltre', pageRange: { from: 28, to: 31 }, resourceRef: 'teacher-verified:sustainability-pages-28-31',
      }),
    ],
  },
  {
    udaCode: 'CAN-UDA-1-02', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-1-02', { volume: 'TECNOLOGIA', section: 'A', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION' })],
  },
  {
    udaCode: 'CAN-UDA-1-03', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-1-03', { volume: 'DISEGNO', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:disegno:geometric-constructions' })],
  },
  {
    udaCode: 'CAN-UDA-1-04', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-1-04', { volume: 'TECNOLOGIA', section: 'A', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION' })],
  },
  {
    udaCode: 'CAN-UDA-1-05', classification: 'COMPOSED_CANDIDATE',
    alignments: [support('CAN-UDA-1-05', { volume: 'TECNOLOGIA', relation: 'COMPOSED', coverage: 'FULL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:design-and-projects' })],
  },
  {
    udaCode: 'CAN-UDA-1-06', classification: 'PARTIAL_GAP',
    alignments: [support('CAN-UDA-1-06', { volume: 'TECNOLOGIA', relation: 'SUPPORT', coverage: 'PARTIAL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:cross-cutting-digital-competences' })],
  },
  {
    udaCode: 'CAN-UDA-1-07', classification: 'COMPOSED_CANDIDATE',
    alignments: [support('CAN-UDA-1-07', { volume: 'TECNOLOGIA', relation: 'COMPOSED', coverage: 'FULL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:sustainability-design-projects' })],
  },
  {
    udaCode: 'CAN-UDA-2-01', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-2-01', { volume: 'TECNOLOGIA', section: 'B', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION' })],
  },
  {
    udaCode: 'CAN-UDA-2-02', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-2-02', { volume: 'TECNOLOGIA', section: 'B', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION' })],
  },
  {
    udaCode: 'CAN-UDA-2-03', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-2-03', { volume: 'TECNOLOGIA', section: 'C', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION' })],
  },
  {
    udaCode: 'CAN-UDA-2-04', classification: 'COMPOSED_CANDIDATE',
    alignments: [
      support('CAN-UDA-2-04', { volume: 'TECNOLOGIA', section: 'C', relation: 'COMPOSED', coverage: 'PARTIAL', evidenceLevel: 'VERIFIED_SECTION' }),
      support('CAN-UDA-2-04', { volume: 'TECNOLOGIA', section: 'A', relation: 'COMPOSED', coverage: 'PARTIAL', evidenceLevel: 'VERIFIED_SECTION' }),
    ],
  },
  {
    udaCode: 'CAN-UDA-2-05', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-2-05', { volume: 'TECNOLOGIA', section: 'C', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION' })],
  },
  {
    udaCode: 'CAN-UDA-2-06', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-2-06', { volume: 'DISEGNO', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:disegno:orthogonal-projections' })],
  },
  {
    udaCode: 'CAN-UDA-2-07', classification: 'COMPOSED_CANDIDATE',
    alignments: [support('CAN-UDA-2-07', { volume: 'TECNOLOGIA', relation: 'COMPOSED', coverage: 'FULL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:design-and-drawing-projects' })],
  },
  {
    udaCode: 'CAN-UDA-2-08', classification: 'PARTIAL_GAP',
    alignments: [support('CAN-UDA-2-08', { volume: 'TECNOLOGIA', relation: 'SUPPORT', coverage: 'PARTIAL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:cross-cutting-digital-competences' })],
  },
  {
    udaCode: 'CAN-UDA-3-01', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-3-01', { volume: 'TECNOLOGIA', section: 'D', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION' })],
  },
  {
    udaCode: 'CAN-UDA-3-02', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-3-02', { volume: 'TECNOLOGIA', section: 'D', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION' })],
  },
  {
    udaCode: 'CAN-UDA-3-03', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-3-03', { volume: 'TECNOLOGIA', section: 'D', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION', resourceRef: 'publisher:energy-multimedia' })],
  },
  {
    udaCode: 'CAN-UDA-3-04', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-3-04', { volume: 'TECNOLOGIA', section: 'D', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION', note: 'Exact chapter and pages remain to verify.' })],
  },
  {
    udaCode: 'CAN-UDA-3-05', classification: 'DIRECT_CANDIDATE',
    alignments: [support('CAN-UDA-3-05', { volume: 'TECNOLOGIA', section: 'D', relation: 'SUPPORT', coverage: 'FULL', evidenceLevel: 'VERIFIED_SECTION', resourceRef: 'publisher:machines-multimedia' })],
  },
  {
    udaCode: 'CAN-UDA-3-06', classification: 'COMPOSED_CANDIDATE',
    alignments: [support('CAN-UDA-3-06', { volume: 'DISEGNO', relation: 'COMPOSED', coverage: 'FULL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:disegno:technical-representation' })],
  },
  {
    udaCode: 'CAN-UDA-3-07', classification: 'STRUCTURAL_GAP',
    alignments: [support('CAN-UDA-3-07', { volume: 'TECNOLOGIA', relation: 'SUPPORT', coverage: 'PARTIAL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:cross-cutting-digital-competences', note: 'The adopted configuration does not include the separate Informatica volume.' })],
  },
  {
    udaCode: 'CAN-UDA-3-08', classification: 'COMPOSED_CANDIDATE',
    alignments: [support('CAN-UDA-3-08', { volume: 'TECNOLOGIA', relation: 'COMPOSED', coverage: 'FULL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:cross-cutting-sustainability' })],
  },
  {
    udaCode: 'CAN-UDA-3-09', classification: 'COMPOSED_CANDIDATE',
    alignments: [support('CAN-UDA-3-09', { volume: 'TECNOLOGIA', relation: 'COMPOSED', coverage: 'FULL', evidenceLevel: 'VERIFIED_FEATURE', resourceRef: 'publisher:end-of-section-orientation-projects' })],
  },
]

function cloneAlignment(alignment: TextbookAlignment): TextbookAlignment {
  return {
    ...alignment,
    ...(alignment.pageRange ? { pageRange: { ...alignment.pageRange } } : {}),
  }
}

function cloneEntry(entry: TextbookAlignmentCatalogEntry): TextbookAlignmentCatalogEntry {
  return {
    udaCode: entry.udaCode,
    classification: entry.classification,
    alignments: entry.alignments.map(cloneAlignment),
  }
}

export function getTextbookAlignmentsForUda(udaCode: string): readonly TextbookAlignment[] {
  return CATALOG.find((entry) => entry.udaCode === udaCode)?.alignments.map(cloneAlignment) ?? []
}

export function getTextbookAlignmentCoverageSummary(): TextbookAlignmentCoverageSummary {
  const counts: Record<TextbookAlignmentClassification, number> = {
    DIRECT_CANDIDATE: 0,
    COMPOSED_CANDIDATE: 0,
    PARTIAL_GAP: 0,
    STRUCTURAL_GAP: 0,
  }

  for (const entry of CATALOG) {
    counts[entry.classification] += 1
  }

  return {
    total: CATALOG.length,
    counts,
    entries: CATALOG.map(cloneEntry),
  }
}
