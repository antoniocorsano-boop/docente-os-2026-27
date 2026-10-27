# DOCENTE OS RC3 Freeze Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare one reviewable branch/PR that makes the next `0.1.0-rc.3` freeze mechanically coherent without creating the immutable tag, publishing a prerelease, merging, or touching Production.

**Architecture:** Keep the product runtime unchanged. Version metadata, changelog, migration inventory, rollback proof and freeze-candidate evidence must describe the same release-preparation lineage and fail closed when no eligible rollback target exists.

**Tech Stack:** Git/GitHub, JSON release receipts, npm package metadata, Markdown governance docs, GitHub Actions, ephemeral local Supabase.

**Spec:** `docs/superpowers/specs/2026-10-27-docente-os-rc3-freeze-preparation-design.md`

## Global Constraints

- Base is `develop@fe762e3c6f6c6f1e4d61f232729c29024ce96e0c`.
- No application-runtime product behavior changes.
- No Production migration execution or Production Supabase restore/resume.
- No tag, prerelease, merge, Production deploy, rollback or redeploy.
- Existing `v0.1.0-rc.1` and `v0.1.0-rc.2` remain immutable.
- Previous canonically certified Production SHA is `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`.
- Rollback may be accepted only with concrete compatibility evidence; a causal FAIL remains a blocker.

## Review Focus

- Version/changelog mismatch after the metadata bump.
- Missing migration between rc.2 and the preparation branch.
- Any attempt to call an AAL2-incompatible old binary a safe rollback target.
- Stale exact SHA copied from the pre-#762 Beta baseline.
- Any accidental tag/release/Production side effect.

---

### Task 1: Release version metadata

**Files:**
- Modify: `product/package.json`
- Modify: `product/package-lock.json`

- [x] Verify the starting package version was exactly `0.1.0-rc.2`.
- [x] Change only the package version to `0.1.0-rc.3`.
- [x] Synchronize the lockfile top-level and root-package versions from `0.1.0-rc.2` to `0.1.0-rc.3` without normalizing unrelated lockfile content.
- [x] Re-read both files and verify package/lockfile coherence.

### Task 2: Migration inventory and rollback assessment

**Files:**
- Create: `ops/release/0.1.0-rc.3-migration-inventory.json`
- Create: `ops/release/0.1.0-rc.3-freeze-candidate.json`
- Create: `ops/release/0.1.0-rc.3-rollback-compatibility.json`
- Add: `.github/workflows/release-rollback-compatibility.yml`

- [x] Enumerate migrations present on the preparation branch but absent from rc.2 candidate `617b4f8901259ce2318ce721236241d7681b1c9c`.
- [x] Record exact ordered filenames and counts in the inventory.
- [x] Record the preparation base, scope, required gates, known residuals and previous certified Production SHA.
- [x] Perform read-only Beta schema/data-state audit: schema watermark `0103`, lineage/provenance/containment OK, zero CPRI movements, observed authority epochs all `0`.
- [x] Add a reproducible old-certified-binary/current-schema compatibility workflow using ephemeral local Supabase replay and current Beta data plane, without Production mutation.
- [x] Replay the current migration chain and current DB contracts: PASS.
- [x] Exercise certified SHA `db3d4ab…`: exact checkout PASS; product tests 209/209 PASS; typecheck PASS; build PASS; startup PASS.
- [x] Exercise authenticated browser entry against the current data plane: FAIL at workspace bootstrap.
- [x] Prove the cause from database logs: `aal2 required`, SQLSTATE `42501`, raised by `public.bootstrap_personal_workspace(text)` at the exact failure timestamp.
- [x] Verify the compatibility boundary: current migration `0051_mfa_aal2_enforcement.sql` requires AAL2; the certified August SHA predates `0051`, has no `/mfa` route and bootstraps immediately after password login.
- [x] Record the database recovery/restore rule: application rollback never implies schema downgrade; database restore is a separately authorized recovery action.
- [x] Classify `db3d4ab…` as `INCOMPATIBLE_WITH_CURRENT_AAL2_DATA_PLANE`; safe rollback claim prohibited.
- [ ] Establish an eligible already-certified AAL2-compatible rollback target, or separately complete a governed certification process for a compatible rollback target. **Not authorized in this preparation task.**

### Task 3: Changelog coherence

**Files:**
- Modify: `CHANGELOG.md`

- [x] Anchor rc.3 preparation to `develop@fe762e3c…`.
- [x] State that `0.1.0-rc.3` is being prepared and is not yet tagged, certified or promoted.
- [x] Link migration inventory and package/lockfile coherence.
- [x] Record the causal rollback incompatibility and the resulting immutable-freeze block.
- [x] Verify the changelog contains no statement that rc.3 already exists as an immutable tag or prerelease.

### Task 4: Whole-branch verification and PR

**Files:**
- Review all branch changes against `develop@fe762e3c…`.

- [x] Confirm initial changed paths were limited to release preparation metadata/docs.
- [x] Confirm `v0.1.0-rc.3` did not exist before PR creation.
- [x] Confirm no Production action occurred.
- [x] Open Draft PR #765 targeting `develop` with exact base, scope, rollback status and explicit non-goals.
- [ ] Re-run exact-head CI after final evidence/doc updates.
- [ ] Review the complete final diff and open review threads.
- [ ] Confirm tag/prerelease remain absent and Production remains untouched.
- [ ] Keep PR Draft and do not mark freeze-ready while the rollback gate is red.
