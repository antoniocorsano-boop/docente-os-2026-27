import fs from 'node:fs'

const review = JSON.parse(fs.readFileSync('ops/production-readiness-review.json', 'utf8'))
const infra = JSON.parse(fs.readFileSync('ops/production-infrastructure-spec.json', 'utf8'))
const provisioning = JSON.parse(fs.readFileSync('ops/production-provisioning-receipt.json', 'utf8'))
const activationDecision = JSON.parse(fs.readFileSync('ops/production-activation-decision-receipt.json', 'utf8'))
const release = JSON.parse(fs.readFileSync('ops/production-release-receipt.json', 'utf8'))
const authRecovery = JSON.parse(fs.readFileSync('ops/supabase-auth-recovery-rehearsal-receipt.json', 'utf8'))
const storageRecovery = JSON.parse(fs.readFileSync('ops/offsite-storage-recovery-rehearsal-receipt.json', 'utf8'))
const storageDestination = JSON.parse(fs.readFileSync('ops/offsite-storage-destination-receipt.json', 'utf8'))
const retentionLock = JSON.parse(fs.readFileSync('ops/offsite-storage-retention-lock-receipt.json', 'utf8'))
const incident = JSON.parse(fs.readFileSync('ops/incident-escalation-rehearsal-receipt.json', 'utf8'))

const fail = (message) => {
  console.error(`Production readiness review invalid: ${message}`)
  process.exit(1)
}

const candidate = 'db3d4ab014ad11dec4aeccdb5aa8740220e4ebde'
const productEquivalent = '0959c37e14e0224232f5040cb577c6332bd193fb'
const rollback = 'f33eb4785ed66630c3a162ae2f2c1bd5db64d532'

if (review.schemaVersion !== 9 || review.review !== 'P7-D' || review.reviewState !== 'CURRENT') fail('current review must be P7-D schema 9')
if (review.productionActivationDecision !== 'ACTIVE_SINGLE_OWNER_PILOT' || review.scope !== 'SINGLE_OWNER_PILOT') fail('Production must be active only as SINGLE_OWNER_PILOT')
if (review.humanActivationDecision?.state !== 'AUTHORIZED' || review.humanActivationDecision?.receipt !== 'ops/production-activation-decision-receipt.json') fail('explicit human activation authorization missing')
if (review.productionPromotion?.state !== 'PASS' || review.productionPromotion?.candidateRepositorySha !== candidate || review.productionPromotion?.productEquivalentSha !== productEquivalent) fail('promotion receipt linkage mismatch')
if (review.productionPromotion?.releaseReceipt !== 'ops/production-release-receipt.json' || review.productionPromotion?.postPromotionSmokeRunId !== 32903982577 || review.productionPromotion?.exactCandidateShaVerified !== true) fail('post-promotion evidence mismatch')
if ((review.activationBlockers ?? []).length !== 0 || (review.provisioningResidues ?? []).length !== 0) fail('technical blockers/residues must be empty')
if (review.realUserDataAccepted !== false) fail('real professional data must remain not admitted')
if (review.nextGate?.id !== 'P7-REAL-DATA-ADMISSION' || review.nextGate?.mayAcceptRealUserData !== false || review.nextGate?.explicitOwnerDecisionRequired !== true) fail('next gate must remain explicit real-data admission')

const requiredSatisfied = [
  'P7A_PROMOTION_CONTRACT','P7B_DATA_TOPOLOGY','P7C_INFRASTRUCTURE_SPEC','P7E_PROVIDER_SELECTION',
  'P7F_SUPABASE_PROVISIONING','P7F2_RUNTIME_PROVISIONING','DB_LOGICAL_RESTORE','SUPABASE_AUTH_SERVICE_RECOVERY',
  'OFFSITE_STORAGE_RECOVERY_REHEARSAL','OFFSITE_STORAGE_PERSISTENT_DESTINATION','OFFSITE_STORAGE_RETENTION_LOCK',
  'INCIDENT_ESCALATION_MINIMUM','SECURITY_BASELINE','BETA_RUNTIME_GATES','P7_PRODUCTION_ACTIVATION_DECISION','P7_PRODUCTION_PROMOTION',
]
const satisfied = new Map((review.satisfied ?? []).map((item) => [item.id, item]))
for (const id of requiredSatisfied) if (satisfied.get(id)?.classification !== 'SATISFIED') fail(`missing satisfied prerequisite ${id}`)

if (infra.schemaVersion !== 5 || infra.provisioningState !== 'ACTIVE_SINGLE_OWNER_PILOT') fail('infrastructure must be active single-owner pilot')
if (infra.hosting?.provider !== 'RENDER' || infra.hosting?.serviceState !== 'ACTIVE' || infra.hosting?.region !== 'frankfurt') fail('Render active runtime mismatch')
if (infra.hosting?.autoDeployAllowed !== false || infra.hosting?.servedCommitAtCertifiedSmoke !== candidate) fail('immutable Render candidate mismatch')
if (infra.runtimeVerification?.state !== 'PASS' || infra.runtimeVerification?.runId !== 32903982577 || infra.runtimeVerification?.jobId !== 97983821918) fail('certifying smoke run mismatch')
if (infra.runtimeVerification?.expectedCommit !== candidate || infra.runtimeVerification?.buildCommit !== candidate || infra.runtimeVerification?.exactCandidateShaVerified !== true) fail('exact candidate SHA not verified')
if (infra.runtimeVerification?.authenticatedTechnicalIdentity !== true || infra.runtimeVerification?.currentWorkspaceContextRpc !== 'PASS' || infra.runtimeVerification?.mutatingActionsPerformed !== false) fail('authenticated non-mutating smoke invariants failed')
if (infra.release?.activationState !== 'ACTIVE' || infra.release?.scope !== 'SINGLE_OWNER_PILOT' || infra.release?.audience !== 'named_owner_only') fail('release scope mismatch')
if (infra.release?.publicSignupAllowed !== false || infra.release?.multiTenantOnboardingAllowed !== false || infra.release?.releaseReceipt !== 'ops/production-release-receipt.json') fail('release constraints mismatch')
if (infra.data?.realUserDataAccepted !== false || infra.data?.automaticBetaCopyAllowed !== false || infra.data?.manualImportRequiresOwnerDecision !== true) fail('data-admission boundary violated')

if (release.schemaVersion !== 1 || release.gate !== 'P7-PRODUCTION-PROMOTION' || release.result !== 'PASS' || release.activationCompleted !== true) fail('Production release receipt missing or incomplete')
if (release.scope !== 'SINGLE_OWNER_PILOT' || release.audience !== 'named_owner_only' || release.realUserDataAccepted !== false) fail('release receipt scope/data boundary mismatch')
if (release.candidate?.repositorySha !== candidate || release.candidate?.productEquivalentSha !== productEquivalent || release.candidate?.previousCertifiedProductionSha !== rollback) fail('release candidate/rollback mismatch')
if (release.render?.serviceName !== 'docente-os-2026-27-production' || release.render?.deploymentState !== 'LIVE' || release.render?.servedCommit !== candidate || release.render?.autoDeployAllowed !== false) fail('Render release evidence mismatch')
if (release.postPromotionSmoke?.runId !== 32903982577 || release.postPromotionSmoke?.jobId !== 97983821918 || release.postPromotionSmoke?.result !== 'PASS') fail('release smoke receipt mismatch')
if (release.postPromotionSmoke?.expectedCommit !== candidate || release.postPromotionSmoke?.buildCommit !== candidate || release.postPromotionSmoke?.exactCandidateShaVerified !== true || release.postPromotionSmoke?.authenticated !== true || release.postPromotionSmoke?.mutatingActionsPerformed !== false) fail('release smoke invariants failed')
for (const key of ['publicSignupAllowed','multiTenantOnboardingAllowed','automaticBetaDataCopyAllowed','betaCredentialReuseAllowed','autoDeployProductionAllowed']) {
  if (release.releaseConstraints?.[key] !== false) fail(`${key} must remain false`)
}
if (release.releaseConstraints?.manualImportRequiresExplicitOwnerDecision !== true || release.nextGate !== 'P7-REAL-DATA-ADMISSION') fail('post-activation boundary mismatch')

if (activationDecision.gate !== 'P7-PRODUCTION-ACTIVATION-DECISION' || activationDecision.decision !== 'AUTHORIZE_SINGLE_OWNER_PILOT' || activationDecision.decisionSource !== 'EXPLICIT_HUMAN_OWNER_AUTHORIZATION') fail('historical human decision receipt mismatch')
if (activationDecision.candidate?.repositoryHeadShaAtDecision !== candidate || activationDecision.candidate?.productEquivalentSha !== productEquivalent || activationDecision.candidate?.previousCertifiedProductionSha !== rollback) fail('historical activation candidate mismatch')
if (activationDecision.stateAfterDecision !== 'AUTHORIZED_PENDING_DEPLOY' || activationDecision.activationCompleted !== false) fail('decision receipt must remain historical and immutable')

if (provisioning.gate !== 'P7-F2' || provisioning.overallState !== 'PROVISIONED_INACTIVE' || provisioning.activationState !== 'HOLD') fail('historical provisioning receipt changed')
if (authRecovery.gate !== 'SUPABASE_AUTH_SERVICE_RECOVERY' || authRecovery.result !== 'PASS') fail('auth recovery prerequisite missing')
if (storageRecovery.gate !== 'OFFSITE_STORAGE_RECOVERY_REHEARSAL' || storageRecovery.result !== 'PASS') fail('storage recovery prerequisite missing')
if (storageDestination.gate !== 'OFFSITE_STORAGE_PERSISTENT_DESTINATION' || storageDestination.provider !== 'CLOUDFLARE_R2' || storageDestination.jurisdiction !== 'EU') fail('persistent backup prerequisite missing')
if (retentionLock.gate !== 'OFFSITE_STORAGE_RETENTION_LOCK' || retentionLock.result !== 'PASS' || retentionLock.protectedPrefix !== 'production/' || retentionLock.retentionPolicy?.durationDays !== 90) fail('retention prerequisite missing')
if (incident.gate !== 'INCIDENT_ESCALATION_MINIMUM' || incident.result !== 'PASS') fail('incident escalation prerequisite missing')

const watches = new Map((review.watches ?? []).map((item) => [item.id, item]))
for (const id of ['LOAD_SCALE_ISOLATED','LEAKED_PASSWORD_PROTECTION','LONGITUDINAL_USE','RETENTION_ACCOUNT_DELETION']) {
  if (watches.get(id)?.classification !== 'WATCH') fail(`${id} must remain WATCH`)
}

console.log(`Production readiness PASS: decision=${review.productionActivationDecision}, candidate=${candidate}, realUserDataAccepted=${review.realUserDataAccepted}`)
