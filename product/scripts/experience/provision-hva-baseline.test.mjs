import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  HVA_EXPECTED_BASELINE_SNAPSHOT,
  fingerprintHvaBaselineSnapshot,
} from '../../e2e/support/hva-governed-baseline-contract.mjs'
import {
  applyHvaBaselineProvisionPlan,
  buildHvaBaselineProvisionPlan,
  parseProvisionArgs,
  runHvaBaselineProvisioning,
} from './provision-hva-baseline.mjs'

const BASELINE_ID = 'HVA-GOV-01/v1'
const EXPECTED_POST_FINGERPRINT = fingerprintHvaBaselineSnapshot(HVA_EXPECTED_BASELINE_SNAPSHOT)

function baselineV0Runtime({ assignment = true } = {}) {
  return {
    fingerprint: 'baseline-v0-fingerprint',
    snapshot: {
      baseline: BASELINE_ID,
      canonicalNow: '2026-11-02T08:30:00+01:00',
      timetable: {
        effectiveFrom: '2026-09-28',
        date: '2026-11-02',
        assignment: assignment ? {
          class: '2A',
          discipline: 'Tecnologia',
          status: 'CONFIRMED',
          weeklyMinutes: 120,
          marker: 'HVA · Oggi · Cattedra canonica',
        } : null,
        lessons: [{ start: '08:00', end: '09:00' }],
      },
      calendar: null,
      diagnostics: {
        activeVersionIds: ['active-v0'],
        assignmentIds: assignment ? ['assignment-1'] : [],
        mondayLessonIds: ['slot-08'],
        priorLessonIds: [],
        currentLessonIds: ['slot-08'],
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
      assignmentIds: assignment ? ['assignment-1'] : [],
      mondayLessonIds: ['slot-08'],
      calendarEventIds: [],
      baselineErrorCount: assignment ? 3 : 7,
    },
    persistentFixtureIntegrity: {
      status: 'PASS',
      errors: [],
      sessionId: 'session-b01',
      sourceTimetableVersionId: 'active-v0',
      sourceTimetableSlotId: 'slot-b01',
      localDate: '2026-10-26',
    },
  }
}

function expectedRuntime({ fixtureStatus = 'PASS' } = {}) {
  return {
    fingerprint: EXPECTED_POST_FINGERPRINT,
    snapshot: HVA_EXPECTED_BASELINE_SNAPSHOT,
    runtimeIds: {
      workspaceId: 'workspace-1',
      academicYearId: 'year-1',
      activeTimetableVersionId: 'active-v1',
      activeTimetableVersionIds: ['active-v1'],
      assignmentIds: ['assignment-1'],
      mondayLessonIds: ['slot-07', 'slot-08-new'],
      calendarEventIds: ['calendar-1'],
      baselineErrorCount: 0,
    },
    persistentFixtureIntegrity: fixtureStatus === 'PASS'
      ? {
          status: 'PASS',
          errors: [],
          sessionId: 'session-b01',
          sourceTimetableVersionId: 'active-v0',
          sourceTimetableSlotId: 'slot-b01',
          localDate: '2026-10-26',
        }
      : {
          status: 'FAIL',
          errors: ['historic B01 provenance no longer resolves'],
        },
  }
}

function mutationRecorder() {
  const calls = []
  return {
    calls,
    adapter: {
      async ensureCanonicalAssignment(operation) {
        calls.push(['ensureCanonicalAssignment', operation])
        return { assignmentId: 'assignment-1' }
      },
      async prepareCanonicalDraftTimetable(operation) {
        calls.push(['prepareCanonicalDraftTimetable', operation])
        return { timetableVersionId: 'draft-v1' }
      },
      async createCanonicalMondaySlot(operation, context) {
        calls.push(['createCanonicalMondaySlot', operation, context])
        return { slotId: operation.start === '07:00' ? 'slot-07' : 'slot-08-new' }
      },
      async activateCanonicalTimetable(operation, context) {
        calls.push(['activateCanonicalTimetable', operation, context])
        return {
          active_version_id: 'draft-v1',
          archived_version_id: 'active-v0',
          next_draft_version_id: 'draft-next',
        }
      },
      async upsertCanonicalCalendarEvent(operation) {
        calls.push(['upsertCanonicalCalendarEvent', operation])
        return { calendarEventId: 'calendar-1' }
      },
    },
  }
}

test('apply requires the exact governed confirmation and a durable plan path', () => {
  assert.throws(
    () => parseProvisionArgs(['--apply', '--plan', 'plan.json']),
    /--confirm HVA-GOV-01\/v1/,
  )
  assert.throws(
    () => parseProvisionArgs(['--apply', '--plan', 'plan.json', '--confirm', 'HVA-GOV-01/v0']),
    /--confirm HVA-GOV-01\/v1/,
  )
  assert.throws(
    () => parseProvisionArgs(['--apply', '--confirm', BASELINE_ID]),
    /--plan/,
  )

  assert.deepEqual(
    parseProvisionArgs(['--apply', '--plan', 'plan.json', '--confirm', BASELINE_ID]),
    { mode: 'apply', planPath: 'plan.json', confirm: BASELINE_ID },
  )
})

test('dry-run computes the exact baseline-v0 changes, writes only the plan receipt, and performs no mutation', async () => {
  const runtime = baselineV0Runtime()
  let writtenPlan = null
  const writes = []

  const result = await runHvaBaselineProvisioning({
    argv: [],
    readRuntime: async () => runtime,
    writePlan: async (_path, plan) => {
      writtenPlan = plan
      writes.push('plan')
    },
    createMutationAdapter: async () => {
      throw new Error('dry-run must not construct a mutation adapter')
    },
    now: () => '2026-10-23T20:30:00.000Z',
  })

  assert.equal(result.status, 'DRY_RUN')
  assert.equal(result.plan.baselineId, BASELINE_ID)
  assert.equal(result.plan.plannedAt, '2026-10-23T20:30:00.000Z')
  assert.equal(result.plan.preconditionFingerprint, runtime.fingerprint)
  assert.equal(result.plan.expectedPostFingerprint, EXPECTED_POST_FINGERPRINT)
  assert.deepEqual(result.plan.operations.map((operation) => operation.kind), [
    'PREPARE_TIMETABLE_DRAFT',
    'CREATE_MONDAY_SLOT',
    'CREATE_MONDAY_SLOT',
    'ACTIVATE_TIMETABLE',
    'UPSERT_CALENDAR_EVENT',
  ])
  assert.deepEqual(
    result.plan.operations.filter((operation) => operation.kind === 'CREATE_MONDAY_SLOT')
      .map(({ start, end }) => `${start}-${end}`),
    ['07:00-08:00', '08:00-09:00'],
  )
  assert.deepEqual(writes, ['plan'])
  assert.deepEqual(writtenPlan, result.plan)
})

test('planner includes canonical assignment repair only when assignment semantics require it', () => {
  const plan = buildHvaBaselineProvisionPlan(baselineV0Runtime({ assignment: false }), {
    plannedAt: '2026-10-23T20:30:00.000Z',
  })
  assert.equal(plan.operations[0].kind, 'ENSURE_ASSIGNMENT')
  assert.equal(plan.operations.filter((operation) => operation.kind === 'ENSURE_ASSIGNMENT').length, 1)
})

test('apply executes assignment, DRAFT, both Monday slots, activation RPC and one Calendar upsert', async () => {
  const pre = baselineV0Runtime({ assignment: false })
  const post = expectedRuntime()
  const plan = buildHvaBaselineProvisionPlan(pre, { plannedAt: '2026-10-23T20:30:00.000Z' })
  const { calls, adapter } = mutationRecorder()
  let reads = 0

  const result = await applyHvaBaselineProvisionPlan({
    plan,
    readRuntime: async () => (reads++ === 0 ? pre : post),
    adapter,
  })

  assert.equal(result.status, 'APPLIED')
  assert.deepEqual(calls.map(([name]) => name), [
    'ensureCanonicalAssignment',
    'prepareCanonicalDraftTimetable',
    'createCanonicalMondaySlot',
    'createCanonicalMondaySlot',
    'activateCanonicalTimetable',
    'upsertCanonicalCalendarEvent',
  ])
  const activation = calls.find(([name]) => name === 'activateCanonicalTimetable')
  assert.equal(activation[2].timetableVersionId, 'draft-v1')
  assert.equal(result.postRuntime.persistentFixtureIntegrity.status, 'PASS')
  assert.equal(result.postRuntime.persistentFixtureIntegrity.localDate, '2026-10-26')
})

test('replaying the same approved plan after a successful apply returns NOOP without writes', async () => {
  const pre = baselineV0Runtime()
  const post = expectedRuntime()
  const plan = buildHvaBaselineProvisionPlan(pre, { plannedAt: '2026-10-23T20:30:00.000Z' })
  const first = mutationRecorder()
  let reads = 0
  await applyHvaBaselineProvisionPlan({
    plan,
    readRuntime: async () => (reads++ === 0 ? pre : post),
    adapter: first.adapter,
  })

  const replay = mutationRecorder()
  const result = await applyHvaBaselineProvisionPlan({
    plan,
    readRuntime: async () => post,
    adapter: replay.adapter,
  })

  assert.equal(result.status, 'NOOP')
  assert.equal(replay.calls.length, 0)
})

test('apply refuses semantic lease drift before constructing any mutation', async () => {
  const pre = baselineV0Runtime()
  const plan = buildHvaBaselineProvisionPlan(pre, { plannedAt: '2026-10-23T20:30:00.000Z' })
  const drifted = { ...pre, fingerprint: 'unexpected-live-drift' }
  const recorder = mutationRecorder()

  await assert.rejects(
    applyHvaBaselineProvisionPlan({
      plan,
      readRuntime: async () => drifted,
      adapter: recorder.adapter,
    }),
    /preconditionFingerprint|semantic lease/i,
  )
  assert.equal(recorder.calls.length, 0)
})

test('apply fails closed if activation breaks the historical 26-Oct recorded-lesson provenance', async () => {
  const pre = baselineV0Runtime()
  const post = expectedRuntime({ fixtureStatus: 'FAIL' })
  const plan = buildHvaBaselineProvisionPlan(pre, { plannedAt: '2026-10-23T20:30:00.000Z' })
  const recorder = mutationRecorder()
  let reads = 0

  await assert.rejects(
    applyHvaBaselineProvisionPlan({
      plan,
      readRuntime: async () => (reads++ === 0 ? pre : post),
      adapter: recorder.adapter,
    }),
    /historical|fixture|provenance/i,
  )
})

test('provisioner source contains no password sign-in, service-role, or admin client flow', async () => {
  const source = await readFile(new URL('./provision-hva-baseline.mjs', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /signInWithPassword/)
  assert.doesNotMatch(source, /service[_-]?role/i)
  assert.doesNotMatch(source, /auth\.admin/i)
  assert.doesNotMatch(source, /createClient\s*\(/)
})
