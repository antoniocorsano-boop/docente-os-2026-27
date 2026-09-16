import assert from 'node:assert/strict'
import test from 'node:test'
import { isCurrentDaySessionReceipt, presentClassRecorderEmptyState, presentClassTaskState, resolveClassTaskDecision } from './class-task-state'

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
    focusCompletion: false,
  })
})

test('continua la lezione quando l occorrenza e iniziata ma non conclusa', () => {
  assert.equal(resolveClassTaskDecision({ ...base, hasEligibleOccurrence: true }).state, 'TEACH')
})

test('porta alla registrazione quando la lezione e terminata', () => {
  const decision = resolveClassTaskDecision({ ...base, hasEligibleOccurrence: true, occurrenceEnded: true })
  assert.equal(decision.state, 'RECORD')
  assert.equal(decision.lessonMode, 'record')
  assert.equal(decision.useInlineRecorder, false)
  assert.equal(decision.focusCompletion, false)
})

test('una nuova occurrence prevale su una receipt rimasta nella URL', () => {
  const decision = resolveClassTaskDecision({
    ...base,
    hasSessionReceipt: true,
    hasEligibleOccurrence: true,
    occurrenceEnded: false,
    maySuggestCompletion: true,
  })
  assert.equal(decision.state, 'TEACH')
  assert.equal(decision.label, 'Continua la lezione')
  assert.equal(decision.focusCompletion, false)
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
  assert.equal(decision.focusCompletion, false)
})

test('dopo una receipt non propone di registrare di nuovo la stessa attivita', () => {
  const decision = resolveClassTaskDecision({
    ...base,
    hasSessionReceipt: true,
  })
  assert.equal(decision.state, 'AFTER_RECORD')
  assert.equal(decision.label, 'Prepara il prossimo incontro')
  assert.equal(decision.lessonMode, 'prepare')
  assert.equal(decision.useInlineRecorder, false)
  assert.equal(decision.focusCompletion, false)
})

test('dopo la receipt focalizza il completamento session-aware senza riaprire il recorder', () => {
  const decision = resolveClassTaskDecision({
    ...base,
    hasSessionReceipt: true,
    maySuggestCompletion: true,
  })
  assert.equal(decision.state, 'AFTER_RECORD')
  assert.equal(decision.label, 'Valuta il completamento')
  assert.equal(decision.lessonMode, null)
  assert.equal(decision.useInlineRecorder, false)
  assert.equal(decision.focusCompletion, true)
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
    focusCompletion: false,
  })
})

test('la presentazione task-first espone sempre Adesso e un solo Dopo comprensibile', () => {
  for (const state of ['PREPARE', 'TEACH', 'RECORD', 'AFTER_RECORD'] as const) {
    const presentation = presentClassTaskState(state)
    assert.match(presentation.eyebrow, /ADESSO/)
    assert.ok(presentation.hint.length > 0)
    assert.match(presentation.nextStep, /^Dopo /)
  }
})

test('il percorso completo non simula un nuovo compito operativo', () => {
  const presentation = presentClassTaskState('COMPLETE')
  assert.equal(presentation.eyebrow, 'PERCORSO COMPLETATO')
  assert.match(presentation.nextStep, /Consulta Piano/)
})

test('una receipt guida lo stato corrente soltanto nella stessa data locale', () => {
  assert.equal(isCurrentDaySessionReceipt('2026-09-16', '2026-09-16'), true)
  assert.equal(isCurrentDaySessionReceipt('2026-09-15', '2026-09-16'), false)
  assert.equal(isCurrentDaySessionReceipt(null, '2026-09-16'), false)
})

test('dopo una TeachingSession la superficie non ricade nel falso stato Calendario', () => {
  assert.deepEqual(presentClassRecorderEmptyState({
    calendarState: 'UNDETERMINED',
    hasSessionReceipt: true,
    hasFutureOccurrence: false,
  }), {
    title: 'Lezione di oggi registrata.',
    detail: 'La registrazione è acquisita. Non ci sono altre lezioni di questa classe da registrare per oggi.',
    showScheduleLinks: false,
  })
})

test('dopo una TeachingSession distingue una occurrence futura senza proporre una nuova registrazione', () => {
  const presentation = presentClassRecorderEmptyState({
    calendarState: 'UNDETERMINED',
    hasSessionReceipt: true,
    hasFutureOccurrence: true,
  })
  assert.equal(presentation.title, 'Lezione registrata.')
  assert.match(presentation.detail, /prevista più tardi/)
  assert.equal(presentation.showScheduleLinks, false)
})

test('NO_LESSONS esplicito resta override forte anche con una receipt nella URL', () => {
  const presentation = presentClassRecorderEmptyState({
    calendarState: 'NO_LESSONS',
    hasSessionReceipt: true,
    hasFutureOccurrence: false,
  })
  assert.equal(presentation.title, 'Nessuna lezione di oggi da registrare automaticamente.')
  assert.match(presentation.detail, /non si materializzano lezioni/)
  assert.equal(presentation.showScheduleLinks, true)
})

test('senza receipt UNDETERMINED conserva il fail-closed del Calendario', () => {
  const presentation = presentClassRecorderEmptyState({
    calendarState: 'UNDETERMINED',
    hasSessionReceipt: false,
    hasFutureOccurrence: false,
  })
  assert.match(presentation.detail, /non ha ancora definito la giornata/)
  assert.equal(presentation.showScheduleLinks, true)
})
