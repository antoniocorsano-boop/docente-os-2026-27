import {
  BASELINE_TEACHING_EVIDENCE_DIMENSIONS,
  type ObservationState,
  type TeachingEvidenceDimensionKey,
  type TeachingObservationDraft,
} from '@/core/domain/teaching-evidence'

export type LessonObservationState = Exclude<ObservationState, 'NOT_OBSERVED'>

export type LessonObservationDraftTransport = {
  dimensionKey: TeachingEvidenceDimensionKey
  state: LessonObservationState
  note: string | null
}

export const LESSON_OBSERVATION_DIMENSION_OPTIONS: ReadonlyArray<{
  value: TeachingEvidenceDimensionKey
  label: string
}> = [
  { value: 'UNDERSTANDING_INSTRUCTION', label: 'Comprensione della consegna' },
  { value: 'AUTONOMY', label: 'Autonomia' },
  { value: 'WORK_METHOD', label: 'Metodo di lavoro' },
  { value: 'TECHNICAL_LANGUAGE', label: 'Linguaggio tecnico' },
  { value: 'DISCIPLINARY_APPLICATION', label: 'Applicazione disciplinare' },
  { value: 'EVIDENCE_QUALITY', label: 'Qualità dell’evidenza' },
  { value: 'TIME_MANAGEMENT', label: 'Gestione del tempo' },
]

export const LESSON_OBSERVATION_STATE_OPTIONS: ReadonlyArray<{
  value: LessonObservationState
  label: string
}> = [
  { value: 'NEEDS_SUPPORT', label: 'Da riprendere' },
  { value: 'DEVELOPING', label: 'In sviluppo' },
  { value: 'CONSOLIDATED', label: 'Consolidato' },
]

const RECORDABLE_STATES = new Set<LessonObservationState>(
  LESSON_OBSERVATION_STATE_OPTIONS.map((item) => item.value),
)

export function normalizeLessonObservationDraft(input: {
  dimensionKey?: unknown
  state?: unknown
  note?: unknown
}): LessonObservationDraftTransport | null {
  const rawDimension = text(input.dimensionKey)
  const rawState = text(input.state)
  const rawNote = text(input.note)
  const touched = Boolean(rawDimension || rawState || rawNote)
  if (!touched) return null

  if (!BASELINE_TEACHING_EVIDENCE_DIMENSIONS.includes(rawDimension as TeachingEvidenceDimensionKey)) {
    throw new Error('Observation dimension invalid')
  }
  if (!RECORDABLE_STATES.has(rawState as LessonObservationState)) {
    throw new Error('Observation state invalid')
  }
  if (rawNote.length > 1000) throw new Error('Observation note exceeds 1000 characters')

  return {
    dimensionKey: rawDimension as TeachingEvidenceDimensionKey,
    state: rawState as LessonObservationState,
    note: rawNote || null,
  }
}

export function parseStoredLessonObservationDraft(raw: string | null): LessonObservationDraftTransport | null {
  if (!raw) return null
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Stored lesson observation draft invalid')
  }
  const record = parsed as Record<string, unknown>
  return normalizeLessonObservationDraft({
    dimensionKey: record.dimensionKey,
    state: record.state,
    note: record.note,
  })
}

export function serializeLessonObservationDraft(draft: LessonObservationDraftTransport) {
  return JSON.stringify(draft)
}

export function toTeachingObservationDraft(
  draft: LessonObservationDraftTransport,
  blockId: string,
): TeachingObservationDraft {
  const canonicalBlockId = blockId.trim().toUpperCase()
  if (!canonicalBlockId) throw new Error('blockId required')

  return {
    draftKey: `class:${canonicalBlockId}:${draft.dimensionKey}`,
    scope: 'CLASS',
    anonymousGroupKey: null,
    dimensionKey: draft.dimensionKey,
    state: draft.state,
    note: draft.note,
    source: draft.note ? 'TEACHER_NOTE' : 'TEACHER_QUICK_MARK',
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
