import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildContextualCapture,
  buildContextualCaptureNextActivity,
  contextualCaptureContainsRawAudio,
  type ContextualCaptureTarget,
} from './contextual-capture'
import type { LessonCopilotContext } from './teacher-copilot-context'

function target(id: string, overrides: Partial<ContextualCaptureTarget> = {}): ContextualCaptureTarget {
  return {
    sectionId: `section-${id}`,
    sectionLabel: id.toUpperCase(),
    blockId: 'B01',
    projectionId: `projection-${id}`,
    lessonRef: `lesson-${id}`,
    localDate: '2026-09-16',
    provenance: [{ kind: 'LESSON_PROJECTION', ref: `projection-${id}`, label: `Lezione ${id}` }],
    ...overrides,
  }
}

function explicitLesson(): LessonCopilotContext {
  return {
    surface: 'LESSON',
    workspaceId: 'workspace-1',
    academicYearId: 'year-2026',
    discipline: 'Tecnologia',
    classLabel: '2ª C',
    object: {
      type: 'LESSON_PROJECTION',
      id: 'section-2c:B03:projection-3',
      title: 'Misurare con precisione',
      state: 'PIANIFICATO',
    },
    provenance: [
      { kind: 'CANONICAL_PLAN', ref: 'plan:2:B03', label: 'Piano annuale classe seconda' },
      { kind: 'LESSON_PROJECTION', ref: 'projection-3', label: 'Proiezione lezione' },
    ],
    availableCapabilities: ['LESSON_STRUCTURE_REFLECTION'],
    forbiddenCapabilities: ['LESSON_RECORD_EXECUTION', 'LESSON_SAVE_OBSERVATION'],
    missingInformation: [],
    curriculumAuthority: null,
    lesson: {
      sectionId: 'section-2c',
      sectionLabel: '2ª C',
      blockId: 'B03',
      projectionId: 'projection-3',
      title: 'Misurare con precisione',
      objective: 'Misurare e rappresentare un oggetto con procedure controllabili.',
      durationMinutes: 60,
      udaTitle: 'Misurare e rappresentare',
      progressStatus: 'PIANIFICATO',
      preparationPreview: [],
      remainingPreparationCount: 0,
      readyTitles: [],
      readyCount: 0,
      statusLabel: 'READY_BASE',
    },
  }
}

test('AI-1A: il contesto lezione esplicito prevale e produce solo una proposta da confermare', () => {
  const result = buildContextualCapture({
    sourceKind: 'MANUAL_TEXT',
    text: 'Abbiamo svolto la misura. La prossima lezione dobbiamo riprendere gli errori e preparare una scheda.',
    explicitLessonContext: explicitLesson(),
    currentSessionTargets: [target('1a')],
    temporalTargets: [target('3e')],
  })

  assert.equal(result.actionKind, 'PROPOSE')
  assert.equal(result.binding.status, 'RESOLVED')
  assert.equal(result.binding.reason, 'EXPLICIT_LESSON_CONTEXT')
  assert.equal(result.binding.target?.sectionId, 'section-2c')
  assert.equal(result.persistenceEligible, false)
  assert.equal(result.requiresHumanConfirmation, true)
  assert.deepEqual(result.proposedEffects.map((item) => item.kind), [
    'LESSON_EXECUTION_NOTE',
    'NEXT_LESSON_FOCUS',
    'PREPARATION_NEED',
  ])
  assert.deepEqual(result.proposedEffects.map((item) => item.summary), [
    'Abbiamo svolto la misura.',
    'La prossima lezione dobbiamo riprendere gli errori e preparare una scheda.',
    'La prossima lezione dobbiamo riprendere gli errori e preparare una scheda.',
  ])
})

test('AI-1B: il target esplicito leggero risolve la stessa lezione senza costruire un LessonCopilotContext completo', () => {
  const result = buildContextualCapture({
    sourceKind: 'MANUAL_TEXT',
    text: 'Hanno capito il procedimento. La prossima lezione riprendere gli errori di misura.',
    explicitTarget: target('2c', { blockId: 'B03', projectionId: 'projection-3' }),
    temporalTargets: [target('3e')],
  })

  assert.equal(result.binding.status, 'RESOLVED')
  assert.equal(result.binding.reason, 'EXPLICIT_TARGET')
  assert.equal(result.binding.target?.sectionId, 'section-2c')
  assert.equal(result.binding.target?.blockId, 'B03')
  assert.deepEqual(result.proposedEffects.map((item) => item.kind), [
    'PROFESSIONAL_OBSERVATION',
    'NEXT_LESSON_FOCUS',
  ])
})

test('AI-1B: la prossima attività usa solo le frasi pertinenti e non duplica il racconto intero', () => {
  const result = buildContextualCapture({
    sourceKind: 'MANUAL_TEXT',
    text: 'Abbiamo svolto la misura. Alcuni passaggi restano incerti. La prossima lezione riprendere gli errori. Preparare una scheda guidata.',
    explicitTarget: target('2c'),
  })

  assert.equal(result.binding.status, 'RESOLVED')
  assert.deepEqual(result.proposedEffects.map((item) => item.summary), [
    'Abbiamo svolto la misura.',
    'Alcuni passaggi restano incerti.',
    'La prossima lezione riprendere gli errori.',
  ])
  assert.equal(buildContextualCaptureNextActivity(result), 'La prossima lezione riprendere gli errori.')
})

test('AI-1B: la proposta di prossima attività combina al massimo due sintesi pertinenti e rispetta il limite', () => {
  const result = buildContextualCapture({
    sourceKind: 'MANUAL_TEXT',
    text: 'La prossima lezione riprendere la prospettiva. Preparare una scheda con un esempio semplice. Ricordami di stampare le copie.',
    explicitTarget: target('2c'),
  })

  const nextActivity = buildContextualCaptureNextActivity(result, 100)
  assert.equal(nextActivity, 'La prossima lezione riprendere la prospettiva. Preparare una scheda con un esempio semplice.')
  assert.ok((nextActivity?.length ?? 0) <= 100)
})

test('AI-1A: una sola sessione corrente risolve il binding senza usare segnali più deboli', () => {
  const result = buildContextualCapture({
    sourceKind: 'EPHEMERAL_TRANSCRIPT',
    text: 'Hanno capito bene il passaggio ma c’è ancora qualche incertezza.',
    currentSessionTargets: [target('2c')],
    temporalTargets: [target('3e')],
    weakLastOpenedTarget: target('1a'),
  })

  assert.equal(result.binding.status, 'RESOLVED')
  assert.equal(result.binding.reason, 'CURRENT_SESSION_UNIQUE')
  assert.equal(result.binding.target?.sectionId, 'section-2c')
  assert.deepEqual(result.proposedEffects.map((item) => item.kind), ['PROFESSIONAL_OBSERVATION'])
})

test('AI-1A: più target temporali autorevoli richiedono conferma e non scelgono arbitrariamente', () => {
  const result = buildContextualCapture({
    sourceKind: 'EPHEMERAL_TRANSCRIPT',
    text: 'Dobbiamo riprendere questo punto la prossima lezione.',
    temporalTargets: [target('2c'), target('3e')],
  })

  assert.equal(result.binding.status, 'CONFIRM_REQUIRED')
  assert.equal(result.binding.reason, 'TEMPORAL_TARGET_AMBIGUOUS')
  assert.equal(result.binding.target, null)
  assert.equal(result.binding.candidates.length, 2)
  assert.equal(result.persistenceEligible, false)
  assert.equal(buildContextualCaptureNextActivity(result), null)
})

test('AI-1A: l’ultima classe aperta resta un segnale debole e richiede sempre conferma', () => {
  const result = buildContextualCapture({
    sourceKind: 'MANUAL_TEXT',
    text: 'Preparare un esempio più semplice.',
    weakLastOpenedTarget: target('1c'),
  })

  assert.equal(result.binding.status, 'CONFIRM_REQUIRED')
  assert.equal(result.binding.reason, 'WEAK_LAST_OPENED_SIGNAL')
  assert.equal(result.binding.target, null)
  assert.equal(result.binding.candidates[0]?.sectionId, 'section-1c')
})

test('AI-1A: input vuoto o contesto assente falliscono chiusi', () => {
  const empty = buildContextualCapture({
    sourceKind: 'MANUAL_TEXT',
    text: '   ',
    explicitLessonContext: explicitLesson(),
  })
  assert.equal(empty.binding.status, 'BLOCKED')
  assert.equal(empty.binding.reason, 'EMPTY_INPUT')
  assert.deepEqual(empty.proposedEffects, [])

  const missing = buildContextualCapture({
    sourceKind: 'MANUAL_TEXT',
    text: 'La classe era ancora incerta.',
  })
  assert.equal(missing.binding.status, 'BLOCKED')
  assert.equal(missing.binding.reason, 'NO_SUFFICIENT_CONTEXT')
  assert.equal(missing.persistenceEligible, false)
})

test('AI-1A: il contratto effimero non trasporta raw audio', () => {
  const result = buildContextualCapture({
    sourceKind: 'EPHEMERAL_TRANSCRIPT',
    text: 'Ricordami di preparare la scheda per la prossima lezione.',
    currentSessionTargets: [target('2c')],
  })

  assert.equal(contextualCaptureContainsRawAudio(result), false)
  assert.equal(contextualCaptureContainsRawAudio({ rawAudio: new Uint8Array([1, 2, 3]) }), true)
  assert.ok(result.proposedEffects.every((item) => [
    'LESSON_EXECUTION_NOTE',
    'PROFESSIONAL_OBSERVATION',
    'NEXT_LESSON_FOCUS',
    'PREPARATION_NEED',
    'REMINDER_CANDIDATE',
  ].includes(item.kind)))
})

test('AI-1A: un payload runtime con raw audio viene rifiutato prima del binding', () => {
  const result = buildContextualCapture({
    sourceKind: 'EPHEMERAL_TRANSCRIPT',
    text: 'La classe ha lavorato bene.',
    currentSessionTargets: [target('2c')],
    rawAudio: new Uint8Array([1, 2, 3]),
  } as Parameters<typeof buildContextualCapture>[0] & { rawAudio: Uint8Array })

  assert.equal(result.binding.status, 'BLOCKED')
  assert.equal(result.binding.reason, 'RAW_AUDIO_NOT_ALLOWED')
  assert.equal(result.binding.target, null)
  assert.deepEqual(result.proposedEffects, [])
  assert.equal(result.persistenceEligible, false)
})
