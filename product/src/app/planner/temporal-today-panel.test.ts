import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const panelSource = readFileSync(new URL('./TemporalTodayPanel.tsx', import.meta.url), 'utf8')

test('Today distinguishes an unclassified Calendar with an in-force timetable from unavailable time', () => {
  assert.match(panelSource, /day\.calendarState === 'UNDETERMINED' && day\.timetableState === 'IN_FORCE'/)
  assert.match(panelSource, /day\.calendarState === 'UNDETERMINED' && !timetableFallback/)
  assert.match(panelSource, /Orario in vigore · Calendario non classificato/)
  assert.match(panelSource, /Il Calendario non contiene ancora una classificazione esplicita per oggi/)
})

test('Today keeps an explicit NO_LESSONS Calendar day as the timetable override', () => {
  assert.match(panelSource, /day\.calendarState === 'NO_LESSONS'/)
  assert.match(panelSource, /Lezioni non materializzate/)
})
