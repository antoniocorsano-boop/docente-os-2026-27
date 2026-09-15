# Curriculum-to-Practice Acceptance v1

Status: C2P-00 SPECIFICATION FREEZE CANDIDATE
Acceptance ID: `CML-DOS-C2P-ACCEPTANCE-V1`
Date: 2026-09-09

## 1. Purpose

Define the single end-to-end professional journey that the integrated Arena + Docente OS system must ultimately prove without duplicating curriculum authority or teacher operational state.

## 2. Golden path

1. Arena exposes a governed curriculum release with version, authority, provenance and structural fingerprint.
2. Docente OS receives the release and requires the correct teacher intake/revalidation behavior.
3. A teacher annual plan binds to that release and its relevant curriculum outcomes.
4. A plan block opens a focused UDA/planning context.
5. The UDA references curriculum outcomes/criteria and stores teacher-authored problem, phases, resources, timing and adaptations.
6. A canonical class/section executes the planned phase without creating a duplicate common UDA.
7. The teacher records/selects meaningful evidence linked to the UDA/criteria.
8. Feedback is issued against evidence/criteria with an actionable next step.
9. The learner can respond/revise when pedagogically appropriate; revised evidence remains linked to the original lineage.
10. The teacher makes assessment observations from appropriate evidence, distinguishing group and individual evidence where needed.
11. At UDA/period review, the teacher records a professional review.
12. If a curriculum-relevant issue exists, Docente OS creates a `ProfessionalCurriculumObservation` with no pupil-level data.
13. Arena receives the observation as review input only.
14. Any later curriculum change proceeds through Arena governance and institutional authority.
15. A new release triggers C6 migration/revalidation logic in Docente OS; completed historical work remains bound to the previous release.

## 3. Positive acceptance scenarios

### GP-01 — Release to annual plan

Given a valid Arena curriculum release, when the teacher accepts/revalidates it in Docente OS, then the annual plan can bind to stable curriculum references without creating a second institutional curriculum record.

### GP-02 — Focused planning

Given a valid section, plan block and UDA binding, when the teacher chooses the next phase, then Docente OS opens the exact focused planning context and shows only pertinent resources by default.

### GP-03 — Common nucleus vs section adaptation

Given a common UDA, when a specific section needs an adaptation, then only the delta is stored; opening another section must not create another common-UDA copy.

### GP-04 — Evidence to feedback

Given evidence linked to a criterion, when the teacher gives feedback, then the feedback retains evidence/criterion lineage and identifies a next action.

### GP-05 — Feedback to revision

Given actionable feedback, when the learner revises, then the revised evidence is linked to the original evidence and feedback instead of replacing history silently.

### GP-06 — Teacher review to professional observation

Given recurring curriculum-relevant difficulty, when the teacher creates a professional observation, then the payload contains only professional aggregate/contextual information and remains a non-authoritative review input.

### GP-07 — Version transition

Given historical completed work on release V1 and a new release V2, when migration analysis runs, then completed work remains on V1 while affected future work receives an explicit C6 disposition.

## 4. Negative acceptance scenarios

The integrated system must fail closed if any of the following occurs:

- Docente OS receives a proposal and treats it as approved curriculum without governed authority.
- A same-version authority/structural change is ignored because only `curriculumVersionRef` was compared.
- Opening a section automatically clones a common UDA.
- An UDA stores independently editable canonical outcome semantics as a second authority source.
- Feedback exists with no resolvable evidence/criterion context where such context is required by the task.
- Group work alone is treated as automatic individual attainment evidence.
- Pupil identity, pupil feedback text or pupil assessment history is exported into Arena professional observation intake.
- A professional observation automatically becomes team consensus, vertical review or institutional decision.
- A later curriculum release rewrites completed historical execution.
- A document export becomes the primary cross-system synchronization mechanism.
- Arena and Docente OS share a new canonical database table to avoid a contract boundary.

## 5. Human acceptance checkpoints

Where the governed project requires human validation, automation may collect screenshots, logs, contract receipts and exact-head evidence but may not issue the final human verdict.

Minimum human checks for the eventual C2P-10 golden path:

- the teacher understands which curriculum is active and why;
- the next professional action is understandable without reconstructing module architecture;
- focused planning does not expose an unnecessary broad catalogue;
- curriculum references are visible when needed but do not force repetitive transcription;
- feedback clearly supports a next action/revision;
- teacher review can produce curriculum-relevant observations without exposing pupil-level data;
- the institutional reviewer can distinguish observation, proposal, team outcome, vertical review and decision.

## 6. Exact-head evidence rule

For any runtime acceptance:

- record exact commit SHA;
- bind automated gates to that SHA;
- bind deployed candidate identity to that SHA;
- bind human acceptance receipt to the same immutable candidate where governed memory requires it.

No previous green state can substitute for current exact-head validation.

## 7. C2P-00 acceptance

C2P-00 itself passes only if:

- the four C2P specification documents are semantically mirrored in both repositories;
- both repositories point agents to the specification;
- the Codex/Astra skill enforces read-governance/classify-owner/check-gate/minimum-delta/validate/stop;
- no runtime or database change is included;
- the shared governed memory remains unchanged.

Gate: `C2P_SPEC_FREEZE_PASS`.
