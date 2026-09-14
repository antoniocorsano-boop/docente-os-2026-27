import assert from 'node:assert/strict'
import test from 'node:test'
import { recordTeachingSession, type TeachingSessionWriter } from './record-teaching-session'
import type { TeachingSessionDraft } from '@/core/domain/teaching-session'

const session: TeachingSessionDraft = {
  sectionId: 'section-2c',
  disciplineId: 'discipline-tech',
  localDate: '2026-09-14',
  plannedStartAt: null,
  plannedEndAt: null,
  plannedMinutes: 60,
  actualMinutes: 55,
  evidenceNote: 'Attività svolta con verifica rapida finale.',
  source: {
    sourceKind: 'MANUAL',
    projectedOccurrenceLogicalId: null,
    timetableVersionId: null,
    timetableSlotId: null,
    calendarState: null,
    provenance: ['lesson_workspace:section-2c:B01'],
  },
}

const allocation = {
  blockId: 'B01',
  minutes: 55,
  canonicalPlanAssetId: 'asset-tech-2',
  canonicalGenerationId: 'generation-tech-2',
}

const allocationContext = {
  sectionId: 'section-2c',
  canonicalPlanAssetId: 'asset-tech-2',
  canonicalGenerationId: 'generation-tech-2',
}

test('records through the shared writer and returns the authoritative receipt', async () => {
  const calls: Parameters<TeachingSessionWriter['record']>[0][] = []
  const writer: TeachingSessionWriter = {
    async record(input) {
      calls.push(input)
      return 'session-receipt-1'
    },
  }

  const receipt = await recordTeachingSession({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    session,
    allocations: [allocation],
    allocationContext,
  }, writer)

  assert.equal(calls.length, 1)
  assert.equal(calls[0]?.session.sectionId, 'section-2c')
  assert.equal(calls[0]?.allocations[0]?.blockId, 'B01')
  assert.deepEqual(receipt, {
    teachingSessionId: 'session-receipt-1',
    allocatedMinutes: 55,
    unallocatedMinutes: 0,
  })
})

test('rejects invalid allocation before the writer is called', async () => {
  let called = false
  const writer: TeachingSessionWriter = {
    async record() {
      called = true
      return 'unexpected'
    },
  }

  await assert.rejects(
    recordTeachingSession({
      workspaceId: 'workspace-1',
      academicYearId: 'year-1',
      session,
      allocations: [{ ...allocation, minutes: 56 }],
      allocationContext,
    }, writer),
    /ALLOCATION_EXCEEDS_SESSION/,
  )
  assert.equal(called, false)
})

test('supports authoritative sessions with no canonical allocation', async () => {
  const writer: TeachingSessionWriter = {
    async record() {
      return 'diagnostic-session'
    },
  }

  const receipt = await recordTeachingSession({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    session: { ...session, evidenceNote: 'Accoglienza diagnostica.' },
    allocations: [],
    allocationContext,
  }, writer)

  assert.equal(receipt.teachingSessionId, 'diagnostic-session')
  assert.equal(receipt.allocatedMinutes, 0)
  assert.equal(receipt.unallocatedMinutes, 55)
})
