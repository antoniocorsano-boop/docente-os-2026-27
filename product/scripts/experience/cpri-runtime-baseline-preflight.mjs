const CONTAINED_CPRI_CONTRACT_VERSION = 100

export function classifyCpriRuntimeBaseline(snapshot) {
  const blockers = []
  const runtimeContract = snapshot?.runtimeContract ?? {}
  const containment = runtimeContract?.containment ?? {}

  if (!Number.isFinite(runtimeContract.contractVersion)
    || runtimeContract.contractVersion < CONTAINED_CPRI_CONTRACT_VERSION) {
    blockers.push('RUNTIME_CONTRACT_BELOW_V100')
  }
  if (runtimeContract.lineageOk !== true) blockers.push('RUNTIME_LINEAGE_INVALID')
  if (runtimeContract.provenanceOk !== true) blockers.push('RUNTIME_PROVENANCE_INVALID')
  if (runtimeContract.containmentOk !== true) blockers.push('RUNTIME_CONTAINMENT_INVALID')
  if (containment.cpriBindingTablePresent !== true) blockers.push('CPRI_BINDING_TABLE_MISSING')
  if (snapshot?.bindingTableCompatible !== true) blockers.push('CPRI_BINDING_TABLE_INCOMPATIBLE')
  if (containment.cpriLegacyMutatorsExposed === true) blockers.push('LEGACY_CPRI_MUTATOR_EXPOSED')
  if (containment.cpriRuntimeMutationGrants === true) blockers.push('CPRI_RUNTIME_MUTATION_GRANT')

  const bindings = Array.isArray(snapshot?.bindings) ? snapshot.bindings : []
  const requiredCodes = Array.isArray(snapshot?.requiredCodes) ? snapshot.requiredCodes : []

  for (const code of requiredCodes) {
    const matches = bindings.filter((binding) => binding?.code === code)
    if (matches.length === 0) {
      blockers.push(`REQUIRED_BINDING_MISSING:${code}`)
      continue
    }
    if (matches.length > 1) {
      blockers.push(`DUPLICATE_REQUIRED_BINDING:${code}`)
      continue
    }

    const binding = matches[0]
    const contextMatches = Boolean(
      binding.workspaceId
      && binding.academicYearId
      && binding.assetId
      && binding.generationId
      && binding.assetWorkspaceId === binding.workspaceId
      && binding.assetAcademicYearId === binding.academicYearId
      && binding.generationAssetId === binding.assetId
      && binding.generationWorkspaceId === binding.workspaceId,
    )

    if (!contextMatches) blockers.push(`BINDING_CONTEXT_MISMATCH:${code}`)
    if (binding.generationStatus !== 'SUCCEEDED') {
      blockers.push(`BOUND_GENERATION_NOT_SUCCEEDED:${code}`)
    }
  }

  return blockers.length > 0
    ? { status: 'BLOCKED', blockers }
    : { status: 'READY', blockers: [] }
}

export async function readCpriRuntimeBaselineEnvironment({
  fetchImpl = globalThis.fetch,
  supabaseUrl,
  apiKey,
  accessToken,
  workspaceId,
  academicYearId,
  requiredCodes = ['CAN-PLAN-1', 'CAN-PLAN-2', 'CAN-PLAN-3'],
}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required')
  if (!supabaseUrl) throw new TypeError('supabaseUrl is required')
  if (!apiKey) throw new TypeError('apiKey is required')
  if (!accessToken) throw new TypeError('accessToken is required')

  const headers = {
    apikey: apiKey,
    authorization: `Bearer ${accessToken}`,
  }

  const runtimeContract = await fetchJson(
    fetchImpl,
    `${stripTrailingSlash(supabaseUrl)}/rest/v1/rpc/runtime_schema_contract_snapshot`,
    {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: '{}',
    },
    'runtime schema contract',
  )

  const bindingUrl = new URL(`${stripTrailingSlash(supabaseUrl)}/rest/v1/canonical_plan_runtime_bindings`)
  bindingUrl.searchParams.set(
    'select',
    'canonical_plan_code,workspace_id,academic_year_id,asset_id,generation_id',
  )
  if (workspaceId) bindingUrl.searchParams.set('workspace_id', `eq.${workspaceId}`)
  if (academicYearId) bindingUrl.searchParams.set('academic_year_id', `eq.${academicYearId}`)
  if (requiredCodes.length > 0) {
    bindingUrl.searchParams.set('canonical_plan_code', `in.(${requiredCodes.join(',')})`)
  }

  const rawBindings = await fetchJson(fetchImpl, bindingUrl, { headers }, 'CPRI bindings')
  if (!Array.isArray(rawBindings)) throw new Error('CPRI bindings response must be an array')

  const assetIds = unique(rawBindings.map((binding) => binding.asset_id).filter(Boolean))
  const generationIds = unique(rawBindings.map((binding) => binding.generation_id).filter(Boolean))

  const assets = assetIds.length > 0
    ? await readRowsByIds({
      fetchImpl,
      supabaseUrl,
      headers,
      table: 'knowledge_assets',
      select: 'id,workspace_id,academic_year_id',
      ids: assetIds,
      label: 'Knowledge assets',
    })
    : []

  const generations = generationIds.length > 0
    ? await readRowsByIds({
      fetchImpl,
      supabaseUrl,
      headers,
      table: 'knowledge_processing_generations',
      select: 'id,asset_id,workspace_id,status',
      ids: generationIds,
      label: 'Knowledge generations',
    })
    : []

  const assetById = new Map(assets.map((asset) => [asset.id, asset]))
  const generationById = new Map(generations.map((generation) => [generation.id, generation]))
  const contractPayload = Array.isArray(runtimeContract) ? runtimeContract[0] : runtimeContract

  return {
    runtimeContract: contractPayload ?? null,
    bindingTableCompatible: true,
    requiredCodes: [...requiredCodes],
    bindings: rawBindings.map((binding) => {
      const asset = assetById.get(binding.asset_id)
      const generation = generationById.get(binding.generation_id)
      return {
        code: binding.canonical_plan_code,
        workspaceId: binding.workspace_id,
        academicYearId: binding.academic_year_id,
        assetId: binding.asset_id,
        generationId: binding.generation_id,
        assetWorkspaceId: asset?.workspace_id ?? null,
        assetAcademicYearId: asset?.academic_year_id ?? null,
        generationAssetId: generation?.asset_id ?? null,
        generationWorkspaceId: generation?.workspace_id ?? null,
        generationStatus: generation?.status ?? null,
      }
    }),
  }
}

export async function runCpriRuntimeBaselinePreflight(options) {
  try {
    const snapshot = await readCpriRuntimeBaselineEnvironment(options)
    return classifyCpriRuntimeBaseline(snapshot)
  } catch (error) {
    return {
      status: 'BLOCKED',
      blockers: [`ENVIRONMENT_READ_FAILED:${safeErrorCode(error)}`],
    }
  }
}

async function readRowsByIds({ fetchImpl, supabaseUrl, headers, table, select, ids, label }) {
  const url = new URL(`${stripTrailingSlash(supabaseUrl)}/rest/v1/${table}`)
  url.searchParams.set('select', select)
  url.searchParams.set('id', `in.(${ids.join(',')})`)
  const rows = await fetchJson(fetchImpl, url, { headers }, label)
  if (!Array.isArray(rows)) throw new Error(`${label} response must be an array`)
  return rows
}

async function fetchJson(fetchImpl, url, init, label) {
  const response = await fetchImpl(url, init)
  if (!response?.ok) {
    throw new Error(`${label} returned ${response?.status ?? 'no-status'}`)
  }
  return response.json()
}

function stripTrailingSlash(value) {
  return String(value).replace(/\/+$/, '')
}

function unique(values) {
  return [...new Set(values)]
}

function safeErrorCode(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/[^A-Za-z0-9_.:-]+/g, '_').slice(0, 160) || 'UNKNOWN'
}
