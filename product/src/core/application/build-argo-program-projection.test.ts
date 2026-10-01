import assert from 'node:assert/strict'
import test from 'node:test'
import type { ArgoProgramProjectionSource } from '@/core/domain/argo-program'
import { buildArgoProgramProjection } from './build-argo-program-projection'

function governedSource(): ArgoProgramProjectionSource {
  return {
    sourceKind: 'GOVERNED_MODULE_ARGUMENT_PROJECTION',
    schoolYear: '2026/2027',
    classRef: '1A',
    subjectRef: 'Tecnologia',
    sourceAssetId: 'asset-programming-1',
    sourceGenerationId: 'gen-1',
    modules: [{
      id: 'MOD-1',
      order: '1',
      description: 'Tecnica e tecnologia',
      arguments: [{
        id: 'ARG-1',
        order: '1',
        description: 'Tecnica',
        performedStatus: 'NOT_PERFORMED',
        performedAt: null,
      }],
    }],
  }
}

test('builds a deterministic Argo projection without changing stable identities', () => {
  const source = governedSource()

  const first = buildArgoProgramProjection(source)
  const second = buildArgoProgramProjection(source)

  assert.deepEqual(first, second)
  assert.equal(first.sourceAssetId, 'asset-programming-1')
  assert.equal(first.sourceGenerationId, 'gen-1')
  assert.equal(first.modules[0]?.id, 'MOD-1')
  assert.equal(first.modules[0]?.arguments[0]?.id, 'ARG-1')
  assert.equal(first.modules[0]?.description, 'Tecnica e tecnologia')
})

test('does not infer Argo modules or arguments from the 33-block execution model', () => {
  const annualExecutionLikeInput = {
    schoolYear: '2026/2027',
    classRef: '2C',
    subjectRef: 'Tecnologia',
    sourceGenerationId: 'gen-2',
    sections: [{ id: 'section-2c' }],
    progress: Array.from({ length: 33 }, (_, index) => ({ blockId: `B${String(index + 1).padStart(2, '0')}` })),
  }

  assert.throws(
    () => buildArgoProgramProjection(annualExecutionLikeInput as unknown as ArgoProgramProjectionSource),
    /governed module\/argument source/,
  )
})

test('fails closed when source provenance is incomplete', () => {
  const source = governedSource()
  source.sourceAssetId = ''

  assert.throws(() => buildArgoProgramProjection(source), /sourceAssetId/)
})
