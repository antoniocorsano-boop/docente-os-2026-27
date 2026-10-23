import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyHvaBaselineProvisionPlan,
  buildHvaBaselineProvisionPlan,
} from './provision-hva-baseline.mjs'

const BASELINE_ID = 'HVA-GOV-01/v1'

function runtimeBase() {
  return {
    fingerprint: 'semantic-v0',
    snapshot: {
      baseline: BASELINE_ID,
      canonicalNow: '2026-11-02T08:30:00+01:00',
      timetable: {
        effectiveFrom: '2026-09-28',
        date: '2026-11-02',
        assignment: {
          class: '2A',
          discipline: 'Tecnologia',
          status: 'CONFIRMED',
          weeklyMinutes: 120,
          marker: 'HVA · Oggi · Cattedra canonica',
        },
        lessons: [{ start: '08:00', end: '09:00' }],
      },
      calendar: null,
      diagnostics: {
        activeVersionIds: ['active-v0'],
        assignmentIds: ['assignment-1'],
        mondayLessonIds: ['active-slot-08'],
        priorLessonIds: [],
        currentLessonIds: ['active-slot-08'],
        calendarEventIds: [],
        recordedPriorSessionIds: [],
        invalidLessonBindingIds: [],
        canonicalDisciplineActive: true,
      },
    },
    runtimeIds: {
      workspaceId: 'workspace-1',
      academicYearId: 'year-1',
      activeTimetableVersionId: 'active-v0',
      activeTimetableVersionIds: ['active-v0'],
      assignmentIds: ['assignment-1'],
      mondayLessonIds: ['active-slot-08'],
      calendarEventIds: [],
      baselineErrorCount: 3,
    },
    persistentFixtureIntegrity: {
      status: 'PASS',
      errors: [],
      sessionId: 'session-b01',
      sourceTimetableVersionId: 'active-v0',
      sourceTimetableSlotId: 'slot-b01',
      localDate: '2026-10-26',
    },
    provisioning: {
      activeVersions: [
        {
          id: 'active-v0',
          status: 'ACTIVE',
          effectiveFrom: '2026-09-28',
          effectiveTo: null,
        },
      ],
      draftVersions: [
        {
          id: 'draft-v0',
          status: 'DRAFT',
          effectiveFrom: '2026-09-28',
          effectiveTo: null,
        },
      ],
      draftSlots: [
        {
          id: 'draft-slot-08',
          weekday: 1,
          start: '08:00',
          end: '09:00',
          slotKind: 'LESSON',
          teachingAssignmentId: 'assignment-1',
        },
      ],
      incompatiblePersistentState: [],
    },
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function noopAdapter(overrides = {}) {
  return {
    async ensureCanonicalAssignment() {
      return { assignmentId: 'assignment-1' }
    },
    async prepareCanonicalDraftTimetable() {
      return { timetableVersionId: 'draft-v0' }
    },
    async createCanonicalMondaySlot(operation) {
      return { slotId: operation.start === '07:00' ? 'slot-07' : 'slot-08-new' }
    },
    async activateCanonicalTimetable() {
      return {
        active_version_id: 'draft-v0',
        archived_version_id: 'active-v0',
        next_draft_version_id: 'draft-next',
      }
    },
    async upsertCanonicalCalendarEvent() {
      return { calendarEventId: 'calendar-1' }
    },
    async rollbackPreActivation() {},
    ...overrides,
  }
}

function expectedPostRuntime() {
  const runtime = runtimeBase()
  runtime.fingerprint = 'expected-post-placeholder'
  runtime.provisioning = {
    ...runtime.provisioning,
    activeVersions: [{ id: 'draft-v0', status: 'ACTIVE', effectiveFrom: '2026-10-27', effectiveTo: null }],
    draftVersions: [{ id: 'draft-next', status: 'DRAFT', effectiveFrom: '2026-10-27', effectiveTo: null }],
  }
  return runtime
}

test('semantic lease includes DRAFT identity even when the baseline semantic fingerprint is unchanged', async () => {
  const pre = runtimeBase()
  const plan = buildHvaBaselineProvisionPlan(pre, { plannedAt: '2026-10-23T20:30:00.000Z' })
  const drifted = clone(pre)
  drifted.provisioning.draftVersions[0].id = 'draft-v-drifted'

  let writes = 0
  await assert.rejects(
    applyHvaBaselineProvisionPlan({
      plan,
      readRuntime: async () => drifted,
      adapter: noopAdapter({
        async prepareCanonicalDraftTimetable() {
          writes += 1
          return { timetableVersionId: 'draft-v-drifted' }
        },
      }),
    }),
    /semantic lease|preconditionFingerprint/i,
  )
  assert.equal(writes, 0)
})

test('planner fails closed unless exactly one editable DRAFT exists', () => {
  const none = runtimeBase()
  none.provisioning.draftVersions = []
  assert.throws(
    () => buildHvaBaselineProvisionPlan(none, { plannedAt: '2026-10-23T20:30:00.000Z' }),
    /exactly one.*DRAFT|DRAFT.*exactly one/i,
  )

  const duplicate = runtimeBase()
  duplicate.provisioning.draftVersions.push({
    id: 'draft-v1',
    status: 'DRAFT',
    effectiveFrom: '2026-10-27',
    effectiveTo: null,
  })
  assert.throws(
    () => buildHvaBaselineProvisionPlan(duplicate, { plannedAt: '2026-10-23T20:30:00.000Z' }),
    /exactly one.*DRAFT|DRAFT.*exactly one/i,
  )
})

test('planner fails closed when the governed 07:00-08:00 DRAFT interval is occupied', () => {
  const runtime = runtimeBase()
  runtime.provisioning.draftSlots.push({
    id: 'conflict-07',
    weekday: 1,
    start: '07:15',
    end: '07:45',
    slotKind: 'OTHER',
    teachingAssignmentId: null,
  })

  assert.throws(
    () => buildHvaBaselineProvisionPlan(runtime, { plannedAt: '2026-10-23T20:30:00.000Z' }),
    /07:00|occupied|overlap/i,
  )
})

test('planner fails closed when incompatible persistent state appears in 27-Oct through 8-Nov', () => {
  const runtime = runtimeBase()
  runtime.provisioning.incompatiblePersistentState = [
    { kind: 'TEACHING_SESSION', id: 'future-session-1', localDate: '2026-11-02' },
  ]

  assert.throws(
    () => buildHvaBaselineProvisionPlan(runtime, { plannedAt: '2026-10-23T20:30:00.000Z' }),
    /persistent state|27-Oct|8-Nov|incompatible/i,
  )
})

test('pre-activation failure invokes rollback, while post-activation failure never auto-rolls back', async () => {
  const pre = runtimeBase()
  const plan = buildHvaBaselineProvisionPlan(pre, { plannedAt: '2026-10-23T20:30:00.000Z' })

  let preRollback = 0
  await assert.rejects(
    applyHvaBaselineProvisionPlan({
      plan,
      readRuntime: async () => pre,
      adapter: noopAdapter({
        async createCanonicalMondaySlot(operation) {
          if (operation.start === '08:00') throw new Error('synthetic pre-activation failure')
          return { slotId: 'slot-07' }
        },
        async rollbackPreActivation() {
          preRollback += 1
        },
      }),
    }),
    /synthetic pre-activation failure/,
  )
  assert.equal(preRollback, 1)

  let postRollback = 0
  await assert.rejects(
    applyHvaBaselineProvisionPlan({
      plan,
      readRuntime: async () => pre,
      adapter: noopAdapter({
        async upsertCanonicalCalendarEvent() {
          throw new Error('synthetic post-activation failure')
        },
        async rollbackPreActivation() {
          postRollback += 1
        },
      }),
    }),
    /synthetic post-activation failure/,
  )
  assert.equal(postRollback, 0)
})
