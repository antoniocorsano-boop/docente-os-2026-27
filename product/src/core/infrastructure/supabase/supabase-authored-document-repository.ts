import type { AuthoredDocumentSnapshot } from '@/core/domain/authored-document'
import { createClient } from '@/lib/supabase/server'

type RawSnapshot = {
  document: {
    id: string; workspace_id: string; academic_year_id: string | null; source_asset_id: string; document_kind: 'UDA';
    title: string; current_version_no: number; created_by: string; created_at: string; updated_at: string
  }
  current: RawVersion
  versions: RawVersion[]
}

type RawVersion = {
  id: string; document_id: string; version_no: number; title: string; body_markdown: string; created_by: string; created_at: string
}

type RpcClient = {
  rpc(name: 'open_uda_authoring', args: {
    target_workspace_id: string
    target_academic_year_id: string
    target_source_asset_id: string
    initial_title: string
    initial_body_markdown: string
  }): Promise<{ data: string | null; error: { message: string } | null }>
  rpc(name: 'authored_document_snapshot', args: { target_document_id: string }): Promise<{ data: RawSnapshot | null; error: { message: string } | null }>
  rpc(name: 'save_authored_document_version', args: {
    target_document_id: string
    expected_current_version: number
    next_title: string
    next_body_markdown: string
  }): Promise<{ data: number | null; error: { message: string } | null }>
}

export class SupabaseAuthoredDocumentRepository {
  async openUda(input: {
    workspaceId: string
    academicYearId: string
    sourceAssetId: string
    initialTitle: string
    initialBodyMarkdown: string
  }) {
    const supabase = await createClient()
    const { data, error } = await (supabase as unknown as RpcClient).rpc('open_uda_authoring', {
      target_workspace_id: input.workspaceId,
      target_academic_year_id: input.academicYearId,
      target_source_asset_id: input.sourceAssetId,
      initial_title: input.initialTitle,
      initial_body_markdown: input.initialBodyMarkdown,
    })
    if (error || !data) throw new Error(error?.message ?? 'Unable to open UDA authoring')
    return data
  }

  async get(documentId: string): Promise<AuthoredDocumentSnapshot | null> {
    const supabase = await createClient()
    const { data, error } = await (supabase as unknown as RpcClient).rpc('authored_document_snapshot', { target_document_id: documentId })
    if (error) throw new Error(error.message)
    if (!data) return null
    return {
      document: {
        id: data.document.id,
        workspaceId: data.document.workspace_id,
        academicYearId: data.document.academic_year_id,
        sourceAssetId: data.document.source_asset_id,
        documentKind: data.document.document_kind,
        title: data.document.title,
        currentVersionNo: data.document.current_version_no,
        createdBy: data.document.created_by,
        createdAt: data.document.created_at,
        updatedAt: data.document.updated_at,
      },
      current: mapVersion(data.current),
      versions: data.versions.map(mapVersion),
    }
  }

  async save(input: { documentId: string; expectedCurrentVersion: number; title: string; bodyMarkdown: string }) {
    const supabase = await createClient()
    const { data, error } = await (supabase as unknown as RpcClient).rpc('save_authored_document_version', {
      target_document_id: input.documentId,
      expected_current_version: input.expectedCurrentVersion,
      next_title: input.title,
      next_body_markdown: input.bodyMarkdown,
    })
    if (error || data == null) throw new Error(error?.message ?? 'Unable to save document version')
    return data
  }
}

function mapVersion(row: RawVersion) {
  return {
    id: row.id,
    documentId: row.document_id,
    versionNo: row.version_no,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}
