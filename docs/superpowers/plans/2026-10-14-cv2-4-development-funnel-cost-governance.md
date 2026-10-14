# CV2-4 Development Funnel & Cost Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans task-by-task. Track every task with RED → GREEN evidence and exact-head verification.

**Goal:** Establish a durable DEVELOPMENT → CANDIDATE → RUNTIME funnel that stops expensive GitHub Actions work on broken development heads while preserving exact-head, fail-closed assurance.

**Architecture:** The cutover is deliberately two-phase. Phase A adds the new DEVELOPMENT status, exact-head candidate lease, authoritative gate selection and reusable candidate workers **without retiring legacy heavy PR assurance**. An exact head is then certified in shadow mode, with the new candidate path and legacy controls both present. Only after that proof does Phase B remove duplicate/heavy DEVELOPMENT triggers, perform the cost-containment probe, and recertify the final exact head. This satisfies CV2-4 Stage 4: replacement is proven before the old control is retired.

**Tech Stack:** GitHub Actions YAML, Node.js 22, existing `.github/scripts/certification/*.mjs`, TypeScript 5.9, Next.js 16, Supabase CLI, Playwright, PostgreSQL.

**Approved spec:** `docs/superpowers/specs/2026-10-14-cv2-4-development-funnel-cost-governance-design.md`

## Global invariants

- `develop` remains the governed product line; changing default branch `main` is out of scope.
- `opened`, `reopened`, `synchronize` are DEVELOPMENT events; `ready_for_review` is the only automatic PR CANDIDATE event.
- Candidate evidence is bound to PR base SHA + exact head SHA and full base-to-head diff.
- `certification-impact.v1` remains the certification selector; Runtime Release Contract remains the DB/runtime-depth selector.
- No second path classifier, no auto-merge, no Beta promotion, no live DB mutation.
- Missing/stale/malformed evidence fails closed.
- Same-SHA rerun only for evidence-backed `INFRA_TRANSIENT`; `CASCADE` is never independently rerun.
- Implementation work stays on an isolated branch without an open implementation PR until deterministic verification is green.
- Central certification policy changes receive one deliberate shadow qualification before legacy controls are retired and one final qualification after cutover.

## Required machine states

- `cv2/development-preflight`
- `cv2/candidate-qualification`

A new commit after CANDIDATE invalidates the prior candidate by SHA. Requalification requires Draft → Ready for review again.

## New files

- `.github/scripts/certification/cv2-lifecycle.mjs`
- `.github/scripts/certification/cv2-lifecycle.test.mjs`
- `.github/scripts/certification/cv2-topology-contract.test.mjs`
- `.github/workflows/candidate-qualification.yml`
- `.github/workflows/candidate-database-assurance.yml`

## Main modified files

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
- classifier/gate-decision tests and implementation

---

# PHASE A — Build and certify the replacement while legacy assurance remains

### Task A1 — Persist the approved contract

**Files:** `AGENTS.md`, both canonical architecture docs, new topology test.

- [ ] Write RED tests requiring `AGENTS.md` to load CV2 + Runtime Release Contract before significant code/CI/testing/qualification/rerun work.
- [ ] Require canonical docs to contain DEVELOPMENT/CANDIDATE/RUNTIME, `ready_for_review`, stable status names, Draft → Ready recandidation, and DEVELOPMENT=L0 / CANDIDATE=L1+recovery / RUNTIME=L2 timing.
- [ ] Run RED: `node --test .github/scripts/certification/cv2-topology-contract.test.mjs`.
- [ ] Materialize approved contract text; do not change workflows yet.
- [ ] Run GREEN: `node --test .github/scripts/certification/*.test.mjs .github/scripts/runtime-release-contract.test.mjs`.
- [ ] Commit: `docs(cv2): persist development candidate runtime funnel`.

### Task A2 — Add DEVELOPMENT status and fail-fast ordering, but keep legacy deep assurance temporarily

**Files:** `product-ci.yml`, topology test.

**Purpose:** Make root-cause feedback cheap-first without yet removing an existing assurance control.

- [ ] RED topology tests require Product CI to publish pending/final `cv2/development-preflight` on exact head and use `cancel-in-progress: true` for stale PR runs.
- [ ] RED ordering test requires `npm ci → typecheck → product tests → lint → build` before any full Supabase replay.
- [ ] Keep current DB impact computation and deep replay **temporarily**, but move replay after all cheap compile/test/build prerequisites. A broken typecheck must therefore stop before Supabase.
- [ ] Product CI PR types remain `opened`, `reopened`, `synchronize`; it must not rerun merely on `ready_for_review`.
- [ ] Verify certification tests + `npm ci` + typecheck + tests + lint + build.
- [ ] Commit: `ci(cv2): add fail-fast development preflight shadow mode`.

### Task A3 — Add pure lifecycle contracts

**Files:** new `cv2-lifecycle.mjs` and test.

Implement:
- `evaluateCandidateLease({ expectedSha, liveSha, developmentStatus })`
- `evaluateCandidateQualification({ lease, required, results })`

Required tests:
- [ ] same SHA + DEVELOPMENT success authorizes;
- [ ] stale/missing/pending/failed/malformed denies;
- [ ] required success passes;
- [ ] required failure fails;
- [ ] required missing/pending never succeeds;
- [ ] `skipped` is acceptable only where authoritative `required=false`;
- [ ] all receipts retain `mergeAuthorized=false`.

Run RED, implement minimally, run GREEN. Commit: `feat(cv2): add exact-head lifecycle contracts`.

### Task A4 — Extend existing classifier with K1

**Files:** classifier/gate-decision modules and tests.

- [ ] Add `K1_KNOWLEDGE_UPLOAD` to the existing `certification-impact.v1` / `certification-gate-decision.v1`; do not create a second schema.
- [ ] RED tests cover current K1 governed paths: Knowledge UI/API, ingestion/infrastructure/storage port, K1 E2E support/config, relevant migrations and K1 workflow contract.
- [ ] Central certification-contract change must require K1 during one-time full assurance.
- [ ] Unknown relevant files remain fail-closed.
- [ ] GREEN all certification tests.
- [ ] Commit: `feat(cv2): classify K1 as governed candidate gate`.

### Task A5 — Make heavy implementations reusable **without retiring their legacy PR entry yet**

**Files:** Browser orchestrator, K1, P7, ASVS, topology test.

This is the key shadow-mode rule: add `workflow_call`; preserve existing PR/push/manual entrypoints until Checkpoint A passes.

- [ ] Browser reusable path accepts explicit `base_sha` + `tested_sha`, preserves exact-head classifier, HVA/WCAG/P6/X4 statuses and evidence.
- [ ] K1 reusable local-application path accepts exact SHA and inherits governed MFA secrets; existing PR/push/Beta behavior remains for shadow certification.
- [ ] P7 reusable path accepts exact SHA; existing PR/manual restore path remains for shadow certification.
- [ ] ASVS gains reusable exact-head invocation; existing cheap behavior remains.
- [ ] Called workflows never rely on `github.event.pull_request` when invoked via `workflow_call`; all PR-specific values arrive as explicit inputs.
- [ ] GREEN topology/certification tests.
- [ ] Commit: `ci(cv2): add reusable shadow assurance workers`.

### Task A6 — Add reusable candidate DB assurance while retaining legacy Product CI replay

**Files:** new `candidate-database-assurance.yml`, runtime/topology tests.

- [ ] Extract/reuse the proven migration-copy order, local Supabase start/reset, SQL contracts and watermark equality behavior.
- [ ] Inputs: explicit `base_sha`, `tested_sha`; no Beta/Production DB credential.
- [ ] Runtime Release Contract decides `databaseDeep`; false produces explicit NOT_APPLICABLE at caller level.
- [ ] For Checkpoint A only, Product CI's old deep replay remains as parallel legacy evidence.
- [ ] GREEN runtime/topology tests.
- [ ] Commit: `ci(cv2): add shadow candidate database assurance`.

### Task A7 — Build the sole Candidate Qualification orchestrator

**File:** new `candidate-qualification.yml`, lifecycle/topology tests.

Trigger only:
`pull_request` targeting `develop`, `types: [ready_for_review]`.

`lease-and-impact` must:
1. bind event PR/base/head;
2. re-read live PR head;
3. read same-SHA `cv2/development-preflight`;
4. fail closed on stale/non-green head;
5. explicitly checkout exact head;
6. generate full base-to-head certification receipt;
7. generate Runtime Release Contract impact.

Then use reusable workers:
- Browser orchestrator;
- ASVS when required;
- K1 when required;
- candidate DB assurance when `databaseDeep=true`;
- P7 when recovery is required.

Finalizer:
- [ ] runs `if: always()`;
- [ ] publishes a machine-readable `cv2-candidate-qualification.v1` artifact/summary with expected SHA, live SHA, required gates, worker results and derived outcome;
- [ ] marks an upstream-blocked downstream result as `CASCADE` in the summary rather than a second product defect;
- [ ] publishes exact-head `cv2/candidate-qualification`;
- [ ] never merges/promotes.

Commit: `feat(cv2): add shadow exact-head candidate orchestrator`.

### Task A8 — Verify implementation branch before opening a PR

No implementation PR yet.

Run in isolated cloud worktree/container:
- [ ] `node --test .github/scripts/certification/*.test.mjs .github/scripts/runtime-release-contract.test.mjs`
- [ ] `cd product && npm ci --no-audit --no-fund`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`

All must PASS before PR creation. Do not use the user's PC or paid external compute.

---

# CHECKPOINT A — Shadow certification before retirement

### Task A9 — Open one Draft implementation PR and certify the replacement in parallel

- [ ] Open exactly one Draft PR to `develop` from the verified implementation branch.
- [ ] Accept the one-time broad legacy run caused by central certification changes; do not make exploratory commits.
- [ ] Classify every red as `CODE_REGRESSION`, `POLICY_CERTIFICATION`, `INFRA_TRANSIENT`, or `CASCADE`; no rerun-all.
- [ ] Obtain green `cv2/development-preflight` on exact head H1.
- [ ] Mark Draft → Ready for review once to run new CANDIDATE path on H1.
- [ ] Verify new candidate workers and legacy controls both provide required exact-head assurance on H1.
- [ ] Verify candidate summary/receipt is SHA-bound and every required gate is success or explicit NOT_APPLICABLE.
- [ ] Verify targeted same-SHA retry is technically possible for a reusable worker; do not manufacture an infrastructure failure.

**Checkpoint A PASS condition:** new candidate route is exact-head certified while legacy heavy assurance still exists. Only then may Phase B begin.

If Checkpoint A is not PASS: stop. Do not retire any legacy trigger.

---

# PHASE B — Cut over cost containment only after replacement is proven

### Task B1 — Return PR to Draft and retire duplicated/heavy DEVELOPMENT execution

Start only after Checkpoint A PASS.

- [ ] Convert PR back to Draft.
- [ ] Remove full Supabase replay from ordinary Product CI; retain static L0 impact/lineage checks and `cv2/development-preflight`.
- [ ] Remove direct ordinary PR heavy entry from Browser, K1 and P7 now that reusable candidate routes are certified; preserve push/runtime/manual behavior where governed.
- [ ] Complete CV2-1B: remove duplicate legacy PR triggers from HVA/WCAG/P6/X4 workflows; preserve runtime/push/manual roles and evidence semantics.
- [ ] Do not remove ASVS cheap PR checks unless evidence shows they are materially wasteful; candidate still invokes ASVS when authoritative receipt requires it.
- [ ] RED topology tests must fail before this cutover and GREEN after it, proving `synchronize` cannot authorize Browser/K1/P7/Supabase-replay or duplicate browser heavy work.
- [ ] Commit only the planned cutover: `ci(cv2): retire duplicate development heavy assurance`.

### Task B2 — Prove the cost circuit breaker on the open Draft PR

Now the new topology is active in the PR ref.

- [ ] Create one controlled, test-only/typecheck failure that cannot affect production behavior.
- [ ] Push once and verify exact failing head H2-fail:
  - `cv2/development-preflight` = failure;
  - zero Chromium/browser candidate jobs;
  - zero K1 authenticated browser job;
  - zero Supabase deep replay;
  - zero P7 PostgreSQL restore;
  - no CANDIDATE run because PR is Draft.
- [ ] Record workflow/job count and compare with PR #706 baseline of 17 PR workflows on one head.
- [ ] Revert the controlled failure immediately.
- [ ] On new exact head H2-green, obtain green DEVELOPMENT verification.

### Task B3 — Final candidate qualification after cutover

- [ ] Mark Draft → Ready for review again on H2-green.
- [ ] Candidate re-reads live head and refuses any stale H1 evidence.
- [ ] Full base-to-head classification includes the trigger-retirement changes and therefore receives the assurance required for central certification policy changes.
- [ ] Required Browser/ASVS/K1/DB/P7 candidate gates execute or become explicit NOT_APPLICABLE under authoritative receipts.
- [ ] `cv2/candidate-qualification` PASS only if all required same-SHA evidence is valid.
- [ ] No auto-merge, Beta promotion, live DB mutation.

### Task B4 — Final Human Review and cost decision

Present:
- exact final head;
- DEVELOPMENT result;
- CANDIDATE result and receipt;
- legacy-retirement topology evidence;
- controlled-failure cost evidence;
- comparison against #706 baseline;
- any remaining cheap branch-agnostic governance workflows (for example vocabulary/perceptible-write) as separate low-cost residuals rather than hidden heavy work.

No merge until Human Review approves.

---

## Rollback

If Checkpoint A cannot prove the new candidate path, legacy controls remain untouched.

If Phase B cutover breaks required assurance:
1. restore the affected legacy PR trigger(s);
2. keep only improvements whose assurance equivalence is proven;
3. classify as `POLICY_CERTIFICATION`;
4. return PR to Draft;
5. no merge until exact-head full assurance is restored.

## Post-cutover rule for every future chat/agent

1. Load CV2 canonical + Runtime Release Contract from repository.
2. Ordinary commit = DEVELOPMENT only.
3. Fix primary cheap failure before candidate escalation.
4. Draft → Ready = CANDIDATE on exact head.
5. New commit after candidate = DEVELOPMENT; stale evidence is invalid.
6. Recandidate only via Draft → Ready.
7. Runtime/deploy assurance remains separate.
8. No rerun-all; same-SHA targeted retry only for verified transient infrastructure failure.
