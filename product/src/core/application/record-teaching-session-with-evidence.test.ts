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

const nullBoundarySql = readFileSync(
  new URL('../../../supabase/migrations/0056_teaching_evidence_null_boundary.sql', import.meta.url),
  'utf8',
)

const atomicAuthorizationSql = readFileSync(
  new URL('../../../supabase/migrations/0057_teaching_evidence_atomic_authorization.sql', import.meta.url),
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

test('public TE-1A RPC rejects SQL NULL JSON payloads before private delegation', () => {
  const observationsGuard = nullBoundarySql.indexOf('target_observations is null')
  const evidenceGuard = nullBoundarySql.indexOf('target_evidence_references is null')
  const privateDelegate = nullBoundarySql.indexOf('return private.record_teaching_session_with_evidence')

  assert.ok(observationsGuard >= 0)
  assert.ok(evidenceGuard >= 0)
  assert.ok(privateDelegate > observationsGuard)
  assert.ok(privateDelegate > evidenceGuard)
  assert.match(nullBoundarySql, /set schema private/)
  assert.match(nullBoundarySql, /revoke all on function private\.record_teaching_session_with_evidence/)
})

test('reserved atomic provenance cannot be forged through the public TeachingSession RPC', () => {
  const baseWrapper = atomicAuthorizationSql.indexOf('create or replace function public.record_teaching_session(')
  const authorizationCheck = atomicAuthorizationSql.indexOf('from private.teaching_evidence_atomic_authorizations', baseWrapper)
  const privateBaseDelegate = atomicAuthorizationSql.indexOf('return private.record_teaching_session(', baseWrapper)
  const evidenceWrapper = atomicAuthorizationSql.indexOf('create or replace function public.record_teaching_session_with_evidence(')
  const authorizationInsert = atomicAuthorizationSql.indexOf('insert into private.teaching_evidence_atomic_authorizations', evidenceWrapper)
  const evidenceDelegate = atomicAuthorizationSql.indexOf('receipt := private.record_teaching_session_with_evidence', evidenceWrapper)
  const authorizationDelete = atomicAuthorizationSql.indexOf('delete from private.teaching_evidence_atomic_authorizations', evidenceDelegate)

  assert.match(atomicAuthorizationSql, /alter function public\.record_teaching_session[\s\S]*set schema private/)
  assert.match(atomicAuthorizationSql, /revoke all on private\.teaching_evidence_atomic_authorizations from public, anon, authenticated/)
  assert.match(atomicAuthorizationSql, /revoke all on function private\.record_teaching_session/)
  assert.match(atomicAuthorizationSql, /teaching evidence atomic provenance marker is reserved/)
  assert.ok(baseWrapper >= 0)
  assert.ok(authorizationCheck > baseWrapper, 'public base RPC must verify private transaction authority')
  assert.ok(privateBaseDelegate > authorizationCheck, 'public base RPC may delegate only after authorization check')
  assert.ok(authorizationInsert > evidenceWrapper, 'TE-1A wrapper must create private transaction authority')
  assert.ok(evidenceDelegate > authorizationInsert, 'private TE-1A implementation must run only after authorization')
  assert.ok(authorizationDelete > evidenceDelegate, 'transaction authority must be removed before the wrapper returns')
})
