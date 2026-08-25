import fs from 'node:fs'

const review = JSON.parse(fs.readFileSync('ops/production-readiness-review.json', 'utf8'))
const infra = JSON.parse(fs.readFileSync('ops/production-infrastructure-spec.json', 'utf8'))
const receipt = JSON.parse(fs.readFileSync('ops/production-provisioning-receipt.json', 'utf8'))
const incident = JSON.parse(fs.readFileSync('ops/incident-escalation-rehearsal-receipt.json', 'utf8'))

const fail = (message) => {
  console.error(`Production readiness review invalid: ${message}`)
  process.exit(1)
}

if (review.schemaVersion !== 4) fail('schemaVersion must be 4')
if (review.review !== 'P7-D') fail('review must remain rooted in P7-D')
if (review.reviewState !== 'CURRENT') fail('reviewState must be CURRENT')
if (review.productionActivationDecision !== 'HOLD') fail('production activation must remain HOLD while recovery blockers exist')
if (review.inactiveProvisioningDecision !== 'COMPLETE') fail('inactive provisioning must be COMPLETE after certified P7-F2 runtime')
if (review.scope !== 'SINGLE_OWNER_PILOT') fail('scope must remain SINGLE_OWNER_PILOT')

for (const key of [
  'provisioningIsNotActivation',
  'inactiveInfrastructureMayBeUsedForRecoveryTesting',
  'realUserDataRequiresActivationGate',
  'betaAndProductionMustRemainSeparated',
]) {
  if (review.principles?.[key] !== true) fail(`${key} must be true`)
}

const requiredSatisfied = [
  'P7A_PROMOTION_CONTRACT',
  'P7B_DATA_TOPOLOGY',
  'P7C_INFRASTRUCTURE_SPEC',
  'P7E_PROVIDER_SELECTION',
  'P7F_SUPABASE_PROVISIONING',
  'P7F2_RUNTIME_PROVISIONING',
  'DB_LOGICAL_RESTORE',
  'INCIDENT_ESCALATION_MINIMUM',
  'SECURITY_BASELINE',
  'BETA_RUNTIME_GATES',
]
const satisfied = new Map((review.satisfied ?? []).map((item) => [item.id, item]))
for (const id of requiredSatisfied) {
  if (satisfied.get(id)?.classification !== 'SATISFIED') fail(`missing satisfied prerequisite ${id}`)
}

if (infra.schemaVersion !== 4) fail('infrastructure schemaVersion must be 4')
if (infra.provisioningState !== 'PROVISIONED_INACTIVE') fail('Production infrastructure must be provisioned but inactive')
if (infra.hosting?.provider !== 'RENDER' || infra.hosting?.providerDecisionState !== 'SELECTED') fail('Render must remain selected provider')
if (infra.hosting?.serviceState !== 'PROVISIONED_INACTIVE') fail('Render service must be recorded as provisioned inactive')
if (infra.hosting?.serviceName !== 'docente-os-2026-27-production') fail('unexpected Render service name')
if (infra.hosting?.region !== 'frankfurt') fail('Production region must be Frankfurt')
if (infra.hosting?.autoDeployAllowed !== false) fail('Production auto-deploy must remain disabled')
if (infra.supabase?.projectState !== 'PROVISIONED') fail('Production Supabase must be provisioned')
if (infra.supabase?.applicationDataState !== 'EMPTY') fail('Production application data must remain empty')
if (infra.supabase?.technicalAuthIdentityCount !== 1) fail('exactly one dedicated technical Auth identity is expected')
if (infra.secrets?.configurationState !== 'CONFIGURED_OUTSIDE_REPOSITORY') fail('Production-scoped environment must be configured outside repository')
if (infra.runtimeVerification?.state !== 'PASS' || infra.runtimeVerification?.runId !== 32836204567) fail('certified Production Runtime Smoke evidence missing')
if (infra.runtimeVerification?.mutatingActionsPerformed !== false || infra.runtimeVerification?.applicationRowsCreated !== 0) fail('runtime smoke must remain non-mutating')
if (infra.data?.realUserDataAccepted !== false || infra.release?.activationState !== 'HOLD') fail('real data/activation invariant violated')

if (receipt.schemaVersion !== 3 || receipt.gate !== 'P7-F2') fail('provisioning receipt must be current P7-F2 receipt')
if (receipt.overallState !== 'PROVISIONED_INACTIVE' || receipt.activationState !== 'HOLD') fail('receipt must record inactive provisioned HOLD state')
if (receipt.realUserDataAccepted !== false) fail('receipt must confirm no real user data')
if (receipt.supabase?.technicalAuthUsers !== 1 || receipt.supabase?.workspaceRows !== 0 || receipt.supabase?.storageObjectCount !== 0 || receipt.supabase?.applicationDataRows !== 0) fail('Production must contain only the technical Auth identity and no application data')
if (receipt.render?.state !== 'PROVISIONED_INACTIVE') fail('receipt must record Render as provisioned inactive')
if (receipt.runtimeSmoke?.state !== 'PASS' || receipt.runtimeSmoke?.runId !== 32836204567) fail('receipt must prove authenticated runtime smoke')
if (receipt.runtimeSmoke?.mutatingActionsPerformed !== false || receipt.runtimeSmoke?.applicationRowsCreated !== 0) fail('runtime receipt must remain non-mutating')

if (incident.gate !== 'INCIDENT_ESCALATION_MINIMUM' || incident.result !== 'PASS') fail('incident escalation rehearsal must be PASS')
if (incident.issueNumber !== 193 || incident.issueState !== 'closed' || incident.stateReason !== 'completed') fail('incident rehearsal issue receipt mismatch')
if (incident.syntheticDataOnly !== true || incident.realDataInvolved !== false) fail('incident rehearsal must be synthetic')
if (incident.productionTouched !== false || incident.betaTouched !== false || incident.mutatingApplicationActionsPerformed !== false) fail('incident rehearsal must not touch runtime')
if (incident.ownerVisibilityVerified !== true) fail('owner visibility must be proven')

const blockers = new Map((review.activationBlockers ?? []).map((item) => [item.id, item]))
for (const id of ['SUPABASE_AUTH_SERVICE_RECOVERY', 'OFFSITE_STORAGE_RECOVERY']) {
  if (blockers.get(id)?.classification !== 'BLOCKER' || blockers.get(id)?.state !== 'NOT_PROVEN') fail(`${id} must remain an unproven activation blocker`)
}
if (blockers.has('INCIDENT_ESCALATION_MINIMUM')) fail('incident escalation must no longer be an activation blocker')
if (blockers.has('DB_LOGICAL_RESTORE') || blockers.has('RESTORE_REHEARSAL')) fail('proven DB restore must not remain as an aggregate blocker')
if ((review.provisioningResidues ?? []).length !== 0) fail('inactive Production provisioning residues must be empty after P7-F2')

const watches = new Map((review.watches ?? []).map((item) => [item.id, item]))
for (const id of ['LOAD_SCALE_ISOLATED', 'LEAKED_PASSWORD_PROTECTION', 'LONGITUDINAL_USE', 'RETENTION_ACCOUNT_DELETION']) {
  if (watches.get(id)?.classification !== 'WATCH') fail(`${id} must remain WATCH for single-owner pilot`)
}

if (review.nextGate?.id !== 'P7-RECOVERY-REMAINDER') fail('next gate must be recovery remainder')
if (review.nextGate?.mayCreateInactiveProduction !== false) fail('Production is already provisioned; next gate must not create infrastructure')
if (review.nextGate?.mayCreateActiveProduction !== false || review.nextGate?.mayAcceptRealUserData !== false) fail('recovery remainder cannot activate Production or accept real data')

console.log(`Production readiness PASS: activation=${review.productionActivationDecision}, provisioning=${infra.provisioningState}, runtime=${infra.runtimeVerification.state}, incident=${incident.result}, blockers=${review.activationBlockers.length}`)
