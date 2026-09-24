import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTodayProjection } from './today-projection-service'
import type { ProjectedDay } from './temporal-projection-service'
import type { PlannerTask } from '@/core/domain/planner-task'

const localDate = '2026-09-24'

function task(overrides: Partial<PlannerTask> = {}): PlannerTask {
  return {
    id: overrides.id ?? 'task-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    title: overrides.title ?? 'Attività',
    notes: null,
    status: overrides.status ?? 'OPEN',
    priority: overrides.priority ?? 'NORMAL',
    dueAt: overrides.dueAt ?? null,
    plannedFor: overrides.plannedFor ?? null,
    sourceKind: overrides.sourceKind ?? 'MANUAL',
    sourceRef: overrides.sourceRef ?? null,
    createdBy: 'teacher-1',
    completedAt: null,
    createdAt: overrides.createdAt ?? '2026-09-20T08:00:00Z',
    updatedAt: '2026-09-20T08:00:00Z',
  }
}

function temporalDay(): ProjectedDay {
  return {
    localDate,
    calendarState: 'UNDETERMINED',
    calendarLabel: null,
    timetableState: 'IN_FORCE',
    timetableVersionId: 'tt-v1',
    occurrences: [
      {
        logicalId: 'tt:tt-v1:slot-1:2026-09-24',
        localDate,
        startAt: '2026-09-24T12:00:00',
        endAt: '2026-09-24T13:00:00',
        kind: 'LESSON',
        title: '3ª A · Tecnologia',
        sectionId: 'section-3a',
        disciplineId: 'technology',
        timetableVersionId: 'tt-v1',
        timetableSlotId: 'slot-1',
        calendarEventId: null,
        calendarState: 'UNDETERMINED',
        exceptionState: 'NONE',
        provenance: ['timetable_version:tt-v1', 'timetable_slot:slot-1'],
      },
    ],
    events: [],
  }
}

test('a real upcoming lesson prevents an empty Planner state from becoming the Today focus', () => {
  const projection = buildTodayProjection({
    localDate,
    nowMinutes: 8 * 60 + 25,
    temporalDay: temporalDay(),
    tasks: [],
  })

  assert.equal(projection.focus?.kind, 'TEMPORAL')
  if (projection.focus?.kind === 'TEMPORAL') {
    assert.equal(projection.focus.title, '3ª A · Tecnologia')
    assert.equal(projection.focus.startAt, '2026-09-24T12:00:00')
  }
  assert.equal(projection.moment, 'BEFORE_LESSON')
})

test('Planner is a fallback focus when the professional day has no temporal occurrence', () => {
  const projection = buildTodayProjection({
    localDate,
    nowMinutes: 9 * 60,
    temporalDay: null,
    tasks: [task({ title: 'Correggi verifiche', plannedFor: localDate, priority: 'HIGH' })],
  })

  assert.equal(projection.focus?.kind, 'PLANNER')
  if (projection.focus?.kind === 'PLANNER') assert.equal(projection.focus.task.title, 'Correggi verifiche')
})

test('Planner classifications stay separate from the temporal timeline', () => {
  const projection = buildTodayProjection({
    localDate,
    nowMinutes: 9 * 60,
    temporalDay: temporalDay(),
    tasks: [
      task({ id: 'overdue', dueAt: '2026-09-23T10:00:00Z' }),
      task({ id: 'today', plannedFor: localDate }),
      task({ id: 'waiting', status: 'WAITING' }),
    ],
  })

  assert.equal(projection.timeline.length, 1)
  assert.equal(projection.planner.overdue.length, 1)
  assert.equal(projection.planner.today.length, 1)
  assert.equal(projection.planner.waiting.length, 1)
})
