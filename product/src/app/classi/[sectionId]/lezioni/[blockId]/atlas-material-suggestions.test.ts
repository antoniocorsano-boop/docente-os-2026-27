import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAtlasLessonSuggestions,
  resolveAtlasMaterialSuggestion,
} from './atlas-material-suggestions'

test('ECO-02 pilot exposes exactly the governed Atlas resource for 2C B01', () => {
  const items = buildAtlasLessonSuggestions({
    compactSectionLabel: '2C',
    blockId: 'B01',
    uda: '2-01',
    excludedMaterialIds: new Set(),
  })
  assert.equal(items.length, 1)
  assert.equal(items[0].materialId, 'm4')
  assert.equal(items[0].lessonId, '2c-tec-02')
  assert.equal(items[0].state, 'READY')
  assert.match(items[0].publicUrl, /Curriculum-Atlas\/materials\/2026-09-23\/2c\/mappa-sistema-agricolo\.svg$/)
})

test('Atlas resource is fail-closed outside the governed pilot context', () => {
  assert.equal(buildAtlasLessonSuggestions({
    compactSectionLabel: '2A',
    blockId: 'B01',
    uda: '2-01',
    excludedMaterialIds: new Set(),
  }).length, 0)

  assert.equal(resolveAtlasMaterialSuggestion({
    compactSectionLabel: '2C',
    blockId: 'B01',
    uda: '2-01',
    materialId: 'client-invented',
  }), null)
})

test('accepted Atlas material is not proposed a second time', () => {
  assert.equal(buildAtlasLessonSuggestions({
    compactSectionLabel: '2C',
    blockId: 'B01',
    uda: '2-01',
    excludedMaterialIds: new Set(['m4']),
  }).length, 0)
})
