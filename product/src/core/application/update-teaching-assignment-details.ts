import type { TeachingAssignment } from '@/core/domain/timetable'

type AssignmentReader = {
  getById(workspaceId: string, academicYearId: string, assignmentId: string): Promise<TeachingAssignment | null>
}

type AssignmentDetailsWriter = {
  updateAssignmentDetails(input: {
    workspaceId: string
    academicYearId: string
    assignmentId: string
    expectedUpdatedAt: string
    weeklyMinutes: number
  }): Promise<TeachingAssignment>
}

export async function updateTeachingAssignmentDetails(input: {
  workspaceId: string
  academicYearId: string
  assignmentId: string
  weeklyMinutes: number
  reader: AssignmentReader
  writer: AssignmentDetailsWriter
}): Promise<TeachingAssignment> {
  const observed = await input.reader.getById(input.workspaceId, input.academicYearId, input.assignmentId)
  if (!observed) throw new Error('STALE_CONFLICT')

  return input.writer.updateAssignmentDetails({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    assignmentId: input.assignmentId,
    expectedUpdatedAt: observed.updatedAt,
    weeklyMinutes: input.weeklyMinutes,
  })
}
