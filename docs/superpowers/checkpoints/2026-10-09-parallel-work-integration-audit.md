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
| #693 | DOC-04 — Documentazione / Relazione finale | `92493223465cb251d5274085d959cfd2406ec7ab` | Canonical specification | MUST precede #695 |
| #695 | DOC-TPL-01 — Institutional Template Engine | `2c10ae1b2de5b7c757c14064307b20f13f73f695` | Runtime implementation | Implements #693; keep Draft until canonical spec is integrated and final gate is repeated |
| #696 | IUI-01 — Intelligent UI composition architecture | `416ecae32baa330460cb6982c469ec9b2ce54e49` | Canonical specification | MUST precede #697; includes review remediation for full-view reveal and return-to-origin continuity |
| #697 | IUI-02/03 — Deterministic intelligent UI composition | `48c29451e37c388a99ed1fce72da4caa33c081fa` | Runtime implementation | Based on prior #696 head `8ece0f9…`; now ahead 18 / behind 1 and requires refresh/remediation after #696 lands |
| #692 | UDA → Studio Atlas material handoff | `09a973a1782019a89aa62635a17222854e68e144` | Large runtime/materials tranche | Integrate last after rebase, migration-lineage reconciliation, package-test reconciliation and exact-head recertification |
| #647 | Argo BIFF8 XLS proof | `e5dd179f074421f08b2c7952238fa0764d643ce6` | Isolated proof | Outside current integration chain |

## Completed governance cleanup

- #687 — DOS-VIEW-CONV-01 design — `4677c8e6c6c5419d404bcfe9ec417b35ca0c0187` — **CLOSED / NOT MERGED / SUPERSEDED BY #688** on 2026-10-09. The design history remains available; it is no longer part of the active integration queue.

## Verified structural conflicts

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

**Guardrail:** do not merge #692 until the earlier migration-owning work has been integrated and #692 has been rebased and renumbered against the actual then-current migration maximum. If no other migration lands first, the expected mapping is #692 `0087→0089`, `0088→0090`, `0089→0091`; the actual mapping MUST be recomputed from the integrated repository at execution time.

### C2 — `product/package.json` test-script collision — REQUIRED RECONCILIATION

PRs #692, #695 and #697 all modify the single monolithic `test` script in `product/package.json` to append their own suites.

The changes are semantically compatible but line-conflicting. A later rebase/merge must preserve the union of:

- Atlas / canonical-plan tests from #692;
- document-template tests from #695;
- intelligent-UI tests from #697;
- all tests already present on integrated `develop`.

**Guardrail:** never accept a conflict resolution that chooses one branch's `test` line wholesale. Reconstruct it from integrated `develop` plus every new suite and verify Product CI.

### C3 — #696 remediation invalidates #697 specification alignment — REQUIRED REFRESH

Codex review of #696 found two P2 specification gaps on `8ece0f900…`:

1. full-view actions targeted a closed `<details>` disclosure without guaranteeing it would open;
2. sanitized `returnTo` was parsed but not exposed as an explicit return action in Classe.

Both were corrected in #696 commit `416ecae32baa330460cb6982c469ec9b2ce54e49` by requiring `view=all` + open disclosure behavior, explicit browser assertions, and a registered `CLASS_RETURN_TO_ORIGIN` action with re-sanitization/fallback.

#697 remains based on the previous #696 head. Direct comparison `416ecae… → 48c29451…` is `diverged`, ahead 18 / behind 1, merge-base `8ece0f900…`.

**Guardrail:** do not integrate #697 on its current head. After #696 is reviewed and integrated, refresh/rebase #697 onto the new `develop`, implement any runtime contract delta required by the remediated specification (including registry/continuity/full-view behavior), then repeat TDD and exact-head certification.

## Verified dependency relationships

### D1 — #693 → #695

#695 implements the DOC-TPL-01 plan and canonical documentation/template contract developed in #693. The file overlap is low, but governance order matters.

**Rule:** canonical specification #693 first; runtime #695 second.

### D2 — #696 → #697

The original #697 branch was 18 commits ahead of #696 head `8ece0f900…`. After review remediation advanced #696 to `416ecae…`, the branches are now diverged: #697 is ahead 18 and behind 1, with merge-base `8ece0f900…`.

**Rule:** finish/review #696 first and integrate it with a normal **merge commit**. Then refresh #697 onto that integrated state and explicitly implement the new specification delta before relying on any prior #697 certification.

## Verified non-conflicts

### N1 — Documenti ↔ Materiali authority boundary

No authority inversion was found. The documentation contract states that Atlas/Materiali must not automatically rewrite UDA, Annual Plan or Calendar. #692 preserves the same rule: its Annual Plan changes resolve canonical source identity rather than granting Atlas write authority, and the UDA surface explicitly keeps the source unchanged and avoids implicit Annual Plan mutations.

**Status:** compatible, subject to post-rebase regression verification.

### N2 — Intelligent UI ↔ Materiali

No direct runtime conflict is currently identified beyond the shared `package.json` test line. #697 preserves deterministic state authorities while #692 changes inputs/manifests and class/lesson surfaces.

**Risk:** semantic drift after integration is possible because #692 modifies Human Task inputs consumed by the intelligent composition layer.

**Required proof after #692 rebase:** rerun the Intelligent UI suites and Human Interaction/Browser certification on the combined exact head.

## Current certification evidence at audit

### #695 — `2c10ae1b…`

Verified exact-head evidence includes Product CI #2686 PASS, Browser Certification #959 PASS, P7 #520 PASS, Codex independent review complete with no fresh finding.

### #696 — `416ecae…`

Document-only gates on the remediated head are PASS: Human Interaction Model, TRAMA Perceptible Write, Certification Impact Classifier and Governed MFA Queue Hygiene. Independent re-review is pending at this snapshot.

### #697 — `48c29451…`

Historical exact-head evidence includes Product CI #2707 PASS and Browser Certification #980 PASS. These prove that head against the prior specification, but are **not sufficient for integration after #696 remediation**.

### #692 — `09a973a…`

Verified exact-head evidence includes Product CI #2724 PASS, Browser Certification #997 PASS, P7 #540 PASS, X5/X5B PASS, K1 PASS, security/readiness gates PASS. QL-1 is selectively skipped, not failed.

These PASS results prove each branch individually. They MUST NOT be treated as proof that the combined integrated state is valid.

## Incongruences / governance debt

### G1 — #692 PR body is stale

The body still names an older exact head (`5a352dad…`) while GitHub currently reports `09a973a…`, 110 commits and 65 changed files. The body must be refreshed before final Human Review/integration.

### G2 — #687 superseded cleanup — CLOSED

#688 (view convergence implementation) is already merged and contains the certified closeout. On 2026-10-09, #687 was explicitly commented as superseded and closed without merge. No further integration action is required for #687.

### G3 — #696 PR body head label is stale after remediation

The #696 body still mentions `8ece0f900…` as current document head, while GitHub now reports `416ecae…`. Refresh the body before final Human Review/integration.

## Canonical integration order

Unless a new material dependency is discovered, use this sequence:

1. #693 — canonical documentation specification.
2. #695 — template-engine implementation, after refreshing exact-head evidence against integrated #693 if required.
3. #696 — intelligent-UI architecture, after independent re-review of `416ecae…`; use a merge commit.
4. #697 — refresh/rebase onto integrated #696, implement the remediated continuity/full-view contract, recertify, then integrate.
5. #692 — rebase onto the resulting `develop`, recompute/renumber migrations, reconcile `product/package.json`, resolve any real file/semantic conflicts, then perform full exact-head recertification and Human Review.

## Rules while parallel work continues

1. Parallel implementation may continue on isolated branches.
2. Do not merge #692, #695 or #697 independently just because their own CI is green.
3. Do not renumber #692 migrations early while upstream migration ownership is still moving; do it once against the actual integrated lineage.
4. Do not rebase certified branches merely for cosmetic freshness. Rebase when entering their integration step or when a material base/spec dependency requires it; #697 now has such a material dependency on remediated #696.
5. Never inherit PASS evidence across a rebase, migration renumbering, conflict resolution, specification remediation or package-test reconciliation. New exact head/spec contract = new certification.
6. Preserve `DOS-A1=RUNTIME_DEFERRED`, no implicit writes, teacher authority, and existing Docente OS / Arena / Atlas / Studio Atlas boundaries.
7. No automatic merge.
8. Human Review remains the final gate after combined-state verification.

## Exit condition

This coordination snapshot is closed only when all listed integration-chain PRs have either been integrated in governed order or explicitly superseded, the final `develop` migration lineage is unique and monotonic, `product/package.json` contains the union of required tests, and the combined exact head has fresh Product CI + required Browser/P7/security/governance evidence.
