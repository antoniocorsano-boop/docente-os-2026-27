import assert from 'node:assert/strict'
import test from 'node:test'
import { assembleLessonReflectionCopilotContext } from './copilot-context-assembler'
import { handleLessonReflectionCapture, matchesLessonReflectionCaptureIntent } from './lesson-reflection-handler'
import {
  buildLessonReflectionCapturePrompt,
  CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH,
  parseLessonReflectionCapturePrompt,
  parseLessonReflectionCaptureRequest,
} from '@/core/presentation/contextual-capture-frontdoor'

function lessonContext() {
  return assembleLessonReflectionCopilotContext({
    runId: 'run-1',
    localDate: '2026-09-16',
    workspaceId: 'workspace-1',
    academicYearId: 'year-2026',
    sectionId: 'section-2a',
    sectionLabel: '2ª A',
    blockId: 'B01',
    projectionId: 'projection-2a-b01',
    lessonTitle: 'L’agricoltura come sistema tecnologico',
    canonicalPlanRef: 'CAN-PLAN-2',
    canonicalPlanLabel: 'Piano annuale 2ª A',
  })
}

test('AI-1B frontdoor: la richiesta di riflessione resta un prompt senza contesto tecnico client', () => {
  const prompt = buildLessonReflectionCapturePrompt(
    'Abbiamo svolto la misura. La prossima lezione riprendere gli errori. Preparare una scheda guidata.',
  )

  assert.equal(matchesLessonReflectionCaptureIntent(prompt), true)
  assert.equal(
    parseLessonReflectionCapturePrompt(prompt),
    'Abbiamo svolto la misura. La prossima lezione riprendere gli errori. Preparare una scheda guidata.',
  )
  assert.equal(prompt.includes('section-2a'), false)
  assert.equal(prompt.includes('projection-2a-b01'), false)
})

test('AI-1B handler: LESSON_REFLECTION usa contesto server-side, propone e non persiste', () => {
  const assembled = lessonContext()
  const result = handleLessonReflectionCapture({
    context: assembled.context,
    target: assembled.target,
    prompt: buildLessonReflectionCapturePrompt(
      'Abbiamo svolto la misura. La prossima lezione riprendere gli errori. Preparare una scheda guidata.',
    ),
  })

  assert.equal(result.skillId, 'LESSON_REFLECTION')
  assert.equal(result.actionKind, 'PROPOSE')
  assert.equal(result.status, 'SUPPORTED')
  assert.equal(result.sourceKind, 'MANUAL_TEXT')
  assert.equal(result.persistentEffect, 'NONE')
  assert.equal(result.confirmationRequiredForPersistence, true)
  assert.deepEqual(result.effects.map((effect) => effect.kind), [
    'LESSON_EXECUTION_NOTE',
    'NEXT_LESSON_FOCUS',
    'PREPARATION_NEED',
  ])
  assert.equal(
    result.nextActivity,
    'La prossima lezione riprendere gli errori. Preparare una scheda guidata.',
  )
  assert.ok(result.provenance.some((item) => item.kind === 'CANONICAL_PLAN'))
  assert.ok(result.provenance.some((item) => item.kind === 'LESSON_PROJECTION'))
})

test('AI-1C handler: la trascrizione effimera conserva la propria provenance senza persistere audio', () => {
  const assembled = lessonContext()
  const prompt = buildLessonReflectionCapturePrompt(
    'Abbiamo svolto il sistema tecnologico. La prossima lezione riprendere gli impatti.',
    'EPHEMERAL_TRANSCRIPT',
  )
  const parsed = parseLessonReflectionCaptureRequest(prompt)

  assert.equal(parsed?.sourceKind, 'EPHEMERAL_TRANSCRIPT')
  assert.equal(prompt.includes('audio'), false)

  const result = handleLessonReflectionCapture({
    context: assembled.context,
    target: assembled.target,
    prompt,
  })

  assert.equal(result.status, 'SUPPORTED')
  assert.equal(result.sourceKind, 'EPHEMERAL_TRANSCRIPT')
  assert.equal(result.persistentEffect, 'NONE')
  assert.equal(result.confirmationRequiredForPersistence, true)
})

test('AI-1B handler: capability mancante fallisce chiusa', () => {
  const assembled = lessonContext()
  const result = handleLessonReflectionCapture({
    context: {
      ...assembled.context,
      capabilities: {
        ...assembled.context.capabilities,
        available: [],
      },
    },
    target: assembled.target,
    prompt: buildLessonReflectionCapturePrompt('La prossima lezione riprendere gli errori.'),
  })

  assert.equal(result.status, 'BLOCKED')
  assert.deepEqual(result.effects, [])
  assert.equal(result.nextActivity, null)
  assert.match(result.message ?? '', /Capacità non disponibile: LESSON_READ/)
})

test('AI-1B handler: privacy diversa da PROFESSIONAL + NO_MODEL fallisce chiusa', () => {
  const assembled = lessonContext()
  const result = handleLessonReflectionCapture({
    context: {
      ...assembled.context,
      privacy: {
        classification: 'PROFESSIONAL',
        providerPolicy: 'APPROVED_EXTERNAL_PROVIDER',
      },
    },
    target: assembled.target,
    prompt: buildLessonReflectionCapturePrompt('Hanno capito il procedimento.'),
  })

  assert.equal(result.status, 'BLOCKED')
  assert.match(result.message ?? '', /privacy/)
})

test('AI-1B frontdoor: testo vuoto o oltre il limite non diventa un intent valido', () => {
  assert.throws(() => buildLessonReflectionCapturePrompt('   '), /required/)
  assert.throws(
    () => buildLessonReflectionCapturePrompt('x'.repeat(CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH + 1)),
    /exceeds/,
  )
  assert.equal(matchesLessonReflectionCaptureIntent('Organizza questa nota di fine lezione:\n'), false)
})
