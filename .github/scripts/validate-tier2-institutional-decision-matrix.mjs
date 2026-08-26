import fs from 'node:fs'

const matrix = JSON.parse(fs.readFileSync('ops/tier2-institutional-decision-matrix.json', 'utf8'))
const receipts = JSON.parse(fs.readFileSync('ops/tier2-external-governance-evidence-receipts.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 institutional decision matrix invalid: ${message}`)
  process.exit(1)
}

if (matrix.schemaVersion !== 1 || matrix.gate !== 'T2D_INSTITUTIONAL_DECISION_MATRIX') fail('gate/schema mismatch')
if (matrix.state !== 'PREPARED_NOT_APPROVED' || matrix.tier2AdmissionEffect !== 'NONE') fail('matrix must remain non-promotive')
if (matrix.scope !== 'SINGLE_OWNER_PILOT' || matrix.currentTier2AdmissionState !== 'NOT_ADMITTED') fail('scope/admission boundary mismatch')

const authority = matrix.authorityBoundary ?? {}
if (authority.technicalTeamMayPrepareDecisionOptions !== true || authority.technicalTeamMayRecommendConservativeOption !== true) fail('technical preparation boundary missing')
if (authority.technicalTeamMayApproveInstitutionalDecision !== false) fail('technical team must not approve institutional decisions')
if (authority.institutionalEvidenceRequired !== true || authority.explicitHumanTier2AdmissionDecisionStillRequiredAfterAllEvidenceIsVerified !== true) fail('institutional/final human boundary missing')

const expected = new Map([
  ['E1','INSTITUTIONAL_CONTROLLER_AUTHORITY'],
  ['E2','TRANSPARENCY_AND_RIGHTS_ROUTING'],
  ['E3','DPIA_SCREENING'],
  ['E4','PURPOSE_SPECIFIC_RETENTION_SCHEDULE'],
])

if (!Array.isArray(matrix.decisions) || matrix.decisions.length !== 4) fail('exactly four institutional decisions required')
for (const decision of matrix.decisions) {
  if (expected.get(decision.evidenceId) !== decision.gateId) fail(`unexpected decision mapping ${decision.evidenceId}`)
  if (decision.currentStatus !== 'AWAITING_EXTERNAL_EVIDENCE') fail(`${decision.evidenceId} must remain awaiting external evidence`)
  if (!decision.decisionOwner || !decision.decisionQuestion) fail(`${decision.evidenceId} decision owner/question missing`)
  if (!Array.isArray(decision.requiredSubdecisions) || decision.requiredSubdecisions.length === 0) fail(`${decision.evidenceId} subdecisions missing`)
  if (!Array.isArray(decision.evidenceRequiredToVerify) || !decision.evidenceRequiredToVerify.includes('SHA-256 of approved/protocolled version') && !decision.evidenceRequiredToVerify.includes('SHA-256')) fail(`${decision.evidenceId} SHA evidence missing`)
}

if (matrix.closureRule?.allFourEvidenceReceiptsMustBeVerified !== true || matrix.closureRule?.templatesAloneNeverCloseAGate !== true) fail('closure rule incomplete')
if (matrix.closureRule?.tier2MustRemainNotAdmittedUntilSeparateFinalHumanAdmissionDecision !== true) fail('final human admission boundary missing')

if (receipts.currentResult?.verifiedDecisionCount !== 0 || receipts.currentResult?.requiredDecisionCount !== 4) fail('receipt baseline must remain 0/4')
for (const receipt of receipts.receipts ?? []) if (receipt.verified !== false) fail(`${receipt.evidenceId} must not be pre-verified`)
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

console.log('P7 T2D institutional decision matrix PASS: four decisions explicit, evidence 0/4, Tier 2 remains NOT_ADMITTED')
