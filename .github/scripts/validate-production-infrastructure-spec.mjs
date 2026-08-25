import fs from 'node:fs'

const specPath = 'ops/production-infrastructure-spec.json'
const promotionPath = 'ops/production-promotion-contract.json'
const renderPath = 'render.yaml'

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
const promotion = JSON.parse(fs.readFileSync(promotionPath, 'utf8'))
const render = fs.readFileSync(renderPath, 'utf8')

const fail = (message) => {
  console.error(`Production infrastructure spec invalid: ${message}`)
  process.exit(1)
}

if (spec.schemaVersion !== 2) fail('schemaVersion must be 2')
if (spec.environment !== 'production') fail('environment must be production')
if (!['NOT_PROVISIONED', 'PROVISIONED_NOT_ACTIVE', 'ACTIVE'].includes(spec.provisioningState)) fail('invalid provisioningState')
if (promotion.productionDataTopologyState !== 'SEPARATE') fail('promotion contract must require separate production data topology')
if (spec.release?.scope !== promotion.firstReleaseScope) fail('release scope must match promotion contract')
if (spec.release?.audience !== promotion.firstRelease?.releaseAudience) fail('release audience must match promotion contract')

if (spec.hosting?.providerDecisionState !== 'SELECTED') fail('hosting provider must be explicitly selected before provisioning')
if (spec.hosting?.provider !== 'RENDER') fail('P7-E pilot provider must be RENDER')
if (spec.hosting?.region !== 'frankfurt') fail('Production pilot must remain in Render Frankfurt')
if (spec.hosting?.plannedServiceName !== 'docente-os-2026-27-production') fail('unexpected planned Production service name')
if (spec.hosting?.runtimeTier !== 'UNDECIDED_BEFORE_PROVISIONING') fail('runtime tier must remain undecided until provisioning review')
if (spec.hosting?.customDomainState !== 'DEFERRED_UNTIL_ACTIVATION_READY') fail('custom domain must be deferred until activation readiness')

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
if (spec.release?.publicSignupAllowed !== false) fail('public signup must remain disabled for first release')
if (spec.release?.multiTenantOnboardingAllowed !== false) fail('multi-tenant onboarding must remain disabled for first release')
if (spec.release?.humanPromotionDecisionRequired !== true) fail('human promotion decision is required')
if (spec.hosting?.autoDeployAllowed !== false) fail('production auto-deploy must remain disabled')
if (spec.hosting?.deployModel !== 'IMMUTABLE_CERTIFIED_SHA') fail('production must deploy immutable certified SHA')

const betaSupabaseRef = /https:\/\/([a-z0-9]+)\.supabase\.co/.exec(render)?.[1]
const betaAppUrl = /NEXT_PUBLIC_APP_URL[\s\S]*?value:\s*(https?:\/\/\S+)/.exec(render)?.[1]
const betaServiceName = /name:\s*(docente-os-2026-27-beta)/.exec(render)?.[1]
const serialized = JSON.stringify(spec)
if (betaSupabaseRef && serialized.includes(betaSupabaseRef)) fail('spec must not reference the Beta Supabase project')
if (betaAppUrl && serialized.includes(betaAppUrl)) fail('spec must not reference the Beta app URL')
if (betaServiceName && spec.hosting?.plannedServiceName === betaServiceName) fail('Production service name must differ from Beta')
if (/sb_(publishable|secret)_[A-Za-z0-9_-]+/.test(serialized)) fail('real Supabase key material must not be committed in production spec')

if (spec.provisioningState === 'NOT_PROVISIONED') {
  if (spec.supabase?.projectState !== 'NOT_PROVISIONED') fail('Supabase state must remain NOT_PROVISIONED')
  if (spec.supabase?.projectRef !== 'UNASSIGNED') fail('projectRef must remain UNASSIGNED before provisioning')
  if (spec.supabase?.projectUrl !== 'UNASSIGNED') fail('projectUrl must remain UNASSIGNED before provisioning')
  if (spec.hosting?.serviceName !== 'UNASSIGNED') fail('serviceName must remain UNASSIGNED before provisioning')
}

if (spec.provisioningState === 'ACTIVE') {
  if (promotion.productionEnvironmentState !== 'ACTIVE') fail('production cannot be active while promotion contract is not ACTIVE')
  if (spec.supabase?.projectState !== 'PROVISIONED') fail('active production requires provisioned Supabase')
  if (['UNASSIGNED', ''].includes(spec.supabase?.projectRef)) fail('active production requires projectRef')
  if (['UNASSIGNED', ''].includes(spec.supabase?.projectUrl)) fail('active production requires projectUrl')
  if (['UNASSIGNED', ''].includes(spec.hosting?.serviceName)) fail('active production requires serviceName')
}

for (const [key, value] of Object.entries(spec.activationPrerequisites ?? {})) {
  if (value !== true) fail(`activationPrerequisites.${key} must be true`)
}

console.log(`Production infrastructure spec PASS: provisioning=${spec.provisioningState}, hosting=${spec.hosting.provider}, region=${spec.hosting.region}, scope=${spec.release.scope}`)
