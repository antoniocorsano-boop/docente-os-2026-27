import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
// Design impact: COMPATIBLE — canonical transient feedback plus a visible, still human-triggered activation action.
test('timetable writes expose perceptible transient feedback and explicit activation', () => {
  const submitSource = readFileSync(new URL('./TimetableSubmitButton.tsx', import.meta.url), 'utf8')
  const experienceSource = readFileSync(new URL('./TimetableExperience.tsx', import.meta.url), 'utf8')
  const gridSource = readFileSync(new URL('./TimetableGrid.tsx', import.meta.url), 'utf8')
  const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
  const transientSource = readFileSync(new URL('../../components/ui/transient-feedback.tsx', import.meta.url), 'utf8')

  assert.match(submitSource, /useFormStatus/)
  assert.match(submitSource, /aria-busy/)
  assert.match(submitSource, /disabled=\{disabled \|\| pending\}/)
  assert.match(submitSource, /timetableButtonSpinner/)

  assert.match(experienceSource, /pendingLabel="Salvataggio…"/)
  assert.match(experienceSource, /pendingLabel="Attivazione orario…"/)
  assert.match(experienceSource, /Lezione aggiornata/)
  assert.match(experienceSource, /Orario messo in uso/)
  assert.match(experienceSource, /@\/components\/ui\/transient-feedback/)
  assert.match(experienceSource, /<TransientFeedback/)
  assert.match(experienceSource, /timetableActivationAction/)
  assert.match(experienceSource, /Metti in uso questo orario/)
  assert.match(experienceSource, /Metti in uso dal/)
  assert.match(experienceSource, /data-visual-priority="decision-primary"/)
  assert.match(experienceSource, /data-visual-priority="operational-primary"/)
  assert.match(experienceSource, /data-visual-priority="supporting"/)
  assert.match(experienceSource, /data-visual-priority="metadata"/)

  const activationIndex = experienceSource.indexOf('data-visual-priority="decision-primary"')
  const manageGridIndex = experienceSource.indexOf("data-visual-moment={mode === 'view' ? 'now' : 'review'}")
  assert.ok(activationIndex >= 0 && manageGridIndex >= 0 && activationIndex < manageGridIndex)

  assert.match(gridSource, /@\/components\/ui\/transient-feedback/)
  assert.match(gridSource, /<TransientFeedback/)
  assert.match(gridSource, /durationMs=\{mutationFeedback\.tone === 'error' \? 6500 : 4200\}/)
  assert.match(gridSource, /Modifiche salvate nell’orario/)
  assert.match(gridSource, /Non sono riuscito a salvare le modifiche/)
  assert.doesNotMatch(gridSource, /timetableActionToast/)
  assert.doesNotMatch(gridSource, /timetableMutationFeedback/)

  assert.match(transientSource, /translate3d\(28px, 0, 0\)/)
  assert.match(transientSource, /window\.setTimeout/)
  assert.match(transientSource, /prefers-reduced-motion/)
  assert.match(transientSource, /fixed right-3 top-\[76px\]/)
  assert.match(transientSource, /data-visual-priority="status-transient"/)
  assert.match(transientSource, /role=\{role\}/)
  assert.match(transientSource, /aria-live=/)

  assert.match(actionsSource, /feedback=occurrence_saved/)
  assert.match(actionsSource, /feedback=timetable_activated/)
  assert.match(actionsSource, /import=row_saved/)
  assert.match(actionsSource, /import=row_added/)
})
