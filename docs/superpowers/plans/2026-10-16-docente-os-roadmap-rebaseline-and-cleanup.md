# Docente OS Roadmap Rebaseline and Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** reduce Docente OS to one current product roadmap on `develop@297ae0defe83e094c1876971d71864a76ac6c828`, retire stale parallel-work perception, and hand execution cleanly to MATERIAL-CORE-01.

**Architecture:** This is a documentation/governance-only rebaseline. It changes no runtime, UI, persistence, schema, authority or Beta state. Historical PRs remain retrievable; stale integration lines are closed with explicit supersession notes rather than rewritten or deleted.

**Tech Stack:** GitHub pull requests + repository Markdown governance artifacts.

**Spec:** `docs/superpowers/checkpoints/2026-10-16-docente-os-roadmap-rebaseline.md`

## Global Constraints

- Base every conclusion on `develop@297ae0defe83e094c1876971d71864a76ac6c828`.
- Preserve Docente OS maturity `L4`; do not promote L5 in this tranche.
- Preserve `DOS-A1=RUNTIME_DEFERRED`.
- Do not modify runtime, database, migrations, UI or Render/Supabase state.
- Do not delete historical branches/evidence.
- Do not merge automatically.
- Canonical terminology is `curricolo / curricolo di istituto`.

## Review Focus

- A stale PR must not be mistaken for an integration candidate after cleanup.
- A historical design may remain useful without remaining active WIP.
- MATERIAL-CORE must inherit the current CPRI/TERM/CV2 baseline, not a historical SHA.
- L5 evidence must remain evidence-bound and must not be inferred from feature count.
- Separate ecosystem residuals such as Argo G5-C must not re-enter the current Docente OS product sequence.

---

### Task 1: Publish the current roadmap checkpoint

**Files:**
- Create: `docs/superpowers/checkpoints/2026-10-16-docente-os-roadmap-rebaseline.md`

**Interfaces:**
- Consumes: integrated Docente OS state through PR #710 and TRAMA L4 evidence.
- Produces: single current execution order and explicit stale-PR disposition.

- [x] **Step 1:** Record exact `develop` SHA and L4 maturity baseline.
- [x] **Step 2:** Separate closed foundations from current product gaps.
- [x] **Step 3:** Set MATERIAL-CORE-01 as the first next product increment.
- [x] **Step 4:** Define disposition of #692, #696, #697, #698, #707 and #708.

### Task 2: Qualify this documentation-only delta

**Files:**
- Checkpoint and this plan only.

**Interfaces:**
- Consumes: branch exact head.
- Produces: reviewable documentation-only PR.

- [ ] **Step 1:** Open a Draft PR to `develop` from the exact current baseline.
- [ ] **Step 2:** Confirm changed files are documentation-only and no application/runtime path changed.
- [ ] **Step 3:** Confirm applicable governance workflows pass on the exact PR head.

### Task 3: Remove stale WIP perception

**Files:** none; GitHub PR metadata/comments only.

**Interfaces:**
- Consumes: approved disposition in the checkpoint.
- Produces: active PR list that matches the current roadmap.

- [ ] **Step 1:** Close #692 with `SUPERSEDED AS INTEGRATION LINE`; preserve it as historical/reference evidence.
- [ ] **Step 2:** Close #697 as stale implementation baseline; require fresh rebase/reimplementation when IUI resumes.
- [ ] **Step 3:** Close #698 as superseded by the 2026-10-16 roadmap rebaseline.
- [ ] **Step 4:** Close #707 and #708 as implemented/superseded by integrated #709/#710.
- [ ] **Step 5:** Reclassify #696 as design reference and close it as active implementation WIP; future IUI work must start from current `develop`.
- [ ] **Step 6:** Leave #702 and #647 untouched because they are separate governance/local-evidence residuals, not competing current product fronts.

### Task 4: Integrate the roadmap checkpoint

**Files:** documentation only.

**Interfaces:**
- Consumes: exact-head green documentation PR and human merge decision.
- Produces: current roadmap available on `develop`.

- [ ] **Step 1:** Verify the PR remains exact-head clean and mergeable.
- [ ] **Step 2:** Merge only after explicit human authorization.
- [ ] **Step 3:** Verify `develop` points to the merge commit and no runtime/Beta deploy is needed for a documentation-only delta.

### Task 5: Start MATERIAL-CORE-01 from the rebaselined develop

**Files:** governed by `docs/superpowers/plans/2026-10-13-material-core-01-canonical-material-acceptance.md`.

**Interfaces:**
- Consumes: current integrated CPRI/TERM/CV2 baseline.
- Produces: canonical material acceptance core; no provider runtime.

- [ ] **Step 1:** Create an isolated implementation branch from then-current `develop`.
- [ ] **Step 2:** Execute MATERIAL-CORE Task 1 inventory first; do not mutate data before classification.
- [ ] **Step 3:** Continue TDD task-by-task only after the Task 1 stop condition is satisfied.
- [ ] **Step 4:** Preserve the no-auto-merge/no-Beta-promotion boundary until exact-head qualification and Human Review.
