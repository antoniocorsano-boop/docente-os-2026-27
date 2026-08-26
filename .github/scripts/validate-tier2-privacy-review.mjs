import fs from 'node:fs'

const review = JSON.parse(fs.readFileSync('ops/tier2-dedicated-privacy-review.json', 'utf8'))
const processorReview = JSON.parse(fs.readFileSync('ops/tier2-processor-transfer-review.json', 'utf8'))
const governance = JSON.parse(fs.readFileSync('ops/tier2-personal-data-governance.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 privacy review invalid: ${message}`)
  process.exit(1)
}

if (review.schemaVersion !== 2 || review.gate !== 'T2D_DEDICATED_PRIVACY_REVIEW') fail('review gate/schema mismatch')
if (review.state !== 'REVIEW_COMPLETE_BLOCKED_EXTERNAL_GOVERNANCE' || review.tier2AdmissionEffect !== 'NONE') fail('review must remain non-promotive and blocked')
if (review.scope !== 'SINGLE_OWNER_PILOT') fail('scope must remain SINGLE_OWNER_PILOT')
if (review.reviewNature !== 'TECHNICAL_AND_GOVERNANCE_REVIEW_NOT_LEGAL_CERTIFICATION') fail('review nature boundary missing')

for (const evidenceId of ['processing-purpose-review','data-flow-review','access-control-review','residual-risk-review','processor-and-transfer-review']) {
  if (review.evidence?.[evidenceId] !== true) fail(`missing review evidence ${evidenceId}`)
}

if (processorReview.schemaVersion !== 1 || processorReview.gate !== 'T2D_PROCESSOR_AND_TRANSFER_REVIEW') fail('processor review gate/schema mismatch')
if (processorReview.state !== 'SATISFIED_DOCUMENTARY_REVIEW' || processorReview.tier2AdmissionEffect !== 'NONE') fail('processor review must be documentary and non-promotive')
if (processorReview.reviewNature !== 'DOCUMENTARY_PROCESSOR_AND_TRANSFER_REVIEW_NOT_LEGAL_CERTIFICATION') fail('processor review legal boundary missing')
if (processorReview.reviewConclusion?.processorTermsReviewed !== true || processorReview.reviewConclusion?.subprocessorsReviewed !== true || processorReview.reviewConclusion?.dataLocationsReviewed !== true || processorReview.reviewConclusion?.transferSafeguardsReviewed !== true) fail('processor review evidence incomplete')
if (processorReview.reviewConclusion?.institutionalAcceptanceOrExecutionOfDpasProven !== false || processorReview.reviewConclusion?.lawfulBasisDetermined !== false || processorReview.reviewConclusion?.controllerAuthorizationProven !== false) fail('processor review exceeds documentary authority')
const providers = new Set((processorReview.providers ?? []).map((item) => item.provider))
for (const provider of ['Render','Supabase','Cloudflare R2']) if (!providers.has(provider)) fail(`missing provider review ${provider}`)

if (review.processingPurposeReview?.externalAiPersonalDataTransferAllowed !== false) fail('external AI personal-data transfer must remain disabled')
if (review.processingPurposeReview?.specialCategoryDataAllowed !== false) fail('special-category data must remain disabled')
if (review.processingPurposeReview?.assessment !== 'CONDITIONAL') fail('purpose review must remain conditional')

if (review.dataFlowReview?.externalAiProviderPresentInRepository !== false) fail('unexpected external AI provider state')
if (review.dataFlowReview?.automaticBetaMigrationAllowed !== false || review.dataFlowReview?.publicSignupAllowed !== false) fail('data-flow restrictions weakened')
const runtime = new Set((review.dataFlowReview?.runtimeProcessors ?? []).map((item) => item.component))
for (const component of ['Render','Supabase','Cloudflare R2']) if (!runtime.has(component)) fail(`missing runtime processor ${component}`)
if (review.dataFlowReview?.processorAndTransferReview?.state !== 'SATISFIED_DOCUMENTARY_REVIEW' || review.dataFlowReview?.processorAndTransferReview?.evidence !== 'ops/tier2-processor-transfer-review.json') fail('processor review linkage missing')
if (review.dataFlowReview?.processorAndTransferReview?.institutionalContractAcceptanceProven !== false || review.dataFlowReview?.processorAndTransferReview?.legalCertification !== false) fail('processor review boundary weakened')

const access = review.accessControlReview ?? {}
for (const key of ['singleOwnerPilot','exportRequiresAuthenticatedOwner','deletionRequiresValidatedOwnerDecision']) if (access[key] !== true) fail(`access control ${key} must be true`)
for (const key of ['publicSignupAllowed','multiTenantOnboardingAllowed','tier2DirectNamesDefaultAllowed','specialCategoryDataAllowed']) if (access[key] !== false) fail(`access control ${key} must be false`)

const blockers = new Set((review.residualRiskReview?.blockingResiduals ?? []).map((item) => item.id))
for (const id of ['INSTITUTIONAL_CONTROLLER_AUTHORITY','TRANSPARENCY_AND_RIGHTS_ROUTING','DPIA_SCREENING','PURPOSE_SPECIFIC_RETENTION_SCHEDULE']) {
  if (!blockers.has(id)) fail(`missing blocking residual ${id}`)
}
if (blockers.has('PROCESSOR_AND_TRANSFER_REVIEW')) fail('processor and transfer residual must be closed')
if (blockers.size !== 4 || review.residualRiskReview?.assessment !== 'BLOCKED') fail('blocking residual set must remain exactly four items')
const processorClosure = (review.residualRiskReview?.closedResiduals ?? []).find((item) => item.id === 'PROCESSOR_AND_TRANSFER_REVIEW')
if (processorClosure?.evidence !== 'ops/tier2-processor-transfer-review.json' || processorClosure?.doesNotProveInstitutionalAcceptance !== true) fail('processor residual closure boundary missing')

for (const restriction of ['SPECIAL_CATEGORY_DATA_REQUIRES_SEPARATE_EXPLICIT_GATE','NO_EXTERNAL_AI_PERSONAL_DATA_TRANSFER_WITHOUT_SEPARATE_GATE','NO_PUBLIC_SIGNUP','NO_MULTI_TENANT_ONBOARDING','NO_AUTOMATIC_BETA_DATA_MIGRATION']) {
  if (!review.residualRiskReview?.nonBlockingRestrictionsThatRemainMandatory?.includes(restriction)) fail(`missing mandatory restriction ${restriction}`)
}

if (review.closureRule?.reviewEvidenceComplete !== true || review.closureRule?.blockingResidualsMustBeClosedBeforeT2DMayBecomeSatisfied !== true) fail('closure rule incomplete')
if (review.closureRule?.technicalReviewMayNotDetermineLawfulBasis !== true || review.closureRule?.technicalReviewMayNotSelfAuthorizeInstitutionalProcessing !== true) fail('authority boundary weakened')
if (review.closureRule?.newExplicitHumanAdmissionDecisionStillRequiredAfterAllBlockersClose !== true) fail('future explicit human admission decision missing')

if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')
const t2d = (governance.workstreams ?? []).find((item) => item.id === 'T2D_DEDICATED_PRIVACY_REVIEW')
if (t2d?.state !== 'BLOCKED_EXTERNAL_GOVERNANCE' || t2d?.evidence !== 'ops/tier2-dedicated-privacy-review.json') fail('governance linkage invalid')
if (t2d?.processorAndTransferReview !== 'SATISFIED_DOCUMENTARY_REVIEW' || t2d?.processorAndTransferEvidence !== 'ops/tier2-processor-transfer-review.json' || t2d?.blockingResidualCount !== 4) fail('governance processor review linkage invalid')
if (governance.tier2?.admissionState !== 'NOT_ADMITTED') fail('governance Tier 2 admission boundary invalid')
if (governance.nextAuthorizedWorkstream !== 'T2D_EXTERNAL_GOVERNANCE_EVIDENCE') fail('next gate must be external governance evidence')

console.log('P7 T2D review PASS: processor/transfer documentary review closed; four controller-governance blockers remain; Tier 2 remains NOT_ADMITTED')
