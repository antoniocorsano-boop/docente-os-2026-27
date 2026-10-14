# CV2-4 Development Funnel & Cost Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a stable DEVELOPMENT → CANDIDATE → RUNTIME funnel that blocks expensive GitHub Actions work until a PR exact head is genuinely ready for candidate qualification, while preserving fail-closed exact-head assurance.

**Architecture:** Product CI becomes the cheap SHA-bound DEVELOPMENT preflight and does not re-run on `ready_for_review`. A single `candidate-qualification.yml` workflow is the PR CANDIDATE authority and is triggered only by `pull_request.ready_for_review`; it verifies the live PR head and prior same-SHA `cv2/development-preflight`, then calls existing heavy gate implementations through `workflow_call`. `certification-impact.v1` remains the certification selector, the Runtime Release Contract remains the DB/runtime-depth selector, and runtime/push/manual gate behavior is preserved.

**Tech Stack:** GitHub Actions YAML, Node.js 22, existing `.github/scripts/certification/*.mjs` contracts, TypeScript 5.9, Next.js 16, Supabase CLI, Playwright, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-10-14-cv2-4-development-funnel-cost-governance-design.md`

## Global Constraints

- `develop` is the governed product line; `main` remains GitHub default unless separately changed.
- PR `opened`, `reopened`, and `synchronize` are DEVELOPMENT only.
- `pull_request.ready_for_review` is the single PR event that authorizes CANDIDATE.
- Product CI MUST NOT start a second preflight on `ready_for_review`; CANDIDATE consumes the already-green same-SHA DEVELOPMENT status.
- Candidate evidence is bound to PR base SHA + exact head SHA and full base-to-head diff.
- `certification-impact.v1` remains authoritative for certification gates; Runtime Release Contract remains authoritative for DB/runtime depth.
- Missing, stale, malformed, contradictory, or incomplete evidence fails closed.
- No auto-merge, Beta promotion, live DB mutation, or weakening of ASVS/WCAG/HVA/P6/recovery assurance.
- Same-SHA retry only for evidence-backed `INFRA_TRANSIENT`; no rerun-all.
- Bootstrap cost rule: implementation work happens on an isolated branch without an open PR until deterministic local/cloud DEVELOPMENT verification is green.
- Open the implementation PR as **Draft** exactly once; use DEVELOPMENT there, then transition Draft → Ready for review exactly once for candidate qualification.
- Central certification changes receive one intentional full assurance before merge.
- No unrelated product refactors.

## Review Focus

1. **New commit after Ready for review:** stale candidate must fail before browser, Supabase, PostgreSQL or authenticated E2E setup.
2. **Missing/failed DEVELOPMENT status:** candidate must fail closed and no reusable heavy gate may start.
3. **DB change plus compile defect:** DEVELOPMENT must fail at typecheck/tests without Supabase replay or P7 restore.
4. **Non-applicable gate:** candidate finalizer must treat caller-level `skipped` as acceptable only when the authoritative receipt says the gate was not required.
5. **Transient gate failure:** same-SHA failed reusable job remains individually retryable without rerunning unrelated successful gates.

---

## File Structure

### New files
- `.github/scripts/certification/cv2-lifecycle.mjs` — pure candidate lease/finalization logic.
- `.github/scripts/certification/cv2-lifecycle.test.mjs` — lifecycle RED/GREEN tests.
- `.github/scripts/certification/cv2-topology-contract.test.mjs` — repository topology guard.
- `.github/workflows/candidate-qualification.yml` — sole PR candidate coordinator.
- `.github/workflows/candidate-database-assurance.yml` — reusable exact-head deep DB replay.

### Modified files
- `AGENTS.md`
- `docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md`
- `docs/architecture/RUNTIME_RELEASE_CONTRACT_V1.md`
- `.github/workflows/product-ci.yml`
- `.github/workflows/browser-certification-orchestrator.yml`
- `.github/workflows/k1-knowledge-e2e.yml`
- `.github/workflows/p7-db-restore-rehearsal.yml`
- `.github/workflows/asvs50-assurance.yml`
- `.github/workflows/experience-acceptance.yml`
- `.github/workflows/wcag22-aa-assurance.yml`
- `.github/workflows/p6-performance.yml`
- `.github/workflows/x4-planner-e2e.yml`
- `.github/scripts/certification/classifier.mjs`
- `.github/scripts/certification/classifier.test.mjs`
- `.github/scripts/certification/gate-decision.mjs`
- `.github/scripts/certification/gate-decision.test.mjs`
- `.github/scripts/runtime-release-contract.test.mjs` and `runtime-release-contract.mjs` only if lifecycle output needs an explicit field; DB impact semantics must not change silently.

---

### Task 1: Persist the approved lifecycle contract

**Files:** `AGENTS.md`, both canonical architecture documents, new `cv2-topology-contract.test.mjs`.

**Interfaces:** Produces the repository-readable process future chats/agents must load.

- [ ] **Step 1: Write RED governance tests** asserting:
  - `AGENTS.md` points to CV2 before significant code/CI/test/qualification/rerun work;
  - CV2 canonical contains DEVELOPMENT/CANDIDATE/RUNTIME, `ready_for_review`, and stable status names;
  - Runtime Release Contract states DEVELOPMENT=L0/static, DB deep replay/recovery=CANDIDATE, reconciliation=RUNTIME.
- [ ] **Step 2: Run RED:** `node --test .github/scripts/certification/cv2-topology-contract.test.mjs` → FAIL.
- [ ] **Step 3: Materialize the approved contracts** without changing workflows yet.
- [ ] **Step 4: Run GREEN:** `node --test .github/scripts/certification/*.test.mjs .github/scripts/runtime-release-contract.test.mjs` → PASS.
- [ ] **Step 5: Commit:** `docs(cv2): persist development candidate runtime funnel`.

---

### Task 2: Make Product CI the DEVELOPMENT circuit breaker

**Files:** `.github/workflows/product-ci.yml`, topology test.

**Interfaces:** Produces commit status `cv2/development-preflight` bound to exact PR head SHA.

- [ ] **Step 1: Extend RED topology tests** asserting Product CI:
  - PR types are exactly DEVELOPMENT-relevant `opened`, `reopened`, `synchronize` (not `ready_for_review`);
  - uses PR-scoped concurrency with `cancel-in-progress: true`;
  - publishes pending/final `cv2/development-preflight` on exact head;
  - orders `npm ci → typecheck → product tests → lint → build` after static contract checks;
  - contains no Supabase deep replay inside the DEVELOPMENT job.
- [ ] **Step 2: Run RED** against current Product CI → FAIL because DB replay currently precedes typecheck.
- [ ] **Step 3: Implement minimal DEVELOPMENT flow** preserving cheap deterministic certification/runtime contract tests.
- [ ] **Step 4: Verify locally/cloud:** certification tests, `npm ci`, typecheck, product tests, lint, build all PASS.
- [ ] **Step 5: Commit:** `ci(cv2): add fail-fast development preflight`.

---

### Task 3: Add exact-head candidate lease and finalization contracts

**Files:** new `cv2-lifecycle.mjs` and test.

**Interfaces:**
- `evaluateCandidateLease({ expectedSha, liveSha, developmentStatus })`
- result: `{ schema:'cv2-candidate-lease.v1', authorized, reason, expectedSha, liveSha, mergeAuthorized:false }`
- `evaluateCandidateQualification({ lease, required, results })`
- result state: `success | failure | pending`, always `mergeAuthorized:false`.

- [ ] **Step 1: RED lease tests:** valid same SHA+success authorizes; stale/missing/pending/failed/malformed denies.
- [ ] **Step 2: RED finalization tests:** required success passes; required failure fails; required missing/pending never succeeds; skipped is allowed only when `required=false`.
- [ ] **Step 3: Implement pure helpers** with no GitHub API calls.
- [ ] **Step 4: Run GREEN:** lifecycle + existing certification tests PASS.
- [ ] **Step 5: Commit:** `feat(cv2): add exact-head lifecycle contracts`.

---

### Task 4: Extend the authoritative classifier for K1 rather than creating a second classifier

**Files:** classifier/gate-decision modules and tests.

**Interfaces:** Adds gate `K1_KNOWLEDGE_UPLOAD` to existing `certification-impact.v1` / `certification-gate-decision.v1`; no new schema.

- [ ] **Step 1: RED tests** copy K1's current governed path set into classifier expectations: Knowledge UI/API, ingestion/infrastructure/storage port, K1 E2E support/config, relevant migrations and K1 workflow contract require K1.
- [ ] **Step 2: RED fail-closed test:** central certification-contract change includes K1 in one-time full heavy assurance.
- [ ] **Step 3: Extend `ALL_HEAVY_GATES`, `KNOWN_CERTIFICATION_GATES`, reasons and tests**; do not change merge authority.
- [ ] **Step 4: Run GREEN:** all certification tests PASS.
- [ ] **Step 5: Commit:** `feat(cv2): classify K1 as governed candidate gate`.

---

### Task 5: Convert heavy gate implementations to reusable candidate workers

**Files:** Browser orchestrator, K1, P7, ASVS, topology test.

**Interfaces:** Each reusable workflow accepts explicit `base_sha`/`tested_sha` where needed and returns normal workflow success/failure; heavy implementations remain separate files.

- [ ] **Step 1: RED topology tests** require:
  - no direct ordinary PR trigger for Browser/K1/P7 heavy execution;
  - `workflow_call` exists for Browser, K1, P7, ASVS;
  - push/runtime/manual triggers currently required remain intact.
- [ ] **Step 2: Browser:** replace direct PR candidate authority with `workflow_call`; consume explicit base/tested SHA; preserve full `certification-impact.v1` selection, existing HVA/WCAG/P6/X4 statuses and evidence.
- [ ] **Step 3: K1:** add `workflow_call` local-application acceptance path; preserve push/Beta and manual behavior; no duplicate K1 path classifier remains in workflow routing.
- [ ] **Step 4: P7:** add `workflow_call` restore-rehearsal path; preserve manual behavior and `p7-recovery/db-restore-rehearsal` status.
- [ ] **Step 5: ASVS:** add reusable invocation while preserving cheap existing push/PR behavior unless later evidence shows duplication is material.
- [ ] **Step 6: Run GREEN** topology + certification tests.
- [ ] **Step 7: Commit:** `ci(cv2): make heavy assurance reusable by candidate orchestrator`.

---

### Task 6: Move deep Supabase replay into reusable CANDIDATE DB assurance

**Files:** new `candidate-database-assurance.yml`, Product CI cleanup, runtime-contract tests/topology test.

**Interfaces:** Inputs `base_sha`, `tested_sha`; caller invokes only when Runtime Release Contract says `databaseDeep=true`.

- [ ] **Step 1: RED tests** prove DEVELOPMENT never starts Supabase and candidate DB worker is the only PR deep replay path.
- [ ] **Step 2: Create reusable workflow** by moving, not rewriting, the proven lexical migration-copy, local Supabase start/reset, SQL contracts and watermark equality logic from Product CI.
- [ ] **Step 3: Ensure no real/Beta DB credential is consumed** by this worker.
- [ ] **Step 4: Run GREEN** runtime/topology tests; final candidate later proves one real ephemeral replay.
- [ ] **Step 5: Commit:** `ci(cv2): isolate deep database assurance for candidates`.

---

### Task 7: Build the sole Candidate Qualification orchestrator

**Files:** new `.github/workflows/candidate-qualification.yml`, lifecycle/topology tests.

**Interfaces:** Trigger only `pull_request` to `develop`, `types: [ready_for_review]`; publishes `cv2/candidate-qualification`.

- [ ] **Step 1: RED topology tests** assert sole candidate event authority and no heavy worker has its own `ready_for_review` PR authority.
- [ ] **Step 2: Implement `lease-and-impact` job:**
  1. bind expected head from event;
  2. re-read live PR head via GitHub API;
  3. read same-SHA `cv2/development-preflight` status;
  4. evaluate candidate lease;
  5. checkout exact head only after/for deterministic impact work;
  6. generate full base-to-head `certification-impact.v1` receipt;
  7. generate Runtime Release Contract impact outputs.
- [ ] **Step 3: Call reusable workers with `needs`/`if`:**
  - Browser orchestrator (it internally selects HVA/WCAG/P6/X4);
  - ASVS when `ASVS_5_0` required;
  - K1 when `K1_KNOWLEDGE_UPLOAD` required;
  - Candidate DB assurance when `databaseDeep=true`;
  - P7 restore when DB/recovery impact requires it.
- [ ] **Step 4: Implement finalizer with `if: always()`:** feed authoritative required booleans + `needs.*.result` to `evaluateCandidateQualification`; publish final exact-head `cv2/candidate-qualification`; never merge/promote.
- [ ] **Step 5: Run GREEN** lifecycle/topology/certification/runtime tests.
- [ ] **Step 6: Commit:** `feat(cv2): orchestrate exact-head candidate qualification`.

---

### Task 8: Complete CV2-1B duplicate browser PR-trigger retirement

**Files:** experience-acceptance, WCAG, P6, X4 legacy workflows, topology test.

**Interfaces:** Browser Certification Orchestrator remains candidate PR authority; legacy workflows retain governed push/runtime/manual roles.

- [ ] **Step 1: RED tests** show duplicate legacy PR heavy triggers still exist.
- [ ] **Step 2: Remove only duplicate PR triggers**; do not delete runtime/manual triggers, evidence retention, status naming or human review semantics.
- [ ] **Step 3: GREEN topology/certification tests.**
- [ ] **Step 4: Commit:** `ci(cv2): retire duplicate legacy browser pr triggers`.

---

### Task 9: Bootstrap and prove the cutover economically

**Files:** no new product files; execution/PR evidence.

**Interfaces:** Consumes Tasks 1–8 locally/cloud GREEN; produces one implementation PR and exact-head transition evidence.

- [ ] **Step 1: Before opening any implementation PR**, in isolated cloud worktree/container run:
  - `node --test .github/scripts/certification/*.test.mjs .github/scripts/runtime-release-contract.test.mjs`
  - `cd product && npm ci --no-audit --no-fund`
  - `cd product && npm run typecheck`
  - `cd product && npm test`
  - `cd product && npm run lint`
  - `cd product && npm run build`
  All must PASS.
- [ ] **Step 2: Open exactly one Draft implementation PR to `develop`.** Accept one intentional broad transition run caused by changing central certification policy; do not make exploratory follow-up commits.
- [ ] **Step 3: DEVELOPMENT cost probe while PR is Draft:** introduce one controlled test-only/typecheck failure, push once, verify `cv2/development-preflight` fails and Browser/K1/Supabase/P7 heavy work does not start; revert immediately and obtain green DEVELOPMENT on new exact head.
- [ ] **Step 4: Classify every red** as `CODE_REGRESSION`, `POLICY_CERTIFICATION`, `INFRA_TRANSIENT`, or `CASCADE`; never rerun CASCADE.
- [ ] **Step 5: Mark Draft → Ready for review once.** Verify one CANDIDATE run bound to the exact green head and full base-to-head diff.
- [ ] **Step 6: Full transition assurance:** required browser gates, ASVS, K1, DB replay and P7 execute/select correctly; candidate status is green; human gates remain human; no merge/Beta/live DB mutation.
- [ ] **Step 7: Compare cost evidence** against PR #706 baseline of 17 PR workflow runs on one exact head. Hard acceptance: failing DEVELOPMENT head starts zero browser/Chromium, Supabase deep replay, P7 PostgreSQL restore and K1 authenticated browser jobs.
- [ ] **Step 8: Human Review** of exact-head assurance + cost delta before merge.

---

## Rollback

If the candidate orchestrator cannot prove required gate coverage, workflow-call semantics, or exact-head binding:

1. do not retire/restore additional legacy triggers;
2. restore prior full candidate behavior for the affected gate;
3. retain DEVELOPMENT fail-fast improvements only if they do not suppress required assurance;
4. classify as `POLICY_CERTIFICATION`;
5. no merge until exact-head full assurance is restored.

## Post-cutover operating rule

- ordinary commit → DEVELOPMENT only;
- fix the primary failure before candidate escalation;
- Draft → Ready for review → one CANDIDATE qualification on exact head;
- any later commit → DEVELOPMENT automatically and prior candidate evidence is stale;
- runtime/deploy checks stay separate;
- no rerun-all; same-SHA targeted retry only for verified transient infrastructure failure.
