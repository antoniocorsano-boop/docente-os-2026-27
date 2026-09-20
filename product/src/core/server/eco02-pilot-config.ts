import 'server-only'

import type { Eco02PilotIdentity } from '@/core/domain/cml-discipline-binding'

const REQUIRED_KEYS = [
  'ECO02_PILOT_WORKSPACE_ID',
  'ECO02_PILOT_ACADEMIC_YEAR_ID',
  'ECO02_PILOT_SECTION_ID',
] as const

export function eco02PilotIdentityFromEnv(): Eco02PilotIdentity | null {
  const values = Object.fromEntries(
    REQUIRED_KEYS.map((key) => [key, process.env[key]?.trim() ?? '']),
  ) as Record<(typeof REQUIRED_KEYS)[number], string>

  if (REQUIRED_KEYS.some((key) => !values[key])) return null

  return {
    workspaceId: values.ECO02_PILOT_WORKSPACE_ID,
    academicYearId: values.ECO02_PILOT_ACADEMIC_YEAR_ID,
    sectionId: values.ECO02_PILOT_SECTION_ID,
    grade: 'SECONDA',
    sectionCode: 'C',
  }
}
