import fs from 'node:fs'

const policy = JSON.parse(fs.readFileSync('ops/tier2-application-retention-deletion-policy.json', 'utf8'))
const governance = JSON.parse(fs.readFileSync('ops/tier2-personal-data-governance.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 retention/deletion invalid: ${message}`)
  process.exit(1)
}

if (policy.schemaVersion !== 1 || policy.gate !== 'T2B_APPLICATION_RETENTION_DELETION') fail('gate/schema mismatch')
if (policy.state !== 'REHEARSAL_IN_PROGRESS' || policy.tier2AdmissionEffect !== 'NONE') fail('T2B must remain in rehearsal and must not admit Tier 2')
if (policy.applicationRetentionPolicy?.principle !== 'PURPOSE_BOUND_NO_INDEFINITE_DEFAULT') fail('retention principle mismatch')
if (policy.applicationRetentionPolicy?.automaticPermanentRetentionAllowed !== false) fail('automatic permanent retention must be false')
if (policy.deletionSemantics?.operationMustBeIdempotent !== true || policy.deletionSemantics?.syntheticRehearsalRequired !== true) fail('deletion semantics incomplete')
if (policy.backupBoundary?.liveDeletionDoesNotMutateLockedBackups !== true) fail('locked backup boundary must be preserved')
if (policy.backupBoundary?.r2ProtectedPrefix !== 'production/' || policy.backupBoundary?.currentBackupRetentionDays !== 90) fail('R2 retention boundary mismatch')
if (policy.backupBoundary?.restoreMayNotReopenServiceBeforeDeletionReconciliation !== true) fail('restore reconciliation must be mandatory')
if (policy.backupBoundary?.deletionRecoveryJournalRequiredBeforeTier2Admission !== true) fail('deletion recovery journal requirement missing')
if (policy.backupBoundary?.recoveryModel !== 'FORWARD_RECONCILIATION_AFTER_RESTORE') fail('unsafe backup recovery model')

const db = policy.rehearsals?.databaseCascade
if (db?.state !== 'PASS' || db?.environment !== 'PRODUCTION_SYNTHETIC_ONLY' || db?.realUserDataTouched !== false) fail('database rehearsal evidence missing')
for (const key of ['workspace','membership','academicYear','plannerTask']) {
  if (db.created?.[key] !== 1 || db.postDeleteRows?.[key] !== 0) fail(`database cascade evidence invalid for ${key}`)
}
const storage = policy.rehearsals?.storageOwnerDelete
if (storage?.state !== 'PENDING' || storage?.environment !== 'PRODUCTION_SYNTHETIC_ONLY' || storage?.authenticatedOwnerPolicyRequired !== true || storage?.realUserDataTouched !== false) fail('Storage rehearsal must remain pending in this tranche')

for (const key of ['application-retention-policy','deletion-semantics','backup-boundary-documented']) {
  if (policy.evidence?.[key] !== true) fail(`missing policy evidence ${key}`)
}
if (policy.evidence?.['deletion-rehearsal'] !== false) fail('deletion rehearsal cannot be complete before Storage PASS')
if (policy.completionRule?.databaseCascadePassRequired !== true || policy.completionRule?.storageOwnerDeletePassRequired !== true || policy.completionRule?.productionReturnsToApplicationEmptyRequired !== true || policy.completionRule?.tier2MustRemainNotAdmitted !== true) fail('completion rule incomplete')

if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')
const t2b = (governance.workstreams ?? []).find((item) => item.id === 'T2B_APPLICATION_RETENTION_DELETION')
if (t2b?.state !== 'NOT_SATISFIED') fail('governance must not mark T2B satisfied yet')
if (governance.nextAuthorizedWorkstream !== 'T2B_APPLICATION_RETENTION_DELETION') fail('T2B must remain current workstream')

console.log('T2B retention/deletion policy PASS: DB rehearsal passed; Storage rehearsal pending; Tier 2 remains NOT_ADMITTED')
