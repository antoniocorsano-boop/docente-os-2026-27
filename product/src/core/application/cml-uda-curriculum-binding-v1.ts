import { buildBlocks, CANONICAL_PLAN_SOURCES, type GradeKey } from '@/app/piano-annuale/model'
import type { CmlCanonicalRef } from '@/core/domain/cml-local-handoff'
import type {
  PlanBlockCurriculumBindingV1,
  PlanBlockCurriculumRequirementBindingV1,
} from '@/core/domain/cml-plan-block-curriculum-binding-v1'
import type { HumanTaskPipelineSource } from './human-task-content-pipeline'

export const CML_UDA_CURRICULUM_BINDING_V1 = 'CML_UDA_CURRICULUM_BINDING_V1' as const
export const CML_UDA_AUTHORING_CONTEXT_V1 = 'CML_UDA_AUTHORING_CONTEXT_V1' as const

export type UdaCurriculumBindingV1 = {
  contract: typeof CML_UDA_CURRICULUM_BINDING_V1
  bindingId: string
  bindingScope: 'CANONICAL_UDA'
  uda: {
    code: string
    assetId: string
    generationId: string
  }
  canonicalPlan: {
    grade: GradeKey
    assetId: string
    generationId: string
    blockIds: string[]
    planBindingIds: string[]
  }
  curriculum: {
    curriculumRef: CmlCanonicalRef
    curriculumVersionRef: CmlCanonicalRef
    institutionalAuthorityState: PlanBlockCurriculumBindingV1['curriculum']['institutionalAuthorityState']
    institutionalAuthorityReceiptRef?: CmlCanonicalRef
    sourceHandoffFingerprintHash: string
    teacherAcceptanceDecisionRef: string
    requiresRevalidationOnApproval: boolean
  }
  applicability: PlanBlockCurriculumBindingV1['applicability']
  requirementBindings: PlanBlockCurriculumRequirementBindingV1[]
  professionalDecisionRef: string
  boundAt: string
  sectionExecutionEffect: 'NONE'
  localInstitutionalAuthorityEffect: 'NONE'
  authoringPolicy: {
    owner: 'TEACHER'
    sectionCopyRequired: false
    sectionAdaptationMode: 'DELTA_ONLY'
    teacherOwnedFields: readonly [
      'PROBLEM_SITUATION',
      'PHASES_AND_SEQUENCE',
      'DURATION_AND_SCHEDULING',
      'RESOURCES_AND_MATERIALS',
      'METHODS',
      'SECTION_ADAPTATIONS',
      'CLASSROOM_EVIDENCE_DESIGN',
      'TEACHER_NOTES_AND_REVISIONS',
    ]
  }
}

export type UdaAuthoringContextV1 = {
  contract: typeof CML_UDA_AUTHORING_CONTEXT_V1
  udaBindingId: string
  uda: UdaCurriculumBindingV1['uda']
  canonicalPlan: UdaCurriculumBindingV1['canonicalPlan']
  curriculumVersionRef: CmlCanonicalRef
  curriculumRequirementIds: string[]
  owner: 'TEACHER'
  localInstitutionalAuthorityEffect: 'NONE'
  sectionCopyRequired: false
  sectionAdaptationMode: 'DELTA_ONLY'
  teacherOwnedFields: UdaCurriculumBindingV1['authoringPolicy']['teacherOwnedFields']
}

export type UdaBindingCurrentState =
  | 'CURRENT'
  | 'UDA_SOURCE_REVALIDATION_REQUIRED'
  | 'CURRICULUM_REVALIDATION_REQUIRED'
  | 'SCOPE_MISMATCH'
  | 'PLAN_MEMBERSHIP_MISMATCH'

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function cloneRef(ref: CmlCanonicalRef): CmlCanonicalRef {
  return { ...ref }
}

function refKey(ref: CmlCanonicalRef): string {
  return `${ref.namespace}|${ref.entityType}|${ref.entityId}|${ref.versionId ?? ''}`
}

function sameRef(left: CmlCanonicalRef, right: CmlCanonicalRef): boolean {
  return refKey(left) === refKey(right)
}

function expectedUdaCode(sourceCode: string): string {
  const match = /^CAN-UDA-(\d-\d{2})$/.exec(sourceCode)
  if (!match) throw new Error(`UDA source code must use canonical CAN-UDA-x-xx identity: ${sourceCode}`)
  return match[1]
}

function sameApplicability(
  left: PlanBlockCurriculumBindingV1['applicability'],
  right: PlanBlockCurriculumBindingV1['applicability'],
): boolean {
  return sameRef(left.institutionRef, right.institutionRef)
    && left.schoolYearRef === right.schoolYearRef
    && left.disciplineRef === right.disciplineRef
    && left.gradeRef === right.gradeRef
    && left.cohortRef === right.cohortRef
}

function sameCurriculumAnchor(
  left: PlanBlockCurriculumBindingV1,
  right: PlanBlockCurriculumBindingV1,
): boolean {
  return sameRef(left.curriculum.curriculumRef, right.curriculum.curriculumRef)
    && sameRef(left.curriculum.curriculumVersionRef, right.curriculum.curriculumVersionRef)
    && left.curriculum.sourceHandoffFingerprintHash === right.curriculum.sourceHandoffFingerprintHash
    && left.curriculum.teacherAcceptanceDecisionRef === right.curriculum.teacherAcceptanceDecisionRef
    && left.curriculum.institutionalAuthorityState === right.curriculum.institutionalAuthorityState
    && left.curriculum.requiresRevalidationOnApproval === right.curriculum.requiresRevalidationOnApproval
    && sameApplicability(left.applicability, right.applicability)
}

function validatePlanBindingsForUda(input: {
  grade: GradeKey
  udaCode: string
  planBindings: PlanBlockCurriculumBindingV1[]
}) {
  if (input.planBindings.length === 0) throw new Error('UDA curriculum binding requires at least one plan-block binding')

  const canonicalPlan = CANONICAL_PLAN_SOURCES[input.grade]
  const blocks = buildBlocks(input.grade)
  const bindingIds = new Set<string>()
  const blockIds = new Set<string>()
  const first = input.planBindings[0]

  for (const binding of input.planBindings) {
    if (binding.contract !== 'CML_PLAN_BLOCK_CURRICULUM_BINDING_V1') {
      throw new Error('UDA curriculum binding requires PlanBlockCurriculumBindingV1 inputs')
    }
    if (binding.sectionExecutionEffect !== 'NONE') {
      throw new Error('UDA curriculum binding cannot inherit section execution state')
    }
    if (bindingIds.has(binding.bindingId)) throw new Error(`duplicate plan binding in UDA binding: ${binding.bindingId}`)
    if (blockIds.has(binding.canonicalPlan.blockId)) throw new Error(`duplicate canonical block in UDA binding: ${binding.canonicalPlan.blockId}`)
    bindingIds.add(binding.bindingId)
    blockIds.add(binding.canonicalPlan.blockId)

    if (binding.canonicalPlan.assetId !== canonicalPlan.assetId
      || binding.canonicalPlan.generationId !== canonicalPlan.generationId) {
      throw new Error('plan-block binding does not belong to the current canonical plan source')
    }

    const block = blocks.find((candidate) => candidate.id === binding.canonicalPlan.blockId)
    if (!block) throw new Error(`canonical plan block not found for UDA binding: ${binding.canonicalPlan.blockId}`)
    if (block.uda !== input.udaCode) {
      throw new Error(`canonical plan block ${block.id} belongs to UDA ${block.uda}, not ${input.udaCode}`)
    }
    if (!sameCurriculumAnchor(first, binding)) {
      throw new Error('UDA curriculum binding cannot combine plan blocks from different curriculum contexts or scopes')
    }
  }

  return {
    canonicalPlan,
    first,
    blockIds: input.planBindings.map((binding) => binding.canonicalPlan.blockId),
    planBindingIds: input.planBindings.map((binding) => binding.bindingId),
  }
}

function collectRequirements(planBindings: PlanBlockCurriculumBindingV1[]) {
  const byId = new Map<string, PlanBlockCurriculumRequirementBindingV1>()
  for (const binding of planBindings) {
    for (const requirement of binding.requirementBindings) {
      const existing = byId.get(requirement.requirementId)
      if (existing && (
        !sameRef(existing.curriculumNodeRef, requirement.curriculumNodeRef)
        || existing.authorityLevel !== requirement.authorityLevel
        || existing.coverageRequired !== requirement.coverageRequired
      )) {
        throw new Error(`curriculum requirement ${requirement.requirementId} is inconsistent across plan-block bindings`)
      }
      if (!existing) {
        byId.set(requirement.requirementId, {
          ...requirement,
          curriculumNodeRef: cloneRef(requirement.curriculumNodeRef),
        })
      }
    }
  }
  return byId
}

export function createUdaCurriculumBindingV1(input: {
  bindingId: string
  grade: GradeKey
  udaSource: Pick<HumanTaskPipelineSource, 'code' | 'assetId' | 'generationId'>
  planBindings: PlanBlockCurriculumBindingV1[]
  requirementIds?: string[]
  professionalDecisionRef: string
  boundAt: string
}): UdaCurriculumBindingV1 {
  for (const [field, value] of Object.entries({
    bindingId: input.bindingId,
    udaSourceCode: input.udaSource.code,
    udaAssetId: input.udaSource.assetId,
    udaGenerationId: input.udaSource.generationId,
    professionalDecisionRef: input.professionalDecisionRef,
  })) {
    if (!nonEmpty(value)) throw new Error(`${field} is required`)
  }
  if (!nonEmpty(input.boundAt) || Number.isNaN(Date.parse(input.boundAt))) {
    throw new Error('boundAt must be an ISO-compatible date')
  }

  const udaCode = expectedUdaCode(input.udaSource.code)
  const validated = validatePlanBindingsForUda({
    grade: input.grade,
    udaCode,
    planBindings: input.planBindings,
  })

  const requirementMap = collectRequirements(input.planBindings)
  const selectedIds = input.requirementIds ?? [...requirementMap.keys()]
  if (selectedIds.length === 0) throw new Error('UDA curriculum binding requires at least one curriculum requirement')
  if (new Set(selectedIds).size !== selectedIds.length) throw new Error('UDA curriculum binding contains duplicate requirementIds')
  const requirementBindings = selectedIds.map((requirementId) => {
    const requirement = requirementMap.get(requirementId)
    if (!requirement) throw new Error(`unknown curriculum requirement for UDA binding: ${requirementId}`)
    return {
      ...requirement,
      curriculumNodeRef: cloneRef(requirement.curriculumNodeRef),
    }
  })

  const source = validated.first
  return {
    contract: CML_UDA_CURRICULUM_BINDING_V1,
    bindingId: input.bindingId,
    bindingScope: 'CANONICAL_UDA',
    uda: {
      code: input.udaSource.code,
      assetId: input.udaSource.assetId,
      generationId: input.udaSource.generationId,
    },
    canonicalPlan: {
      grade: input.grade,
      assetId: validated.canonicalPlan.assetId,
      generationId: validated.canonicalPlan.generationId,
      blockIds: [...validated.blockIds],
      planBindingIds: [...validated.planBindingIds],
    },
    curriculum: {
      curriculumRef: cloneRef(source.curriculum.curriculumRef),
      curriculumVersionRef: cloneRef(source.curriculum.curriculumVersionRef),
      institutionalAuthorityState: source.curriculum.institutionalAuthorityState,
      ...(source.curriculum.institutionalAuthorityReceiptRef
        ? { institutionalAuthorityReceiptRef: cloneRef(source.curriculum.institutionalAuthorityReceiptRef) }
        : {}),
      sourceHandoffFingerprintHash: source.curriculum.sourceHandoffFingerprintHash,
      teacherAcceptanceDecisionRef: source.curriculum.teacherAcceptanceDecisionRef,
      requiresRevalidationOnApproval: source.curriculum.requiresRevalidationOnApproval,
    },
    applicability: {
      ...source.applicability,
      institutionRef: cloneRef(source.applicability.institutionRef),
    },
    requirementBindings,
    professionalDecisionRef: input.professionalDecisionRef,
    boundAt: input.boundAt,
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
  }
}

export function projectUdaAuthoringContextV1(binding: UdaCurriculumBindingV1): UdaAuthoringContextV1 {
  return {
    contract: CML_UDA_AUTHORING_CONTEXT_V1,
    udaBindingId: binding.bindingId,
    uda: { ...binding.uda },
    canonicalPlan: {
      ...binding.canonicalPlan,
      blockIds: [...binding.canonicalPlan.blockIds],
      planBindingIds: [...binding.canonicalPlan.planBindingIds],
    },
    curriculumVersionRef: cloneRef(binding.curriculum.curriculumVersionRef),
    curriculumRequirementIds: binding.requirementBindings.map((item) => item.requirementId),
    owner: 'TEACHER',
    localInstitutionalAuthorityEffect: 'NONE',
    sectionCopyRequired: false,
    sectionAdaptationMode: 'DELTA_ONLY',
    teacherOwnedFields: [...binding.authoringPolicy.teacherOwnedFields] as UdaAuthoringContextV1['teacherOwnedFields'],
  }
}

export function classifyUdaBindingAgainstCurrentInputs(input: {
  binding: UdaCurriculumBindingV1
  grade: GradeKey
  udaSource: Pick<HumanTaskPipelineSource, 'code' | 'assetId' | 'generationId'>
  planBindings: PlanBlockCurriculumBindingV1[]
}): UdaBindingCurrentState {
  const { binding } = input
  if (binding.canonicalPlan.grade !== input.grade) return 'SCOPE_MISMATCH'

  const incomingCode = expectedUdaCode(input.udaSource.code)
  const boundCode = expectedUdaCode(binding.uda.code)
  if (incomingCode !== boundCode) return 'PLAN_MEMBERSHIP_MISMATCH'
  if (input.udaSource.assetId !== binding.uda.assetId || input.udaSource.generationId !== binding.uda.generationId) {
    return 'UDA_SOURCE_REVALIDATION_REQUIRED'
  }

  let validated: ReturnType<typeof validatePlanBindingsForUda>
  try {
    validated = validatePlanBindingsForUda({ grade: input.grade, udaCode: incomingCode, planBindings: input.planBindings })
  } catch {
    return 'PLAN_MEMBERSHIP_MISMATCH'
  }

  if (!sameApplicability(binding.applicability, validated.first.applicability)) return 'SCOPE_MISMATCH'
  if (!sameRef(binding.curriculum.curriculumRef, validated.first.curriculum.curriculumRef)
    || !sameRef(binding.curriculum.curriculumVersionRef, validated.first.curriculum.curriculumVersionRef)
    || binding.curriculum.sourceHandoffFingerprintHash !== validated.first.curriculum.sourceHandoffFingerprintHash) {
    return 'CURRICULUM_REVALIDATION_REQUIRED'
  }

  const expectedBlockIds = [...binding.canonicalPlan.blockIds].sort()
  const currentBlockIds = [...validated.blockIds].sort()
  const expectedBindingIds = [...binding.canonicalPlan.planBindingIds].sort()
  const currentBindingIds = [...validated.planBindingIds].sort()
  if (expectedBlockIds.join('|') !== currentBlockIds.join('|') || expectedBindingIds.join('|') !== currentBindingIds.join('|')) {
    return 'PLAN_MEMBERSHIP_MISMATCH'
  }
  return 'CURRENT'
}
