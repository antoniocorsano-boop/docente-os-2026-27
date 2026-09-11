import assert from 'node:assert/strict'
import test from 'node:test'
import { RAW_RADIUS_RE, RAW_SHADOW_RE } from './design-conformance-patterns.mjs'

function countMatches(pattern, value) {
  pattern.lastIndex = 0
  return [...value.matchAll(pattern)].length
}

test('canonical radius tokens are not counted as raw with or without whitespace', () => {
  const css = [
    '.a{border-radius:var(--radius-sm);}',
    '.b{border-radius: var(--radius-md);}',
    '.c{border-radius:\n  var(--radius-lg);}',
  ].join('\n')

  assert.equal(countMatches(RAW_RADIUS_RE, css), 0)
})

test('literal radius values remain counted as raw', () => {
  const css = '.a{border-radius:12px;}.b{border-radius: 999px;}'
  assert.equal(countMatches(RAW_RADIUS_RE, css), 2)
})

test('canonical shadow tokens are not counted as raw with or without whitespace', () => {
  const css = [
    '.a{box-shadow:var(--shadow-sm);}',
    '.b{box-shadow: var(--shadow-md);}',
    '.c{box-shadow:\n  var(--shadow-lg);}',
  ].join('\n')

  assert.equal(countMatches(RAW_SHADOW_RE, css), 0)
})

test('literal shadow values remain counted as raw', () => {
  const css = '.a{box-shadow:0 1px 2px #0003;}.b{box-shadow: none;}'
  assert.equal(countMatches(RAW_SHADOW_RE, css), 2)
})
