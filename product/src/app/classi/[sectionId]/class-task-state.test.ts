import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveClassTaskDecision } from './class-task-state'

const base = {
  hasNextBlock: true,
  hasModeledLesson: true,
  hasSessionReceipt: false,
  hasEligibleOccurrence: false,
  occurrenceEnded: false,
  maySuggestCompletion: false,
}

test('prepara quando non esiste una lezione di oggi da svolgere', () => {
  assert.deepEqual(resolveClassTaskDecision(base), {
    state: 'PREPARE',
    label: 'Prepara la lezione',
    lessonMode: 'prepare',
    useInlineRecorder: false,
    useAnnualPlan: false,
  })
})

test('continua la lezione quando l occorrenza e iniziata ma non conclusa', () => {
  assert.equal(resolveClassTaskDecision({
    ...base,
    hasEligibleOccurrence: true,
  }).state, 'TEACH')
})

test('porta alla registrazione quando la lezione e terminata', () => {
  const decision = resolveClassTaskDecision({
    ...base,
    hasEligibleOccurrence: true,
    occurrenceEnded: true,
  })
  assert.equal(decision.state, 'RECORD')
  assert.equal(decision.lessonMode, 'record')
  assert.equal(decision.useInlineRecorder, false)
})

test('usa il recorder inline soltanto come fallback se manca il Lesson Workspace modellato', () => {
  const decision = resolveClassTaskDecision({
    ...base,
    hasModeledLesson: false,
    hasEligibleOccurrence: true,
    occurrenceEnded: true,
  })
  assert.equal(decision.state, 'RECORD')
  assert.equal(decision.lessonMode, null)
  assert.equal(decision.useInlineRecorder, true)
})

test('dopo una receipt non propone di registrare di nuovo la stessa attivita', () => {
  const decision = resolveClassTaskDecision({
    ...base,
    hasSessionReceipt: true,
    hasEligibleOccurrence: true,
    occurrenceEnded: true,
  })
  assert.equal(decision.state, 'AFTER_RECORD')
  assert.equal(decision.label, 'Prepara il prossimo incontro')
  assert.equal(decision.lessonMode, 'prepare')
  assert.equal(decision.useAnnualPlan, false)
})

test('dopo la receipt porta al Piano soltanto quando la decisione di completamento e pertinente', () => {
  const decision = resolveClassTaskDecision({
    ...base,
    hasSessionReceipt: true,
    maySuggestCompletion: true,
  })
  assert.equal(decision.state, 'AFTER_RECORD')
  assert.equal(decision.label, 'Valuta il completamento')
  assert.equal(decision.lessonMode, null)
  assert.equal(decision.useAnnualPlan, true)
})

test('non espone una CTA quando il percorso annuale e completo', () => {
  assert.deepEqual(resolveClassTaskDecision({
    ...base,
    hasNextBlock: false,
    hasModeledLesson: false,
  }), {
    state: 'COMPLETE',
    label: null,
    lessonMode: null,
    useInlineRecorder: false,
    useAnnualPlan: false,
  })
})
