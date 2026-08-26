import fs from 'node:fs'

const governance = JSON.parse(fs.readFileSync('ops/tier2-personal-data-governance.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))
const minimization = JSON.parse(fs.readFileSync('ops/tier2-data-minimization-policy.json', 'utf8'))
const retentionDeletion = JSON.parse(fs.readFileSync('ops/tier2-application-retention-deletion-policy.json', 'utf8'))
const exportDeletion = JSON.parse(fs.readFileSync('ops/tier2-personal-data-export-deletion-policy.json', 'utf8'))
const privacyReview = JSON.parse(fs.readFileSync('ops/tier2-dedicated-privacy-review.json', 'utf8'))
const processorReview = JSON.parse(fs.readFileSync('ops/tier2-processor-transfer-review.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 personal-data governance invalid: ${message}`)
  process.exit(1)
}

if (governance.schemaVersion !== 6 || governance.gate !== 'P7-TIER2-PERSONAL-DATA-GOVERNANCE') fail('gate/schema mismatch')
if (governance.state !== 'T2D_REVIEW_COMPLETE_BLOCKED_EXTERNAL_GOVERNANCE') fail('governance must reflect completed-but-blocked T2D review')
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

if (minimization.gate !== 'T2A_DATA_MINIMIZATION_POLICY' || minimization.state !== 'SATISFIED_POLICY_ONLY' || minimization.tier2AdmissionEffect !== 'NONE') fail('T2A evidence invalid')
if (retentionDeletion.gate !== 'T2B_APPLICATION_RETENTION_DELETION' || retentionDeletion.state !== 'SATISFIED' || retentionDeletion.tier2AdmissionEffect !== 'NONE') fail('T2B evidence invalid')
if (exportDeletion.gate !== 'T2C_PERSONAL_DATA_EXPORT_DELETION' || exportDeletion.state !== 'SATISFIED' || exportDeletion.tier2AdmissionEffect !== 'NONE') fail('T2C evidence invalid')
if (privacyReview.gate !== 'T2D_DEDICATED_PRIVACY_REVIEW' || privacyReview.state !== 'REVIEW_COMPLETE_BLOCKED_EXTERNAL_GOVERNANCE' || privacyReview.tier2AdmissionEffect !== 'NONE') fail('T2D review evidence invalid')
if (processorReview.gate !== 'T2D_PROCESSOR_AND_TRANSFER_REVIEW' || processorReview.state !== 'SATISFIED_DOCUMENTARY_REVIEW' || processorReview.tier2AdmissionEffect !== 'NONE') fail('processor/transfer evidence invalid')

const workstreams = new Map((governance.workstreams ?? []).map((item) => [item.id, item]))
for (const id of ['T2A_DATA_MINIMIZATION_POLICY','T2B_APPLICATION_RETENTION_DELETION','T2C_PERSONAL_DATA_EXPORT_DELETION']) {
  if (workstreams.get(id)?.state !== 'SATISFIED') fail(`${id} must remain SATISFIED`)
}
const t2d = workstreams.get('T2D_DEDICATED_PRIVACY_REVIEW')
if (t2d?.state !== 'BLOCKED_EXTERNAL_GOVERNANCE') fail('T2D must remain blocked by external governance evidence')
if (t2d?.evidence !== 'ops/tier2-dedicated-privacy-review.json' || t2d?.reviewEvidenceComplete !== true || t2d?.blockingResidualCount !== 4) fail('T2D governance linkage incomplete')
if (t2d?.processorAndTransferReview !== 'SATISFIED_DOCUMENTARY_REVIEW' || t2d?.processorAndTransferEvidence !== 'ops/tier2-processor-transfer-review.json') fail('processor/transfer governance linkage missing')
for (const evidenceId of ['processing-purpose-review','data-flow-review','access-control-review','residual-risk-review']) {
  if (!t2d.requiredEvidence?.includes(evidenceId) || privacyReview.evidence?.[evidenceId] !== true) fail(`T2D evidence missing: ${evidenceId}`)
}

if (privacyReview.residualRiskReview?.assessment !== 'BLOCKED' || privacyReview.residualRiskReview?.blockingResiduals?.length !== 4) fail('T2D blocker set mismatch')
const remaining = new Set(governance.remainingExternalGovernanceEvidence ?? [])
for (const id of ['INSTITUTIONAL_CONTROLLER_AUTHORITY','TRANSPARENCY_AND_RIGHTS_ROUTING','DPIA_SCREENING','PURPOSE_SPECIFIC_RETENTION_SCHEDULE']) {
  if (!remaining.has(id)) fail(`missing remaining external evidence ${id}`)
}
if (remaining.size !== 4) fail('remaining external evidence set must contain exactly four blockers')
if (privacyReview.closureRule?.technicalReviewMayNotDetermineLawfulBasis !== true || privacyReview.closureRule?.technicalReviewMayNotSelfAuthorizeInstitutionalProcessing !== true) fail('institutional/legal authority boundary missing')
if (privacyReview.closureRule?.newExplicitHumanAdmissionDecisionStillRequiredAfterAllBlockersClose !== true) fail('future explicit admission decision must remain required')

if (governance.blockingRule?.allWorkstreamsMustBeSatisfied !== true || governance.blockingRule?.tier2MustRemainNotAdmittedUntilThen !== true) fail('Tier 2 blocking rule weakened')
if (governance.blockingRule?.newExplicitHumanDecisionRequiredAfterTechnicalClosure !== true || governance.blockingRule?.technicalClosureAloneMayNotAdmitPersonalData !== true) fail('human admission boundary weakened')
if (governance.blockingRule?.externalGovernanceEvidenceMayNotBeSelfAssertedByProduct !== true) fail('external governance evidence boundary missing')
if (governance.nextAuthorizedWorkstream !== 'T2D_EXTERNAL_GOVERNANCE_EVIDENCE') fail('next gate must be external governance evidence')

console.log('P7 Tier 2 governance PASS: processor/transfer documentary review closed; four external controller-governance blockers remain; Tier 2 remains NOT_ADMITTED')
