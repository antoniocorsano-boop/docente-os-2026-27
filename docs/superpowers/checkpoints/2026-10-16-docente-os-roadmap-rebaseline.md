# Docente OS roadmap rebaseline — 2026-10-16

## Authority and baseline

This checkpoint replaces the stale coordination picture from the 7–9 October parallel-work phase. It is an execution checkpoint, not a new product authority.

- canonical product line: `develop`
- exact baseline: `297ae0defe83e094c1876971d71864a76ac6c828`
- maturity baseline: **Docente OS L4 confirmed** by DOS-M4-01; next target **L5**
- canonical vocabulary: **curricolo / curricolo di istituto**
- `DOS-A1 = RUNTIME_DEFERRED`
- no automatic merge, Production promotion, student tracking, or provider-specific runtime authority

## What is closed and must not be reopened as a general redesign

### Product usability and runtime proof

- DOS-VIEW-CONV-01: integrated; primary mobile shell, Settings, Piano annuale, Calendario, Conoscenza, Progetta and Materials presentation converged and certified.
- Orario: application-scope closure and real L4 runtime canary complete; timetable modification/activation/persistence/history already proved end-to-end.
- PWA/browser-native install residual is not a current product blocker and must not trigger a replacement custom install prompt.

### Core semantic/runtime foundations

- TRAMA-TERM-01: integrated; new ungoverned legacy English school-domain vocabulary is forbidden while exact compatibility debt remains governed.
- MATERIAL-ORCH-01: integrated architecture; one provider-neutral, teacher-first material lifecycle; no second material store or Atlas-specific current authority.
- CONTAIN-01 / CONTAIN-01B: integrated; legacy Atlas mutation contained and runtime schema provenance reconciled.
- CPRI-01: integrated; canonical annual-plan runtime identity is authoritative for current lesson-context resolution; Beta schema contract is v102.
- CV2-4 implementation and TERM-01 lifecycle remediation: integrated; DEVELOPMENT → CANDIDATE → RUNTIME separation is operational and heavy assurance is candidate-scoped.

### Documentation foundation

- DOC-04 architecture: integrated.
- DOC-TPL-01 Institutional Template Engine: integrated.
- DOC-01 generalized authored-document foundation: integrated.
- `FINAL_REPORT` foundation exists, but the complete Relazione finale professional workflow is not yet closed.

## Current product gaps

### P1 — MATERIAL-CORE-01

**Status:** READY_TO_EXECUTE.

CPRI-01 was the blocking prerequisite and is now integrated. The canonical next product increment is the already-approved plan:

`docs/superpowers/plans/2026-10-13-material-core-01-canonical-material-acceptance.md`

Target outcome:

`exact digest-bound canonical material content → typed LessonDesignExtension acceptance → LessonPreparationManifest.materialSlots`

with metadata-only `APPROVED` retained as historical/import evidence, never as the current acceptance authority.

### P2 — MATERIAL-TASK-UX-01

**Status:** HOLD_AFTER_MATERIAL_CORE.

Expose the canonical material lifecycle through a simple teacher task. No UI implementation before MATERIAL-CORE proves the authoritative read/write path.

### P3 — DOC-04 Relazione finale end-to-end

**Status:** FOUNDATION_READY / WORKFLOW_INCOMPLETE.

Complete:

`professional evidence/readiness → structured FINAL_REPORT v1 → validation → finalization → preview/export`

using the already-integrated template and authored-document foundations.

### P4 — IUI deterministic intelligent composition

**Status:** REBASE_REQUIRED / NOT_CURRENT_IMPLEMENTATION_BRANCH.

The IUI-01 design direction remains valid: closed component/action registry, deterministic fallback, no model-generated JSX/HTML/CSS, no implicit writes, no runtime GPT dependency required for maturity.

Any future implementation must start from then-current `develop`; the old #697 branch is not an integration candidate.

### P5 — L5 evidence qualification

**Status:** EVIDENCE_RECONCILIATION_REQUIRED.

L5 does not require completion of all future features. Canonical requirement remains:

- `REGRESSION_HISTORY`
- `ADOPTION_EVIDENCE`
- DOS-M5-03 Human Exact-Head qualification

TRAMA DOS-M5-01 and DOS-M5-02 must be refreshed against post-L4 evidence rather than treated as frozen 7 October snapshots.

## Open-PR disposition

The following open branches are not current integration candidates and should be removed from active WIP perception:

- #692 `Progetta — UDA → Studio Atlas material handoff` → **SUPERSEDED AS INTEGRATION LINE** by MATERIAL-ORCH-01 + CONTAIN + CPRI; preserve as historical/reference evidence only.
- #696 `IUI-01` → **DESIGN REFERENCE**, preserve the approved direction but do not integrate its stale branch as product state.
- #697 `IUI-02/03` → **SUPERSEDED IMPLEMENTATION BASELINE / REBASE REQUIRED**; do not continue blind implementation.
- #698 `COORD-01` → **SUPERSEDED BY THIS REBASELINE**; its dependency map was correct for the old parallel-work phase but is no longer current.
- #707/#708 CV2 design/plan → **IMPLEMENTED/SUPERSEDED AS ACTIVE WIP** by integrated #709/#710; preserve history, close as active PRs.

Keep separate residuals separate:

- #647 Argo G5-C proof is a separate P4/local-evidence line and is not part of the current Docente OS product sequence.
- Operational Continuity #702 may remain as a governance/documentation decision until separately integrated or retired; it does not block product work.

## Canonical execution order from this baseline

1. **ROADMAP-REBASE-2026-10-16** — integrate this checkpoint and remove stale WIP perception.
2. **MATERIAL-CORE-01** — execute from current `develop`, TDD RED → GREEN, no provider runtime.
3. **MATERIAL-TASK-UX-01** — only after MATERIAL-CORE canonical authority is proven.
4. **DOC-04 final report vertical** — complete the professional-document workflow on the integrated document foundations.
5. **IUI-02/03 rebase** — restart deterministic intelligent composition from the then-current product baseline, not the old branch.
6. **DOS-M5 reconciliation/qualification** — advance whenever the evidence contract is actually satisfied; do not wait for unrelated future features.

## Product north star

Docente OS is the professional operating environment of the teacher:

`curricolo di istituto → canonical annual plan → lesson → preparation → materials → TeachingSession/evidence → professional documentation`

Intelligent composition may prioritize and present the next professional task, but it does not become domain authority and does not introduce implicit writes.

## Exit condition for this checkpoint

This roadmap rebaseline is complete when:

1. the checkpoint is integrated from exact current `develop`;
2. stale PRs listed above are explicitly closed/superseded or reclassified so they no longer appear as parallel current product fronts;
3. MATERIAL-CORE-01 is the single next active product implementation line;
4. no runtime, schema or Beta mutation is introduced by the cleanup itself.
