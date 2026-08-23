export type TeachingSessionSourceKind = 'PROJECTED_OCCURRENCE' | 'MANUAL'
export type TeachingSessionCalendarState = 'SCHOOL_DAY' | 'NO_LESSONS' | 'UNDETERMINED'

export type TeachingSessionSourceSnapshot = {
  sourceKind: TeachingSessionSourceKind
  projectedOccurrenceLogicalId: string | null
  timetableVersionId: string | null
  timetableSlotId: string | null
  calendarState: TeachingSessionCalendarState | null
  provenance: string[]
}

export type TeachingSessionDraft = {
  sectionId: string
  disciplineId: string | null
  localDate: string
  plannedStartAt: string | null
  plannedEndAt: string | null
  plannedMinutes: number | null
  actualMinutes: number
  evidenceNote: string | null
  source: TeachingSessionSourceSnapshot
}

export type TeachingSessionAllocationDraft = {
  blockId: string
  minutes: number
  canonicalPlanAssetId: string
  canonicalGenerationId: string
}

export type TeachingSessionAllocationContext = {
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
}

export type TeachingSessionAllocationValidationCode =
  | 'INVALID_SESSION_SECTION'
  | 'INVALID_ACTUAL_MINUTES'
  | 'INVALID_BLOCK_ID'
  | 'INVALID_ALLOCATION_MINUTES'
  | 'DUPLICATE_BLOCK_ALLOCATION'
  | 'CANONICAL_CONTEXT_MISMATCH'
  | 'ALLOCATION_EXCEEDS_SESSION'

export type TeachingSessionAllocationValidation = {
  valid: boolean
  allocatedMinutes: number
  unallocatedMinutes: number
  codes: TeachingSessionAllocationValidationCode[]
}

export function validateTeachingSessionAllocations(input: {
  session: TeachingSessionDraft
  allocations: TeachingSessionAllocationDraft[]
  context: TeachingSessionAllocationContext
}): TeachingSessionAllocationValidation {
  const codes: TeachingSessionAllocationValidationCode[] = []

  if (!input.session.sectionId || input.session.sectionId !== input.context.sectionId) {
    codes.push('INVALID_SESSION_SECTION')
  }
  if (!Number.isInteger(input.session.actualMinutes) || input.session.actualMinutes <= 0) {
    codes.push('INVALID_ACTUAL_MINUTES')
  }

  const seenTargets = new Set<string>()
  for (const allocation of input.allocations) {
    if (!isCanonicalBlockId(allocation.blockId)) codes.push('INVALID_BLOCK_ID')
    if (!Number.isInteger(allocation.minutes) || allocation.minutes <= 0) codes.push('INVALID_ALLOCATION_MINUTES')

    const targetKey = `${allocation.canonicalGenerationId}:${allocation.blockId}`
    if (seenTargets.has(targetKey)) codes.push('DUPLICATE_BLOCK_ALLOCATION')
    seenTargets.add(targetKey)

    if (
      allocation.canonicalPlanAssetId !== input.context.canonicalPlanAssetId
      || allocation.canonicalGenerationId !== input.context.canonicalGenerationId
    ) {
      codes.push('CANONICAL_CONTEXT_MISMATCH')
    }
  }

  const allocatedMinutes = input.allocations.reduce(
    (total, allocation) => total + (Number.isFinite(allocation.minutes) ? allocation.minutes : 0),
    0,
  )
  if (allocatedMinutes > input.session.actualMinutes) codes.push('ALLOCATION_EXCEEDS_SESSION')

  const uniqueCodes = [...new Set(codes)]
  return {
    valid: uniqueCodes.length === 0,
    allocatedMinutes,
    unallocatedMinutes: Math.max(0, input.session.actualMinutes - allocatedMinutes),
    codes: uniqueCodes,
  }
}

export function completionProposal(input: { allocatedMinutes: number; plannedBlockMinutes: number }) {
  if (!Number.isInteger(input.allocatedMinutes) || input.allocatedMinutes < 0) throw new Error('Invalid allocated minutes')
  if (!Number.isInteger(input.plannedBlockMinutes) || input.plannedBlockMinutes <= 0) throw new Error('Invalid planned block minutes')

  return {
    quantitativeThresholdReached: input.allocatedMinutes >= input.plannedBlockMinutes,
    maySuggestCompletion: input.allocatedMinutes >= input.plannedBlockMinutes,
    mayAutoComplete: false as const,
    requiresHumanDecision: true as const,
  }
}

export function isCanonicalBlockId(value: string) {
  return /^B(0[1-9]|[12][0-9]|3[0-3])$/.test(value)
}
