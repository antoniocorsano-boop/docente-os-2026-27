import {
  validateTeachingSessionAllocations,
  type TeachingSessionAllocationContext,
  type TeachingSessionAllocationDraft,
  type TeachingSessionDraft,
} from '@/core/domain/teaching-session'
import {
  validateTeachingEvidenceDrafts,
  type TeachingEvidenceReferenceDraft,
  type TeachingObservationDraft,
} from '@/core/domain/teaching-evidence'

export type TeachingSessionEvidenceWriterReceipt = {
  teachingSessionId: string
  observationIds: string[]
  evidenceReferenceIds: string[]
}

export type TeachingSessionEvidenceWriter = {
  record(input: {
    workspaceId: string
    academicYearId: string
    session: TeachingSessionDraft
    allocations: TeachingSessionAllocationDraft[]
    supersedesSessionId?: string | null
    observations: TeachingObservationDraft[]
    evidenceReferences: TeachingEvidenceReferenceDraft[]
  }): Promise<TeachingSessionEvidenceWriterReceipt>
}

export type RecordTeachingSessionWithEvidenceInput = {
  workspaceId: string
  academicYearId: string
  session: TeachingSessionDraft
  allocations: TeachingSessionAllocationDraft[]
  allocationContext: TeachingSessionAllocationContext
  supersedesSessionId?: string | null
  observations: TeachingObservationDraft[]
  evidenceReferences: TeachingEvidenceReferenceDraft[]
}

export type TeachingSessionWithEvidenceReceipt = TeachingSessionEvidenceWriterReceipt & {
  allocatedMinutes: number
  unallocatedMinutes: number
  observationCount: number
  evidenceReferenceCount: number
}

export async function recordTeachingSessionWithEvidence(
  input: RecordTeachingSessionWithEvidenceInput,
  writer: TeachingSessionEvidenceWriter,
): Promise<TeachingSessionWithEvidenceReceipt> {
  if (!input.workspaceId.trim()) throw new Error('workspaceId required')
  if (!input.academicYearId.trim()) throw new Error('academicYearId required')

  const allocationValidation = validateTeachingSessionAllocations({
    session: input.session,
    allocations: input.allocations,
    context: input.allocationContext,
  })
  if (!allocationValidation.valid) {
    throw new Error(`Invalid teaching session registration: ${allocationValidation.codes.join(', ')}`)
  }

  const evidenceValidation = validateTeachingEvidenceDrafts({
    observations: input.observations,
    evidenceReferences: input.evidenceReferences,
  })
  if (!evidenceValidation.valid) {
    throw new Error(`Invalid teaching evidence registration: ${evidenceValidation.codes.join(', ')}`)
  }

  const receipt = await writer.record({
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId,
    session: input.session,
    allocations: input.allocations,
    supersedesSessionId: input.supersedesSessionId ?? null,
    observations: input.observations,
    evidenceReferences: input.evidenceReferences,
  })

  if (!receipt.teachingSessionId.trim()) throw new Error('Teaching evidence writer returned an empty session receipt')
  if (receipt.observationIds.length !== input.observations.length) {
    throw new Error('Teaching evidence writer returned an inconsistent observation receipt')
  }
  if (receipt.evidenceReferenceIds.length !== input.evidenceReferences.length) {
    throw new Error('Teaching evidence writer returned an inconsistent evidence receipt')
  }

  return {
    ...receipt,
    allocatedMinutes: allocationValidation.allocatedMinutes,
    unallocatedMinutes: allocationValidation.unallocatedMinutes,
    observationCount: receipt.observationIds.length,
    evidenceReferenceCount: receipt.evidenceReferenceIds.length,
  }
}
