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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub

    if (claimsError || !userId) return null

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_memberships')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (membershipError) throw new Error(membershipError.message)
    if (!membership) return null

    const { data: workspaceRow, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, kind, name, owner_user_id')
      .eq('id', membership.workspace_id)
      .maybeSingle()

    if (workspaceError) throw new Error(workspaceError.message)
    if (!workspaceRow) return null

    const { data: year, error: yearError } = await supabase
      .from('academic_years')
      .select('id, workspace_id, label, starts_on, ends_on, is_active')
      .eq('workspace_id', workspaceRow.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (yearError) throw new Error(yearError.message)

    return {
      workspace: {
        id: workspaceRow.id,
        kind: asWorkspaceKind(workspaceRow.kind),
        name: workspaceRow.name,
        ownerUserId: workspaceRow.owner_user_id,
      },
      academicYear: year
        ? {
            id: year.id,
            workspaceId: year.workspace_id,
            label: year.label,
            startsOn: year.starts_on,
            endsOn: year.ends_on,
            isActive: year.is_active,
          }
        : null,
      role: asWorkspaceRole(membership.role),
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
