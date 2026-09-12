# Curriculum-to-Practice Contracts v1

Status: C2P-00 SPECIFICATION FREEZE CANDIDATE
Spec ID: `CML-DOS-C2P-CONTRACTS-V1`
Date: 2026-09-09

This document is subordinate to `INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md` and `CURRICULUM_TO_PRACTICE_OPERATING_MODEL_V1.md`.

## 1. Shared contract principles

All cross-system contracts must provide:

- stable contract name and schema version;
- producer and consumer ownership;
- immutable source identity;
- authority/applicability state where relevant;
- provenance/fingerprint sufficient to detect meaningful change;
- explicit timestamps/version identity where relevant;
- fail-closed validation for incoherent or incomplete bindings;
- no silent canonical writes across products;
- no pupil-level data in Arena-bound contracts.

A contract payload is not itself an institutional decision unless the contract explicitly carries a governed decision receipt issued by the proper Arena authority boundary.

---

## C1 — CurriculumReleaseContract

**Owner/producer:** Arena  
**Consumer:** Docente OS  
**Purpose:** deliver a versioned curricular baseline/context for teacher intake and revalidation.

### Required semantic fields

- `contractVersion`
- `curriculumId`
- `curriculumVersionRef`
- `authorityState`
- `authorityReceiptRef` when applicable
- `structuralFingerprint`
- `applicabilityContext`
- `source/provenanceRefs`
- `segments/nodes/outcomes/criteria` required by downstream planning
- `issuedAt`

### Invariants

- Same `curriculumVersionRef` does not imply unchanged authority/structure.
- Docente OS must evaluate the structural/authority footprint.
- Release intake never mutates teacher-authored work silently.
- A provisional release remains provisional downstream.

### Forbidden

- teacher/classroom execution data;
- pupil identity or assessment data;
- automatic shared-database mutation.

---

## C2 — AnnualPlanBindingContract

**Owner:** Docente OS  
**Source authority:** C1 curriculum release from Arena  
**Purpose:** bind a teacher annual plan to a specific curricular release while keeping teacher planning professional and editable.

### Required semantic fields

- `annualPlanId`
- `academicYear`
- `discipline`
- `grade/context`
- `curriculumReleaseRef`
- `curriculumVersionRef`
- `curriculumFingerprint`
- `boundOutcomeRefs[]`
- `planBlocks[]`
- `bindingStatus`
- `teacherValidationState`

### Invariants

- Annual plan does not recreate institutional curriculum authority.
- Completed historical blocks retain their original binding.
- Future blocks may require revalidation after a meaningful release change.
- Section execution is separate from the common annual plan.

---

## C3 — UdaInstanceContract

**Owner:** Docente OS  
**Purpose:** define a teacher-authored UDA instance derived from the annual plan and curriculum bindings without copying canonical meaning unnecessarily.

### Required semantic fields

- `udaInstanceId`
- `annualPlanId`
- `curriculumReleaseRef`
- `curriculumOutcomeRefs[]`
- `criterionRefs[]`
- `problemOrBrief`
- `plannedEvidence[]`
- `phases[]`
- `timing`
- `resourcesRefs[]`
- `adaptationPolicy`
- `status`

### Invariants

- Curriculum outcome/criterion semantics remain referenced, not independently re-authored as a second authority.
- Section adaptation is a delta, not an automatic duplicate of the common UDA.
- Teacher-authored situation, phases, timings and materials remain teacher professional work.

---

## C4 — ExecutionEvidenceFeedbackContract

**Owner:** Docente OS  
**Purpose:** govern real section execution, evidence, feedback, response and assessment lineage.

### Core lineage

`UdaInstance -> ActivityPhase -> SectionExecution -> Evidence -> Feedback -> StudentResponse -> RevisedEvidence -> AssessmentObservation`

### Required semantic properties

Each execution object must retain references sufficient to resolve:

- section/context;
- plan block/UDA/phase;
- curriculum-bound criterion(s) when applicable;
- time/status of execution;
- evidence identity;
- feedback next action;
- revision linkage when present.

### Invariants

- Feedback is linked to evidence/criteria.
- Group product does not automatically prove individual attainment.
- Completed execution cannot be rewritten by later curriculum releases.
- Raw pupil-level data never crosses automatically into Arena.

---

## C5 — ProfessionalCurriculumObservationContract

**Owner/producer:** Docente OS teacher professional domain  
**Consumer:** Arena review intake boundary  
**Purpose:** return curriculum-relevant professional signals without returning raw classroom records.

### Allowed semantic fields

- `observationId`
- `curriculumReleaseRef`
- `discipline`
- `grade/applicabilityContext`
- `outcome/segmentRefs[]`
- `coverageState`
- `recurringPrerequisiteIssue`
- `timeAdequacy`
- `evidenceQualitySummary`
- `recurringImplementationDifficulty`
- `professionalNote`
- `proposedAdjustment`
- `teacherSubmissionState`
- `submittedAt`

### Forbidden fields/data

- pupil names/identifiers;
- pupil-level feedback text;
- pupil assessment history;
- attendance/personally identifying classroom records;
- automatic claim of team consensus or institutional authority.

### Invariants

- Observation != proposal unless explicitly promoted through an Arena-governed gesture.
- Observation != TeamProfessionalOutcome.
- Observation != VerticalReviewOutcome.
- Observation != InstitutionalDecision.

---

## C6 — CurriculumVersionMigrationContract

**Owners:** Arena release authority + Docente OS teacher revalidation boundary  
**Purpose:** govern transition from one curriculum footprint/authority state to another without rewriting the past.

### Required inputs

- previous `CurriculumReleaseContract` footprint;
- incoming `CurriculumReleaseContract` footprint;
- affected Docente OS bindings;
- execution state of affected plan blocks/UDA;
- teacher revalidation requirement.

### Required outputs

For each affected binding, one explicit disposition:

- `UNCHANGED_COMPATIBLE`
- `FUTURE_REVALIDATION_REQUIRED`
- `FUTURE_REBIND_REQUIRED`
- `HISTORICAL_PRESERVE`
- `MANUAL_REVIEW_REQUIRED`

### Invariants

- Completed/historical work is preserved.
- Same-version authority transition is detected through footprint, not version ref alone.
- Teacher-reviewed authored work carries forward when compatible.
- No silent migration.

---

## 2. Cross-contract lineage

`C1 CurriculumRelease`  
`-> C2 AnnualPlanBinding`  
`-> C3 UdaInstance`  
`-> C4 Execution/Evidence/Feedback`  
`-> C5 ProfessionalCurriculumObservation`  
`-> Arena governed review`  
`-> future C1 release`  
`-> C6 migration/revalidation`

## 3. Contract validation rule

Every implementation tranche must add machine-verifiable contract tests and negative tests for the invariants it activates. Passing TypeScript/build alone is insufficient for contract acceptance.

## 4. C2P-00 freeze rule

These are specification contracts only. Their presence does not authorize runtime schemas, migrations, APIs, UI or cross-system writes until the execution plan explicitly permits the relevant tranche.
