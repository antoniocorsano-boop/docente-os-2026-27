# DOCENTE OS RC3 Freeze Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare one reviewable branch/PR that makes the next `0.1.0-rc.3` freeze mechanically coherent without creating the immutable tag, publishing a prerelease, merging, or touching Production.

**Architecture:** Keep the delta release-metadata-only. Version metadata, changelog, migration inventory and freeze-candidate evidence must describe the same release-preparation lineage and must fail closed on rollback compatibility when evidence is insufficient.

**Tech Stack:** Git/GitHub, JSON release receipts, npm package metadata, Markdown governance docs.

**Spec:** `docs/superpowers/specs/2026-10-27-docente-os-rc3-freeze-preparation-design.md`

## Global Constraints

- Base is `develop@fe762e3c6f6c6f1e4d61f232729c29024ce96e0c`.
- No application-runtime code changes.
- No migration execution.
- No tag, prerelease, merge, Production deploy, rollback or redeploy.
- Existing `v0.1.0-rc.1` and `v0.1.0-rc.2` remain immutable.
- Previous canonically certified Production SHA is `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`.
- Rollback may be `VALIDATED` only with concrete compatibility evidence.

## Review Focus

- Version/changelog mismatch after the metadata bump.
- Package/lockfile version mismatch before immutable freeze.
- Missing migration between rc.2 and the preparation branch.
- Accidental claim that rollback is safe without schema compatibility evidence.
- Stale exact SHA copied from the pre-#762 Beta baseline.
- Any accidental tag/release/Production side effect.

---

### Task 1: Release version metadata

**Files:**
- Modify: `product/package.json`
- Modify before immutable freeze: `product/package-lock.json`

- [x] Verify the starting package version is exactly `0.1.0-rc.2`.
- [x] Change the package version to `0.1.0-rc.3`.
- [x] Re-read `package.json` and verify the version is exactly `0.1.0-rc.3`.
- [x] Detect that `package-lock.json` also carries `0.1.0-rc.2` generated metadata in the root document and root package entry.
- [ ] Regenerate/synchronize `package-lock.json` so both generated version fields are exactly `0.1.0-rc.3`; immutable freeze remains blocked until complete.

### Task 2: Migration inventory and rollback assessment

**Files:**
- Create: `ops/release/0.1.0-rc.3-migration-inventory.json`
- Create: `ops/release/0.1.0-rc.3-freeze-candidate.json`

- [x] Enumerate migrations present on the preparation branch but absent from rc.2 candidate `617b4f8901259ce2318ce721236241d7681b1c9c`.
- [x] Record exact ordered filenames and counts in the inventory: 23 migrations, `0081` through `0103`.
- [x] Record the preparation base, scope, required gates, known residuals and previous certified Production SHA.
- [x] Classify rollback conservatively as `NOT_VALIDATED`; block rollback-safety claim and immutable freeze.
- [ ] Complete the backward code/schema compatibility assessment for migrations `0081–0103` and either validate `db3d4ab…` or establish another previously certified compatible rollback target.
- [ ] Record the database recovery/restore strategy required if application rollback is invoked.

### Task 3: Changelog coherence

**Files:**
- Modify: `CHANGELOG.md`

- [x] Replace stale wording that described `489d8ee6…` as current develop with the distinction between the qualified product/Beta baseline and `develop@fe762e3c…` release-preparation source baseline.
- [x] State that `0.1.0-rc.3` is being prepared and is not yet tagged, certified or promoted.
- [x] Link the migration inventory and rollback status without claiming validation.
- [x] Record the package-lock synchronization as a freeze blocker.

### Task 4: Whole-branch verification and PR

**Files:**
- Review all branch changes against `develop@fe762e3c…`.

- [ ] Confirm changed paths are limited to release preparation metadata/docs.
- [ ] Confirm `v0.1.0-rc.3` does not exist before PR creation.
- [ ] Confirm no Production action occurred.
- [ ] Open a Draft PR targeting `develop` with exact base, scope, rollback status and explicit non-goals.
- [ ] Observe applicable CI/checks and report their actual state; do not merge.
