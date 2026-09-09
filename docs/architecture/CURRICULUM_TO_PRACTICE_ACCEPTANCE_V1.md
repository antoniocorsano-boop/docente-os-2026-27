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

- `GP-01 Release to annual plan`: a valid release can be accepted/revalidated and bound without creating a second institutional curriculum record.
- `GP-02 Focused planning`: valid section/block/UDA opens exact focused context with pertinent resources.
- `GP-03 Common nucleus vs section adaptation`: only the adaptation delta is stored; no automatic common-UDA copy.
- `GP-04 Evidence to feedback`: feedback retains evidence/criterion lineage and an actionable next step.
- `GP-05 Feedback to revision`: revised evidence links to original evidence/feedback instead of silently replacing history.
- `GP-06 Teacher review to professional observation`: only professional aggregate/contextual information is produced and remains non-authoritative.
- `GP-07 Version transition`: completed V1 work remains on V1 while affected future work receives an explicit C6 disposition.

## 4. Negative acceptance scenarios

Fail closed if:

- Docente OS treats a proposal as approved curriculum without governed authority;
- same-version authority/structural change is ignored because only version ref is compared;
- opening a section automatically clones a common UDA;
- an UDA stores independently editable canonical outcome semantics as a second authority source;
- feedback has no resolvable evidence/criterion context where required;
- group work alone is treated as automatic individual attainment evidence;
- pupil identity, pupil feedback or pupil assessment history is exported into Arena professional observation intake;
- a professional observation automatically becomes team consensus, vertical review or institutional decision;
- later curriculum release rewrites completed historical execution;
- document export becomes primary cross-system synchronization;
- Arena and Docente OS share a new canonical database table to avoid a contract boundary.

## 5. Human acceptance checkpoints

Where governed validation requires humans, automation may collect screenshots, logs, receipts and exact-head evidence but may not issue the final verdict.

Minimum eventual human checks:

- teacher understands active curriculum and authority context;
- next professional action is clear without reconstructing module architecture;
- focused planning avoids unnecessary broad catalogue;
- curriculum references are available without repetitive transcription;
- feedback supports a clear next action/revision;
- teacher review can produce curriculum-relevant observations without pupil-level data;
- institutional reviewer can distinguish observation, proposal, team outcome, vertical review and decision.

## 6. Exact-head evidence rule

For runtime acceptance record exact commit SHA, bind automated gates and deployed candidate identity to that SHA, and bind human acceptance to the same immutable candidate where required.

## 7. C2P-00 acceptance

C2P-00 passes only if the four C2P specification documents are semantically mirrored in both repositories; both repositories point agents to the specification; the Codex/Astra skill enforces governance/ownership/gate/minimum-delta/validation/stop; no runtime or database change is included; and governed memory remains unchanged.

Gate: `C2P_SPEC_FREEZE_PASS`.
