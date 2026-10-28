# DOCENTE OS — RC3 Freeze Preparation Design

**Date:** 2026-10-27  
**Base:** `develop@fe762e3c6f6c6f1e4d61f232729c29024ce96e0c`  
**Target:** prepare, but do not yet create, `v0.1.0-rc.3`

## Intent

Prepare a reviewable, exact-SHA release candidate boundary for the next `0.1.0` prerelease after `rc.2`, without moving existing tags and without promoting or modifying Production.

## Goals

- Align package and generated lockfile version metadata with `0.1.0-rc.3` on a dedicated preparation branch.
- Make `CHANGELOG.md` describe the actual release-preparation baseline rather than the prior `489d8ee6…` runtime baseline.
- Inventory every Supabase migration added after `v0.1.0-rc.2`.
- Demonstrate rollback compatibility rather than inferring it from ancestry or additive schema shape.
- Record exact freeze inputs: source baseline, scope, changed capabilities, gate expectations, known residuals, migration inventory, previous certified Production SHA, rollback assessment and recovery semantics.
- Leave tag creation, GitHub prerelease publication, rollback-target certification, merge and Production promotion as later governed decisions.

## Non-goals

- No application behavior change.
- No Production database migration execution.
- No Production Supabase resume/restore.
- No Production deploy, rollback or redeploy.
- No tag or GitHub release creation in this preparation PR.
- No M5/V1 promotion decision.

## Constraints

- Existing immutable RC tags remain unchanged.
- `develop` remains the candidate source branch; this work is isolated on `release/0.1.0-rc.3-prep`.
- `0.1.0-rc.3` is the next natural prerelease only because substantial product changes occurred after `0.1.0-rc.2`.
- `product/package.json` and root package metadata in `product/package-lock.json` must both report `0.1.0-rc.3`; this is satisfied.
- The last canonically certified Production reference remains `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`; the currently served non-canonically-certified Production SHA remains a separate provenance issue and is not altered here.
- Rollback compatibility is a release-governance property, not inferred from Git ancestry alone.
- Technical compatibility does not itself certify a rollback target. Certification remains a separate governed decision.
- Application rollback means deploying an older compatible application against the current schema. It never implicitly downgrades the database. Database restore is a separate recovery action requiring independent authorization and evidence.

## Approaches considered

### A. Tag current `develop` immediately
Rejected. Immutable release metadata and rollback evidence must be coherent first.

### B. Prepare rc.3 in a dedicated PR, then freeze an exact qualified SHA
Selected. This gives one reviewable boundary for version metadata, changelog, migration inventory, rollback evidence and release-governance state before any immutable tag is created.

### C. Fold preparation directly into `develop`
Rejected. It weakens the exact-SHA review boundary and would make release metadata changes land before their freeze evidence is reviewed.

## Rollback compatibility proof — previous certified Production target

The proof is deliberately fail-closed and uses no Production mutation:

1. replay the complete current migration chain on an ephemeral local Supabase instance;
2. verify current runtime schema contracts and watermark `0103_material_reference_safety`;
3. checkout the last canonically certified application SHA `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde` unchanged;
4. run its product tests, typecheck, build and startup against the current Beta Supabase configuration;
5. execute its authenticated browser journey against the current data plane;
6. bind the result to both old application SHA and tested preparation SHA.

Workflow run `40584199311` produced:

- current schema replay: **PASS**;
- old application exact checkout: **PASS**;
- old product tests: **209/209 PASS**;
- old typecheck/build/startup: **PASS**;
- old authenticated browser journey: **FAIL** at workspace bootstrap.

The failure is causal, not fixture speculation. At `2026-10-27T21:17:05.365Z`, Beta Postgres emitted SQLSTATE `42501`, message `aal2 required`, from `public.bootstrap_personal_workspace(text) line 11 at RAISE`. Migration `0051_mfa_aal2_enforcement.sql` requires `private.current_session_is_aal2()` before bootstrap. The certified August SHA predates migration `0051`, has no `/mfa` route, and its login helper proceeds directly from password login to workspace bootstrap. The current application instead establishes AAL2 through the MFA route before bootstrap.

Therefore `db3d4ab…` is **INCOMPATIBLE_WITH_CURRENT_AAL2_DATA_PLANE** and is not an eligible rollback target for rc.3. Weakening AAL2 to make it pass is prohibited.

## Compatible rollback candidate follow-up — rc.2

Because `v0.1.0-rc.2` was published after the MFA/AAL2 boundary, it was qualified separately without changing this preparation branch. Draft PR #766 runs the exact immutable rc.2 candidate `617b4f8901259ce2318ce721236241d7681b1c9c` against the current Beta data plane at runtime schema watermark `0103_material_reference_safety`.

Final qualification head `d3edcaf66730f0457d42559d08595ac45da70b80`, run `40591418391`, produced:

- governed AAL2 credential precondition: **PASS**;
- exact rc.2 checkout and package identity: **PASS**;
- rc.2 product tests and typecheck: **PASS**;
- rc.2 build and real startup against current Beta configuration: **PASS**;
- Chromium + rc.2 HVA against current Beta: **PASS**;
- receipt generation/enforcement and published qualification status: **PASS**;
- required observations: **26/26 PASS**;
- journey receipts: **16 PASS / 0 FAIL**;
- findings: **0**;
- evidence artifact `12774313447`, digest `sha256:f2592ab6907157373476c86f1da303f8804c173ee90b5390c39a94229d2194eb`.

This establishes `rc.2@617b4f8…` as **DEMONSTRATED_COMPATIBLE_WITH_CURRENT_AAL2_DATA_PLANE**. It does **not** make rc.2 a certified rollback target: the published rc.2 prerelease remains explicitly non-CERTIFIED/non-PROMOTED until a separate governed certification decision says otherwise.

## Freeze consequence

The technical compatibility search now has a positive candidate, but the immutable rc.3 freeze remains blocked on **rollback-target certification**, not on package metadata and not on unresolved compatibility.

The next governed sequence is:

1. separately certify `rc.2@617b4f8…` as the canonical rollback target, using the exact qualification evidence from PR #766;
2. update the rc.3 freeze receipt to bind that certified rollback target;
3. re-run exact-head qualification on the final rc.3 preparation head;
4. only then consider the immutable rc.3 tag/prerelease decision.

None of those later decisions authorize Production promotion, rollback or database restore.

## Deliverables

1. `product/package.json` version `0.1.0-rc.3`.
2. `product/package-lock.json` root versions synchronized to `0.1.0-rc.3` without unrelated lockfile churn.
3. `CHANGELOG.md` updated for release-preparation state and the actual preparation lineage.
4. `ops/release/0.1.0-rc.3-migration-inventory.json` listing migrations introduced after `v0.1.0-rc.2`.
5. `ops/release/0.1.0-rc.3-freeze-candidate.json` recording source baseline, scope, required gates, known residuals and rollback certification block.
6. `ops/release/0.1.0-rc.3-rollback-compatibility.json` recording both the negative proof for `db3d4ab…` and the positive technical-compatibility proof for rc.2.
7. `.github/workflows/release-rollback-compatibility.yml` preserving the reproducible negative proof for the previous certified Production target.
8. A Draft release-preparation PR targeting `develop`, kept unmerged until a later governed decision.

## Acceptance

The preparation PR is accurate only if:

- it contains no application-runtime product behavior change;
- package and generated lockfile versions agree;
- the migration inventory is complete relative to `617b4f8901259ce2318ce721236241d7681b1c9c`;
- `db3d4ab…` remains reported as incompatible and unsafe;
- rc.2 compatibility evidence is reported exactly as observed and never mislabeled as certification;
- immutable freeze remains blocked while the compatible rc.2 candidate is not separately certified as the rollback target;
- database recovery semantics never conflate application rollback with schema downgrade;
- no tag, prerelease, merge or Production action occurs as a side effect.
