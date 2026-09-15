# Curriculum-to-Practice Operating Model v1

Status: C2P-00 SPECIFICATION FREEZE CANDIDATE
Spec ID: `CML-DOS-C2P-OPERATING-MODEL-V1`
Date: 2026-09-09
Scope: CurManLight Arena + Docente OS

## 1. Authority and precedence

This specification is subordinate to `docs/architecture/INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md` (`CML-DOS-INTEGRATED-GOVERNANCE-V1`). It refines the operational model without changing product ownership, authority, handoff rules or governed execution order.

If this document conflicts with governed memory, governed memory wins and implementation must stop until the conflict is classified.

## 2. Purpose

Define one integrated professional process that connects institutional curriculum governance to teacher planning, classroom execution, evidence, feedback, assessment and curriculum improvement without duplicating canonical meaning across Arena and Docente OS.

The system is one process with two responsibility domains:

- **Arena = governance of curriculum meaning and institutional authority.**
- **Docente OS = governance of teacher professional execution.**

The two products collaborate through explicit, versioned, human-governed contracts. They do not become one runtime, one shared database or one blurred authority domain.

## 3. Canonical professional chain

`Sources -> Curriculum -> Annual Plan -> UDA -> Activities -> Evidence -> Feedback -> Student Response -> Assessment -> Teacher Review -> Professional Curriculum Observation -> Arena Review -> Institutional Decision -> New Curriculum Version`

Two coupled cycles exist.

### Short teacher cycle

`Plan -> Prepare -> Teach -> Observe -> Feedback -> Student Revision -> Assess -> Adjust`

Time scale: lesson, week, UDA, teaching period.

### Long institutional cycle

`Curriculum -> Real Execution -> Professional Observations -> Department Review -> Vertical Review -> Institutional Decision -> New Version`

Time scale: term, year, curriculum revision cycle.

Docente OS primarily owns the short cycle. Arena primarily owns the long cycle.

## 4. Product ownership

### Arena owns

- national/institutional sources and applicability;
- institutional curriculum versions and authority state;
- curriculum segments, nodes, vertical links and provenance;
- curriculum review proposals;
- professional/team/vertical review boundaries;
- institutional decisions and adoption state;
- versioned curriculum releases/handoffs;
- controlled institutional exports and receipts.

Arena must not own pupil-level classroom execution, daily teacher workflow, timetable execution, lesson evidence, student feedback or teacher assessment records.

### Docente OS owns

- teacher intake/revalidation of curriculum releases;
- annual teaching plan as professional work;
- UDA authoring and execution after curricular intake;
- classes/sections, timetable and lesson context;
- operational Knowledge Base and pertinent resources;
- activity execution;
- evidence collection;
- feedback and student response;
- teacher assessment observations;
- teacher review and professional curriculum observations.

Docente OS must not mutate Arena canonical curriculum state, promote provisional curriculum to institutional authority or create a second institutional curriculum source of truth.

## 5. Three object families

### A. Canonical curriculum objects — Arena authority

Examples:

- `CurriculumVersion`
- `CurriculumSegment`
- `CurriculumNode`
- `VerticalCurriculumLink`
- `CurriculumOutcome`
- `CurriculumCriterion`
- `CurriculumRelease`

These objects are versioned, provenance-aware and institutionally governed.

### B. Professional execution objects — Docente OS authority

Examples:

- `TeacherCurriculumContext`
- `AnnualPlan`
- `PlanBlock`
- `UdaInstance`
- `ActivityPhase`
- `SectionExecution`
- `Evidence`
- `Feedback`
- `StudentResponse`
- `AssessmentObservation`
- `TeacherReview`
- `ProfessionalCurriculumObservation`

These objects record professional planning and what actually happened.

### C. Document projections — no independent authority

Examples:

- annual planning DOCX/PDF;
- UDA sheet;
- programme completed;
- final report;
- department monitoring dossier;
- coverage matrix.

Documents are projections, exports or receipts of structured state. They are not a parallel database and must not become a second canonical truth source.

## 6. Write once, reuse many times

A curriculum element is authored and versioned once in Arena. Docente OS refers to it through a stable binding; it does not create an independent semantic copy.

Example:

`CurriculumOutcome TEC-SEC1-MAT-01`

An UDA stores the identifier/reference and the curriculum release footprint. The UI may display the human-readable text, but the semantic identity remains the Arena object/version.

Teacher-authored content is stored only where teacher professional work belongs: situation-problem, phases, timing, resources, adaptations, checkpoints, evidence plans, feedback and review.

## 7. Binding invariant

Every professional object that derives from curriculum must retain an explicit, inspectable binding to the source release/version.

Minimum lineage:

`CurriculumRelease -> TeacherCurriculumContext -> AnnualPlan -> PlanBlock/UdaInstance -> ActivityPhase -> SectionExecution -> Evidence -> Feedback/Assessment -> TeacherReview`

The system must support both questions:

1. **From practice to curriculum:** Which curriculum element justifies this plan/UDA/activity/evidence?
2. **From curriculum to practice:** Where was this curriculum element actually planned, activated and observed?

## 8. Planned canon vs real execution

The planned common nucleus is not rewritten for every section.

- Annual plan/common UDA = planned professional canon for the grade/context.
- Section execution = what actually happened in a specific section.
- Section-specific adaptation = explicit delta only when needed.

Opening a class or lesson must never create a copy of the common UDA automatically.

## 9. Versioning and historical integrity

Historical execution is immutable with respect to later curriculum changes.

If curriculum version `V1` governed an UDA executed in November, that execution remains bound to `V1` even after `V2` becomes effective.

A new release may affect future professional work only through governed revalidation/migration:

- identify affected future plan/UDA bindings;
- preserve completed execution and evidence;
- preserve teacher-authored reviewed work where still compatible;
- request human revalidation when authority or structural footprint changes;
- never silently rewrite completed work.

## 10. Feedback as a first-class process object

Feedback is not a free text field detached from evidence.

Canonical local cycle:

`Evidence -> Feedback -> NextAction -> StudentResponse -> RevisedEvidence`

A meaningful feedback record must be attributable to:

- an evidence item;
- one or more relevant criteria;
- an observed strength or state;
- a priority improvement/action;
- a response/revision opportunity when appropriate.

Pupil-level feedback remains in Docente OS and is never automatically written to Arena.

## 11. Professional observation boundary

The return path from Docente OS to Arena is not raw classroom data. It is a governed, professional, curriculum-relevant signal.

`ProfessionalCurriculumObservation` may summarize, for example:

- outcome coverage;
- recurring prerequisite issue;
- time adequacy;
- evidence quality;
- recurring implementation difficulty;
- proposed curriculum adjustment.

It must exclude pupil identity, pupil-level feedback, pupil assessment history and unnecessary personal data.

The observation is not a curriculum change. Arena may route it into the governed review chain; only the appropriate institutional authority can produce an institutional decision.

## 12. Knowledge boundary

Docente OS Knowledge Base remains the canonical teacher professional knowledge pipeline. Knowledge assets may be linked to curriculum outcome, UDA, plan block, activity phase, section or teacher review without determining canonical curriculum authority.

Context reduces cognitive load: the more specific the class/block/UDA context, the fewer and more pertinent resources the UI should show.

## 13. User experience model

The user should follow professional work, not reconstruct the application architecture.

Primary human questions:

- **Oggi:** che cosa devo fare?
- **Classe:** dove siamo nel percorso?
- **Prepara:** che cosa devo predisporre?
- **Osserva:** che cosa sta emergendo?
- **Riesamina:** che cosa devo modificare?

Technical surfaces remain subordinate to these transitions.

## 14. State model guidance

Indicative UDA lifecycle:

`DRAFT -> PLANNED -> READY -> IN_PROGRESS -> EVIDENCE_COLLECTING -> FEEDBACK_ACTIVE -> REVISION_ACTIVE -> ASSESSABLE -> COMPLETED -> REVIEWED`

Indicative curriculum lifecycle remains governed by Arena contracts and institutional authority. No C2P implementation may collapse proposal, review, decision, effective and superseded states.

## 15. Non-goals

C2P does not authorize:

- a shared Arena/Docente OS database;
- a second curriculum editor in Docente OS;
- automatic copies of common UDA per section;
- document-to-document synchronization as primary integration;
- automatic write-back from teacher evidence to curriculum;
- pupil data ingestion into Arena;
- a separate feedback silo disconnected from evidence;
- silent curriculum migration;
- runtime work that bypasses the governed stabilization order.

## 16. Development filter

Every proposed feature must state which transition of the canonical chain it improves. If it cannot be mapped to a professional transition or a required governance control, it should not be added by default.

## 17. C2P-00 freeze rule

This tranche is documentation/specification only. No runtime, database, authority, deployment or institutional state change is authorized by this file.
