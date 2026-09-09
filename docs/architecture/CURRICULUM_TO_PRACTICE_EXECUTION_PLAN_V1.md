# Curriculum-to-Practice Execution Plan v1

Status: C2P-00 SPECIFICATION FREEZE CANDIDATE
Plan ID: `CML-DOS-C2P-EXECUTION-PLAN-V1`
Date: 2026-09-09

## 1. Precedence

This plan is subordinate to:

1. `INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md`;
2. `CURRICULUM_TO_PRACTICE_OPERATING_MODEL_V1.md`;
3. `CURRICULUM_TO_PRACTICE_CONTRACTS_V1.md`.

It does not authorize bypassing the current Arena/Docente OS stabilization sequence.

## 2. Live baselines at C2P-00 start

- Arena source branch for this spec: `main@fee8978cee413410314af4889a77d8054e48cb91`.
- Docente OS source branch for this spec: `develop@1a15198138781ea47a83dee590745fbec301531a`.
- Shared governed memory: `CML-DOS-INTEGRATED-GOVERNANCE-V1`.

These are provenance for the specification branch, not permission to merge or promote runtime work.

## 3. Execution rule

Codex/Astra must execute one authorized tranche at a time.

For every tranche it must:

1. read `AGENTS.md`, governed memory and all C2P documents;
2. re-check live branch/PR/gate state;
3. classify product owner and contract(s) affected;
4. state exact base/head SHA;
5. implement the minimum delta;
6. add contract/regression tests;
7. run all applicable validation;
8. record what changed and what explicitly did not change;
9. stop after the tranche gate and identify only the next tranche that can be considered.

No agent may infer authorization from this plan alone when a higher-order governed gate is still open.

## C2P-00 — Specification Freeze

**Status:** AUTHORIZED NOW — documentation only.

Outputs: Operating Model v1; Contracts C1–C6 v1; Execution Plan v1; Golden Path Acceptance v1; Codex/Astra Skill; AGENTS linkage in both repositories.

Forbidden: runtime changes; database/schema changes; API/handoff implementation; authority/state transitions; deployment/promotion.

Gate: `C2P_SPEC_FREEZE_PASS`.

## C2P-01 — Contract Shape Audit and Pure Domain Design

**Default state:** DESIGN_ALLOWED; IMPLEMENTATION_REQUIRES_EXPLICIT_AUTHORIZATION.

Goal: map C1–C6 against existing domain models before creating anything new.

Required differential register: `EXISTS_REUSE`, `EXISTS_EXTEND`, `MISSING_REQUIRED`, `DUPLICATE_REMOVE_OR_AVOID`, `FORBIDDEN_BY_GOVERNANCE`.

Hard rule: no new runtime type/schema until the audit proves it is missing and assigns an owner.

Gate: `C2P_CONTRACT_AUDIT_PASS`.

## C2P-02 — Arena Curriculum Release Boundary (C1)

Runtime authorization is blocked until applicable Arena stabilization/interoperability gates permit it or explicit governance authorizes an isolated compatible slice.

Goal: expose a versioned `CurriculumReleaseContract` without changing curriculum authority semantics.

Gate: `C2P_ARENA_RELEASE_CONTRACT_PASS`.

## C2P-03 — Docente OS Curriculum Intake/Revalidation

Dependency: C2P-02 contract stable + governed authorization.

Goal: receive/revalidate a release and establish `TeacherCurriculumContext` without copying institutional curriculum authority.

Gate: `C2P_DOS_INTAKE_PASS`.

## C2P-04 — Annual Plan Binding (C2)

Dependency: C2P-03.

Goal: extend existing Docente OS Annual Plan so canonical blocks point to accepted curriculum release/outcomes.

Reuse-first constraint: reuse existing `CAN-PRG -> CAN-UDA -> CAN-PACK -> CAN-PLAN -> section execution` logic; do not rebuild the annual execution engine.

Gate: `C2P_ANNUAL_PLAN_BINDING_PASS`.

## C2P-05 — UDA Binding and Authoring (C3)

Dependency: C2P-04.

Goal: bind teacher UDA to curriculum outcomes/criteria while keeping teacher-authored problem, phases, timing, resources and adaptations local to Docente OS.

Gate: `C2P_UDA_BINDING_PASS`.

## C2P-06 — Execution, Evidence and Feedback Cycle (C4)

Dependency: C2P-05.

Goal: implement/consolidate `SectionExecution -> Evidence -> Feedback -> NextAction -> StudentResponse -> RevisedEvidence -> AssessmentObservation`.

Gate: `C2P_EVIDENCE_FEEDBACK_PASS`.

## C2P-07 — Teacher Review and Professional Observation (C5 producer)

Dependency: C2P-06.

Goal: generate curriculum-relevant professional observation without exporting raw pupil data.

Gate: `C2P_PROFESSIONAL_OBSERVATION_PASS`.

## C2P-08 — Arena Professional Observation Intake

Dependency: C2P-07 + Arena governed review boundary ready.

Goal: receive a professional observation as review input only.

Gate: `C2P_ARENA_OBSERVATION_INTAKE_PASS`.

Must prove `Observation != TeamProfessionalOutcome != VerticalReviewOutcome != InstitutionalDecision`.

## C2P-09 — Curriculum Version Transition (C6)

Dependency: C2P-02 through C2P-08 contracts stable.

Goal: handle authority/structure change while preserving completed execution and compatible teacher-reviewed work.

Gate: `C2P_VERSION_HISTORY_PASS`.

Required dispositions: `UNCHANGED_COMPATIBLE`, `FUTURE_REVALIDATION_REQUIRED`, `FUTURE_REBIND_REQUIRED`, `HISTORICAL_PRESERVE`, `MANUAL_REVIEW_REQUIRED`.

## C2P-10 — Golden Path End-to-End Acceptance

Dependency: all activated contracts and applicable product/HVA gates.

Goal: prove one professional journey on immutable candidates: `Arena release -> Docente OS intake -> annual plan -> UDA -> class/lesson -> evidence -> feedback -> revision -> assessment -> teacher review -> professional observation -> Arena governed intake`.

Gate: `C2P_GOLDEN_PATH_PASS`.

## 4. Global stop conditions

Codex/Astra must stop before implementation/promotion if product ownership is ambiguous; a higher-order gate blocks the tranche; the change requires a shared database or duplicated source of truth; exact head is unknown; applicable gates are not green on that exact head; pupil-level data would cross into Arena; observation/review would be promoted automatically to authority; or historical executed work would be rewritten.

## 5. Reuse-first audit requirement

Before each implementation tranche, inspect existing repository capabilities. Default decision is `REUSE` or `EXTEND`; `CREATE_NEW` requires explicit evidence that no coherent owned capability exists.

## 6. Definition of done

Completion requires contract semantics, positive and negative tests, applicable runtime/build validation, exact-head receipt, documented non-effects on adjacent domains and human validation where required.
