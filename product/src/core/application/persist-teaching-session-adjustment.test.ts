import assert from 'node:assert/strict'
import test from 'node:test'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { TeachingSessionAllocationRecord, TeachingSessionRecord } from '@/core/domain/teaching-session'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { persistTeachingSessionAdjustment } from './persist-teaching-session-adjustment'

const session: TeachingSessionRecord = {
  id: 'session-1', workspaceId: 'workspace-1', academicYearId: 'year-1', sectionId: 'section-1', disciplineId: null,
  localDate: '2026-09-17', plannedStartAt: null, plannedEndAt: null, plannedMinutes: 60, actualMinutes: 60,
  evidenceNote: null,
  source: { sourceKind: 'MANUAL', projectedOccurrenceLogicalId: null, timetableVersionId: null, timetableSlotId: null, calendarState: null, provenance: [] },
  supersedesSessionId: null, recordedBy: 'teacher-1', recordedAt: '2026-09-17T10:00:00Z',
}
const allocation: TeachingSessionAllocationRecord = {
  id: 'allocation-1', sessionId: session.id, blockId: 'B01', minutes: 60,
  canonicalPlanAssetId: 'plan-1', canonicalGenerationId: 'generation-1', createdAt: '2026-09-17T10:00:00Z',
}
const projection = { projectionId: 'HTC-PRIMA-B01-v3', grade: 'Prima', blockId: 'B01' } as HumanTaskLessonProjection

function extension(id: string): LessonDesignExtension {
  return {
    id, workspaceId: session.workspaceId, academicYearId: session.academicYearId, sectionId: session.sectionId,
    canonicalPlanAssetId: allocation.canonicalPlanAssetId, canonicalGenerationId: allocation.canonicalGenerationId,
    blockId: allocation.blockId, projectionId: projection.projectionId, kind: 'TEACHING_ADJUSTMENT', status: 'PROPOSED',
    insertionPosition: 'END', anchorStepId: null, title: 'Riflessione da riesaminare', body: 'Riprendere con un esempio.', cue: null,
    minutes: null, sourceKind: 'TEACHER', sourceRef: session.id, sourceLabel: 'Riflessione post-lezione', payload: {}, revision: 1,
    decisionHistory: [], modifiedBy: null, modifiedAt: null, acceptedBy: null, acceptedAt: null, dismissedBy: null, dismissedAt: null,
    createdBy: 'teacher-1', createdAt: '2026-09-17T10:01:00Z', updatedAt: '2026-09-17T10:01:00Z',
  }
}

test('persists through the idempotent lesson-design boundary with authoritative context', async () => {
  const calls: Array<{ key: string; kind: string; sourceRef: string | null }> = []
  const result = await persistTeachingSessionAdjustment({
    workspaceId: session.workspaceId, academicYearId: session.academicYearId, teachingSessionId: session.id,
    blockId: 'B01', projection, body: 'Riprendere con un esempio.',
  }, {
    teaching: { async getById() { return { sessions: [session], allocations: [allocation] } } },
    lessonDesign: {
      async addToolProposalOnce(_context, draft, key) {
        calls.push({ key, kind: draft.kind, sourceRef: draft.sourceRef })
        return extension('extension-1')
      },
    },
  })

  assert.equal(result.id, 'extension-1')
  assert.deepEqual(calls, [{
    key: `teaching-adjustment:${session.id}:${projection.projectionId}`,
    kind: 'TEACHING_ADJUSTMENT',
    sourceRef: session.id,
  }])
})

test('rejects a missing or cross-context teaching session before persistence', async () => {
  let writes = 0
  await assert.rejects(() => persistTeachingSessionAdjustment({
    workspaceId: 'workspace-other', academicYearId: session.academicYearId, teachingSessionId: session.id,
    blockId: 'B01', projection, body: 'Non deve essere scritto.',
  }, {
    teaching: { async getById() { return null } },
    lessonDesign: { async addToolProposalOnce() { writes += 1; return extension('never') } },
  }), /outside the active context/)
  assert.equal(writes, 0)
})
