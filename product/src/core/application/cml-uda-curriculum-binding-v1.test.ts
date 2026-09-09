import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { TeacherCurriculumContextV1 } from '@/core/domain/cml-curriculum-release-intake-v1'
import { createPlanBlockCurriculumBindingV1 } from '@/core/domain/cml-plan-block-curriculum-binding-v1'
import {
  classifyUdaBindingAgainstCurrentInputs,
  createUdaCurriculumBindingV1,
  projectUdaAuthoringContextV1,
} from './cml-uda-curriculum-binding-v1'

const ref = (entityType: string, entityId: string, versionId?: string) => ({
  namespace: 'curmanlight.arena',
  entityType,
  entityId,
  ...(versionId ? { versionId } : {}),
})

function teacherContext(input: {
  fingerprint?: string
  cohortRef?: string
  authority?: 'APPROVED' | 'PROVISIONAL_COMPLETE'
} = {}): TeacherCurriculumContextV1 {
  const authority = input.authority ?? 'APPROVED'
  return {
    contract: 'CML_TEACHER_CURRICULUM_CONTEXT_V1',
    sourceProduct: 'CURMANLIGHT_ARENA',
    sourceReleaseContract: 'CML_CURRICULUM_RELEASE_CONTRACT_V1',
    localAuthorityEffect: 'NONE',
    teacherAcceptanceState: 'ACCEPTED_FOR_PROFESSIONAL_PLANNING',
    curriculumRef: ref('InstituteCurriculum', 'technology'),
    curriculumVersionRef: ref('CurriculumVersionProjection', 'technology-grade-1', '2026-27-v1'),
    institutionalAuthorityState: authority,
    ...(authority === 'APPROVED'
      ? { institutionalAuthorityReceiptRef: ref('CompleteCurriculumApprovalDecision', 'decision-2026-01', '1') }
      : {}),
    sourceHandoffFingerprintHash: input.fingerprint ?? 'footprint-v1',
    scope: {
      institutionRef: ref('Institution', 'school-demo'),
      schoolYearRef: '2026-2027',
      disciplineRef: 'technology',
      gradeRef: 'grade-1',
      sectionRef: '1A',
      cohortRef: input.cohortRef ?? 'cohort-2026-grade-1',
    },
    requirementRefs: [
      {
        requirementId: 'req-systems',
        curriculumNodeRef: ref('CurriculumNodeProjection', 'technology-systems'),
        authorityLevel: 'NATIONAL_PRESCRIPTIVE',
        coverageRequired: true,
      },
      {
        requirementId: 'req-project',
        curriculumNodeRef: ref('CurriculumNodeProjection', 'technology-project-method'),
        authorityLevel: 'INSTITUTIONAL_REQUIRED',
        coverageRequired: true,
      },
      {
        requirementId: 'req-orientation',
        curriculumNodeRef: ref('CurriculumNodeProjection', 'technology-orientation'),
        authorityLevel: 'RECOMMENDED',
        coverageRequired: false,
      },
    ],
    teacherDecisionRef: 'teacher-acceptance-001',
    acceptedAt: '2026-09-09T18:00:00.000Z',
    requiresRevalidationOnApproval: authority !== 'APPROVED',
  }
}

function planBinding(blockId: string, context = teacherContext(), requirementIds = ['req-systems', 'req-project']) {
  return createPlanBlockCurriculumBindingV1({
    bindingId: `binding-can-plan-1-${blockId.toLowerCase()}`,
    canonicalPlanAssetId: '4a027986-5b6d-49db-9b52-01cfae679c08',
    canonicalGenerationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
    blockId,
    teacherContext: context,
    requirementIds,
    professionalDecisionRef: `teacher-plan-binding-${blockId.toLowerCase()}`,
    boundAt: '2026-09-09T18:30:00.000Z',
  })
}

const udaSource = (generationId = 'uda-generation-101') => ({
  code: 'CAN-UDA-1-01',
  assetId: 'uda-asset-1-01',
  generationId,
})

function udaBinding(input: {
  context?: TeacherCurriculumContextV1
  blocks?: string[]
  generationId?: string
  requirementIds?: string[]
} = {}) {
  const context = input.context ?? teacherContext()
  const blocks = input.blocks ?? ['B03', 'B04']
  return createUdaCurriculumBindingV1({
    bindingId: 'uda-binding-1-01',
    grade: 'Prima',
    udaSource: udaSource(input.generationId),
    planBindings: blocks.map((blockId) => planBinding(blockId, context)),
    ...(input.requirementIds ? { requirementIds: input.requirementIds } : {}),
    professionalDecisionRef: 'teacher-uda-binding-001',
    boundAt: '2026-09-09T19:00:00.000Z',
  })
}

describe('C2P-05 UdaCurriculumBindingV1', () => {
  it('binds the existing canonical UDA source to its plan-block curriculum bindings without creating a section copy', () => {
    const result = udaBinding()

    assert.equal(result.contract, 'CML_UDA_CURRICULUM_BINDING_V1')
    assert.equal(result.bindingScope, 'CANONICAL_UDA')
    assert.equal(result.uda.code, 'CAN-UDA-1-01')
    assert.equal(result.uda.assetId, 'uda-asset-1-01')
    assert.equal(result.uda.generationId, 'uda-generation-101')
    assert.deepEqual(result.canonicalPlan.blockIds, ['B03', 'B04'])
    assert.deepEqual(result.requirementBindings.map((item) => item.requirementId), ['req-systems', 'req-project'])
    assert.equal(result.sectionExecutionEffect, 'NONE')
    assert.equal(result.localInstitutionalAuthorityEffect, 'NONE')
    assert.equal(result.authoringPolicy.owner, 'TEACHER')
    assert.equal(result.authoringPolicy.sectionCopyRequired, false)
    assert.equal(result.authoringPolicy.sectionAdaptationMode, 'DELTA_ONLY')
    assert.equal('sectionId' in result, false)
  })

  it('projects a teacher-owned authoring context without copying curriculum authority or section state', () => {
    const authoring = projectUdaAuthoringContextV1(udaBinding())

    assert.equal(authoring.contract, 'CML_UDA_AUTHORING_CONTEXT_V1')
    assert.equal(authoring.owner, 'TEACHER')
    assert.equal(authoring.localInstitutionalAuthorityEffect, 'NONE')
    assert.equal(authoring.sectionCopyRequired, false)
    assert.equal(authoring.sectionAdaptationMode, 'DELTA_ONLY')
    assert.deepEqual(authoring.curriculumRequirementIds, ['req-systems', 'req-project'])
    assert.ok(authoring.teacherOwnedFields.includes('PROBLEM_SITUATION'))
    assert.ok(authoring.teacherOwnedFields.includes('SECTION_ADAPTATIONS'))
    assert.ok(authoring.teacherOwnedFields.includes('TEACHER_NOTES_AND_REVISIONS'))
    assert.equal('sectionId' in authoring, false)
  })

  it('rejects a plan block that canonically belongs to another UDA', () => {
    assert.throws(
      () => udaBinding({ blocks: ['B03', 'B07'] }),
      /belongs to UDA 1-02, not 1-01/,
    )
  })

  it('rejects mixed curriculum contexts instead of composing an incoherent UDA binding', () => {
    const original = teacherContext({ fingerprint: 'footprint-v1' })
    const changed = teacherContext({ fingerprint: 'footprint-v2' })
    assert.throws(
      () => createUdaCurriculumBindingV1({
        bindingId: 'uda-binding-mixed',
        grade: 'Prima',
        udaSource: udaSource(),
        planBindings: [planBinding('B03', original), planBinding('B04', changed)],
        professionalDecisionRef: 'teacher-uda-binding-mixed',
        boundAt: '2026-09-09T19:00:00.000Z',
      }),
      /different curriculum contexts or scopes/,
    )
  })

  it('fails closed on unknown or duplicate curriculum requirement selections', () => {
    assert.throws(
      () => udaBinding({ requirementIds: ['req-unknown'] }),
      /unknown curriculum requirement for UDA binding/,
    )
    assert.throws(
      () => udaBinding({ requirementIds: ['req-systems', 'req-systems'] }),
      /duplicate requirementIds/,
    )
  })

  it('rejects non-canonical UDA source identities', () => {
    assert.throws(
      () => createUdaCurriculumBindingV1({
        bindingId: 'uda-binding-invalid-code',
        grade: 'Prima',
        udaSource: { code: 'UDA-1-01', assetId: 'uda-asset-1-01', generationId: 'generation-1' },
        planBindings: [planBinding('B03')],
        professionalDecisionRef: 'teacher-uda-binding-invalid',
        boundAt: '2026-09-09T19:00:00.000Z',
      }),
      /must use canonical CAN-UDA-x-xx identity/,
    )
  })

  it('detects a new UDA source generation without rewriting the historical binding', () => {
    const existing = udaBinding()
    const before = JSON.stringify(existing)
    const state = classifyUdaBindingAgainstCurrentInputs({
      binding: existing,
      grade: 'Prima',
      udaSource: udaSource('uda-generation-102'),
      planBindings: [planBinding('B03'), planBinding('B04')],
    })

    assert.equal(state, 'UDA_SOURCE_REVALIDATION_REQUIRED')
    assert.equal(JSON.stringify(existing), before)
  })

  it('detects changed curriculum footprint without silently rebinding the UDA', () => {
    const existing = udaBinding({ context: teacherContext({ fingerprint: 'footprint-v1' }) })
    const changedContext = teacherContext({ fingerprint: 'footprint-v2' })
    const state = classifyUdaBindingAgainstCurrentInputs({
      binding: existing,
      grade: 'Prima',
      udaSource: udaSource(),
      planBindings: [planBinding('B03', changedContext), planBinding('B04', changedContext)],
    })

    assert.equal(state, 'CURRICULUM_REVALIDATION_REQUIRED')
  })

  it('rejects cross-cohort reuse', () => {
    const existing = udaBinding()
    const otherCohort = teacherContext({ cohortRef: 'cohort-2027-grade-1' })
    const state = classifyUdaBindingAgainstCurrentInputs({
      binding: existing,
      grade: 'Prima',
      udaSource: udaSource(),
      planBindings: [planBinding('B03', otherCohort), planBinding('B04', otherCohort)],
    })

    assert.equal(state, 'SCOPE_MISMATCH')
  })

  it('detects changed plan membership instead of mutating the UDA binding', () => {
    const existing = udaBinding()
    const before = JSON.stringify(existing)
    const state = classifyUdaBindingAgainstCurrentInputs({
      binding: existing,
      grade: 'Prima',
      udaSource: udaSource(),
      planBindings: [planBinding('B03')],
    })

    assert.equal(state, 'PLAN_MEMBERSHIP_MISMATCH')
    assert.equal(JSON.stringify(existing), before)
  })

  it('preserves provisional curriculum state and future revalidation requirement in the UDA binding', () => {
    const provisional = udaBinding({ context: teacherContext({ authority: 'PROVISIONAL_COMPLETE' }) })
    assert.equal(provisional.curriculum.institutionalAuthorityState, 'PROVISIONAL_COMPLETE')
    assert.equal(provisional.curriculum.institutionalAuthorityReceiptRef, undefined)
    assert.equal(provisional.curriculum.requiresRevalidationOnApproval, true)
  })
})
