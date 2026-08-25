import fs from 'node:fs'

const path = 'ops/production-readiness-review.json'
const infraPath = 'ops/production-infrastructure-spec.json'
const receiptPath = 'ops/production-provisioning-receipt.json'
const review = JSON.parse(fs.readFileSync(path, 'utf8'))
const infra = JSON.parse(fs.readFileSync(infraPath, 'utf8'))
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))

const fail = (message) => {
  console.error(`Production readiness review invalid: ${message}`)
  process.exit(1)
}

if (review.schemaVersion !== 3) fail('schemaVersion must be 3')
if (review.review !== 'P7-D') fail('review must remain rooted in P7-D')
if (review.lastUpdatedBy !== 'P7-F') fail('lastUpdatedBy must remain P7-F until Render runtime evidence exists')
if (review.reviewState !== 'COMPLETE') fail('reviewState must be COMPLETE')
if (review.productionActivationDecision !== 'HOLD') fail('production activation must remain HOLD while blockers exist')
if (review.inactiveProvisioningDecision !== 'PARTIALLY_COMPLETED') fail('inactive provisioning must reflect the partial P7-F state')
if (review.scope !== 'SINGLE_OWNER_PILOT') fail('scope must remain SINGLE_OWNER_PILOT')

const principles = review.principles ?? {}
for (const key of [
  'provisioningIsNotActivation',
  'inactiveInfrastructureMayBeUsedForRecoveryTesting',
  'realUserDataRequiresActivationGate',
  'betaAndProductionMustRemainSeparated',
]) {
  if (principles[key] !== true) fail(`${key} must be true`)
}

const requiredSatisfied = [
  'P7A_PROMOTION_CONTRACT',
  'P7B_DATA_TOPOLOGY',
  'P7C_INFRASTRUCTURE_SPEC',
  'P7E_PROVIDER_SELECTION',
  'P7F_SUPABASE_PROVISIONING',
  'SECURITY_BASELINE',
  'BETA_RUNTIME_GATES',
]
const satisfied = new Map((review.satisfied ?? []).map((item) => [item.id, item]))
for (const id of requiredSatisfied) {
  if (satisfied.get(id)?.classification !== 'SATISFIED') fail(`missing satisfied prerequisite ${id}`)
}

if (infra.hosting?.provider !== 'RENDER') fail('readiness requires Render as selected provider')
if (infra.hosting?.providerDecisionState !== 'SELECTED') fail('provider decision must be SELECTED')
if (infra.hosting?.region !== 'frankfurt') fail('Production pilot region must be Frankfurt')
if (infra.hosting?.autoDeployAllowed !== false) fail('Production auto-deploy must remain disabled')
if (infra.provisioningState !== 'PARTIALLY_PROVISIONED') fail('P7-F/P7-F2 preparation must record partial provisioning')
if (infra.supabase?.projectState !== 'PROVISIONED') fail('P7-F requires provisioned Supabase')
if (infra.supabase?.dataState !== 'EMPTY') fail('Production Supabase must remain empty')
if (infra.hosting?.serviceState !== 'NOT_PROVISIONED') fail('Render must remain not provisioned until runtime handoff is completed')

if (!['P7-F', 'P7-F2'].includes(receipt.gate)) fail('provisioning receipt must belong to P7-F or P7-F2 preparation')
if (receipt.overallState !== 'PARTIALLY_PROVISIONED') fail('receipt must record partial provisioning')
if (receipt.activationState !== 'HOLD') fail('receipt activation state must remain HOLD')
if (receipt.realUserDataAccepted !== false) fail('receipt must confirm no real user data')
if (receipt.supabase?.migrationsApplied !== 36 || receipt.supabase?.canonicalMigrationNamesMatched !== true) fail('receipt must prove 36 canonical migrations')
if (receipt.supabase?.authUsers !== 0 || receipt.supabase?.workspaceRows !== 0 || receipt.supabase?.storageObjectCount !== 0) fail('Production must remain operationally empty')
if (receipt.render?.state !== 'NOT_PROVISIONED') fail('receipt must record Render as not provisioned')
if (receipt.gate === 'P7-F2' && receipt.render?.handoffState !== 'BLUEPRINT_READY') fail('P7-F2 preparation receipt must prove Blueprint readiness')
if (receipt.gate === 'P7-F2' && receipt.runtimeSmoke?.state !== 'PREPARED_NOT_RUN') fail('P7-F2 preparation must not claim runtime smoke evidence')

const blockers = new Map((review.activationBlockers ?? []).map((item) => [item.id, item]))
for (const id of ['RESTORE_REHEARSAL', 'OFFSITE_STORAGE_RECOVERY', 'INCIDENT_ESCALATION_MINIMUM']) {
  if (blockers.get(id)?.classification !== 'BLOCKER') fail(`${id} must remain an activation blocker until proven`)
}

const residues = new Map((review.provisioningResidues ?? []).map((item) => [item.id, item]))
for (const id of ['RENDER_SERVICE_PROVISIONING', 'PRODUCTION_SCOPED_ENV', 'AUTHENTICATED_TECHNICAL_SMOKE']) {
  if (residues.get(id)?.classification !== 'BLOCKER_FOR_FULL_INACTIVE_PROVISIONING') fail(`${id} must remain a provisioning residue`)
}

const watches = new Map((review.watches ?? []).map((item) => [item.id, item]))
for (const id of ['LOAD_SCALE_ISOLATED', 'LEAKED_PASSWORD_PROTECTION', 'LONGITUDINAL_USE', 'RETENTION_ACCOUNT_DELETION']) {
  if (watches.get(id)?.classification !== 'WATCH') fail(`${id} must be classified as WATCH for the single-owner pilot review`)
}

if (review.nextGate?.id !== 'P7-F2') fail('next gate must remain P7-F2 until Render runtime evidence exists')
if (review.nextGate?.mayCreateInactiveProduction !== true) fail('P7-F2 may create only inactive Production infrastructure')
if (review.nextGate?.mayCreateActiveProduction !== false) fail('P7-F2 must not create active Production')
if (review.nextGate?.mayAcceptRealUserData !== false) fail('P7-F2 must not accept real user data')

console.log(`Production readiness review PASS: activation=${review.productionActivationDecision}, provisioning=${infra.provisioningState}, supabase=${infra.supabase.projectState}, render=${infra.hosting.serviceState}, receipt=${receipt.gate}, blockers=${review.activationBlockers.length}`)
