import assert from 'node:assert/strict'
import test from 'node:test'
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
