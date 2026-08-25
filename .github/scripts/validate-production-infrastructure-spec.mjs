import fs from 'node:fs'

const spec = JSON.parse(fs.readFileSync('ops/production-infrastructure-spec.json', 'utf8'))
const promotion = JSON.parse(fs.readFileSync('ops/production-promotion-contract.json', 'utf8'))
const render = fs.readFileSync('render.yaml', 'utf8')

const fail = (message) => {
  console.error(`Production infrastructure spec invalid: ${message}`)
  process.exit(1)
}

if (spec.schemaVersion !== 4) fail('schemaVersion must be 4')
if (spec.environment !== 'production') fail('environment must be production')
if (!['NOT_PROVISIONED', 'PARTIALLY_PROVISIONED', 'PROVISIONED_INACTIVE', 'ACTIVE'].includes(spec.provisioningState)) fail('invalid provisioningState')
if (promotion.productionDataTopologyState !== 'SEPARATE') fail('promotion contract must require separate production data topology')
if (spec.release?.scope !== promotion.firstReleaseScope) fail('release scope must match promotion contract')
if (spec.release?.audience !== promotion.firstRelease?.releaseAudience) fail('release audience must match promotion contract')

if (spec.hosting?.providerDecisionState !== 'SELECTED') fail('hosting provider must be explicitly selected')
if (spec.hosting?.provider !== 'RENDER') fail('pilot provider must remain RENDER')
if (spec.hosting?.region !== 'frankfurt') fail('Production pilot must remain in Frankfurt')
if (spec.hosting?.customDomainState !== 'DEFERRED_UNTIL_ACTIVATION_READY') fail('custom domain must remain deferred')
if (spec.hosting?.autoDeployAllowed !== false) fail('Production auto-deploy must remain disabled')
if (spec.hosting?.deployModel !== 'IMMUTABLE_CERTIFIED_SHA') fail('Production must deploy immutable certified SHA')

for (const key of ['separateFromBetaRequired', 'databaseSeparateRequired', 'authSeparateRequired', 'storageSeparateRequired']) {
  if (spec.supabase?.[key] !== true) fail(`supabase.${key} must be true`)
}
for (const key of ['repositoryValuesAllowed', 'betaCredentialReuseAllowed']) {
  if (spec.secrets?.[key] !== false) fail(`secrets.${key} must be false`)
}
if (spec.secrets?.productionScopedRequired !== true) fail('production-scoped secrets are required')
for (const key of ['automaticBetaCopyAllowed', 'crossEnvironmentDatabaseWritesAllowed', 'crossEnvironmentStorageWritesAllowed']) {
  if (spec.data?.[key] !== false) fail(`data.${key} must be false`)
}
if (spec.data?.manualImportRequiresOwnerDecision !== true) fail('manual import must require owner decision')
if (spec.data?.realUserDataAccepted !== false) fail('real user data must remain disabled before activation')
if (spec.release?.publicSignupAllowed !== false) fail('public signup must remain disabled')
if (spec.release?.multiTenantOnboardingAllowed !== false) fail('multi-tenant onboarding must remain disabled')
if (spec.release?.humanPromotionDecisionRequired !== true) fail('human promotion decision is required')
if (spec.release?.activationState !== 'HOLD') fail('Production activation must remain HOLD')

const betaSupabaseRef = /https:\/\/([a-z0-9]+)\.supabase\.co/.exec(render)?.[1]
const betaAppUrl = /NEXT_PUBLIC_APP_URL[\s\S]*?value:\s*(https?:\/\/\S+)/.exec(render)?.[1]
const betaServiceName = /name:\s*(docente-os-2026-27-beta)/.exec(render)?.[1]
const serialized = JSON.stringify(spec)
if (betaSupabaseRef && serialized.includes(betaSupabaseRef)) fail('spec must not reference the Beta Supabase project')
if (betaAppUrl && serialized.includes(betaAppUrl)) fail('spec must not reference the Beta app URL')
if (betaServiceName && spec.hosting?.serviceName === betaServiceName) fail('Production service name must differ from Beta')
if (/sb_(publishable|secret)_[A-Za-z0-9_-]+/.test(serialized)) fail('real Supabase key material must not be committed')

if (spec.provisioningState === 'PROVISIONED_INACTIVE') {
  if (spec.supabase?.projectState !== 'PROVISIONED') fail('provisioned inactive Production requires Supabase')
  if (!spec.supabase?.projectRef || spec.supabase.projectRef === 'UNASSIGNED') fail('Production projectRef required')
  if (!spec.supabase?.projectUrl || spec.supabase.projectUrl === 'UNASSIGNED') fail('Production projectUrl required')
  if (spec.supabase?.schemaState !== 'CANONICAL_MIGRATIONS_APPLIED') fail('canonical schema required')
  if (spec.supabase?.applicationDataState !== 'EMPTY') fail('application data must remain empty')
  if (spec.supabase?.technicalAuthIdentityCount !== 1) fail('one dedicated technical Auth identity expected')
  if (spec.hosting?.serviceState !== 'PROVISIONED_INACTIVE') fail('Render service must be provisioned inactive')
  if (spec.hosting?.serviceName !== 'docente-os-2026-27-production') fail('unexpected Production service name')
  if (spec.hosting?.serviceUrl !== 'https://docente-os-2026-27-production.onrender.com') fail('unexpected Production service URL')
  if (spec.secrets?.configurationState !== 'CONFIGURED_OUTSIDE_REPOSITORY') fail('Production environment must be configured outside repository')
  if (spec.runtimeVerification?.state !== 'PASS' || spec.runtimeVerification?.runId !== 32836204567) fail('certified runtime smoke missing')
  if (spec.runtimeVerification?.mutatingActionsPerformed !== false || spec.runtimeVerification?.applicationRowsCreated !== 0) fail('runtime smoke must remain non-mutating')
}

if (spec.provisioningState === 'ACTIVE') {
  if (promotion.productionEnvironmentState !== 'ACTIVE') fail('Production cannot be active while promotion contract is not ACTIVE')
}

for (const [key, value] of Object.entries(spec.activationPrerequisites ?? {})) {
  if (value !== true) fail(`activationPrerequisites.${key} must be true`)
}

console.log(`Production infrastructure spec PASS: provisioning=${spec.provisioningState}, hosting=${spec.hosting.serviceState}, supabase=${spec.supabase.projectState}, runtime=${spec.runtimeVerification.state}, scope=${spec.release.scope}`)
