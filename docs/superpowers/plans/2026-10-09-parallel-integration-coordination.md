# Parallel Integration Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the active Docente OS workstreams without losing certified behavior, colliding migration lineage, dropping test coverage, or creating authority inconsistencies.

**Architecture:** Treat integration as a governed dependency chain rather than a set of independent green PRs. Governing specification PRs are remediated, re-reviewed and integrated before their runtime implementations; every implementation is then synchronized to the integrated specification and receives fresh exact-candidate evidence. Migration-owning tranches are settled before the large #692 branch is rebased/renumbered once against the resulting `develop`.

**Tech Stack:** Git/GitHub PR workflow, TypeScript/Next.js, Node test script, Supabase/PostgreSQL migrations, GitHub Actions exact-head certification.

**Spec:** `docs/superpowers/checkpoints/2026-10-09-parallel-work-integration-audit.md`

**Progress addendum:** `docs/superpowers/checkpoints/2026-10-11-coord-01-progress.md`

## Global Constraints

- No automatic merge.
- `develop` is the integration authority; recompute all lineage decisions from its actual head at execution time.
- Never inherit PASS evidence across a rebase, conflict resolution, migration renumbering, governing-spec remediation or integration candidate change.
- Preserve teacher authority, no implicit writes, and Docente OS / Arena / Atlas / Studio Atlas boundaries.
- `DOS-A1=RUNTIME_DEFERRED` remains binding.
- Do not renumber #692 migrations before earlier migration-owning work is settled.
- Human Review is the final gate after fresh exact-candidate certification.
- Do not resolve `product/package.json` by choosing one branch's monolithic `test` line; preserve the union of all required tests.
- When an upstream specification advances after implementation branched, the implementation must consume the final integrated specification and be recertified even if it was previously green.

## Current integration authority — 2026-10-11

- `develop@191ff892bc38425901c790f40947f8c821edc5cf`.
- #693 is **MERGED** as `998d6f3cba2f90ad7398e714931911f41528da43`.
- #695 is **MERGED** as `191ff892bc38425901c790f40947f8c821edc5cf` from exact reviewed head `970248510f1adeaf0684e6efcd2c4406741b7bc9`.
- Integrated Documentazione migration lineage currently reaches **0096**.
- DOC-TPL-01 is **INTEGRATED**.
- The canonical documentation dependency remains `DOC-TPL-01 → DOC-01/X5 → DOC-04`.

## Coordination ruling — DOC-01 before #692 rebaseline

DOC-01 is an additive migration-owning tranche and is now the active Documentazione priority. It must execute from current `develop` using the next free contiguous migration after 0096. #692 remains held and must recompute/renumber its migrations only after DOC-01 and any other earlier migration-owning tranche intended for this integration cycle are settled.

This ruling does not couple DOC-01 to Intelligent UI. #696 → #697 remains a separate spec/runtime dependency chain. Any eventual `product/package.json` reconciliation must preserve the union of integrated DOC-TPL/DOC-01 tests, Intelligent UI tests and Atlas/material tests.

---

### Task 1: Establish the coordination hold without touching runtime branches

- [x] Add coordination notices to #692/#693/#695/#696/#697.
- [x] Verify the notices did not modify runtime branch heads.

---

### Task 2: Remediate and integrate the Documentazione specification, then realign #695

**Status:** **COMPLETE**.

- [x] Remediate the five #693 findings — docs only.
- [x] Verify and re-review the new #693 exact head.
- [x] Human Review #693 and integrate after clean exact-head evidence.
- [x] Synchronize #695 with integrated #693.
- [x] TDD-remediate #695 against the final specification.
- [x] Mandatory fresh #695 exact-candidate certification.
- [x] Human Review #695 and integrate after fresh PASS.

Integrated result:
- #693 merge commit `998d6f3cba2f90ad7398e714931911f41528da43`.
- #695 exact candidate `970248510f1adeaf0684e6efcd2c4406741b7bc9`.
- #695 merge commit/current `develop` `191ff892bc38425901c790f40947f8c821edc5cf`.
- migration maximum after DOC-TPL-01: **0096**.

---

### Task 2A: Execute DOC-01 generalized authored documents before #692 rebaseline

**Authority:** `docs/superpowers/plans/2026-10-07-doc-01-generalized-authoring.md`.

- [ ] Branch from `develop@191ff892bc38425901c790f40947f8c821edc5cf`.
- [ ] Execute DOC-01 Tasks 1–5 with strict RED→GREEN.
- [ ] Allocate the next free contiguous migration after 0096 only after inspecting current lineage.
- [ ] Preserve UDA X5A/X5B behavior exactly.
- [ ] Do not introduce standalone title/body FINAL_REPORT creation; DOC-04 owns structured atomic first version, provenance and renderer pins.
- [ ] Preserve canonical `product/package.json` test union.
- [ ] Run fresh exact-head Product CI, Browser/certification gates as selected, independent review and Human Review.
- [ ] Integrate only after explicit merge decision.
- [ ] Record the resulting migration maximum before any #692 renumbering.

---

### Task 3: Remediate and integrate the Intelligent UI specification, then realign #697

**Files / PRs:**
- PR #696 specification/plan files
- PR #697 intelligent UI presentation/core files
- `product/package.json`

**Current state:** #696 and #697 remain open Drafts on their earlier heads. Their historical evidence remains branch-local until refreshed.

- [ ] Complete/reverify the final #696 return-path registered-UI allowlist contract if still required on refresh.
- [ ] Verify/re-review #696 exact head and perform Human Review.
- [ ] Integrate #696 with a normal merge commit only after PASS.
- [ ] Refresh/rebase #697 onto integrated #696/current `develop`.
- [ ] TDD-remediate #697 to final #696 contract.
- [ ] Reconcile `product/package.json` against all already integrated suites, including DOC-TPL/DOC-01.
- [ ] Fresh #697 Product CI + Browser certification + independent review.
- [ ] Human Review #697 and integrate only after fresh PASS.

---

### Task 4: Rebaseline the large #692 branch once, after upstream integration stabilizes

**Files:**
- current #692 migration files and all references;
- `product/package.json`;
- any #692 file with a real merge conflict against integrated `develop`.

- [ ] Refresh #692 metadata before code changes and mark inherited evidence historical.
- [ ] Rebase #692 onto current integrated `develop` only after earlier migration-owning work is settled.
- [ ] Inspect actual runtime migration maximum; do not assume any version.
- [ ] Renumber #692 migrations to next contiguous versions and update all contract references consistently.
- [ ] Add/adjust migration-lineage regression.
- [ ] Reconcile `product/package.json` as a union.
- [ ] Resolve semantic conflicts preserving final Intelligent UI authorities and Documenti↔Materiali boundaries.
- [ ] Run full Product CI.
- [ ] Run exact-head Browser/HVA/WCAG/P6/X3/X4, P7, X5/X5B, K1 and security/readiness/governance gates where selected.
- [ ] Refresh the #692 PR body after all changes and final exact-head certification.
- [ ] Request independent review on the final exact candidate.
- [ ] Human Review #692; integration remains an explicit later decision.

---

### Task 5: Final combined-state integration verification

- [ ] Verify unique migration lineage on integrated `develop`.
- [ ] Verify combined `product/package.json` test coverage.
- [ ] Re-run/inspect required post-merge gates on the integrated SHA rather than relying only on pre-merge heads.
- [ ] Validate authority boundaries: no Atlas implicit writes; “used material” requires session-linked evidence; Intelligent UI delegates state authority to canonical resolvers.
- [ ] Update the coordination checkpoint with final SHAs, migration mapping, evidence runs and CLOSED status.

---

### Task 6: Governance cleanup

- [x] #687 commented as superseded and closed without merge on 2026-10-09.
- [x] #693 body/history reconciled through integration.
- [ ] Refresh #696 body to its final remediated/reviewed head before integration.
- [ ] Ensure #692 final body refresh is completed before final review.
- [ ] Close COORD-01 only when unique migrations, complete test union, combined exact-head evidence and no unresolved integration blocker are proven.
