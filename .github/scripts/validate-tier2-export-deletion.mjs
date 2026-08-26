import fs from 'node:fs'

const policy = JSON.parse(fs.readFileSync('ops/tier2-personal-data-export-deletion-policy.json', 'utf8'))
const receipt = JSON.parse(fs.readFileSync('ops/tier2-export-rehearsal-receipt.json', 'utf8'))
const retentionDeletion = JSON.parse(fs.readFileSync('ops/tier2-application-retention-deletion-policy.json', 'utf8'))
const governance = JSON.parse(fs.readFileSync('ops/tier2-personal-data-governance.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 export/deletion invalid: ${message}`)
  process.exit(1)
}

if (policy.schemaVersion !== 1 || policy.gate !== 'T2C_PERSONAL_DATA_EXPORT_DELETION') fail('policy gate/schema mismatch')
if (policy.state !== 'SATISFIED' || policy.tier2AdmissionEffect !== 'NONE') fail('T2C must be SATISFIED without admission effect')
if (policy.scope !== 'SINGLE_OWNER_PILOT') fail('scope must remain SINGLE_OWNER_PILOT')

const exportProcedure = policy.personalDataExportProcedure ?? {}
if (exportProcedure.requester !== 'AUTHENTICATED_WORKSPACE_OWNER') fail('export requester boundary invalid')
if (exportProcedure.databaseSource !== 'public.workspace_export_manifest()') fail('canonical database export source mismatch')
if (exportProcedure.databaseManifestSchemaVersion !== 1 || exportProcedure.workspaceCollectionsRequired !== 25) fail('manifest contract mismatch')
for (const key of ['packageIndexRequired','sha256RequiredForDatabaseManifest','sha256RequiredForEachExportedAsset']) {
  if (exportProcedure[key] !== true) fail(`exportProcedure.${key} must be true`)
}
if (exportProcedure.credentialsOrSecretsIncluded !== false || exportProcedure.authIdentityCredentialMaterialIncluded !== false) fail('credentials/secrets must not be exported')

const deletion = policy.personalDataDeletionProcedure ?? {}
if (deletion.semanticAuthority !== 'ops/tier2-application-retention-deletion-policy.json') fail('T2C must reuse T2B deletion semantics')
if (retentionDeletion.gate !== 'T2B_APPLICATION_RETENTION_DELETION' || retentionDeletion.state !== 'SATISFIED') fail('T2B deletion authority is not satisfied')
for (const key of ['explicitValidatedDeleteDecisionRequired','liveStorageObjectsRemoved','liveWorkspaceDataRemoved','deletionRecoveryJournalRequired','restoreReconciliationRequiredBeforeServiceReopens','idempotentOperatorProcedureRequired']) {
  if (deletion[key] !== true) fail(`deletion.${key} must be true`)
}
if (deletion.lockedBackupMutationAllowed !== false) fail('locked backups must not be mutated by deletion procedure')

const boundary = policy.requestAuthenticationBoundary ?? {}
if (boundary.unauthenticatedExportAllowed !== false || boundary.workspaceMembershipRequired !== true || boundary.ownerRoleRequired !== true || boundary.crossWorkspaceExportAllowed !== false) fail('request authentication boundary invalid')
if (boundary.anonymousRejectionRehearsed !== true || boundary.ownerExportRehearsed !== true) fail('authentication boundary rehearsal missing')

const requiredEvidence = ['personal-data-export-procedure','personal-data-deletion-procedure','request-authentication-boundary','operator-receipt']
for (const key of requiredEvidence) if (policy.evidence?.[key] !== true) fail(`missing evidence ${key}`)

if (receipt.schemaVersion !== 1 || receipt.gate !== 'T2C_PERSONAL_DATA_EXPORT_REHEARSAL' || receipt.result !== 'PASS') fail('rehearsal receipt invalid')
if (receipt.environment !== 'PRODUCTION_SYNTHETIC_ONLY' || receipt.realUserDataTouched !== false || receipt.tier2AdmissionEffect !== 'NONE') fail('rehearsal environment/admission boundary invalid')
if (receipt.workflow?.runId !== 32931288784 || receipt.workflow?.jobId !== 98063905054 || receipt.workflow?.artifactId !== 9593288618) fail('workflow evidence mismatch')
if (receipt.requestAuthenticationBoundary?.unauthenticatedRequestRejected !== true || receipt.requestAuthenticationBoundary?.ownerRoleVerified !== true) fail('request authentication evidence missing')
if (receipt.databaseExport?.manifestSchemaVersion !== 1 || receipt.databaseExport?.collectionCount !== 25 || receipt.databaseExport?.requiredCollectionsVerified !== true) fail('database export evidence incomplete')
if (!/^[a-f0-9]{64}$/.test(receipt.databaseExport?.sha256 ?? '')) fail('database manifest SHA-256 invalid')
if (receipt.assetExport?.downloadIntegrityVerified !== true || receipt.assetExport?.cleanupVerified !== true || !/^[a-f0-9]{64}$/.test(receipt.assetExport?.sha256 ?? '')) fail('asset export evidence incomplete')
if (!/^[a-f0-9]{64}$/.test(receipt.packageIndex?.sha256 ?? '')) fail('package index digest invalid')
if (receipt.cleanup?.workspaceCleanupVerified !== true) fail('workspace cleanup not verified')
for (const [key, value] of Object.entries(receipt.cleanup?.postCleanup ?? {})) if (value !== 0) fail(`post-cleanup ${key} must be zero`)

const t2c = (governance.workstreams ?? []).find((item) => item.id === 'T2C_PERSONAL_DATA_EXPORT_DELETION')
const t2d = (governance.workstreams ?? []).find((item) => item.id === 'T2D_DEDICATED_PRIVACY_REVIEW')
if (t2c?.state !== 'SATISFIED' || t2c?.evidence !== 'ops/tier2-personal-data-export-deletion-policy.json' || t2c?.receipt !== 'ops/tier2-export-rehearsal-receipt.json') fail('governance T2C linkage invalid')
if (governance.tier2?.admissionState !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')
if (t2d?.state === 'BLOCKED_EXTERNAL_GOVERNANCE') {
  if (governance.nextAuthorizedWorkstream !== 'T2D_EXTERNAL_GOVERNANCE_EVIDENCE') fail('blocked T2D must point to external governance evidence')
} else if (governance.nextAuthorizedWorkstream !== 'T2D_DEDICATED_PRIVACY_REVIEW') {
  fail('before T2D review the next workstream must be T2D')
}

console.log('P7 T2C PASS: export/deletion invariants preserved across privacy review; Tier 2 remains NOT_ADMITTED')
