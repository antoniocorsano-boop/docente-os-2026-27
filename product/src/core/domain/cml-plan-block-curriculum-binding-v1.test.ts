import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AnnualPlanBlockProgress } from './annual-plan-execution'
import type { TeacherCurriculumContextV1 } from './cml-curriculum-release-intake-v1'
import {
  classifyPlanBlockBindingAgainstTeacherContext,
  createPlanBlockCurriculumBindingV1,
  linkPlanBlockBindingToSectionExecution,
} from './cml-plan-block-curriculum-binding-v1'

const ref = (entityType: string, entityId: string, versionId?: string) => ({
  namespace: 'curmanlight.arena',
  entityType,
  entityId,
  ...(versionId ? { versionId } : {}),
})

function teacherContext(input: {
  authority?: 'APPROVED' | 'PROVISIONAL_COMPLETE'
  fingerprint?: string
  cohortRef?: string
  sectionRef?: string
  gradeRef?: string
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
    sourceHandoffFingerprintHash: input.fingerprint ?? 'abc12345',
    scope: {
      institutionRef: ref('Institution', 'school-demo'),
      schoolYearRef: '2026-2027',
      disciplineRef: 'technology',
      gradeRef: input.gradeRef ?? 'grade-1',
      ...(input.sectionRef ? { sectionRef: input.sectionRef } : { sectionRef: '1A' }),
      ...(input.cohortRef === undefined ? { cohortRef: 'cohort-2026-grade-1' } : input.cohortRef ? { cohortRef: input.cohortRef } : {}),
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

function binding(context = teacherContext()) {
  return createPlanBlockCurriculumBindingV1({
    bindingId: 'binding-can-plan-1-b03',
    canonicalPlanAssetId: '4a027986-5b6d-49db-9b52-01cfae679c08',
    canonicalGenerationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
    blockId: 'B03',
    teacherContext: context,
    requirementIds: ['req-systems', 'req-project'],
    professionalDecisionRef: 'teacher-plan-binding-001',
    boundAt: '2026-09-09T18:30:00.000Z',
  })
}

function progress(input: { id: string; sectionId: string; status?: AnnualPlanBlockProgress['status']; blockId?: string; assetId?: string }): AnnualPlanBlockProgress {
  return {
    id: input.id,
    sectionId: input.sectionId,
    canonicalPlanAssetId: input.assetId ?? '4a027986-5b6d-49db-9b52-01cfae679c08',
    canonicalGenerationId: 'd327355b-76a9-496f-99cb-dc942fd950e4',
    blockId: input.blockId ?? 'B03',
    status: input.status ?? 'PIANIFICATO',
    executedOn: null,
    evidenceNote: null,
    updatedAt: '2026-09-09T18:40:00.000Z',
  }
}

describe('C2P-04 PlanBlockCurriculumBindingV1', () => {
  it('binds a canonical plan block to stable accepted curriculum requirement references', () => {
    const result = binding()

    assert.equal(result.contract, 'CML_PLAN_BLOCK_CURRICULUM_BINDING_V1')
    assert.equal(result.bindingScope, 'CANONICAL_PLAN_BLOCK')
    assert.equal(result.canonicalPlan.blockId, 'B03')
    assert.equal(result.curriculum.institutionalAuthorityState, 'APPROVED')
    assert.equal(result.curriculum.sourceHandoffFingerprintHash, 'abc12345')
    assert.equal(result.applicability.cohortRef, 'cohort-2026-grade-1')
    assert.deepEqual(result.requirementBindings.map((item) => item.requirementId), ['req-systems', 'req-project'])
    assert.deepEqual(result.requirementBindings.map((item) => item.curriculumNodeRef.entityId), [
      'technology-systems',
      'technology-project-method',
    ])
    assert.equal(result.sectionExecutionEffect, 'NONE')
    assert.equal('sectionId' in result, false)
  })

  it('keeps one common binding usable by separate section execution records without sharing section state', () => {
    const commonBinding = binding()
    const before = JSON.stringify(commonBinding)

    const link1A = linkPlanBlockBindingToSectionExecution(
      commonBinding,
      progress({ id: 'progress-1a-b03', sectionId: 'section-1a', status: 'SVOLTO' }),
    )
    const link1C = linkPlanBlockBindingToSectionExecution(
      commonBinding,
      progress({ id: 'progress-1c-b03', sectionId: 'section-1c', status: 'PIANIFICATO' }),
    )

    assert.equal(link1A.bindingId, link1C.bindingId)
    assert.equal(link1A.sectionId, 'section-1a')
    assert.equal(link1C.sectionId, 'section-1c')
    assert.equal(link1A.executionStatus, 'SVOLTO')
    assert.equal(link1C.executionStatus, 'PIANIFICATO')
    assert.equal(link1A.bindingMutated, false)
    assert.equal(link1C.bindingMutated, false)
    assert.equal(JSON.stringify(commonBinding), before)
  })

  it('rejects a section execution pointing to another canonical block or source generation', () => {
    const commonBinding = binding()
    assert.throws(
      () => linkPlanBlockBindingToSectionExecution(
        commonBinding,
        progress({ id: 'progress-b04', sectionId: 'section-1a', blockId: 'B04' }),
      ),
      /does not match the canonical plan block curriculum binding/,
    )
    assert.throws(
      () => linkPlanBlockBindingToSectionExecution(
        commonBinding,
        progress({ id: 'progress-other-source', sectionId: 'section-1a', assetId: 'different-plan-asset' }),
      ),
      /does not match the canonical plan block curriculum binding/,
    )
  })

  it('fails closed on unknown or duplicated curriculum requirements', () => {
    const context = teacherContext()
    assert.throws(
      () => createPlanBlockCurriculumBindingV1({
        bindingId: 'binding-unknown',
        canonicalPlanAssetId: 'plan-1',
        canonicalGenerationId: 'generation-1',
        blockId: 'B01',
        teacherContext: context,
        requirementIds: ['req-unknown'],
        professionalDecisionRef: 'decision-unknown',
        boundAt: '2026-09-09T18:30:00.000Z',
      }),
      /unknown curriculum requirement/,
    )
    assert.throws(
      () => createPlanBlockCurriculumBindingV1({
        bindingId: 'binding-duplicate',
        canonicalPlanAssetId: 'plan-1',
        canonicalGenerationId: 'generation-1',
        blockId: 'B01',
        teacherContext: context,
        requirementIds: ['req-systems', 'req-systems'],
        professionalDecisionRef: 'decision-duplicate',
        boundAt: '2026-09-09T18:30:00.000Z',
      }),
      /duplicate requirementIds/,
    )
  })

  it('requires a cohort-level applicability anchor before binding a common plan block', () => {
    const sectionOnly = teacherContext({ cohortRef: '' })
    assert.throws(() => binding(sectionOnly), /requires cohortRef/)
  })

  it('preserves provisional authority and the future revalidation obligation', () => {
    const provisional = binding(teacherContext({ authority: 'PROVISIONAL_COMPLETE' }))
    assert.equal(provisional.curriculum.institutionalAuthorityState, 'PROVISIONAL_COMPLETE')
    assert.equal(provisional.curriculum.institutionalAuthorityReceiptRef, undefined)
    assert.equal(provisional.curriculum.requiresRevalidationOnApproval, true)
  })

  it('detects a changed accepted footprint without silently rebinding historical plan work', () => {
    const originalContext = teacherContext({ fingerprint: 'footprint-v1' })
    const existingBinding = binding(originalContext)
    const before = JSON.stringify(existingBinding)

    const same = classifyPlanBlockBindingAgainstTeacherContext(existingBinding, originalContext)
    const changed = classifyPlanBlockBindingAgainstTeacherContext(
      existingBinding,
      teacherContext({ fingerprint: 'footprint-v2' }),
    )

    assert.equal(same, 'CURRENT')
    assert.equal(changed, 'REVALIDATION_REQUIRED')
    assert.equal(JSON.stringify(existingBinding), before)
  })

  it('rejects cross-scope reuse instead of treating another cohort as equivalent', () => {
    const existingBinding = binding()
    const otherCohort = teacherContext({ cohortRef: 'cohort-2027-grade-1' })
    assert.equal(classifyPlanBlockBindingAgainstTeacherContext(existingBinding, otherCohort), 'SCOPE_MISMATCH')
  })

  it('rejects any teacher context that claims local institutional authority', () => {
    const invalid = {
      ...teacherContext(),
      localAuthorityEffect: 'APPROVED_INSTITUTIONAL',
    } as unknown as TeacherCurriculumContextV1
    assert.throws(() => binding(invalid), /cannot confer local institutional authority/)
  })
})
