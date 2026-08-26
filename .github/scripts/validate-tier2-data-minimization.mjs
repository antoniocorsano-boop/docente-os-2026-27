import fs from 'node:fs'

const policy = JSON.parse(fs.readFileSync('ops/tier2-data-minimization-policy.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 data minimization invalid: ${message}`)
  process.exit(1)
}

if (policy.schemaVersion !== 1 || policy.gate !== 'T2A_DATA_MINIMIZATION_POLICY') fail('gate/schema mismatch')
if (policy.state !== 'SATISFIED_POLICY_ONLY' || policy.tier2AdmissionEffect !== 'NONE') fail('T2A policy must not admit Tier 2')
if (policy.defaultRule !== 'DO_NOT_COLLECT_UNLESS_EXPLICIT_PURPOSE_AND_NECESSITY') fail('default minimization rule missing')

if (admission.higherRiskTier?.id !== 'TIER_2_SCHOOL_PERSONAL_DATA' || admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

const allowedPurposes = new Set(policy.purposeBinding?.allowedPurposes ?? [])
for (const value of ['teacher-owned pedagogical planning','teacher-owned formative progress tracking','teacher workflow continuity']) {
  if (!allowedPurposes.has(value)) fail(`missing allowed purpose ${value}`)
}
const prohibitedPurposes = new Set(policy.purposeBinding?.prohibitedPurposes ?? [])
for (const value of ['advertising','commercial profiling','external model training','emotion recognition','fully automated high-stakes educational decisions']) {
  if (!prohibitedPurposes.has(value)) fail(`missing prohibited purpose ${value}`)
}

const allowed = new Map((policy.potentiallyAdmissibleDataClasses ?? []).map((item) => [item.id, item]))
if (allowed.get('STUDENT_PSEUDONYMOUS_REFERENCE')?.rule !== 'LOCAL_PSEUDONYMOUS_TOKEN_ONLY') fail('student reference must be pseudonymous')
if (allowed.get('STUDENT_PSEUDONYMOUS_REFERENCE')?.directNameAllowed !== false) fail('direct student name must remain disabled')
if (!allowed.has('CLASS_SECTION_CONTEXT') || !allowed.has('STRUCTURED_LEARNING_PROGRESS')) fail('minimum contextual classes missing')

const prohibited = new Set(policy.prohibitedDataClasses ?? [])
for (const id of [
  'DIRECT_STUDENT_NAME_INITIAL_TIER2','STUDENT_CONTACT_DETAILS','HOME_ADDRESS','DATE_OF_BIRTH','FAMILY_PERSONAL_DATA',
  'COLLEAGUE_OR_OTHER_THIRD_PARTY_PERSONAL_DATA','HEALTH_DISABILITY_DSA_BES_DATA','RELIGION_OR_BELIEF_DATA','BIOMETRIC_DATA',
  'POLITICAL_TRADE_UNION_OR_SEXUAL_ORIENTATION_DATA','DISCIPLINARY_OR_OTHER_DELICATE_FREE_TEXT','UNBOUNDED_PERSONAL_FREE_TEXT','CREDENTIALS_OR_SECRETS'
]) {
  if (!prohibited.has(id)) fail(`missing prohibited data class ${id}`)
}

if (policy.reIdentificationControls?.mappingToDirectIdentityStoredInDocenteOs !== false) fail('identity mapping must not be stored')
if (policy.reIdentificationControls?.directIdentifierExpansionRequiresSeparateGate !== true) fail('direct identifier expansion must require separate gate')
if (policy.reIdentificationControls?.combinationRiskMustBeReviewed !== true) fail('combination risk review required')
if (policy.aiBoundary?.personalTier2DataMayBeSentToExternalAiByDefault !== false) fail('external AI default must be false')
if (policy.aiBoundary?.externalAiUseRequiresDedicatedProcessorAndDataFlowReview !== true) fail('external AI requires dedicated review')

for (const id of ['allowed-data-categories','prohibited-data-categories','purpose-binding','field-level-minimization-rules']) {
  if (policy.evidence?.[id] !== true) fail(`missing T2A evidence ${id}`)
}

console.log('T2A data minimization PASS: policy satisfied; Tier 2 remains NOT_ADMITTED')
