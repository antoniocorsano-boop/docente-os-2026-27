import { createHash } from 'node:crypto'
import type { PlannerTaskPriority, PlannerTaskSourceKind } from '@/core/domain/planner-task'
import type { AssistantActionKind, AssistantContext } from '@/core/presentation/assistant-context'

export type AssistantWriteCapability = 'PLANNER_CREATE_TASK'

export type AssistantWriteStatus =
  | 'PREVIEW_READY'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'EXECUTED'

export type AssistantWriteEffectPreview = {
  changes: string[]
  doesNotChange: string[]
}

export type PlannerCreateTaskProposalPayload = {
  title: string
  notes: string | null
  priority: PlannerTaskPriority
  plannedFor: string | null
  dueAt: string | null
  sourceKind: PlannerTaskSourceKind
  sourceRef: string | null
}

export type AssistantWriteProposal = {
  proposalId: string
  actionKind: Extract<AssistantActionKind, 'WRITE_REVERSIBLE'>
  capability: AssistantWriteCapability
  summary: string
  rationale: string | null
  evidenceRefs: string[]
  effectPreview: AssistantWriteEffectPreview
  reversible: true
  requiresConfirmation: true
  payload: PlannerCreateTaskProposalPayload
  payloadFingerprint: string
  status: AssistantWriteStatus
}

export type AssistantWriteConfirmation = {
  proposalId: string
  payloadFingerprint: string
  confirmedBy: string
  confirmedAt: string
}

export type AssistantWriteExecutionPolicy = {
  x4Enabled: boolean
  availableCapabilities: string[]
  forbiddenCapabilities: string[]
}

export type AssistantWriteExecutionGate =
  | { allowed: true }
  | {
      allowed: false
      reason:
        | 'X4_NOT_ENABLED'
        | 'CAPABILITY_NOT_AVAILABLE'
        | 'CAPABILITY_FORBIDDEN'
        | 'PROPOSAL_NOT_CONFIRMED'
        | 'CONFIRMATION_PROPOSAL_MISMATCH'
        | 'PAYLOAD_CHANGED_AFTER_PREVIEW'
        | 'CONFIRMING_USER_MISSING'
    }

export function preparePlannerCreateTaskProposal(input: {
  proposalId: string
  context: AssistantContext
  title: string
  notes?: string | null
  priority?: PlannerTaskPriority
  plannedFor?: string | null
  dueAt?: string | null
  sourceKind?: PlannerTaskSourceKind
  sourceRef?: string | null
  rationale?: string | null
  evidenceRefs?: string[]
}): AssistantWriteProposal {
  const proposalId = normalizeRequired(input.proposalId, 160, 'proposalId')
  const title = normalizeRequired(input.title, 240, 'title')
  const notes = normalizeOptional(input.notes, 4000)
  const plannedFor = normalizeDate(input.plannedFor, 'plannedFor')
  const dueAt = normalizeDateTime(input.dueAt, 'dueAt')
  const sourceKind = input.sourceKind ?? 'SYSTEM'
  const sourceRef = normalizeOptional(input.sourceRef, 1000)
  const evidenceRefs = uniqueClean(input.evidenceRefs ?? input.context.provenance.map((item) => item.ref).filter((value): value is string => Boolean(value)))

  const payload: PlannerCreateTaskProposalPayload = {
    title,
    notes,
    priority: input.priority ?? 'NORMAL',
    plannedFor,
    dueAt,
    sourceKind,
    sourceRef,
  }

  return {
    proposalId,
    actionKind: 'WRITE_REVERSIBLE',
    capability: 'PLANNER_CREATE_TASK',
    summary: `Creare l’attività “${title}” nel Planner`,
    rationale: normalizeOptional(input.rationale, 2000),
    evidenceRefs,
    effectPreview: {
      changes: [
        'Crea una nuova attività interna nel Planner.',
        plannedFor ? `La colloca nella data ${plannedFor}.` : 'La lascia senza una data pianificata.',
      ],
      doesNotChange: [
        'Non modifica il Piano annuale.',
        'Non crea o modifica eventi nel Calendario.',
        'Non modifica l’Orario.',
        'Non modifica la fonte o il documento da cui nasce la proposta.',
      ],
    },
    reversible: true,
    requiresConfirmation: true,
    payload,
    payloadFingerprint: fingerprintPlannerPayload(payload),
    status: 'PREVIEW_READY',
  }
}

export function confirmAssistantWriteProposal(
  proposal: AssistantWriteProposal,
  input: { confirmedBy: string; confirmedAt: string },
): { proposal: AssistantWriteProposal; confirmation: AssistantWriteConfirmation } {
  if (proposal.status !== 'PREVIEW_READY') throw new Error('Only a preview-ready proposal can be confirmed')
  const confirmedBy = normalizeRequired(input.confirmedBy, 200, 'confirmedBy')
  const confirmedAt = normalizeIsoTimestamp(input.confirmedAt)

  return {
    proposal: { ...proposal, status: 'CONFIRMED' },
    confirmation: {
      proposalId: proposal.proposalId,
      payloadFingerprint: proposal.payloadFingerprint,
      confirmedBy,
      confirmedAt,
    },
  }
}

export function evaluateAssistantWriteExecution(input: {
  proposal: AssistantWriteProposal
  confirmation: AssistantWriteConfirmation | null
  policy: AssistantWriteExecutionPolicy
}): AssistantWriteExecutionGate {
  const { proposal, confirmation, policy } = input

  if (!policy.x4Enabled) return { allowed: false, reason: 'X4_NOT_ENABLED' }
  if (!policy.availableCapabilities.includes(proposal.capability)) return { allowed: false, reason: 'CAPABILITY_NOT_AVAILABLE' }
  if (policy.forbiddenCapabilities.includes(proposal.capability)) return { allowed: false, reason: 'CAPABILITY_FORBIDDEN' }
  if (proposal.status !== 'CONFIRMED' || !confirmation) return { allowed: false, reason: 'PROPOSAL_NOT_CONFIRMED' }
  if (confirmation.proposalId !== proposal.proposalId) return { allowed: false, reason: 'CONFIRMATION_PROPOSAL_MISMATCH' }
  if (!confirmation.confirmedBy.trim()) return { allowed: false, reason: 'CONFIRMING_USER_MISSING' }

  const currentFingerprint = fingerprintPlannerPayload(proposal.payload)
  if (
    currentFingerprint !== proposal.payloadFingerprint
    || confirmation.payloadFingerprint !== proposal.payloadFingerprint
  ) {
    return { allowed: false, reason: 'PAYLOAD_CHANGED_AFTER_PREVIEW' }
  }

  return { allowed: true }
}

export function fingerprintPlannerPayload(payload: PlannerCreateTaskProposalPayload) {
  const canonical = JSON.stringify({
    dueAt: payload.dueAt,
    notes: payload.notes,
    plannedFor: payload.plannedFor,
    priority: payload.priority,
    sourceKind: payload.sourceKind,
    sourceRef: payload.sourceRef,
    title: payload.title,
  })
  return createHash('sha256').update(canonical).digest('hex')
}

function normalizeRequired(value: string, maxLength: number, field: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) throw new Error(`${field} required`)
  if (normalized.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters`)
  return normalized
}

function normalizeOptional(value: string | null | undefined, maxLength: number) {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  if (normalized.length > maxLength) throw new Error(`Value exceeds ${maxLength} characters`)
  return normalized
}

function normalizeDate(value: string | null | undefined, field: string) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} must be YYYY-MM-DD`)
  return value
}

function normalizeDateTime(value: string | null | undefined, field: string) {
  if (!value) return null
  if (Number.isNaN(Date.parse(value))) throw new Error(`${field} must be an ISO date-time`)
  return value
}

function normalizeIsoTimestamp(value: string) {
  if (Number.isNaN(Date.parse(value))) throw new Error('confirmedAt must be an ISO date-time')
  return value
}

function uniqueClean(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
