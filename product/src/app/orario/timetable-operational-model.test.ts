import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolveTimetableVersionForDate } from '@/core/application/temporal-projection-service'
import { isCurrentTimetableInterval, isCurrentTimetableRow, timetableMinutes } from './timetable-operational-model'

test('timetableMinutes accepts persisted times with seconds', () => {
  assert.equal(timetableMinutes('08:30:00'), 510)
})

test('current interval requires both matching weekday and matching time range', () => {
  const moment = { weekday: 2, minutes: 9 * 60 + 15 }
  assert.equal(isCurrentTimetableInterval(2, '09:00', '10:00', moment), true)
  assert.equal(isCurrentTimetableInterval(1, '09:00', '10:00', moment), false)
  assert.equal(isCurrentTimetableInterval(2, '10:00', '11:00', moment), false)
})

test('current row only reflects clock position and does not imply lesson execution', () => {
  const moment = { weekday: 4, minutes: 600 }
  assert.equal(isCurrentTimetableRow('09:00', '11:00', moment), true)
  assert.equal(isCurrentTimetableRow('11:00', '12:00', moment), false)
})

test('Orario lifecycle uses the timetable effective on the operational date instead of the administratively ACTIVE future version', () => {
  const versions = [
    { id: 'future-active', status: 'ACTIVE' as const, effectiveFrom: '2026-10-27', effectiveTo: null },
    { id: 'current-archived', status: 'ARCHIVED' as const, effectiveFrom: '2026-09-28', effectiveTo: '2026-10-26' },
  ]

  assert.equal(resolveTimetableVersionForDate(versions, '2026-10-26')?.id, 'current-archived')
  assert.equal(resolveTimetableVersionForDate(versions, '2026-10-27')?.id, 'future-active')

  const lifecycleSource = readFileSync(
    new URL('../../core/infrastructure/supabase/supabase-timetable-lifecycle-repository.ts', import.meta.url),
    'utf8',
  )
  const experienceSource = readFileSync(new URL('./TimetableExperience.tsx', import.meta.url), 'utf8')

  assert.match(lifecycleSource, /resolveTimetableVersionForDate/)
  assert.doesNotMatch(lifecycleSource, /find\(\(version\) => version\.status === 'ACTIVE'\)/)
  assert.match(experienceSource, /lifecycleRepository\.read\([^)]*moment\.localDate/s)
})
