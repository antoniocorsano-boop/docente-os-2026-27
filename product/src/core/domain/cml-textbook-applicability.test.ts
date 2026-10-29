import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TextbookAdoptionWithBook, TextbookUsageKind } from './textbook-adoption'
import {
  validateTextbookCurricoloAlignmentV1,
  type CurricoloContextBindingV1,
  type TextbookCurricoloAlignmentV1,
} from './cml-textbook-applicability'

function curricoloContext(): CurricoloContextBindingV1 {
  return {
    contextId: 'ctx-technology-1A-2026-27',
    requirements: [
      { requirementId: 'req-sustainability-01' },
    ],
  }
}

function adoption(
  status: 'PROPOSED' | 'CONFIRMED' = 'CONFIRMED',
  usageKind: TextbookUsageKind = 'ADOPTED',
): TextbookAdoptionWithBook {
  return {
    id: 'adoption-tv2ed-1A',
    workspaceId: 'workspace-001',
    academicYearId: 'year-2026-27',
    teachingAssignmentId: 'assignment-technology-1A',
    textbookId: 'textbook-tv2ed',
    usageKind,
    sourceKind: 'MIM_OPEN_DATA',
    sourceRef: 'mim:adoption:technology-1A',
    status,
    confirmedBy: status === 'CONFIRMED' ? 'teacher-001' : null,
    confirmedAt: status === 'CONFIRMED' ? '2026-09-01T08:00:00.000Z' : null,
    createdBy: 'teacher-001',
    createdAt: '2026-09-01T07:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    textbook: {
      id: 'textbook-tv2ed',
      workspaceId: 'workspace-001',
      academicYearId: 'year-2026-27',
      isbn13: '9788808950758',
      title: 'Tecnologia.verde',
      subtitle: null,
      authors: 'Paci, Paci, Bernardini',
      publisher: 'Zanichelli',
      editionLabel: 'seconda edizione',
      volumeLabel: 'Tecnologia + Disegno',
      officialUrl: null,
      publisherProductRef: null,
      createdBy: 'teacher-001',
      createdAt: '2026-09-01T07:00:00.000Z',
      updatedAt: '2026-09-01T07:00:00.000Z',
    },
  }
}

function alignment(overrides: Partial<TextbookCurricoloAlignmentV1> = {}): TextbookCurricoloAlignmentV1 {
  return {
    contract: 'CML_TEXTBOOK_ALIGNMENT_V1',
    alignmentId: 'align-1A-sustainability-pages-16-18',
    textbookAdoptionId: 'adoption-tv2ed-1A',
    textbookId: 'textbook-tv2ed',
    teachingAssignmentId: 'assignment-technology-1A',
    curricoloContextId: 'ctx-technology-1A-2026-27',
    requirementId: 'req-sustainability-01',
    udaCode: 'CAN-UDA-1-01',
    relation: 'COMPOSED',
    coverage: 'PARTIAL',
    evidenceLevel: 'VERIFIED_PAGE',
    chapterLabel: 'Sostenibilità: 2030 e oltre',
    pageRange: { from: 16, to: 18 },
    resourceRef: 'teacher-evidence:sustainability-pages-16-18',
    source: 'TEACHER_VERIFIED',
    verifiedByTeacherAt: '2026-10-28T12:00:00.000Z',
    ...overrides,
  }
}

describe('CML textbook applicability T4', () => {
  it('accepts verified textbook support only against a confirmed adoption and an existing curricolo requirement', () => {
    const result = validateTextbookCurricoloAlignmentV1({
      alignment: alignment(),
      adoption: adoption(),
      curricoloContext: curricoloContext(),
    })

    assert.equal(result.contract, 'CML_TEXTBOOK_ALIGNMENT_V1')
    assert.equal(result.textbookAdoptionId, 'adoption-tv2ed-1A')
    assert.equal(result.requirementId, 'req-sustainability-01')
    assert.deepEqual(result.pageRange, { from: 16, to: 18 })
  })

  it('rejects a merely proposed textbook adoption', () => {
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({ alignment: alignment(), adoption: adoption('PROPOSED'), curricoloContext: curricoloContext() }),
      /confirmed textbook adoption is required/,
    )
  })

  it('rejects a confirmed recommendation because T4 requires the actually adopted textbook', () => {
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({ alignment: alignment(), adoption: adoption('CONFIRMED', 'RECOMMENDED'), curricoloContext: curricoloContext() }),
      /adopted textbook is required/,
    )
  })

  it('rejects alignment identity that drifts from the confirmed adoption', () => {
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({ alignment: alignment({ textbookId: 'other-book' }), adoption: adoption(), curricoloContext: curricoloContext() }),
      /textbook alignment does not match confirmed adoption/,
    )
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({ alignment: alignment({ teachingAssignmentId: 'assignment-technology-1B' }), adoption: adoption(), curricoloContext: curricoloContext() }),
      /textbook alignment does not match confirmed adoption/,
    )
  })

  it('rejects a curricolo context or requirement that is not the bound planning context', () => {
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({ alignment: alignment({ curricoloContextId: 'ctx-other' }), adoption: adoption(), curricoloContext: curricoloContext() }),
      /curricolo context mismatch/,
    )
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({ alignment: alignment({ requirementId: 'req-missing' }), adoption: adoption(), curricoloContext: curricoloContext() }),
      /curricolo requirement not found/,
    )
  })

  it('rejects an invalid curricolo binding before evaluating requirement coverage', () => {
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({
        alignment: alignment(),
        adoption: adoption(),
        curricoloContext: { contextId: '', requirements: [] },
      }),
      /valid curricolo context binding is required/,
    )
  })

  it('fails closed on exact-page claims without VERIFIED_PAGE evidence', () => {
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({ alignment: alignment({ evidenceLevel: 'TO_VERIFY' }), adoption: adoption(), curricoloContext: curricoloContext() }),
      /TO_VERIFY alignment cannot expose exact pages/,
    )
    for (const evidenceLevel of ['VERIFIED_SECTION', 'VERIFIED_FEATURE'] as const) {
      assert.throws(
        () => validateTextbookCurricoloAlignmentV1({ alignment: alignment({ evidenceLevel }), adoption: adoption(), curricoloContext: curricoloContext() }),
        /VERIFIED_PAGE.*exact pages|exact pages.*VERIFIED_PAGE/,
      )
    }
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({ alignment: alignment({ pageRange: undefined }), adoption: adoption(), curricoloContext: curricoloContext() }),
      /VERIFIED_PAGE requires a valid page range/,
    )
  })

  it('requires an explicit teacher verification timestamp for TEACHER_VERIFIED evidence', () => {
    assert.throws(
      () => validateTextbookCurricoloAlignmentV1({ alignment: alignment({ verifiedByTeacherAt: undefined }), adoption: adoption(), curricoloContext: curricoloContext() }),
      /teacher-verified alignment requires verifiedByTeacherAt/,
    )
  })

  it('allows a partial publisher feature without inventing chapters or pages', () => {
    const result = validateTextbookCurricoloAlignmentV1({
      alignment: alignment({
        alignmentId: 'align-digital-support',
        udaCode: 'CAN-UDA-1-06',
        relation: 'SUPPORT',
        coverage: 'PARTIAL',
        evidenceLevel: 'VERIFIED_FEATURE',
        chapterLabel: undefined,
        pageRange: undefined,
        resourceRef: 'publisher:cross-cutting-digital-competences',
        source: 'PUBLISHER_PUBLIC',
        verifiedByTeacherAt: undefined,
      }),
      adoption: adoption(),
      curricoloContext: curricoloContext(),
    })

    assert.equal(result.coverage, 'PARTIAL')
    assert.equal(result.pageRange, undefined)
  })
})
