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

---

## C2P-00 — Specification Freeze

**Status:** AUTHORIZED NOW — documentation only.

### Outputs

- Operating Model v1;
- Contracts C1–C6 v1;
- Execution Plan v1;
- Golden Path Acceptance v1;
- Codex/Astra Skill;
- AGENTS linkage in both repositories.

### Forbidden

- runtime changes;
- database/schema changes;
- API/handoff implementation;
- authority/state transitions;
- deployment/promotion.

### Gate

`C2P_SPEC_FREEZE_PASS`

PASS requires semantic mirror parity across Arena and Docente OS and no change to governed ownership/authority/execution order.

---

## C2P-01 — Contract Shape Audit and Pure Domain Design

**Default state:** DESIGN_ALLOWED; IMPLEMENTATION_REQUIRES_EXPLICIT_AUTHORIZATION.

### Goal

Map C1–C6 against existing domain models before creating anything new.

### Required output

A differential register:

- `EXISTS_REUSE`
- `EXISTS_EXTEND`
- `MISSING_REQUIRED`
- `DUPLICATE_REMOVE_OR_AVOID`
- `FORBIDDEN_BY_GOVERNANCE`

### Hard rule

No new runtime type/schema is introduced until the audit proves it is missing and assigns an owner.

### Gate

`C2P_CONTRACT_AUDIT_PASS`

---

## C2P-02 — Arena Curriculum Release Boundary (C1)

**Runtime authorization:** BLOCKED until the applicable Arena stabilization/interoperability gates in governed memory allow it or an explicit governance decision authorizes an isolated compatible slice.

### Goal

Expose a versioned `CurriculumReleaseContract` from Arena without changing curriculum authority semantics.

### Gate

`C2P_ARENA_RELEASE_CONTRACT_PASS`

Must prove provisional/approved distinction, fingerprinting, provenance and no downstream automatic write.

---

## C2P-03 — Docente OS Curriculum Intake/Revalidation (C1 receiver)

**Dependency:** C2P-02 contract stable + governed authorization.

### Goal

Receive/revalidate a release and establish `TeacherCurriculumContext` without copying institutional curriculum authority.

### Gate

`C2P_DOS_INTAKE_PASS`

Must include same-version authority/footprint transition tests.

---

## C2P-04 — Annual Plan Binding (C2)

**Dependency:** C2P-03.

### Goal

Extend the existing Docente OS Annual Plan so canonical blocks point to the accepted curriculum release/outcomes.

### Reuse-first constraint

Reuse existing `CAN-PRG -> CAN-UDA -> CAN-PACK -> CAN-PLAN -> section execution` logic. Do not rebuild the annual execution engine.

### Gate

`C2P_ANNUAL_PLAN_BINDING_PASS`

Must prove historical preservation and separation between common plan and section execution.

---

## C2P-05 — UDA Binding and Authoring (C3)

**Dependency:** C2P-04.

### Goal

Bind teacher UDA to curriculum outcomes/criteria while keeping teacher-authored problem, phases, timing, resources and adaptations local to Docente OS.

### Gate

`C2P_UDA_BINDING_PASS`

Must prove no automatic common-UDA copy per section.

---

## C2P-06 — Execution, Evidence and Feedback Cycle (C4)

**Dependency:** C2P-05.

### Goal

Implement or consolidate the local lineage:

`SectionExecution -> Evidence -> Feedback -> NextAction -> StudentResponse -> RevisedEvidence -> AssessmentObservation`.

### Gate

`C2P_EVIDENCE_FEEDBACK_PASS`

Must prove feedback is criterion/evidence bound and usable before task closure where pedagogically appropriate.

---

## C2P-07 — Teacher Review and Professional Observation (C5 producer)

**Dependency:** C2P-06.

### Goal

Generate a professional curriculum-relevant observation from teacher review without exporting raw pupil data.

### Gate

`C2P_PROFESSIONAL_OBSERVATION_PASS`

Negative tests must reject pupil identifiers, pupil feedback history and claims of institutional authority.

---

## C2P-08 — Arena Professional Observation Intake

**Dependency:** C2P-07 + Arena governed review boundary ready.

### Goal

Receive a professional observation as review input only.

### Gate

`C2P_ARENA_OBSERVATION_INTAKE_PASS`

Must prove:

`Observation != TeamProfessionalOutcome != VerticalReviewOutcome != InstitutionalDecision`.

---

## C2P-09 — Curriculum Version Transition (C6)

**Dependency:** C2P-02 through C2P-08 contracts stable.

### Goal

Handle an incoming curriculum authority/structure change while preserving completed execution and teacher-reviewed compatible work.

### Gate

`C2P_VERSION_HISTORY_PASS`

Required dispositions:

- `UNCHANGED_COMPATIBLE`
- `FUTURE_REVALIDATION_REQUIRED`
- `FUTURE_REBIND_REQUIRED`
- `HISTORICAL_PRESERVE`
- `MANUAL_REVIEW_REQUIRED`

---

## C2P-10 — Golden Path End-to-End Acceptance

**Dependency:** all activated contracts and applicable product/HVA gates.

### Goal

Prove one real professional journey on immutable deployed candidates:

`Arena release -> Docente OS intake -> annual plan -> UDA -> class/lesson -> evidence -> feedback -> revision -> assessment -> teacher review -> professional observation -> Arena governed intake`.

### Gate

`C2P_GOLDEN_PATH_PASS`

Automation may collect evidence. Final human acceptance remains a human decision where required by the governed validation chain.

---

## 4. Global stop conditions

Codex/Astra must stop before implementation/promotion if:

- product ownership is ambiguous;
- a higher-order stabilization gate blocks the tranche;
- the change requires a shared database or duplicated source of truth;
- the current exact head is not known;
- applicable tests/gates are not green on the same exact head;
- pupil-level data would cross into Arena;
- an observation/proposal/review would be promoted to institutional authority automatically;
- the requested change would rewrite historical executed work.

## 5. Reuse-first audit requirement

Before each implementation tranche, inspect the existing repository for reusable objects/services/routes. The default decision is `REUSE` or `EXTEND`; `CREATE_NEW` requires explicit evidence that no coherent owned capability exists.

## 6. Definition of done for any tranche

A tranche is not complete because code exists. Completion requires:

- contract semantics implemented;
- positive and negative tests;
- runtime/build validation as applicable;
- exact-head receipt;
- documented non-effects on adjacent authority/domains;
- human validation when the tranche reaches a governed human boundary.
