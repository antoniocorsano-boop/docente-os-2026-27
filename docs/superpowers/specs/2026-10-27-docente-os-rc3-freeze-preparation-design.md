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
- Leave tag creation, GitHub prerelease publication, certification, merge and Production promotion as later governed decisions.

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
- `product/package.json` and root package metadata in `product/package-lock.json` must both report `0.1.0-rc.3`; this is now satisfied.
- The current certified Production reference remains `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`; the currently served non-canonically-certified Production SHA remains a separate provenance issue and is not altered here.
- Rollback compatibility is a release-governance property, not inferred from Git ancestry alone.
- Application rollback means deploying an older compatible application against the current schema. It never implicitly downgrades the database. Database restore is a separate recovery action requiring independent authorization and evidence.

## Approaches considered

### A. Tag current `develop` immediately
Rejected. Immutable release metadata and rollback evidence must be coherent first.

### B. Prepare rc.3 in a dedicated PR, then freeze an exact qualified SHA
Selected. This gives one reviewable boundary for version metadata, changelog, migration inventory, rollback evidence and release-governance state before any immutable tag is created.

### C. Fold preparation directly into `develop`
Rejected. It weakens the exact-SHA review boundary and would make release metadata changes land before their freeze evidence is reviewed.

## Rollback compatibility proof

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

Therefore `db3d4ab…` is **INCOMPATIBLE_WITH_CURRENT_AAL2_DATA_PLANE** and is not an eligible rollback target for rc.3.

This is a valid negative proof: the rollback gate must remain red. Changing security policy or weakening AAL2 to make the old binary pass is explicitly prohibited.

## Freeze consequence

The immutable rc.3 freeze remains blocked because no already-certified, current-schema-compatible rollback target is presently known. This is not a package/version defect and not a reason to weaken the release contract.

A future freeze requires one of these governed outcomes:

1. establish another **already-certified** exact application SHA that is demonstrably compatible with the current AAL2 data plane; or
2. perform a separate governed certification process for a compatible rollback target before the rc.3 freeze contract is satisfied.

Neither action is authorized by this preparation PR.

## Deliverables

1. `product/package.json` version `0.1.0-rc.3`.
2. `product/package-lock.json` root versions synchronized to `0.1.0-rc.3` without unrelated lockfile churn.
3. `CHANGELOG.md` updated for release-preparation state and the actual preparation lineage.
4. `ops/release/0.1.0-rc.3-migration-inventory.json` listing migrations introduced after `v0.1.0-rc.2`.
5. `ops/release/0.1.0-rc.3-freeze-candidate.json` recording source baseline, scope, required gates, known residuals and rollback block.
6. `ops/release/0.1.0-rc.3-rollback-compatibility.json` recording the negative old-binary/current-schema proof.
7. `.github/workflows/release-rollback-compatibility.yml` preserving the reproducible gate.
8. A Draft release-preparation PR targeting `develop`, kept unmerged until a later governed decision.

## Acceptance

The preparation PR is accurate only if:

- it contains no application-runtime product behavior change;
- package and generated lockfile versions agree;
- the migration inventory is complete relative to `617b4f8901259ce2318ce721236241d7681b1c9c`;
- rollback evidence is reported exactly as observed, including a FAIL;
- no document calls `db3d4ab…` compatible or safe;
- immutable freeze remains blocked while no eligible certified compatible rollback target exists;
- database recovery semantics never conflate application rollback with schema downgrade;
- no tag, prerelease, merge or Production action occurs as a side effect.
