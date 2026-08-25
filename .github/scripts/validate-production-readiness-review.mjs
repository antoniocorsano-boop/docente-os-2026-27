import fs from 'node:fs'

const review = JSON.parse(fs.readFileSync('ops/production-readiness-review.json', 'utf8'))
const infra = JSON.parse(fs.readFileSync('ops/production-infrastructure-spec.json', 'utf8'))
const receipt = JSON.parse(fs.readFileSync('ops/production-provisioning-receipt.json', 'utf8'))
const incident = JSON.parse(fs.readFileSync('ops/incident-escalation-rehearsal-receipt.json', 'utf8'))
const authRecovery = JSON.parse(fs.readFileSync('ops/supabase-auth-recovery-rehearsal-receipt.json', 'utf8'))
const storageRecovery = JSON.parse(fs.readFileSync('ops/offsite-storage-recovery-rehearsal-receipt.json', 'utf8'))
const storageDestination = JSON.parse(fs.readFileSync('ops/offsite-storage-destination-receipt.json', 'utf8'))
const retentionLock = JSON.parse(fs.readFileSync('ops/offsite-storage-retention-lock-receipt.json', 'utf8'))

const fail = (message) => {
  console.error(`Production readiness review invalid: ${message}`)
  process.exit(1)
}

if (review.schemaVersion !== 7) fail('schemaVersion must be 7')
if (review.review !== 'P7-D' || review.reviewState !== 'CURRENT') fail('review must remain current P7-D')
if (review.productionActivationDecision !== 'HOLD') fail('Production must remain HOLD until an explicit human activation decision')
if (review.inactiveProvisioningDecision !== 'COMPLETE') fail('inactive provisioning must be COMPLETE')
if (review.scope !== 'SINGLE_OWNER_PILOT') fail('scope must remain SINGLE_OWNER_PILOT')

for (const key of ['provisioningIsNotActivation','inactiveInfrastructureMayBeUsedForRecoveryTesting','realUserDataRequiresActivationGate','betaAndProductionMustRemainSeparated']) {
  if (review.principles?.[key] !== true) fail(`${key} must be true`)
}

const requiredSatisfied = [
  'P7A_PROMOTION_CONTRACT','P7B_DATA_TOPOLOGY','P7C_INFRASTRUCTURE_SPEC','P7E_PROVIDER_SELECTION',
  'P7F_SUPABASE_PROVISIONING','P7F2_RUNTIME_PROVISIONING','DB_LOGICAL_RESTORE',
  'SUPABASE_AUTH_SERVICE_RECOVERY','OFFSITE_STORAGE_RECOVERY_REHEARSAL','OFFSITE_STORAGE_PERSISTENT_DESTINATION',
  'OFFSITE_STORAGE_RETENTION_LOCK','INCIDENT_ESCALATION_MINIMUM','SECURITY_BASELINE','BETA_RUNTIME_GATES',
]
const satisfied = new Map((review.satisfied ?? []).map((item) => [item.id, item]))
for (const id of requiredSatisfied) {
  if (satisfied.get(id)?.classification !== 'SATISFIED') fail(`missing satisfied prerequisite ${id}`)
}

if (infra.schemaVersion !== 4 || infra.provisioningState !== 'PROVISIONED_INACTIVE') fail('Production infrastructure must remain provisioned inactive')
if (infra.hosting?.provider !== 'RENDER' || infra.hosting?.serviceState !== 'PROVISIONED_INACTIVE' || infra.hosting?.region !== 'frankfurt') fail('Render Production baseline mismatch')
if (infra.hosting?.autoDeployAllowed !== false) fail('Production auto-deploy must remain disabled')
if (infra.supabase?.projectState !== 'PROVISIONED' || infra.supabase?.applicationDataState !== 'EMPTY') fail('Production Supabase must remain provisioned and empty')
if (infra.data?.realUserDataAccepted !== false || infra.release?.activationState !== 'HOLD') fail('real data/activation invariant violated')

if (receipt.schemaVersion !== 3 || receipt.gate !== 'P7-F2' || receipt.overallState !== 'PROVISIONED_INACTIVE' || receipt.activationState !== 'HOLD') fail('P7-F2 provisioning receipt mismatch')
if (receipt.realUserDataAccepted !== false) fail('provisioning receipt must confirm no real user data')

if (incident.gate !== 'INCIDENT_ESCALATION_MINIMUM' || incident.result !== 'PASS' || incident.issueNumber !== 193) fail('incident rehearsal receipt mismatch')
if (incident.syntheticDataOnly !== true || incident.productionTouched !== false || incident.betaTouched !== false) fail('incident rehearsal must remain synthetic and isolated')

if (authRecovery.schemaVersion !== 1 || authRecovery.gate !== 'SUPABASE_AUTH_SERVICE_RECOVERY' || authRecovery.result !== 'PASS') fail('Auth recovery receipt must be PASS')
if (authRecovery.runId !== 32841165988 || authRecovery.jobId !== 97780759559) fail('Auth recovery workflow receipt mismatch')
if (authRecovery.productionTouched !== false || authRecovery.betaTouched !== false || authRecovery.realUserDataUsed !== false || authRecovery.activationAuthorized !== false) fail('Auth recovery safety invariant violated')

if (storageRecovery.schemaVersion !== 1 || storageRecovery.gate !== 'OFFSITE_STORAGE_RECOVERY_REHEARSAL' || storageRecovery.result !== 'PASS') fail('Storage recovery rehearsal receipt must be PASS')
if (storageRecovery.workflow?.runId !== 32842616571 || storageRecovery.workflow?.sourceJobId !== 97785243034 || storageRecovery.workflow?.restoreJobId !== 97785811124) fail('Storage recovery workflow receipt mismatch')
if (storageRecovery.safety?.syntheticDataOnly !== true || storageRecovery.safety?.productionTouched !== false || storageRecovery.safety?.betaTouched !== false || storageRecovery.safety?.realUserDataUsed !== false) fail('Storage recovery rehearsal safety invariant violated')

if (storageDestination.schemaVersion !== 1 || storageDestination.gate !== 'OFFSITE_STORAGE_PERSISTENT_DESTINATION') fail('persistent destination receipt missing')
if (storageDestination.provider !== 'CLOUDFLARE_R2' || storageDestination.bucket !== 'docente-os-backup-eu' || storageDestination.jurisdiction !== 'EU') fail('unexpected persistent off-site destination')
if (storageDestination.backupMedium !== 'CLOUDFLARE_R2_EU_PERSISTENT') fail('R2 backup medium mismatch')
if (storageDestination.workflow?.runId !== 32888249839 || storageDestination.workflow?.exportJobId !== 97933720676 || storageDestination.workflow?.restoreJobId !== 97934645052) fail('R2 destination workflow receipt mismatch')
if (storageDestination.safety?.syntheticDataOnly !== true || storageDestination.safety?.activationAuthorized !== false) fail('R2 destination gate must remain synthetic and non-promotive')

if (retentionLock.schemaVersion !== 1 || retentionLock.gate !== 'OFFSITE_STORAGE_RETENTION_LOCK' || retentionLock.result !== 'PASS') fail('retention lock receipt must be PASS')
if (retentionLock.provider !== 'CLOUDFLARE_R2' || retentionLock.bucket !== 'docente-os-backup-eu' || retentionLock.jurisdiction !== 'EU') fail('retention lock destination mismatch')
if (retentionLock.protectedPrefix !== 'production/' || retentionLock.retentionPolicy?.mode !== 'BUCKET_LOCK' || retentionLock.retentionPolicy?.durationDays !== 90 || retentionLock.retentionPolicy?.scope !== 'PREFIX') fail('retention lock policy mismatch')
if (retentionLock.workflow?.runId !== 32891383829 || retentionLock.workflow?.jobId !== 97943868034) fail('retention lock workflow receipt mismatch')
if (retentionLock.probe?.key !== 'production/p7-retention-probe/32891383829/sentinel.bin') fail('retention probe key mismatch')
if (retentionLock.probe?.byteLength !== 38 || retentionLock.probe?.sha256 !== '0f61c37e11d23342438df4d2b13a5da4e7d1f88e3378626ecd899090f7623e06') fail('retention probe integrity evidence mismatch')
for (const key of ['initialUploadSucceeded','overwriteBlocked','deletionBlocked','originalReadableAfterBlockedMutations','sha256Verified','byteIdentityVerified']) {
  if (retentionLock.evidence?.[key] !== true) fail(`retention evidence ${key} must be true`)
}
if (retentionLock.evidence?.overwriteError !== 'ObjectLockedByBucketPolicy' || retentionLock.evidence?.deletionError !== 'ObjectLockedByBucketPolicy') fail('R2 lock enforcement error mismatch')
if (retentionLock.safety?.syntheticDataOnly !== true || retentionLock.safety?.productionApplicationTouched !== false || retentionLock.safety?.betaTouched !== false || retentionLock.safety?.realUserDataUsed !== false || retentionLock.safety?.activationAuthorized !== false) fail('retention lock safety invariant violated')

if ((review.activationBlockers ?? []).length !== 0) fail('technical activation blockers must be empty after retention lock PASS')
if ((review.provisioningResidues ?? []).length !== 0) fail('provisioning residues must remain empty')

const watches = new Map((review.watches ?? []).map((item) => [item.id, item]))
for (const id of ['LOAD_SCALE_ISOLATED','LEAKED_PASSWORD_PROTECTION','LONGITUDINAL_USE','RETENTION_ACCOUNT_DELETION']) {
  if (watches.get(id)?.classification !== 'WATCH') fail(`${id} must remain WATCH for single-owner pilot`)
}

if (review.nextGate?.id !== 'P7-PRODUCTION-ACTIVATION-DECISION') fail('next gate must be explicit human Production activation decision')
if (review.nextGate?.requiresExplicitHumanDecision !== true) fail('next gate must require an explicit human decision')
if (review.nextGate?.mayCreateActiveProduction !== false || review.nextGate?.mayAcceptRealUserData !== false) fail('current review cannot itself activate Production or accept real data')

console.log(`Production readiness PASS: activation=${review.productionActivationDecision}, technicalBlockers=${review.activationBlockers.length}, nextGate=${review.nextGate.id}`)
