import type {
  RoleViewEvidence,
  RoleViewGateStatus,
  RoleViewMaturityState,
  RoleViewSnapshot,
  RoleViewStatus,
} from './roleview-governance'

export type EngineeringRoleViewRole = 'DEVELOPER' | 'REVIEWER'

export type EngineeringCheckState =
  | 'SUCCESS'
  | 'QUEUED'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'FAILURE'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'ACTION_REQUIRED'
  | 'SKIPPED'
  | 'NOT_APPLICABLE'

export type EngineeringCheck = {
  id: string
  label: string
  state: EngineeringCheckState
  required: boolean
  ref?: string
  source?: string
}

export type EngineeringRoleViewInput = {
  repository: string
  prNumber: number
  exactHeadSha: string
  baseRef: string
  headRef: string
  checks: EngineeringCheck[]
  evidence?: RoleViewEvidence[]
}

export function buildEngineeringRoleView(
  input: EngineeringRoleViewInput,
  role: EngineeringRoleViewRole = 'DEVELOPER',
): RoleViewSnapshot {
  const exactHeadSha = input.exactHeadSha.trim()
  const requiredChecks = input.checks.filter((check) => check.required)
  const mappedChecks = input.checks.map((check) => ({
    check,
    gateStatus: gateStatusForCheck(check),
  }))
  const requiredMapped = mappedChecks.filter(({ check }) => check.required)
  const exactHeadMissing = exactHeadSha.length === 0
  const requiredBlocked = requiredMapped.filter(({ gateStatus }) => gateStatus === 'BLOCKED')
  const requiredPending = requiredMapped.filter(({ gateStatus }) => gateStatus === 'WARN')
  const requiredPassed = requiredMapped.filter(({ gateStatus }) => gateStatus === 'PASS')

  const status = engineeringStatus({
    exactHeadMissing,
    requiredCount: requiredChecks.length,
    blockedCount: requiredBlocked.length,
    pendingCount: requiredPending.length,
  })

  const baseEvidence: RoleViewEvidence[] = [
    {
      kind: 'GITHUB_PULL_REQUEST',
      ref: `${input.repository}#${input.prNumber}`,
      label: `PR #${input.prNumber}`,
    },
  ]

  if (!exactHeadMissing) {
    baseEvidence.push({
      kind: 'GITHUB_EXACT_HEAD',
      ref: exactHeadSha,
      label: 'Exact head certificato',
    })
  }

  for (const check of input.checks) {
    if (!check.ref) continue
    baseEvidence.push({
      kind: 'CI_CHECK',
      ref: check.ref,
      label: `${check.label}: ${check.state}`,
    })
  }

  const evidence = [...baseEvidence, ...(input.evidence ?? [])]
  const blockers = [
    ...(exactHeadMissing
      ? [{
          code: 'EXACT_HEAD_MISSING',
          label: 'Exact head della PR non disponibile',
          source: 'EngineeringRoleViewInput.exactHeadSha',
        }]
      : []),
    ...requiredBlocked.map(({ check }) => ({
      code: `CI_GATE:${check.id}:${check.state}`,
      label: `${check.label}: ${check.state}`,
      source: check.source ?? 'EngineeringRoleViewInput.checks',
    })),
  ]

  return {
    schemaVersion: 'roleview.v0',
    product: 'DOCENTE_OS',
    scope: {
      kind: 'ENGINEERING_PULL_REQUEST',
      id: `${input.repository}#${input.prNumber}`,
      label: `${input.repository} PR #${input.prNumber}`,
    },
    role,
    focus: engineeringFocus(role),
    stage: 'ENGINEERING_PR_CERTIFICATION',
    status,
    headline: headlineForEngineeringStatus(status),
    maturity: [
      maturity(
        'EXACT_HEAD_IDENTITY',
        'Identità exact head',
        exactHeadMissing ? 'BLOCKED' : 'READY',
        'EngineeringRoleViewInput.exactHeadSha',
      ),
      maturity(
        'REQUIRED_GATES',
        'Gate richiesti',
        maturityForRequiredGates(status),
        'EngineeringRoleViewInput.checks[required=true]',
      ),
      maturity(
        'EVIDENCE_PROVENANCE',
        'Evidenze e provenienza',
        evidence.length > 1 ? 'READY' : 'IN_PROGRESS',
        'EngineeringRoleViewInput + CI check refs',
      ),
    ],
    gates: mappedChecks.map(({ check, gateStatus }) => ({
      id: check.id,
      label: check.label,
      status: gateStatus,
      reason: gateReason(check, gateStatus),
      source: check.source ?? 'EngineeringRoleViewInput.checks',
    })),
    kpis: [
      {
        id: 'required_gate_count',
        label: 'Gate richiesti',
        value: requiredChecks.length,
        unit: 'count',
        source: 'EngineeringRoleViewInput.checks[required=true]',
      },
      {
        id: 'passed_required_gates',
        label: 'Gate richiesti superati',
        value: requiredPassed.length,
        unit: 'count',
        target: requiredChecks.length,
        source: 'EngineeringRoleViewInput.checks[required=true,state=SUCCESS]',
      },
      {
        id: 'pending_required_gates',
        label: 'Gate richiesti in corso',
        value: requiredPending.length,
        unit: 'count',
        target: 0,
        source: 'EngineeringRoleViewInput.checks[required=true,pending]',
      },
      {
        id: 'blocked_required_gates',
        label: 'Gate richiesti bloccanti',
        value: requiredBlocked.length + (exactHeadMissing ? 1 : 0),
        unit: 'count',
        target: 0,
        source: 'EngineeringRoleViewInput.exactHeadSha + checks[required=true]',
      },
      {
        id: 'engineering_evidence_items',
        label: 'Evidenze di certificazione',
        value: evidence.length,
        unit: 'count',
        source: 'EngineeringRoleViewInput + CI check refs',
      },
    ],
    blockers,
    nextActions: [nextActionForEngineeringStatus(status)],
    evidence,
    provenance: evidence.map((item) => ({ ...item })),
  }
}

function gateStatusForCheck(check: EngineeringCheck): RoleViewGateStatus {
  if (check.state === 'SUCCESS') return 'PASS'

  if (check.state === 'SKIPPED' || check.state === 'NOT_APPLICABLE') {
    return check.required ? 'BLOCKED' : 'NOT_APPLICABLE'
  }

  if (check.state === 'QUEUED' || check.state === 'IN_PROGRESS' || check.state === 'PENDING') {
    return 'WARN'
  }

  return check.required ? 'BLOCKED' : 'WARN'
}

function engineeringStatus(input: {
  exactHeadMissing: boolean
  requiredCount: number
  blockedCount: number
  pendingCount: number
}): RoleViewStatus {
  if (input.exactHeadMissing || input.blockedCount > 0) return 'BLOCKED'
  if (input.requiredCount === 0 || input.pendingCount > 0) return 'ATTENTION'
  return 'READY'
}

function maturity(
  id: string,
  label: string,
  state: RoleViewMaturityState,
  source: string,
) {
  return { id, label, state, source }
}

function maturityForRequiredGates(status: RoleViewStatus): RoleViewMaturityState {
  if (status === 'READY') return 'READY'
  if (status === 'BLOCKED') return 'BLOCKED'
  return 'IN_PROGRESS'
}

function engineeringFocus(role: EngineeringRoleViewRole) {
  return role === 'REVIEWER'
    ? 'Exact head, gate ed evidenze della certificazione'
    : 'Readiness tecnica della PR sullo stesso exact head'
}

function headlineForEngineeringStatus(status: RoleViewStatus) {
  switch (status) {
    case 'READY':
      return 'PR pronta sui gate richiesti'
    case 'ATTENTION':
      return 'Certificazione della PR in corso'
    case 'BLOCKED':
      return 'PR bloccata dai gate richiesti'
  }
}

function gateReason(check: EngineeringCheck, status: RoleViewGateStatus) {
  if (status === 'PASS') return undefined
  if (status === 'NOT_APPLICABLE') return `${check.state}: gate non richiesto`
  return `${check.state}${check.required ? ': gate richiesto' : ': gate opzionale'}`
}

function nextActionForEngineeringStatus(status: RoleViewStatus) {
  switch (status) {
    case 'READY':
      return {
        id: 'MERGE_PR_ON_EXACT_HEAD',
        label: 'Integra la PR sullo stesso exact head',
        priority: 'PRIMARY' as const,
        source: 'Engineering RoleView required gates',
      }
    case 'ATTENTION':
      return {
        id: 'RECHECK_REQUIRED_GATES',
        label: 'Ricontrolla i gate richiesti sullo stesso exact head',
        priority: 'PRIMARY' as const,
        source: 'Engineering RoleView required gates',
      }
    case 'BLOCKED':
      return {
        id: 'RESOLVE_ENGINEERING_BLOCKERS',
        label: 'Risolvi i blocker prima del merge',
        priority: 'PRIMARY' as const,
        source: 'Engineering RoleView required gates',
      }
  }
}
