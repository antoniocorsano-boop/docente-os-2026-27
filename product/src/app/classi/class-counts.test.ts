import assert from 'node:assert/strict'
import test from 'node:test'
import { classCounts } from './class-counts'

test('conta e ordina le classi associate agli asset', () => {
  assert.deepEqual(classCounts(['3E', '1A', '2C', '1A']), [['1A', 2], ['2C', 1], ['3E', 1]])
})

test('restituisce una vista vuota in assenza di classi', () => {
  assert.deepEqual(classCounts([]), [])
})
