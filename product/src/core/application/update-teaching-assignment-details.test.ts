import assert from 'node:assert/strict'
import test from 'node:test'
import type { TeachingAssignment } from '@/core/domain/timetable'
import { updateTeachingAssignmentDetails } from './update-teaching-assignment-details'

function assignment(updatedAt = '2026-09-27T16:00:00.000Z'): TeachingAssignment {
  return {
    id: 'assignment-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-1',
    disciplineId: 'discipline-1',
    weeklyMinutes: 120,
    status: 'CONFIRMED',
    sourceNote: null,
    createdAt: '2026-09-27T14:00:00.000Z',
    updatedAt,
  }
}

test('details update reads only the target and forwards the observed revision', async () => {
  const observed = assignment()
  const reads: unknown[][] = []
  const writes: unknown[] = []

  const result = await updateTeachingAssignmentDetails({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    assignmentId: 'assignment-1',
    weeklyMinutes: 180,
    reader: { async getById(...args) { reads.push(args); return observed } },
    writer: {
      async updateAssignmentDetails(input) {
        writes.push(input)
        return { ...observed, weeklyMinutes: input.weeklyMinutes }
      },
    },
  })

  assert.deepEqual(reads, [['workspace-1', 'year-1', 'assignment-1']])
  assert.deepEqual(writes, [{
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    assignmentId: 'assignment-1',
    expectedUpdatedAt: observed.updatedAt,
    weeklyMinutes: 180,
  }])
  assert.equal(result.weeklyMinutes, 180)
  assert.equal(result.status, 'CONFIRMED')
})

test('missing target is stale and never reaches the writer', async () => {
  let writes = 0
  await assert.rejects(
    updateTeachingAssignmentDetails({
      workspaceId: 'workspace-1',
      academicYearId: 'year-1',
      assignmentId: 'assignment-1',
      weeklyMinutes: 180,
      reader: { async getById() { return null } },
      writer: { async updateAssignmentDetails() { writes += 1; return assignment() } },
    }),
    /STALE_CONFLICT/,
  )
  assert.equal(writes, 0)
})

test('writer stale conflict is propagated after the observed revision is supplied', async () => {
  const observed = assignment('2026-09-27T16:30:00.000Z')
  let receivedRevision: string | null = null

  await assert.rejects(
    updateTeachingAssignmentDetails({
      workspaceId: 'workspace-1',
      academicYearId: 'year-1',
      assignmentId: 'assignment-1',
      weeklyMinutes: 180,
      reader: { async getById() { return observed } },
      writer: {
        async updateAssignmentDetails(input) {
          receivedRevision = input.expectedUpdatedAt
          throw new Error('Teaching assignment changed since it was loaded')
        },
      },
    }),
    /changed since it was loaded/,
  )
  assert.equal(receivedRevision, observed.updatedAt)
})

test('details writer receives no lifecycle state', async () => {
  const observed = assignment()
  let received: Record<string, unknown> | null = null

  await updateTeachingAssignmentDetails({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    assignmentId: 'assignment-1',
    weeklyMinutes: 150,
    reader: { async getById() { return observed } },
    writer: {
      async updateAssignmentDetails(input) {
        received = input
        return { ...observed, weeklyMinutes: input.weeklyMinutes }
      },
    },
  })

  assert.ok(received)
  assert.equal(Object.hasOwn(received, 'status'), false)
  assert.deepEqual(Object.keys(received).sort(), [
    'academicYearId',
    'assignmentId',
    'expectedUpdatedAt',
    'weeklyMinutes',
    'workspaceId',
  ])
})
