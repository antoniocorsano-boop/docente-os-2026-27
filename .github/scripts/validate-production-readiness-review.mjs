import fs from 'node:fs'

const review = JSON.parse(fs.readFileSync('ops/production-readiness-review.json', 'utf8'))
const infra = JSON.parse(fs.readFileSync('ops/production-infrastructure-spec.json', 'utf8'))
const receipt = JSON.parse(fs.readFileSync('ops/production-provisioning-receipt.json', 'utf8'))
const incident = JSON.parse(fs.readFileSync('ops/incident-escalation-rehearsal-receipt.json', 'utf8'))
const authRecovery = JSON.parse(fs.readFileSync('ops/supabase-auth-recovery-rehearsal-receipt.json', 'utf8'))
const storageRecovery = JSON.parse(fs.readFileSync('ops/offsite-storage-recovery-rehearsal-receipt.json', 'utf8'))
const storageDestination = JSON.parse(fs.readFileSync('ops/offsite-storage-destination-receipt.json', 'utf8'))

const fail = (message) => {
  console.error(`Production readiness review invalid: ${message}`)
  process.exit(1)
}

if (review.schemaVersion !== 6) fail('schemaVersion must be 6')
if (review.review !== 'P7-D') fail('review must remain rooted in P7-D')
if (review.reviewState !== 'CURRENT') fail('reviewState must be CURRENT')
if (review.productionActivationDecision !== 'HOLD') fail('production activation must remain HOLD until backup retention/lock is configured and a human release decision is made')
if (review.inactiveProvisioningDecision !== 'COMPLETE') fail('inactive provisioning must be COMPLETE')
if (review.scope !== 'SINGLE_OWNER_PILOT') fail('scope must remain SINGLE_OWNER_PILOT')

for (const key of ['provisioningIsNotActivation','inactiveInfrastructureMayBeUsedForRecoveryTesting','realUserDataRequiresActivationGate','betaAndProductionMustRemainSeparated']) {
  if (review.principles?.[key] !== true) fail(`${key} must be true`)
}

const requiredSatisfied = [
  'P7A_PROMOTION_CONTRACT','P7B_DATA_TOPOLOGY','P7C_INFRASTRUCTURE_SPEC','P7E_PROVIDER_SELECTION',
  'P7F_SUPABASE_PROVISIONING','P7F2_RUNTIME_PROVISIONING','DB_LOGICAL_RESTORE',
  'SUPABASE_AUTH_SERVICE_RECOVERY','OFFSITE_STORAGE_RECOVERY_REHEARSAL','OFFSITE_STORAGE_PERSISTENT_DESTINATION',
  'INCIDENT_ESCALATION_MINIMUM','SECURITY_BASELINE','BETA_RUNTIME_GATES',
]
const satisfied = new Map((review.satisfied ?? []).map((item) => [item.id, item]))
for (const id of requiredSatisfied) {
  if (satisfied.get(id)?.classification !== 'SATISFIED') fail(`missing satisfied prerequisite ${id}`)
}

if (infra.schemaVersion !== 4) fail('infrastructure schemaVersion must be 4')
if (infra.provisioningState !== 'PROVISIONED_INACTIVE') fail('Production infrastructure must be provisioned but inactive')
if (infra.hosting?.provider !== 'RENDER' || infra.hosting?.providerDecisionState !== 'SELECTED') fail('Render must remain selected provider')
if (infra.hosting?.serviceState !== 'PROVISIONED_INACTIVE') fail('Render service must remain provisioned inactive')
if (infra.hosting?.serviceName !== 'docente-os-2026-27-production') fail('unexpected Render service name')
if (infra.hosting?.region !== 'frankfurt') fail('Production region must be Frankfurt')
if (infra.hosting?.autoDeployAllowed !== false) fail('Production auto-deploy must remain disabled')
if (infra.supabase?.projectState !== 'PROVISIONED') fail('Production Supabase must be provisioned')
if (infra.supabase?.applicationDataState !== 'EMPTY') fail('Production application data must remain empty')
if (infra.supabase?.technicalAuthIdentityCount !== 1) fail('exactly one dedicated technical Auth identity is expected')
if (infra.secrets?.configurationState !== 'CONFIGURED_OUTSIDE_REPOSITORY') fail('Production-scoped environment must remain outside repository')
if (infra.runtimeVerification?.state !== 'PASS' || infra.runtimeVerification?.runId !== 32836204567) fail('certified Production Runtime Smoke evidence missing')
if (infra.runtimeVerification?.mutatingActionsPerformed !== false || infra.runtimeVerification?.applicationRowsCreated !== 0) fail('runtime smoke must remain non-mutating')
if (infra.data?.realUserDataAccepted !== false || infra.release?.activationState !== 'HOLD') fail('real data/activation invariant violated')

if (receipt.schemaVersion !== 3 || receipt.gate !== 'P7-F2') fail('provisioning receipt must be current P7-F2 receipt')
if (receipt.overallState !== 'PROVISIONED_INACTIVE' || receipt.activationState !== 'HOLD') fail('receipt must record inactive provisioned HOLD state')
if (receipt.realUserDataAccepted !== false) fail('receipt must confirm no real user data')
if (receipt.supabase?.technicalAuthUsers !== 1 || receipt.supabase?.workspaceRows !== 0 || receipt.supabase?.storageObjectCount !== 0 || receipt.supabase?.applicationDataRows !== 0) fail('Production must contain only technical Auth identity and no application data')
if (receipt.render?.state !== 'PROVISIONED_INACTIVE') fail('receipt must record Render as provisioned inactive')
if (receipt.runtimeSmoke?.state !== 'PASS' || receipt.runtimeSmoke?.runId !== 32836204567) fail('receipt must prove authenticated runtime smoke')
if (receipt.runtimeSmoke?.mutatingActionsPerformed !== false || receipt.runtimeSmoke?.applicationRowsCreated !== 0) fail('runtime receipt must remain non-mutating')

if (incident.gate !== 'INCIDENT_ESCALATION_MINIMUM' || incident.result !== 'PASS') fail('incident escalation rehearsal must be PASS')
if (incident.issueNumber !== 193 || incident.issueState !== 'closed' || incident.stateReason !== 'completed') fail('incident rehearsal issue receipt mismatch')
if (incident.syntheticDataOnly !== true || incident.realDataInvolved !== false) fail('incident rehearsal must be synthetic')
if (incident.productionTouched !== false || incident.betaTouched !== false || incident.mutatingApplicationActionsPerformed !== false) fail('incident rehearsal must not touch runtime')
if (incident.ownerVisibilityVerified !== true) fail('owner visibility must be proven')

if (authRecovery.schemaVersion !== 1 || authRecovery.gate !== 'SUPABASE_AUTH_SERVICE_RECOVERY' || authRecovery.result !== 'PASS') fail('Auth service recovery receipt must be PASS')
if (authRecovery.runId !== 32841165988 || authRecovery.jobId !== 97780759559) fail('Auth service recovery workflow receipt mismatch')
for (const key of ['syntheticIdentityOnly','initialPasswordLogin','recoverEndpointAccepted','recoveryEmailCapturedByMailpit','recoverySessionIssued','passwordChangedThroughRecoverySession','oldPasswordRejected','newPasswordAccepted']) {
  if (authRecovery[key] !== true) fail(`Auth recovery evidence ${key} must be true`)
}
if (authRecovery.productionTouched !== false || authRecovery.betaTouched !== false || authRecovery.realUserDataUsed !== false) fail('Auth recovery rehearsal must remain isolated and synthetic')
if (authRecovery.remoteSupabaseResourceCreated !== false || authRecovery.activationAuthorized !== false) fail('Auth recovery rehearsal must not create remote resources or authorize activation')

if (storageRecovery.schemaVersion !== 1 || storageRecovery.gate !== 'OFFSITE_STORAGE_RECOVERY_REHEARSAL' || storageRecovery.result !== 'PASS') fail('Storage recovery rehearsal receipt must be PASS')
if (storageRecovery.workflow?.runId !== 32842616571 || storageRecovery.workflow?.sourceJobId !== 97785243034 || storageRecovery.workflow?.restoreJobId !== 97785811124) fail('Storage recovery workflow receipt mismatch')
for (const key of ['separateRunnerBoundary','sourceStorageServiceDestroyedBeforeRestore','freshRestoreStorageService','sourceObjectDeleted','sourceLossVerified','binaryRestoreVerified','sha256Verified','byteLengthVerified']) {
  if (storageRecovery.evidence?.[key] !== true) fail(`Storage recovery evidence ${key} must be true`)
}
if (storageRecovery.evidence?.rehearsalBackupMedium !== 'GITHUB_ACTIONS_ARTIFACT') fail('Storage rehearsal backup medium mismatch')
if (storageRecovery.evidence?.objectByteLength !== 131071) fail('Storage rehearsal byte length mismatch')
if (storageRecovery.evidence?.objectSha256 !== 'ab2f638970566aaf3f495b7a3860612f7bd91a2afe5d837e835a27f11ba811be') fail('Storage rehearsal object hash mismatch')
if (storageRecovery.safety?.syntheticDataOnly !== true || storageRecovery.safety?.productionTouched !== false || storageRecovery.safety?.betaTouched !== false || storageRecovery.safety?.realUserDataUsed !== false) fail('Storage rehearsal must remain isolated and synthetic')
if (storageRecovery.safety?.rehearsalArtifactApprovedForRealProfessionalData !== false || storageRecovery.safety?.activationAuthorized !== false) fail('rehearsal artifact must not be approved for real professional data or activation')

if (storageDestination.schemaVersion !== 1 || storageDestination.gate !== 'OFFSITE_STORAGE_PERSISTENT_DESTINATION') fail('persistent destination receipt missing')
if (storageDestination.result !== 'PASS_WITH_RESIDUAL') fail('persistent destination must be PASS_WITH_RESIDUAL until retention lock is configured')
if (storageDestination.provider !== 'CLOUDFLARE_R2' || storageDestination.bucket !== 'docente-os-backup-eu' || storageDestination.jurisdiction !== 'EU') fail('unexpected persistent off-site destination')
if (storageDestination.publicAccess !== 'DISABLED' || storageDestination.credentialScope !== 'OBJECT_READ_WRITE_BUCKET_SCOPED') fail('R2 destination access baseline mismatch')
if (storageDestination.backupMedium !== 'CLOUDFLARE_R2_EU_PERSISTENT') fail('R2 backup medium mismatch')
if (storageDestination.workflow?.runId !== 32888249839 || storageDestination.workflow?.exportJobId !== 97933720676 || storageDestination.workflow?.restoreJobId !== 97934645052) fail('R2 destination workflow receipt mismatch')
for (const key of ['separateRunnerBoundary','persistentRemoteDestinationUsed','runnerCopyRemovedAfterUpload','sourceStorageDestroyedBeforeRestore','freshRestoreStorageService','binaryRestoreVerified','sha256Verified','byteLengthVerified','testObjectsRemovedAfterRehearsal']) {
  if (storageDestination.evidence?.[key] !== true) fail(`R2 destination evidence ${key} must be true`)
}
if (storageDestination.evidence?.objectByteLength !== 131071 || storageDestination.evidence?.objectSha256 !== '76e1460fbc7ca78e0f86c2aad8b7dd93b9cac0d2372f032f30c1e790301575f7') fail('R2 destination object evidence mismatch')
if (storageDestination.safety?.syntheticDataOnly !== true || storageDestination.safety?.productionTouched !== false || storageDestination.safety?.betaTouched !== false || storageDestination.safety?.realUserDataUsed !== false || storageDestination.safety?.activationAuthorized !== false) fail('R2 destination gate must remain isolated, synthetic and non-promotive')
if (storageDestination.residual?.id !== 'OFFSITE_STORAGE_RETENTION_LOCK' || storageDestination.residual?.state !== 'NOT_CONFIGURED' || storageDestination.residual?.classification !== 'ACTIVATION_BLOCKER') fail('R2 retention residual mismatch')

const blockers = new Map((review.activationBlockers ?? []).map((item) => [item.id, item]))
if (blockers.size !== 1) fail('exactly one activation blocker must remain')
if (blockers.get('OFFSITE_STORAGE_RETENTION_LOCK')?.classification !== 'BLOCKER' || blockers.get('OFFSITE_STORAGE_RETENTION_LOCK')?.state !== 'NOT_CONFIGURED') fail('backup retention lock must be the sole activation blocker')
for (const id of ['OFFSITE_STORAGE_PERSISTENT_DESTINATION','OFFSITE_STORAGE_RECOVERY','SUPABASE_AUTH_SERVICE_RECOVERY','INCIDENT_ESCALATION_MINIMUM','DB_LOGICAL_RESTORE','RESTORE_REHEARSAL']) {
  if (blockers.has(id)) fail(`${id} must not remain an activation blocker`)
}
if ((review.provisioningResidues ?? []).length !== 0) fail('inactive Production provisioning residues must remain empty')

const watches = new Map((review.watches ?? []).map((item) => [item.id, item]))
for (const id of ['LOAD_SCALE_ISOLATED','LEAKED_PASSWORD_PROTECTION','LONGITUDINAL_USE','RETENTION_ACCOUNT_DELETION']) {
  if (watches.get(id)?.classification !== 'WATCH') fail(`${id} must remain WATCH for single-owner pilot`)
}

if (review.nextGate?.id !== 'P7-OFFSITE-STORAGE-RETENTION-LOCK') fail('next gate must be persistent off-site Storage retention lock')
if (review.nextGate?.mayCreateInactiveProduction !== false || review.nextGate?.mayCreateActiveProduction !== false || review.nextGate?.mayAcceptRealUserData !== false) fail('retention lock gate cannot activate Production or accept real data')

console.log(`Production readiness PASS: activation=${review.productionActivationDecision}, destination=${storageDestination.result}, residual=${storageDestination.residual.id}, blockers=${review.activationBlockers.length}`)
