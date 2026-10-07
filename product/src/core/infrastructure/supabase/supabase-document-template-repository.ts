import {
  validateDocumentTemplate,
  type DocumentTemplateKind,
  type DocumentTemplateStatus,
  type DocumentTemplateVersionDraft,
  type TemplateQualityFinding,
  type TemplateQualityReview,
} from '../../domain/document-template'
import { createClient } from '../../../lib/supabase/server'

type DbError = { message: string }
type RpcResult = Promise<{ data: unknown; error: DbError | null }>

export type TemplateSourceKind =
  | 'INSTITUTION_OFFICIAL'
  | 'INSTITUTION_WORKING_DRAFT'
  | 'TEACHER_ADAPTED'
  | 'HISTORICAL_REFERENCE'
  | 'UNKNOWN'

export type RegisterTemplateSourceInput = {
  workspaceId: string
  sourceAssetId: string | null
  sourceRevisionRef: string | null
  sourceKind: TemplateSourceKind
  sourceFingerprint: string
}

export type CreateTemplateInput = {
  workspaceId: string
  kind: DocumentTemplateKind
  name: string
}

export type SaveTemplateVersionInput = {
  templateId: string
  expectedCurrentVersion: number
  draft: DocumentTemplateVersionDraft
  sourceRevisionIds: string[]
}

export type RecordTemplateQualityReviewInput = {
  templateId: string
  versionNo: number
  review: TemplateQualityReview
  note?: string | null
}

export type ActivateTemplateVersionInput = {
  templateId: string
  versionNo: number
  humanReviewConfirmed: boolean
}

export type DocumentTemplateSummary = {
  id: string
  workspaceId: string
  kind: DocumentTemplateKind
  name: string
  status: DocumentTemplateStatus
  currentVersionNo: number
  activeVersionNo: number | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type DocumentTemplateVersion = {
  id: string
  templateId: string
  versionNo: number
  draft: DocumentTemplateVersionDraft
  sourceRevisionIds: string[]
  createdBy: string
  createdAt: string
}

export type DocumentTemplateSource = {
  id: string
  workspaceId: string
  sourceAssetId: string | null
  sourceRevisionRef: string | null
  sourceKind: TemplateSourceKind
  sourceFingerprint: string
  capturedBy: string
  capturedAt: string
}

export type DocumentTemplateQualityReview = {
  id: string
  templateId: string
  versionNo: number
  result: TemplateQualityReview['result']
  findings: TemplateQualityFinding[]
  note: string | null
  reviewedBy: string
  reviewedAt: string
}

export type DocumentTemplateSnapshot = {
  template: DocumentTemplateSummary
  activeVersion: DocumentTemplateVersion | null
  versions: DocumentTemplateVersion[]
  qualityReviews: DocumentTemplateQualityReview[]
  sources: DocumentTemplateSource[]
}

type RawTemplate = {
  id: string
  workspace_id: string
  document_kind: DocumentTemplateKind
  name: string
  status: DocumentTemplateStatus
  current_version_no: number
  active_version_no: number | null
  created_by: string
  created_at: string
  updated_at: string
}

type RawVersion = {
  id: string
  template_id: string
  version_no: number
  schema_json: DocumentTemplateVersionDraft
  source_revision_ids: string[]
  created_by: string
  created_at: string
}

type RawSource = {
  id: string
  workspace_id: string
  source_asset_id: string | null
  source_revision_ref: string | null
  source_kind: TemplateSourceKind
  source_fingerprint: string
  captured_by: string
  captured_at: string
}

type RawReview = {
  id: string
  template_id: string
  version_no: number
  result: TemplateQualityReview['result']
  findings: TemplateQualityFinding[]
  note: string | null
  reviewed_by: string
  reviewed_at: string
}

type RawSnapshot = {
  template: RawTemplate
  activeVersion: RawVersion | null
  versions: RawVersion[]
  qualityReviews: RawReview[]
  sources: RawSource[]
}

export interface TemplateListQuery extends PromiseLike<{ data: RawTemplate[] | null; error: DbError | null }> {
  eq(column: string, value: string): TemplateListQuery
  order(column: string, options?: { ascending?: boolean }): TemplateListQuery
}

export interface TemplateRepositoryClient {
  rpc(
    name:
      | 'register_document_template_source'
      | 'create_document_template'
      | 'save_document_template_version'
      | 'record_document_template_quality_review'
      | 'activate_document_template_version'
      | 'document_template_snapshot',
    args: Record<string, unknown>,
  ): RpcResult
  from(table: 'document_templates'): { select(columns: string): TemplateListQuery }
}

type ClientFactory = () => Promise<TemplateRepositoryClient>

export class SupabaseDocumentTemplateRepository {
  constructor(
    private readonly clientFactory: ClientFactory = async () =>
      await createClient() as unknown as TemplateRepositoryClient,
  ) {}

  async registerSource(input: RegisterTemplateSourceInput): Promise<string> {
    const client = await this.clientFactory()
    const { data, error } = await client.rpc('register_document_template_source', {
      target_workspace_id: input.workspaceId,
      target_source_asset_id: input.sourceAssetId,
      target_source_revision_ref: input.sourceRevisionRef,
      target_source_kind: input.sourceKind,
      target_source_fingerprint: input.sourceFingerprint,
    })
    if (error || typeof data !== 'string') throw new Error(error?.message ?? 'Unable to register template source')
    return data
  }

  async createTemplate(input: CreateTemplateInput): Promise<string> {
    const client = await this.clientFactory()
    const { data, error } = await client.rpc('create_document_template', {
      target_workspace_id: input.workspaceId,
      target_document_kind: input.kind,
      target_name: input.name,
    })
    if (error || typeof data !== 'string') throw new Error(error?.message ?? 'Unable to create document template')
    return data
  }

  async saveVersion(input: SaveTemplateVersionInput): Promise<number> {
    const validation = validateDocumentTemplate(input.draft)
    if (!validation.valid) throw new Error(`Invalid document template: ${validation.codes.join(', ')}`)

    const client = await this.clientFactory()
    const { data, error } = await client.rpc('save_document_template_version', {
      target_template_id: input.templateId,
      expected_current_version: input.expectedCurrentVersion,
      target_schema_json: input.draft,
      target_source_revision_ids: input.sourceRevisionIds,
    })
    if (error || typeof data !== 'number') throw new Error(error?.message ?? 'Unable to save document template version')
    return data
  }

  async recordQualityReview(input: RecordTemplateQualityReviewInput): Promise<string> {
    const client = await this.clientFactory()
    const { data, error } = await client.rpc('record_document_template_quality_review', {
      target_template_id: input.templateId,
      target_version_no: input.versionNo,
      target_result: input.review.result,
      target_findings: input.review.findings,
      target_note: input.note ?? null,
    })
    if (error || typeof data !== 'string') throw new Error(error?.message ?? 'Unable to record template quality review')
    return data
  }

  async activate(input: ActivateTemplateVersionInput): Promise<void> {
    const client = await this.clientFactory()
    const { error } = await client.rpc('activate_document_template_version', {
      target_template_id: input.templateId,
      target_version_no: input.versionNo,
      human_review_confirmed: input.humanReviewConfirmed,
    })
    if (error) throw new Error(error.message)
  }

  async get(templateId: string): Promise<DocumentTemplateSnapshot | null> {
    const client = await this.clientFactory()
    const { data, error } = await client.rpc('document_template_snapshot', { target_template_id: templateId })
    if (error) throw new Error(error.message)
    if (!data) return null
    return mapDocumentTemplateSnapshot(data as RawSnapshot)
  }

  async listActive(workspaceId: string, kind?: DocumentTemplateKind): Promise<DocumentTemplateSummary[]> {
    const client = await this.clientFactory()
    let query = client.from('document_templates').select('*').eq('workspace_id', workspaceId).eq('status', 'ACTIVE')
    if (kind) query = query.eq('document_kind', kind)
    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapTemplate)
  }
}

export function mapDocumentTemplateSnapshot(raw: RawSnapshot): DocumentTemplateSnapshot {
  return {
    template: mapTemplate(raw.template),
    activeVersion: raw.activeVersion ? mapVersion(raw.activeVersion) : null,
    versions: (raw.versions ?? []).map(mapVersion),
    qualityReviews: (raw.qualityReviews ?? []).map(mapReview),
    sources: (raw.sources ?? []).map(mapSource),
  }
}

function mapTemplate(row: RawTemplate): DocumentTemplateSummary {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.document_kind,
    name: row.name,
    status: row.status,
    currentVersionNo: row.current_version_no,
    activeVersionNo: row.active_version_no,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapVersion(row: RawVersion): DocumentTemplateVersion {
  return {
    id: row.id,
    templateId: row.template_id,
    versionNo: row.version_no,
    draft: row.schema_json,
    sourceRevisionIds: [...row.source_revision_ids],
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function mapSource(row: RawSource): DocumentTemplateSource {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceAssetId: row.source_asset_id,
    sourceRevisionRef: row.source_revision_ref,
    sourceKind: row.source_kind,
    sourceFingerprint: row.source_fingerprint,
    capturedBy: row.captured_by,
    capturedAt: row.captured_at,
  }
}

function mapReview(row: RawReview): DocumentTemplateQualityReview {
  return {
    id: row.id,
    templateId: row.template_id,
    versionNo: row.version_no,
    result: row.result,
    findings: [...row.findings],
    note: row.note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  }
}
