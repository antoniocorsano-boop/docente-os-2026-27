import fs from 'node:fs'

const spec = JSON.parse(fs.readFileSync('ops/production-infrastructure-spec.json', 'utf8'))
const promotion = JSON.parse(fs.readFileSync('ops/production-promotion-contract.json', 'utf8'))
const render = fs.readFileSync('render.yaml', 'utf8')
const fail = (message) => { console.error(`Production infrastructure spec invalid: ${message}`); process.exit(1) }
const tier1 = 'TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL'

if (![4,5,6].includes(spec.schemaVersion)) fail('schemaVersion must be 4, 5 or 6')
if (spec.environment !== 'production') fail('environment must be production')
if (!['NOT_PROVISIONED','PARTIALLY_PROVISIONED','PROVISIONED_INACTIVE','ACTIVE_SINGLE_OWNER_PILOT'].includes(spec.provisioningState)) fail('invalid provisioningState')
if (promotion.productionDataTopologyState !== 'SEPARATE') fail('promotion contract must require separate production data topology')
if (spec.release?.scope !== promotion.firstReleaseScope || spec.release?.audience !== promotion.firstRelease?.releaseAudience) fail('release scope/audience mismatch')
if (spec.hosting?.providerDecisionState !== 'SELECTED' || spec.hosting?.provider !== 'RENDER' || spec.hosting?.region !== 'frankfurt') fail('hosting mismatch')
if (spec.hosting?.autoDeployAllowed !== false || spec.hosting?.deployModel !== 'IMMUTABLE_CERTIFIED_SHA') fail('unsafe deploy configuration')
for (const key of ['separateFromBetaRequired','databaseSeparateRequired','authSeparateRequired','storageSeparateRequired']) if (spec.supabase?.[key] !== true) fail(`supabase.${key} must be true`)
for (const key of ['repositoryValuesAllowed','betaCredentialReuseAllowed']) if (spec.secrets?.[key] !== false) fail(`secrets.${key} must be false`)
if (spec.secrets?.productionScopedRequired !== true) fail('production-scoped secrets are required')
for (const key of ['automaticBetaCopyAllowed','crossEnvironmentDatabaseWritesAllowed','crossEnvironmentStorageWritesAllowed']) if (spec.data?.[key] !== false) fail(`data.${key} must be false`)
if (spec.data?.manualImportRequiresOwnerDecision !== true) fail('manual import must require owner decision')
if (spec.release?.publicSignupAllowed !== false || spec.release?.multiTenantOnboardingAllowed !== false) fail('public/multi-tenant scope forbidden')

if (spec.provisioningState === 'ACTIVE_SINGLE_OWNER_PILOT') {
  if (![5,6].includes(spec.schemaVersion)) fail('active pilot must use schemaVersion 5 or 6')
  if (promotion.productionEnvironmentState !== 'ACTIVE' || spec.release?.activationState !== 'ACTIVE') fail('active state mismatch')
  if (spec.release?.releaseReceipt !== 'ops/production-release-receipt.json') fail('release receipt missing')
  if (spec.hosting?.serviceState !== 'ACTIVE' || spec.hosting?.serviceName !== 'docente-os-2026-27-production' || spec.hosting?.serviceUrl !== 'https://docente-os-2026-27-production.onrender.com') fail('Production service mismatch')
  if (spec.hosting?.servedCommitAtCertifiedSmoke !== 'db3d4ab014ad11dec4aeccdb5aa8740220e4ebde') fail('authorized candidate mismatch')
  if (spec.supabase?.projectState !== 'PROVISIONED' || spec.supabase?.schemaState !== 'CANONICAL_MIGRATIONS_APPLIED') fail('Supabase mismatch')
  if (spec.runtimeVerification?.state !== 'PASS' || spec.runtimeVerification?.runId !== 32903982577 || spec.runtimeVerification?.jobId !== 97983821918 || spec.runtimeVerification?.exactCandidateShaVerified !== true) fail('certifying smoke missing')
  if (spec.runtimeVerification?.mutatingActionsPerformed !== false) fail('certifying smoke must remain non-mutating')
  if (spec.schemaVersion === 5) {
    if (spec.data?.realUserDataAccepted !== false) fail('schema 5 must remain pre-real-data')
    if (spec.supabase?.applicationDataState !== 'EMPTY') fail('pre-real-data state must remain empty')
  }
  if (spec.schemaVersion === 6) {
    if (spec.data?.realUserDataAccepted !== true || spec.data?.admissionScope !== tier1) fail('Tier 1 admission mismatch')
    for (const key of ['studentPersonalDataAllowed','thirdPartyPersonalDataAllowed','specialCategoryDataAllowed','credentialsOrSecretsAllowed']) if (spec.data?.[key] !== false) fail(`${key} must remain false`)
    if (spec.data?.admissionDecisionReceipt !== 'ops/real-data-admission-decision-receipt.json') fail('Tier 1 decision receipt missing')
  }
}

const serialized = JSON.stringify(spec)
const betaSupabaseRef = /https:\/\/([a-z0-9]+)\.supabase\.co/.exec(render)?.[1]
if (betaSupabaseRef && serialized.includes(betaSupabaseRef)) fail('spec must not reference Beta Supabase')
if (/sb_(publishable|secret)_[A-Za-z0-9_-]+/.test(serialized)) fail('real Supabase key material must not be committed')
for (const [key,value] of Object.entries(spec.activationPrerequisites ?? {})) if (value !== true) fail(`activationPrerequisites.${key} must be true`)
console.log(`Production infrastructure spec PASS: provisioning=${spec.provisioningState}, schema=${spec.schemaVersion}, admission=${spec.data?.admissionScope ?? 'NONE'}`)
