export type ClassMaterialAcceptanceState =
  | 'PREPARED'
  | 'REVALIDATION_REQUIRED'
  | 'CONFIRMED'

export type ClassMaterialAcceptanceProjection = {
  state: ClassMaterialAcceptanceState
  label: 'Predisposto' | 'Da riconfermare' | 'Confermato'
  canonicalConfirmed: boolean
  requiresRevalidation: boolean
}

export function presentClassMaterialAcceptance(
  state: ClassMaterialAcceptanceState,
): ClassMaterialAcceptanceProjection {
  if (state === 'PREPARED') {
    return {
      state,
      label: 'Predisposto',
      canonicalConfirmed: false,
      requiresRevalidation: false,
    }
  }

  if (state === 'REVALIDATION_REQUIRED') {
    return {
      state,
      label: 'Da riconfermare',
      canonicalConfirmed: false,
      requiresRevalidation: true,
    }
  }

  return {
    state,
    label: 'Confermato',
    canonicalConfirmed: true,
    requiresRevalidation: false,
  }
}

export function presentLegacyClassMaterialAcceptance(
  sourceMetadata: Record<string, unknown>,
): ClassMaterialAcceptanceProjection {
  const rawState = sourceMetadata.approvalState
  const historicalApproval = typeof rawState === 'string' && rawState.trim() === 'APPROVED'

  return presentClassMaterialAcceptance(
    historicalApproval ? 'REVALIDATION_REQUIRED' : 'PREPARED',
  )
}
