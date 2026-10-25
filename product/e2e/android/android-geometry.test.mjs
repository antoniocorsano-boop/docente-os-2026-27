import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyIntersection, intersection } from './android-geometry.mjs'

const rect = (left, top, right, bottom) => ({ left, top, right, bottom })

test('positive-area overlap is BLOCKING for an essential protected target', () => {
  const fab = rect(320, 700, 376, 756)
  const action = rect(300, 680, 390, 760)

  assert.equal(intersection(fab, action).area > 0, true)
  assert.equal(classifyIntersection(fab, action, { essential: true }), 'BLOCKING')
})

test('non-overlapping rectangles within warning gap are WARNING', () => {
  const fab = rect(300, 600, 356, 656)
  const action = rect(300, 662, 390, 720)

  assert.equal(intersection(fab, action).area, 0)
  assert.equal(classifyIntersection(fab, action, { essential: true, warningGap: 8 }), 'WARNING')
})

test('well-separated rectangles are CLEAR', () => {
  const fab = rect(300, 500, 356, 556)
  const action = rect(20, 700, 390, 760)

  assert.equal(intersection(fab, action).area, 0)
  assert.equal(classifyIntersection(fab, action, { essential: true, warningGap: 8 }), 'CLEAR')
})

test('zero-area edge contact is not a blocking overlap', () => {
  const fab = rect(300, 600, 356, 656)
  const action = rect(356, 600, 390, 656)

  assert.equal(intersection(fab, action).area, 0)
  assert.notEqual(classifyIntersection(fab, action, { essential: true, warningGap: 0 }), 'BLOCKING')
})
