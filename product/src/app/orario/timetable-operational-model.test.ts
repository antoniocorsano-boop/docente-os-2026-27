import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolveTimetableVersionForDate } from '@/core/application/temporal-projection-service'
import {
  isCurrentTimetableInterval,
  isCurrentTimetableRow,
  nextTimetableOccurrenceDate,
  timetableMinutes,
} from './timetable-operational-model'

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

test('Orario current recurring week resolves a past weekday to its next concrete occurrence across an effective-date boundary', () => {
  assert.equal(nextTimetableOccurrenceDate('2026-10-27', 1), '2026-11-02')
  assert.equal(nextTimetableOccurrenceDate('2026-10-27', 2), '2026-10-27')
  assert.equal(nextTimetableOccurrenceDate('2026-10-27', 3), '2026-10-28')

  const experienceSource = readFileSync(new URL('./TimetableExperience.tsx', import.meta.url), 'utf8')
  assert.match(experienceSource, /nextTimetableOccurrenceDate\(input\.moment\.localDate, weekday\)/)
  assert.doesNotMatch(experienceSource, /shiftLocalDate\(input\.moment\.localDate, weekday - input\.moment\.weekday\)/)
})

const currentVersion = {
  id: 'version-current',
  status: 'ACTIVE' as const,
  effectiveFrom: '2026-10-27',
  effectiveTo: '2026-11-30',
}

const currentMondaySlot = {
  id: 'slot-current',
  timetableVersionId: currentVersion.id,
  weekday: 1,
  startTime: '09:00',
  endTime: '10:00',
  kind: 'LESSON' as const,
  sectionId: 'section-2c',
  sectionLabel: '2C',
  disciplineId: 'technology',
  disciplineLabel: 'Tecnologia',
  manualClassLabel: null,
  room: null,
  activityKind: 'THEORY' as const,
}

function concreteOccurrenceDate(
  localDate: string,
  targetWeekday: number,
  context: Record<string, unknown>,
) {
  return Reflect.apply(nextTimetableOccurrenceDate, null, [localDate, targetWeekday, context]) as string | null
}

test('next concrete timetable occurrence skips an explicit NO_LESSONS weekday while the same version and exact slot remain valid', () => {
  const result = concreteOccurrenceDate('2026-10-27', 1, {
    timetableVersionId: currentVersion.id,
    timetableSlotId: currentMondaySlot.id,
    timetableVersions: [currentVersion],
    timetableSlots: [currentMondaySlot],
    timetableExceptions: [],
    calendarDays: [
      { id: 'suspension-2026-11-02', localDate: '2026-11-02', kind: 'SUSPENSION', label: 'Lezioni sospese' },
      { id: 'school-day-2026-11-09', localDate: '2026-11-09', kind: 'SCHOOL_DAY', label: 'Giorno di lezione' },
    ],
    calendarEvents: [],
  })

  assert.equal(result, '2026-11-09')
})

test('next concrete timetable occurrence fails closed when the current timetable interval ends before another exact-slot lesson exists', () => {
  const endingVersion = { ...currentVersion, effectiveTo: '2026-11-08' }
  const result = concreteOccurrenceDate('2026-10-27', 1, {
    timetableVersionId: endingVersion.id,
    timetableSlotId: currentMondaySlot.id,
    timetableVersions: [endingVersion],
    timetableSlots: [currentMondaySlot],
    timetableExceptions: [],
    calendarDays: [
      { id: 'suspension-2026-11-02', localDate: '2026-11-02', kind: 'SUSPENSION', label: 'Lezioni sospese' },
    ],
    calendarEvents: [],
  })

  assert.equal(result, null)
})

test('next concrete timetable occurrence never reconciles a slot id across timetable versions', () => {
  const endingVersion = { ...currentVersion, effectiveTo: '2026-11-08' }
  const nextVersion = {
    id: 'version-next',
    status: 'ACTIVE' as const,
    effectiveFrom: '2026-11-09',
    effectiveTo: null,
  }
  const clonedMondaySlot = {
    ...currentMondaySlot,
    id: 'slot-cloned-next-version',
    timetableVersionId: nextVersion.id,
  }
  const result = concreteOccurrenceDate('2026-10-27', 1, {
    timetableVersionId: endingVersion.id,
    timetableSlotId: currentMondaySlot.id,
    timetableVersions: [endingVersion, nextVersion],
    timetableSlots: [currentMondaySlot, clonedMondaySlot],
    timetableExceptions: [],
    calendarDays: [
      { id: 'suspension-2026-11-02', localDate: '2026-11-02', kind: 'SUSPENSION', label: 'Lezioni sospese' },
      { id: 'school-day-2026-11-09', localDate: '2026-11-09', kind: 'SCHOOL_DAY', label: 'Giorno di lezione' },
    ],
    calendarEvents: [],
  })

  assert.equal(result, null)
})

test('Orario entrypoint integration searches the exact current version and slot instead of accepting a weekday-only date', () => {
  const experienceSource = readFileSync(new URL('./TimetableExperience.tsx', import.meta.url), 'utf8')

  assert.match(
    experienceSource,
    /nextTimetableOccurrenceDate\(\s*firstLocalDate,\s*weekday,\s*\{\s*timetableVersionId: slot\.timetableVersionId,\s*timetableSlotId: slot\.id,/s,
  )
  assert.match(experienceSource, /occurrence\.timetableVersionId === slot\.timetableVersionId/)
  assert.match(experienceSource, /occurrence\.timetableSlotId === slot\.id/)
})
