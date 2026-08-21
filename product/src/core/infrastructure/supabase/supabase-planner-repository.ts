import type { PlannerRepository } from '@/core/application/ports/planner-repository'
import type {
  CreatePlannerTaskInput,
  PlannerTask,
  PlannerTaskPriority,
  PlannerTaskSourceKind,
  PlannerTaskStatus,
} from '@/core/domain/planner-task'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'

type PlannerTaskRow = Database['public']['Tables']['planner_tasks']['Row']

function asStatus(value: string): PlannerTaskStatus {
  if (value === 'OPEN' || value === 'WAITING' || value === 'DONE' || value === 'CANCELLED') return value
  throw new Error(`Unsupported planner task status: ${value}`)
}

function asPriority(value: string): PlannerTaskPriority {
  if (value === 'LOW' || value === 'NORMAL' || value === 'HIGH' || value === 'URGENT') return value
  throw new Error(`Unsupported planner task priority: ${value}`)
}

function asSourceKind(value: string): PlannerTaskSourceKind {
  if (
    value === 'MANUAL' ||
    value === 'COMMUNICATION' ||
    value === 'CALENDAR' ||
    value === 'TEACHING' ||
    value === 'DOCUMENT' ||
    value === 'SYSTEM'
  ) return value
  throw new Error(`Unsupported planner task source kind: ${value}`)
}

function toDomain(row: PlannerTaskRow): PlannerTask {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    title: row.title,
    notes: row.notes,
    status: asStatus(row.status),
    priority: asPriority(row.priority),
    dueAt: row.due_at,
    plannedFor: row.planned_for,
    sourceKind: asSourceKind(row.source_kind),
    sourceRef: row.source_ref,
    createdBy: row.created_by,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabasePlannerRepository implements PlannerRepository {
  async listByWorkspace(workspaceId: string): Promise<PlannerTask[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data.map(toDomain)
  }

  async create(input: CreatePlannerTaskInput): Promise<PlannerTask> {
    const supabase = await createClient()
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub

    if (claimsError || !userId) throw new Error('Authenticated user required')

    const { data, error } = await supabase
      .from('planner_tasks')
      .insert({
        workspace_id: input.workspaceId,
        academic_year_id: input.academicYearId ?? null,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        priority: input.priority ?? 'NORMAL',
        due_at: input.dueAt ?? null,
        planned_for: input.plannedFor ?? null,
        source_kind: input.sourceKind ?? 'MANUAL',
        source_ref: input.sourceRef ?? null,
        created_by: userId,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toDomain(data)
  }

  async setStatus(taskId: string, status: PlannerTaskStatus): Promise<PlannerTask> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('planner_tasks')
      .update({
        status,
        completed_at: status === 'DONE' ? new Date().toISOString() : null,
      })
      .eq('id', taskId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toDomain(data)
  }

  async move(taskId: string, plannedFor: string | null): Promise<PlannerTask> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('planner_tasks')
      .update({ planned_for: plannedFor })
      .eq('id', taskId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return toDomain(data)
  }
}
