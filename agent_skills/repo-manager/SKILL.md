---
name: repo-manager
description: >-
  Repository manager for DOCENTE OS. Governs architecture-aware changes on the
  system repository and turns repeated Human Task Content tranche work into a
  compile-review-promote workflow instead of continuing manual per-block coding.
license: Apache-2.0
metadata:
  version: "1.0.0"
  scope: "DOCENTE OS repository"
---

# Repo Manager — DOCENTE OS

## Purpose

Manage the **DOCENTE OS system repository** as one governed product, preserving canonical ownership, branch discipline, Human Task contracts, CI gates, and deployment continuity.

The skill exists to prevent two failure modes:

1. repository changes that ignore the product's existing architecture;
2. repeated manual implementation of patterns that are already mature enough to become a deterministic compiler or manifest pipeline.

Core rule:

> **Automate repository mechanics; expose semantic decisions; fail closed on ambiguity.**

For repeated Human Task Content work:

> **Once a source relationship has a stable recipe, adding the next tranche should be a compile/review operation, not another bespoke programming exercise.**

---

## 1. Repository scope

This skill applies only to:

`antoniocorsano-boop/docente-os-2026-27`

Default integration target:

`develop`

Do not silently redirect work to older teacher-app repositories, experiments, or unrelated projects.

Do not write directly to `main` for normal feature work. Use a feature branch from the verified current `develop` HEAD, open a PR into `develop`, run the real project gates, then promote according to the repository's release process.

---

## 2. Read-first governance

Before significant changes, inspect the current versions of these files when present:

1. `PROJECT_HEALTH.md`
2. `agent_skills/project-health/SKILL.md`
3. `docs/architecture/HUMAN_TASK_MODEL.md`
4. `docs/architecture/HUMAN_TASK_CONTENT_ENGINE.md`
5. `docs/architecture/HUMAN_TASK_CONTENT_PIPELINE.md`
6. relevant research/evidence documents referenced by those contracts
7. affected runtime/domain/test files

Never use a remembered historical copy as authority when the current branch can be read.

`project-health` remains the shipping/operational gate. This skill does not override it.

If project-health evidence and repository state disagree, re-evaluate from current commits, CI and deploy evidence instead of copying stale status text.

---

## 3. Repository inspection before mutation

Before writing code or documents:

- verify repository and branch;
- record current `develop` HEAD;
- inspect the exact files that currently own the behavior;
- identify canonical source, derived artifacts and runtime consumers;
- inspect current tests and CI expectations;
- inspect deployment implications when runtime changes;
- identify whether the requested work is a new pattern or repetition of a known one.

For substantial work, maintain this mental model:

`canonical source -> domain/contract -> derived artifact -> runtime -> persistence -> CI -> deploy`

Classify impacted boundaries as:

- `UNCHANGED`
- `READ_ONLY_DEPENDENCY`
- `MODIFIED`
- `MIGRATION_REQUIRED`
- `REVIEW_REQUIRED`
- `OUT_OF_SCOPE`

Do not add a database migration merely because it simplifies implementation. First prove the existing Knowledge/runtime model cannot support the requirement safely.

---

## 4. Architecture preservation rules

Hard constraints:

- `Piano annuale` owns annual sequence/execution structure.
- `Progetta` owns planning, not class existence.
- `Classi` owns canonical class workspace/section projection.
- `Orario` is the weekly guidance map, not a calendar replacement.
- `Conoscenza` is the source/material base and never defines canonical class existence.
- manual timetable class presence never creates or resolves a canonical class.
- Human Task projections are derived operational views, not a second canonical teaching archive.
- technical identifiers remain provenance/diagnostics, not primary teacher UI.
- task context must survive cross-domain navigation when a specific class/block/UDA/material is already known.
- contextual support does not hide task-essential information.
- feedback remains end-of-task and separate from didactic data.
- source-granularity mismatch must not be normalized by invention.

Never weaken RLS, validation, source-generation checks, internal-return-path validation, or fail-closed behavior to make a repository workflow easier.

---

# 5. Detect when manual work must become a compiler

Enter **compiler mode** when several of these are true:

- a new tranche repeats the same structure as previous tranches;
- new files mainly differ by block IDs, titles, selected source sections or recipe choice;
- tests mostly restate general invariants for another block range;
- source discovery and provenance rules are already stable;
- Human Task rendering is already generic;
- human effort is primarily selecting among known source-alignment patterns;
- additional `human-task-approved-projections-bNN-bMM.ts` files are accumulating.

When compiler mode applies, do not default to creating another hand-authored tranche file.

Prefer:

`discover -> extract -> classify -> candidate -> draft -> review -> approved manifest -> generic loader/runtime`

A transitional generated TypeScript artifact is acceptable only when required by the current runtime and must remain mechanically generated from an approved artifact, not become a new place for bespoke lesson logic.

---

# 6. Human Task Content Compiler mode

Activation examples:

- "compila la prossima tranche"
- "continua con le prossime UDA"
- "porta avanti il piano senza farlo blocco per blocco"
- "automatizziamo le proiezioni Human Task"
- "usa il Repo Manager"

Canonical product contracts:

- `docs/architecture/HUMAN_TASK_CONTENT_ENGINE.md`
- `docs/architecture/HUMAN_TASK_CONTENT_PIPELINE.md`

The skill orchestrates those contracts; it does not replace them.

Target chain:

**Piano annuale canonico → sorgenti KB correnti → estrazione strutturata → classificazione recipe → Candidate → Draft → Human Review → Approved Manifest → runtime generico**

Runtime must continue reading already-approved lightweight projections in the high-frequency path. Never execute semantic compilation during normal `Orario → Classe → Lezione` rendering.

---

## 7. Discovery of the next tranche

When no explicit range is supplied:

1. read `product/src/app/piano-annuale/model.ts` for canonical block order and structural binding;
2. inspect the approved Human Task registry/current approved projections;
3. identify the first uncovered canonical block;
4. extend to the smallest coherent semantic boundary, normally one complete UDA/segment;
5. resolve all current UDA/PACK sources needed by that segment;
6. report missing, ambiguous or non-current source bindings before generating content.

Do not skip an uncovered block silently.

Do not assume the next block from a previous conversation; calculate it from current repository state.

---

## 8. Source authority and provenance

For Human Task compilation, preserve the source authority already defined by the pipeline contract.

### Structural authority

`product/src/app/piano-annuale/model.ts` owns:

- block order;
- Bxx identity;
- UDA assignment;
- PACK binding;
- period;
- block duration.

### Didactic/operational source

Use only the current indexed Knowledge generation accepted by the existing source repository/pipeline.

Do not bypass source discovery with an old Drive copy, remembered text, a previous generation, or a convenient hard-coded excerpt.

A source can have different roles:

- structurally bound;
- semantically contributing;
- operationally contributing;
- displayed to the teacher.

These are not equivalent.

> **Bound source != contributing source != displayed source.**

A PACK may remain structurally bound while contributing no operational content to a particular lesson. Do not create false provenance merely to make every source appear used.

---

## 9. Extraction contract

Reuse the current Human Task Content Pipeline before adding new extraction infrastructure.

Structured evidence may include:

- UDA title, duration and `Ora N` sections;
- teacher guides;
- student sheets;
- observation tools;
- task briefs;
- rubrics;
- checklists;
- adaptation guidance;
- assessment format;
- explicit materials and procedures;
- source locators/generation IDs.

Extraction must be deterministic where the source structure permits it.

Do not turn `normalized_text` into the teacher-facing interface.

Do not use an LLM guess as canonical extraction. A model may propose editorial synthesis only after structured evidence exists and with provenance preserved.

---

# 10. Recipe classifier

The compiler may select only an already-designed recipe family.

## `DIRECT`

Use when the canonical block and an operational guide substantially align in purpose/granularity and no authoritative duration/structure conflicts exist.

## `PACK_COMPOSED`

Use when multiple PACK/support sections must be composed to execute one canonical block while the Piano remains structural authority.

Requirements:

- every contributing section is explicit;
- no logistics-only source is promoted to semantic authority;
- no invented timing or missing content is filled silently.

## `UDA_ONLY`

Use when the UDA alone contains enough explicit operational action for the canonical block and no additional PACK material is required.

Requirements:

- duration relationship is explicit;
- operational steps/evidence are source-supported;
- no worksheet, procedure or assessment is fabricated to make the lesson appear complete.

## `PLAN_GUIDED_UDA`

Use when the Piano disambiguates how a broader/finer UDA structure maps to canonical blocks.

Allowed only when the structural split/composition can be explained from current canonical evidence and duration is fully accounted for.

## No matching recipe

Return:

`UNRESOLVED — HUMAN DESIGN REQUIRED`

Do not invent a fifth recipe automatically.

A new recipe family requires an explicit architecture decision after the same unresolved source relationship has been shown to recur.

---

# 11. Candidate and Draft states

Keep generation states distinct.

## Candidate

Machine-generated evidence package containing at least:

- canonical target block/segment;
- current source generation identities;
- extracted UDA evidence;
- extracted PACK evidence;
- proposed recipe;
- coverage/duration account;
- warnings/issues;
- gate state.

Candidate maximum state:

`READY_FOR_HUMAN_REVIEW`

## Draft

Recipe-applied Human Task projection proposal.

A Draft may include source-derived editorial text, but it is not runtime-active.

Draft maximum state:

`READY_FOR_HUMAN_APPROVAL`

There is no implicit `AUTO_APPROVED` state for professional didactic content.

---

# 12. Human review contract

The reviewer should not need to reread every source document.

For one tranche, present a compact review matrix:

| Blocco | Recipe | Fonti operative | Copertura | Ambiguità | Decisione |
|---|---|---|---|---|---|
| Bxx | DIRECT | UDA + PACK | completa | nessuna | APPROVE |
| Bxy | PLAN_GUIDED_UDA | Piano + UDA | completa | nessuna | APPROVE |
| Bxz | PACK_COMPOSED | Piano + UDA + sezioni PACK | completa | una | REVIEW |

Allowed human outcomes:

- `APPROVE`
- `CORRECT`
- `BLOCK`
- `DESIGN NEW RECIPE`

Never convert `BLOCK` into guessed implementation.

---

# 13. Editorial synthesis policy

Human-facing fields such as:

- `why`;
- `objective`;
- concise step wording;
- `assessmentNote`;
- `continuation`;

may be proposed from selected source evidence.

Internally distinguish:

- `CANONICAL_EXACT`
- `SOURCE_SELECTED`
- `SOURCE_DERIVED_EDITORIAL`
- `TECHNICAL_METADATA`

Editorial synthesis must not be presented as a direct canonical quote or as source data that did not exist.

Assessment questions may never be invented and presented as canonical when the source defines only the assessment format.

---

# 14. Approved manifest target

The mature state is a declarative approved manifest consumed by a generic resolver/loader.

Minimum concerns to preserve:

- projection ID/version;
- target grade/block/UDA;
- recipe family;
- structural Piano binding;
- current source-generation bindings;
- contributing-source provenance;
- timing specificity;
- operational steps;
- resource bindings/surfaces;
- evidence;
- observation/assessment;
- editorial provenance;
- explicit approval metadata;
- invalidation fingerprint.

Do not let the manifest become a competing canonical source. It is an approved derived operational artifact.

If the source generation or canonical structural binding drifts, invalidate the derived artifact and return it to review.

---

# 15. Generic invariants

Prefer tests of the rule over one test per block.

At minimum validate:

1. every active projection maps to an existing canonical block;
2. grade, UDA, PACK and period match the canonical block binding;
3. approved source generations are current when generation binding is available;
4. recipe prerequisites are satisfied;
5. no ambiguous candidate is auto-promoted;
6. `COMPOSED`/composite recipes carry an explicit alignment explanation;
7. total duration comes from the canonical authority;
8. per-step minutes appear only when source-supported;
9. all resource IDs resolve;
10. resources appear only on declared surfaces/steps;
11. support/bound sources are not falsely listed as operational contributors;
12. assessment structure is not expanded into invented canonical questions;
13. technical IDs are not required for primary teacher interaction;
14. runtime uses approved artifacts only;
15. source drift fails closed;
16. recording annual-plan progress remains independent from projection generation;
17. the next uncovered block falls back safely rather than pretending to be modeled.

Add block-specific tests only for real exceptional semantics or historically regression-prone decisions.

---

# 16. Batch execution

When asked to compile the next tranche:

1. verify current `develop` HEAD;
2. identify the next uncovered coherent UDA/segment;
3. discover all current sources once;
4. extract them once;
5. classify every block;
6. produce candidates/drafts in one batch;
7. run generic invariants;
8. surface only blocking semantic decisions;
9. after approval, materialize approved artifacts in one coherent branch;
10. run test/typecheck/lint/build;
11. open one PR for the tranche unless there is a genuine architectural reason to split it;
12. verify Netlify on the exact merged commit when runtime behavior changes.

Do not create one PR per block simply because earlier work was performed that way.

---

# 17. Repository gates

A change is not complete because files exist.

For product runtime changes, run the repository's current gates, normally including:

- focused tests;
- full relevant test suite;
- TypeScript check;
- lint;
- production build;
- migration/security validation if persistence changed;
- exact merged-commit deployment verification when user-facing runtime changed.

A failed gate is evidence. Investigate it; do not weaken the gate merely to make the PR green.

Vercel quota/rate failures are not code failures when Netlify is the active development validation path, but verify the actual failure reason each time instead of assuming it.

---

# 18. Repo Manager output

For substantial work, report:

**STATE** — repository, base branch and current head.

**MODE** — patch / architecture / compiler.

**TRANCHE** — target coherent range if compiler mode.

**SOURCES** — current/ambiguous/missing.

**CLASSIFICATION** — recipe count + unresolved items.

**IMPACT** — changed and explicitly unchanged boundaries.

**GATES** — tests/type/lint/build/deploy.

**HUMAN DECISIONS** — only the decisions that truly require professional approval.

**NEXT ACTION** — one repository-level action.

---

# 19. Success criteria

Repo Manager succeeds when:

- work stays in the DOCENTE OS repository;
- `develop` remains the governed integration path;
- current repository evidence is read before mutation;
- existing architecture is preserved;
- repeated mechanics are automated;
- source provenance remains explicit;
- ambiguity fails closed;
- Human Task Content scales by recipe families rather than block count;
- human review is concentrated on genuine semantic decisions;
- generic tests replace repeated per-block assertions where possible;
- approved derived content is declarative and invalidatable;
- runtime remains fast and task-specific;
- deployment is verified on the exact merged commit.

The maturity target is reached when adding the next complete UDA is primarily a **compile → review → approve** operation, not another hand-authored `human-task-approved-projections-bNN-bMM.ts` implementation.