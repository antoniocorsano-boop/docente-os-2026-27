# Curriculum-to-Practice Golden Path Preflight v1

Status: `C2P-10 PREDEPLOY CONTRACT JOURNEY CANDIDATE`  
Acceptance ID: `CML-DOS-C2P-GOLDEN-PATH-PREFLIGHT-V1`  
Date: 2026-09-10

## 1. Purpose

This artifact records the maximum C2P-10 acceptance that can be proved **before** immutable deployed candidates and the applicable human acceptance gates exist.

It does **not** rename or weaken the canonical gate `C2P_GOLDEN_PATH_PASS`.

The canonical C2P-10 definition requires one professional journey on immutable deployed candidates and final human acceptance wherever the governed validation chain requires it. Therefore a green predeploy contract journey is necessary but not sufficient for `C2P_GOLDEN_PATH_PASS`.

## 2. Exact parent baselines

- Arena C2P-08 parent head: `53d9cbfa0f31b88ce84995a4ccf6d1d4675993c1`.
- Docente OS C2P-09 parent head: `dcea97f7ee44250bb3753bb2b29ef61ecc38f0ba`.

Both parent PRs were still open/draft at preflight start. No merge, deployment or institutional promotion is implied by this artifact.

## 3. Golden Path under test

The predeploy journey is:

`Arena release -> Docente OS intake -> accepted teacher context -> Annual Plan binding -> UDA binding/authoring context -> TeachingSession execution -> classroom evidence -> formative feedback -> learner revision -> assessment observation -> teacher curriculum review -> professional curriculum observation -> Arena professional observation intake -> curriculum version transition analysis`.

### Docente OS path

The Docente OS preflight test composes the activated contracts directly:

1. valid Arena-shaped `CML_LOCAL_HANDOFF_V2` arrives as preview-only intake;
2. a separate, explicit teacher-acceptance baseline is represented as the human checkpoint fixture;
3. `PlanBlockCurriculumBindingV1` binds a canonical block to the accepted curriculum context;
4. `UdaCurriculumBindingV1` binds the existing canonical UDA without creating a per-section copy;
5. `TeachingUdaExecutionContextV1` binds the existing `TeachingSession` and canonical allocation;
6. `ClassroomEvidenceV1` is created as a local educational record;
7. `FormativeFeedbackV1` points to that evidence and an actionable next step;
8. `LearnerResponseV1` links feedback to revised evidence;
9. `TeacherAssessmentObservationV1` remains teacher-judgment-only and does not auto-grade;
10. `TeachingFeedbackCycleV1` closes the evidence-feedback-revision lineage without external transport;
11. `TeacherCurriculumReviewV1` aggregates professional information without raw pupil/classroom data;
12. `ProfessionalCurriculumObservationV1` is projected through the existing C5 channel and requires teacher confirmation;
13. a V2 curriculum release triggers approved revalidation;
14. `CurriculumMigrationImpactManifestV1` preserves classroom history and classifies future Plan/UDA work without automatic mutation.

### Arena bookends

The Arena preflight verifies:

1. C1 release remains `PREVIEW_ONLY`, acceptance-required and without downstream automatic write;
2. a returning professional observation enters through the existing `DocenteFeedbackInbox` / C2P-08 profile;
3. the observation remains `REVIEW_INPUT_ONLY` with human triage required;
4. no team outcome, vertical review outcome, institutional decision or curriculum mutation is manufactured.

## 4. Acceptance matrix

| Scenario | Predeploy evidence | Current result target |
|---|---|---|
| GP-01 Release to annual plan | C1 intake + teacher context + C2 binding in one Docente OS test | machine-verifiable |
| GP-02 Focused planning | canonical block/UDA binding plus existing focused-planning regressions | machine-verifiable, UI/HVA still required |
| GP-03 Common nucleus vs section adaptation | `sectionCopyRequired=false`, `DELTA_ONLY` | machine-verifiable |
| GP-04 Evidence to feedback | C4 evidence + feedback lineage | machine-verifiable |
| GP-05 Feedback to revision | feedback -> learner response -> superseding revised evidence | machine-verifiable |
| GP-06 Teacher review to professional observation | C4 metadata -> C5 professional aggregate -> teacher-confirmed envelope | machine-verifiable |
| GP-07 Version transition | V1 history preserved; affected future C2/C3 bindings receive explicit C6 dispositions | machine-verifiable |
| Return to Arena | existing inbox + C2P-08 review-input profile | machine-verifiable |

## 5. Non-negotiable invariants proved by preflight

- Docente OS does not gain institutional curriculum authority.
- C1 remains preview-only and requires teacher acceptance.
- Annual Plan binding does not own section execution state.
- UDA common identity is reused; no automatic common-UDA clone per section exists.
- Classroom evidence is a local educational record and is not externally transportable.
- Feedback does not automatically grade or assess.
- Group evidence remains group-scoped; it is not converted automatically into individual attainment.
- C5 contains only professional aggregate/contextual evidence and excludes pupil-level/raw classroom data.
- Arena intake receives C5 only as non-authoritative review input.
- `ProfessionalObservation != TeamProfessionalOutcome != VerticalReviewOutcome != InstitutionalDecision`.
- C6 never rewrites completed historical work and never silently rebinds future work.
- No shared Arena/Docente OS canonical database is introduced.

## 6. What preflight deliberately cannot prove

The following remain outside the authority of a contract-only branch:

- immutable deployed candidate identity for the combined C2P stack;
- browser proof of the full professional journey on that deployed candidate pair;
- final teacher human acceptance of the journey;
- final institutional-reviewer human acceptance of role/authority distinctions;
- closure of Arena R2-A human visual acceptance;
- opening/closure of the governed Arena R2-B/H3 review boundary.

Automation may collect those receipts later but may not manufacture the human verdict.

## 7. Canonical C2P-10 gate state

Until all deployed/HVA conditions are satisfied:

`C2P_GOLDEN_PATH_PASS = BLOCKED_PENDING_DEPLOYED_HVA`

A successful predeploy CI run may be recorded only as:

`C2P_GOLDEN_PATH_PREDEPLOY_READY`

This is an evidence state, **not** a replacement canonical gate.

## 8. Conditions to issue the final canonical PASS

`C2P_GOLDEN_PATH_PASS` may be issued only when all of the following are bound to immutable exact heads:

1. Arena candidate containing the activated C1/C5-intake boundaries is deployed;
2. Docente OS candidate containing the activated C1-receiver/C2/C3/C4/C5/C6 chain is deployed;
3. applicable product CI is green on those same exact heads;
4. the browser professional journey is executed against those deployed candidates;
5. no pupil-level data crosses into Arena;
6. human teacher acceptance is recorded where required;
7. human institutional-review acceptance is recorded where required;
8. Arena governance still distinguishes observation, proposal, team outcome, vertical review and institutional decision;
9. completed historical execution remains bound to its original curriculum release;
10. no automatic authority/promotion occurs.

No merge or deployment is authorized by this preflight artifact.