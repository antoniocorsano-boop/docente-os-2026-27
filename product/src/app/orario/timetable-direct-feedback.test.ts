import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// @trama-feedback-test
test('manual timetable update exposes exactly the three guided phases', () => {
  const experience = readFileSync(new URL('./TimetableExperience.tsx', import.meta.url), 'utf8')
  const grid = readFileSync(new URL('./TimetableGrid.tsx', import.meta.url), 'utf8')
  const actions = readFileSync(new URL('./actions.ts', import.meta.url), 'utf8')

  assert.match(experience, /MODIFICA ORARIO/)
  assert.match(experience, /1 DI 3/)
  assert.match(experience, /2 DI 3/)
  assert.match(experience, /3 DI 3/)
  assert.match(experience, /Cambia soltanto ciò che serve\. L’orario in uso non cambia ancora\./)
  assert.match(experience, /Scegli la data dalla quale vuoi usare le modifiche\./)
  assert.match(experience, /Solo il pulsante finale renderà operative le modifiche\./)
  assert.match(experience, /href="\/orario\/aggiorna\?fase=data"/)
  assert.match(experience, /value="guided_date_saved"/)
  assert.match(experience, /href="\/orario\/aggiorna"/)
  assert.match(grid, /Modifica salvata\./)
  assert.match(actions, /guided_date_saved/)
})
