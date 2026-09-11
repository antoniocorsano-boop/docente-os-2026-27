import {
  asWorkspacePinnedResourceKind,
  type WorkspacePinnedResource,
  type WorkspacePinnedResourceKind,
} from '@/core/domain/workspace-pinned-resource'
import { createClient } from '@/lib/supabase/server'

type PinnedResourceRow = {
  id: string
  workspace_id: string
  academic_year_id: string
  kind: string
  target_url: string
  note: string | null
  created_by: string
  created_at: string
  updated_at: string
}

type PinnedResourceRpcClient = {
  rpc: {
    (
      name: 'list_workspace_pinned_resources',
      args: { target_workspace_id: string; target_academic_year_id: string },
    ): Promise<{ data: PinnedResourceRow[] | null; error: { message: string } | null }>
    (
      name: 'upsert_workspace_pinned_resource',
      args: {
        target_workspace_id: string
        target_academic_year_id: string
        target_kind: string
        target_url: string
        target_note: string | null
      },
    ): Promise<{ data: PinnedResourceRow | null; error: { message: string } | null }>
    (
      name: 'delete_workspace_pinned_resource',
      args: { target_workspace_id: string; target_academic_year_id: string; target_kind: string },
    ): Promise<{ data: boolean | null; error: { message: string } | null }>
  }
}

function toPinnedResource(row: PinnedResourceRow): WorkspacePinnedResource {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    academicYearId: row.academic_year_id,
    kind: asWorkspacePinnedResourceKind(row.kind),
    targetUrl: row.target_url,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseWorkspacePinnedResourceRepository {
  async list(workspaceId: string, academicYearId: string): Promise<WorkspacePinnedResource[]> {
    const supabase = await createClient()
    const { data, error } = await (supabase as unknown as PinnedResourceRpcClient).rpc(
      'list_workspace_pinned_resources',
      {
        target_workspace_id: workspaceId,
        target_academic_year_id: academicYearId,
      },
    )

    if (error) throw new Error(error.message)
    return (data ?? []).map(toPinnedResource)
  }

  async save(input: {
    workspaceId: string
    academicYearId: string
    kind: WorkspacePinnedResourceKind
    targetUrl: string
    note: string | null
  }): Promise<WorkspacePinnedResource> {
    const supabase = await createClient()
    const { data, error } = await (supabase as unknown as PinnedResourceRpcClient).rpc(
      'upsert_workspace_pinned_resource',
      {
        target_workspace_id: input.workspaceId,
        target_academic_year_id: input.academicYearId,
        target_kind: input.kind,
        target_url: input.targetUrl,
        target_note: input.note,
      },
    )

    if (error || !data) throw new Error(error?.message ?? 'Pinned resource save failed')
    return toPinnedResource(data)
  }

  async remove(workspaceId: string, academicYearId: string, kind: WorkspacePinnedResourceKind) {
    const supabase = await createClient()
    const { data, error } = await (supabase as unknown as PinnedResourceRpcClient).rpc(
      'delete_workspace_pinned_resource',
      {
        target_workspace_id: workspaceId,
        target_academic_year_id: academicYearId,
        target_kind: kind,
      },
    )

    if (error) throw new Error(error.message)
    return data ?? false
  }
}
