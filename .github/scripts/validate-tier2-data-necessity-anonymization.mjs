import fs from 'node:fs'

const matrix = JSON.parse(fs.readFileSync('ops/tier2-data-necessity-matrix.json', 'utf8'))
const admission = JSON.parse(fs.readFileSync('ops/real-data-admission-review.json', 'utf8'))

const fail = (message) => {
  console.error(`Tier 2 data necessity/anonymization invalid: ${message}`)
  process.exit(1)
}

if (matrix.schemaVersion !== 1 || matrix.gate !== 'T2D_DATA_NECESSITY_AND_ANONYMIZATION') fail('gate/schema mismatch')
if (matrix.state !== 'ANONYMIZATION_FIRST_BASELINE' || matrix.tier2AdmissionEffect !== 'NONE') fail('baseline must be non-promotive')
if (matrix.currentTier2AdmissionState !== 'NOT_ADMITTED') fail('Tier 2 must remain NOT_ADMITTED')
if (matrix.principle !== 'NO_PERSONAL_DATA_WHEN_FUNCTION_CAN_BE_DELIVERED_WITH_NON_PERSONAL_OR_ANONYMOUS_DATA') fail('necessity principle missing')

const policy = matrix.pilotPolicy ?? {}
if (JSON.stringify(policy.defaultAllowedClasses) !== JSON.stringify(['D0','D1'])) fail('pilot must allow only D0/D1 by default')
if (policy.d2State !== 'NOT_ADMITTED_PENDING_SEPARATE_FUNCTIONAL_NECESSITY_GATE') fail('D2 must remain gated')
if (policy.d3State !== 'PROHIBITED' || policy.d4State !== 'PROHIBITED' || policy.d5State !== 'PROHIBITED_SEPARATE_GATE_REQUIRED') fail('D3-D5 boundary invalid')
if (policy.persistentStudentIdentityModel !== 'NONE' || policy.studentTableAllowed !== false || policy.stableLearnerIdentifierAllowed !== false || policy.serverSideStudentIdentityMappingAllowed !== false) fail('student identity persistence must remain disabled')
if (policy.externalAiWithPersonalDataAllowed !== false) fail('external AI personal-data boundary invalid')
if (policy.freeTextMayBeAssumedAnonymous !== false || policy.uploadedDocumentsMayBeAssumedAnonymous !== false) fail('free text/uploads must never be presumed anonymous')

const aggregate = matrix.anonymousAggregateRules ?? {}
if (aggregate.minimumGroupSizeDefault !== 5 || aggregate.smallCellSuppressionRequired !== true || aggregate.singleLearnerDrilldownAllowed !== false || aggregate.stableCrossDatasetLearnerLinkageAllowed !== false || aggregate.freeTextInAggregateRecordsAllowed !== false) fail('anonymous aggregate guard incomplete')

const byFunction = new Map((matrix.functionalNecessity ?? []).map((item) => [item.function, item]))
for (const fn of ['annual_plan_and_uda_design','planner_and_teacher_tasks','timetable_and_class_space','knowledge_base_and_documents','class_progress_overview','individual_learning_support','official_grades_student_records_family_communications','PEI_PDP_DSA_BES_HEALTH_OR_DIAGNOSTIC_CONTEXT']) {
  if (!byFunction.has(fn)) fail(`missing functional necessity row ${fn}`)
}
if (byFunction.get('individual_learning_support')?.pilotDecision !== 'DEFER') fail('individual learner support must remain deferred')
if (byFunction.get('official_grades_student_records_family_communications')?.pilotDecision !== 'OUT_OF_SCOPE') fail('official student record functions must remain out of scope')
if (byFunction.get('PEI_PDP_DSA_BES_HEALTH_OR_DIAGNOSTIC_CONTEXT')?.pilotDecision !== 'PROHIBITED') fail('special-category context must remain prohibited')

const audit = matrix.currentSchemaAudit ?? {}
if (audit.studentEntityFound !== false || audit.directStudentIdentityFieldsFound !== false) fail('schema audit must not claim student identity exists')
if (!Array.isArray(audit.highestRiskSurfaces) || audit.highestRiskSurfaces.length < 10) fail('free-text/input risk inventory incomplete')

const design = matrix.designRules ?? {}
for (const key of ['anonymousByDefault','collectIdentityOnlyIfStrictlyNecessary','preferStructuredFieldsOverFreeTextForAnyFutureLearnerContext','doNotDuplicateOfficialStudentRegister','doNotStoreIdentityLookupInsideDocenteOs','doNotInferSensitiveReasonForSupportAction','doNotTreatPseudonymizationAsAnonymization','uploadAndFreeTextNeedPreventiveControlsBeforeTier2']) {
  if (design[key] !== true) fail(`design rule missing: ${key}`)
}

if (matrix.institutionalImpact?.recommendedE1Scope !== 'D0_D1_ONLY_FOR_INITIAL_SCHOOL_PILOT' || matrix.institutionalImpact?.d2RequiresE1Amendment !== true || matrix.institutionalImpact?.d3ToD5Excluded !== true || matrix.institutionalImpact?.tier2StillNotAdmitted !== true) fail('institutional impact invalid')
if (admission.higherRiskTier?.state !== 'NOT_ADMITTED') fail('canonical Tier 2 state must remain NOT_ADMITTED')

console.log('P7 T2D data necessity/anonymization PASS: D0-D1 only, no persistent student identity, D2 deferred, D3-D5 excluded, Tier 2 NOT_ADMITTED')
