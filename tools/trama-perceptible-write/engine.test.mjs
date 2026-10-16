import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { requireComparison, validateEvidenceModel } from './engine.mjs'
import { matchesPattern } from './lib.mjs'

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
      critical: false,
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
    critical:false,
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


test('rejects toast-only feedback for critical writes', () => {
  const errors = validateEvidenceModel(model({
    files:{
      'src/write.tsx':"toast('Saved')",
      'src/write.test.tsx':"/* @trama-feedback-test */",
    },
    surfaces:[{
      id:'W1',
      sourcePatterns:['src/write.tsx'],
      feedbackFiles:['src/write.tsx'],
      testFiles:['src/write.test.tsx'],
      critical:true,
    }],
  }))
  assert.ok(errors.some((e)=>e.includes('toast-only is insufficient')))
})

test('CPRI-touched write files bind to exactly one perceptible-write surface', () => {
  const manifest = JSON.parse(fs.readFileSync('ops/trama-perceptible-write-surfaces.json', 'utf8'))
  const paths = [
    'product/src/app/classi/[sectionId]/actions.ts',
    'product/src/app/classi/[sectionId]/lezioni/actions.ts',
    'product/src/app/feedback/actions.ts',
  ]

  for (const path of paths) {
    const bound = (manifest.surfaces ?? []).filter((surface) =>
      surface.sourcePatterns?.some((pattern) => matchesPattern(pattern, path)),
    )
    assert.equal(bound.length, 1, `${path} must bind to exactly one declared write surface`)
  }
})
