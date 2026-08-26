# DOCENTE OS — CurManLight Arena Interoperability Execution Status v2

Status: CANONICAL EXECUTION CHECKPOINT  
Date: 2026-08-26  
Docente OS baseline: `6bbd35d924b0684d547c17a309a7f825604fea48`  
Arena baseline before Runtime Binding v2: `a29b74e71e17837a7365b299f2d5cb5ac025881e`

## 1. Product boundary

CurManLight Arena is authoritative for institutional curriculum state, applicability, revision, approval and curricular requirements.

Docente OS is authoritative for the teacher's operational state: annual plan execution, UDA adaptation/execution, planner, timetable, calendar, classes and TeachingSession.

Shared concepts cross the boundary only through explicit versioned contracts. No shared database and no automatic cross-product mutation are allowed.

## 2. Current canonical receiver capability

Docente OS currently supports the Arena local handoff v2 with:

- curriculum applicability by school year, discipline, grade and section/cohort;
- `PROVISIONAL_COMPLETE` and `APPROVED` source states;
- `APPLICABLE` and `TRANSITIONAL` applicability states;
- transition-remodulation hypothesis/approval state;
- curricular requirement sets classified by authority;
- teacher review and explicit acceptance;
- curriculum coverage evaluation;
- persistence only when coverage is `SATISFIED`;
- `PROVISIONAL_BASELINE` and `APPROVED_INSTITUTIONAL` persistence states;
- provenance, Arena fingerprint, decision binding and idempotent write receipt;
- mandatory `requiresRevalidationOnApproval` for provisional baselines;
- no mutation of `annual_plan_block_progress`.

## 3. IN2025 transition semantics

Docente OS does not choose the applicable national framework. Arena supplies the resolved class/cohort context.

For the secondary school first cycle:

- 2026/2027 grade 1 uses IN2025;
- 2026/2027 grades 2–3 remain transition cohorts under IN2012;
- 2027/2028 grades 1–2 use IN2025 and grade 3 remains a transition cohort;
- from 2028/2029 all three grades use IN2025.

Where Arena marks a context `TRANSITIONAL`, Docente OS consumes the provisional transition-remodulation hypothesis for planning and preserves the obligation to revalidate after the institutional decision.

## 4. Provisional baseline rule

A provisional Arena curriculum may be used to continue teacher planning when:

- the context is complete for planning;
- mandatory curricular requirements are explicit;
- any necessary transition hypothesis is explicit;
- provenance is retained;
- the teacher explicitly accepts the reviewed framework;
- coverage is `SATISFIED` before persistence.

The resulting persisted state is:

`PROVISIONAL_BASELINE`

and must always retain:

`requiresRevalidationOnApproval = true`

A proposal-level revision decision does not automatically mean the complete institute curriculum is approved.

## 5. Completed execution chain

The current implemented chain is:

`Arena handoff v2`
→ `Docente OS preview`
→ `teacher review/edit`
→ `teacher acceptance`
→ `curriculum coverage evaluation`
→ `AUTHORIZED_FOR_PERSISTENCE`
→ `atomic/idempotent annual-plan curriculum adoption receipt`

The persisted curriculum/framework state remains separate from B01–B33 execution progress.

## 6. Highest-priority upstream dependency

Before this checkpoint Arena's v2 sender contract was valid but caller-built. The next Arena slice binds it to the real runtime curriculum source, the IN2012/IN2025 resolver and the institutional `revisionArchive`.

Docente OS must treat that runtime-bound Arena projection as the source for future revalidation work. It must not infer requirements locally from ministerial documents when Arena already provides the institutional context.

## 7. Next execution order

### R2 — Provisional → Approved revalidation

After Arena can produce runtime-bound handoffs, Docente OS must implement the complete transition from provisional to approved baseline:

- identify `NEW`, `UPDATE_AVAILABLE`, `ALREADY_KNOWN`;
- compare previous provisional requirements with the approved set;
- classify added, removed and changed requirements;
- preserve teacher-authored plan content and execution history;
- show the effect before any write;
- require explicit teacher revalidation;
- produce a new append-only adoption receipt;
- never use last-write-wins.

### R3 — Docente OS → Arena feedback/evidence

Implement the reverse direction already present in the semantic contract:

- `CURRICULUM_FEEDBACK_SUBMITTED`;
- `CURRICULUM_ALIGNMENT_EVIDENCE_SUBMITTED`.

Only teacher-confirmed, professional non-personal evidence may leave Docente OS. Arena ingests it as review evidence, never as canonical curriculum mutation.

### R4 — UDA shared contract

Implement end-to-end:

`Arena UDA framework → Docente OS teacher UDA → coverage/alignment → optional teacher-confirmed evidence → Arena Human Review`

Docente OS owns teacher UDA versions and execution. Arena owns institutional framework constraints and curricular alignment references.

### R5 — Product surfaces

Piano annuale must visibly answer:

- which Arena curriculum baseline applies;
- whether it is provisional or approved;
- whether the class is in transition;
- which mandatory requirements are covered;
- which requirements are missing or changed;
- whether revalidation is required.

The teacher remains free to change sequence, periodization, UDA, activities and timing while the system protects minimum curricular coverage.

### R6 — Transport evaluation

Only after both directions are proven should a more transparent transport be evaluated. Shared storage, real-time sync and automatic cross-product writes remain out of scope.

## 8. Privacy boundary

Interop remains `PROFESSIONAL_NON_PERSONAL`.

No pupil identities, individual assessments, PDP/PEI data, family data or other school-personal data are admitted by this interoperability path.

The structural forbidden-key guard is a defensive contract check, not semantic anonymization or full PII detection.

## 9. Current invariants

- Arena decides what must be satisfied.
- Docente OS decides how the teacher satisfies it.
- Provisional is usable but never mislabeled approved.
- Approval requires revalidation, not overwrite.
- Curriculum state is separate from operational execution state.
- Teacher feedback can inform Arena but cannot modify its canonical curriculum automatically.
