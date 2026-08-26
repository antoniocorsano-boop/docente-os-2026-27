import assert from 'node:assert/strict'
import test from 'node:test'
import {
  acceptedLessonDesignResources,
  composeLessonSequence,
  validateLessonDesignExtensionDraft,
  type LessonDesignExtension,
} from './lesson-design-extension'

const BASE = [
  { id: 'S01', minutes: 10, title: 'Avvio', instruction: 'Apri il tema.' },
  { id: 'S02', minutes: 20, title: 'Attività', instruction: 'Lavora sul compito.' },
]

function extension(overrides: Partial<LessonDesignExtension> = {}): LessonDesignExtension {
  return {
    id: 'ext-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-1',
    canonicalPlanAssetId: 'asset-1',
    canonicalGenerationId: 'generation-1',
    blockId: 'B01',
    projectionId: 'projection-1',
    kind: 'HOOK_QUOTE',
    status: 'ACCEPTED',
    insertionPosition: 'START',
    anchorStepId: null,
    title: 'Una frase per entrare nel tema',
    body: 'Stimolo breve collegato alla lezione.',
    cue: 'Chiedi agli alunni che cosa suggerisce la frase.',
    minutes: 3,
    sourceKind: 'EDITORIAL_KNOWLEDGE',
    sourceRef: 'knowledge:unit-1',
    sourceLabel: 'Guida docente',
    payload: {},
    acceptedBy: 'teacher-1',
    acceptedAt: '2026-08-26T18:00:00Z',
    createdBy: 'teacher-1',
    createdAt: '2026-08-26T17:00:00Z',
    updatedAt: '2026-08-26T18:00:00Z',
    ...overrides,
  }
}

test('only accepted sequence extensions enter the teaching sequence', () => {
  const result = composeLessonSequence(BASE, [
    extension(),
    extension({ id: 'proposal-only', status: 'PROPOSED', title: 'Non ancora accettata' }),
    extension({ id: 'resource', kind: 'TEACHER_RESOURCE', title: 'Guida docente' }),
  ])

  assert.equal(result.steps.length, 3)
  assert.equal(result.steps[0].origin, 'EXTENSION')
  assert.equal(result.steps[0].title, 'Una frase per entrare nel tema')
  assert.deepEqual(result.steps.slice(1).map((step) => step.id), ['S01', 'S02'])
})

test('accepted resource extensions remain attached resources rather than fake lesson steps', () => {
  const resources = acceptedLessonDesignResources([
    extension({ id: 'teacher-resource', kind: 'TEACHER_RESOURCE', title: 'Guida docente' }),
    extension({ id: 'student-resource', kind: 'STUDENT_RESOURCE', title: 'Scheda alunni', createdAt: '2026-08-26T17:01:00Z' }),
    extension({ id: 'hook', kind: 'HOOK_EVENT' }),
    extension({ id: 'proposal', kind: 'STUDENT_RESOURCE', status: 'PROPOSED' }),
  ])

  assert.deepEqual(resources.map((item) => item.id), ['teacher-resource', 'student-resource'])
})

test('accepted extensions can be inserted around a canonical step without changing it', () => {
  const result = composeLessonSequence(BASE, [
    extension({ id: 'before', insertionPosition: 'BEFORE_STEP', anchorStepId: 'S02', kind: 'HOOK_EVENT' }),
    extension({ id: 'after', insertionPosition: 'AFTER_STEP', anchorStepId: 'S02', kind: 'FORMATIVE_CHECK', createdAt: '2026-08-26T17:01:00Z' }),
  ])

  assert.deepEqual(result.steps.map((step) => step.id), ['S01', 'EXT-before', 'S02', 'EXT-after'])
  assert.equal(result.steps.find((step) => step.id === 'S02')?.origin, 'CANONICAL')
})

test('stale anchored extensions fail closed instead of being moved silently', () => {
  const result = composeLessonSequence(BASE, [
    extension({ id: 'stale', insertionPosition: 'BEFORE_STEP', anchorStepId: 'S99' }),
  ])

  assert.deepEqual(result.steps.map((step) => step.id), ['S01', 'S02'])
  assert.deepEqual(result.ignoredExtensionIds, ['stale'])
})

test('proposal validation requires an explicit anchor only for anchored insertions', () => {
  assert.throws(() => validateLessonDesignExtensionDraft({
    sectionId: 'section-1',
    canonicalPlanAssetId: 'asset-1',
    canonicalGenerationId: 'generation-1',
    blockId: 'B01',
    projectionId: 'projection-1',
    kind: 'HOOK_VIDEO',
    insertionPosition: 'BEFORE_STEP',
    anchorStepId: null,
    title: 'Micro-video',
    body: 'Avvio',
    cue: null,
    minutes: 1,
    sourceKind: 'AI_TOOL',
    sourceRef: null,
    sourceLabel: null,
    payload: {},
  }), /requires a step id/)
})
