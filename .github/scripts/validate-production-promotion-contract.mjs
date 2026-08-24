import fs from 'node:fs'

const path = 'ops/production-promotion-contract.json'
const contract = JSON.parse(fs.readFileSync(path, 'utf8'))

const requiredGates = [
  'product-ci',
  'ops-security/supabase',
  'ops-security/dependencies',
  'ops-health/render-beta',
  'p6-performance/render-beta',
  'x3-e2e/render-beta',
  'x4-planner/render-beta',
  'x5-authoring/render-beta',
  'x5b-export/render-beta',
  'hva/runtime',
]

const fail = (message) => {
  console.error(`Production promotion contract invalid: ${message}`)
  process.exit(1)
}

if (contract.schemaVersion !== 1) fail('schemaVersion must be 1')
if (contract.candidateSourceBranch !== 'develop') fail('candidate source must remain develop')
if (contract.promotionModel !== 'immutable_commit') fail('promotion must use immutable commits')
if (!['NOT_CREATED', 'CREATED_NOT_ACTIVE', 'ACTIVE'].includes(contract.productionEnvironmentState)) fail('invalid productionEnvironmentState')
if (!['UNDECIDED', 'SEPARATE', 'SHARED_EXPLICITLY_APPROVED'].includes(contract.productionDataTopologyState)) fail('invalid productionDataTopologyState')

for (const gate of requiredGates) {
  if (!contract.minimumGates?.includes(gate)) fail(`missing minimum gate ${gate}`)
}

const rules = contract.promotionRules ?? {}
for (const key of [
  'exactCandidateShaRequired',
  'betaMustServeCandidateOrProductEquivalent',
  'humanReleaseDecisionRequired',
  'productionDataTopologyMustBeExplicit',
  'productionSecretsMustBeEnvironmentScoped',
  'rollbackTargetMustBePreviouslyCertified',
  'releaseReceiptRequired',
]) {
  if (rules[key] !== true) fail(`${key} must be true`)
}
if (rules.automaticProductionPromotionAllowed !== false) fail('automatic production promotion must remain disabled')
if (rules.destructiveDatabaseMigrationsAllowed !== false) fail('destructive database migrations must remain disabled')
if (rules.databaseRollbackAutomatic !== false) fail('automatic database rollback must remain disabled')

if (contract.productionEnvironmentState === 'ACTIVE' && contract.productionDataTopologyState === 'UNDECIDED') {
  fail('production cannot be ACTIVE while data topology is undecided')
}

if (contract.rollback?.application !== 'redeploy_previous_certified_sha') fail('application rollback must target a certified SHA')
if (contract.rollback?.database !== 'forward_recovery_only_unless_restore_rehearsal_is_proven') fail('database recovery policy is unsafe')
if (contract.rollback?.storage !== 'no_destructive_rollback_without_verified_backup') fail('storage rollback policy is unsafe')

console.log(`Production promotion contract PASS: ${requiredGates.length} minimum gates, production=${contract.productionEnvironmentState}, data=${contract.productionDataTopologyState}`)
