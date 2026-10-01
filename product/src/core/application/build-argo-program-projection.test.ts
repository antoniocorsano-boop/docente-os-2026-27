import assert from 'node:assert/strict'
import test from 'node:test'
import { buildArgoProgramProjection } from './build-argo-program-projection'

test('builds a deterministic Argo projection without changing stable identities', () => {
  const source = {
    schoolYear: '2026/2027',
    classRef: '1A',
    subjectRef: 'Tecnologia',
    sourceGenerationId: 'gen-1',
    modules: [{
      id: 'MOD-1',
      order: '1',
      description: 'Tecnica e tecnologia',
      arguments: [{
        id: 'ARG-1',
        order: '1',
        description: 'Tecnica',
        performedStatus: 'NOT_PERFORMED' as const,
        performedAt: null,
      }],
    }],
  }

  const first = buildArgoProgramProjection(source)
  const second = buildArgoProgramProjection(source)

  assert.deepEqual(first, second)
  assert.equal(first.modules[0]?.id, 'MOD-1')
  assert.equal(first.modules[0]?.arguments[0]?.id, 'ARG-1')
  assert.equal(first.modules[0]?.description, 'Tecnica e tecnologia')
})

test('does not infer Argo modules or arguments from execution blocks', () => {
  const projection = buildArgoProgramProjection({
    schoolYear: '2026/2027',
    classRef: '2C',
    subjectRef: 'Tecnologia',
    sourceGenerationId: 'gen-2',
    modules: [],
  })

  assert.deepEqual(projection.modules, [])
})

test('fails closed when source binding is incomplete', () => {
  assert.throws(() => buildArgoProgramProjection({
    schoolYear: '',
    classRef: '1A',
    subjectRef: 'Tecnologia',
    sourceGenerationId: 'gen-1',
    modules: [],
  }), /schoolYear/)
})
