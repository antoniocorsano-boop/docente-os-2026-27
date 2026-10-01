import type { ArgoProgram, ArgoPerformedStatus } from '@/core/domain/argo-program'
import {
  ARGO_MODULE_DESCRIPTION_MAX_LENGTH,
  ARGO_PROGRAM_XLS_PROFILE_V1,
  type ArgoProgramValidationFinding,
  type ArgoProgramValidationResult,
} from '@/core/domain/argo-xls-profile'

const PERFORMED_STATUSES = new Set<ArgoPerformedStatus>([
  'NOT_PERFORMED',
  'PARTIALLY_PERFORMED',
  'PERFORMED',
])

export function validateArgoProgram(program: ArgoProgram): ArgoProgramValidationResult {
  const findings: ArgoProgramValidationFinding[] = []

  for (const programModule of program.modules) {
    if (!programModule.description.trim()) {
      findings.push(error(programModule.id, 'MODULE_DESCRIPTION_REQUIRED'))
    } else if (programModule.description.length > ARGO_MODULE_DESCRIPTION_MAX_LENGTH) {
      findings.push(error(programModule.id, 'MODULE_DESCRIPTION_TOO_LONG'))
    }

    for (const argument of programModule.arguments) {
      if (!argument.description.trim()) {
        findings.push(error(argument.id, 'ARGUMENT_DESCRIPTION_REQUIRED'))
      }

      if (argument.performedStatus && !PERFORMED_STATUSES.has(argument.performedStatus)) {
        findings.push(error(argument.id, 'UNSUPPORTED_PERFORMED_STATUS'))
      }

      if (argument.performedAt && !isIsoDate(argument.performedAt)) {
        findings.push(error(argument.id, 'INVALID_PERFORMED_DATE'))
      }
    }
  }

  return {
    profileId: ARGO_PROGRAM_XLS_PROFILE_V1,
    status: findings.some((finding) => finding.severity === 'ERROR') ? 'BLOCKED' : 'PASS',
    findings,
  }
}

function error(entityId: string, code: ArgoProgramValidationFinding['code']): ArgoProgramValidationFinding {
  return {
    findingId: `${code}:${entityId}`,
    severity: 'ERROR',
    code,
    entityId,
    messageKey: `argo.validation.${code.toLowerCase()}`,
  }
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}
