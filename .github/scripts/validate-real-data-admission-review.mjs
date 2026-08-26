import fs from 'node:fs'

const review = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))
const release = JSON.parse(fs.readFileSync('ops/production-release-receipt.json', 'utf8'))
const infra = JSON.parse(fs.readFileSync('ops/production-infrastructure-spec.json', 'utf8'))

const fail = (message) => {
  console.error(`Real data admission review invalid: ${message}`)
  process.exit(1)
}

if (review.schemaVersion !== 1 || review.gate !== 'P7-REAL-DATA-ADMISSION') fail('gate/schema mismatch')
if (review.state !== 'READY_FOR_HUMAN_DECISION') fail('review must remain READY_FOR_HUMAN_DECISION before explicit human authorization')
if (review.productionStateRequired !== 'ACTIVE_SINGLE_OWNER_PILOT') fail('Production state prerequisite mismatch')
if (review.releaseScope !== 'SINGLE_OWNER_PILOT' || review.audience !== 'named_owner_only') fail('pilot scope mismatch')

if (release.result !== 'PASS' || release.activationCompleted !== true || release.nextGate !== 'P7-REAL-DATA-ADMISSION') fail('Production release receipt must already be PASS and point to this gate')
if (release.postPromotionSmoke?.exactCandidateShaVerified !== true) fail('exact Production candidate SHA must be verified')
if (release.realUserDataAccepted !== false) fail('historical release receipt must remain real-data-free')

if (infra.provisioningState !== 'ACTIVE_SINGLE_OWNER_PILOT' || infra.hosting?.serviceState !== 'ACTIVE') fail('Production runtime must be active single-owner')
if (infra.data?.realUserDataAccepted !== false) fail('real data must remain disabled before the human decision')
if (infra.release?.publicSignupAllowed !== false || infra.release?.multiTenantOnboardingAllowed !== false) fail('scope expansion is forbidden')
if (infra.data?.automaticBetaCopyAllowed !== false) fail('automatic Beta copy must remain disabled')

if (review.currentAdmission?.realUserDataAccepted !== false) fail('current admission must remain false')
if (review.proposedAdmissionTier?.id !== 'TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL') fail('unexpected proposed tier')
if (review.proposedAdmissionTier?.ownerProfessionalContentAllowed !== true) fail('Tier 1 owner professional content must be the only positive allowance')
for (const key of ['studentPersonalDataAllowed','thirdPartyPersonalDataAllowed','specialCategoryDataAllowed','credentialsOrSecretsAllowed','automaticBetaMigrationAllowed']) {
  if (review.proposedAdmissionTier?.[key] !== false) fail(`${key} must be false`)
}
if (review.proposedAdmissionTier?.manualImportRequiresExplicitOwnerAction !== true) fail('manual import must require explicit owner action')

if (review.higherRiskTier?.id !== 'TIER_2_SCHOOL_PERSONAL_DATA' || review.higherRiskTier?.state !== 'NOT_ADMITTED' || review.higherRiskTier?.requiresSeparateGate !== true) fail('higher-risk personal-data tier must remain NOT_ADMITTED')
const requiredHigherRisk = ['data-minimization-policy','application-retention-and-deletion-policy','personal-data-export-deletion-procedure','dedicated-privacy-review']
for (const id of requiredHigherRisk) {
  if (!review.higherRiskTier?.requiredBeforeAdmission?.includes(id)) fail(`missing higher-risk prerequisite ${id}`)
}

for (const [key, value] of Object.entries(review.technicalPrerequisites ?? {})) {
  if (value !== true) fail(`technicalPrerequisites.${key} must be true`)
}
if (review.humanDecisionRequired !== true || review.humanDecision !== 'PENDING') fail('human decision must remain explicitly pending')
if (review.decisionMayAuthorizeOnly !== 'TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL') fail('human decision scope must be limited to Tier 1')
if (review.realUserDataAcceptedAfterThisReview !== false) fail('review alone must never activate real data')

console.log('P7 real-data admission foundation PASS: Tier 1 ready for human decision; school personal data remains NOT_ADMITTED')
