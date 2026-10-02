import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const config = fs.readFileSync(new URL('../../../next.config.ts', import.meta.url), 'utf8')

test('server actions allow only the bounded raster timetable payload envelope', () => {
  assert.match(config, /serverActions:\s*\{[\s\S]*bodySizeLimit:\s*'4mb'/)
  assert.doesNotMatch(config, /bodySizeLimit:\s*'20mb'/)
})
