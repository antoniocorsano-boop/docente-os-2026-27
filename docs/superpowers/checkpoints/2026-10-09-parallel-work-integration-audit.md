# DOCENTE OS — Parallel Work Integration Audit

**Date:** 2026-10-09  
**Repository:** `antoniocorsano-boop/docente-os-2026-27`  
**Coordination baseline:** `develop@a9006cb632fc5c3c9b1b0e4a9f2587c55c9c5ba2`  
**Status:** CANONICAL COORDINATION SNAPSHOT — refresh before every integration decision

## Purpose

Preserve the verified analysis of the parallel Docente OS workstreams and prevent individually green pull requests from being integrated in an order that creates migration-lineage collisions, test-script loss, authority drift, or invalid inherited certification.

This checkpoint is a coordination artifact only. It does not authorize merge, runtime modification, migration renumbering, or maturity promotion.

## Active workstreams

| PR | Workstream | Current head at audit | Role | Integration relationship |
| --- | --- | --- | --- | --- |
| #693 | DOC-04 — Documentazione / Relazione finale | `92493223465cb251d5274085d959cfd2406ec7ab` | Canonical specification — **REWORK** | MUST be remediated/re-reviewed before #695 |
| #695 | DOC-TPL-01 — Institutional Template Engine | `2c10ae1b2de5b7c757c14064307b20f13f73f695` | Runtime implementation — HOLD | Consumes final #693; must be refreshed and recertified against the integrated specification before integration |
| #696 | IUI-01 — Intelligent UI composition architecture | `416ecae32baa330460cb6982c469ec9b2ce54e49` | Canonical specification — **REWORK** | Two prior P2s remediated; return-path UI allowlist P2 still open and requires a new exact head |
| #697 | IUI-02/03 — Deterministic intelligent UI composition | `48c29451e37c388a99ed1fce72da4caa33c081fa` | Runtime implementation — HOLD | Based on prior #696 head `8ece0f9…`; requires refresh/TDD remediation after final #696 lands |
| #692 | UDA → Studio Atlas material handoff | `09a973a1782019a89aa62635a17222854e68e144` | Large runtime/materials tranche | Integrate last after rebase, migration-lineage reconciliation, package-test reconciliation and exact-head recertification |
| #647 | Argo BIFF8 XLS proof | `e5dd179f074421f08b2c7952238fa0764d643ce6` | Isolated proof | Outside current integration chain |

## Completed governance cleanup

- #687 — DOS-VIEW-CONV-01 design — `4677c8e6c6c5419d404bcfe9ec417b35ca0c0187` — **CLOSED / NOT MERGED / SUPERSEDED BY #688** on 2026-10-09. The design history remains available; it is no longer part of the active integration queue.

## Verified structural conflicts and active review deltas

### C1 — Runtime migration lineage collision — BLOCKER

PR #692 currently introduces:

- `0087_lesson_design_atlas_bundle_atomic_acceptance.sql`
- `0088_canonical_plan_runtime_identity.sql`
- `0089_lesson_design_atlas_material_kind_guard.sql`

and registers runtime schema versions 87 and 88 for the first two migrations.

PR #695 currently introduces:

- `0087_document_template_registry.sql`
- `0088_document_template_registry_review_fixes.sql`

and registers runtime schema version 87 for the document template registry.

Therefore #692 and #695 cannot both be integrated unchanged. This is a real runtime-lineage collision, not merely a filename conflict.

**Guardrail:** do not merge #692 until the earlier migration-owning work has been integrated and #692 has been rebased and renumbered against the actual then-current migration maximum. Any expected mapping such as 89/90/91 is provisional; the actual next contiguous versions MUST be recomputed from integrated `develop` after #695 is final.

### C2 — `product/package.json` test-script collision — REQUIRED RECONCILIATION

PRs #692, #695 and #697 all modify the single monolithic `test` script in `product/package.json` to append their own suites.

The changes are semantically compatible but line-conflicting. A later refresh/merge must preserve the union of:

- Atlas / canonical-plan tests from #692;
- document-template tests from #695;
- intelligent-UI tests from #697;
- all tests already present on integrated `develop`.

**Guardrail:** never accept a conflict resolution that chooses one branch's `test` line wholesale. Reconstruct it from integrated `develop` plus every new suite and verify Product CI.

### C3 — #696 remediation invalidates #697 specification alignment — REQUIRED REFRESH

Codex review of #696 found two initial P2 specification gaps on `8ece0f900…`:

1. full-view actions targeted a closed `<details>` disclosure without guaranteeing it would open;
2. sanitized `returnTo` was parsed but not exposed as an explicit return action in Classe.

Those two gaps were remediated on #696 head `416ecae32…` by requiring `view=all` + open disclosure behavior and an explicit registered return action. The re-review then found an additional valid P2: a generic same-origin sanitizer is insufficient for `CLASS_RETURN_TO_ORIGIN`, because `/api/**` and other route-handler/technical paths may have side effects.

**Current state:** #696 is still **REWORK**. The final specification must introduce a dedicated fail-closed allowlist of registered navigable UI surfaces for the pilot (YAGNI: Home is sufficient), explicitly rejecting `/api/**`, auth/handler routes, `/_next/**`, technical assets and all non-registered destinations. This requires a new exact head, fresh document gates and a new independent review before integration.

#697 remains based on the earlier #696 lineage. Direct comparison `416ecae… → 48c29451…` is `diverged`, ahead 18 / behind 1, merge-base `8ece0f900…`.

**Guardrail:** do not integrate #697 on its current head. After final #696 is reviewed and integrated, refresh #697 onto the resulting `develop`, implement the full reviewed contract delta with TDD, and repeat exact-head certification.

### C4 — #693 specification review — REWORK BEFORE INTEGRATION

Codex review of #693 head `9249322346…` produced five technically confirmed findings:

1. **P1:** Programmazione annuale must bind the accepted curricolo baseline for institution/year/class/discipline, including authority state, curricolo/version identity, structural/coverage footprint and revalidation requirements. `piano-annuale/model.ts` remains an operational projection, not a curricolo authority.
2. **P1:** the institutional visual base must be a first-class, independently versioned entity (`InstitutionalBase` / `InstitutionalBaseVersion`); each document/template version must pin both institutional-base version and family-template version.
3. **P1:** `LessonDesignExtension.status=ACCEPTED` means available/planned, not actually used. Consuntive documentation may mark material as used only from explicit TeachingSession-linked evidence/receipt.
4. **P2:** `FINALIZED` is allowed only after a valid persisted `VALIDATED` decision on the same immutable version, with mandatory inputs complete; direct/stale finalization must fail.
5. **P2:** first creation of a Relazione finale must atomically create the structured v1 and its manifest/provenance; a provenance-less/unstructured historical v1 followed by structured v2 is forbidden.

The accepted-curricolo dependency already exists in `develop@a9006cb…` through the canonical curriculum-applicability contract, so this remediation does not create a dependency cycle on #692.

**Guardrail:** #693 must receive docs-only remediation, exact-head gate replay and independent re-review before Human Review/integration. #695 must then consume the resulting specification; the current #695 implementation lacks a first-class `InstitutionalBaseVersion` and therefore requires a focused runtime TDD reassessment before integration.

## Verified dependency relationships

### D1 — #693 → #695

#695 implements the DOC-TPL-01 plan and canonical documentation/template contract developed in #693. The dependency is now material, not merely documentary, because the #693 review exposed a missing first-class institutional-base version in #695.

**Rule:** remediate and re-review #693 → integrate #693 → synchronize #695 with that exact integrated specification → TDD-remediate #695 as required → mandatory fresh exact-candidate certification and Human Review → only then integrate #695. This final #695 gate is required even if an earlier implementation SHA was already green.

### D2 — #696 → #697

The original #697 branch was 18 commits ahead of #696 head `8ece0f900…`. After #696 advanced to `416ecae…`, the branches diverged. #696 still has an active allowlist P2 and therefore is not integration-ready.

**Rule:** complete the allowlist remediation on a new #696 exact head, rerun gates/review, integrate final #696 with a normal **merge commit**, then refresh #697 and implement the reviewed runtime delta before relying on any #697 certification.

## Verified non-conflicts

### N1 — Documenti ↔ Materiali authority boundary

No authority inversion was found. The documentation contract states that Atlas/Materiali must not automatically rewrite UDA, Annual Plan or Calendar. #692 preserves the same rule: its Annual Plan changes resolve canonical source identity rather than granting Atlas write authority, and the UDA surface explicitly keeps the source unchanged and avoids implicit Annual Plan mutations.

**Status:** compatible, subject to post-rebase regression verification and the clarified distinction between material `ACCEPTED` and material actually used.

### N2 — Intelligent UI ↔ Materiali

No direct runtime conflict is currently identified beyond the shared `package.json` test line. #697 preserves deterministic state authorities while #692 changes inputs/manifests and class/lesson surfaces.

**Risk:** semantic drift after integration is possible because #692 modifies Human Task inputs consumed by the intelligent composition layer.

**Required proof after #692 rebase:** rerun the final Intelligent UI suites and Human Interaction/Browser certification on the combined exact head.

## Current certification evidence at audit

### #695 — `2c10ae1b…`

Historical exact-head evidence includes Product CI #2686 PASS, Browser Certification #959 PASS, P7 #520 PASS and clean independent review for the then-current contract. These results remain useful diagnostic evidence but are **not sufficient for integration after #693 remediation**.

### #696 — `416ecae…`

Document-only gates on this head are PASS, but independent re-review found the active return-path allowlist P2. Therefore this head is **not integration-ready**.

### #697 — `48c29451…`

Historical exact-head evidence includes Product CI #2707 PASS and Browser Certification #980 PASS. These prove that head against the prior specification, but are **not sufficient for integration after #696 remediation**.

### #692 — `09a973a…`

Verified exact-head evidence includes Product CI #2724 PASS, Browser Certification #997 PASS, P7 #540 PASS, X5/X5B PASS, K1 PASS, security/readiness gates PASS. QL-1 is selectively skipped, not failed. These are branch-local results only.

## Incongruences / governance debt

### G1 — #692 PR body is stale

The body still names an older exact head (`5a352dad…`) while GitHub currently reports `09a973a…`. The body must be refreshed twice where appropriate: once when beginning the final rebaseline so the work state is intelligible, and again **after all rebase/renumber/conflict-resolution changes and final exact-head certification, before independent/Human Review**, so the final reviewer never sees stale head/evidence claims.

### G2 — #687 superseded cleanup — CLOSED

#688 is already merged and contains the certified closeout. On 2026-10-09, #687 was explicitly commented as superseded and closed without merge.

### G3 — #696 PR body head label is stale after remediation

The #696 body still mentions `8ece0f900…` as current document head. Refresh it only after the final allowlist remediation has stabilized and before final Human Review/integration.

## Canonical integration order

Unless a new material dependency is discovered:

1. #693 — remediate five review findings, rerun exact-head doc gates/review, Human Review, then integrate the canonical documentation specification.
2. #695 — synchronize with integrated #693, TDD-remediate the institutional-base/version contract and any other specification delta, run mandatory fresh exact-candidate Product/Browser/P7/review/Human Review, then integrate.
3. #696 — remediate the return-path UI allowlist on a new exact head, rerun doc gates/review/Human Review, then integrate via merge commit.
4. #697 — refresh onto integrated #696, TDD-remediate full-view and safe return-to-origin behavior, reconcile test union, recertify and Human Review, then integrate.
5. #692 — rebase once onto the resulting `develop`, recompute/renumber migrations, reconcile `product/package.json`, resolve real semantic conflicts, recertify, refresh final PR body and Human Review, then integrate only after explicit decision.

## Rules while parallel work continues

1. Parallel implementation may continue on isolated branches, but #695/#697 are held from integration while their governing specifications are in REWORK.
2. Do not merge #692, #695 or #697 independently just because their historical branch CI is green.
3. Do not renumber #692 migrations early while upstream migration ownership is moving; do it once against the actual integrated lineage.
4. Rebase/synchronize a certified implementation when a material governing-spec dependency changes; #695 and #697 now both require fresh combined candidates before integration.
5. Never inherit PASS evidence across a rebase, migration renumbering, conflict resolution, governing-spec remediation or package-test reconciliation. New candidate/spec contract = new certification.
6. Preserve `DOS-A1=RUNTIME_DEFERRED`, no implicit writes, teacher authority, and existing Docente OS / Arena / Atlas / Studio Atlas boundaries.
7. No automatic merge.
8. Human Review remains the final gate after exact-candidate verification.

## Exit condition

This coordination snapshot is closed only when all listed integration-chain PRs have either been integrated in governed order or explicitly superseded, the final `develop` migration lineage is unique and monotonic, `product/package.json` contains the union of required tests, and the combined exact head has fresh Product CI + required Browser/P7/security/governance evidence.
