import assert from 'node:assert/strict'
import test from 'node:test'
import type { TeachingSessionDraft } from '@/core/domain/teaching-session'
import { SupabaseTeachingSessionRepository } from './supabase-teaching-session-repository'

const civicSession: TeachingSessionDraft = {
  sectionId: 'section-2c',
  disciplineId: 'technology',
  localDate: '2026-10-28',
  plannedStartAt: '2026-10-28T09:00:00',
  plannedEndAt: '2026-10-28T10:00:00',
  plannedMinutes: 60,
  actualMinutes: 55,
  evidenceNote: 'Agricoltura come sistema tecnologico',
  civicEducation: {
    minutes: 20,
    evidenceNote: 'Sostenibilità e uso responsabile delle risorse',
  },
  source: {
    sourceKind: 'MANUAL',
    projectedOccurrenceLogicalId: null,
    timetableVersionId: null,
    timetableSlotId: null,
    calendarState: 'SCHOOL_DAY',
    provenance: ['manual:test'],
  },
}

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
      session: civicSession,
      allocations: [],
    }),
    /record_teaching_session_with_civic_contribution/,
  )
  assert.deepEqual(rpcCalls, ['record_teaching_session_with_civic_contribution'])
})
