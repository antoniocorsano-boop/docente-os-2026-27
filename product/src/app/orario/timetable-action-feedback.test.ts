import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
// Regression for the Beta pilot observation: timetable writes must acknowledge both pending and completed states.
test('timetable writes expose perceptible pending and completion feedback', () => {
  const submitSource = readFileSync(new URL('./TimetableSubmitButton.tsx', import.meta.url), 'utf8')
  const experienceSource = readFileSync(new URL('./TimetableExperience.tsx', import.meta.url), 'utf8')
  const gridSource = readFileSync(new URL('./TimetableGrid.tsx', import.meta.url), 'utf8')
  const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')

  assert.match(submitSource, /useFormStatus/)
  assert.match(submitSource, /aria-busy/)
  assert.match(submitSource, /disabled=\{disabled \|\| pending\}/)
  assert.match(submitSource, /timetableButtonSpinner/)

  assert.match(experienceSource, /pendingLabel="Salvataggio…"/)
  assert.match(experienceSource, /pendingLabel="Attivazione orario…"/)
  assert.match(experienceSource, /Lezione aggiornata/)
  assert.match(experienceSource, /Orario messo in uso/)
  assert.match(experienceSource, /role="status"/)
  assert.match(experienceSource, /aria-live="polite"/)

  assert.match(gridSource, /timetableActionToast/)
  assert.match(gridSource, /Modifiche salvate nell’orario/)
  assert.match(gridSource, /Non sono riuscito a salvare le modifiche/)
  assert.match(gridSource, /role=\{mutationFeedback\.tone === 'error' \? 'alert' : 'status'\}/)

  assert.match(actionsSource, /feedback=occurrence_saved/)
  assert.match(actionsSource, /feedback=timetable_activated/)
  assert.match(actionsSource, /import=row_saved/)
  assert.match(actionsSource, /import=row_added/)
})
