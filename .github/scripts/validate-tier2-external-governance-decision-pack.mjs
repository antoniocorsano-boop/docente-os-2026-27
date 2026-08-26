import fs from 'node:fs'

const pack = JSON.parse(fs.readFileSync('ops/tier2-external-governance-decision-pack.json', 'utf8'))
const governance = JSON.parse(fs.readFileSync('ops/tier2-personal-data-governance.json', 'utf8'))
const review = JSON.parse(fs.readFileSync('ops/tier2-dedicated-privacy-review.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 external governance decision pack invalid: ${message}`)
  process.exit(1)
}

if (pack.schemaVersion !== 1 || pack.gate !== 'T2D_EXTERNAL_GOVERNANCE_EVIDENCE') fail('gate/schema mismatch')
if (pack.state !== 'PREPARED_AWAITING_CONTROLLER_EVIDENCE' || pack.tier2AdmissionEffect !== 'NONE') fail('decision pack must remain non-promotive')
if (pack.scope !== 'SINGLE_OWNER_PILOT') fail('scope mismatch')

for (const key of ['productMayPrepareTemplates']) if (pack.authorityBoundary?.[key] !== true) fail(`authorityBoundary.${key} must be true`)
for (const key of ['productMaySelfApproveEvidence','productMayDetermineLawfulBasis','productMayPerformDpiaDecisionForController','productMayApproveRetentionSchedule','productMayAdmitTier2']) {
  if (pack.authorityBoundary?.[key] !== false) fail(`authorityBoundary.${key} must be false`)
}

const requiredIds = [
  'INSTITUTIONAL_CONTROLLER_AUTHORITY',
  'TRANSPARENCY_AND_RIGHTS_ROUTING',
  'DPIA_SCREENING',
  'PURPOSE_SPECIFIC_RETENTION_SCHEDULE',
]
const decisions = new Map((pack.requiredDecisions ?? []).map((item) => [item.id, item]))
for (const id of requiredIds) {
  const item = decisions.get(id)
  if (!item) fail(`missing decision ${id}`)
  if (item.state !== 'AWAITING_EXTERNAL_EVIDENCE' || item.verified !== false || item.evidenceReference !== null) fail(`${id} must remain awaiting external evidence`)
  if (!item.decisionOwner || !Array.isArray(item.minimumEvidence) || item.minimumEvidence.length < 5) fail(`${id} evidence contract incomplete`)
}
if (decisions.size !== 4) fail('decision set must contain exactly four items')

if (pack.submissionRule?.allFourDecisionsMustBeVerifiedBeforeT2dCanBecomeSatisfied !== true) fail('all-four rule missing')
if (pack.submissionRule?.newExplicitHumanTier2AdmissionDecisionStillRequiredAfterTechnicalClosure !== true) fail('future human admission decision missing')
if (pack.submissionRule?.credentialsSecretsAndUnnecessaryPersonalDataMustNotBeStoredInRepository !== true) fail('repository data minimization rule missing')

if (pack.currentResult?.verifiedDecisionCount !== 0 || pack.currentResult?.requiredDecisionCount !== 4) fail('current decision counts invalid')
if (pack.currentResult?.t2dState !== 'BLOCKED_EXTERNAL_GOVERNANCE' || pack.currentResult?.tier2AdmissionState !== 'NOT_ADMITTED') fail('current state boundary invalid')

if (governance.nextAuthorizedWorkstream !== 'T2D_EXTERNAL_GOVERNANCE_EVIDENCE') fail('governance next gate mismatch')
if (governance.tier2?.admissionState !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')
const remaining = new Set(governance.remainingExternalGovernanceEvidence ?? [])
for (const id of requiredIds) if (!remaining.has(id)) fail(`governance missing remaining blocker ${id}`)
if (remaining.size !== 4) fail('governance must retain exactly four blockers')

const reviewBlockers = new Set((review.residualRiskReview?.blockingResiduals ?? []).map((item) => item.id))
for (const id of requiredIds) if (!reviewBlockers.has(id)) fail(`privacy review missing blocker ${id}`)
if (reviewBlockers.size !== 4) fail('privacy review must retain exactly four blockers')
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('admission review must keep Tier 2 NOT_ADMITTED')

console.log('P7 T2D external governance decision pack PASS: four controller decisions prepared, none self-approved, Tier 2 remains NOT_ADMITTED')
