import {
  acceptedLessonDesignResources,
  composeLessonSequence,
  isTeachingAdjustment,
  type ComposedLessonSequenceStep,
  type LessonDesignExtension,
} from '@/core/domain/lesson-design-extension'
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

export type LessonMaterialRole =
  | 'TEACHER_BRIEF'
  | 'LIM_VIEW'
  | 'STUDENT_HANDOUT'
  | 'MINI_DECK'
  | 'VISUAL_AID'
  | 'ASSESSMENT'

export type LessonMaterialSlotStatus = 'READY' | 'MISSING' | 'PROPOSED' | 'NEEDS_REVIEW'
export type LessonPreparationReadiness = 'DRAFT' | 'REVIEW_REQUIRED' | 'READY' | 'USED' | 'NEEDS_REVISION'
export type LessonPreparationResolution = 'SUPPORTED' | 'PARTIAL' | 'BLOCKED'

export type LessonPreparationProvenance = {
  kind: string
  ref?: string
  label?: string
}

export type LessonMaterialSlot = {
  role: LessonMaterialRole
  required: boolean
  status: LessonMaterialSlotStatus
  resourceRefs: string[]
  titles: string[]
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

export function buildLessonPreparationManifest(input: {
  preparation: NextLessonPreparation
  lessonContext: LessonCopilotContext | null
  projection: HumanTaskLessonProjection | null
  extensions?: LessonDesignExtension[]
  replanning?: LessonReplanningProjection
  requiredMaterialRoles?: LessonMaterialRole[]
  renderingCapabilities?: string[]
}): LessonPreparationManifestResult {
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
  const acceptedResources = acceptedLessonDesignResources(lessonExtensions)
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
    acceptedResources,
    proposedExtensions,
    requiredRoles,
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

function buildMaterialSlots(input: {
  projectionId: string
  projectionResources: Array<{ id: string; kind: HumanTaskResourceKind; title: string }>
  acceptedResources: LessonDesignExtension[]
  proposedExtensions: LessonDesignExtension[]
  requiredRoles: LessonMaterialRole[]
}) {
  const readyByRole = new Map<LessonMaterialRole, Array<{ ref: string; title: string; provenance: LessonPreparationProvenance }>>()
  const proposedByRole = new Map<LessonMaterialRole, Array<{ ref: string; title: string; provenance: LessonPreparationProvenance }>>()

  for (const resource of input.projectionResources) {
    const role = roleForProjectionResource(resource.kind)
    if (!role) continue
    pushRoleItem(readyByRole, role, {
      ref: `projection:${input.projectionId}:resource:${resource.id}`,
      title: resource.title,
      provenance: {
        kind: 'CANONICAL_LESSON_RESOURCE',
        ref: `projection:${input.projectionId}:resource:${resource.id}`,
        label: resource.title,
      },
    })
  }

  for (const extension of input.acceptedResources) {
    const role = roleForExtension(extension)
    if (!role) continue
    pushRoleItem(readyByRole, role, {
      ref: `lesson-extension:${extension.id}`,
      title: extension.title,
      provenance: {
        kind: 'ACCEPTED_LESSON_RESOURCE',
        ref: `lesson-extension:${extension.id}`,
        label: extension.title,
      },
    })
  }

  for (const extension of input.proposedExtensions) {
    const role = roleForExtension(extension)
    if (!role) continue
    pushRoleItem(proposedByRole, role, {
      ref: `lesson-extension:${extension.id}`,
      title: extension.title,
      provenance: {
        kind: 'PROPOSED_LESSON_RESOURCE',
        ref: `lesson-extension:${extension.id}`,
        label: extension.title,
      },
    })
  }

  const roles = uniqueRoles([
    ...input.requiredRoles,
    ...readyByRole.keys(),
    ...proposedByRole.keys(),
  ])

  return roles.map((role): LessonMaterialSlot => {
    const ready = readyByRole.get(role) ?? []
    const proposed = proposedByRole.get(role) ?? []
    const required = input.requiredRoles.includes(role)

    if (ready.length) {
      return {
        role,
        required,
        status: 'READY',
        resourceRefs: ready.map((item) => item.ref),
        titles: uniqueStrings(ready.map((item) => item.title)),
        reason: required ? 'Risorsa necessaria già disponibile nel contesto canonico della lezione.' : 'Risorsa opzionale già disponibile e accettata.',
        provenance: mergeProvenance(ready.map((item) => item.provenance)),
      }
    }

    if (proposed.length) {
      return {
        role,
        required,
        status: 'PROPOSED',
        resourceRefs: proposed.map((item) => item.ref),
        titles: uniqueStrings(proposed.map((item) => item.title)),
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
      reason: 'Il ruolo è richiesto per questa lezione ma non risulta ancora coperto.',
      provenance: [],
    }
  })
}

function roleForProjectionResource(kind: HumanTaskResourceKind): LessonMaterialRole | null {
  if (kind === 'STUDENT_SHEET' || kind === 'TASK_BRIEF') return 'STUDENT_HANDOUT'
  if (kind === 'EXIT_TICKET' || kind === 'RUBRIC' || kind === 'ASSESSMENT_GUIDE') return 'ASSESSMENT'
  return null
}

function roleForExtension(extension: LessonDesignExtension): LessonMaterialRole | null {
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
