import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
test('timetable guided flow keeps writes perceptible and activation explicitly human-triggered', () => {
  const submitSource = readFileSync(new URL('./TimetableSubmitButton.tsx', import.meta.url), 'utf8')
  const experienceSource = readFileSync(new URL('./TimetableExperience.tsx', import.meta.url), 'utf8')
  const gridSource = readFileSync(new URL('./TimetableGrid.tsx', import.meta.url), 'utf8')
  const actionsSource = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')
  const transientSource = readFileSync(new URL('../../components/ui/transient-feedback.tsx', import.meta.url), 'utf8')

  assert.match(submitSource, /useFormStatus/)
  assert.match(submitSource, /aria-busy/)
  assert.match(submitSource, /disabled=\{disabled \|\| pending\}/)

  assert.match(experienceSource, /timetableFlowSteps/)
  assert.match(experienceSource, /Modifica l’orario/)
  assert.match(experienceSource, /Da quando vuoi usare questo orario\?/)
  assert.match(experienceSource, /Questo sarà il nuovo orario/)
  assert.match(experienceSource, /Metti in uso/)
  assert.match(experienceSource, /L’orario in uso non cambia ancora/)
  assert.match(experienceSource, /data-visual-priority="decision-primary"/)
  assert.match(experienceSource, /data-visual-priority="operational-primary"/)

  assert.match(gridSource, /<TransientFeedback/)
  assert.match(gridSource, /Modifica salvata\./)
  assert.match(gridSource, /guided/)
  assert.match(gridSource, /!guided \? <div className="timetableLegend"/)

  assert.match(transientSource, /translate3d\(28px, 0, 0\)/)
  assert.match(transientSource, /window\.setTimeout/)
  assert.match(transientSource, /prefers-reduced-motion/)
  assert.match(transientSource, /data-visual-priority="status-transient"/)

  assert.match(actionsSource, /feedback === 'guided_date_saved'/)
  assert.match(actionsSource, /redirect\('\/orario\/aggiorna\?fase=controllo'\)/)
  assert.match(actionsSource, /redirect\('\/orario\?feedback=timetable_activated'\)/)
})

test('timetable lesson context keeps class actions above the modal backdrop', () => {
  const gridSource = readFileSync(new URL('./TimetableGrid.tsx', import.meta.url), 'utf8')
  const guidanceSource = readFileSync(new URL('./orario-guidance.css', import.meta.url), 'utf8')

  assert.match(gridSource, /<Dialog\.Overlay className="timetableContextBackdrop" \/>/)
  assert.match(gridSource, /<Dialog\.Content className="timetableContextSheet">/)
  assert.match(gridSource, /Apri classe<\/Link>/)

  const backdropLayer = guidanceSource.match(/\.timetableContextBackdrop\{[^}]*z-index:(\d+)/)
  const sheetLayer = guidanceSource.match(/\.timetableContextSheet\{[^}]*z-index:(\d+)/)

  assert.ok(backdropLayer, 'the modal backdrop must declare its stacking layer')
  assert.ok(sheetLayer, 'the lesson context sheet must declare its stacking layer')
  assert.ok(Number(sheetLayer[1]) > Number(backdropLayer[1]), 'the lesson context sheet must stay above the backdrop')
  assert.match(guidanceSource, /\.timetableContextSheet\{[^}]*position:fixed/)
})
