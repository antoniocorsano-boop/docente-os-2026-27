import type { CivicEducationContribution } from '@/core/domain/teaching-session'

export type CivicEducationSchemaError = {
  code?: string | null
  message: string
}

export function selectTeachingSessionWriteRpc(
  civicEducation: CivicEducationContribution | null | undefined,
) {
  return civicEducation
    ? 'record_teaching_session_with_civic_contribution' as const
    : 'record_teaching_session' as const
}

export function isMissingCivicEducationSchemaError(error: CivicEducationSchemaError) {
  return error.code === 'PGRST205'
    && error.message.includes("public.teaching_session_civic_contributions")
}
