import fs from 'node:fs'

const review = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))
const release = JSON.parse(fs.readFileSync('ops/production-release-receipt.json', 'utf8'))
const infra = JSON.parse(fs.readFileSync('ops/production-infrastructure-spec.json', 'utf8'))
const decision = JSON.parse(fs.readFileSync('ops/real-data-admission-decision-receipt.json', 'utf8'))

const fail = (message) => {
  console.error(`Real data admission review invalid: ${message}`)
  process.exit(1)
}

const tier1 = 'TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL'
const tier2 = 'TIER_2_SCHOOL_PERSONAL_DATA'

if (review.schemaVersion !== 2 || review.gate !== 'P7-REAL-DATA-ADMISSION') fail('gate/schema mismatch')
if (review.state !== 'AUTHORIZED_TIER_1') fail('review must be AUTHORIZED_TIER_1')
if (review.productionStateRequired !== 'ACTIVE_SINGLE_OWNER_PILOT') fail('Production state prerequisite mismatch')
if (review.releaseScope !== 'SINGLE_OWNER_PILOT' || review.audience !== 'named_owner_only') fail('pilot scope mismatch')

if (release.result !== 'PASS' || release.activationCompleted !== true || release.nextGate !== 'P7-REAL-DATA-ADMISSION') fail('historical Production release receipt mismatch')
if (release.postPromotionSmoke?.exactCandidateShaVerified !== true) fail('exact Production candidate SHA must remain verified')
if (release.realUserDataAccepted !== false) fail('historical release receipt must remain immutable and real-data-free')

if (decision.gate !== 'P7-REAL-DATA-ADMISSION' || decision.decision !== 'AUTHORIZED') fail('explicit Tier 1 decision receipt missing')
if (decision.authorizedTier !== tier1 || decision.scope !== 'SINGLE_OWNER_PILOT' || decision.audience !== 'named_owner_only') fail('decision scope mismatch')
if (decision.allowed?.ownerProfessionalContent !== true) fail('owner professional content must be allowed')
for (const key of ['studentPersonalData','thirdPartyPersonalData','specialCategoryData','credentialsOrSecrets','automaticBetaMigration']) {
  if (decision.allowed?.[key] !== false) fail(`decision.allowed.${key} must be false`)
}
if (decision.manualImportRequiresExplicitOwnerAction !== true) fail('manual import must require explicit owner action')
if (decision.higherRiskTier?.id !== tier2 || decision.higherRiskTier?.state !== 'NOT_ADMITTED' || decision.higherRiskTier?.requiresSeparateGate !== true) fail('Tier 2 must remain NOT_ADMITTED')

if (infra.provisioningState !== 'ACTIVE_SINGLE_OWNER_PILOT' || infra.hosting?.serviceState !== 'ACTIVE') fail('Production runtime must remain active single-owner')
if (infra.data?.realUserDataAccepted !== true || infra.data?.admissionScope !== tier1) fail('infrastructure Tier 1 admission mismatch')
if (infra.data?.automaticBetaCopyAllowed !== false || infra.data?.manualImportRequiresOwnerDecision !== true) fail('data import boundary violated')
for (const key of ['studentPersonalDataAllowed','thirdPartyPersonalDataAllowed','specialCategoryDataAllowed','credentialsOrSecretsAllowed']) {
  if (infra.data?.[key] !== false) fail(`${key} must remain false`)
}
if (infra.release?.publicSignupAllowed !== false || infra.release?.multiTenantOnboardingAllowed !== false) fail('scope expansion is forbidden')

if (review.currentAdmission?.realUserDataAccepted !== true || review.currentAdmission?.admissionScope !== tier1) fail('current Tier 1 admission missing')
if (review.authorizedAdmissionTier?.id !== tier1 || review.authorizedAdmissionTier?.ownerProfessionalContentAllowed !== true) fail('authorized Tier 1 mismatch')
for (const key of ['studentPersonalDataAllowed','thirdPartyPersonalDataAllowed','specialCategoryDataAllowed','credentialsOrSecretsAllowed','automaticBetaMigrationAllowed']) {
  if (review.authorizedAdmissionTier?.[key] !== false) fail(`${key} must be false`)
}
if (review.authorizedAdmissionTier?.manualImportRequiresExplicitOwnerAction !== true) fail('manual import must require explicit owner action')
if (review.higherRiskTier?.id !== tier2 || review.higherRiskTier?.state !== 'NOT_ADMITTED' || review.higherRiskTier?.requiresSeparateGate !== true) fail('higher-risk personal-data tier must remain NOT_ADMITTED')
for (const id of ['data-minimization-policy','application-retention-and-deletion-policy','personal-data-export-deletion-procedure','dedicated-privacy-review']) {
  if (!review.higherRiskTier?.requiredBeforeAdmission?.includes(id)) fail(`missing higher-risk prerequisite ${id}`)
}
for (const [key, value] of Object.entries(review.technicalPrerequisites ?? {})) {
  if (value !== true) fail(`technicalPrerequisites.${key} must be true`)
}
if (review.humanDecisionRequired !== true || review.humanDecision !== 'AUTHORIZED') fail('human Tier 1 decision must be explicit')
if (review.humanDecisionReceipt !== 'ops/real-data-admission-decision-receipt.json') fail('human decision receipt linkage missing')
if (review.decisionAuthorizesOnly !== tier1 || review.realUserDataAcceptedAfterThisReview !== true) fail('Tier 1 decision boundary mismatch')

console.log('P7 real-data admission PASS: Tier 1 authorized; school personal data remains NOT_ADMITTED')
