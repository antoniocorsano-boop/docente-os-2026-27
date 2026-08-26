import fs from 'node:fs'

const policy = JSON.parse(fs.readFileSync('ops/tier2-application-retention-deletion-policy.json', 'utf8'))
const receipt = JSON.parse(fs.readFileSync('ops/tier2-retention-deletion-rehearsal-receipt.json', 'utf8'))
const governance = JSON.parse(fs.readFileSync('ops/tier2-personal-data-governance.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 retention/deletion invalid: ${message}`)
  process.exit(1)
}

if (policy.schemaVersion !== 2 || policy.gate !== 'T2B_APPLICATION_RETENTION_DELETION') fail('gate/schema mismatch')
if (policy.state !== 'SATISFIED' || policy.tier2AdmissionEffect !== 'NONE') fail('T2B state/admission boundary mismatch')
if (policy.applicationRetentionPolicy?.principle !== 'PURPOSE_BOUND_NO_INDEFINITE_DEFAULT') fail('retention principle mismatch')
if (policy.applicationRetentionPolicy?.automaticPermanentRetentionAllowed !== false) fail('automatic permanent retention must be false')
if (policy.deletionSemantics?.operationMustBeIdempotent !== true || policy.deletionSemantics?.syntheticRehearsalRequired !== true) fail('deletion semantics incomplete')
if (policy.backupBoundary?.liveDeletionDoesNotMutateLockedBackups !== true) fail('locked backup boundary must be preserved')
if (policy.backupBoundary?.r2ProtectedPrefix !== 'production/' || policy.backupBoundary?.currentBackupRetentionDays !== 90) fail('R2 retention boundary mismatch')
if (policy.backupBoundary?.restoreMayNotReopenServiceBeforeDeletionReconciliation !== true || policy.backupBoundary?.recoveryModel !== 'FORWARD_RECONCILIATION_AFTER_RESTORE') fail('restore reconciliation boundary invalid')
if (policy.backupBoundary?.deletionRecoveryJournalRequiredBeforeTier2Admission !== true) fail('deletion recovery journal requirement missing')

const db = policy.rehearsals?.databaseCascade
if (db?.state !== 'PASS' || db?.environment !== 'PRODUCTION_SYNTHETIC_ONLY' || db?.realUserDataTouched !== false) fail('database rehearsal evidence missing')
for (const key of ['workspace','membership','academicYear','plannerTask']) {
  if (db.created?.[key] !== 1 || db.postDeleteRows?.[key] !== 0) fail(`database cascade evidence invalid for ${key}`)
}
const storage = policy.rehearsals?.storageOwnerDelete
if (storage?.state !== 'PASS' || storage?.workflowRunId !== 32929911831 || storage?.jobId !== 98060037390) fail('Storage rehearsal receipt mismatch')
for (const key of ['authenticatedOwnerPolicyVerified','uploadVerified','downloadIntegrityVerified','objectAbsentAfterDelete','workspaceCleanupVerified','productionApplicationEmptyAfterCleanup']) {
  if (storage?.[key] !== true) fail(`Storage rehearsal invariant failed: ${key}`)
}
if (storage?.realUserDataTouched !== false) fail('Storage rehearsal must remain synthetic only')

for (const key of ['application-retention-policy','deletion-semantics','backup-boundary-documented','deletion-rehearsal']) {
  if (policy.evidence?.[key] !== true) fail(`missing T2B evidence ${key}`)
}
if (policy.receipt !== 'ops/tier2-retention-deletion-rehearsal-receipt.json') fail('canonical T2B receipt missing')

if (receipt.gate !== 'T2B_APPLICATION_RETENTION_DELETION' || receipt.result !== 'PASS' || receipt.environment !== 'PRODUCTION_SYNTHETIC_ONLY') fail('rehearsal receipt invalid')
if (receipt.storageRehearsal?.runId !== 32929911831 || receipt.storageRehearsal?.jobId !== 98060037390 || receipt.storageRehearsal?.authenticatedOwnerDeleteVerified !== true || receipt.storageRehearsal?.objectAbsentAfterDelete !== true) fail('Storage receipt evidence invalid')
for (const key of ['workspacesAfterCleanup','academicYearsAfterCleanup','plannerTasksAfterCleanup','knowledgeDocumentsAfterCleanup','knowledgeUnitsAfterCleanup','authoredDocumentsAfterCleanup','teachingSessionsAfterCleanup','storageObjectsAfterCleanup']) {
  if (receipt.cleanup?.[key] !== 0) fail(`Production not empty after cleanup: ${key}`)
}
if (receipt.realUserDataTouched !== false || receipt.tier2AdmissionChanged !== false) fail('rehearsal exceeded synthetic/non-admission boundary')

if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')
const t2b = (governance.workstreams ?? []).find((item) => item.id === 'T2B_APPLICATION_RETENTION_DELETION')
const t2c = (governance.workstreams ?? []).find((item) => item.id === 'T2C_PERSONAL_DATA_EXPORT_DELETION')
if (t2b?.state !== 'SATISFIED' || t2b?.receipt !== 'ops/tier2-retention-deletion-rehearsal-receipt.json') fail('governance T2B linkage missing')
if (t2c?.state === 'SATISFIED') {
  if (governance.nextAuthorizedWorkstream !== 'T2D_DEDICATED_PRIVACY_REVIEW') fail('after T2C completion the next workstream must be T2D')
} else if (governance.nextAuthorizedWorkstream !== 'T2C_PERSONAL_DATA_EXPORT_DELETION') {
  fail('before T2C completion the next workstream must be T2C')
}

console.log('T2B retention/deletion PASS: invariants preserved across later Tier 2 workstreams; Tier 2 remains NOT_ADMITTED')
