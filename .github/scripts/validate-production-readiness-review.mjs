import fs from 'node:fs'

const review = JSON.parse(fs.readFileSync('ops/production-readiness-review.json', 'utf8'))
const infra = JSON.parse(fs.readFileSync('ops/production-infrastructure-spec.json', 'utf8'))
const release = JSON.parse(fs.readFileSync('ops/production-release-receipt.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-decision-receipt.json', 'utf8'))
const fail = (message) => { console.error(`Production readiness review invalid: ${message}`); process.exit(1) }
const candidate = 'db3d4ab014ad11dec4aeccdb5aa8740220e4ebde'
const tier1 = 'TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL'

if (review.schemaVersion !== 10 || review.review !== 'P7-D' || review.reviewState !== 'CURRENT') fail('current review must be P7-D schema 10')
if (review.productionActivationDecision !== 'ACTIVE_SINGLE_OWNER_PILOT' || review.scope !== 'SINGLE_OWNER_PILOT') fail('Production scope mismatch')
if (review.humanActivationDecision?.state !== 'AUTHORIZED') fail('activation authorization missing')
if (review.productionPromotion?.state !== 'PASS' || review.productionPromotion?.candidateRepositorySha !== candidate || review.productionPromotion?.exactCandidateShaVerified !== true) fail('promotion evidence mismatch')
if ((review.activationBlockers ?? []).length !== 0 || (review.provisioningResidues ?? []).length !== 0) fail('technical blockers/residues must be empty')
if (review.realUserDataAccepted !== true || review.realUserDataAdmissionScope !== tier1) fail('Tier 1 admission missing')
if (review.realDataAdmission?.state !== 'AUTHORIZED_TIER_1' || review.realDataAdmission?.scope !== tier1 || review.realDataAdmission?.receipt !== 'ops/real-data-admission-decision-receipt.json') fail('Tier 1 decision linkage mismatch')
for (const key of ['studentPersonalDataAllowed','thirdPartyPersonalDataAllowed','specialCategoryDataAllowed','credentialsOrSecretsAllowed','automaticBetaMigrationAllowed']) if (review.realDataAdmission?.[key] !== false) fail(`${key} must remain false`)
if (review.nextGate?.id !== 'P7-TIER2-PERSONAL-DATA-GOVERNANCE' || review.nextGate?.mayAcceptTier1OwnerProfessionalNonPersonal !== true || review.nextGate?.mayAcceptSchoolPersonalData !== false) fail('next gate boundary mismatch')

const required = ['P7A_PROMOTION_CONTRACT','P7B_DATA_TOPOLOGY','P7C_INFRASTRUCTURE_SPEC','P7E_PROVIDER_SELECTION','P7F_SUPABASE_PROVISIONING','P7F2_RUNTIME_PROVISIONING','DB_LOGICAL_RESTORE','SUPABASE_AUTH_SERVICE_RECOVERY','OFFSITE_STORAGE_RECOVERY_REHEARSAL','OFFSITE_STORAGE_PERSISTENT_DESTINATION','OFFSITE_STORAGE_RETENTION_LOCK','INCIDENT_ESCALATION_MINIMUM','SECURITY_BASELINE','BETA_RUNTIME_GATES','P7_PRODUCTION_ACTIVATION_DECISION','P7_PRODUCTION_PROMOTION','P7_REAL_DATA_ADMISSION_TIER_1']
const satisfied = new Map((review.satisfied ?? []).map((x) => [x.id,x]))
for (const id of required) if (satisfied.get(id)?.classification !== 'SATISFIED') fail(`missing satisfied prerequisite ${id}`)

if (infra.schemaVersion !== 6 || infra.provisioningState !== 'ACTIVE_SINGLE_OWNER_PILOT') fail('infrastructure must be active schema 6')
if (infra.hosting?.serviceState !== 'ACTIVE' || infra.hosting?.autoDeployAllowed !== false || infra.hosting?.servedCommitAtCertifiedSmoke !== candidate) fail('Render runtime mismatch')
if (infra.runtimeVerification?.state !== 'PASS' || infra.runtimeVerification?.exactCandidateShaVerified !== true || infra.runtimeVerification?.mutatingActionsPerformed !== false) fail('runtime evidence mismatch')
if (infra.data?.realUserDataAccepted !== true || infra.data?.admissionScope !== tier1 || infra.data?.automaticBetaCopyAllowed !== false || infra.data?.manualImportRequiresOwnerDecision !== true) fail('Tier 1 infrastructure boundary mismatch')
for (const key of ['studentPersonalDataAllowed','thirdPartyPersonalDataAllowed','specialCategoryDataAllowed','credentialsOrSecretsAllowed']) if (infra.data?.[key] !== false) fail(`${key} must remain false`)
if (infra.release?.publicSignupAllowed !== false || infra.release?.multiTenantOnboardingAllowed !== false) fail('scope expansion forbidden')

if (release.result !== 'PASS' || release.activationCompleted !== true || release.realUserDataAccepted !== false) fail('historical release receipt must remain immutable')
if (admission.gate !== 'P7-REAL-DATA-ADMISSION' || admission.decision !== 'AUTHORIZED' || admission.authorizedTier !== tier1) fail('Tier 1 admission receipt mismatch')
if (admission.allowed?.ownerProfessionalContent !== true || admission.manualImportRequiresExplicitOwnerAction !== true) fail('Tier 1 positive allowance mismatch')
for (const key of ['studentPersonalData','thirdPartyPersonalData','specialCategoryData','credentialsOrSecrets','automaticBetaMigration']) if (admission.allowed?.[key] !== false) fail(`admission.allowed.${key} must remain false`)
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')

const watches = new Map((review.watches ?? []).map((x) => [x.id,x]))
for (const id of ['LOAD_SCALE_ISOLATED','LEAKED_PASSWORD_PROTECTION','LONGITUDINAL_USE','RETENTION_ACCOUNT_DELETION']) if (watches.get(id)?.classification !== 'WATCH') fail(`${id} must remain WATCH`)
console.log(`Production readiness PASS: decision=${review.productionActivationDecision}, admission=${review.realUserDataAdmissionScope}`)
