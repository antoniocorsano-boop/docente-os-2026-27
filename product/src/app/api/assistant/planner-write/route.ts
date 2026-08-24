import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  confirmAssistantWriteProposal,
  evaluateAssistantWriteExecution,
  preparePlannerCreateTaskProposal,
  type AssistantWriteProposal,
  type PlannerCreateTaskProposalPayload,
} from '@/core/application/assistant-write-contract'
import type { AssistantContext } from '@/core/presentation/assistant-context'
import { createClient } from '@/lib/supabase/server'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const dynamic = 'force-dynamic'

type PrepareBody = {
  action: 'prepare'
  title?: unknown
  notes?: unknown
  priority?: unknown
  plannedFor?: unknown
  dueAt?: unknown
}

type ProposalActionBody = {
  action: 'execute' | 'reject' | 'undo'
  proposalId?: unknown
}

type X4ProposalRow = {
  id: string
  capability: string
  status: string
  summary: string
  rationale: string | null
  evidence_refs: string[]
  effect_preview: unknown
  payload: unknown
  payload_fingerprint: string
  created_by: string
  confirmed_by: string | null
  confirmed_at: string | null
  executed_at: string | null
  effect_ref: string | null
  undone_at: string | null
}

export async function POST(request: Request) {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return NextResponse.json({ error: 'authentication_required' }, { status: 401 })

  const supabase = (await createClient()) as unknown as SupabaseClient
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const actor = claimsData?.claims?.sub
  if (claimsError || typeof actor !== 'string' || !actor) {
    return NextResponse.json({ error: 'authentication_required' }, { status: 401 })
  }

  let body: PrepareBody | ProposalActionBody
  try {
    body = await request.json() as PrepareBody | ProposalActionBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  try {
    if (body.action === 'prepare') {
      const proposalId = randomUUID()
      const title = requiredString(body.title, 240, 'title')
      const notes = optionalString(body.notes, 4000, 'notes')
      const priority = asPriority(body.priority)
      const plannedFor = optionalDate(body.plannedFor, 'plannedFor')
      const dueAt = optionalDateTime(body.dueAt, 'dueAt')
      const sourceRef = `assistant-write:${proposalId}`
      const assistantContext: AssistantContext = {
        surface: 'PLANNER',
        workspaceId: context.workspace.id,
        academicYearId: context.academicYear?.id,
        provenance: [{ kind: 'PLANNER', ref: '/planner', label: 'Planner DOCENTE OS' }],
        availableCapabilities: ['PLANNER_CREATE_TASK'],
        forbiddenCapabilities: [],
        missingInformation: [],
      }

      const proposal = preparePlannerCreateTaskProposal({
        proposalId,
        context: assistantContext,
        title,
        notes,
        priority,
        plannedFor,
        dueAt,
        sourceKind: 'SYSTEM',
        sourceRef,
        rationale: 'Attività interna al Planner preparata su richiesta esplicita dell’utente.',
        evidenceRefs: ['/planner'],
      })

      const { data, error } = await supabase.rpc('prepare_assistant_planner_create_task', {
        target_proposal_id: proposal.proposalId,
        target_workspace_id: context.workspace.id,
        target_academic_year_id: context.academicYear?.id ?? null,
        target_title: proposal.payload.title,
        target_notes: proposal.payload.notes,
        target_priority: proposal.payload.priority,
        target_planned_for: proposal.payload.plannedFor,
        target_due_at: proposal.payload.dueAt,
        target_rationale: proposal.rationale,
        target_evidence_refs: proposal.evidenceRefs,
        target_summary: proposal.summary,
        target_effect_preview: proposal.effectPreview,
        target_payload_fingerprint: proposal.payloadFingerprint,
      })

      if (error || data !== proposal.proposalId) throw new Error(error?.message ?? 'proposal_persistence_failed')
      return NextResponse.json(publicProposal(proposal), { status: 201 })
    }

    const proposalId = requiredString(body.proposalId, 160, 'proposalId')

    if (body.action === 'execute') {
      const stored = await loadProposal(supabase, proposalId)
      if (!stored) return NextResponse.json({ error: 'proposal_not_found' }, { status: 404 })

      const proposal = toDomainProposal(stored)
      const confirmation = confirmAssistantWriteProposal(proposal, {
        confirmedBy: actor,
        confirmedAt: new Date().toISOString(),
      })
      const gate = evaluateAssistantWriteExecution({
        proposal: confirmation.proposal,
        confirmation: confirmation.confirmation,
        policy: {
          x4Enabled: true,
          availableCapabilities: ['PLANNER_CREATE_TASK'],
          forbiddenCapabilities: [],
        },
      })
      if (!gate.allowed) return NextResponse.json({ error: gate.reason }, { status: 409 })

      const { data: taskId, error } = await supabase.rpc('execute_assistant_planner_create_task', {
        target_proposal_id: proposalId,
      })
      if (error || typeof taskId !== 'string') throw new Error(error?.message ?? 'execution_failed')

      return NextResponse.json({ proposalId, status: 'EXECUTED', taskId })
    }

    if (body.action === 'reject') {
      const { data, error } = await supabase.rpc('reject_assistant_write_proposal', {
        target_proposal_id: proposalId,
      })
      if (error || data !== proposalId) throw new Error(error?.message ?? 'rejection_failed')
      return NextResponse.json({ proposalId, status: 'REJECTED' })
    }

    if (body.action === 'undo') {
      const { data: taskId, error } = await supabase.rpc('undo_assistant_planner_create_task', {
        target_proposal_id: proposalId,
      })
      if (error || typeof taskId !== 'string') throw new Error(error?.message ?? 'undo_failed')
      return NextResponse.json({ proposalId, status: 'UNDONE', taskId })
    }

    return NextResponse.json({ error: 'unsupported_action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'x4_write_failed'
    return NextResponse.json({ error: 'x4_write_failed', message }, { status: 400 })
  }
}

async function loadProposal(supabase: SupabaseClient, proposalId: string) {
  const { data, error } = await supabase
    .from('assistant_write_proposals')
    .select('id,capability,status,summary,rationale,evidence_refs,effect_preview,payload,payload_fingerprint,created_by,confirmed_by,confirmed_at,executed_at,effect_ref,undone_at')
    .eq('id', proposalId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as X4ProposalRow | null
}

function toDomainProposal(row: X4ProposalRow): AssistantWriteProposal {
  if (row.capability !== 'PLANNER_CREATE_TASK') throw new Error('unsupported_capability')
  if (row.status !== 'PREVIEW_READY') throw new Error('proposal_not_preview_ready')
  const payload = asPlannerPayload(row.payload)
  const effectPreview = asEffectPreview(row.effect_preview)

  return {
    proposalId: row.id,
    actionKind: 'WRITE_REVERSIBLE',
    capability: 'PLANNER_CREATE_TASK',
    summary: row.summary,
    rationale: row.rationale,
    evidenceRefs: Array.isArray(row.evidence_refs) ? row.evidence_refs : [],
    effectPreview,
    reversible: true,
    requiresConfirmation: true,
    payload,
    payloadFingerprint: row.payload_fingerprint,
    status: 'PREVIEW_READY',
  }
}

function asPlannerPayload(value: unknown): PlannerCreateTaskProposalPayload {
  if (!value || typeof value !== 'object') throw new Error('invalid_stored_payload')
  const payload = value as Record<string, unknown>
  return {
    title: requiredString(payload.title, 240, 'stored.title'),
    notes: optionalString(payload.notes, 4000, 'stored.notes'),
    priority: asPriority(payload.priority),
    plannedFor: optionalDate(payload.plannedFor, 'stored.plannedFor'),
    dueAt: optionalDateTime(payload.dueAt, 'stored.dueAt'),
    sourceKind: payload.sourceKind === 'SYSTEM' ? 'SYSTEM' : (() => { throw new Error('invalid_stored_source_kind') })(),
    sourceRef: requiredString(payload.sourceRef, 1000, 'stored.sourceRef'),
  }
}

function asEffectPreview(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('invalid_effect_preview')
  const preview = value as Record<string, unknown>
  if (!Array.isArray(preview.changes) || !Array.isArray(preview.doesNotChange)) throw new Error('invalid_effect_preview')
  return {
    changes: preview.changes.map((item) => requiredString(item, 500, 'effect.change')),
    doesNotChange: preview.doesNotChange.map((item) => requiredString(item, 500, 'effect.unchanged')),
  }
}

function publicProposal(proposal: AssistantWriteProposal) {
  return {
    proposalId: proposal.proposalId,
    status: proposal.status,
    summary: proposal.summary,
    rationale: proposal.rationale,
    effectPreview: proposal.effectPreview,
    payload: proposal.payload,
    payloadFingerprint: proposal.payloadFingerprint,
    reversible: proposal.reversible,
    requiresConfirmation: proposal.requiresConfirmation,
  }
}

function requiredString(value: unknown, maxLength: number, field: string) {
  if (typeof value !== 'string') throw new Error(`${field}_required`)
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) throw new Error(`${field}_required`)
  if (normalized.length > maxLength) throw new Error(`${field}_too_long`)
  return normalized
}

function optionalString(value: unknown, maxLength: number, field: string) {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new Error(`${field}_invalid`)
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  if (normalized.length > maxLength) throw new Error(`${field}_too_long`)
  return normalized
}

function asPriority(value: unknown): PlannerCreateTaskProposalPayload['priority'] {
  return value === 'LOW' || value === 'HIGH' || value === 'URGENT' ? value : 'NORMAL'
}

function optionalDate(value: unknown, field: string) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field}_invalid`)
  return value
}

function optionalDateTime(value: unknown, field: string) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new Error(`${field}_invalid`)
  return value
}
