import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CmlCanonicalRef } from './cml-local-handoff'
import type { CurriculumContextForClassV1 } from './cml-local-handoff-v2'
import type { TextbookAdoptionWithBook } from './textbook-adoption'
import {
  validateTextbookCurriculumAlignmentV1,
  type TextbookCurriculumAlignmentV1,
} from './cml-textbook-applicability'

function ref(entityType: string, entityId: string, versionId?: string): CmlCanonicalRef {
  return { namespace: 'curmanlight.arena', entityType, entityId, ...(versionId ? { versionId } : {}) }
}

function curricularContext(): CurriculumContextForClassV1 {
  return {
    contract: 'CML_CURRICULUM_CONTEXT_V1',
    contextId: 'ctx-technology-1A-2026-27',
    institutionRef: ref('Institution', 'school-demo'),
    schoolYearRef: '2026-2027',
    disciplineRef: 'technology',
    gradeRef: 'grade-1',
    sectionRef: '1A',
    cohortRef: 'cohort-2026-grade-1',
    curriculumRef: ref('Curriculum', 'technology'),
    curriculumVersionRef: ref('CurriculumVersion', 'technology-grade-1', '2026-27'),
    curriculumState: 'PROVISIONAL_COMPLETE',
    approvalProcessRef: ref('RevisionProcess', 'curriculum-2025-transition'),
    applicabilityStatus: 'TRANSITIONAL',
    transitionRuleRef: ref('TransitionRule', 'dm221-2025-art5'),
    completeForPlanning: true,
    requirements: [
      {
        requirementId: 'req-sustainability-01',
        kind: 'SPECIFIC_LEARNING_OBJECTIVE',
        authorityLevel: 'NATIONAL_PRESCRIPTIVE',
        curriculumNodeRef: ref('CurriculumNode', 'node-sustainability'),
        description: 'Leggere relazioni tra bisogni, risorse, tecnologie e impatti.',
        coverageRequired: true,
        sourceRefs: [ref('NationalFramework', 'indicazioni-2025')],
      },
    ],
    transitionRemodulation: {
      state: 'HYPOTHESIS',
      rationale: 'Ipotesi transitoria usabile in progettazione.',
      sourceRefs: [ref('NationalFramework', 'indicazioni-2012'), ref('NationalFramework', 'indicazioni-2025')],
      affectedRequirementIds: ['req-sustainability-01'],
      usableForPlanning: true,
      institutionallyApproved: false,
      proposalRef: ref('RevisionProposal', 'remod-001'),
    },
    sourceRefs: [ref('RevisionProposal', 'curriculum-draft-001')],
  }
}

function adoption(status: 'PROPOSED' | 'CONFIRMED' = 'CONFIRMED'): TextbookAdoptionWithBook {
  return {
    id: 'adoption-tv2ed-1A',
    workspaceId: 'workspace-001',
    academicYearId: 'year-2026-27',
    teachingAssignmentId: 'assignment-technology-1A',
    textbookId: 'textbook-tv2ed',
    usageKind: 'ADOPTED',
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

function alignment(overrides: Partial<TextbookCurriculumAlignmentV1> = {}): TextbookCurriculumAlignmentV1 {
  return {
    contract: 'CML_TEXTBOOK_ALIGNMENT_V1',
    alignmentId: 'align-1A-sustainability-pages-16-18',
    textbookAdoptionId: 'adoption-tv2ed-1A',
    textbookId: 'textbook-tv2ed',
    teachingAssignmentId: 'assignment-technology-1A',
    curriculumContextId: 'ctx-technology-1A-2026-27',
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
  it('accepts verified textbook support only against a confirmed adoption and an existing curriculum requirement', () => {
    const result = validateTextbookCurriculumAlignmentV1({
      alignment: alignment(),
      adoption: adoption(),
      curricularContext: curricularContext(),
    })

    assert.equal(result.contract, 'CML_TEXTBOOK_ALIGNMENT_V1')
    assert.equal(result.textbookAdoptionId, 'adoption-tv2ed-1A')
    assert.equal(result.requirementId, 'req-sustainability-01')
    assert.deepEqual(result.pageRange, { from: 16, to: 18 })
  })

  it('rejects a merely proposed textbook adoption', () => {
    assert.throws(
      () => validateTextbookCurriculumAlignmentV1({ alignment: alignment(), adoption: adoption('PROPOSED'), curricularContext: curricularContext() }),
      /confirmed textbook adoption is required/,
    )
  })

  it('rejects alignment identity that drifts from the confirmed adoption', () => {
    assert.throws(
      () => validateTextbookCurriculumAlignmentV1({ alignment: alignment({ textbookId: 'other-book' }), adoption: adoption(), curricularContext: curricularContext() }),
      /textbook alignment does not match confirmed adoption/,
    )
    assert.throws(
      () => validateTextbookCurriculumAlignmentV1({ alignment: alignment({ teachingAssignmentId: 'assignment-technology-1B' }), adoption: adoption(), curricularContext: curricularContext() }),
      /textbook alignment does not match confirmed adoption/,
    )
  })

  it('rejects a curriculum context or requirement that is not the bound planning context', () => {
    assert.throws(
      () => validateTextbookCurriculumAlignmentV1({ alignment: alignment({ curriculumContextId: 'ctx-other' }), adoption: adoption(), curricularContext: curricularContext() }),
      /curriculum context mismatch/,
    )
    assert.throws(
      () => validateTextbookCurriculumAlignmentV1({ alignment: alignment({ requirementId: 'req-missing' }), adoption: adoption(), curricularContext: curricularContext() }),
      /curriculum requirement not found/,
    )
  })

  it('fails closed on exact-page claims without VERIFIED_PAGE evidence', () => {
    assert.throws(
      () => validateTextbookCurriculumAlignmentV1({ alignment: alignment({ evidenceLevel: 'TO_VERIFY' }), adoption: adoption(), curricularContext: curricularContext() }),
      /TO_VERIFY alignment cannot expose exact pages/,
    )
    assert.throws(
      () => validateTextbookCurriculumAlignmentV1({ alignment: alignment({ pageRange: undefined }), adoption: adoption(), curricularContext: curricularContext() }),
      /VERIFIED_PAGE requires a valid page range/,
    )
  })

  it('requires an explicit teacher verification timestamp for TEACHER_VERIFIED evidence', () => {
    assert.throws(
      () => validateTextbookCurriculumAlignmentV1({ alignment: alignment({ verifiedByTeacherAt: undefined }), adoption: adoption(), curricularContext: curricularContext() }),
      /teacher-verified alignment requires verifiedByTeacherAt/,
    )
  })

  it('allows a partial publisher feature without inventing chapters or pages', () => {
    const result = validateTextbookCurriculumAlignmentV1({
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
      curricularContext: curricularContext(),
    })

    assert.equal(result.coverage, 'PARTIAL')
    assert.equal(result.pageRange, undefined)
  })
})
