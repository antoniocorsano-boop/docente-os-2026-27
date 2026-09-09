# Curriculum-to-Practice Contract Shape Audit v1

Status: C2P-01 CONTRACT AUDIT CANDIDATE
Audit ID: `CML-DOS-C2P-CONTRACT-AUDIT-V1`
Date: 2026-09-09
Scope: CurManLight Arena + Docente OS

## 1. Purpose

This audit measures the real delta between the frozen Curriculum-to-Practice contracts C1-C6 and the capabilities already present in CurManLight Arena and Docente OS.

It is a design/audit artifact only. It does not authorize runtime, schema, API, database, UI, deployment, authority or migration changes.

## 2. Governing precedence

This audit is subordinate to:

1. `docs/architecture/INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md`;
2. `docs/architecture/CURRICULUM_TO_PRACTICE_OPERATING_MODEL_V1.md`;
3. `docs/architecture/CURRICULUM_TO_PRACTICE_CONTRACTS_V1.md`;
4. `docs/architecture/CURRICULUM_TO_PRACTICE_EXECUTION_PLAN_V1.md`;
5. `docs/architecture/CURRICULUM_TO_PRACTICE_ACCEPTANCE_V1.md`.

The product-ownership and authority boundaries remain unchanged.

## 3. Audit provenance

Specification branch roots:

- Arena C2P-00 head: `4dd6b2945cce9948febcbb10d5049c0837243469`;
- Docente OS C2P-00 head: `c8d34971bc73f1bed963eddbda8ca398cbefe967`.

Runtime/domain inspection baselines:

- Arena: `main@fee8978cee413410314af4889a77d8054e48cb91`;
- Docente OS: `develop@1a15198138781ea47a83dee590745fbec301531a`.

No runtime file is modified by C2P-01.

## 4. Classification vocabulary

- `EXISTS_REUSE` — coherent owned capability already exists and should be reused substantially as-is.
- `EXISTS_EXTEND` — coherent owned capability exists but needs a bounded extension to satisfy the frozen contract.
- `MISSING_REQUIRED` — a required semantic capability was not found as a first-class owned domain capability and must be designed before implementation.
- `DUPLICATE_REMOVE_OR_AVOID` — creating a new parallel capability would duplicate or blur an existing source of truth.
- `FORBIDDEN_BY_GOVERNANCE` — the proposed behavior would violate ownership, authority, privacy, historical integrity or the governed execution order.

`MISSING_REQUIRED` does not itself authorize implementation.

## 5. Executive result

| Contract | Overall audit verdict | Main implication |
|---|---|---|
| C1 — CurriculumReleaseContract | `EXISTS_REUSE` + `EXISTS_EXTEND` | Evolve the existing CML handoff v2; do not create a second release channel. |
| C2 — AnnualPlanBindingContract | `EXISTS_REUSE` + bounded `MISSING_REQUIRED` | Reuse the Annual Plan engine and accepted curriculum context; add only explicit block-level curriculum bindings when authorized. |
| C3 — UdaInstanceContract | `EXISTS_REUSE` + `MISSING_REQUIRED` | Reuse UDA/authored-document/Progetta infrastructure; add a stable curriculum-binding layer, not another UDA archive. |
| C4 — ExecutionEvidenceFeedbackContract | `EXISTS_REUSE` + major `MISSING_REQUIRED` | Reuse TeachingSession as execution root; learner evidence/feedback/revision lineage is the largest real domain gap. |
| C5 — ProfessionalCurriculumObservationContract | `EXISTS_REUSE` + `EXISTS_EXTEND` | Evolve the existing curriculum-feedback channel and privacy boundary; do not create a parallel observation transport. |
| C6 — CurriculumVersionMigrationContract | `EXISTS_REUSE` + bounded `MISSING_REQUIRED` | Extend existing revalidation with an explicit impact/disposition manifest; do not create a second migration engine. |

The principal architectural finding is therefore **reuse-first**: C1, C2, C5 and most of C6 already have strong foundations. The largest genuinely missing domain is C4, followed by explicit stable bindings for C2/C3 and an explicit C6 impact manifest.

---

## 6. C1 — CurriculumReleaseContract

### Existing capabilities

#### Arena producer side

The current Arena interoperability domain already models a versioned curriculum context and handoff with:

- `curriculumRef` and `curriculumVersionRef`;
- `APPROVED` vs `PROVISIONAL_COMPLETE` authority state;
- approval process/decision references;
- applicability and transition context;
- canonical requirements bound to curriculum nodes and sources;
- a professional/non-personal privacy boundary;
- a structural footprint;
- an annual-planning framework payload;
- explicit `PREVIEW_ONLY`/acceptance semantics.

Classification: `EXISTS_REUSE`.

#### Docente OS receiver side

Docente OS already validates the same v2 handoff shape, structural footprint, curriculum authority, scope and professional/non-personal boundary. Existing revalidation logic distinguishes new handoff, already-known handoff and meaningful updates, including same-version structural/authority changes.

Classification: `EXISTS_REUSE`.

### Required delta

The frozen C1 vocabulary should be mapped onto the existing v2 contract instead of creating a parallel release object. Where useful, the current handoff can be extended/profiled to expose stable references needed by C2/C3 more directly.

Classification: `EXISTS_EXTEND`.

### Avoid

- a second `CurriculumRelease` store/service that competes with `CML_LOCAL_HANDOFF_V2`;
- document-based synchronization as the canonical handoff;
- automatic writes into Docente OS without teacher acceptance/revalidation.

Classifications: `DUPLICATE_REMOVE_OR_AVOID`, `FORBIDDEN_BY_GOVERNANCE`.

### C1 design decision

Treat `CurriculumReleaseContract` as the **C2P semantic profile/evolution of the existing handoff v2**, not as a mandate to rename or replace working domain contracts.

---

## 7. C2 — AnnualPlanBindingContract

### Existing capabilities

Docente OS already owns:

- an Annual Plan execution definition and ordered block sequence;
- block/UDA/pack identity and planned duration;
- section progress separate from the common plan;
- teaching-session allocation back to canonical blocks;
- persisted accepted curriculum context containing version, authority, footprint, requirements, coverage and teacher acceptance;
- validation that curriculum year/grade/section scope matches the Annual Plan context.

Classification: `EXISTS_REUSE`.

### Required delta

The inspected Annual Plan block model is primarily bound to canonical execution identity (`blockId`, `udaId`, `packId`, area, knowledge references). The curriculum intake persists requirement/node coverage at the plan context level, but the audit did not find a first-class, explicit per-block binding carrying the stable C2P curriculum outcome/criterion references required by C2.

Required design capability:

`PlanBlockCurriculumBinding`

Conceptual fields:

- block id;
- accepted curriculum context/release identity;
- stable curriculum node/outcome refs;
- stable criterion refs where applicable;
- provenance to the accepted handoff footprint.

Classification: `MISSING_REQUIRED` for the explicit block-level binding, while the surrounding Annual Plan engine remains `EXISTS_REUSE`.

### Avoid

- a new Annual Plan engine;
- copying curriculum requirement text into every block as an independently editable source;
- section execution mutating the common canonical sequence.

Classifications: `DUPLICATE_REMOVE_OR_AVOID`, `FORBIDDEN_BY_GOVERNANCE`.

### C2 design decision

Extend the current Annual Plan with a **thin binding layer**. Do not rebuild `CAN-PRG -> CAN-UDA -> CAN-PACK -> CAN-PLAN -> section execution`.

---

## 8. C3 — UdaInstanceContract

### Existing capabilities

Docente OS already provides:

- UDA authored documents with version history;
- UDA/resource identification inside `Progetta`;
- block -> UDA -> phase -> pack/resource projections;
- Knowledge references and source identity;
- focused planning from a canonical Annual Plan block;
- the governed distinction between common grade nucleus and section-specific adaptation.

Classification: `EXISTS_REUSE`.

### Required delta

The inspected `AuthoredDocument` identity carries document/source/version information but not a stable first-class binding to:

- accepted curriculum context/release;
- curriculum outcome/node refs;
- criterion refs;
- Annual Plan binding identity.

A C3 binding is therefore required, but it should be an extension/projection around the existing UDA document/planning identity rather than a second UDA repository.

Required design capability:

`UdaCurriculumBinding`

Conceptual fields:

- UDA document/instance id;
- Annual Plan id/block refs;
- accepted curriculum context/release identity;
- stable outcome/node refs;
- stable criterion refs;
- optional adaptation references that store only section-specific delta.

Classification: `MISSING_REQUIRED` for the binding, `EXISTS_REUSE` for the UDA authoring/planning system.

### Avoid

- a parallel UDA archive solely to satisfy C2P naming;
- copying a common UDA for every section;
- independently editable curriculum semantics inside UDA documents.

Classifications: `DUPLICATE_REMOVE_OR_AVOID`, `FORBIDDEN_BY_GOVERNANCE`.

### C3 design decision

`UdaInstanceContract` is a **binding contract over existing UDA professional work**, not a replacement document model.

---

## 9. C4 — ExecutionEvidenceFeedbackContract

### Existing capabilities

Docente OS already has a strong execution root:

- `TeachingSessionRecord` for the actual lesson/session;
- section and discipline context;
- planned/actual time;
- canonical plan allocation with block and generation identity;
- supersession/history semantics;
- human-only completion decision;
- lesson-design extensions including `FORMATIVE_CHECK` for preparation/sequence design.

Classification: `EXISTS_REUSE` for execution/session lineage and lesson-design checkpoints.

### Semantic boundary

The lesson-design extension/check mechanism is **not** the learner evidence-feedback domain required by C4. Likewise, curriculum feedback to Arena is a professional review channel and must not be repurposed as learner feedback.

Reusing those concepts as if they were learner evidence would collapse distinct meanings.

Classification: `DUPLICATE_REMOVE_OR_AVOID` for semantic conflation.

### Required delta

The inspected Docente OS domain does not expose a first-class lineage equivalent to:

`TeachingSession/SectionExecution -> Evidence -> Feedback -> NextAction -> StudentResponse -> RevisedEvidence -> AssessmentObservation`.

The following design capabilities are therefore genuinely missing:

1. `EvidenceRecord`
   - bound to teaching session/execution, UDA and criteria;
   - explicit evidence scope (individual/group/other governed scope);
   - immutable or versioned provenance.
2. `FeedbackRecord`
   - bound to evidence and criterion;
   - actionable next step;
   - teacher ownership and timestamp.
3. `StudentResponse` / revision link
   - records that feedback was used or addressed without deleting prior evidence.
4. `RevisedEvidenceLink`
   - preserves original -> feedback -> revision lineage.
5. `AssessmentObservation`
   - teacher professional observation based on appropriate evidence;
   - does not convert group evidence automatically into individual attainment.

Classification: `MISSING_REQUIRED`.

### Ownership and privacy

All pupil-level execution, evidence, feedback, response and assessment data remain **Docente OS only**.

Exporting pupil identity, pupil feedback text, grades, attendance or raw classroom events into Arena is `FORBIDDEN_BY_GOVERNANCE`.

### C4 design decision

C4 is the **largest real missing domain**, but its root must be the existing `TeachingSession`/canonical block allocation. Do not create a second classroom-execution registry.

---

## 10. C5 — ProfessionalCurriculumObservationContract

### Existing capabilities

Docente OS already has `CurriculumFeedbackDraft/EnvelopeV1` with:

- accepted curriculum baseline/version/footprint;
- aligned curriculum node refs;
- professional evidence refs;
- sequencing/prerequisite/scope/wording/feasibility categories;
- teacher confirmation;
- professional/non-personal privacy class;
- explicit exclusion of student identifiers, grades, attendance, private notes and raw classroom events;
- idempotent envelope identity.

Arena already has governed intake/revision tests that keep Docente feedback inside the review/proposal boundary rather than treating it as institutional authority.

Classification: `EXISTS_REUSE`.

### Required delta

The frozen C5 model can be represented by a controlled evolution of the existing curriculum-feedback contract, adding only fields demonstrated useful by teacher review, for example:

- coverage status;
- recurring difficulty signal;
- prerequisite issue signal;
- time adequacy;
- evidence quality;
- proposed adjustment;
- outcome/node refs where not already sufficient.

Classification: `EXISTS_EXTEND`.

### Avoid

Creating a second transport named `ProfessionalCurriculumObservation` while keeping the current curriculum-feedback channel would duplicate the same boundary.

Classification: `DUPLICATE_REMOVE_OR_AVOID`.

Automatic transition from professional feedback/observation to team consensus, vertical review or institutional decision is `FORBIDDEN_BY_GOVERNANCE`.

### C5 design decision

Treat `ProfessionalCurriculumObservationContract` as the **C2P semantic evolution/profile of the existing curriculum-feedback interoperability contract**.

---

## 11. C6 — CurriculumVersionMigrationContract

### Existing capabilities

Docente OS revalidation already provides:

- structural-footprint comparison;
- same-version meaningful-change detection;
- new/known/update classification;
- preservation of the teacher-reviewed framework;
- carrying forward unchanged requirement coverage;
- blocking newly introduced mandatory requirements until teacher alignment;
- explicit teacher revalidation decision;
- rejection of incorrectly bound decisions;
- section/context matching.

Existing tests demonstrate that an approved update can add a mandatory requirement without overwriting the previous teacher plan and that persistence is blocked until the teacher has aligned the reviewed framework.

Classification: `EXISTS_REUSE`.

### Required delta

C6 asks for a more explicit future-impact decision than the current revalidation result exposes. The audit did not find a first-class manifest that classifies every affected future plan/UDA/block using the frozen dispositions:

- `UNCHANGED_COMPATIBLE`;
- `FUTURE_REVALIDATION_REQUIRED`;
- `FUTURE_REBIND_REQUIRED`;
- `HISTORICAL_PRESERVE`;
- `MANUAL_REVIEW_REQUIRED`.

Required design capability:

`CurriculumMigrationImpactManifest`

Conceptual fields:

- previous/incoming accepted curriculum context and footprint;
- affected target type/id (`ANNUAL_PLAN`, `BLOCK`, `UDA`);
- disposition;
- reasons / changed requirement refs;
- historical/future scope;
- teacher decision status where required.

Classification: `MISSING_REQUIRED` for the explicit impact manifest; existing revalidation engine is `EXISTS_REUSE`/`EXISTS_EXTEND`.

### Avoid

- a second migration engine parallel to current revalidation;
- rewriting completed historical sessions/UDA/evidence to the new release;
- silently rebinding future teacher work.

Classifications: `DUPLICATE_REMOVE_OR_AVOID`, `FORBIDDEN_BY_GOVERNANCE`.

### C6 design decision

Extend current revalidation to **emit/consume an explicit impact manifest**; preserve the existing comparison and teacher-acceptance logic.

---

## 12. Cross-contract domain map after audit

The minimum coherent future model is:

```text
Arena existing CML handoff v2
        │ C1 profile/evolution
        ▼
Docente accepted curriculum context
        │
        ├── C2 thin PlanBlockCurriculumBinding
        │       │
        │       └── C3 UdaCurriculumBinding
        │                │
        │                ▼
        │          existing TeachingSession
        │                │
        │                └── C4 Evidence/Feedback/Revision lineage
        │
        ├── existing revalidation engine
        │       └── C6 MigrationImpactManifest
        │
        └── teacher review
                └── existing CurriculumFeedback contract, extended as C5
                         │
                         ▼
                      Arena governed review intake
```

This map deliberately introduces **bindings and lineage**, not replacement engines.

## 13. What must not be created

The audit explicitly rejects the following implementation directions:

1. a new shared Arena/Docente OS canonical database;
2. a second curriculum source of truth inside Docente OS;
3. a second annual-plan execution engine;
4. a second UDA archive solely for C2P;
5. an automatic common-UDA clone per section;
6. a second curriculum-feedback transport parallel to the existing one;
7. a second curriculum migration/revalidation engine;
8. export of pupil-level evidence/feedback/assessment into Arena;
9. direct promotion from teacher observation to institutional authority;
10. retrospective rewriting of executed historical work.

## 14. Minimum new domain surface indicated by the audit

Subject to later explicit implementation authorization, only these new semantic surfaces are currently justified:

- C2: thin block-level curriculum binding;
- C3: stable UDA curriculum binding;
- C4: learner evidence-feedback-revision-assessment lineage rooted in TeachingSession;
- C6: explicit migration impact manifest.

C1 and C5 should primarily evolve existing interoperability contracts.

This is a design conclusion, not runtime authorization.

## 15. Recommended next design slice

The next C2P design activity should be a **pure schema/type proposal** for only the four justified surfaces above, with no implementation:

1. `PlanBlockCurriculumBinding`;
2. `UdaCurriculumBinding`;
3. C4 evidence/feedback lineage types;
4. `CurriculumMigrationImpactManifest`.

Before any runtime coding, the proposal must map each type onto the existing stores/services and prove that no additional source of truth is introduced.

C1 and C5 should be represented in that proposal as extensions/profiles of existing contracts, not new parallel domains.

## 16. Gate assessment

C2P-01 audit criteria:

- all C1-C6 classified: **PASS**;
- reuse vs missing delta identified: **PASS**;
- ownership boundary preserved: **PASS**;
- privacy boundary preserved: **PASS**;
- historical integrity preserved: **PASS**;
- no runtime/schema/API/UI/database change: **PASS**;
- no governed-memory semantic change: **PASS**;
- audit suitable for mirrored persistence in both repositories: **PASS**.

Candidate gate:

`C2P_CONTRACT_AUDIT_PASS`

This gate authorizes no runtime tranche by itself.
