import {
  validateTeachingSessionAllocations,
  type TeachingSessionAllocationContext,
  type TeachingSessionAllocationDraft,
  type TeachingSessionDraft,
} from '@/core/domain/teaching-session'

export type TeachingSessionWriter = {
  record(input: {
    workspaceId: string
    academicYearId: string
    session: TeachingSessionDraft
    supersedesSessionId?: string | null
    allocations: TeachingSessionAllocationDraft[]
  }): Promise<string>
}

export type RecordTeachingSessionInput = {
  workspaceId: string
  academicYearId: string
  session: TeachingSessionDraft
  allocations: TeachingSessionAllocationDraft[]
  allocationContext: TeachingSessionAllocationContext
  supersedesSessionId?: string | null
}

export type TeachingSessionReceipt = {
  teachingSessionId: string
  allocatedMinutes: number
  unallocatedMinutes: number
}

export async function recordTeachingSession(
  input: RecordTeachingSessionInput,
  writer: TeachingSessionWriter,
): Promise<TeachingSessionReceipt> {
  if (!input.workspaceId.trim()) throw new Error('workspaceId required')
  if (!input.academicYearId.trim()) throw new Error('academicYearId required')

  const validation = validateTeachingSessionAllocations({
    session: input.session,
    allocations: input.allocations,
    context: input.allocationContext,
  })
  if (!validation.valid) {
    throw new Error(`Invalid teaching session registration: ${validation.codes.join(', ')}`)
  }

  const teachingSessionId = await writer.record({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    session: input.session,
    supersedesSessionId: input.supersedesSessionId ?? null,
    allocations: input.allocations,
  })

  if (!teachingSessionId.trim()) throw new Error('TeachingSession writer returned an empty receipt')

  return {
    teachingSessionId,
    allocatedMinutes: validation.allocatedMinutes,
    unallocatedMinutes: validation.unallocatedMinutes,
  }
}
