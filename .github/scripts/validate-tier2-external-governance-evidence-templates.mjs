import fs from 'node:fs'

const decisionPack = JSON.parse(fs.readFileSync('ops/tier2-external-governance-decision-pack.json', 'utf8'))
const receipts = JSON.parse(fs.readFileSync('ops/tier2-external-governance-evidence-receipts.json', 'utf8'))
const governance = JSON.parse(fs.readFileSync('ops/tier2-personal-data-governance.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 external-governance evidence templates invalid: ${message}`)
  process.exit(1)
}

if (receipts.schemaVersion !== 1 || receipts.gate !== 'T2D_EXTERNAL_GOVERNANCE_EVIDENCE_RECEIPTS') fail('receipt registry gate/schema mismatch')
if (receipts.state !== 'TEMPLATES_READY_NO_EXTERNAL_EVIDENCE_VERIFIED') fail('receipt registry must remain pre-evidence')
if (receipts.tier2AdmissionEffect !== 'NONE' || receipts.tier2AdmissionState !== 'NOT_ADMITTED') fail('receipt registry must be non-promotive')

const rule = receipts.receiptRule ?? {}
for (const key of ['stableExternalReferenceRequired','documentDateRequired','approverRoleRequired','decisionRequired','sha256Required','humanVerificationRequired','allFourVerifiedRequiredForT2dClosure']) {
  if (rule[key] !== true) fail(`receiptRule.${key} must be true`)
}
if (rule.repositoryStoresApprovedDocumentContent !== false) fail('approved institutional documents must not be required in public repository')
if (rule.templateCompletionAloneCountsAsEvidence !== false) fail('template completion alone must not count as evidence')

const expected = new Map([
  ['T2D-E1', ['INSTITUTIONAL_CONTROLLER_AUTHORITY', 'docs/product/tier2-evidence-templates/E1_INSTITUTIONAL_CONTROLLER_AUTHORITY_TEMPLATE.md']],
  ['T2D-E2', ['TRANSPARENCY_AND_RIGHTS_ROUTING', 'docs/product/tier2-evidence-templates/E2_TRANSPARENCY_AND_RIGHTS_ROUTING_TEMPLATE.md']],
  ['T2D-E3', ['DPIA_SCREENING', 'docs/product/tier2-evidence-templates/E3_DPIA_SCREENING_TEMPLATE.md']],
  ['T2D-E4', ['PURPOSE_SPECIFIC_RETENTION_SCHEDULE', 'docs/product/tier2-evidence-templates/E4_PURPOSE_SPECIFIC_RETENTION_SCHEDULE_TEMPLATE.md']],
])

if (!Array.isArray(receipts.receipts) || receipts.receipts.length !== 4) fail('exactly four evidence receipts required')

for (const receipt of receipts.receipts) {
  const expectedEntry = expected.get(receipt.evidenceId)
  if (!expectedEntry) fail(`unexpected evidenceId ${receipt.evidenceId}`)
  const [blockerId, template] = expectedEntry
  if (receipt.blockerId !== blockerId || receipt.template !== template) fail(`receipt linkage mismatch for ${receipt.evidenceId}`)
  if (receipt.state !== 'AWAITING_EXTERNAL_EVIDENCE') fail(`${receipt.evidenceId} must remain awaiting external evidence`)
  for (const key of ['evidenceReference','documentDate','documentVersion','approverRole','decision','sha256','verifiedByRole','verifiedAt']) {
    if (receipt[key] !== null) fail(`${receipt.evidenceId}.${key} must remain null before external evidence exists`)
  }
  if (receipt.verified !== false) fail(`${receipt.evidenceId} must not be verified`)
  if (!fs.existsSync(template)) fail(`missing template ${template}`)
  const body = fs.readFileSync(template, 'utf8')
  if (!body.includes('PREPARED_NOT_APPROVED')) fail(`${template} missing PREPARED_NOT_APPROVED marker`)
  if (!body.includes('DA_DECIDERE')) fail(`${template} must expose institutional decision fields`)
}

if (decisionPack.currentResult?.verifiedDecisionCount !== 0 || decisionPack.currentResult?.requiredDecisionCount !== 4) fail('decision pack verification count mismatch')
for (const decision of decisionPack.requiredDecisions ?? []) {
  if (decision.state !== 'AWAITING_EXTERNAL_EVIDENCE' || decision.verified !== false || decision.evidenceReference !== null) fail(`decision ${decision.id} was promoted without evidence`)
}

if (receipts.currentResult?.verifiedEvidenceCount !== 0 || receipts.currentResult?.requiredEvidenceCount !== 4) fail('receipt currentResult mismatch')
if (receipts.currentResult?.t2dState !== 'BLOCKED_EXTERNAL_GOVERNANCE' || receipts.currentResult?.tier2AdmissionState !== 'NOT_ADMITTED') fail('currentResult must remain blocked')
if (governance.tier2?.admissionState !== 'NOT_ADMITTED') fail('governance Tier 2 must remain NOT_ADMITTED')
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('admission review Tier 2 must remain NOT_ADMITTED')

console.log('P7 T2D evidence-template gate PASS: E1-E4 prepared, receipts unverified, Tier 2 remains NOT_ADMITTED')
