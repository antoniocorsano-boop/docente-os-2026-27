import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const config = require('./hva-governed-baseline-config.cjs')

test('HVA-GOV-01/v1 centralizes the canonical local clock and date', () => {
  assert.equal(config.HVA_BASELINE_ID, 'HVA-GOV-01/v1')
  assert.equal(config.HVA_EFFECTIVE_FROM, '2026-10-27')
  assert.equal(config.HVA_LOCAL_DATE, '2026-11-02')
  assert.equal(config.HVA_CANONICAL_NOW, '2026-11-02T08:30:00+01:00')
  assert.equal(config.HVA_WEEKDAY, 1)
  assert.equal(config.HVA_MINUTE_OF_DAY, 8 * 60 + 30)
  assert.equal(config.HVA_CALENDAR_SOURCE_REF, 'HVA-GOV-01/v1')
  assert.equal(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'long' }).format(new Date(config.HVA_CANONICAL_NOW)),
    'Monday',
  )
})

test('clock consumers do not hard-code a second canonical HVA date', async () => {
  const files = [
    new URL('./hva-fixed-clock.cjs', import.meta.url),
    new URL('./hva-today-fixture.mjs', import.meta.url),
    new URL('../../scripts/start-production.mjs', import.meta.url),
  ]
  for (const file of files) {
    const source = await readFile(file, 'utf8')
    assert.doesNotMatch(source, /2026-10-19T08:30:00\+02:00|2026-10-19/)
  }
})
