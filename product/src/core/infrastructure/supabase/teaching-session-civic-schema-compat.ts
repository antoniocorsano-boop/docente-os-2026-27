import type { CivicEducationContribution } from '@/core/domain/teaching-session'

export type CivicEducationSchemaError = {
  code?: string | null
  message: string
}

export type CivicEducationSchemaCompatibility = 'strict' | 'previous'

export function civicEducationSchemaCompatibility(
  value: string | null | undefined,
): CivicEducationSchemaCompatibility {
  return value === 'previous' ? 'previous' : 'strict'
}

export function selectTeachingSessionWriteRpc(
  _civicEducation: CivicEducationContribution | null | undefined,
) {
  return 'record_teaching_session_with_civic_contribution' as const
}

export function isMissingCivicEducationSchemaError(
  error: CivicEducationSchemaError,
  compatibility: CivicEducationSchemaCompatibility = 'strict',
) {
  return compatibility === 'previous'
    && error.code === 'PGRST205'
    && error.message.includes("public.teaching_session_civic_contributions")
}

export function isMissingCivicEducationWriteRpcError(
  error: CivicEducationSchemaError,
  compatibility: CivicEducationSchemaCompatibility = 'strict',
) {
  return compatibility === 'previous'
    && error.code === 'PGRST202'
    && error.message.includes('public.record_teaching_session_with_civic_contribution')
}
