import fs from 'node:fs'

const path = 'ops/production-readiness-review.json'
const infraPath = 'ops/production-infrastructure-spec.json'
const review = JSON.parse(fs.readFileSync(path, 'utf8'))
const infra = JSON.parse(fs.readFileSync(infraPath, 'utf8'))

const fail = (message) => {
  console.error(`Production readiness review invalid: ${message}`)
  process.exit(1)
}

if (review.schemaVersion !== 2) fail('schemaVersion must be 2')
if (review.review !== 'P7-D') fail('review must remain rooted in P7-D')
if (review.lastUpdatedBy !== 'P7-E') fail('lastUpdatedBy must be P7-E')
if (review.reviewState !== 'COMPLETE') fail('reviewState must be COMPLETE')
if (review.productionActivationDecision !== 'HOLD') fail('production activation must remain HOLD while blockers exist')
if (review.inactiveProvisioningDecision !== 'ALLOWED') fail('inactive provisioning must be allowed after provider selection')
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
  'SECURITY_BASELINE',
  'BETA_RUNTIME_GATES',
]
const satisfied = new Map((review.satisfied ?? []).map((item) => [item.id, item]))
for (const id of requiredSatisfied) {
  if (satisfied.get(id)?.classification !== 'SATISFIED') fail(`missing satisfied prerequisite ${id}`)
}

if (infra.hosting?.provider !== 'RENDER') fail('P7-E readiness requires Render as selected provider')
if (infra.hosting?.providerDecisionState !== 'SELECTED') fail('provider decision must be SELECTED')
if (infra.hosting?.region !== 'frankfurt') fail('Production pilot region must be Frankfurt')
if (infra.hosting?.autoDeployAllowed !== false) fail('Production auto-deploy must remain disabled')
if (infra.provisioningState !== 'NOT_PROVISIONED') fail('P7-E must not provision Production')

const blockers = new Map((review.activationBlockers ?? []).map((item) => [item.id, item]))
for (const id of ['RESTORE_REHEARSAL', 'OFFSITE_STORAGE_RECOVERY', 'INCIDENT_ESCALATION_MINIMUM']) {
  if (blockers.get(id)?.classification !== 'BLOCKER') fail(`${id} must remain an activation blocker until proven`)
}
if (blockers.has('PRODUCTION_PROVIDER_SELECTION')) fail('provider selection must not remain a blocker after P7-E')

const watches = new Map((review.watches ?? []).map((item) => [item.id, item]))
for (const id of ['LOAD_SCALE_ISOLATED', 'LEAKED_PASSWORD_PROTECTION', 'LONGITUDINAL_USE', 'RETENTION_ACCOUNT_DELETION']) {
  if (watches.get(id)?.classification !== 'WATCH') fail(`${id} must be classified as WATCH for the single-owner pilot review`)
}

if (review.nextGate?.id !== 'P7-F') fail('next gate must be P7-F')
if (review.nextGate?.mayCreateInactiveProduction !== true) fail('P7-F may create only inactive Production infrastructure')
if (review.nextGate?.mayCreateActiveProduction !== false) fail('P7-F must not create active Production')
if (review.nextGate?.mayAcceptRealUserData !== false) fail('P7-F must not accept real user data')

console.log(`Production readiness review PASS: activation=${review.productionActivationDecision}, inactiveProvisioning=${review.inactiveProvisioningDecision}, provider=${infra.hosting.provider}, blockers=${review.activationBlockers.length}, watches=${review.watches.length}`)
