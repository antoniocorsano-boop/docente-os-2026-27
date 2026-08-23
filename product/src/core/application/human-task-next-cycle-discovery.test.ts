import assert from 'node:assert/strict'
import test from 'node:test'
import { discoverRuntimeHumanTaskCoveredBlockIds } from '@/core/presentation/human-task-runtime'
import { compileHumanTaskTrancheReviewFromCanonicalSources } from './human-task-tranche-compiler-source-adapter'

test('runtime coverage reports Prima COMPLETE after approved B31-B33 promotion', () => {
  const coveredBlockIds = discoverRuntimeHumanTaskCoveredBlockIds('Prima')
  const covered = new Set(coveredBlockIds)

  assert.equal(covered.has('B01'), true)
  assert.equal(covered.has('B30'), true)
  assert.equal(covered.has('B31'), true)
  assert.equal(covered.has('B32'), true)
  assert.equal(covered.has('B33'), true)
  assert.equal(coveredBlockIds.length, 33)

  const { review } = compileHumanTaskTrancheReviewFromCanonicalSources({
    grade: 'Prima',
    coveredBlockIds,
    sources: [],
  })

  console.info('HUMAN_TASK_NEXT_CYCLE', JSON.stringify({
    segmentKey: review.segmentKey,
    blockIds: review.blockIds,
    status: review.status,
    promotion: review.promotion,
    issues: review.issues,
  }))

  assert.equal(review.status, 'COMPLETE')
  assert.equal(review.segmentKey, null)
  assert.deepEqual(review.blockIds, [])
  assert.deepEqual(review.items, [])
  assert.deepEqual(review.issues, [])
})
