import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { recordTeachingSessionWithEvidence, type TeachingSessionEvidenceWriter } from './record-teaching-session-with-evidence'
import type { TeachingSessionDraft } from '@/core/domain/teaching-session'

const session: TeachingSessionDraft = {
  sectionId: 'section-1',
  disciplineId: 'discipline-1',
  localDate: '2026-09-14',
  plannedStartAt: null,
  plannedEndAt: null,
  plannedMinutes: 60,
  actualMinutes: 55,
  evidenceNote: null,
  source: {
    sourceKind: 'MANUAL',
    projectedOccurrenceLogicalId: null,
    timetableVersionId: null,
    timetableSlotId: null,
    calendarState: null,
    provenance: ['registration_key:11111111-1111-4111-8111-111111111111'],
  },
}

const allocationContext = {
  sectionId: 'section-1',
  canonicalPlanAssetId: 'asset-1',
  canonicalGenerationId: 'generation-1',
}

test('records one coherent receipt for session, observations and evidence', async () => {
  let calls = 0
  const writer: TeachingSessionEvidenceWriter = {
    async record(input) {
      calls += 1
      assert.equal(input.observations[0]?.draftKey, 'autonomy')
      assert.deepEqual(input.evidenceReferences[0]?.observationDraftKeys, ['autonomy'])
      return {
        teachingSessionId: 'session-1',
        observationIds: ['observation-1'],
        evidenceReferenceIds: ['evidence-1'],
      }
    },
  }

  const receipt = await recordTeachingSessionWithEvidence({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    session,
    allocations: [{
      blockId: 'B01',
      minutes: 50,
      canonicalPlanAssetId: 'asset-1',
      canonicalGenerationId: 'generation-1',
    }],
    allocationContext,
    observations: [{
      draftKey: 'autonomy',
      scope: 'CLASS',
      anonymousGroupKey: null,
      dimensionKey: 'AUTONOMY',
      state: 'DEVELOPING',
      note: null,
      source: 'TEACHER_QUICK_MARK',
    }],
    evidenceReferences: [{
      kind: 'QUICK_CHECK',
      description: 'Exit ticket',
      observationDraftKeys: ['autonomy'],
      knowledgeAssetId: null,
      externalReference: null,
    }],
  }, writer)

  assert.equal(calls, 1)
  assert.equal(receipt.teachingSessionId, 'session-1')
  assert.equal(receipt.allocatedMinutes, 50)
  assert.equal(receipt.unallocatedMinutes, 5)
  assert.equal(receipt.observationCount, 1)
  assert.equal(receipt.evidenceReferenceCount, 1)
})

test('invalid evidence fails before the writer is called', async () => {
  let called = false
  const writer: TeachingSessionEvidenceWriter = {
    async record() {
      called = true
      throw new Error('must not be called')
    },
  }

  await assert.rejects(
    recordTeachingSessionWithEvidence({
      workspaceId: 'workspace-1',
      academicYearId: 'year-1',
      session,
      allocations: [],
      allocationContext,
      observations: [],
      evidenceReferences: [{
        kind: 'OTHER',
        description: '',
        observationDraftKeys: [],
        knowledgeAssetId: null,
        externalReference: null,
      }],
    }, writer),
    /EVIDENCE_DESCRIPTION_REQUIRED/,
  )
  assert.equal(called, false)
})

test('receipt cardinality mismatch fails closed', async () => {
  const writer: TeachingSessionEvidenceWriter = {
    async record() {
      return { teachingSessionId: 'session-1', observationIds: [], evidenceReferenceIds: [] }
    },
  }

  await assert.rejects(
    recordTeachingSessionWithEvidence({
      workspaceId: 'workspace-1',
      academicYearId: 'year-1',
      session,
      allocations: [],
      allocationContext,
      observations: [{
        draftKey: 'method',
        scope: 'CLASS',
        anonymousGroupKey: null,
        dimensionKey: 'WORK_METHOD',
        state: 'CONSOLIDATED',
        note: null,
        source: 'TEACHER_QUICK_MARK',
      }],
      evidenceReferences: [],
    }, writer),
    /inconsistent observation receipt/,
  )
})

const replayHardeningSql = readFileSync(
  new URL('../../../supabase/migrations/0055_teaching_evidence_replay_hardening.sql', import.meta.url),
  'utf8',
)

test('TE-1A replay validates the complete TeachingSession payload before evidence replay', () => {
  const lockIndex = replayHardeningSql.indexOf('pg_advisory_xact_lock')
  const baseBoundaryIndex = replayHardeningSql.indexOf('session_id := public.record_teaching_session')
  const evidenceReceiptIndex = replayHardeningSql.indexOf('from public.teaching_session_evidence_receipts')

  assert.ok(lockIndex >= 0, 'same registration key retries must be transaction-serialized')
  assert.ok(baseBoundaryIndex > lockIndex, 'base session boundary must run after the retry lock')
  assert.ok(
    evidenceReceiptIndex > baseBoundaryIndex,
    'evidence receipt replay must happen only after the base session signature is validated',
  )
  assert.equal(replayHardeningSql.includes('existing_session_id'), false, 'no pre-base replay bypass may exist')
})

test('TE-1A keeps atomic and legacy registration paths signature-distinct', () => {
  assert.match(replayHardeningSql, /teaching_evidence_atomic:v1/)
  assert.match(replayHardeningSql, /teaching evidence atomic provenance marker is reserved/)
})

test('evidence links decode JSON string draft keys before lookup', () => {
  assert.match(replayHardeningSql, /jsonb_array_elements_text/)
  assert.equal(replayHardeningSql.includes("trim(both '\"' from linked_draft_key::text)"), false)
})
