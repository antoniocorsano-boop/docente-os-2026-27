import assert from 'node:assert/strict'
import test from 'node:test'
import type { TeachingAssignment } from '@/core/domain/timetable'
import { transitionTeachingAssignmentStatus } from './transition-teaching-assignment-status'

function assignment(status: 'PROVISIONAL' | 'CONFIRMED', updatedAt = '2026-09-27T15:00:00.000Z'): TeachingAssignment {
  return {
    id: 'assignment-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-1',
    disciplineId: 'discipline-1',
    weeklyMinutes: 120,
    status,
    sourceNote: null,
    createdAt: '2026-09-27T14:00:00.000Z',
    updatedAt,
  }
}

test('confirm reads only the target assignment and forwards its observed revision to CAS', async () => {
  const observed = assignment('PROVISIONAL')
  const reads: unknown[][] = []
  const writes: unknown[] = []
  const result = await transitionTeachingAssignmentStatus({
    workspaceId: 'workspace-1', academicYearId: 'year-1', assignmentId: 'assignment-1', expectedStatus: 'PROVISIONAL', status: 'CONFIRMED',
    reader: { async getById(...args) { reads.push(args); return observed } },
    writer: { async setAssignmentStatus(input) { writes.push(input); return { ...observed, status: 'CONFIRMED' } } },
  })

  assert.deepEqual(reads, [['workspace-1', 'year-1', 'assignment-1']])
  assert.deepEqual(writes, [{ workspaceId: 'workspace-1', academicYearId: 'year-1', assignmentId: 'assignment-1', expectedStatus: 'PROVISIONAL', expectedUpdatedAt: observed.updatedAt, status: 'CONFIRMED' }])
  assert.equal(result.status, 'CONFIRMED')
})

test('unexpected observed status is stale and never reaches the writer', async () => {
  let writes = 0
  await assert.rejects(
    transitionTeachingAssignmentStatus({
      workspaceId: 'workspace-1', academicYearId: 'year-1', assignmentId: 'assignment-1', expectedStatus: 'PROVISIONAL', status: 'CONFIRMED',
      reader: { async getById() { return assignment('CONFIRMED') } },
      writer: { async setAssignmentStatus() { writes += 1; return assignment('CONFIRMED') } },
    }),
    /STALE_CONFLICT/,
  )
  assert.equal(writes, 0)
})

test('missing target assignment is stale and never reaches the writer', async () => {
  let writes = 0
  await assert.rejects(
    transitionTeachingAssignmentStatus({
      workspaceId: 'workspace-1', academicYearId: 'year-1', assignmentId: 'assignment-1', expectedStatus: 'CONFIRMED', status: 'PROVISIONAL',
      reader: { async getById() { return null } },
      writer: { async setAssignmentStatus() { writes += 1; return assignment('PROVISIONAL') } },
    }),
    /STALE_CONFLICT/,
  )
  assert.equal(writes, 0)
})

test('writer stale conflict is propagated after the observed revision has been supplied', async () => {
  const observed = assignment('PROVISIONAL', '2026-09-27T15:30:00.000Z')
  let receivedRevision: string | null = null
  await assert.rejects(
    transitionTeachingAssignmentStatus({
      workspaceId: 'workspace-1', academicYearId: 'year-1', assignmentId: 'assignment-1', expectedStatus: 'PROVISIONAL', status: 'CONFIRMED',
      reader: { async getById() { return observed } },
      writer: { async setAssignmentStatus(input) { receivedRevision = input.expectedUpdatedAt; throw new Error('Teaching assignment changed since it was loaded') } },
    }),
    /changed since it was loaded/,
  )
  assert.equal(receivedRevision, observed.updatedAt)
})
