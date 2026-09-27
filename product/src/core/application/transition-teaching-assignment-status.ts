import type { TeachingAssignment } from '@/core/domain/timetable'

type AssignmentStatus = 'PROVISIONAL' | 'CONFIRMED'

type AssignmentReader = {
  getById(workspaceId: string, academicYearId: string, assignmentId: string): Promise<TeachingAssignment | null>
}

type AssignmentStatusWriter = {
  setAssignmentStatus(input: {
    workspaceId: string
    academicYearId: string
    assignmentId: string
    expectedStatus: AssignmentStatus
    expectedUpdatedAt: string
    status: AssignmentStatus
  }): Promise<TeachingAssignment>
}

export async function transitionTeachingAssignmentStatus(input: {
  workspaceId: string
  academicYearId: string
  assignmentId: string
  expectedStatus: AssignmentStatus
  status: AssignmentStatus
  reader: AssignmentReader
  writer: AssignmentStatusWriter
}): Promise<TeachingAssignment> {
  const observed = await input.reader.getById(input.workspaceId, input.academicYearId, input.assignmentId)
  if (!observed || observed.status !== input.expectedStatus) throw new Error('STALE_CONFLICT')

  return input.writer.setAssignmentStatus({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    assignmentId: input.assignmentId,
    expectedStatus: input.expectedStatus,
    expectedUpdatedAt: observed.updatedAt,
    status: input.status,
  })
}
