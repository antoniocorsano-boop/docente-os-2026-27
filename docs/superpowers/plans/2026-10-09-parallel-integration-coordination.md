# Parallel Integration Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the active Docente OS workstreams without losing certified behavior, colliding migration lineage, dropping test coverage, or creating authority inconsistencies.

**Architecture:** Treat integration as a governed dependency chain rather than a set of independent green PRs. Governing specification PRs are remediated, re-reviewed and integrated before their runtime implementations; every implementation is then synchronized to the integrated specification and receives fresh exact-candidate evidence. The large #692 branch lands last after a single rebase/reconciliation against the resulting `develop`.

**Tech Stack:** Git/GitHub PR workflow, TypeScript/Next.js, Node test script, Supabase/PostgreSQL migrations, GitHub Actions exact-head certification.

**Spec:** `docs/superpowers/checkpoints/2026-10-09-parallel-work-integration-audit.md`

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

## Review Focus

1. Migration-lineage uniqueness after #695 and #692 are combined: every runtime schema version must map to exactly one migration ID.
2. Test-suite union after #692/#695/#697: no branch-specific test may disappear from `product/package.json`.
3. Documentazione alignment: #695 must implement the final #693 contracts for accepted curricolo baseline, independently versioned institutional base, usage evidence, same-version validation/finalization and atomic structured v1.
4. Intelligent UI alignment: #697 must implement the final #696 full-view and registered-UI return-continuity contract; #692 must not later replace deterministic state authorities.
5. Certification validity: every material combined-state or governing-spec change receives fresh exact-candidate evidence before Human Review/integration.

---

### Task 1: Establish the coordination hold without touching runtime branches

- [x] Add coordination notices to #692/#693/#695/#696/#697.
- [x] Verify the notices did not modify runtime branch heads.

---

### Task 2: Remediate and integrate the Documentazione specification, then realign #695

**Files / PRs:**
- PR #693 canonical documentation/specification files only
- PR #695 runtime foundation only after final #693 integration

**Current state:** #693 head `9249322346…` is REWORK with five confirmed review findings; #695 head `2c10ae1b…` is held because the final specification will materially change its institutional-base/version contract.

- [ ] **Step 1: Remediate the five #693 findings — docs only**

Update the relevant #693 design/plan documents so that they explicitly require:
- accepted curricolo baseline binding with authority/version/coverage/revalidation context;
- first-class independently versioned `InstitutionalBase` / `InstitutionalBaseVersion` pinned separately from family-template version;
- `LessonDesignExtension.status=ACCEPTED` treated as available/planned only, with “used” derived solely from explicit TeachingSession-linked evidence/receipt;
- `FINALIZED` allowed only after persisted `VALIDATED` on the same immutable version with complete mandatory inputs;
- atomic creation/completion of the first structured Relazione finale version plus manifest/provenance, with no provenance-less historical v1.

Maintain `curricolo` as the canonical Italian terminology. No runtime/migration/product-test changes belong in #693.

- [ ] **Step 2: Verify and re-review the new #693 exact head**

Inspect the diff to prove it is docs-only and each finding is closed. Run all applicable document gates on the new exact head and request fresh independent review. Historical review/gates do not qualify the new head.

- [ ] **Step 3: Human Review #693 and integrate only after clean exact-head evidence**

Confirm the Documenti↔Materiali boundary, privacy/minimization, professional judgement, curricolo authority and template/base lifecycle are coherent. Only then integrate #693; do not bundle #695 runtime.

- [ ] **Step 4: Synchronize #695 with the integrated #693 candidate**

Refresh the #695 branch against the then-current `develop` so the exact integration candidate actually contains the final #693 specification. Do this even if there is no textual merge conflict; the final gate must exercise the specification+implementation candidate, not a pre-#693 head in isolation.

- [ ] **Step 5: TDD-remediate #695 against the final specification**

At minimum reassess and, where required, implement with RED→GREEN:
- first-class institutional-base identity/version and separate pin alongside family-template version;
- preview/repository/snapshot propagation of both pinned versions;
- immutable document/version behavior compatible with same-version validation/finalization and atomic structured-v1 requirements where DOC-TPL-01 owns the boundary;
- no regression to ACTIVE/RETIRED lifecycle, provenance, trusted review boundary, purity guard or professional output.

Do not extend #695 into DOC-04 authoring behavior that belongs to later work; implement only the foundation contract it owns.

- [ ] **Step 6: Mandatory fresh #695 exact-candidate certification**

This gate is mandatory after #693 integration **regardless of whether an earlier #695 SHA was green**. Required evidence on the synchronized/remediated candidate: Product CI including full migration replay/tests/typecheck/lint/build, Browser Certification selected gates, P7 where applicable, security/readiness/governance gates and fresh independent review.

- [ ] **Step 7: Human Review #695 and integrate only after fresh PASS**

Review registry/versioning, institutional-base pinning, trusted quality boundary, ACTIVE/RETIRED lifecycle, provenance, builder/current-version binding, purity guard, UI navigation and institutional rendering contract. After integration, record the actual highest runtime migration version for the future #692 renumbering step.

---

### Task 3: Remediate and integrate the Intelligent UI specification, then realign #697

**Files / PRs:**
- PR #696 specification/plan files
- PR #697 intelligent UI presentation/core files
- `product/package.json`

**Current state:** the first two #696 P2s were remediated on `416ecae32…`, but re-review found an additional P2: generic same-origin `returnTo` is unsafe because route handlers such as `/api/**` can have side effects. #696 therefore remains REWORK. #697 is historical against the earlier spec.

- [ ] **Step 1: Remediate #696 return-path allowlist on a new exact head**

The plan must require a dedicated fail-closed `CLASS_RETURN_TO_ORIGIN` validator over registered navigable UI surfaces, not a generic same-origin URL. For the Home→Classe pilot, YAGNI permits Home `/` as the approved origin surface. Explicitly reject `/api/**`, auth/handler routes, `/_next/**`, technical assets and any non-registered destination. Add contract/browser test requirements proving return navigation cannot invoke a route handler or side effect.

- [ ] **Step 2: Verify and re-review the final #696 exact head**

Inspect docs-only diff, run document gates, request fresh independent review and require no open P1/P2. Refresh the stale PR body to the final reviewed exact head before Human Review.

- [ ] **Step 3: Human Review #696 and integrate with a normal merge commit**

Confirm closed component/action catalogue, deterministic fallback, real broader-view reveal, registered UI-only return continuity, no generated JSX/HTML/CSS, no runtime provider dependency, no implicit writes and preserved state authorities. Use a normal merge commit to preserve the specification ancestry consumed by #697.

- [ ] **Step 4: Refresh/rebase #697 onto integrated #696**

Record pre/post SHAs. The old #697 Product/Browser PASS is historical and cannot qualify the refreshed candidate.

- [ ] **Step 5: TDD-remediate #697 to the final #696 contract**

Add RED tests before runtime changes for:
- `CLASS_RETURN_TO_ORIGIN` registry membership with registered-UI allowlist and fail-closed rejection of `/api/**`, auth/technical paths and external/malformed origins;
- `HOME_SHOW_ALL` / `CLASS_SHOW_ALL` routes that cause existing disclosures to render open;
- browser behavior proving full-view activation reveals content;
- Home→Classe return-to-origin continuity without changing `resolveClassTaskDecision()` authority.

Then implement the minimum runtime delta.

- [ ] **Step 6: Reconcile `product/package.json` against already integrated test suites**

Preserve the complete existing suite including document-template tests from #695 and add/refine Intelligent UI tests without removing anything.

- [ ] **Step 7: Fresh #697 Product CI + Browser certification**

Require tests, typecheck, lint, build and all selected browser/HVA/WCAG/no-implicit-write gates on the exact refreshed/remediated head, plus fresh independent review.

- [ ] **Step 8: Human Review #697 and integrate only after fresh PASS**

Confirm task continuity, deterministic authority, fail-closed policy, actual broader-view reveal, UI-only safe return-to-origin and no hidden persistence/provider introduction. Record resulting `develop` SHA for #692 rebase.

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

- [ ] **Step 1: Refresh #692 metadata before code changes**

Update the PR body to the actual pre-rebase head and mark inherited branch evidence as historical. This is an orientation update only, not the final Human Review metadata.

- [ ] **Step 2: Rebase #692 onto the current integrated `develop` once #695/#697 are stable**

Record pre/post SHAs and discard inherited certification for integration purposes.

- [ ] **Step 3: Inspect the actual runtime migration maximum**

Do not assume 88; recompute from integrated `develop` after #695 is final.

- [ ] **Step 4: Renumber #692 migrations to the next contiguous versions**

Update filenames, `runtime_schema_required_migrations`, `advance_runtime_schema_contract(...)` and every contract/test reference consistently.

- [ ] **Step 5: Add/adjust migration-lineage regression**

Fail on duplicate runtime version, mismatched migration ID or broken required contiguous chain.

- [ ] **Step 6: Reconcile `product/package.json` as a union**

Preserve all integrated tests plus Atlas/canonical-plan suites.

- [ ] **Step 7: Resolve semantic conflicts one by one**

For Home/Class/lesson/Human Task preserve the final Intelligent UI authorities and safe return/full-view contracts. For UDA/Annual Plan/material evidence preserve the final Documentazione rule that `ACCEPTED` material is not automatically “used” and that Atlas/materials do not implicitly rewrite institutional documents, Annual Plan or Calendar.

- [ ] **Step 8: Run full Product CI**

Require migration replay, product tests, typecheck, lint and production build PASS on the exact candidate.

- [ ] **Step 9: Run exact-head certification**

Run Browser/HVA/WCAG/P6/X3/X4, P7, X5/X5B, K1 and security/readiness/governance gates where selected.

- [ ] **Step 10: Refresh the #692 PR body again after all code/conflict/certification changes**

This update is mandatory before final independent/Human Review. It must name the final exact candidate SHA, final migration mapping and only evidence from that exact candidate. Do not allow the final review to consume the orientation body from Step 1.

- [ ] **Step 11: Request independent review on the final exact candidate**

Focus: migration lineage, complete package-test union, final Intelligent UI authority, Documenti↔Materiali boundary, material-used evidence semantics and Atlas material atomicity.

- [ ] **Step 12: Human Review #692**

Judge the combined product and final exact-head evidence. Integration remains an explicit later decision; no automatic merge.

---

### Task 5: Final combined-state integration verification

- [ ] Verify unique migration lineage on integrated `develop`.
- [ ] Verify combined `product/package.json` test coverage.
- [ ] Re-run/inspect required post-merge gates on the integrated SHA rather than relying only on pre-merge heads.
- [ ] Validate authority boundaries: no Atlas implicit writes; “used material” requires session-linked evidence; Intelligent UI delegates state authority to canonical resolvers.
- [ ] Update the coordination checkpoint with final SHAs, migration mapping, evidence runs and CLOSED status.

---

### Task 6: Governance cleanup

**Ruling:** #687 cleanup was executed early because #688 was already merged and #687 was independently superseded; the closure is reversible and has no dependency on the remaining runtime integration chain.

- [x] #687 commented as superseded and closed without merge on 2026-10-09.
- [ ] Refresh #693 body to its final remediated/reviewed head before integration.
- [ ] Refresh #696 body to its final remediated/reviewed head before integration.
- [ ] Ensure #692 final body refresh is completed in Task 4 Step 10 before review.
- [ ] Close COORD-01 only when unique migrations, complete test union, combined exact-head evidence and no unresolved integration blocker are proven.
