import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'

test('material core legacy inventory contract passes its focused fixtures', () => {
  const result = spawnSync(
    process.execPath,
    ['--test', 'scripts/experience/material-core-legacy-inventory.test.mjs'],
    { encoding: 'utf8' },
  )

  assert.equal(
    result.status,
    0,
    `${result.stdout}\n${result.stderr}`,
  )
})
