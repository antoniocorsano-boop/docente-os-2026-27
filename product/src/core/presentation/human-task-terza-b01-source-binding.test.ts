import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from '@/app/piano-annuale/model'
import { resolveRuntimeHumanTaskLessonProjection } from './human-task-runtime'

function terzaB01() {
  const block = buildBlocks('Terza').find((item) => item.id === 'B01')
  assert.ok(block, 'Blocco Terza B01 non trovato nel Piano annuale canonico')
  return block
}

test('Beta Human Review: Terza B01 resolves the canonical task-centric lesson', () => {
  const projection = resolveRuntimeHumanTaskLessonProjection('Terza', terzaB01())

  assert.ok(
    projection,
    'Terza B01 deve restare nel percorso PREPARA → MATERIALI → VISUALIZZA invece di ricadere nel fallback Progetta',
  )
  assert.equal(projection.grade, 'Terza')
  assert.equal(projection.blockId, 'B01')
  assert.equal(projection.udaCode, '3-01')
  assert.equal(projection.packCode, 'CAN-PACK-3A')
  assert.equal(projection.durationMinutes, 120)
  assert.equal(projection.title, 'Energia: forme, trasformazioni e fabbisogni')
  assert.deepEqual(
    projection.sources.map((source) => source.code),
    ['CAN-PLAN-3', 'CAN-UDA-3-01', 'CAN-PACK-3A'],
  )
  assert.ok(projection.resources.some((resource) => resource.id === 'STUDENT-3A-1'))
})
