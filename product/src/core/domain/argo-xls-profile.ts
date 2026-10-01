export const ARGO_PROGRAM_XLS_PROFILE_V1 = 'ARGO_PROGRAM_XLS_PROFILE_v1' as const

export type ArgoProgramValidationSeverity = 'ERROR' | 'WARNING' | 'INFO'

export type ArgoProgramValidationCode =
  | 'MODULE_DESCRIPTION_REQUIRED'
  | 'MODULE_DESCRIPTION_TOO_LONG'
  | 'ARGUMENT_DESCRIPTION_REQUIRED'
  | 'UNSUPPORTED_PERFORMED_STATUS'
  | 'INVALID_PERFORMED_DATE'

export type ArgoProgramValidationFinding = {
  findingId: string
  severity: ArgoProgramValidationSeverity
  code: ArgoProgramValidationCode
  entityId: string
  messageKey: string
}

export type ArgoProgramValidationResult = {
  profileId: typeof ARGO_PROGRAM_XLS_PROFILE_V1
  status: 'PASS' | 'BLOCKED'
  findings: ArgoProgramValidationFinding[]
}

export const ARGO_MODULE_DESCRIPTION_MAX_LENGTH = 200
