# DOCENTE OS — RC3 Freeze Preparation Design

**Date:** 2026-10-27  
**Base:** `develop@fe762e3c6f6c6f1e4d61f232729c29024ce96e0c`  
**Target:** prepare, but do not yet create, `v0.1.0-rc.3`

## Intent

Prepare a reviewable, exact-SHA release candidate boundary for the next `0.1.0` prerelease after `rc.2`, without moving existing tags and without promoting or modifying Production.

## Goals

- Align release version metadata with `0.1.0-rc.3` on a dedicated preparation branch; package and generated lockfile must agree before immutable freeze.
- Make `CHANGELOG.md` describe the actual release-preparation baseline rather than the prior `489d8ee6…` runtime baseline.
- Inventory every Supabase migration added after `v0.1.0-rc.2`.
- Record rollback compatibility conservatively and explicitly; do not call a rollback target safe unless demonstrated.
- Record exact freeze inputs: source baseline, scope, changed capabilities, gate expectations, known residuals, migration inventory, previous certified Production SHA, rollback assessment.
- Leave tag creation, GitHub prerelease publication, certification, merge and Production promotion as later governed decisions.

## Non-goals

- No application behavior change.
- No database migration execution.
- No Production deploy, rollback or redeploy.
- No tag or GitHub release creation in this preparation PR.
- No claim that `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde` is a safe rollback target until compatibility is proven against the current schema lineage.
- No M5/V1 promotion decision.

## Constraints

- Existing immutable RC tags remain unchanged.
- `develop` remains the candidate source branch; this work is isolated on `release/0.1.0-rc.3-prep`.
- `0.1.0-rc.3` is the next natural prerelease only because substantial product changes occurred after `0.1.0-rc.2`.
- `product/package.json` and the root package metadata in `product/package-lock.json` must both report `0.1.0-rc.3` before the immutable freeze. A mismatch is a preparation blocker, not an acceptable final state.
- The current certified Production reference remains `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`; the currently served non-canonically-certified Production SHA remains a separate provenance issue and is not altered here.
- Rollback compatibility is a release-governance property, not inferred from Git ancestry alone.

## Approaches considered

### A. Tag current `develop` immediately
Rejected. The package still reported `0.1.0-rc.2`, the changelog baseline was stale, and the migration/rollback evidence was incomplete.

### B. Prepare rc.3 in a dedicated PR, then freeze an exact qualified SHA
Selected. This gives one reviewable delta for version metadata, changelog, migration inventory and release-governance evidence before any immutable tag is created.

### C. Fold preparation directly into `develop`
Rejected. It weakens the exact-SHA review boundary and would make release metadata changes land before their freeze evidence is reviewed.

## Deliverables

1. `product/package.json` version `0.1.0-rc.3`.
2. `product/package-lock.json` synchronized to the same generated package version before immutable freeze.
3. `CHANGELOG.md` updated for release-preparation state and the actual preparation lineage.
4. `ops/release/0.1.0-rc.3-migration-inventory.json` listing migrations introduced after `v0.1.0-rc.2`.
5. `ops/release/0.1.0-rc.3-freeze-candidate.json` recording source baseline, scope, required gates, known residuals, previous certified SHA and rollback assessment.
6. A release-preparation PR targeting `develop`, kept unmerged until human review/authorization.

## Acceptance

The preparation PR is acceptable only if:

- it contains no application-runtime change;
- all release metadata is internally coherent; package and generated lockfile version metadata match before immutable freeze;
- the migration inventory is complete relative to `617b4f8901259ce2318ce721236241d7681b1c9c`;
- rollback is classified `VALIDATED` only with concrete evidence, otherwise explicitly `NOT_VALIDATED`/blocked;
- repository checks applicable to the documentation/configuration delta pass;
- no tag, prerelease, merge or Production action has occurred as a side effect.
