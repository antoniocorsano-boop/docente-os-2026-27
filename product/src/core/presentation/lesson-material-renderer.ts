import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import {
  resolveHumanTaskResourcesForSurface,
  type HumanTaskLessonProjection,
} from './human-task-content'
import type {
  LessonPreparationManifest,
  LessonPreparationManifestResult,
  LessonPreparationProvenance,
  LessonPreparationReadiness,
} from './lesson-preparation-manifest'

export const INTERNAL_LESSON_RENDERING_CAPABILITIES = [
  'INTERNAL_TEACHER_BRIEF_V1',
  'INTERNAL_LIM_VIEW_V1',
  'INTERNAL_STUDENT_HANDOUT_PRINT_V1',
  'INTERNAL_VISUAL_AID_V1',
] as const

export type InternalLessonRenderingCapability = typeof INTERNAL_LESSON_RENDERING_CAPABILITIES[number]
export type LessonRenderStatus = 'READY' | 'PARTIAL' | 'BLOCKED'

export type LessonRenderSequenceItem = {
  id: string
  ordinal: number
  title: string
  instruction: string
  minutes: number | null
  cue: string | null
  origin: 'CANONICAL' | 'EXTENSION'
  sourceLabel: string | null
}

export type TeacherBriefRenderArtifact = {
  kind: 'TEACHER_BRIEF'
  target: 'TEACHER'
  title: string
  objective: string
  readiness: LessonPreparationReadiness
  preparation: string[]
  sequence: LessonRenderSequenceItem[]
  readyMaterials: string[]
  attention: string[]
}

export type LimScreen = {
  id: string
  kind: 'OPENING' | 'STEP' | 'CLOSING'
  title: string
  body: string[]
  cue: string | null
  minutes: number | null
}

export type LimViewRenderArtifact = {
  kind: 'LIM_VIEW'
  target: 'SCREEN'
  title: string
  screens: LimScreen[]
}

export type StudentHandoutRenderArtifact = {
  kind: 'STUDENT_HANDOUT'
  target: 'PRINT'
  ref: string
  title: string
  instruction: string
  prompts: string[]
  source: 'CANONICAL_RESOURCE' | 'ACCEPTED_EXTENSION'
}

export type VisualAidRenderArtifact = {
  kind: 'VISUAL_AID'
  target: 'SCREEN_AND_PRINT'
  title: string
  items: Array<{
    ordinal: number
    label: string
    minutes: number | null
  }>
}

export type LessonMaterialRenderBundle = {
  schemaVersion: 'lesson-render.v1'
  status: Exclude<LessonRenderStatus, 'BLOCKED'>
  lessonRef: string
  sectionId: string
  blockId: string
  projectionId: string
  readiness: LessonPreparationReadiness
  capabilities: InternalLessonRenderingCapability[]
  teacherBrief: TeacherBriefRenderArtifact
  limView: LimViewRenderArtifact
  studentHandouts: StudentHandoutRenderArtifact[]
  visualAid: VisualAidRenderArtifact
  missing: string[]
  provenance: LessonPreparationProvenance[]
  persistentEffect: 'NONE'
}

export type LessonMaterialRenderResult =
  | {
      status: 'BLOCKED'
      bundle: null
      reasons: string[]
    }
  | {
      status: 'READY' | 'PARTIAL'
      bundle: LessonMaterialRenderBundle
      reasons: string[]
    }

export function buildInternalLessonMaterialRenderBundle(input: {
  manifestResult: LessonPreparationManifestResult
  projection: HumanTaskLessonProjection | null
  extensions?: LessonDesignExtension[]
}): LessonMaterialRenderResult {
  if (input.manifestResult.resolution === 'BLOCKED' || !input.manifestResult.manifest) {
    return blocked(input.manifestResult.reasons.length
      ? input.manifestResult.reasons
      : ['Manifesto di preparazione non disponibile'])
  }

  const manifest = input.manifestResult.manifest
  const projection = input.projection
  const bindingProblems = validateProjectionBinding(manifest, projection)
  if (bindingProblems.length || !projection) return blocked(bindingProblems)

  const extensions = acceptedReferencedExtensions(manifest, input.extensions ?? [])
  const sequence = manifest.sequence.map((step, index): LessonRenderSequenceItem => ({
    id: step.id,
    ordinal: index + 1,
    title: step.title,
    instruction: step.instruction,
    minutes: step.minutes,
    cue: step.cue,
    origin: step.origin,
    sourceLabel: step.sourceLabel,
  }))

  const studentHandouts = renderStudentHandouts(manifest, projection, extensions)
  const missing = unique([
    ...manifest.missingInformation,
    ...manifest.materialSlots
      .filter((slot) => slot.required && slot.status === 'MISSING')
      .map((slot) => `Materiale richiesto non disponibile: ${slot.role}`),
  ])
  const attention = unique([
    ...missing,
    ...manifest.materialSlots
      .filter((slot) => slot.status === 'PROPOSED' || slot.status === 'NEEDS_REVIEW')
      .map((slot) => `Da rivedere prima dell'uso: ${slot.titles.join(', ') || slot.role}`),
  ])

  const status = renderStatus(manifest.readiness)
  const bundle: LessonMaterialRenderBundle = {
    schemaVersion: 'lesson-render.v1',
    status,
    lessonRef: manifest.lessonRef,
    sectionId: manifest.sectionId,
    blockId: manifest.blockId,
    projectionId: manifest.projectionId,
    readiness: manifest.readiness,
    capabilities: [...INTERNAL_LESSON_RENDERING_CAPABILITIES],
    teacherBrief: {
      kind: 'TEACHER_BRIEF',
      target: 'TEACHER',
      title: projection.title,
      objective: manifest.objective,
      readiness: manifest.readiness,
      preparation: [...projection.preparation],
      sequence,
      readyMaterials: readyMaterialTitles(manifest),
      attention,
    },
    limView: {
      kind: 'LIM_VIEW',
      target: 'SCREEN',
      title: projection.title,
      screens: renderLimScreens(manifest, projection.title, projection.continuation, sequence),
    },
    studentHandouts,
    visualAid: {
      kind: 'VISUAL_AID',
      target: 'SCREEN_AND_PRINT',
      title: `Percorso · ${projection.title}`,
      items: sequence.map((item) => ({
        ordinal: item.ordinal,
        label: item.title,
        minutes: item.minutes,
      })),
    },
    missing,
    provenance: manifest.provenance.map((item) => ({ ...item })),
    persistentEffect: 'NONE',
  }

  return {
    status,
    bundle,
    reasons: attention,
  }
}

function validateProjectionBinding(
  manifest: LessonPreparationManifest,
  projection: HumanTaskLessonProjection | null,
) {
  if (!projection) return ['Proiezione canonica non disponibile per la resa']

  const reasons: string[] = []
  if (projection.projectionId !== manifest.projectionId) reasons.push('RENDER_PROJECTION_ID_MISMATCH')
  if (projection.blockId !== manifest.blockId) reasons.push('RENDER_BLOCK_ID_MISMATCH')
  if (projection.objective !== manifest.objective) reasons.push('RENDER_OBJECTIVE_MISMATCH')
  return reasons
}

function acceptedReferencedExtensions(
  manifest: LessonPreparationManifest,
  extensions: LessonDesignExtension[],
) {
  const acceptedRefs = new Set(manifest.acceptedExtensionRefs)
  return extensions.filter((extension) => (
    extension.status === 'ACCEPTED'
    && acceptedRefs.has(extension.id)
    && extension.workspaceId === manifest.workspaceId
    && extension.academicYearId === manifest.academicYearId
    && extension.sectionId === manifest.sectionId
    && extension.blockId === manifest.blockId
    && extension.projectionId === manifest.projectionId
  ))
}

function renderStudentHandouts(
  manifest: LessonPreparationManifest,
  projection: HumanTaskLessonProjection,
  extensions: LessonDesignExtension[],
): StudentHandoutRenderArtifact[] {
  const studentSlot = manifest.materialSlots.find((slot) => slot.role === 'STUDENT_HANDOUT')
  if (!studentSlot || studentSlot.status !== 'READY') return []

  const canonical = resolveHumanTaskResourcesForSurface(projection, 'PREPARE')
    .filter((resource) => resource.kind === 'STUDENT_SHEET' || resource.kind === 'TASK_BRIEF')
    .map((resource): StudentHandoutRenderArtifact => ({
      kind: 'STUDENT_HANDOUT',
      target: 'PRINT',
      ref: `projection:${projection.projectionId}:resource:${resource.id}`,
      title: resource.title,
      instruction: resource.instruction,
      prompts: [...resource.prompts],
      source: 'CANONICAL_RESOURCE',
    }))

  const acceptedExtensions = extensions
    .filter((extension) => extension.kind === 'STUDENT_RESOURCE')
    .map((extension): StudentHandoutRenderArtifact => ({
      kind: 'STUDENT_HANDOUT',
      target: 'PRINT',
      ref: `lesson-extension:${extension.id}`,
      title: extension.title,
      instruction: extension.body,
      prompts: [],
      source: 'ACCEPTED_EXTENSION',
    }))

  const allowedRefs = new Set(studentSlot.resourceRefs)
  return [...canonical, ...acceptedExtensions].filter((artifact) => allowedRefs.has(artifact.ref))
}

function renderLimScreens(
  manifest: LessonPreparationManifest,
  title: string,
  continuation: string,
  sequence: LessonRenderSequenceItem[],
): LimScreen[] {
  const screens: LimScreen[] = [{
    id: 'opening',
    kind: 'OPENING',
    title,
    body: [manifest.objective],
    cue: null,
    minutes: null,
  }]

  for (const item of sequence) {
    screens.push({
      id: `step-${item.id}`,
      kind: 'STEP',
      title: `${item.ordinal}. ${item.title}`,
      body: [item.instruction],
      cue: item.cue,
      minutes: item.minutes,
    })
  }

  if (continuation.trim()) {
    screens.push({
      id: 'closing',
      kind: 'CLOSING',
      title: 'Passo successivo',
      body: [continuation],
      cue: null,
      minutes: null,
    })
  }

  return screens
}

function readyMaterialTitles(manifest: LessonPreparationManifest) {
  return unique(manifest.materialSlots
    .filter((slot) => slot.status === 'READY')
    .flatMap((slot) => slot.titles.length ? slot.titles : [slot.role]))
}

function renderStatus(readiness: LessonPreparationReadiness): 'READY' | 'PARTIAL' {
  return readiness === 'READY' || readiness === 'USED' ? 'READY' : 'PARTIAL'
}

function blocked(reasons: string[]): LessonMaterialRenderResult {
  return {
    status: 'BLOCKED',
    bundle: null,
    reasons: unique(reasons.length ? reasons : ['Resa interna non disponibile']),
  }
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
