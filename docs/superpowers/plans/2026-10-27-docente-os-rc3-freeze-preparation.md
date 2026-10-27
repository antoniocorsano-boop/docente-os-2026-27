# DOCENTE OS RC3 Freeze Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare one reviewable branch/PR that makes the next `0.1.0-rc.3` freeze mechanically coherent without creating the immutable tag, publishing a prerelease, merging, or touching Production.

**Architecture:** Keep the delta release-metadata-only until rollback proof work begins. Version metadata, changelog, migration inventory and freeze-candidate evidence must describe the same release-preparation lineage and must fail closed on rollback compatibility when evidence is insufficient. A rollback proof may add a dedicated verification harness, but it must not mutate Production or execute repository migrations against Production.

**Tech Stack:** Git/GitHub, JSON release receipts, npm package metadata, Markdown governance docs, GitHub Actions, ephemeral local Supabase.

**Spec:** `docs/superpowers/specs/2026-10-27-docente-os-rc3-freeze-preparation-design.md`

## Global Constraints

- Base is `develop@fe762e3c6f6c6f1e4d61f232729c29024ce96e0c`.
- No application-runtime product behavior changes.
- No Production migration execution.
- No tag, prerelease, merge, Production deploy, rollback or redeploy.
- Existing `v0.1.0-rc.1` and `v0.1.0-rc.2` remain immutable.
- Previous canonically certified Production SHA is `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`.
- Rollback may be `VALIDATED` only with concrete compatibility evidence.

## Review Focus

- Version/changelog mismatch after the metadata bump.
- Missing migration between rc.2 and the preparation branch.
- Accidental claim that rollback is safe without schema compatibility evidence.
- Stale exact SHA copied from the pre-#762 Beta baseline.
- Any accidental tag/release/Production side effect.

---

### Task 1: Release version metadata

**Files:**
- Modify: `product/package.json`
- Modify: `product/package-lock.json`

- [x] Verify the starting package version was exactly `0.1.0-rc.2`.
- [x] Change only the package version to `0.1.0-rc.3`.
- [ ] Synchronize the lockfile top-level and root-package versions from `0.1.0-rc.2` to `0.1.0-rc.3` without normalizing unrelated lockfile content.
- [ ] Re-read both files and verify package/lockfile coherence.

### Task 2: Migration inventory and rollback assessment

**Files:**
- Create: `ops/release/0.1.0-rc.3-migration-inventory.json`
- Create: `ops/release/0.1.0-rc.3-freeze-candidate.json`
- Add verification harness/evidence only as required to prove old-binary/current-schema compatibility.

- [x] Enumerate migrations present on the preparation branch but absent from rc.2 candidate `617b4f8901259ce2318ce721236241d7681b1c9c`.
- [x] Record exact ordered filenames and counts in the inventory.
- [x] Record the preparation base, scope, required gates, known residuals and previous certified Production SHA.
- [x] Classify rollback conservatively; current state is `NOT_VALIDATED`.
- [x] Perform read-only Beta schema/data-state audit: schema watermark `0103`, lineage/provenance/containment OK, zero CPRI movements, observed authority epochs all `0`.
- [ ] Add a reproducible old-certified-binary/current-schema compatibility proof using an ephemeral local Supabase replay of the current migration chain; do not use or mutate Production.
- [ ] Exercise the old certified SHA `db3d4ab…` against the replayed current schema at least at build/start plus database-contract surface level.
- [ ] Record the database recovery/restore rule: application rollback never implies schema downgrade; database restore is a separately authorized recovery action.
- [ ] Only if the compatibility proof passes, change rollback classification from `NOT_VALIDATED` to `VALIDATED_FOR_APPLICATION_ROLLBACK_WITH_CURRENT_SCHEMA`; otherwise leave the blocker closed-fail.

### Task 3: Changelog coherence

**Files:**
- Modify: `CHANGELOG.md`

- [x] Replace stale wording that said current develop/Beta was `489d8ee6…` with release-preparation wording anchored to the rc.3 preparation lineage.
- [x] State that `0.1.0-rc.3` is being prepared and is not yet tagged, certified or promoted.
- [x] Link the migration inventory and rollback status without claiming validation.
- [x] Verify the changelog contains no statement that rc.3 already exists as an immutable tag or prerelease.

### Task 4: Whole-branch verification and PR

**Files:**
- Review all branch changes against `develop@fe762e3c…`.

- [x] Confirm initial changed paths were limited to release preparation metadata/docs.
- [x] Confirm `v0.1.0-rc.3` did not exist before PR creation.
- [x] Confirm no Production action occurred.
- [x] Open Draft PR #765 targeting `develop` with exact base, scope, rollback status and explicit non-goals.
- [ ] After lockfile/proof changes, re-run exact-head CI and review the complete final diff.
- [ ] Keep PR Draft until all freeze blockers are either closed with evidence or explicitly retained as blockers.
