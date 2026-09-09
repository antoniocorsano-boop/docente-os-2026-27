import assert from 'node:assert/strict'
import test from 'node:test'
import type { ProjectedDay, ProjectedOccurrence } from '@/core/application/temporal-projection-service'
import type { PlannerTask } from '@/core/domain/planner-task'
import { buildDailyTeacherBrief, resolveTeacherDayPhase } from './daily-teacher-brief'

const date = '2026-09-09'

function occurrence(overrides: Partial<ProjectedOccurrence> = {}): ProjectedOccurrence {
  return {
    logicalId: 'tt:v1:s1:2026-09-09',
    localDate: date,
    startAt: `${date}T08:15:00`,
    endAt: `${date}T09:15:00`,
    kind: 'LESSON',
    title: '1ª A · Tecnologia',
    sectionId: 'section-1a',
    disciplineId: 'technology',
    timetableVersionId: 'v1',
    timetableSlotId: 's1',
    calendarEventId: null,
    calendarState: 'SCHOOL_DAY',
    exceptionState: 'NONE',
    provenance: ['timetable_version:v1', 'calendar_day:2026-09-09'],
    ...overrides,
  }
}

function day(items: ProjectedOccurrence[]): ProjectedDay {
  return {
    localDate: date,
    calendarState: 'SCHOOL_DAY',
    calendarLabel: 'Giorno di lezione',
    timetableState: 'IN_FORCE',
    timetableVersionId: 'v1',
    occurrences: items.filter((item) => item.kind !== 'CALENDAR_EVENT'),
    events: items.filter((item) => item.kind === 'CALENDAR_EVENT'),
  }
}

function task(overrides: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id: 'task-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    title: 'Preparare il verbale',
    notes: null,
    status: 'OPEN',
    priority: 'URGENT',
    dueAt: `${date}T23:59:00+02:00`,
    plannedFor: date,
    sourceKind: 'MANUAL',
    sourceRef: null,
    createdBy: 'user-1',
    completedAt: null,
    createdAt: `${date}T06:00:00Z`,
    updatedAt: `${date}T06:00:00Z`,
    ...overrides,
  }
}

test('before school the first timed commitment outranks an urgent planner task', () => {
  const brief = buildDailyTeacherBrief({
    day: day([occurrence()]),
    tasks: [task()],
    localDate: date,
    nowMinutes: 7 * 60 + 30,
  })

  assert.equal(brief.phase, 'BEFORE_SCHOOL')
  assert.equal(brief.focus?.kind, 'TEMPORAL')
  assert.equal(brief.focus?.title, '1ª A · Tecnologia')
  assert.equal(brief.focus?.eyebrow, 'A SEGUIRE')
  assert.equal(brief.focus?.actionLabel, 'Apri attività')
  assert.equal(brief.attentionTasks.length, 1)
})

test('during a lesson the current lesson is exposed as the operative activity', () => {
  const brief = buildDailyTeacherBrief({
    day: day([occurrence()]),
    tasks: [],
    localDate: date,
    nowMinutes: 8 * 60 + 40,
  })

  assert.equal(brief.phase, 'ACTIVE_DAY')
  assert.equal(brief.focus?.eyebrow, 'IN CORSO')
  assert.equal(brief.focus?.title, '1ª A · Tecnologia')
  assert.equal(brief.focus?.description, 'Attività didattica in corso.')
  assert.equal(brief.focus?.actionLabel, 'Apri attività')
})

test('between activities the next timed commitment is exposed without didactic guidance', () => {
  const second = occurrence({
    logicalId: 'cal:event-1:2026-09-09',
    kind: 'CALENDAR_EVENT',
    title: 'Collegio docenti',
    sectionId: null,
    disciplineId: null,
    timetableVersionId: null,
    timetableSlotId: null,
    calendarEventId: 'event-1',
    startAt: `${date}T11:00:00`,
    endAt: `${date}T12:00:00`,
  })

  const brief = buildDailyTeacherBrief({
    day: day([occurrence({ endAt: `${date}T09:00:00` }), second]),
    tasks: [],
    localDate: date,
    nowMinutes: 10 * 60,
  })

  assert.equal(brief.phase, 'BETWEEN_ACTIVITIES')
  assert.equal(brief.focus?.title, 'Collegio docenti')
  assert.equal(brief.focus?.actionLabel, 'Apri impegno')
  assert.equal(brief.focus?.description, 'Prossimo impegno previsto.')
})

test('after the last timed commitment an overdue task is exposed as a scadenza', () => {
  const brief = buildDailyTeacherBrief({
    day: day([occurrence()]),
    tasks: [task({ dueAt: '2026-09-08T18:00:00+02:00', plannedFor: null })],
    localDate: date,
    nowMinutes: 18 * 60,
  })

  assert.equal(brief.phase, 'AFTER_SCHOOL')
  assert.equal(brief.focus?.kind, 'TASK')
  assert.equal(brief.focus?.eyebrow, 'SCADENZA')
  assert.equal(brief.focus?.title, 'Preparare il verbale')
  assert.equal(brief.focus?.description, 'Scadenza superata.')
})

test('day phase is deterministic from timed commitments', () => {
  const items = [occurrence()]
  assert.equal(resolveTeacherDayPhase(items, 7 * 60), 'BEFORE_SCHOOL')
  assert.equal(resolveTeacherDayPhase(items, 8 * 60 + 30), 'ACTIVE_DAY')
  assert.equal(resolveTeacherDayPhase(items, 10 * 60), 'AFTER_SCHOOL')
})
