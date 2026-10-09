# Parallel Integration Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the active Docente OS workstreams without losing certified behavior, colliding migration lineage, dropping test coverage, or creating authority inconsistencies.

**Architecture:** Treat integration as a governed dependency chain rather than a set of independent green PRs. Canonical specification PRs land before their runtime implementations; the large #692 branch lands last after a single rebase/reconciliation against the then-current `develop`, minimizing repeated recertification and conflict churn.

**Tech Stack:** Git/GitHub PR workflow, TypeScript/Next.js, Node test script, Supabase/PostgreSQL migrations, GitHub Actions exact-head certification.

**Spec:** `docs/superpowers/checkpoints/2026-10-09-parallel-work-integration-audit.md`

## Global Constraints

- No automatic merge.
- `develop` is the integration authority; recompute all lineage decisions from its actual head at execution time.
- Never inherit PASS evidence across a rebase, conflict resolution, migration renumbering, specification remediation or integration commit.
- Preserve teacher authority, no implicit writes, and Docente OS / Arena / Atlas / Studio Atlas boundaries.
- `DOS-A1=RUNTIME_DEFERRED` remains binding.
- Do not renumber #692 migrations before earlier migration-owning work is settled.
- Human Review is the final gate after fresh exact-head certification.
- Do not resolve `product/package.json` by choosing one branch's monolithic `test` line; preserve the union of all required tests.
- Preserve real dependency ancestry when it reduces integration risk; when an upstream specification advances after implementation branched, refresh the implementation and recertify it.

## Review Focus

1. Migration-lineage uniqueness after #695 and #692 are combined: every runtime schema version must map to exactly one migration ID.
2. Test-suite union after #692/#695/#697: no branch-specific test may disappear from `product/package.json`.
3. Intelligent UI authority and spec alignment: #697 must include the remediated #696 full-view/return-continuity contract before integration; #692 must not replace the deterministic state authorities later.
4. Documenti ↔ Materiali boundary: Studio Atlas material workflows must not implicitly rewrite UDA, Annual Plan or Calendar.
5. Certification validity: every material combined-state or governing-spec change must receive fresh exact-head evidence on the implementation that consumes it.

---

### Task 1: Establish the coordination hold without touching runtime branches

- [x] Add coordination notices to #692/#693/#695/#696/#697.
- [x] Verify the notices did not modify runtime branch heads.

---

### Task 2: Close the Documentazione specification chain first

**Files:**
- PR #693 canonical documents only
- PR #695 runtime files only after #693 integration

- [ ] **Step 1: Review #693 as specification-only work**

Verify the frozen Documenti/Materiali boundary, institutional-template hierarchy, teacher authority, privacy/minimization and terminology (`curricolo`, not `curriculum`). Require clean independent review on the exact head.

- [ ] **Step 2: Integrate #693 only after Human Review PASS**

Do not bundle #695 runtime into this merge.

- [ ] **Step 3: Compare #695 against the new `develop`**

Any material runtime conflict must be investigated rather than auto-resolved.

- [ ] **Step 4: Re-run exact-head certification if #695 head changes**

Required evidence: Product CI, Browser Certification selected gates, P7 where applicable, security/readiness/governance gates, independent review.

- [ ] **Step 5: Human Review #695**

Verify template registry/versioning, trusted quality boundary, ACTIVE/RETIRED lifecycle, provenance, builder/current-version binding, purity guard, UI navigation and institutional rendering contract.

- [ ] **Step 6: Integrate #695 only after fresh PASS**

After integration, inspect `product/supabase/migrations` and record the actual highest runtime migration version.

---

### Task 3: Close the Intelligent UI specification/implementation chain

**Files:**
- PR #696 specification files
- PR #697 intelligent UI presentation/core files
- `product/package.json`

**Current dependency state:** #696 advanced from `8ece0f900…` to `416ecae32…` after independent review found two P2 specification gaps. #697 is now `ahead 18 / behind 1` relative to #696, merge-base `8ece0f900…`. The prior #697 PASS evidence is historical against the previous spec and is not integration authority.

- [ ] **Step 1: Complete review of remediated #696**

Require independent re-review of `416ecae32…` proving closure of:
- full-view actions actually reveal broader content (`view=all` + open disclosure + browser assertion);
- sanitized `returnTo` remains an explicit registered secondary `CLASS_RETURN_TO_ORIGIN` action without becoming state authority.

Confirm no generated JSX/HTML/CSS, no runtime provider dependency, no implicit writes and preserved state authorities. Refresh the stale #696 PR body head before final Human Review.

- [ ] **Step 2: Integrate #696 with a normal merge commit**

Do not squash/rebase-merge unless deliberately accepting additional reconciliation cost. Preserve the reviewed specification commit in `develop`.

- [ ] **Step 3: Refresh/rebase #697 onto integrated #696**

Because #697 is behind the remediated specification by one commit, rebase/refresh it only after #696 lands. Record pre/post SHAs. Resolve specification-file ancestry first; do not treat the old #697 certifications as current.

- [ ] **Step 4: TDD-remediate #697 to the new #696 contract**

Add RED tests before runtime changes for:
- `CLASS_RETURN_TO_ORIGIN` registry membership and sanitization/fallback;
- `HOME_SHOW_ALL` / `CLASS_SHOW_ALL` routes that cause disclosures to render open;
- browser behavior proving full-view activation reveals content;
- Home→Classe return-to-origin continuity with external/malformed origins rejected.

Then implement the minimal runtime changes. Preserve `resolveHomeDailyContext()` and `resolveClassTaskDecision()` as authorities.

- [ ] **Step 5: Reconcile `product/package.json` against already integrated test suites**

Assert that document-template tests from #695 remain present and add/refine Intelligent UI tests without removing any existing test entry.

- [ ] **Step 6: Verify #697 with fresh Product CI and Browser Certification**

Expected: tests, typecheck, lint, build and selected browser gates PASS on the exact remediated head.

- [ ] **Step 7: Human Review #697**

Confirm Home/Class task continuity, deterministic authority, fail-closed policy, real broader-view reveal, explicit safe return-to-origin, and no hidden persistence/provider introduction.

- [ ] **Step 8: Integrate #697 after fresh PASS**

Record the resulting `develop` SHA for #692 rebase.

---

### Task 4: Rebaseline the large #692 branch once, after upstream integration stabilizes

**Files:**
- `product/supabase/migrations/0087_lesson_design_atlas_bundle_atomic_acceptance.sql`
- `product/supabase/migrations/0088_canonical_plan_runtime_identity.sql`
- `product/supabase/migrations/0089_lesson_design_atlas_material_kind_guard.sql`
- `product/supabase/tests/atlas_material_bundle_atomicity_contract.sql`
- `product/supabase/tests/canonical_plan_runtime_identity_behavior.sql`
- `product/supabase/tests/runtime-release-contract.sql`
- `product/package.json`
- Any #692 file with a real merge conflict against integrated `develop`

- [ ] Refresh #692 metadata before code changes.
- [ ] Rebase #692 onto the current integrated `develop` once upstream #695/#697 are stable.
- [ ] Inspect the actual runtime migration maximum; do not assume 88.
- [ ] Renumber #692 migrations to the next contiguous versions and update every registry/contract/test reference.
- [ ] Add/adjust migration-lineage regression.
- [ ] Reconcile `product/package.json` as a union of all suites.
- [ ] Resolve semantic Home/Class/lesson/Human Task and UDA/Annual Plan conflicts one by one.
- [ ] Run full Product CI.
- [ ] Run exact-head Browser/P7/X5/X5B/K1/security/readiness/governance certification where selected.
- [ ] Request independent review on the exact post-rebase head.
- [ ] Human Review #692.

---

### Task 5: Final combined-state integration verification

- [ ] Verify unique migration lineage on integrated `develop`.
- [ ] Verify combined `product/package.json` test coverage.
- [ ] Re-run/inspect post-merge required gates on integrated SHA.
- [ ] Validate authority boundaries: no Atlas implicit writes; Intelligent UI still delegates state authority to canonical resolvers.
- [ ] Update the coordination checkpoint with final SHAs and CLOSED status.

---

### Task 6: Governance cleanup

**Ruling:** #687 cleanup was executed early because #688 was already merged and #687 was independently superseded; the closure is reversible and has no dependency on the remaining runtime integration chain.

- [x] #687 commented as superseded and closed without merge on 2026-10-09.
- [ ] Refresh #696 body to its final reviewed exact head before integration.
- [ ] Refresh #692 body to its final exact head/evidence before its Human Review.
- [ ] Close COORD-01 only when unique migrations, complete test union, combined exact-head evidence and no unresolved integration blocker are proven.
