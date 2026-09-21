import assert from 'node:assert/strict'
import test from 'node:test'
import {
  acceptedLessonDesignResources,
  acceptedTeachingAdjustments,
  composeLessonSequence,
  summarizeAcceptedLessonDesignExtensions,
  validateLessonDesignExtensionDraft,
  validateLessonDesignExtensionRevision,
  type LessonDesignExtension,
} from './lesson-design-extension'

const BASE = [
  { id: 'S01', minutes: 10, title: 'Avvio', instruction: 'Apri il tema.' },
  { id: 'S02', minutes: 20, title: 'Attività', instruction: 'Lavora sul compito.' },
]

function extension(overrides: Partial<LessonDesignExtension> = {}): LessonDesignExtension {
  return {
    id: 'ext-1', workspaceId: 'workspace-1', academicYearId: 'year-1', sectionId: 'section-1',
    canonicalPlanAssetId: 'asset-1', canonicalGenerationId: 'generation-1', blockId: 'B01', projectionId: 'projection-1',
    kind: 'HOOK_QUOTE', status: 'ACCEPTED', insertionPosition: 'START', anchorStepId: null,
    title: 'Una frase per entrare nel tema', body: 'Stimolo breve collegato alla lezione.',
    cue: 'Chiedi agli alunni che cosa suggerisce la frase.', minutes: 3,
    sourceKind: 'EDITORIAL_KNOWLEDGE', sourceRef: 'knowledge:unit-1', sourceLabel: 'Guida docente', payload: {}, revision: 1,
    decisionHistory: [{ action: 'ACCEPTED', actorId: 'teacher-1', at: '2026-08-26T18:00:00Z', revision: 1 }],
    modifiedBy: null, modifiedAt: null, acceptedBy: 'teacher-1', acceptedAt: '2026-08-26T18:00:00Z',
    dismissedBy: null, dismissedAt: null, createdBy: 'teacher-1', createdAt: '2026-08-26T17:00:00Z', updatedAt: '2026-08-26T18:00:00Z',
    ...overrides,
  }
}

test('only accepted sequence extensions enter the teaching sequence', () => {
  const result = composeLessonSequence(BASE, [
    extension(), extension({ id: 'proposal-only', status: 'PROPOSED' }), extension({ id: 'modified-only', status: 'MODIFIED' }),
    extension({ id: 'dismissed', status: 'DISMISSED' }), extension({ id: 'resource', kind: 'TEACHER_RESOURCE' }),
    extension({ id: 'adjustment', kind: 'TEACHING_ADJUSTMENT', sourceKind: 'TEACHER', sourceRef: 'session-1' }),
  ])
  assert.deepEqual(result.steps.map((step) => step.id), ['EXT-ext-1', 'S01', 'S02'])
})

test('resources exclude teaching adjustments even after acceptance', () => {
  const resources = acceptedLessonDesignResources([
    extension({ id: 'teacher-resource', kind: 'TEACHER_RESOURCE' }),
    extension({ id: 'student-resource', kind: 'STUDENT_RESOURCE', createdAt: '2026-08-26T17:01:00Z' }),
    extension({ id: 'adjustment', kind: 'TEACHING_ADJUSTMENT', sourceKind: 'TEACHER', sourceRef: 'session-1' }),
  ])
  assert.deepEqual(resources.map((item) => item.id), ['teacher-resource', 'student-resource'])
})

test('accepted extension summary distinguishes sequence, resources and teaching adjustments', () => {
  const summary = summarizeAcceptedLessonDesignExtensions([
    extension({ id: 'question', kind: 'HOOK_QUESTION' }),
    extension({ id: 'teacher-resource', kind: 'TEACHER_RESOURCE', createdAt: '2026-08-26T17:01:00Z' }),
    extension({ id: 'student-resource', kind: 'STUDENT_RESOURCE', createdAt: '2026-08-26T17:02:00Z' }),
    extension({ id: 'adjustment', kind: 'TEACHING_ADJUSTMENT', sourceKind: 'TEACHER', sourceRef: 'session-1', createdAt: '2026-08-26T17:03:00Z' }),
    extension({ id: 'proposal', kind: 'HOOK_EVENT', status: 'PROPOSED' }),
  ])
  assert.deepEqual(summary, { total: 4, sequence: 1, resources: 2, adjustments: 1 })
})

test('teaching adjustments have their own accepted consumer boundary', () => {
  const adjustments = acceptedTeachingAdjustments([
    extension({ id: 'accepted', kind: 'TEACHING_ADJUSTMENT', sourceKind: 'TEACHER', sourceRef: 'session-1' }),
    extension({ id: 'proposal', kind: 'TEACHING_ADJUSTMENT', status: 'PROPOSED', sourceKind: 'TEACHER', sourceRef: 'session-1' }),
    extension({ id: 'resource', kind: 'TEACHER_RESOURCE' }),
  ])
  assert.deepEqual(adjustments.map((item) => item.id), ['accepted'])
})

test('teaching adjustment provenance must point to a teacher session', () => {
  const draft = {
    sectionId: 'section-1', canonicalPlanAssetId: 'asset-1', canonicalGenerationId: 'generation-1', blockId: 'B01',
    projectionId: 'projection-1', kind: 'TEACHING_ADJUSTMENT' as const, insertionPosition: 'END' as const, anchorStepId: null,
    title: 'Riprendere il concetto', body: 'Usare un esempio concreto nella prossima lezione.', cue: null, minutes: null,
    sourceKind: 'TEACHER' as const, sourceRef: 'session-42', sourceLabel: 'Riflessione post-lezione', payload: {},
  }
  assert.equal(validateLessonDesignExtensionDraft(draft).sourceRef, 'session-42')
  assert.throws(() => validateLessonDesignExtensionDraft({ ...draft, sourceKind: 'AI_TOOL' }), /source must be TEACHER/)
  assert.throws(() => validateLessonDesignExtensionDraft({ ...draft, sourceRef: null }), /requires a teaching session source ref/)
})

test('accepted extensions can be inserted around a canonical step without changing it', () => {
  const result = composeLessonSequence(BASE, [
    extension({ id: 'before', insertionPosition: 'BEFORE_STEP', anchorStepId: 'S02', kind: 'HOOK_EVENT' }),
    extension({ id: 'after', insertionPosition: 'AFTER_STEP', anchorStepId: 'S02', kind: 'FORMATIVE_CHECK', createdAt: '2026-08-26T17:01:00Z' }),
  ])
  assert.deepEqual(result.steps.map((step) => step.id), ['S01', 'EXT-before', 'S02', 'EXT-after'])
})

test('stale anchored extensions fail closed instead of being moved silently', () => {
  const result = composeLessonSequence(BASE, [extension({ id: 'stale', insertionPosition: 'BEFORE_STEP', anchorStepId: 'S99' })])
  assert.deepEqual(result.steps.map((step) => step.id), ['S01', 'S02'])
  assert.deepEqual(result.ignoredExtensionIds, ['stale'])
})

test('proposal validation requires an explicit anchor only for anchored insertions', () => {
  assert.throws(() => validateLessonDesignExtensionDraft({
    sectionId: 'section-1', canonicalPlanAssetId: 'asset-1', canonicalGenerationId: 'generation-1', blockId: 'B01', projectionId: 'projection-1',
    kind: 'HOOK_VIDEO', insertionPosition: 'BEFORE_STEP', anchorStepId: null, title: 'Micro-video', body: 'Avvio', cue: null, minutes: 1,
    sourceKind: 'AI_TOOL', sourceRef: null, sourceLabel: null, payload: {},
  }), /requires a step id/)
})

test('revision validation normalizes editable content without touching provenance', () => {
  const revision = validateLessonDesignExtensionRevision({ insertionPosition: 'END', anchorStepId: null, title: '  Chiusura   rapida  ', body: '  Domanda finale.  ', cue: '  Un minuto  ', minutes: 2 })
  assert.equal(revision.title, 'Chiusura rapida')
  assert.equal(revision.body, 'Domanda finale.')
  assert.equal(revision.cue, 'Un minuto')
})
