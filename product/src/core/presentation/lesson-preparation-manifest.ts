import {
  composeLessonSequence,
  isTeachingAdjustment,
  lessonMaterialBindingState,
  type ComposedLessonSequenceStep,
  type LessonDesignExtension,
} from '@/core/domain/lesson-design-extension'
import type {
  LessonMaterialBindingV1,
  LessonMaterialRole as CanonicalLessonMaterialRole,
} from '@/core/domain/lesson-material-binding'
import {
  resolveCanonicalMaterialContentV1,
  type CanonicalMaterialContentResolutionV1,
  type MaterialContentReadPortV1,
} from '@/core/application/material-content-resolution'
import {
  resolveHumanTaskResourcesForSurface,
  type HumanTaskLessonProjection,
  type HumanTaskResourceKind,
} from './human-task-content'
import type { NextLessonKnowledgeResource, NextLessonPreparation } from './next-lesson-preparation'
import {
  emptyLessonReplanningProjection,
  type LessonReplanningProjection,
} from './lesson-replanning-decision'
import type { LessonCopilotContext } from './teacher-copilot-context'

export type LessonMaterialRole = CanonicalLessonMaterialRole

export type LessonMaterialSlotStatus = 'READY' | 'MISSING' | 'PROPOSED' | 'NEEDS_REVIEW'
export type LessonPreparationReadiness = 'DRAFT' | 'REVIEW_REQUIRED' | 'READY' | 'USED' | 'NEEDS_REVISION'
export type LessonPreparationResolution = 'SUPPORTED' | 'PARTIAL' | 'BLOCKED'

export type LessonPreparationProvenance = {
  kind: string
  ref?: string
  label?: string
}

export type LessonMaterialSlotMaterial = {
  resourceRef: string
  title: string
  authority:
    | 'CANONICAL_PROJECTION'
    | 'CANONICAL_ACCEPTED_BINDING'
    | 'CANONICAL_PROPOSED_BINDING'
    | 'LEGACY_HISTORICAL'
  binding: LessonMaterialBindingV1 | null
}

export type LessonMaterialSlot = {
  role: LessonMaterialRole
  required: boolean
  status: LessonMaterialSlotStatus
  resourceRefs: string[]
  titles: string[]
  materials: LessonMaterialSlotMaterial[]
  reason: string
  provenance: LessonPreparationProvenance[]
}

export type LessonPreparationSupportingMaterial = Pick<
  NextLessonKnowledgeResource,
  'assetId' | 'title' | 'categoryLabel' | 'relevanceLabel'
>

export type LessonPreparationManifest = {
  lessonRef: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  disciplineId: string | null
  temporalAuthority: 'IN_FORCE' | 'PROVISIONAL_DRAFT'
  blockId: string
  projectionId: string
  udaRef: string
  packRef: string
  objective: string
  sequence: ComposedLessonSequenceStep[]
  sequenceRefs: string[]
  materialSlots: LessonMaterialSlot[]
  supportingMaterials: LessonPreparationSupportingMaterial[]
  acceptedExtensionRefs: string[]
  proposedExtensionRefs: string[]
  ignoredAcceptedExtensionRefs: string[]
  replanning?: LessonReplanningProjection
  readiness: LessonPreparationReadiness
  missingInformation: string[]
  provenance: LessonPreparationProvenance[]
  renderingCapabilities: string[]
}

export type LessonPreparationManifestResult =
  | {
      resolution: 'BLOCKED'
      manifest: null
      reasons: string[]
    }
  | {
      resolution: 'SUPPORTED' | 'PARTIAL'
      manifest: LessonPreparationManifest
      reasons: string[]
    }

export type LessonPreparationMaterialVerification = Readonly<Record<string, CanonicalMaterialContentResolutionV1>>

export type LessonPreparationManifestInput = {
  preparation: NextLessonPreparation
  lessonContext: LessonCopilotContext | null
  projection: HumanTaskLessonProjection | null
  extensions?: LessonDesignExtension[]
  replanning?: LessonReplanningProjection
  requiredMaterialRoles?: LessonMaterialRole[]
  renderingCapabilities?: string[]
  materialContentResolutions?: LessonPreparationMaterialVerification
}

export type VerifiedLessonPreparationManifestInput = Omit<
  LessonPreparationManifestInput,
  'materialContentResolutions'
> & {
  materialContentReadPort: MaterialContentReadPortV1
}

export function buildLessonPreparationManifest(
  input: LessonPreparationManifestInput,
): LessonPreparationManifestResult {
  const blockers = validateCanonicalBinding(input)
  if (blockers.length) return { resolution: 'BLOCKED', manifest: null, reasons: blockers }

  const context = input.lessonContext as LessonCopilotContext
  const projection = input.projection as HumanTaskLessonProjection
  const sectionId = input.preparation.lesson.sectionId as string
  const academicYearId = context.academicYearId as string
  const temporalAuthority = input.preparation.lesson.authority as 'IN_FORCE' | 'PROVISIONAL_DRAFT'
  const extensions = input.extensions ?? []
  const replanning = cloneReplanning(input.replanning ?? emptyLessonReplanningProjection())

  const lessonExtensions = extensions.filter((extension) => (
    extension.sectionId === sectionId
    && extension.blockId === context.lesson.blockId
    && extension.projectionId === context.lesson.projectionId
  ))

  const scopeBlockers = validateExtensionScope(lessonExtensions, context.workspaceId, academicYearId)
  if (scopeBlockers.length) return { resolution: 'BLOCKED', manifest: null, reasons: scopeBlockers }

  const acceptedExtensions = lessonExtensions.filter(
    (extension) => extension.status === 'ACCEPTED' && !isTeachingAdjustment(extension),
  )
  const proposedExtensions = lessonExtensions.filter(
    (extension) => extension.status === 'PROPOSED' && !isTeachingAdjustment(extension),
  )
  const composed = composeLessonSequence(projection.steps, lessonExtensions)
  const projectionResources = resolveHumanTaskResourcesForSurface(projection, 'PREPARE')

  const derivedRequiredRoles = projectionResources
    .map((resource) => roleForProjectionResource(resource.kind))
    .filter((role): role is LessonMaterialRole => Boolean(role))
  const requiredRoles = uniqueRoles([
    ...derivedRequiredRoles,
    ...(input.requiredMaterialRoles ?? []),
  ])

  const materialSlots = buildMaterialSlots({
    projectionId: projection.projectionId,
    projectionResources,
    acceptedExtensions,
    proposedExtensions,
    requiredRoles,
    materialContentResolutions: input.materialContentResolutions ?? {},
  })

  const missingInformation = uniqueStrings([
    ...input.preparation.missingInformation,
    ...context.missingInformation,
    ...composed.ignoredExtensionIds.map((id) => `Estensione accettata non applicabile alla sequenza corrente: ${id}`),
    ...materialSlots
      .filter((slot) => slot.required && slot.status === 'MISSING')
      .map((slot) => `Materiale necessario non disponibile: ${slot.role}`),
  ])

  const hasReview = temporalAuthority === 'PROVISIONAL_DRAFT'
    || proposedExtensions.length > 0
    || composed.ignoredExtensionIds.length > 0
    || materialSlots.some((slot) => slot.status === 'PROPOSED' || slot.status === 'NEEDS_REVIEW')
  const hasMissing = missingInformation.length > 0

  const readiness: LessonPreparationReadiness = hasMissing
    ? 'DRAFT'
    : hasReview
      ? 'REVIEW_REQUIRED'
      : 'READY'

  const provenance = mergeProvenance([
    ...input.preparation.provenance,
    ...projection.sources.map((source) => ({
      kind: `LESSON_${source.role}`,
      ref: source.code,
      label: source.label,
    })),
    ...lessonExtensions.flatMap((extension) => [
      {
        kind: 'LESSON_EXTENSION',
        ref: `lesson-extension:${extension.id}`,
        label: extension.title,
      },
      ...(extension.sourceRef
        ? [{ kind: 'LESSON_EXTENSION_SOURCE', ref: extension.sourceRef, label: extension.sourceLabel ?? extension.title }]
        : []),
    ]),
  ])

  const manifest: LessonPreparationManifest = {
    lessonRef: input.preparation.lesson.logicalId,
    workspaceId: context.workspaceId,
    academicYearId,
    sectionId,
    disciplineId: input.preparation.lesson.disciplineId,
    temporalAuthority,
    blockId: context.lesson.blockId,
    projectionId: context.lesson.projectionId,
    udaRef: projection.udaCode,
    packRef: projection.packCode,
    objective: context.lesson.objective,
    sequence: composed.steps,
    sequenceRefs: composed.steps.map((step) => step.id),
    materialSlots,
    supportingMaterials: input.preparation.knowledgeResources.map((resource) => ({ ...resource })),
    acceptedExtensionRefs: acceptedExtensions.map((extension) => extension.id),
    proposedExtensionRefs: proposedExtensions.map((extension) => extension.id),
    ignoredAcceptedExtensionRefs: [...composed.ignoredExtensionIds],
    replanning,
    readiness,
    missingInformation,
    provenance,
    renderingCapabilities: uniqueStrings(input.renderingCapabilities ?? []),
  }

  return {
    resolution: readiness === 'READY' ? 'SUPPORTED' : 'PARTIAL',
    manifest,
    reasons: missingInformation,
  }
}

export async function buildVerifiedLessonPreparationManifest(
  input: VerifiedLessonPreparationManifestInput,
): Promise<LessonPreparationManifestResult> {
  const unverified = buildLessonPreparationManifest(input)
  if (unverified.resolution === 'BLOCKED') return unverified

  const context = input.lessonContext as LessonCopilotContext
  const sectionId = input.preparation.lesson.sectionId as string
  const resolutions: Record<string, CanonicalMaterialContentResolutionV1> = {}
  const lessonExtensions = (input.extensions ?? []).filter((extension) => (
    extension.sectionId === sectionId
    && extension.blockId === context.lesson.blockId
    && extension.projectionId === context.lesson.projectionId
    && extension.status === 'ACCEPTED'
    && !isTeachingAdjustment(extension)
  ))

  for (const extension of lessonExtensions) {
    const state = classifyMaterialExtension(extension)
    if (state.classification !== 'MATERIAL_BINDING_V1') continue

    resolutions[extension.id] = await resolveCanonicalMaterialContentV1({
      workspaceId: context.workspaceId,
      ref: state.binding.materialRef,
      readPort: input.materialContentReadPort,
    })
  }

  return buildLessonPreparationManifest({
    ...input,
    materialContentResolutions: resolutions,
  })
}

function validateCanonicalBinding(input: {
  preparation: NextLessonPreparation
  lessonContext: LessonCopilotContext | null
  projection: HumanTaskLessonProjection | null
}) {
  const reasons: string[] = []
  const context = input.lessonContext
  const projection = input.projection
  const canonical = input.preparation.canonicalLesson

  if (!input.preparation.lesson.sectionId) reasons.push('LESSON_SECTION_UNRESOLVED')
  if (!context) reasons.push('LESSON_CONTEXT_UNRESOLVED')
  if (!canonical) reasons.push('CANONICAL_LESSON_UNRESOLVED')
  if (!projection) reasons.push('LESSON_PROJECTION_UNRESOLVED')
  if (!context?.academicYearId) reasons.push('ACADEMIC_YEAR_UNRESOLVED')
  if (!['IN_FORCE', 'PROVISIONAL_DRAFT'].includes(input.preparation.lesson.authority)) reasons.push('TEMPORAL_AUTHORITY_UNSUPPORTED')
  if (reasons.length || !context || !canonical || !projection || !input.preparation.lesson.sectionId) return reasons

  if (context.lesson.sectionId !== input.preparation.lesson.sectionId) reasons.push('SECTION_BINDING_MISMATCH')
  if (context.lesson.blockId !== canonical.blockId) reasons.push('BLOCK_BINDING_MISMATCH')
  if (context.lesson.sectionLabel !== canonical.sectionLabel) reasons.push('SECTION_LABEL_BINDING_MISMATCH')
  if (context.lesson.title !== canonical.title || context.lesson.objective !== canonical.objective) reasons.push('LESSON_CONTENT_BINDING_MISMATCH')
  if (projection.blockId !== context.lesson.blockId) reasons.push('PROJECTION_BLOCK_MISMATCH')
  if (projection.projectionId !== context.lesson.projectionId) reasons.push('PROJECTION_ID_MISMATCH')
  if (projection.title !== context.lesson.title || projection.objective !== context.lesson.objective) reasons.push('PROJECTION_CONTENT_MISMATCH')
  if (projection.udaTitle !== canonical.udaTitle) reasons.push('UDA_BINDING_MISMATCH')

  return uniqueStrings(reasons)
}

function validateExtensionScope(
  extensions: LessonDesignExtension[],
  workspaceId: string,
  academicYearId: string,
) {
  const reasons: string[] = []
  for (const extension of extensions) {
    if (extension.workspaceId !== workspaceId) reasons.push(`EXTENSION_WORKSPACE_MISMATCH:${extension.id}`)
    if (extension.academicYearId !== academicYearId) reasons.push(`EXTENSION_ACADEMIC_YEAR_MISMATCH:${extension.id}`)
  }

  const sourceBindings = new Set(
    extensions
      .filter((extension) => extension.status === 'ACCEPTED')
      .map((extension) => `${extension.canonicalPlanAssetId}:${extension.canonicalGenerationId}`),
  )
  if (sourceBindings.size > 1) reasons.push('EXTENSION_CANONICAL_GENERATION_MISMATCH')

  return uniqueStrings(reasons)
}

type MaterialExtensionClassification =
  | { classification: 'MATERIAL_BINDING_V1'; binding: LessonMaterialBindingV1 }
  | { classification: 'LEGACY_EXTENSION'; binding: null }
  | { classification: 'INVALID_MATERIAL_BINDING'; binding: null }

type SlotRoleItem = {
  ref: string
  title: string
  provenance: LessonPreparationProvenance
  material: LessonMaterialSlotMaterial
  reviewReason?: string
}

function classifyMaterialExtension(extension: LessonDesignExtension): MaterialExtensionClassification {
  try {
    return lessonMaterialBindingState(extension)
  } catch {
    return { classification: 'INVALID_MATERIAL_BINDING', binding: null }
  }
}

function buildMaterialSlots(input: {
  projectionId: string
  projectionResources: Array<{ id: string; kind: HumanTaskResourceKind; title: string }>
  acceptedExtensions: LessonDesignExtension[]
  proposedExtensions: LessonDesignExtension[]
  requiredRoles: LessonMaterialRole[]
  materialContentResolutions: LessonPreparationMaterialVerification
}) {
  const readyByRole = new Map<LessonMaterialRole, SlotRoleItem[]>()
  const proposedByRole = new Map<LessonMaterialRole, SlotRoleItem[]>()
  const reviewByRole = new Map<LessonMaterialRole, SlotRoleItem[]>()

  for (const resource of input.projectionResources) {
    const role = roleForProjectionResource(resource.kind)
    if (!role) continue
    const ref = `projection:${input.projectionId}:resource:${resource.id}`
    pushRoleItem(readyByRole, role, {
      ref,
      title: resource.title,
      provenance: {
        kind: 'CANONICAL_LESSON_RESOURCE',
        ref,
        label: resource.title,
      },
      material: {
        resourceRef: ref,
        title: resource.title,
        authority: 'CANONICAL_PROJECTION',
        binding: null,
      },
    })
  }

  for (const extension of input.acceptedExtensions) {
    const state = classifyMaterialExtension(extension)
    if (state.classification === 'MATERIAL_BINDING_V1') {
      const role = state.binding.role
      const ref = `lesson-extension:${extension.id}`
      const resolution = input.materialContentResolutions[extension.id]
      const item: SlotRoleItem = {
        ref,
        title: extension.title,
        provenance: {
          kind: resolution?.status === 'READY'
            ? 'CANONICAL_ACCEPTED_MATERIAL'
            : 'CANONICAL_ACCEPTED_MATERIAL_REVIEW_REQUIRED',
          ref,
          label: extension.title,
        },
        material: {
          resourceRef: ref,
          title: extension.title,
          authority: 'CANONICAL_ACCEPTED_BINDING',
          binding: state.binding,
        },
        reviewReason: materialVerificationReason(resolution),
      }

      if (resolution?.status === 'READY') pushRoleItem(readyByRole, role, item)
      else pushRoleItem(reviewByRole, role, item)
      continue
    }

    const role = roleForLegacyExtension(extension)
    if (!role) continue
    const ref = `lesson-extension:${extension.id}`
    pushRoleItem(reviewByRole, role, {
      ref,
      title: extension.title,
      provenance: {
        kind: state.classification === 'INVALID_MATERIAL_BINDING'
          ? 'INVALID_MATERIAL_BINDING'
          : 'HISTORICAL_LEGACY_LESSON_RESOURCE',
        ref,
        label: extension.title,
      },
      material: {
        resourceRef: ref,
        title: extension.title,
        authority: 'LEGACY_HISTORICAL',
        binding: null,
      },
      reviewReason: state.classification === 'INVALID_MATERIAL_BINDING'
        ? 'La binding tipizzata del materiale non è valida e richiede una nuova verifica.'
        : 'Risorsa legacy conservata come evidenza storica: il kind non costituisce autorità di accettazione corrente.',
    })
  }

  for (const extension of input.proposedExtensions) {
    const state = classifyMaterialExtension(extension)
    const typedRole = state.classification === 'MATERIAL_BINDING_V1' ? state.binding.role : null
    const role = typedRole ?? roleForLegacyExtension(extension)
    if (!role) continue
    const ref = `lesson-extension:${extension.id}`

    if (state.classification === 'INVALID_MATERIAL_BINDING') {
      pushRoleItem(reviewByRole, role, {
        ref,
        title: extension.title,
        provenance: { kind: 'INVALID_MATERIAL_BINDING', ref, label: extension.title },
        material: {
          resourceRef: ref,
          title: extension.title,
          authority: 'LEGACY_HISTORICAL',
          binding: null,
        },
        reviewReason: 'La binding tipizzata della proposta non è valida e richiede una nuova verifica.',
      })
      continue
    }

    pushRoleItem(proposedByRole, role, {
      ref,
      title: extension.title,
      provenance: {
        kind: state.classification === 'MATERIAL_BINDING_V1'
          ? 'CANONICAL_PROPOSED_MATERIAL'
          : 'HISTORICAL_LEGACY_LESSON_RESOURCE_PROPOSAL',
        ref,
        label: extension.title,
      },
      material: {
        resourceRef: ref,
        title: extension.title,
        authority: state.classification === 'MATERIAL_BINDING_V1'
          ? 'CANONICAL_PROPOSED_BINDING'
          : 'LEGACY_HISTORICAL',
        binding: state.binding,
      },
    })
  }

  const roles = uniqueRoles([
    ...input.requiredRoles,
    ...readyByRole.keys(),
    ...proposedByRole.keys(),
    ...reviewByRole.keys(),
  ])

  return roles.map((role): LessonMaterialSlot => {
    const ready = readyByRole.get(role) ?? []
    const proposed = proposedByRole.get(role) ?? []
    const review = reviewByRole.get(role) ?? []
    const all = [...review, ...ready, ...proposed]
    const required = input.requiredRoles.includes(role)

    if (review.length) {
      return {
        role,
        required,
        status: 'NEEDS_REVIEW',
        resourceRefs: uniqueStrings(all.map((item) => item.ref)),
        titles: uniqueStrings(all.map((item) => item.title)),
        materials: all.map((item) => item.material),
        reason: uniqueStrings(review.map((item) => item.reviewReason ?? 'Verifica del materiale richiesta.')).join(' '),
        provenance: mergeProvenance(all.map((item) => item.provenance)),
      }
    }

    if (ready.length) {
      return {
        role,
        required,
        status: 'READY',
        resourceRefs: uniqueStrings(all.map((item) => item.ref)),
        titles: uniqueStrings(all.map((item) => item.title)),
        materials: all.map((item) => item.material),
        reason: required ? 'Risorsa necessaria già disponibile nel contesto canonico della lezione.' : 'Risorsa opzionale già disponibile e verificata.',
        provenance: mergeProvenance(all.map((item) => item.provenance)),
      }
    }

    if (proposed.length) {
      return {
        role,
        required,
        status: 'PROPOSED',
        resourceRefs: proposed.map((item) => item.ref),
        titles: uniqueStrings(proposed.map((item) => item.title)),
        materials: proposed.map((item) => item.material),
        reason: 'Esiste una proposta pertinente, ma non è ancora stata accettata dal docente.',
        provenance: mergeProvenance(proposed.map((item) => item.provenance)),
      }
    }

    return {
      role,
      required,
      status: 'MISSING',
      resourceRefs: [],
      titles: [],
      materials: [],
      reason: 'Il ruolo è richiesto per questa lezione ma non risulta ancora coperto.',
      provenance: [],
    }
  })
}

function materialVerificationReason(
  resolution: CanonicalMaterialContentResolutionV1 | undefined,
) {
  if (!resolution) {
    return 'Verifica digest del materiale accettato non disponibile: READY è negato fino al read-back canonico.'
  }
  if (resolution.status === 'STALE') {
    return 'Digest canonico non coincidente: il materiale è stale e richiede una nuova verifica.'
  }
  if (resolution.status === 'MISSING') {
    return 'Verifica del contenuto canonico non disponibile: la generazione accettata non è più reperibile.'
  }
  if (resolution.status === 'INCOMPLETE') {
    return `Verifica del contenuto canonico incompleta (${resolution.reason}): READY è negato.`
  }
  if (resolution.status === 'UNSUPPORTED_REFERENCE') {
    return 'Verifica del riferimento canonico non supportata: READY è negato.'
  }
  return undefined
}

function roleForProjectionResource(kind: HumanTaskResourceKind): LessonMaterialRole | null {
  if (kind === 'STUDENT_SHEET' || kind === 'TASK_BRIEF') return 'STUDENT_HANDOUT'
  if (kind === 'EXIT_TICKET' || kind === 'RUBRIC' || kind === 'ASSESSMENT_GUIDE') return 'ASSESSMENT'
  return null
}

function roleForLegacyExtension(extension: LessonDesignExtension): LessonMaterialRole | null {
  if (extension.kind === 'TEACHER_RESOURCE') return 'TEACHER_BRIEF'
  if (extension.kind === 'STUDENT_RESOURCE') return 'STUDENT_HANDOUT'
  return null
}

function pushRoleItem<T>(map: Map<LessonMaterialRole, T[]>, role: LessonMaterialRole, item: T) {
  const items = map.get(role) ?? []
  items.push(item)
  map.set(role, items)
}

function cloneReplanning(replanning: LessonReplanningProjection): LessonReplanningProjection {
  return {
    resolution: replanning.resolution,
    reasons: [...replanning.reasons],
    decisions: replanning.decisions.map((decision) => ({
      ...decision,
      decisionHistory: decision.decisionHistory.map((item) => ({ ...item })),
    })),
  }
}

function mergeProvenance(items: LessonPreparationProvenance[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.kind}:${item.ref ?? ''}:${item.label ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function uniqueRoles(values: Iterable<LessonMaterialRole>) {
  return [...new Set(values)]
}
