import assert from 'node:assert/strict'
import test from 'node:test'
import { requireComparison, validateEvidenceModel } from './engine.mjs'

function model(overrides = {}) {
  const files = {
    'src/write.tsx': '<div role="status" aria-live="polite">Saved</div>',
    'src/write.test.tsx': "screen.getByRole('status')",
    ...(overrides.files ?? {}),
  }
  return {
    surfaces: [{
      id: 'W1',
      sourcePatterns: ['src/write.tsx'],
      feedbackFiles: ['src/write.tsx'],
      testFiles: ['src/write.test.tsx'],
    }],
    mutationPaths: ['src/write.tsx'],
    deletedPaths: [],
    trackedFiles: Object.keys(files),
    baseSurfaces: [],
    exists: (p) => Object.hasOwn(files,p),
    readFile: (p) => files[p] ?? '',
    ...overrides,
  }
}

test('fails a changed mutation without exactly one declared surface', () => {
  const errors = validateEvidenceModel(model({surfaces:[]}))
  assert.ok(errors.some((e)=>e.includes('exactly one declared write surface')))
})

test('unrelated error/success text is not accepted as UI evidence', () => {
  const errors = validateEvidenceModel(model({
    files:{
      'src/write.tsx':'const { error } = result; const success = true',
      'src/write.test.tsx':'expect(error).toBeNull()',
    }
  }))
  assert.ok(errors.some((e)=>e.includes('no observable UI feedback marker')))
  assert.ok(errors.some((e)=>e.includes('do not assert perceived feedback')))
})

test('fails when a declared feedback test is deleted', () => {
  const m=model()
  const errors = validateEvidenceModel({...m,deletedPaths:['src/write.test.tsx'],files:undefined})
  assert.ok(errors.some((e)=>e.includes('declared evidence file deleted')))
})

test('fails when a write-surface declaration is removed while its source remains', () => {
  const prior=[{
    id:'W1',
    sourcePatterns:['src/write.tsx'],
    feedbackFiles:['src/write.tsx'],
    testFiles:['src/write.test.tsx'],
  }]
  const m=model({surfaces:[],mutationPaths:[],baseSurfaces:prior})
  const errors=validateEvidenceModel(m)
  assert.ok(errors.some((e)=>e.includes('write surface removed while source still exists')))
})

test('manual or detached validation without base/head fails closed', () => {
  assert.deepEqual(requireComparison('', 'abc'), ['comparison base/head required'])
  assert.deepEqual(requireComparison('abc', ''), ['comparison base/head required'])
  assert.deepEqual(requireComparison('abc', 'def'), [])
})
