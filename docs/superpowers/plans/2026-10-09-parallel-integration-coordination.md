# Parallel Integration Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the active Docente OS workstreams without losing certified behavior, colliding migration lineage, dropping test coverage, or creating authority inconsistencies.

**Architecture:** Treat integration as a governed dependency chain rather than a set of independent green PRs. Canonical specification PRs land before their runtime implementations; the large #692 branch lands last after a single rebase/reconciliation against the then-current `develop`, minimizing repeated recertification and conflict churn.

**Tech Stack:** Git/GitHub PR workflow, TypeScript/Next.js, Node test script, Supabase/PostgreSQL migrations, GitHub Actions exact-head certification.

**Spec:** `docs/superpowers/checkpoints/2026-10-09-parallel-work-integration-audit.md`

## Global Constraints

- No automatic merge.
- `develop` is the integration authority; recompute all lineage decisions from its actual head at execution time.
- Never inherit PASS evidence across a rebase, conflict resolution, migration renumbering, or integration commit.
- Preserve teacher authority, no implicit writes, and Docente OS / Arena / Atlas / Studio Atlas boundaries.
- `DOS-A1=RUNTIME_DEFERRED` remains binding.
- Do not renumber #692 migrations before earlier migration-owning work is settled.
- Human Review is the final gate after fresh exact-head certification.
- Do not resolve `product/package.json` by choosing one branch's monolithic `test` line; preserve the union of all required tests.
- Preserve real dependency ancestry when it reduces integration risk: #696 must use a normal merge commit unless a deliberate #697 rebase/reconciliation is accepted.

## Review Focus

1. Migration-lineage uniqueness after #695 and #692 are combined: every runtime schema version must map to exactly one migration ID.
2. Test-suite union after #692/#695/#697: no branch-specific test may disappear from `product/package.json`.
3. Intelligent UI authority after #692 rebase: #692 Human Task/class/lesson changes must not replace the deterministic state authorities preserved by #697.
4. Documenti ↔ Materiali boundary: Studio Atlas material workflows must not implicitly rewrite UDA, Annual Plan or Calendar.
5. Certification validity: every material combined-state change must receive fresh Product CI and all required Browser/P7/security/governance gates on the exact head.

---

### Task 1: Establish the coordination hold without touching runtime branches

**Files:**
- Existing: PR #692 conversation
- Existing: PR #695 conversation
- Existing: PR #697 conversation
- Existing: PR #693 conversation
- Existing: PR #696 conversation

**Interfaces:**
- Consumes: canonical audit `docs/superpowers/checkpoints/2026-10-09-parallel-work-integration-audit.md`
- Produces: explicit integration-order notices visible on active PRs

- [x] **Step 1: Add a coordination notice to #692**
- [x] **Step 2: Add a coordination notice to #695**
- [x] **Step 3: Add a coordination notice to #697**
- [x] **Step 4: Add lightweight dependency notices to #693 and #696**
- [x] **Step 5: Verify no runtime branch head changed**

---

### Task 2: Close the Documentazione specification chain first

**Files:**
- PR #693 canonical documents only
- PR #695 runtime files only after #693 integration

**Interfaces:**
- Consumes: #693 Human Review decision
- Produces: integrated canonical documentation contract that becomes the authority for #695

- [ ] **Step 1: Review #693 as specification-only work**

Verify that it still encodes the frozen Documenti/Materiali boundary, institutional-template hierarchy and teacher-authority constraints. Exact-head document gates and independent review must be clean.

- [ ] **Step 2: Integrate #693 only after its Human Review PASS**

Do not bundle #695 runtime into this merge.

- [ ] **Step 3: Compare #695 against the new `develop`**

Expected result: primarily documentation-base advancement; any material runtime conflict must be investigated rather than auto-resolved.

- [ ] **Step 4: Re-run exact-head certification if #695 head changes**

Required evidence: Product CI, Browser Certification selected gates, P7 where applicable, security/readiness/governance gates, independent review.

- [ ] **Step 5: Human Review #695**

Verify template registry/versioning, trusted quality boundary, ACTIVE/RETIRED lifecycle, provenance, builder/current-version binding, purity guard, UI navigation and institutional rendering contract.

- [ ] **Step 6: Integrate #695 only after fresh PASS**

After integration, inspect `product/supabase/migrations` and record the actual highest runtime migration version. Expected if no other migration lands: 88.

---

### Task 3: Close the Intelligent UI specification/implementation chain

**Files:**
- PR #696 specification files
- PR #697 intelligent UI presentation/core files
- `product/package.json`

**Interfaces:**
- Consumes: #696 architecture as parent of #697
- Produces: integrated deterministic Intelligent UI foundation without runtime-model dependency

- [ ] **Step 1: Review and integrate #696 with ancestry preserved**

Confirm closed component registry, deterministic fallback, no generated JSX/HTML/CSS, no runtime provider dependency, no implicit writes and preserved state authorities. Because #697 is a true descendant of #696, integrate #696 with a normal **merge commit**, not squash/rebase-merge, so `8ece0f900…` remains an ancestor and #697 naturally reduces to its implementation-only delta.

- [ ] **Step 2: Compare #697 against the new `develop`**

Because #697 is a descendant of #696, preserve its implementation commits while reconciling any intervening `develop` changes. If ancestry was not preserved for an exceptional reason, explicitly rebase/reconcile #697 and discard inherited certification.

- [ ] **Step 3: Reconcile `product/package.json` against already integrated test suites**

Assert that document-template tests from #695 remain present and add Intelligent UI tests from #697 without removing any existing test entry.

- [ ] **Step 4: Verify with Product CI and Browser Certification**

Expected: test, typecheck, lint, build and selected browser gates PASS on the exact combined head.

- [ ] **Step 5: Human Review #697**

Confirm Home/Class task continuity, deterministic authority, fail-closed policy and no hidden persistence/provider introduction.

- [ ] **Step 6: Integrate #697 after fresh PASS**

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

**Interfaces:**
- Consumes: fully integrated #695 and #697 state
- Produces: one rebased #692 branch with unique migration lineage and complete combined test suite

- [ ] **Step 1: Refresh #692 metadata before code changes**
- [ ] **Step 2: Rebase #692 onto the current integrated `develop`**
- [ ] **Step 3: Inspect actual migration maximum on rebased `develop`**
- [ ] **Step 4: Renumber the three #692 migrations**

If the maximum remains 88, map `0087→0089`, `0088→0090`, `0089→0091`; otherwise use the actual next contiguous versions. Update filenames, `runtime_schema_required_migrations`, `advance_runtime_schema_contract(...)` and every test/contract reference consistently.

- [ ] **Step 5: Add/adjust the migration-lineage regression**
- [ ] **Step 6: Reconcile `product/package.json` as a union**
- [ ] **Step 7: Resolve semantic file conflicts one by one**
- [ ] **Step 8: Run full Product CI**
- [ ] **Step 9: Run exact-head certification**
- [ ] **Step 10: Request independent review on the exact post-rebase head**
- [ ] **Step 11: Human Review #692**

---

### Task 5: Final combined-state integration verification

**Files:**
- Integrated `develop`
- `product/supabase/migrations/**`
- `product/package.json`
- Coordination checkpoint

- [ ] **Step 1: Verify unique migration lineage on integrated `develop`**
- [ ] **Step 2: Verify combined test-script coverage**
- [ ] **Step 3: Re-run or inspect post-merge required gates on integrated SHA**
- [ ] **Step 4: Validate authority boundaries**
- [ ] **Step 5: Update the coordination checkpoint with final SHAs and CLOSED status**

---

### Task 6: Governance cleanup after the integration chain is stable

**Files:**
- PR #687 metadata/conversation
- PR #692 body
- Coordination checkpoint

**Ruling:** Step 1 was executed early because #688 was already merged and #687 was independently superseded; closing #687 is reversible governance cleanup and has no dependency on the remaining runtime integration chain.

- [x] **Step 1: Mark #687 superseded by merged #688**

A factual closing comment was added and #687 was closed without merge on 2026-10-09.

- [ ] **Step 2: Ensure #692 body reflects its final exact head and evidence**
- [ ] **Step 3: Close the coordination PR/checkpoint only when exit conditions are met**

Exit requires unique migrations, complete test union, combined exact-head evidence and no unresolved integration blocker.
