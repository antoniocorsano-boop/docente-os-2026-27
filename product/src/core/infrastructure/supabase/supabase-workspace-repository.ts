import type {
  CreateAcademicYearInput,
  WorkspaceRepository,
} from '@/core/application/ports/workspace-repository'
import type {
  AcademicYear,
  WorkspaceContext,
  WorkspaceKind,
  WorkspaceRole,
} from '@/core/domain/workspace'
import { createClient } from '@/lib/supabase/server'

function asWorkspaceKind(value: string): WorkspaceKind {
  if (value === 'PERSONAL' || value === 'SCHOOL') return value
  throw new Error(`Unsupported workspace kind: ${value}`)
}

function asWorkspaceRole(value: string): WorkspaceRole {
  if (value === 'OWNER' || value === 'ADMIN' || value === 'MEMBER') return value
  throw new Error(`Unsupported workspace role: ${value}`)
}

type CurrentWorkspaceContextRow = {
  workspace_id: string
  workspace_kind: string
  workspace_name: string
  owner_user_id: string
  workspace_role: string
  academic_year_id: string | null
  academic_year_label: string | null
  academic_year_starts_on: string | null
  academic_year_ends_on: string | null
  academic_year_is_active: boolean | null
}

type CurrentWorkspaceContextRpcClient = {
  rpc: (name: 'current_workspace_context') => Promise<{
    data: CurrentWorkspaceContextRow[] | null
    error: { message: string } | null
  }>
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  async bootstrapPersonalWorkspace(name?: string): Promise<string> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('bootstrap_personal_workspace', {
      workspace_name: name ?? 'Il mio spazio docente',
    })

    if (error || !data) {
      throw new Error(error?.message ?? 'Workspace bootstrap failed')
    }

    return data
  }

  async getCurrentContext(): Promise<WorkspaceContext | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as unknown as CurrentWorkspaceContextRpcClient).rpc('current_workspace_context')

    if (error) throw new Error(error.message)
    const row = data?.[0]
    if (!row) return null

    return {
      workspace: {
        id: row.workspace_id,
        kind: asWorkspaceKind(row.workspace_kind),
        name: row.workspace_name,
        ownerUserId: row.owner_user_id,
      },
      academicYear: row.academic_year_id && row.academic_year_label && row.academic_year_starts_on && row.academic_year_ends_on
        ? {
            id: row.academic_year_id,
            workspaceId: row.workspace_id,
            label: row.academic_year_label,
            startsOn: row.academic_year_starts_on,
            endsOn: row.academic_year_ends_on,
            isActive: row.academic_year_is_active ?? true,
          }
        : null,
      role: asWorkspaceRole(row.workspace_role),
    }
  }

  async createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYear> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('academic_years')
      .insert({
        workspace_id: input.workspaceId,
        label: input.label,
        starts_on: input.startsOn,
        ends_on: input.endsOn,
        is_active: input.isActive ?? false,
      })
      .select('id, workspace_id, label, starts_on, ends_on, is_active')
      .single()

    if (error) throw new Error(error.message)

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      label: data.label,
      startsOn: data.starts_on,
      endsOn: data.ends_on,
      isActive: data.is_active,
    }
  }
}
