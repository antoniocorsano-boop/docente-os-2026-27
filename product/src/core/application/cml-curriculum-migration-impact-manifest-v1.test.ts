import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { AnnualPlanCurriculumRevalidationReview } from '@/core/domain/cml-curriculum-revalidation'
import type { PlanBlockCurriculumBindingV1 } from '@/core/domain/cml-plan-block-curriculum-binding-v1'
import type { UdaCurriculumBindingV1 } from './cml-uda-curriculum-binding-v1'
import {
  buildCurriculumMigrationImpactManifestV1,
  type CurriculumMigrationTargetV1,
} from './cml-curriculum-migration-impact-manifest-v1'

const ref = (namespace: string, entityType: string, entityId: string, versionId?: string) => ({
  namespace,
  entityType,
  entityId,
  ...(versionId ? { versionId } : {}),
})

const institutionRef = ref('curmanlight.arena', 'Institution', 'school-1')
const curriculumRef = ref('curmanlight.arena', 'Curriculum', 'technology-grade-1')

function review(input: {
  incomingHash?: string
  changed?: string[]
  removed?: string[]
  added?: Array<{ id: string; mandatory: boolean }>
  cohortRef?: string
  curriculumEntityId?: string
  status?: string
  persistenceAllowed?: boolean
} = {}): AnnualPlanCurriculumRevalidationReview {
  const incomingHash = input.incomingHash ?? 'new-hash'
  const added = input.added ?? []
  const requirementDelta = [
    ...(input.changed ?? []).map((id) => ({
      kind: 'CHANGED',
      previousRequirement: { requirementId: id },
      incomingRequirement: { requirementId: id, coverageRequired: true },
    })),
    ...(input.removed ?? []).map((id) => ({
      kind: 'REMOVED',
      previousRequirement: { requirementId: id },
    })),
    ...added.map((item) => ({
      kind: 'ADDED',
      incomingRequirement: { requirementId: item.id, coverageRequired: item.mandatory },
    })),
  ]
  return {
    status: input.status ?? 'AWAITING_TEACHER_REVALIDATION',
    persistenceAllowed: input.persistenceAllowed ?? false,
    importState: 'UPDATE_AVAILABLE',
    previousReceiptId: 'acceptance-old',
    incomingHandoffFootprintHash: incomingHash,
    incomingFrameworkMessageId: 'framework-new',
    incomingCurricularContextId: 'ctx-new',
    reviewFingerprint: 'review-fingerprint-1',
    previousAuthority: 'PROVISIONAL_BASELINE',
    incomingAuthority: 'APPROVED_INSTITUTIONAL',
    requirementDelta,
    addedRequirementIds: added.map((item) => item.id),
    removedRequirementIds: [...(input.removed ?? [])],
    changedRequirementIds: [...(input.changed ?? [])],
    unchangedRequirementIds: [],
    preservedFramework: { periods: [], constraints: [] },
    coverageAgainstApproved: {
      status: 'SATISFIED',
      authority: 'APPROVED_INSTITUTIONAL',
      requiresRevalidationOnApproval: false,
      contextId: 'ctx-new',
      curriculumVersionRef: ref('curmanlight.arena', 'CurriculumVersion', 'technology-grade-1', 'v2'),
      requirementCoverage: [],
      blockingRequirementIds: [],
    },
    blockingRequirementIds: [],
    incomingHandoff: {
      structuralFootprint: { algorithm: 'FNV1A32', hash: incomingHash },
      curricularContext: {
        curriculumState: 'APPROVED',
        curriculumRef: ref('curmanlight.arena', 'Curriculum', input.curriculumEntityId ?? 'technology-grade-1'),
        curriculumVersionRef: ref('curmanlight.arena', 'CurriculumVersion', 'technology-grade-1', 'v2'),
        institutionRef,
        schoolYearRef: '2026-27',
        disciplineRef: 'TECHNOLOGY',
        gradeRef: '1',
        cohortRef: input.cohortRef ?? 'cohort-grade-1-2026',
        requirements: [],
      },
    },
  } as unknown as AnnualPlanCurriculumRevalidationReview
}

function planBinding(input: {
  id?: string
  hash?: string
  requirementIds?: string[]
  cohortRef?: string
  curriculumEntityId?: string
} = {}): PlanBlockCurriculumBindingV1 {
  const id = input.id ?? 'plan-binding-B01'
  return {
    contract: 'CML_PLAN_BLOCK_CURRICULUM_BINDING_V1',
    bindingId: id,
    bindingScope: 'CANONICAL_PLAN_BLOCK',
    canonicalPlan: { assetId: 'CAN-PLAN-1', generationId: 'gen-plan-1', blockId: 'B01' },
    curriculum: {
      curriculumRef: ref('curmanlight.arena', 'Curriculum', input.curriculumEntityId ?? 'technology-grade-1'),
      curriculumVersionRef: ref('curmanlight.arena', 'CurriculumVersion', 'technology-grade-1', 'v1'),
      institutionalAuthorityState: 'PROVISIONAL_COMPLETE',
      sourceHandoffFingerprintHash: input.hash ?? 'old-hash',
      teacherAcceptanceDecisionRef: 'teacher-accept-old',
      acceptedAt: '2026-09-01T08:00:00.000Z',
      requiresRevalidationOnApproval: true,
    },
    applicability: {
      institutionRef,
      schoolYearRef: '2026-27',
      disciplineRef: 'TECHNOLOGY',
      gradeRef: '1',
      cohortRef: input.cohortRef ?? 'cohort-grade-1-2026',
    },
    requirementBindings: (input.requirementIds ?? ['REQ-A']).map((requirementId) => ({
      requirementId,
      curriculumNodeRef: ref('curmanlight.arena', 'CurriculumNodeProjection', `node-${requirementId}`),
      authorityLevel: 'NATIONAL',
      coverageRequired: true,
    })),
    professionalDecisionRef: 'bind-plan-decision',
    boundAt: '2026-09-01T09:00:00.000Z',
    sectionExecutionEffect: 'NONE',
  } as PlanBlockCurriculumBindingV1
}

function udaBinding(input: {
  id?: string
  hash?: string
  requirementIds?: string[]
  cohortRef?: string
} = {}): UdaCurriculumBindingV1 {
  const id = input.id ?? 'uda-binding-1-01'
  return {
    contract: 'CML_UDA_CURRICULUM_BINDING_V1',
    bindingId: id,
    bindingScope: 'CANONICAL_UDA',
    uda: { code: 'CAN-UDA-1-01', assetId: 'uda-asset-1', generationId: 'uda-gen-1' },
    canonicalPlan: {
      grade: '1',
      assetId: 'CAN-PLAN-1',
      generationId: 'gen-plan-1',
      blockIds: ['B01'],
      planBindingIds: ['plan-binding-B01'],
    },
    curriculum: {
      curriculumRef,
      curriculumVersionRef: ref('curmanlight.arena', 'CurriculumVersion', 'technology-grade-1', 'v1'),
      institutionalAuthorityState: 'PROVISIONAL_COMPLETE',
      sourceHandoffFingerprintHash: input.hash ?? 'old-hash',
      teacherAcceptanceDecisionRef: 'teacher-accept-old',
      requiresRevalidationOnApproval: true,
    },
    applicability: {
      institutionRef,
      schoolYearRef: '2026-27',
      disciplineRef: 'TECHNOLOGY',
      gradeRef: '1',
      cohortRef: input.cohortRef ?? 'cohort-grade-1-2026',
    },
    requirementBindings: (input.requirementIds ?? ['REQ-A']).map((requirementId) => ({
      requirementId,
      curriculumNodeRef: ref('curmanlight.arena', 'CurriculumNodeProjection', `node-${requirementId}`),
      authorityLevel: 'NATIONAL',
      coverageRequired: true,
    })),
    professionalDecisionRef: 'bind-uda-decision',
    boundAt: '2026-09-01T10:00:00.000Z',
    sectionExecutionEffect: 'NONE',
    localInstitutionalAuthorityEffect: 'NONE',
    authoringPolicy: {
      owner: 'TEACHER',
      sectionCopyRequired: false,
      sectionAdaptationMode: 'DELTA_ONLY',
      teacherOwnedFields: [
        'PROBLEM_SITUATION',
        'PHASES_AND_SEQUENCE',
        'DURATION_AND_SCHEDULING',
        'RESOURCES_AND_MATERIALS',
        'METHODS',
        'SECTION_ADAPTATIONS',
        'CLASSROOM_EVIDENCE_DESIGN',
        'TEACHER_NOTES_AND_REVISIONS',
      ],
    },
  } as UdaCurriculumBindingV1
}

function build(targets: CurriculumMigrationTargetV1[], revalidation = review()) {
  return buildCurriculumMigrationImpactManifestV1({
    manifestId: 'manifest-001',
    generatedAt: '2026-09-09T20:30:00.000Z',
    review: revalidation,
    targets,
  })
}

describe('C2P-09 curriculum migration impact manifest', () => {
  it('preserves a historical plan binding even when one of its requirements changed', () => {
    const binding = planBinding({ requirementIds: ['REQ-A'] })
    const manifest = build([
      { targetType: 'PLAN_BLOCK_BINDING', targetId: binding.bindingId, temporalScope: 'HISTORICAL', binding },
    ], review({ changed: ['REQ-A'] }))
    const entry = manifest.entries[0]

    assert.equal(entry.disposition, 'HISTORICAL_PRESERVE')
    assert.equal(entry.preservedHistory, true)
    assert.equal(entry.automaticMutationAllowed, false)
    assert.equal(entry.teacherRevalidationRequired, false)
    assert.equal(entry.rebindingRequired, false)
    assert.equal(manifest.policy.historicalRewriteAllowed, false)
  })

  it('requires future rebinding when a requirement already used by a plan block changes', () => {
    const binding = planBinding({ requirementIds: ['REQ-A', 'REQ-B'] })
    const entry = build([
      { targetType: 'PLAN_BLOCK_BINDING', targetId: binding.bindingId, temporalScope: 'FUTURE', binding },
    ], review({ changed: ['REQ-A'] })).entries[0]

    assert.equal(entry.disposition, 'FUTURE_REBIND_REQUIRED')
    assert.equal(entry.reasonCode, 'BOUND_REQUIREMENT_CHANGED_OR_REMOVED')
    assert.deepEqual(entry.affectedRequirementIds, ['REQ-A'])
    assert.equal(entry.teacherRevalidationRequired, true)
    assert.equal(entry.rebindingRequired, true)
    assert.equal(entry.automaticMutationAllowed, false)
  })

  it('requires future rebinding when a requirement already used by a UDA is removed', () => {
    const binding = udaBinding({ requirementIds: ['REQ-A'] })
    const entry = build([
      { targetType: 'UDA_BINDING', targetId: binding.bindingId, temporalScope: 'FUTURE', binding },
    ], review({ removed: ['REQ-A'] })).entries[0]

    assert.equal(entry.disposition, 'FUTURE_REBIND_REQUIRED')
    assert.deepEqual(entry.affectedRequirementIds, ['REQ-A'])
  })

  it('requires teacher revalidation for a new mandatory requirement even if current bindings remain semantically intact', () => {
    const binding = planBinding({ requirementIds: ['REQ-A'] })
    const manifest = build([
      { targetType: 'PLAN_BLOCK_BINDING', targetId: binding.bindingId, temporalScope: 'FUTURE', binding },
    ], review({ added: [{ id: 'REQ-NEW', mandatory: true }] }))
    const entry = manifest.entries[0]

    assert.equal(entry.disposition, 'FUTURE_REVALIDATION_REQUIRED')
    assert.equal(entry.reasonCode, 'NEW_MANDATORY_REQUIREMENT_REQUIRES_REVALIDATION')
    assert.deepEqual(entry.affectedRequirementIds, ['REQ-NEW'])
    assert.equal(entry.rebindingRequired, false)
    assert.deepEqual(manifest.requirementDelta.addedMandatoryRequirementIds, ['REQ-NEW'])
  })

  it('requires revalidation for an authority or structural-footprint change without rewriting the binding', () => {
    const binding = planBinding({ hash: 'old-hash', requirementIds: ['REQ-A'] })
    const entry = build([
      { targetType: 'PLAN_BLOCK_BINDING', targetId: binding.bindingId, temporalScope: 'FUTURE', binding },
    ], review({ incomingHash: 'approved-hash' })).entries[0]

    assert.equal(entry.disposition, 'FUTURE_REVALIDATION_REQUIRED')
    assert.equal(entry.reasonCode, 'CURRICULUM_FOOTPRINT_CHANGED_REQUIRES_REVALIDATION')
    assert.equal(entry.automaticMutationAllowed, false)
    assert.equal(binding.curriculum.sourceHandoffFingerprintHash, 'old-hash')
  })

  it('classifies an already aligned future binding as unchanged-compatible', () => {
    const binding = planBinding({ hash: 'same-hash', requirementIds: ['REQ-A'] })
    const entry = build([
      { targetType: 'PLAN_BLOCK_BINDING', targetId: binding.bindingId, temporalScope: 'FUTURE', binding },
    ], review({ incomingHash: 'same-hash' })).entries[0]

    assert.equal(entry.disposition, 'UNCHANGED_COMPATIBLE')
    assert.equal(entry.reasonCode, 'CURRENT_BINDING_COMPATIBLE')
    assert.equal(entry.teacherRevalidationRequired, false)
    assert.equal(entry.automaticMutationAllowed, false)
  })

  it('routes a changed curriculum scope to manual review instead of rebinding silently', () => {
    const binding = planBinding({ cohortRef: 'cohort-grade-1-2026' })
    const entry = build([
      { targetType: 'PLAN_BLOCK_BINDING', targetId: binding.bindingId, temporalScope: 'FUTURE', binding },
    ], review({ cohortRef: 'different-cohort' })).entries[0]

    assert.equal(entry.disposition, 'MANUAL_REVIEW_REQUIRED')
    assert.equal(entry.reasonCode, 'SCOPE_CHANGED_REQUIRES_MANUAL_REVIEW')
    assert.equal(entry.teacherRevalidationRequired, true)
    assert.equal(entry.rebindingRequired, false)
  })

  it('preserves classroom history without carrying raw classroom data into the transition manifest', () => {
    const entry = build([{
      targetType: 'CLASSROOM_HISTORY',
      targetId: 'teaching-session-001',
      temporalScope: 'HISTORICAL',
      recordKind: 'TEACHING_SESSION',
      sourceBindingIds: ['plan-binding-B01', 'uda-binding-1-01'],
    }]).entries[0]

    assert.equal(entry.disposition, 'HISTORICAL_PRESERVE')
    assert.deepEqual(entry.affectedRequirementIds, [])
    assert.equal('studentRef' in entry, false)
    assert.equal('evidence' in entry, false)
  })

  it('fails closed on duplicate target identities', () => {
    const binding = planBinding()
    assert.throws(() => build([
      { targetType: 'PLAN_BLOCK_BINDING', targetId: binding.bindingId, temporalScope: 'FUTURE', binding },
      { targetType: 'PLAN_BLOCK_BINDING', targetId: binding.bindingId, temporalScope: 'HISTORICAL', binding },
    ]), /duplicate curriculum migration target/)
  })

  it('fails closed when the migration target identity does not match its binding', () => {
    const binding = planBinding()
    assert.throws(() => build([
      { targetType: 'PLAN_BLOCK_BINDING', targetId: 'forged-id', temporalScope: 'FUTURE', binding },
    ]), /must match the binding identity/)
  })

  it('refuses any review that already authorizes persistence', () => {
    const binding = planBinding()
    assert.throws(() => build([
      { targetType: 'PLAN_BLOCK_BINDING', targetId: binding.bindingId, temporalScope: 'FUTURE', binding },
    ], review({ persistenceAllowed: true })), /requires a non-persisting teacher revalidation review/)
  })

  it('never confers institutional authority or silent migration power', () => {
    const binding = udaBinding()
    const manifest = build([
      { targetType: 'UDA_BINDING', targetId: binding.bindingId, temporalScope: 'FUTURE', binding },
    ])

    assert.deepEqual(manifest.policy, {
      historicalRewriteAllowed: false,
      silentRebindAllowed: false,
      automaticPersistenceAllowed: false,
      institutionalAuthorityEffect: 'NONE',
      teacherDecisionRequiredForFutureChanges: true,
    })
  })
})
