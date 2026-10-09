import {
  validateInstitutionalBase,
  type InstitutionalBaseVersionDraft,
  type TemplateQualityFinding,
  type TemplateQualityReview,
} from '../../domain/document-template'
import { createClient } from '../../../lib/supabase/server'

type DbError = { message: string }
type RpcResult = Promise<{ data: unknown; error: DbError | null }>

export type InstitutionalBaseStatus =
  | 'DRAFT'
  | 'QUALITY_REVIEWED'
  | 'REVIEW_REQUIRED'
  | 'ACTIVE'
  | 'RETIRED'
  | 'BLOCKED'

export type InstitutionalBaseSourceKind =
  | 'INSTITUTION_OFFICIAL'
  | 'INSTITUTION_WORKING_DRAFT'
  | 'TEACHER_ADAPTED'
  | 'HISTORICAL_REFERENCE'
  | 'UNKNOWN'

export type CreateBaseInput = {
  workspaceId: string
  name: string
}

export type SaveInstitutionalBaseVersionInput = {
  baseId: string
  expectedCurrentVersion: number
  draft: InstitutionalBaseVersionDraft
  sourceRevisionIds: string[]
}

export type RecordInstitutionalBaseQualityReviewInput = {
  baseId: string
  versionNo: number
  review: TemplateQualityReview
  note?: string | null
}

export type ActivateInstitutionalBaseVersionInput = {
  baseId: string
  versionNo: number
  humanReviewConfirmed: boolean
}

export type InstitutionalBaseLifecycleTransitionInput = {
  baseId: string
  note: string
}

export type InstitutionalBaseSummary = {
  id: string
  workspaceId: string
  name: string
  status: InstitutionalBaseStatus
  currentVersionNo: number
  activeVersionNo: number | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type InstitutionalBaseVersion = {
  id: string
  baseId: string
  versionNo: number
  draft: InstitutionalBaseVersionDraft
  sourceRevisionIds: string[]
  createdBy: string
  createdAt: string
}

export type InstitutionalBaseSource = {
  id: string
  workspaceId: string
  sourceAssetId: string | null
  sourceRevisionRef: string | null
  sourceKind: InstitutionalBaseSourceKind
  sourceFingerprint: string
  capturedBy: string
  capturedAt: string
}

export type InstitutionalBaseQualityReview = {
  id: string
  baseId: string
  versionNo: number
  result: TemplateQualityReview['result']
  findings: TemplateQualityFinding[]
  note: string | null
  reviewedBy: string
  reviewedAt: string
}

export type InstitutionalBaseSnapshot = {
  base: InstitutionalBaseSummary
  activeVersion: InstitutionalBaseVersion | null
  versions: InstitutionalBaseVersion[]
  qualityReviews: InstitutionalBaseQualityReview[]
  sources: InstitutionalBaseSource[]
}

type RawBase = {
  id: string
  workspace_id: string
  name: string
  status: InstitutionalBaseStatus
  current_version_no: number
  active_version_no: number | null
  created_by: string
  created_at: string
  updated_at: string
}

type RawVersion = {
  id: string
  base_id: string
  version_no: number
  profile_json: InstitutionalBaseVersionDraft
  source_revision_ids: string[]
  created_by: string
  created_at: string
}

type RawSource = {
  id: string
  workspace_id: string
  source_asset_id: string | null
  source_revision_ref: string | null
  source_kind: InstitutionalBaseSourceKind
  source_fingerprint: string
  captured_by: string
  captured_at: string
}

type RawReview = {
  id: string
  base_id: string
  version_no: number
  result: TemplateQualityReview['result']
  findings: TemplateQualityFinding[]
  note: string | null
  reviewed_by: string
  reviewed_at: string
}

type RawSnapshot = {
  base: RawBase
  activeVersion: RawVersion | null
  versions: RawVersion[]
  qualityReviews: RawReview[]
  sources: RawSource[]
}

type RawVersionSnapshot = {
  base: RawBase
  version: RawVersion
  qualityReviews: RawReview[]
  sources: RawSource[]
}

export interface InstitutionalBaseListQuery extends PromiseLike<{ data: RawBase[] | null; error: DbError | null }> {
  eq(column: string, value: string): InstitutionalBaseListQuery
  order(column: string, options?: { ascending?: boolean }): InstitutionalBaseListQuery
}

export interface InstitutionalBaseRepositoryClient {
  rpc(
    name:
      | 'create_institutional_base'
      | 'save_institutional_base_version'
      | 'record_institutional_base_quality_review'
      | 'activate_institutional_base_version'
      | 'block_institutional_base'
      | 'clear_institutional_base_block'
      | 'retire_institutional_base'
      | 'institutional_base_snapshot'
      | 'institutional_base_version_snapshot',
    args: Record<string, unknown>,
  ): RpcResult
  from(table: 'institutional_bases'): { select(columns: string): InstitutionalBaseListQuery }
}

type ClientFactory = () => Promise<InstitutionalBaseRepositoryClient>

export class SupabaseInstitutionalBaseRepository {
  constructor(
    private readonly clientFactory: ClientFactory = async () =>
      await createClient() as unknown as InstitutionalBaseRepositoryClient,
  ) {}

  async createBase(input: CreateBaseInput): Promise<string> {
    const client = await this.clientFactory()
    const { data, error } = await client.rpc('create_institutional_base', {
      target_workspace_id: input.workspaceId,
      target_name: input.name,
    })
    if (error || typeof data !== 'string') throw new Error(error?.message ?? 'Unable to create institutional base')
    return data
  }

  async saveVersion(input: SaveInstitutionalBaseVersionInput): Promise<number> {
    const validation = validateInstitutionalBase(input.draft)
    if (!validation.valid) throw new Error(`Invalid institutional base: ${validation.codes.join(', ')}`)

    const client = await this.clientFactory()
    const { data, error } = await client.rpc('save_institutional_base_version', {
      target_base_id: input.baseId,
      expected_current_version: input.expectedCurrentVersion,
      target_profile_json: input.draft,
      target_source_revision_ids: input.sourceRevisionIds,
    })
    if (error || typeof data !== 'number') throw new Error(error?.message ?? 'Unable to save institutional base version')
    return data
  }

  async recordQualityReview(input: RecordInstitutionalBaseQualityReviewInput): Promise<string> {
    const client = await this.clientFactory()
    const { data, error } = await client.rpc('record_institutional_base_quality_review', {
      target_base_id: input.baseId,
      target_version_no: input.versionNo,
      target_result: input.review.result,
      target_findings: input.review.findings,
      target_note: input.note ?? null,
    })
    if (error || typeof data !== 'string') throw new Error(error?.message ?? 'Unable to record institutional base quality review')
    return data
  }

  async activate(input: ActivateInstitutionalBaseVersionInput): Promise<void> {
    const client = await this.clientFactory()
    const { error } = await client.rpc('activate_institutional_base_version', {
      target_base_id: input.baseId,
      target_version_no: input.versionNo,
      human_review_confirmed: input.humanReviewConfirmed,
    })
    if (error) throw new Error(error.message)
  }

  async block(input: InstitutionalBaseLifecycleTransitionInput): Promise<void> {
    await this.runLifecycleTransition('block_institutional_base', input)
  }

  async clearBlock(input: InstitutionalBaseLifecycleTransitionInput): Promise<void> {
    await this.runLifecycleTransition('clear_institutional_base_block', input)
  }

  async retire(input: InstitutionalBaseLifecycleTransitionInput): Promise<void> {
    await this.runLifecycleTransition('retire_institutional_base', input)
  }

  async get(baseId: string): Promise<InstitutionalBaseSnapshot | null> {
    const client = await this.clientFactory()
    const { data, error } = await client.rpc('institutional_base_snapshot', { target_base_id: baseId })
    if (error) throw new Error(error.message)
    if (!data) return null
    return mapInstitutionalBaseSnapshot(data as RawSnapshot)
  }

  async getVersion(baseId: string, versionNo: number): Promise<InstitutionalBaseVersion | null> {
    if (!Number.isInteger(versionNo) || versionNo < 1) throw new Error('Invalid institutional base version pin')

    const client = await this.clientFactory()
    const { data, error } = await client.rpc('institutional_base_version_snapshot', {
      target_base_id: baseId,
      target_version_no: versionNo,
    })
    if (error) throw new Error(error.message)
    if (!data) return null

    const raw = data as RawVersionSnapshot
    if (raw.base?.id !== baseId || raw.version?.base_id !== baseId || raw.version?.version_no !== versionNo) {
      throw new Error('Historical institutional base snapshot does not match the requested exact pin')
    }
    return mapVersion(raw.version)
  }

  async listActive(workspaceId: string): Promise<InstitutionalBaseSummary[]> {
    const client = await this.clientFactory()
    const query = client.from('institutional_bases')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'ACTIVE')
    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapBase)
  }

  private async runLifecycleTransition(
    rpcName: 'block_institutional_base' | 'clear_institutional_base_block' | 'retire_institutional_base',
    input: InstitutionalBaseLifecycleTransitionInput,
  ): Promise<void> {
    if (!input.note.trim()) throw new Error('Lifecycle note is required')
    const client = await this.clientFactory()
    const { error } = await client.rpc(rpcName, {
      target_base_id: input.baseId,
      target_note: input.note,
    })
    if (error) throw new Error(error.message)
  }
}

export function mapInstitutionalBaseSnapshot(raw: RawSnapshot): InstitutionalBaseSnapshot {
  return {
    base: mapBase(raw.base),
    activeVersion: raw.activeVersion ? mapVersion(raw.activeVersion) : null,
    versions: (raw.versions ?? []).map(mapVersion),
    qualityReviews: (raw.qualityReviews ?? []).map(mapReview),
    sources: (raw.sources ?? []).map(mapSource),
  }
}

function mapBase(row: RawBase): InstitutionalBaseSummary {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    status: row.status,
    currentVersionNo: row.current_version_no,
    activeVersionNo: row.active_version_no,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapVersion(row: RawVersion): InstitutionalBaseVersion {
  return {
    id: row.id,
    baseId: row.base_id,
    versionNo: row.version_no,
    draft: row.profile_json,
    sourceRevisionIds: [...row.source_revision_ids],
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

function mapSource(row: RawSource): InstitutionalBaseSource {
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

function mapReview(row: RawReview): InstitutionalBaseQualityReview {
  return {
    id: row.id,
    baseId: row.base_id,
    versionNo: row.version_no,
    result: row.result,
    findings: [...row.findings],
    note: row.note,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  }
}
