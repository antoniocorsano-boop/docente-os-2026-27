import assert from 'node:assert/strict'
import test from 'node:test'
import type { LessonDesignExtension } from './lesson-design-extension'
import {
  lessonDesignFingerprint,
  resolveLessonPreparationState,
  type LessonPreparationReceipt,
} from './lesson-preparation'

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
    kind: 'HOOK_QUESTION',
    status: 'ACCEPTED',
    insertionPosition: 'START',
    anchorStepId: null,
    title: 'Domanda iniziale',
    body: 'Che cosa osservate?',
    cue: null,
    minutes: 5,
    sourceKind: 'TEACHER',
    sourceRef: null,
    sourceLabel: null,
    payload: {},
    acceptedBy: 'user-1',
    acceptedAt: '2026-09-09T07:00:00Z',
    createdBy: 'user-1',
    createdAt: '2026-09-09T06:50:00Z',
    updatedAt: '2026-09-09T07:00:00Z',
    ...overrides,
  }
}

function receipt(extensions: LessonDesignExtension[]): LessonPreparationReceipt {
  return {
    id: 'receipt-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-1',
    canonicalPlanAssetId: 'asset-1',
    canonicalGenerationId: 'generation-1',
    blockId: 'B01',
    projectionId: 'projection-1',
    checklistSnapshot: ['Scheda A', 'Matite'],
    designFingerprint: lessonDesignFingerprint(extensions),
    confirmedBy: 'user-1',
    confirmedAt: '2026-09-09T07:10:00Z',
    updatedAt: '2026-09-09T07:10:00Z',
  }
}

test('pending assistant proposal always requires teacher confirmation', () => {
  const extensions = [extension({ status: 'PROPOSED', acceptedBy: null, acceptedAt: null })]
  const state = resolveLessonPreparationState({
    projectionId: 'projection-1',
    preparation: ['Scheda A', 'Matite'],
    extensions,
    receipt: null,
  })
  assert.equal(state.status, 'NEEDS_CONFIRMATION')
  assert.equal(state.label, 'Da confermare')
})

test('canonical preparation without a teacher receipt is not called ready', () => {
  const state = resolveLessonPreparationState({
    projectionId: 'projection-1',
    preparation: ['Scheda A', 'Matite'],
    extensions: [],
    receipt: null,
  })
  assert.equal(state.status, 'NEEDS_CHECK')
  assert.equal(state.label, 'Da controllare')
})

test('matching receipt on current lesson state is ready', () => {
  const extensions = [extension()]
  const state = resolveLessonPreparationState({
    projectionId: 'projection-1',
    preparation: ['Scheda A', 'Matite'],
    extensions,
    receipt: receipt(extensions),
  })
  assert.equal(state.status, 'READY')
  assert.equal(state.label, 'Pronta')
})

test('accepted design change invalidates a previous preparation receipt', () => {
  const initial = [extension()]
  const changed = [extension({ updatedAt: '2026-09-09T07:20:00Z' })]
  const state = resolveLessonPreparationState({
    projectionId: 'projection-1',
    preparation: ['Scheda A', 'Matite'],
    extensions: changed,
    receipt: receipt(initial),
  })
  assert.equal(state.status, 'NEEDS_CHECK')
})

test('changed canonical checklist invalidates a previous preparation receipt', () => {
  const extensions = [extension()]
  const state = resolveLessonPreparationState({
    projectionId: 'projection-1',
    preparation: ['Scheda A', 'Matite', 'Righello'],
    extensions,
    receipt: receipt(extensions),
  })
  assert.equal(state.status, 'NEEDS_CHECK')
})
