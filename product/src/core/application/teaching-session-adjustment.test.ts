import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTeachingSessionAdjustmentProposal } from './teaching-session-adjustment'
import type { TeachingSessionRecord, TeachingSessionAllocationRecord } from '@/core/domain/teaching-session'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'

const session: TeachingSessionRecord = {
  id: 'session-1',
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
  sectionId: 'section-1',
  disciplineId: null,
  localDate: '2026-09-17',
  plannedStartAt: null,
  plannedEndAt: null,
  plannedMinutes: null,
  actualMinutes: 60,
  evidenceNote: null,
  source: {
    sourceKind: 'MANUAL',
    projectedOccurrenceLogicalId: null,
    timetableVersionId: null,
    timetableSlotId: null,
    calendarState: null,
    provenance: [],
  },
  supersedesSessionId: null,
  recordedBy: 'teacher-1',
  recordedAt: '2026-09-17T10:00:00Z',
}

const allocation: TeachingSessionAllocationRecord = {
  id: 'allocation-1',
  sessionId: session.id,
  blockId: 'B01',
  minutes: 60,
  canonicalPlanAssetId: 'plan-1',
  canonicalGenerationId: 'generation-1',
  createdAt: '2026-09-17T10:00:00Z',
}

const projection = {
  projectionId: 'HTC-PRIMA-B01-v3',
  grade: 'Prima',
  blockId: 'B01',
} as HumanTaskLessonProjection

test('derives authoritative context and stable provenance from the teaching session allocation', () => {
  const first = buildTeachingSessionAdjustmentProposal({
    session,
    allocations: [allocation],
    blockId: 'b01',
    projection,
    body: 'Riprendere il concetto con un esempio concreto.',
  })
  const retry = buildTeachingSessionAdjustmentProposal({
    session,
    allocations: [allocation],
    blockId: 'B01',
    projection,
    body: 'Riprendere il concetto con un esempio concreto.',
  })

  assert.deepEqual(first, retry)
  assert.equal(first.context.workspaceId, session.workspaceId)
  assert.equal(first.context.academicYearId, session.academicYearId)
  assert.equal(first.context.sectionId, session.sectionId)
  assert.equal(first.context.canonicalPlanAssetId, allocation.canonicalPlanAssetId)
  assert.equal(first.context.canonicalGenerationId, allocation.canonicalGenerationId)
  assert.equal(first.context.projectionId, projection.projectionId)
  assert.equal(first.draft.kind, 'TEACHING_ADJUSTMENT')
  assert.equal(first.draft.sourceKind, 'TEACHER')
  assert.equal(first.draft.sourceRef, session.id)
  assert.equal(first.draft.payload.dedupeKey, first.dedupeKey)
})

test('rejects a block that was not allocated to the teaching session', () => {
  assert.throws(
    () => buildTeachingSessionAdjustmentProposal({
      session,
      allocations: [allocation],
      blockId: 'B02',
      projection: { ...projection, blockId: 'B02', projectionId: 'HTC-PRIMA-B02-v2' },
      body: 'Cambiare impostazione.',
    }),
    /not allocated/,
  )
})

test('rejects a projection that does not match the allocated block', () => {
  assert.throws(
    () => buildTeachingSessionAdjustmentProposal({
      session,
      allocations: [allocation],
      blockId: 'B01',
      projection: { ...projection, blockId: 'B02', projectionId: 'HTC-PRIMA-B02-v2' },
      body: 'Cambiare impostazione.',
    }),
    /does not match/,
  )
})
