import assert from 'node:assert/strict'
import test from 'node:test'
import { recordTeachingSession, type TeachingSessionWriter } from './record-teaching-session'
import type { TeachingSessionDraft } from '@/core/domain/teaching-session'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'

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

test('civic writes never fall back to the historical RPC when the civic wrapper is missing', async (t) => {
  const previousCompatibility = process.env.DOCENTE_OS_CIVIC_SCHEMA_COMPAT
  process.env.DOCENTE_OS_CIVIC_SCHEMA_COMPAT = 'previous'
  t.after(() => {
    if (previousCompatibility === undefined) delete process.env.DOCENTE_OS_CIVIC_SCHEMA_COMPAT
    else process.env.DOCENTE_OS_CIVIC_SCHEMA_COMPAT = previousCompatibility
  })

  const rpcCalls: string[] = []
  const client = {
    rpc: async (name: string) => {
      rpcCalls.push(name)
      if (name === 'record_teaching_session_with_civic_contribution') {
        return {
          data: null,
          error: {
            code: 'PGRST202',
            message: 'Could not find the function public.record_teaching_session_with_civic_contribution in the schema cache',
          },
        }
      }
      return { data: 'legacy-session-id', error: null }
    },
    from: () => {
      throw new Error('read path must not be used by record')
    },
  }

  const repository = new SupabaseTeachingSessionRepository(async () => client)

  await assert.rejects(
    () => repository.record({
      workspaceId: 'workspace-1',
      academicYearId: 'academic-year-2026',
      session: {
        ...session,
        civicEducation: {
          minutes: 20,
          evidenceNote: 'Sostenibilità e uso responsabile delle risorse',
        },
      },
      allocations: [],
    }),
    /record_teaching_session_with_civic_contribution/,
  )
  assert.deepEqual(rpcCalls, ['record_teaching_session_with_civic_contribution'])
})
