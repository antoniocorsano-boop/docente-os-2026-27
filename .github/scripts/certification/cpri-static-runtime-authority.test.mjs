import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyCpriMaterializationOccurrence,
  formatCpriStaticAuthorityOccurrences,
  scanCpriStaticRuntimeAuthority,
} from '../../../product/scripts/experience/cpri-static-runtime-authority.mjs'

test('CPRI production materialization classifier separates active runtime authority from historical provenance', () => {
  assert.equal(classifyCpriMaterializationOccurrence({ file: 'product/src/example/runtime.ts' }), 'RUNTIME_AUTHORITY')
  assert.equal(classifyCpriMaterializationOccurrence({ file: 'docs/archive.md' }), 'HISTORICAL_PROVENANCE')
  assert.equal(
    classifyCpriMaterializationOccurrence({ file: 'product/src/core/application/human-task-projection-recipes-b16-b19.ts' }),
    'HISTORICAL_PROVENANCE',
  )
  assert.equal(classifyCpriMaterializationOccurrence({ file: 'unclassified/location.txt' }), 'UNCLASSIFIED')
})

test('repository has no unclassified CPRI production materialization occurrence', () => {
  const scan = scanCpriStaticRuntimeAuthority()
  assert.equal(
    scan.unclassified.length,
    0,
    `Unclassified CPRI occurrences:\n${formatCpriStaticAuthorityOccurrences(scan.unclassified)}`,
  )
})

test('repository has zero static CPRI production materialization in active runtime paths', () => {
  const scan = scanCpriStaticRuntimeAuthority()
  assert.equal(
    scan.runtimeAuthority.length,
    0,
    `Static CPRI runtime authority remains:\n${formatCpriStaticAuthorityOccurrences(scan.runtimeAuthority)}`,
  )
  assert.equal(scan.ok, true)
})
