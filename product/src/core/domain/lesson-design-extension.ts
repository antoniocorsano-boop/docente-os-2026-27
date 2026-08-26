export type LessonDesignExtensionKind =
  | 'HOOK_QUOTE'
  | 'HOOK_EVENT'
  | 'HOOK_VIDEO'
  | 'HOOK_QUESTION'
  | 'TEACHER_RESOURCE'
  | 'STUDENT_RESOURCE'
  | 'FORMATIVE_CHECK'

export type LessonDesignExtensionStatus = 'PROPOSED' | 'ACCEPTED'
export type LessonDesignExtensionSourceKind = 'EDITORIAL_KNOWLEDGE' | 'KNOWLEDGE' | 'WEB' | 'AI_TOOL' | 'TEACHER'
export type LessonDesignInsertionPosition = 'START' | 'BEFORE_STEP' | 'AFTER_STEP' | 'END'

export type LessonDesignExtension = {
  id: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  projectionId: string
  kind: LessonDesignExtensionKind
  status: LessonDesignExtensionStatus
  insertionPosition: LessonDesignInsertionPosition
  anchorStepId: string | null
  title: string
  body: string
  cue: string | null
  minutes: number | null
  sourceKind: LessonDesignExtensionSourceKind
  sourceRef: string | null
  sourceLabel: string | null
  payload: Record<string, unknown>
  acceptedBy: string | null
  acceptedAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type LessonDesignExtensionDraft = Pick<
  LessonDesignExtension,
  | 'sectionId'
  | 'canonicalPlanAssetId'
  | 'canonicalGenerationId'
  | 'blockId'
  | 'projectionId'
  | 'kind'
  | 'insertionPosition'
  | 'anchorStepId'
  | 'title'
  | 'body'
  | 'cue'
  | 'minutes'
  | 'sourceKind'
  | 'sourceRef'
  | 'sourceLabel'
  | 'payload'
>

export type LessonSequenceBaseStep = {
  id: string
  minutes: number | null
  title: string
  instruction: string
  cue?: string
}

export type ComposedLessonSequenceStep = {
  id: string
  origin: 'CANONICAL' | 'EXTENSION'
  extensionId: string | null
  kind: LessonDesignExtensionKind | null
  minutes: number | null
  title: string
  instruction: string
  cue: string | null
  sourceKind: LessonDesignExtensionSourceKind | null
  sourceLabel: string | null
  sourceRef: string | null
}

export type ComposedLessonSequence = {
  steps: ComposedLessonSequenceStep[]
  ignoredExtensionIds: string[]
}

const SEQUENCE_KINDS = new Set<LessonDesignExtensionKind>([
  'HOOK_QUOTE',
  'HOOK_EVENT',
  'HOOK_VIDEO',
  'HOOK_QUESTION',
  'FORMATIVE_CHECK',
])

export function isLessonSequenceExtension(extension: Pick<LessonDesignExtension, 'kind'>) {
  return SEQUENCE_KINDS.has(extension.kind)
}

export function acceptedLessonDesignResources(extensions: LessonDesignExtension[]) {
  return extensions
    .filter((extension) => extension.status === 'ACCEPTED' && !isLessonSequenceExtension(extension))
    .sort(compareExtensions)
}

export function validateLessonDesignExtensionDraft(draft: LessonDesignExtensionDraft) {
  if (!/^B(0[1-9]|[12][0-9]|3[0-3])$/.test(draft.blockId)) throw new Error('Invalid canonical block id')
  if (!draft.projectionId.trim()) throw new Error('Projection id is required')
  if (!draft.title.trim()) throw new Error('Extension title is required')
  if (!draft.body.trim()) throw new Error('Extension body is required')
  if (draft.title.length > 240) throw new Error('Extension title exceeds 240 characters')
  if (draft.body.length > 5000) throw new Error('Extension body exceeds 5000 characters')
  if (draft.cue && draft.cue.length > 1000) throw new Error('Extension cue exceeds 1000 characters')
  if (draft.minutes !== null && (!Number.isInteger(draft.minutes) || draft.minutes <= 0 || draft.minutes > 120)) {
    throw new Error('Extension minutes must be between 1 and 120')
  }

  const anchored = draft.insertionPosition === 'BEFORE_STEP' || draft.insertionPosition === 'AFTER_STEP'
  if (anchored && !draft.anchorStepId) throw new Error('Anchored extension requires a step id')
  if (!anchored && draft.anchorStepId) throw new Error('START/END extension cannot carry an anchor step id')

  return {
    ...draft,
    title: collapse(draft.title),
    body: draft.body.trim(),
    cue: nullable(draft.cue),
    sourceRef: nullable(draft.sourceRef),
    sourceLabel: nullable(draft.sourceLabel),
  }
}

export function composeLessonSequence(
  baseSteps: LessonSequenceBaseStep[],
  extensions: LessonDesignExtension[],
): ComposedLessonSequence {
  const accepted = extensions
    .filter((extension) => extension.status === 'ACCEPTED' && isLessonSequenceExtension(extension))
    .sort(compareExtensions)
  const baseIds = new Set(baseSteps.map((step) => step.id))
  const ignoredExtensionIds: string[] = []

  const start = accepted.filter((extension) => extension.insertionPosition === 'START')
  const end = accepted.filter((extension) => extension.insertionPosition === 'END')
  const before = groupAnchored(accepted, 'BEFORE_STEP', baseIds, ignoredExtensionIds)
  const after = groupAnchored(accepted, 'AFTER_STEP', baseIds, ignoredExtensionIds)

  const steps: ComposedLessonSequenceStep[] = start.map(toExtensionStep)
  for (const step of baseSteps) {
    steps.push(...(before.get(step.id) ?? []).map(toExtensionStep))
    steps.push({
      id: step.id,
      origin: 'CANONICAL',
      extensionId: null,
      kind: null,
      minutes: step.minutes,
      title: step.title,
      instruction: step.instruction,
      cue: step.cue ?? null,
      sourceKind: null,
      sourceLabel: null,
      sourceRef: null,
    })
    steps.push(...(after.get(step.id) ?? []).map(toExtensionStep))
  }
  steps.push(...end.map(toExtensionStep))

  return { steps, ignoredExtensionIds }
}

function groupAnchored(
  extensions: LessonDesignExtension[],
  position: 'BEFORE_STEP' | 'AFTER_STEP',
  baseIds: Set<string>,
  ignored: string[],
) {
  const grouped = new Map<string, LessonDesignExtension[]>()
  for (const extension of extensions.filter((item) => item.insertionPosition === position)) {
    if (!extension.anchorStepId || !baseIds.has(extension.anchorStepId)) {
      ignored.push(extension.id)
      continue
    }
    const items = grouped.get(extension.anchorStepId) ?? []
    items.push(extension)
    grouped.set(extension.anchorStepId, items)
  }
  return grouped
}

function toExtensionStep(extension: LessonDesignExtension): ComposedLessonSequenceStep {
  return {
    id: `EXT-${extension.id}`,
    origin: 'EXTENSION',
    extensionId: extension.id,
    kind: extension.kind,
    minutes: extension.minutes,
    title: extension.title,
    instruction: extension.body,
    cue: extension.cue,
    sourceKind: extension.sourceKind,
    sourceLabel: extension.sourceLabel,
    sourceRef: extension.sourceRef,
  }
}

function compareExtensions(a: LessonDesignExtension, b: LessonDesignExtension) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
}

function nullable(value: string | null) {
  const normalized = value?.trim() ?? ''
  return normalized || null
}

function collapse(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
