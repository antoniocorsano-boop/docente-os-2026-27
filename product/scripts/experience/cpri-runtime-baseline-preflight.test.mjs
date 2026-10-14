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
        generationStatus: 'SUCCEEDED',
      },
    ],
  }
}

async function classify(snapshot) {
  const module = await import(implementationUrl.href)
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
