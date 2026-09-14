import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveClassTaskDecision } from './class-task-state'

test('prepara quando non esiste una lezione di oggi da svolgere', () => {
  assert.deepEqual(resolveClassTaskDecision({
    hasNextBlock: true,
    hasModeledLesson: true,
    hasSessionReceipt: false,
    hasEligibleOccurrence: false,
    occurrenceEnded: false,
  }), {
    state: 'PREPARE',
    label: 'Prepara la lezione',
    lessonMode: 'prepare',
    useInlineRecorder: false,
  })
})

test('continua la lezione quando l occorrenza e iniziata ma non conclusa', () => {
  assert.equal(resolveClassTaskDecision({
    hasNextBlock: true,
    hasModeledLesson: true,
    hasSessionReceipt: false,
    hasEligibleOccurrence: true,
    occurrenceEnded: false,
  }).state, 'TEACH')
})

test('porta alla registrazione quando la lezione e terminata', () => {
  const decision = resolveClassTaskDecision({
    hasNextBlock: true,
    hasModeledLesson: true,
    hasSessionReceipt: false,
    hasEligibleOccurrence: true,
    occurrenceEnded: true,
  })
  assert.equal(decision.state, 'RECORD')
  assert.equal(decision.lessonMode, 'record')
  assert.equal(decision.useInlineRecorder, false)
})

test('usa il recorder inline soltanto come fallback se manca il Lesson Workspace modellato', () => {
  const decision = resolveClassTaskDecision({
    hasNextBlock: true,
    hasModeledLesson: false,
    hasSessionReceipt: false,
    hasEligibleOccurrence: true,
    occurrenceEnded: true,
  })
  assert.equal(decision.state, 'RECORD')
  assert.equal(decision.lessonMode, null)
  assert.equal(decision.useInlineRecorder, true)
})

test('dopo una receipt non propone di registrare di nuovo la stessa attivita', () => {
  const decision = resolveClassTaskDecision({
    hasNextBlock: true,
    hasModeledLesson: true,
    hasSessionReceipt: true,
    hasEligibleOccurrence: true,
    occurrenceEnded: true,
  })
  assert.equal(decision.state, 'AFTER_RECORD')
  assert.equal(decision.label, 'Prepara il prossimo incontro')
  assert.equal(decision.lessonMode, 'prepare')
})

test('non espone una CTA quando il percorso annuale e completo', () => {
  assert.deepEqual(resolveClassTaskDecision({
    hasNextBlock: false,
    hasModeledLesson: false,
    hasSessionReceipt: false,
    hasEligibleOccurrence: false,
    occurrenceEnded: false,
  }), {
    state: 'COMPLETE',
    label: null,
    lessonMode: null,
    useInlineRecorder: false,
  })
})
