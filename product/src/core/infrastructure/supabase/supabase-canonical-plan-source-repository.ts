import { createClient } from '@/lib/supabase/server'

export type CanonicalPlanCode = 'CAN-PLAN-1' | 'CAN-PLAN-2' | 'CAN-PLAN-3'

export type CanonicalPlanSourceLookup = {
  workspaceId: string
  academicYearId: string
  code: CanonicalPlanCode
}

export type CanonicalPlanRuntimeSource = {
  code: CanonicalPlanCode
  assetId: string
  generationId: string
}

export interface CanonicalPlanSourceRepository {
  resolve(input: CanonicalPlanSourceLookup): Promise<CanonicalPlanRuntimeSource>
}

export type CanonicalPlanSourceErrorCode =
  | 'CANONICAL_PLAN_BINDING_MISSING'
  | 'CANONICAL_PLAN_BINDING_INVALID'
  | 'CANONICAL_PLAN_BINDING_AMBIGUOUS'
  | 'CANONICAL_PLAN_GENERATION_NOT_READY'
  | 'CANONICAL_PLAN_CONTEXT_MISMATCH'

export class CanonicalPlanSourceError extends Error {
  readonly code: CanonicalPlanSourceErrorCode

  constructor(code: CanonicalPlanSourceErrorCode, message: string) {
    super(message)
    this.name = 'CanonicalPlanSourceError'
    this.code = code
  }
}

export type CanonicalPlanReadTable =
  | 'canonical_plan_runtime_bindings'
  | 'knowledge_assets'
  | 'knowledge_processing_generations'

export type CanonicalPlanReadError = {
  message?: string
  code?: string
  details?: string
} | null

export type CanonicalPlanReadQuery = {
  select(columns: string): CanonicalPlanReadQuery
  eq(column: string, value: unknown): CanonicalPlanReadQuery
  maybeSingle(): Promise<{ data: unknown | null; error: CanonicalPlanReadError }>
}

export type CanonicalPlanReadClient = {
  from(table: CanonicalPlanReadTable): CanonicalPlanReadQuery
}

type BindingRow = {
  workspace_id: string
  academic_year_id: string
  canonical_plan_code: CanonicalPlanCode
  asset_id: string
  generation_id: string
}

type AssetRow = {
  id: string
  workspace_id: string
  academic_year_id: string | null
  current_generation_id: string | null
}

type GenerationRow = {
  id: string
  asset_id: string
  workspace_id: string
  status: string
}

type ClientFactory = () => Promise<CanonicalPlanReadClient>

async function defaultClientFactory(): Promise<CanonicalPlanReadClient> {
  const client = await createClient()
  return client as unknown as CanonicalPlanReadClient
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasString(row: Record<string, unknown>, key: string): boolean {
  return typeof row[key] === 'string' && row[key] !== ''
}

function asBindingRow(value: unknown): BindingRow | null {
  if (!isRecord(value)) return null
  if (!hasString(value, 'workspace_id')
    || !hasString(value, 'academic_year_id')
    || !hasString(value, 'canonical_plan_code')
    || !hasString(value, 'asset_id')
    || !hasString(value, 'generation_id')) return null
  if (!['CAN-PLAN-1', 'CAN-PLAN-2', 'CAN-PLAN-3'].includes(String(value.canonical_plan_code))) return null
  return value as unknown as BindingRow
}

function asAssetRow(value: unknown): AssetRow | null {
  if (!isRecord(value)) return null
  if (!hasString(value, 'id') || !hasString(value, 'workspace_id')) return null
  if (value.academic_year_id !== null && typeof value.academic_year_id !== 'string') return null
  if (value.current_generation_id !== null && typeof value.current_generation_id !== 'string') return null
  return value as unknown as AssetRow
}

function asGenerationRow(value: unknown): GenerationRow | null {
  if (!isRecord(value)) return null
  if (!hasString(value, 'id')
    || !hasString(value, 'asset_id')
    || !hasString(value, 'workspace_id')
    || !hasString(value, 'status')) return null
  return value as unknown as GenerationRow
}

function queryFailureMessage(error: CanonicalPlanReadError): string {
  return [error?.code, error?.message, error?.details].filter(Boolean).join(' ')
}

function isAmbiguousBindingError(error: CanonicalPlanReadError): boolean {
  return /multiple|more than one|[2-9]\s+rows/i.test(queryFailureMessage(error))
}

export class SupabaseCanonicalPlanSourceRepository implements CanonicalPlanSourceRepository {
  constructor(private readonly clientFactory: ClientFactory = defaultClientFactory) {}

  async resolve(input: CanonicalPlanSourceLookup): Promise<CanonicalPlanRuntimeSource> {
    const client = await this.clientFactory()

    const bindingQuery = client
      .from('canonical_plan_runtime_bindings')
      .select('workspace_id, academic_year_id, canonical_plan_code, asset_id, generation_id')
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .eq('canonical_plan_code', input.code)
    const bindingResult = await bindingQuery.maybeSingle()

    if (bindingResult.error) {
      if (isAmbiguousBindingError(bindingResult.error)) {
        throw new CanonicalPlanSourceError(
          'CANONICAL_PLAN_BINDING_AMBIGUOUS',
          `CPRI binding is ambiguous for ${input.code}`,
        )
      }
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_BINDING_INVALID',
        `CPRI binding query failed for ${input.code}`,
      )
    }

    if (!bindingResult.data) {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_BINDING_MISSING',
        `CPRI binding is missing for ${input.code}`,
      )
    }

    const binding = asBindingRow(bindingResult.data)
    if (!binding) {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_BINDING_INVALID',
        `CPRI binding is malformed for ${input.code}`,
      )
    }
    if (binding.workspace_id !== input.workspaceId
      || binding.academic_year_id !== input.academicYearId
      || binding.canonical_plan_code !== input.code) {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_CONTEXT_MISMATCH',
        `CPRI binding context does not match ${input.code}`,
      )
    }

    const assetResult = await client
      .from('knowledge_assets')
      .select('id, workspace_id, academic_year_id, current_generation_id')
      .eq('id', binding.asset_id)
      .maybeSingle()
    if (assetResult.error || !assetResult.data) {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_BINDING_INVALID',
        `CPRI asset is unavailable for ${input.code}`,
      )
    }

    const asset = asAssetRow(assetResult.data)
    if (!asset) {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_BINDING_INVALID',
        `CPRI asset is malformed for ${input.code}`,
      )
    }
    if (asset.workspace_id !== input.workspaceId || asset.academic_year_id !== input.academicYearId) {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_CONTEXT_MISMATCH',
        `CPRI asset context does not match ${input.code}`,
      )
    }

    const generationResult = await client
      .from('knowledge_processing_generations')
      .select('id, asset_id, workspace_id, status')
      .eq('id', binding.generation_id)
      .maybeSingle()
    if (generationResult.error || !generationResult.data) {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_BINDING_INVALID',
        `CPRI generation is unavailable for ${input.code}`,
      )
    }

    const generation = asGenerationRow(generationResult.data)
    if (!generation || generation.asset_id !== binding.asset_id) {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_BINDING_INVALID',
        `CPRI generation does not belong to the bound asset for ${input.code}`,
      )
    }
    if (generation.workspace_id !== input.workspaceId) {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_CONTEXT_MISMATCH',
        `CPRI generation context does not match ${input.code}`,
      )
    }
    if (generation.status !== 'SUCCEEDED') {
      throw new CanonicalPlanSourceError(
        'CANONICAL_PLAN_GENERATION_NOT_READY',
        `CPRI generation is not ready for ${input.code}`,
      )
    }

    return {
      code: input.code,
      assetId: binding.asset_id,
      generationId: binding.generation_id,
    }
  }
}
