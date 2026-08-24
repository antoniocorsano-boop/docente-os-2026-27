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

if (contract.schemaVersion !== 2) fail('schemaVersion must be 2')
if (contract.candidateSourceBranch !== 'develop') fail('candidate source must remain develop')
if (contract.promotionModel !== 'immutable_commit') fail('promotion must use immutable commits')
if (!['NOT_CREATED', 'CREATED_NOT_ACTIVE', 'ACTIVE'].includes(contract.productionEnvironmentState)) fail('invalid productionEnvironmentState')
if (contract.productionDataTopologyState !== 'SEPARATE') fail('production data topology must remain SEPARATE')
if (contract.firstReleaseScope !== 'SINGLE_OWNER_PILOT') fail('first release must remain SINGLE_OWNER_PILOT')

const topology = contract.dataTopology ?? {}
for (const key of ['supabaseProject', 'database', 'auth', 'storage', 'environmentSecrets']) {
  if (topology[key] !== 'SEPARATE_REQUIRED') fail(`${key} must be separate in production`)
}
for (const key of [
  'betaDataAutomaticCopyAllowed',
  'betaCredentialsReuseAllowed',
  'crossEnvironmentStorageWritesAllowed',
  'crossEnvironmentDatabaseWritesAllowed',
]) {
  if (topology[key] !== false) fail(`${key} must remain false`)
}

const firstRelease = contract.firstRelease ?? {}
if (firstRelease.publicSignupAllowed !== false) fail('public signup must remain disabled for first release')
if (firstRelease.multiTenantOnboardingAllowed !== false) fail('multi-tenant onboarding must remain disabled for first release')
if (firstRelease.betaDataMigrationAutomatic !== false) fail('automatic Beta data migration must remain disabled')
if (firstRelease.manualImportRequiresExplicitOwnerDecision !== true) fail('manual import must require explicit owner decision')
if (firstRelease.releaseAudience !== 'named_owner_only') fail('first release audience must remain named_owner_only')

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

if (contract.productionEnvironmentState === 'ACTIVE' && contract.productionDataTopologyState !== 'SEPARATE') {
  fail('production cannot be ACTIVE without separate data topology')
}

if (contract.rollback?.application !== 'redeploy_previous_certified_sha') fail('application rollback must target a certified SHA')
if (contract.rollback?.database !== 'forward_recovery_only_unless_restore_rehearsal_is_proven') fail('database recovery policy is unsafe')
if (contract.rollback?.storage !== 'no_destructive_rollback_without_verified_backup') fail('storage rollback policy is unsafe')

console.log(`Production promotion contract PASS: ${requiredGates.length} minimum gates, production=${contract.productionEnvironmentState}, data=${contract.productionDataTopologyState}, scope=${contract.firstReleaseScope}`)
