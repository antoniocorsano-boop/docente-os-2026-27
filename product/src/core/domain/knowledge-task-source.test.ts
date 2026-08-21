import assert from 'node:assert/strict'
import test from 'node:test'
import { buildKnowledgeTaskSourceRef, parseKnowledgeTaskSourceRef } from './knowledge-task-source'

test('costruisce e rilegge il riferimento a una generazione KB', () => {
  const source = { assetId: 'asset-1', generationId: 'generation-2', generationNo: 2, unitId: null }
  const value = buildKnowledgeTaskSourceRef(source)
  assert.equal(value, 'kb-asset:asset-1:generation:generation-2:number:2')
  assert.deepEqual(parseKnowledgeTaskSourceRef(value), source)
})

test('conserva il riferimento opzionale alla unità KB', () => {
  const source = { assetId: 'asset-1', generationId: 'generation-2', generationNo: 2, unitId: 'unit-7' }
  assert.deepEqual(parseKnowledgeTaskSourceRef(buildKnowledgeTaskSourceRef(source)), source)
})

test('rifiuta riferimenti incompleti o non KB', () => {
  assert.equal(parseKnowledgeTaskSourceRef(null), null)
  assert.equal(parseKnowledgeTaskSourceRef('manual:123'), null)
  assert.equal(parseKnowledgeTaskSourceRef('kb-asset:a:generation:g:number:0'), null)
})
