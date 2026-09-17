import assert from 'node:assert/strict'
import test from 'node:test'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { buildLessonBrief } from './lesson-brief'

const projection: HumanTaskLessonProjection = {
  projectionId: 'brief-test',
  grade: 'Prima',
  blockId: 'B01',
  udaCode: '1-00',
  udaTitle: 'Entrare nel laboratorio della Tecnologia',
  packCode: 'PACK-1',
  period: 'Settembre',
  title: 'Che cos’è Tecnologia?',
  durationMinutes: 120,
  why: 'Avviare il percorso.',
  objective: 'Distinguere tecnica e tecnologia attraverso l’osservazione.',
  outcomes: ['Osservare', 'Distinguere'],
  preparation: ['Oggetti tecnici', 'Quaderno', 'Matita', 'LIM', 'Scheda alunno'],
  steps: [],
  resources: [
    {
      id: 'sheet',
      kind: 'STUDENT_SHEET',
      title: 'Scheda alunno',
      instruction: 'Guida operativa',
      prompts: [],
      surfaces: ['PREPARE'],
    },
    {
      id: 'exit',
      kind: 'EXIT_TICKET',
      title: 'Exit ticket',
      instruction: 'Chiusura',
      prompts: [],
    },
  ],
  evidence: 'Scheda',
  observation: [],
  assessmentNote: 'Formativa',
  continuation: 'Prossima lezione',
  sourceAlignment: { level: 'DIRECT' },
  sources: [],
}

function extension(overrides: Partial<LessonDesignExtension> = {}): LessonDesignExtension {
  return {
    id: 'ext-1',
    workspaceId: 'workspace',
    academicYearId: 'year',
    sectionId: 'section',
    canonicalPlanAssetId: 'plan',
    canonicalGenerationId: 'generation',
    blockId: 'B01',
    projectionId: 'brief-test',
    kind: 'HOOK_QUESTION',
    status: 'ACCEPTED',
    insertionPosition: 'START',
    anchorStepId: null,
    title: 'Domanda di attivazione',
    body: 'Che cosa rende tecnico un oggetto?',
    cue: null,
    minutes: 5,
    sourceKind: 'TEACHER',
    sourceRef: null,
    sourceLabel: null,
    payload: {},
    revision: 1,
    decisionHistory: [{ action: 'ACCEPTED', actorId: 'teacher', at: '2026-09-14T18:00:00Z', revision: 1 }],
    modifiedBy: null,
    modifiedAt: null,
    acceptedBy: 'teacher',
    acceptedAt: '2026-09-14T18:00:00Z',
    dismissedBy: null,
    dismissedAt: null,
    createdBy: 'teacher',
    createdAt: '2026-09-14T18:00:00Z',
    updatedAt: '2026-09-14T18:00:00Z',
    ...overrides,
  }
}

test('Lesson Brief exposes only a compact preparation preview', () => {
  const result = buildLessonBrief({ projection, extensions: [] })

  assert.deepEqual(result.preparationPreview, ['Oggetti tecnici', 'Quaderno', 'Matita'])
  assert.equal(result.remainingPreparationCount, 2)
  assert.deepEqual(result.readyTitles, ['Scheda alunno'])
  assert.equal(result.readyCount, 1)
  assert.equal(result.statusLabel, 'READY_BASE')
})

test('accepted lesson extensions are summarized as already available', () => {
  const result = buildLessonBrief({ projection, extensions: [extension()] })

  assert.deepEqual(result.readyTitles, ['Scheda alunno', 'Domanda di attivazione'])
  assert.equal(result.readyCount, 2)
  assert.equal(result.acceptedExtensionCount, 1)
  assert.equal(result.statusLabel, 'ENRICHED')
})

test('only accepted decisions enter the next preparation', () => {
  const result = buildLessonBrief({
    projection,
    extensions: [
      extension({ id: 'proposed', status: 'PROPOSED', acceptedBy: null, acceptedAt: null, decisionHistory: [] }),
      extension({
        id: 'modified',
        status: 'MODIFIED',
        revision: 2,
        title: 'Modificata da riconfermare',
        modifiedBy: 'teacher',
        modifiedAt: '2026-09-14T18:05:00Z',
        acceptedBy: null,
        acceptedAt: null,
        decisionHistory: [{ action: 'MODIFIED', actorId: 'teacher', at: '2026-09-14T18:05:00Z', revision: 2 }],
      }),
      extension({
        id: 'dismissed',
        status: 'DISMISSED',
        title: 'Scartata',
        dismissedBy: 'teacher',
        dismissedAt: '2026-09-14T18:10:00Z',
        decisionHistory: [{ action: 'DISMISSED', actorId: 'teacher', at: '2026-09-14T18:10:00Z', revision: 1 }],
      }),
      extension({ id: 'accepted', title: 'Accettata' }),
    ],
  })

  assert.deepEqual(result.readyTitles, ['Scheda alunno', 'Accettata'])
  assert.equal(result.acceptedExtensionCount, 1)
  assert.equal(result.statusLabel, 'ENRICHED')
})
