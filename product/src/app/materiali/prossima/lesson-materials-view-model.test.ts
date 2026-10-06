import assert from 'node:assert/strict'
import test from 'node:test'
import { MATERIAL_VIEW_OPTIONS } from './lesson-materials-view-model'

test('lesson materials convergence exposes one primary projection view and keeps three secondary views', () => {
  const primary = MATERIAL_VIEW_OPTIONS.filter((option) => option.priority === 'primary')
  const secondary = MATERIAL_VIEW_OPTIONS.filter((option) => option.priority === 'secondary')

  assert.deepEqual(primary.map((option) => option.id), ['lim'])
  assert.deepEqual(primary.map((option) => option.label), ['Proietta'])
  assert.deepEqual(secondary.map((option) => option.id), ['visuale', 'scheda', 'docente'])
  assert.deepEqual(secondary.map((option) => option.label), ['Mappa visuale', 'Scheda studenti', 'Guida docente'])
})
