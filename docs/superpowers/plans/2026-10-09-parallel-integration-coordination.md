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

- [ ] **Step 1: Add a coordination notice to #692**

State that #692 is individually green but must not merge before the migration lineage and `product/package.json` are reconciled against integrated #695/#697; record the current exact head and the stale-body issue.

- [ ] **Step 2: Add a coordination notice to #695**

State that #693 is the canonical specification dependency and that #692 currently conflicts on migration versions 87/88; do not change #695 runtime merely to accommodate an unintegrated branch.

- [ ] **Step 3: Add a coordination notice to #697**

State that #696 must land first and that `product/package.json` will require union reconciliation when #692/#695 are later integrated.

- [ ] **Step 4: Add lightweight dependency notices to #693 and #696**

Keep the notices factual: #693 gates #695; #696 gates #697. Do not request merge automatically.

- [ ] **Step 5: Verify no runtime branch head changed**

Fetch PR metadata for #692/#695/#697 and confirm the notices did not modify branch heads.

---

### Task 2: Close the Documentazione specification chain first

**Files:**
- PR #693 canonical documents only
- PR #695 runtime files only after #693 integration

**Interfaces:**
- Consumes: #693 Human Review decision
- Produces: integrated canonical documentation contract that becomes the authority for #695

- [ ] **Step 1: Review #693 as specification-only work**

Verify that it still encodes the frozen Documenti/Materiali boundary, institutional-template hierarchy and teacher-authority constraints.

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

- [ ] **Step 1: Review and integrate #696**

Confirm closed component registry, deterministic fallback, no generated JSX/HTML/CSS, no runtime provider dependency, no implicit writes and preserved state authorities.

- [ ] **Step 2: Compare #697 against the new `develop`**

Because #697 is a descendant of #696, preserve its implementation commits while reconciling any intervening `develop` changes.

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

Update the PR body to the actual exact head and current gate status; remove stale claims tied to `5a352dad…`.

- [ ] **Step 2: Rebase #692 onto the current integrated `develop`**

Do this only once upstream #695/#697 are stable. Record pre-rebase and post-rebase SHAs.

- [ ] **Step 3: Inspect actual migration maximum on rebased `develop`**

Do not assume 88. Compute the highest registered migration version and next free contiguous versions.

- [ ] **Step 4: Renumber the three #692 migrations**

If the maximum remains 88, map:

- `0087_lesson_design_atlas_bundle_atomic_acceptance` → `0089_…`
- `0088_canonical_plan_runtime_identity` → `0090_…`
- `0089_lesson_design_atlas_material_kind_guard` → `0091_…`

Update `runtime_schema_required_migrations`, `advance_runtime_schema_contract(...)`, filenames and every test/contract reference consistently. If the maximum differs, use the actual next contiguous versions instead.

- [ ] **Step 5: Add/adjust the migration-lineage regression**

The test must fail if two migration IDs claim the same runtime version or if the expected contiguous chain is broken.

- [ ] **Step 6: Reconcile `product/package.json` as a union**

Verify explicitly that Atlas/canonical-plan, document-template and Intelligent UI tests are all present alongside the pre-existing suite.

- [ ] **Step 7: Resolve semantic file conflicts one by one**

For Home/Class/lesson/Human Task files, preserve #697 deterministic authority while retaining #692 material-handoff behavior. For UDA/Annual Plan, preserve the no-implicit-write boundary from #693/#695.

- [ ] **Step 8: Run full Product CI**

Expected: migration replay PASS; all product tests PASS; typecheck PASS; lint PASS; production build PASS.

- [ ] **Step 9: Run exact-head certification**

Required where selected: Browser HVA, WCAG 2.2 AA, P6, X3/X4, P7 DB restore, X5/X5B, K1, security/readiness/governance gates.

- [ ] **Step 10: Request independent review on the exact post-rebase head**

Review focus: migration lineage, package-test union, Human Task/Intelligent UI authority, no implicit writes, Atlas material atomicity.

- [ ] **Step 11: Human Review #692**

Judge the combined product, not inherited branch evidence. The PR may leave Draft only after the combined-state evidence is clean.

---

### Task 5: Final combined-state integration verification

**Files:**
- Integrated `develop`
- `product/supabase/migrations/**`
- `product/package.json`
- Coordination checkpoint

**Interfaces:**
- Consumes: integrated #693/#695/#696/#697/#692
- Produces: combined Docente OS baseline safe for subsequent release/maturity work

- [ ] **Step 1: Verify unique migration lineage on integrated `develop`**

No duplicate runtime version or migration ID; sequence matches repository contract.

- [ ] **Step 2: Verify combined test-script coverage**

Confirm all branch-specific suites remain in `product/package.json` and Product CI passes from integrated `develop`.

- [ ] **Step 3: Re-run or inspect post-merge required gates on integrated SHA**

Do not claim combined completion from pre-merge PR heads alone.

- [ ] **Step 4: Validate authority boundaries**

Check no Atlas/material action implicitly mutates institutional documents, Annual Plan or Calendar; check Intelligent UI still delegates state authority to canonical resolvers.

- [ ] **Step 5: Update the coordination checkpoint with final SHAs and CLOSED status**

Record integrated PR order, final migration mapping, final exact SHA and evidence runs.

---

### Task 6: Governance cleanup after the integration chain is stable

**Files:**
- PR #687 metadata/conversation
- PR #692 body
- Coordination checkpoint

**Interfaces:**
- Consumes: stable integrated chain
- Produces: no stale PRs or misleading current-head claims

- [ ] **Step 1: Mark #687 superseded by merged #688**

Add a factual closing comment and close #687. This is governance cleanup only; do not modify #688.

- [ ] **Step 2: Ensure #692 body reflects its final exact head and evidence**

Remove superseded intermediate heads and distinguish historical RED/GREEN evidence from the final qualified head.

- [ ] **Step 3: Close the coordination PR/checkpoint only when exit conditions are met**

Exit requires unique migrations, complete test union, combined exact-head evidence and no unresolved integration blocker.
