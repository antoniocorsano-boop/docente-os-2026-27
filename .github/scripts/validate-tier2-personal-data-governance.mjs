import fs from 'node:fs'

const governance = JSON.parse(fs.readFileSync('ops/tier2-personal-data-governance.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))
const minimization = JSON.parse(fs.readFileSync('ops/tier2-data-minimization-policy.json', 'utf8'))
const retentionDeletion = JSON.parse(fs.readFileSync('ops/tier2-application-retention-deletion-policy.json', 'utf8'))
const exportDeletion = JSON.parse(fs.readFileSync('ops/tier2-personal-data-export-deletion-policy.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 personal-data governance invalid: ${message}`)
  process.exit(1)
}

if (governance.schemaVersion !== 4 || governance.gate !== 'P7-TIER2-PERSONAL-DATA-GOVERNANCE') fail('gate/schema mismatch')
if (governance.state !== 'T2A_T2B_T2C_COMPLETE_BLOCKED') fail('governance must remain blocked after T2A/T2B/T2C')
if (governance.productionScope !== 'SINGLE_OWNER_PILOT') fail('scope must remain SINGLE_OWNER_PILOT')
if (governance.currentTier1Admission !== 'TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL') fail('Tier 1 baseline mismatch')

if (admission.state !== 'AUTHORIZED_TIER_1') fail('Tier 1 must already be authorized')
if (admission.currentAdmission?.admissionScope !== 'TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL') fail('current admission scope mismatch')
if (admission.higherRiskTier?.id !== 'TIER_2_SCHOOL_PERSONAL_DATA' || admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

if (governance.tier2?.id !== 'TIER_2_SCHOOL_PERSONAL_DATA' || governance.tier2?.admissionState !== 'NOT_ADMITTED') fail('Tier 2 admission boundary invalid')
for (const key of ['automaticAdmissionAllowed','publicSignupAllowed','multiTenantOnboardingAllowed','automaticBetaMigrationAllowed']) {
  if (governance.tier2?.[key] !== false) fail(`tier2.${key} must remain false`)
}
if (governance.tier2?.explicitHumanDecisionRequiredAfterAllPrerequisites !== true) fail('post-closure human decision must be required')

for (const key of ['dataMinimizationRequired','purposeLimitationRequired','leastPrivilegeRequired','applicationLifecycleControlsRequired','exportAndDeletionProcedureRequired','dedicatedPrivacyReviewRequired','specialCategoryDataRequiresAdditionalExplicitGate','credentialsOrSecretsNeverAdmitted']) {
  if (governance.principles?.[key] !== true) fail(`principles.${key} must be true`)
}

if (minimization.gate !== 'T2A_DATA_MINIMIZATION_POLICY' || minimization.state !== 'SATISFIED_POLICY_ONLY' || minimization.tier2AdmissionEffect !== 'NONE') fail('T2A evidence invalid')
if (retentionDeletion.gate !== 'T2B_APPLICATION_RETENTION_DELETION' || retentionDeletion.state !== 'SATISFIED' || retentionDeletion.tier2AdmissionEffect !== 'NONE') fail('T2B evidence invalid')
if (exportDeletion.gate !== 'T2C_PERSONAL_DATA_EXPORT_DELETION' || exportDeletion.state !== 'SATISFIED' || exportDeletion.tier2AdmissionEffect !== 'NONE') fail('T2C evidence invalid')

const required = new Map([
  ['T2A_DATA_MINIMIZATION_POLICY',['allowed-data-categories','prohibited-data-categories','purpose-binding','field-level-minimization-rules']],
  ['T2B_APPLICATION_RETENTION_DELETION',['application-retention-policy','deletion-semantics','backup-boundary-documented','deletion-rehearsal']],
  ['T2C_PERSONAL_DATA_EXPORT_DELETION',['personal-data-export-procedure','personal-data-deletion-procedure','request-authentication-boundary','operator-receipt']],
  ['T2D_DEDICATED_PRIVACY_REVIEW',['processing-purpose-review','data-flow-review','access-control-review','residual-risk-review']],
])
const workstreams = new Map((governance.workstreams ?? []).map((item) => [item.id, item]))
for (const [id, evidence] of required) {
  const item = workstreams.get(id)
  if (!item) fail(`missing workstream ${id}`)
  const expectedState = ['T2A_DATA_MINIMIZATION_POLICY','T2B_APPLICATION_RETENTION_DELETION','T2C_PERSONAL_DATA_EXPORT_DELETION'].includes(id) ? 'SATISFIED' : 'NOT_SATISFIED'
  if (item.state !== expectedState) fail(`${id} must be ${expectedState}`)
  for (const evidenceId of evidence) if (!item.requiredEvidence?.includes(evidenceId)) fail(`${id} missing evidence ${evidenceId}`)
}
if (workstreams.get('T2A_DATA_MINIMIZATION_POLICY')?.evidence !== 'ops/tier2-data-minimization-policy.json') fail('T2A evidence linkage missing')
if (workstreams.get('T2B_APPLICATION_RETENTION_DELETION')?.evidence !== 'ops/tier2-application-retention-deletion-policy.json') fail('T2B evidence linkage missing')
if (workstreams.get('T2B_APPLICATION_RETENTION_DELETION')?.receipt !== 'ops/tier2-retention-deletion-rehearsal-receipt.json') fail('T2B receipt linkage missing')
if (workstreams.get('T2C_PERSONAL_DATA_EXPORT_DELETION')?.evidence !== 'ops/tier2-personal-data-export-deletion-policy.json') fail('T2C evidence linkage missing')
if (workstreams.get('T2C_PERSONAL_DATA_EXPORT_DELETION')?.receipt !== 'ops/tier2-export-rehearsal-receipt.json') fail('T2C receipt linkage missing')

if (governance.blockingRule?.allWorkstreamsMustBeSatisfied !== true) fail('all workstreams must be required')
if (governance.blockingRule?.tier2MustRemainNotAdmittedUntilThen !== true) fail('Tier 2 must remain blocked')
if (governance.blockingRule?.newExplicitHumanDecisionRequiredAfterTechnicalClosure !== true) fail('new explicit decision must be required')
if (governance.blockingRule?.technicalClosureAloneMayNotAdmitPersonalData !== true) fail('technical closure must not auto-admit personal data')
if (governance.nextAuthorizedWorkstream !== 'T2D_DEDICATED_PRIVACY_REVIEW') fail('next workstream must be T2D')

console.log('P7 Tier 2 governance PASS: T2A/T2B/T2C satisfied; T2D outstanding; Tier 2 remains NOT_ADMITTED')
