import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyHvaBaselineProvisionPlan,
  buildHvaBaselineProvisionPlan,
} from './provision-hva-baseline.mjs'

function runtimeBase() {
  return {
    fingerprint: 'semantic-v0',
    snapshot: {
      timetable: {
        assignment: {
          class: '2A',
          discipline: 'Tecnologia',
          status: 'CONFIRMED',
          weeklyMinutes: 120,
          marker: 'HVA · Oggi · Cattedra canonica',
        },
      },
      calendar: null,
    },
    runtimeIds: {
      assignmentIds: ['assignment-1'],
      calendarEventIds: [],
      activeTimetableVersionId: 'active-v0',
    },
    persistentFixtureIntegrity: {
      status: 'PASS',
      errors: [],
      localDate: '2026-10-26',
    },
  }
}

test('apply rejects a provisioning plan whose SHA-256 receipt is missing before the first write', async () => {
  const runtime = runtimeBase()
  const signed = buildHvaBaselineProvisionPlan(runtime, { plannedAt: '2026-10-23T21:00:00.000Z' })
  const { planSha256: _removed, ...unsignedPlan } = signed
  let writes = 0

  const adapter = {
    async prepareCanonicalDraftTimetable() {
      writes += 1
      return { timetableVersionId: 'draft-v0' }
    },
    async createCanonicalMondaySlot() {
      writes += 1
    },
    async activateCanonicalTimetable() {
      writes += 1
    },
    async upsertCanonicalCalendarEvent() {
      writes += 1
    },
    async rollbackPreActivation() {},
  }

  await assert.rejects(
    applyHvaBaselineProvisionPlan({
      plan: unsignedPlan,
      readRuntime: async () => runtime,
      adapter,
    }),
    /SHA-256|required/i,
  )
  assert.equal(writes, 0)
})
