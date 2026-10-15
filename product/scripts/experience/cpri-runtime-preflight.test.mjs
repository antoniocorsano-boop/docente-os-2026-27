import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const implementationUrl = new URL('./cpri-runtime-preflight.mjs', import.meta.url)
const implementationExists = existsSync(fileURLToPath(implementationUrl))

function validRuntimeSnapshot() {
  return {
    runtimeContract: {
      contractVersion: 102,
      migrationId: '0102_cpri_binding_movement_and_revalidation',
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
    bindings: [{
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
    }],
  }
}

const cleanStaticAuthority = () => ({ ok: true, runtimeAuthority: [], unclassified: [] })

async function classify(runtimeSnapshot = validRuntimeSnapshot(), staticAuthority = cleanStaticAuthority()) {
  const module = await import(implementationUrl.href)
  return module.classifyCpriRuntimePreflight({ runtimeSnapshot, staticAuthority })
}

test('CPRI final runtime preflight implementation exists', () => {
  assert.equal(
    implementationExists,
    true,
    'cpri-runtime-preflight.mjs must exist before CPRI-01 can be READY for promotion qualification',
  )
})

test('blocks a schema contract below CPRI movement baseline v102', { skip: !implementationExists }, async () => {
  const snapshot = validRuntimeSnapshot()
  snapshot.runtimeContract.contractVersion = 101
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('CPRI_RUNTIME_CONTRACT_BELOW_V102'))
})

test('composes schema provenance and containment failures from the baseline authority', { skip: !implementationExists }, async () => {
  for (const field of ['lineageOk', 'provenanceOk', 'containmentOk']) {
    const snapshot = validRuntimeSnapshot()
    snapshot.runtimeContract[field] = false
    assert.equal((await classify(snapshot)).status, 'BLOCKED')
  }
})

test('blocks a missing required canonical-plan binding', { skip: !implementationExists }, async () => {
  const snapshot = validRuntimeSnapshot()
  snapshot.bindings = []
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('REQUIRED_BINDING_MISSING:CAN-PLAN-1'))
})

test('blocks binding context mismatch', { skip: !implementationExists }, async () => {
  const snapshot = validRuntimeSnapshot()
  snapshot.bindings[0].assetWorkspaceId = 'workspace-b'
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('BINDING_CONTEXT_MISMATCH:CAN-PLAN-1'))
})

test('blocks a non-SUCCEEDED governed generation', { skip: !implementationExists }, async () => {
  const snapshot = validRuntimeSnapshot()
  snapshot.bindings[0].generationStatus = 'FAILED'
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('BOUND_GENERATION_NOT_SUCCEEDED:CAN-PLAN-1'))
})

test('blocks unexpectedly executable legacy CPRI mutation authority', { skip: !implementationExists }, async () => {
  const snapshot = validRuntimeSnapshot()
  snapshot.runtimeContract.containment.cpriLegacyMutatorsExposed = true
  const result = await classify(snapshot)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('LEGACY_CPRI_MUTATOR_EXPOSED'))
})

test('blocks when repository static runtime authority is not clean', { skip: !implementationExists }, async () => {
  const result = await classify(validRuntimeSnapshot(), {
    ok: false,
    runtimeAuthority: [{ file: 'product/src/example.ts', line: 12, token: 'production-id' }],
    unclassified: [],
  })
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.includes('STATIC_RUNTIME_AUTHORITY_INVALID'))
})

test('returns READY only when runtime baseline and static authority are both qualified', { skip: !implementationExists }, async () => {
  assert.deepEqual(
    await classify(),
    { status: 'READY', blockers: [] },
  )
})
