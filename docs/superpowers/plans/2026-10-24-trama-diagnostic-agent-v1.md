# TRAMA Diagnostic Agent v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Product CI and HVA failures produce one deterministic, redacted, AI-readable diagnostic packet without changing canonical gate semantics.

**Architecture:** A repository-owned Node CLI assembles stage logs and structured evidence into `diagnostic-manifest.json` plus `ai-brief.md`. Product CI first captures typecheck/test/lint/build evidence and calls the assembler only on failure; HVA later feeds its existing Playwright/acceptance evidence into the same schema. The temporary lint-only diagnostic workflow is retired once Product CI has equivalent coverage.

**Tech Stack:** Node.js 22, GitHub Actions, ESLint JSON formatter, existing Product CI/HVA artifacts.

**Spec:** `docs/superpowers/specs/2026-10-24-trama-diagnostic-agent-v1-design.md`

## Global Constraints

- Diagnostics are observational and MUST preserve the canonical gate result.
- No automatic patch, merge, deploy, or canonical-data mutation.
- No external AI API, provider secret, or paid inference.
- Exact tested SHA and base SHA are mandatory packet fields.
- Logs and manifests MUST redact credential-like values.
- HVA integration MUST NOT disturb the current PR #747 HVA candidate while it is in the governed MFA queue.

## Review Focus

- A failure before later stages run must still identify the first failing stage and produce a valid packet.
- ESLint pretty output must never be parsed when JSON diagnostics are available.
- Credential-like strings in captured output must not survive in the manifest or AI brief.
- A green Product CI must not upload a failure packet or change gate semantics.
- HVA packet generation must consume existing evidence rather than rerun browser acceptance.

---

### Task 1: Diagnostic packet engine

**Files:**
- Create: `.github/scripts/diagnostics/diagnostic-packet.mjs`
- Create: `.github/scripts/certification/diagnostic-packet.test.mjs`

**Interfaces:**
- Consumes: stage files under one input directory (`<stage>.log`, `<stage>.exit`, optional `eslint.json`, optional test failure index), changed-file list, SHA/run metadata.
- Produces: `diagnostic-manifest.json` and `ai-brief.md` through a CLI with `--input-dir`, `--source`, `--exact-head`, `--base`, `--run-id`, `--changed-files`, `--output`, `--brief`.

- [ ] **Step 1: Write failing integration tests**

Cover lint JSON extraction, TypeScript error extraction, deterministic fingerprinting, changed-file inventory, and secret redaction by spawning the CLI against temporary fixtures.

- [ ] **Step 2: Run the existing certification test command and verify RED**

Run: `node --test .github/scripts/certification/*.test.mjs`
Expected: FAIL in `diagnostic-packet.test.mjs` because the diagnostic CLI is not implemented.

- [ ] **Step 3: Implement the minimal diagnostic packet CLI**

Parse only the four Product CI stages plus the common metadata required by the spec. Prefer structured ESLint JSON over console parsing. Redact evidence before serialization and fingerprinting.

- [ ] **Step 4: Run certification tests and verify GREEN**

Run: `node --test .github/scripts/certification/*.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `ci: add reusable diagnostic packet engine`

### Task 2: Product CI integration

**Files:**
- Modify: `.github/workflows/product-ci.yml`
- Delete after successful replacement: `.github/workflows/product-lint-diagnostics.yml`

**Interfaces:**
- Consumes: `diagnostic-packet.mjs` from Task 1.
- Produces: `product-ai-diagnostics-<run_id>` artifact on Product CI failure, preserving the original failing exit status.

- [ ] **Step 1: Capture typecheck, product-test, lint, and build outputs without changing command semantics**

Each canonical command writes a stage log and exit code while still exiting with the original status.

- [ ] **Step 2: Add structured lint collection only when lint fails**

Run ESLint a second time with JSON formatting under a non-gating diagnostic step.

- [ ] **Step 3: Generate and upload the common packet only on failure**

Write changed files from `base...head`, run the diagnostic CLI, append `ai-brief.md` to the job summary, and upload the diagnostic directory.

- [ ] **Step 4: Retire lint-only scaffolding**

Remove `.github/workflows/product-lint-diagnostics.yml` after Product CI itself provides equivalent or better evidence.

- [ ] **Step 5: Verify on exact SHA**

Expected on a green candidate: Product CI remains PASS and no failure artifact is required. A controlled failing fixture/test must prove the packet path before qualification.

- [ ] **Step 6: Commit**

Commit message: `ci: integrate AI-ready Product CI diagnostics`

### Task 3: HVA integration

**Files:**
- Modify: `.github/workflows/experience-acceptance.yml`
- Modify or create only if required by evidence shape: `product/scripts/experience/acceptance-report.mjs` or a focused diagnostics adapter.
- Test: existing experience-report tests plus a new deterministic packet fixture if needed.

**Interfaces:**
- Consumes: Task 1 packet schema and existing HVA acceptance/Playwright evidence.
- Produces: the same diagnostic manifest/AI brief in the HVA artifact when automated acceptance fails.

- [ ] **Step 1: Wait until PR #747 HVA candidate has left the governed MFA queue**

Expected: no mutation of PR #747 exact candidate and no restart caused by diagnostics work.

- [ ] **Step 2: Write failing HVA diagnostic-contract test**

Assert failing test identity, receipt-gate state, evidence paths, exact SHA, and redaction.

- [ ] **Step 3: Implement minimal HVA adapter and workflow wiring**

Reuse existing browser run and evidence; do not rerun Playwright for diagnostics.

- [ ] **Step 4: Verify HVA diagnostic contract GREEN**

Run the focused deterministic test, then allow the stacked PR's HVA gate to exercise the workflow when appropriate.

- [ ] **Step 5: Commit**

Commit message: `ci: extend diagnostic packets to HVA`

### Task 4: Whole-branch qualification

**Files:**
- No new product behavior.

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: exact-SHA qualification evidence and a reusable diagnostic layer ready for connected AI analysis.

- [ ] **Step 1: Run/observe Product CI on the exact final SHA**

Expected: PASS.

- [ ] **Step 2: Run/observe relevant HVA gate on the exact final SHA**

Expected: PASS; no extra browser execution caused solely by diagnostics.

- [ ] **Step 3: Review final diff for security and gate-semantic regressions**

Expected: no secret exposure, no `continue-on-error` masking, no merge/deploy authorization.
