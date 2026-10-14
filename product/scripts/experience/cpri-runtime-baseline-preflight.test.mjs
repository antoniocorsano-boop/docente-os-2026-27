import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const implementationUrl = new URL('./cpri-runtime-baseline-preflight.mjs', import.meta.url)
const implementationPath = fileURLToPath(implementationUrl)
const implementationExists = existsSync(implementationPath)

function validSnapshot() {
  return {
    runtimeContract: {
      contractVersion: 100,
      migrationId: '0100_contain_provenance_anchor_and_column_grants',
      lineageOk: true,
      provenanceOk: true,
      containmentOk: true,
      containment: {
        cpriBindingTablePresent: true,
        cpriLegacyMutatorsExposed: false,
        cpriRuntimeMutationGrants: false,
      },
    },
    bindingTableCompatible: true,
    requiredCodes: ['CAN-PLAN-1'],
    bindings: [
      {
        code: 'CAN-PLAN-1',
        workspaceId: 'workspace-a',
        academicYearId: 'year-a',
        assetId: 'asset-a',
        generationId: 'generation-a',
        assetWorkspaceId: 'workspace-a',
        assetAcademicYearId: 'year-a',
        generationAssetId: 'asset-a',
        generationWorkspaceId: 'workspace-a',
        generationStatus: 'SUCCEEDED',
      },
    ],
  }
}

async function loadModule() {
  return import(implementationUrl.href)
}

async function classify(snapshot) {
  const module = await loadModule()
  return module.classifyCpriRuntimeBaseline(snapshot)
}

test('CPRI baseline preflight implementation exists', () => {
  assert.equal(
    implementationExists,
    true,
    'cpri-runtime-baseline-preflight.mjs must exist before CPRI baseline can be READY',
  )
})

test('blocks a runtime contract below the contained CPRI baseline', { skip: !implementationExists }, async () => {
  const snapshot = validSnapshot()
  snapshot.runtimeContract.contractVersion = 99
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('RUNTIME_CONTRACT_BELOW_V100'))
})

test('blocks a missing or incompatible CPRI binding table', { skip: !implementationExists }, async () => {
  const missing = validSnapshot()
  missing.runtimeContract.containment.cpriBindingTablePresent = false
  assert.equal((await classify(missing)).status, 'BLOCKED')

  const incompatible = validSnapshot()
  incompatible.bindingTableCompatible = false
  const result = await classify(incompatible)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('CPRI_BINDING_TABLE_INCOMPATIBLE'))
})

test('blocks executable legacy CPRI mutation authority', { skip: !implementationExists }, async () => {
  const snapshot = validSnapshot()
  snapshot.runtimeContract.containment.cpriLegacyMutatorsExposed = true
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('LEGACY_CPRI_MUTATOR_EXPOSED'))
})

test('blocks runtime mutation grants on CPRI', { skip: !implementationExists }, async () => {
  const snapshot = validSnapshot()
  snapshot.runtimeContract.containment.cpriRuntimeMutationGrants = true
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('CPRI_RUNTIME_MUTATION_GRANT'))
})

test('blocks invalid runtime lineage, provenance or containment', { skip: !implementationExists }, async () => {
  for (const field of ['lineageOk', 'provenanceOk', 'containmentOk']) {
    const snapshot = validSnapshot()
    snapshot.runtimeContract[field] = false
    assert.equal((await classify(snapshot)).status, 'BLOCKED')
  }
})

test('blocks a missing required binding', { skip: !implementationExists }, async () => {
  const snapshot = validSnapshot()
  snapshot.bindings = []
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('REQUIRED_BINDING_MISSING:CAN-PLAN-1'))
})

test('blocks binding asset/generation context mismatch', { skip: !implementationExists }, async () => {
  const snapshot = validSnapshot()
  snapshot.bindings[0].assetWorkspaceId = 'workspace-b'
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('BINDING_CONTEXT_MISMATCH:CAN-PLAN-1'))
})

test('blocks a non-SUCCEEDED bound generation', { skip: !implementationExists }, async () => {
  const snapshot = validSnapshot()
  snapshot.bindings[0].generationStatus = 'FAILED'
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('BOUND_GENERATION_NOT_SUCCEEDED:CAN-PLAN-1'))
})

test('returns READY for a valid contained v100 CPRI binding set', { skip: !implementationExists }, async () => {
  const result = await classify(validSnapshot())
  assert.deepEqual(result, { status: 'READY', blockers: [] })
})

test('environment reader uses only the runtime snapshot RPC and read-only table requests', { skip: !implementationExists }, async () => {
  const requests = []
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url: String(url), method: init.method ?? 'GET', body: init.body ?? null })
    const pathname = new URL(url).pathname

    if (pathname.endsWith('/rpc/runtime_schema_contract_snapshot')) {
      return response(validSnapshot().runtimeContract)
    }
    if (pathname.endsWith('/canonical_plan_runtime_bindings')) {
      return response([{
        canonical_plan_code: 'CAN-PLAN-1',
        workspace_id: 'workspace-a',
        academic_year_id: 'year-a',
        asset_id: 'asset-a',
        generation_id: 'generation-a',
      }])
    }
    if (pathname.endsWith('/knowledge_assets')) {
      return response([{ id: 'asset-a', workspace_id: 'workspace-a', academic_year_id: 'year-a' }])
    }
    if (pathname.endsWith('/knowledge_processing_generations')) {
      return response([{
        id: 'generation-a',
        asset_id: 'asset-a',
        workspace_id: 'workspace-a',
        status: 'SUCCEEDED',
      }])
    }
    throw new Error(`Unexpected preflight request: ${url}`)
  }

  const module = await loadModule()
  const snapshot = await module.readCpriRuntimeBaselineEnvironment({
    fetchImpl,
    supabaseUrl: 'https://example.supabase.co',
    apiKey: 'publishable-key',
    accessToken: 'access-token',
    workspaceId: 'workspace-a',
    academicYearId: 'year-a',
    requiredCodes: ['CAN-PLAN-1'],
  })

  assert.deepEqual(module.classifyCpriRuntimeBaseline(snapshot), { status: 'READY', blockers: [] })
  assert.equal(requests.length, 4)
  assert.deepEqual(requests.map((request) => request.method), ['POST', 'GET', 'GET', 'GET'])
  assert.equal(requests[0].body, '{}')
  assert.ok(requests[0].url.includes('/rest/v1/rpc/runtime_schema_contract_snapshot'))
  assert.ok(requests.slice(1).every((request) => request.method === 'GET'))
})

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload
    },
  }
}
