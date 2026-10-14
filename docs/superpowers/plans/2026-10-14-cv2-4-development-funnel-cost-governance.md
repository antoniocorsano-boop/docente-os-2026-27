# CV2-4 Development Funnel & Cost Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a stable DEVELOPMENT → CANDIDATE → RUNTIME funnel that blocks expensive GitHub Actions work until a PR exact head is genuinely ready for candidate qualification, while preserving fail-closed exact-head assurance.

**Architecture:** Keep `certification-impact.v1` and the Runtime Release Contract as the existing authorities for assurance selection. Make Product CI the cheap DEVELOPMENT preflight, use `pull_request.ready_for_review` as the only PR event that authorizes heavy candidate work, and coordinate candidate-only heavy workflows behind a same-SHA preflight lease. Do not replace the current gate implementations with one mega-workflow; stage the cutover and retire duplicate PR triggers only after the replacement path is certified.

**Tech Stack:** GitHub Actions YAML, Node.js 22, existing `.github/scripts/certification/*.mjs` contracts, TypeScript 5.9, Next.js 16, Supabase CLI, Playwright, PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-10-14-cv2-4-development-funnel-cost-governance-design.md`

## Global Constraints

- `develop` is the governed Docente OS product line; repository `main` remains the GitHub default branch unless separately changed by governance.
- Ordinary `pull_request` `opened`, `reopened`, and `synchronize` events are DEVELOPMENT only and MUST NOT authorize heavy candidate assurance.
- `pull_request.ready_for_review` is the single PR event that authorizes entry into CANDIDATE.
- Candidate evidence is bound to the exact PR head SHA and full PR base-to-head diff.
- `certification-impact.v1` remains authoritative for certification gate selection; Runtime Release Contract remains authoritative for DB/runtime depth.
- Missing, stale, malformed, or contradictory evidence fails closed.
- No automatic merge, Beta promotion, live DB mutation, or weakening of security/WCAG/HVA/P6/recovery assurance.
- Same-SHA retry is permitted only for evidence-backed `INFRA_TRANSIENT`; no indiscriminate rerun-all.
- Bootstrap cost rule: do not open the CV2-4 implementation PR until deterministic local/cloud DEVELOPMENT verification is green. Feature-branch pushes must not be used as a substitute for PR CI.
- The first implementation PR receives one intentional full assurance because central certification policy changes.
- No unrelated product refactors.

## Review Focus

1. **New commit after Ready for review:** candidate work for the stale SHA must fail before browsers, Supabase, PostgreSQL, or authenticated E2E start.
2. **Missing/failed DEVELOPMENT status:** CANDIDATE must fail closed rather than silently running or skipping heavy gates.
3. **Database change in an otherwise broken head:** typecheck/test failure must prevent Supabase replay and P7 restore from starting during DEVELOPMENT.
4. **Non-applicable heavy gate:** candidate qualification must record an explicit SHA-bound NOT_APPLICABLE/success receipt, not leave a missing status that is indistinguishable from a broken workflow.
5. **Infrastructure failure:** the failing heavy job must be individually retryable on the same SHA without re-running unrelated successful gates.

---

## File Structure

### New files

- `.github/scripts/certification/cv2-lifecycle.mjs` — pure lifecycle/lease evaluation used by candidate workflows.
- `.github/scripts/certification/cv2-lifecycle.test.mjs` — RED/GREEN tests for stale SHA, missing preflight, failed preflight, valid candidate lease, and candidate aggregation semantics.
- `.github/scripts/certification/cv2-topology-contract.test.mjs` — repository topology guard preventing ordinary DEVELOPMENT events from directly authorizing known heavy PR workflows.
- `.github/workflows/candidate-qualification.yml` — canonical `ready_for_review` candidate coordinator and `cv2/candidate-qualification` status publisher.

### Modified files

- `AGENTS.md` — mandatory pointer to CV2 canonical process before code/CI/qualification work.
- `docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md` — materialize approved CV2-4 lifecycle and cost-governance contract.
- `docs/architecture/RUNTIME_RELEASE_CONTRACT_V1.md` — align L0/L1/L2 timing with DEVELOPMENT/CANDIDATE/RUNTIME.
- `.github/workflows/product-ci.yml` — cheap DEVELOPMENT preflight, fail-fast ordering, same-SHA status, cancellation of stale DEVELOPMENT runs.
- `.github/workflows/browser-certification-orchestrator.yml` — candidate-only PR entry plus same-SHA lease before heavy browser preparation.
- `.github/workflows/k1-knowledge-e2e.yml` — candidate-only PR execution plus same-SHA lease; preserve push/runtime behavior.
- `.github/workflows/p7-db-restore-rehearsal.yml` — candidate-only PR execution plus same-SHA lease; preserve manual behavior.
- `.github/workflows/experience-acceptance.yml` — retire duplicate PR trigger after orchestrator qualification; preserve push/runtime/manual authority.
- `.github/workflows/wcag22-aa-assurance.yml` — same as above.
- `.github/workflows/p6-performance.yml` — same as above.
- `.github/workflows/x4-planner-e2e.yml` — same as above.
- `.github/scripts/certification/classifier.mjs` and tests only if K1 candidate applicability cannot be expressed without adding a second path classifier. If changed, extend `certification-impact.v1` rather than inventing a parallel classifier.
- `.github/scripts/certification/gate-decision.mjs` and tests only if the authoritative gate list is extended for K1.

---

### Task 1: Persist the approved lifecycle contract

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md`
- Modify: `docs/architecture/RUNTIME_RELEASE_CONTRACT_V1.md`
- Create: `.github/scripts/certification/cv2-topology-contract.test.mjs`

**Interfaces:**
- Consumes: approved CV2-4 design specification.
- Produces: one repository-readable canonical contract future agents must load before CI/qualification work.

- [ ] **Step 1: Write the RED contract test for durable governance**

Add Node tests asserting:
- `AGENTS.md` references `CERTIFICATION_PIPELINE_V2_CANONICAL.md` for significant code/CI/testing/qualification/rerun work;
- CV2 canonical contains `DEVELOPMENT`, `CANDIDATE`, `RUNTIME`, `pull_request.ready_for_review`, `cv2/development-preflight`, and `cv2/candidate-qualification`;
- Runtime Release Contract states DEVELOPMENT = L0/static preflight and DB L1/recovery occurs in CANDIDATE rather than every synchronize.

- [ ] **Step 2: Run RED**

Run:
`node --test .github/scripts/certification/cv2-topology-contract.test.mjs`

Expected: FAIL because the approved CV2-4 contract is not yet materialized in canonical docs/AGENTS.

- [ ] **Step 3: Update canonical documents only**

Materialize the approved specification without changing workflow behavior yet. `AGENTS.md` must point to the canonical documents, not duplicate their full text.

- [ ] **Step 4: Run GREEN**

Run the topology contract test plus existing certification contract tests:
`node --test .github/scripts/certification/*.test.mjs .github/scripts/runtime-release-contract.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `docs(cv2): persist development candidate runtime funnel`

---

### Task 2: Turn Product CI into the DEVELOPMENT circuit breaker

**Files:**
- Modify: `.github/workflows/product-ci.yml`
- Modify: `.github/scripts/certification/cv2-topology-contract.test.mjs`

**Interfaces:**
- Produces: SHA-bound commit status `cv2/development-preflight`.
- Candidate tasks consume: exact-head success of `cv2/development-preflight`.

- [ ] **Step 1: Extend RED topology tests**

Assert that `product-ci.yml`:
- has PR DEVELOPMENT events `opened`, `reopened`, `synchronize`, and `ready_for_review`;
- has PR concurrency keyed by PR/head and `cancel-in-progress: true` for stale DEVELOPMENT runs;
- publishes `cv2/development-preflight` on the exact PR head;
- executes `npm run typecheck` before `npm test`, lint, and build;
- contains no Supabase CLI setup or full migration replay in the DEVELOPMENT job;
- does not run PostgreSQL recovery in DEVELOPMENT.

- [ ] **Step 2: Run RED**

Expected: FAIL on current Product CI, which presently performs runtime-impact evaluation and full Supabase replay before `npm ci`, product tests, and typecheck.

- [ ] **Step 3: Implement the minimal DEVELOPMENT job**

Target order:
`checkout exact head → static contract validation → Node 22 → npm ci → typecheck → product tests → lint → build`.

Keep deterministic certification/runtime contract unit tests in the cheap preflight. Move full Supabase replay out of ordinary DEVELOPMENT; do not delete its logic until Task 5 provides candidate DB assurance.

Add pending/final `cv2/development-preflight` status bound to `${{ github.event.pull_request.head.sha }}` for PRs.

- [ ] **Step 4: Verify GREEN locally/cloud**

Run:
- `node --test .github/scripts/certification/*.test.mjs .github/scripts/runtime-release-contract.test.mjs`
- `cd product && npm ci --no-audit --no-fund`
- `cd product && npm run typecheck`
- `cd product && npm test`
- `cd product && npm run lint`
- `cd product && npm run build`

Expected: all PASS on the implementation head before any implementation PR is opened.

- [ ] **Step 5: Commit**

Commit message: `ci(cv2): add fail-fast development preflight`

---

### Task 3: Add a reusable exact-head candidate lease

**Files:**
- Create: `.github/scripts/certification/cv2-lifecycle.mjs`
- Create: `.github/scripts/certification/cv2-lifecycle.test.mjs`

**Interfaces:**
- Produces: `evaluateCandidateLease({ expectedSha, liveSha, developmentStatus })`.
- Return shape: `{ schema: 'cv2-candidate-lease.v1', authorized: boolean, reason: string, expectedSha: string, liveSha: string, mergeAuthorized: false }`.
- `developmentStatus` accepted values: `success`, `failure`, `pending`, `missing`.

- [ ] **Step 1: Write RED lease tests**

Test cases:
- exact head + DEVELOPMENT success → `authorized=true`;
- stale live SHA → `authorized=false`;
- missing DEVELOPMENT status → false;
- pending DEVELOPMENT status → false;
- failed DEVELOPMENT status → false;
- malformed/empty SHA → false;
- every result has `mergeAuthorized=false`.

- [ ] **Step 2: Run RED**

Run:
`node --test .github/scripts/certification/cv2-lifecycle.test.mjs`

Expected: FAIL because lifecycle helper does not exist.

- [ ] **Step 3: Implement the pure helper**

No GitHub API calls inside the helper. Candidate workflows obtain live PR head and the exact SHA's `cv2/development-preflight` state, then pass normalized values to this function.

- [ ] **Step 4: Run GREEN**

Run lifecycle and existing certification tests. Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(cv2): add exact-head candidate lease contract`

---

### Task 4: Gate heavy PR workflows behind CANDIDATE

**Files:**
- Modify: `.github/workflows/browser-certification-orchestrator.yml`
- Modify: `.github/workflows/k1-knowledge-e2e.yml`
- Modify: `.github/workflows/p7-db-restore-rehearsal.yml`
- Modify: `.github/scripts/certification/cv2-topology-contract.test.mjs`
- Optional only if required to avoid duplicate K1 path authority: modify `classifier.mjs`, `classifier.test.mjs`, `gate-decision.mjs`, `gate-decision.test.mjs`.

**Interfaces:**
- Consumes: `cv2/development-preflight` and `evaluateCandidateLease(...)`.
- Produces: existing gate evidence, but only after a valid CANDIDATE lease.

- [ ] **Step 1: Extend RED topology tests for known heavy workflows**

Assert that PR execution for Browser Certification, K1 authenticated browser acceptance, and P7 DB Restore is authorized only by `ready_for_review`; ordinary synchronize must not start their heavy jobs.

Also assert that each workflow performs the same-SHA lease check before dependency install/build/browser/container-heavy steps.

- [ ] **Step 2: Run RED**

Expected: FAIL because all three currently accept ordinary PR updates; K1 builds and installs Chromium, P7 starts PostgreSQL, and Browser builds/installs browser support on PR synchronize.

- [ ] **Step 3: Implement Browser candidate entry**

Change PR trigger to `types: [ready_for_review]` for PRs to `develop`.

Before selected-gate preparation:
1. checkout exact event head cheaply;
2. read live PR head with GitHub API;
3. read `cv2/development-preflight` status for expected SHA;
4. evaluate candidate lease;
5. fail before npm/build/Chromium if lease is not authorized.

Preserve exact base-to-head `certification-impact.v1` classification.

- [ ] **Step 4: Implement K1 candidate entry**

Keep push/runtime behavior unchanged. For PR behavior, authorize K1 application acceptance only from `ready_for_review` and only after candidate lease.

Do not create a second hidden path classifier. If K1 applicability must be coordinated centrally, extend the existing certification classifier/gate-decision contracts under their existing schema/tests.

- [ ] **Step 5: Implement P7 candidate entry**

Keep `workflow_dispatch` behavior. PR DB restore runs only on `ready_for_review` and after lease validation. Preserve `p7-recovery/db-restore-rehearsal` status semantics.

- [ ] **Step 6: Run GREEN static/unit verification**

Run topology, lifecycle, classifier/gate-decision, and runtime-release contract tests. Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `ci(cv2): move heavy pr assurance behind candidate lease`

---

### Task 5: Restore DB assurance at CANDIDATE depth, not DEVELOPMENT depth

**Files:**
- Modify: `.github/workflows/product-ci.yml` or create a focused candidate DB job/workflow if separation is clearer.
- Modify: `.github/scripts/runtime-release-contract.mjs` only if needed for explicit lifecycle output; do not change DB impact semantics without tests.
- Modify: `.github/scripts/runtime-release-contract.test.mjs`
- Modify: `.github/scripts/certification/cv2-topology-contract.test.mjs`

**Interfaces:**
- Consumes: valid candidate lease and Runtime Release Contract `databaseDeep` decision for full base-to-head diff.
- Produces: candidate DB assurance result bound to exact head, with explicit NOT_APPLICABLE when `databaseDeep=false`.

- [ ] **Step 1: Write RED runtime/candidate tests**

Prove:
- DEVELOPMENT DB-impact classification may be computed statically but does not start Supabase replay;
- CANDIDATE with `databaseDeep=true` executes full ephemeral Supabase replay;
- CANDIDATE with `databaseDeep=false` records NOT_APPLICABLE without starting Supabase;
- stale candidate lease prevents replay;
- replay never touches Beta/Production DB.

- [ ] **Step 2: Run RED**

Expected: FAIL because current replay is embedded in ordinary Product CI.

- [ ] **Step 3: Move the existing replay logic without rewriting it**

Reuse the current proven migration-copy ordering, local Supabase startup/reset, SQL contract checks, and watermark equality check. Change lifecycle timing, not DB assurance depth.

Candidate DB work must depend on DEVELOPMENT success and exact-head lease.

- [ ] **Step 4: Verify GREEN**

Run runtime-release and topology tests locally. During final candidate certification, verify one real ephemeral replay on an exact head whose diff requires it.

- [ ] **Step 5: Commit**

Commit message: `ci(cv2): run deep database assurance only for candidates`

---

### Task 6: Complete CV2-1B duplicate browser-trigger retirement

**Files:**
- Modify: `.github/workflows/experience-acceptance.yml`
- Modify: `.github/workflows/wcag22-aa-assurance.yml`
- Modify: `.github/workflows/p6-performance.yml`
- Modify: `.github/workflows/x4-planner-e2e.yml`
- Modify: `.github/scripts/certification/cv2-topology-contract.test.mjs`

**Interfaces:**
- Browser Certification Orchestrator remains the PR authority for HVA/WCAG/P6/X4 candidate browser work.
- Legacy workflows remain available for push/runtime and explicit manual execution where currently governed.

- [ ] **Step 1: Write RED duplicate-trigger tests**

Assert that these four legacy workflows no longer have ordinary PR heavy triggers once the Browser Orchestrator candidate route exists.

- [ ] **Step 2: Run RED**

Expected: FAIL while legacy PR triggers remain.

- [ ] **Step 3: Retire only duplicate PR triggers**

Do not delete workflows, runtime/push triggers, manual dispatch, status naming, evidence retention, or human review semantics.

- [ ] **Step 4: Run GREEN**

Topology and certification tests PASS.

- [ ] **Step 5: Commit**

Commit message: `ci(cv2): retire duplicate legacy browser pr triggers`

---

### Task 7: Publish one stable candidate qualification state

**Files:**
- Create: `.github/workflows/candidate-qualification.yml`
- Modify: `.github/scripts/certification/cv2-lifecycle.mjs`
- Modify: `.github/scripts/certification/cv2-lifecycle.test.mjs`
- Modify: `.github/scripts/certification/cv2-topology-contract.test.mjs`

**Interfaces:**
- Add `evaluateCandidateQualification({ expectedSha, liveSha, developmentStatus, requiredGateStates })`.
- Produces final state `success | failure | pending` for `cv2/candidate-qualification`, always `mergeAuthorized=false`.
- Required gate inputs come only from `certification-impact.v1`, Runtime Release Contract, and explicit candidate subreceipts; no second classifier.

- [ ] **Step 1: Write RED aggregation tests**

Test:
- all required gates success/NOT_APPLICABLE on same SHA → success;
- one required gate failure → failure;
- required gate pending/missing → pending/fail-closed, never success;
- stale SHA → failure;
- DEVELOPMENT not success → failure;
- non-required gate absence does not block when its authoritative receipt says NOT_APPLICABLE.

- [ ] **Step 2: Run RED**

Expected: FAIL because candidate aggregator does not exist.

- [ ] **Step 3: Implement candidate coordinator**

Trigger: `pull_request` to `develop`, `types: [ready_for_review]` only.

The workflow must:
1. bind `expectedSha` to the ready-for-review event head;
2. re-read live PR head;
3. require same-SHA DEVELOPMENT success;
4. compute/read full base-to-head certification and runtime impact receipts;
5. publish `cv2/candidate-qualification` pending;
6. observe only the gate/subreceipt contexts required by the authoritative receipts;
7. publish success only when all required same-SHA evidence is success or explicitly NOT_APPLICABLE;
8. publish failure for any primary gate failure or stale head;
9. never merge or promote.

Use bounded polling if coordination across existing workflows requires it; timeout produces failure/pending fail-closed, never success.

- [ ] **Step 4: Run GREEN unit/static verification**

Run lifecycle/topology/certification/runtime-release tests. Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat(cv2): publish exact-head candidate qualification status`

---

### Task 8: Bootstrap the cutover without paying for iterative old-CI reruns

**Files:** no new product files; branch/PR execution policy.

**Interfaces:**
- Consumes: Tasks 1–7 locally/cloud GREEN.
- Produces: one implementation PR for final exact-head qualification.

- [ ] **Step 1: Verify implementation branch before opening PR**

Use an isolated cloud worktree/container; do not depend on the user's PC or external paid compute.

Run:
- `node --test .github/scripts/certification/*.test.mjs .github/scripts/runtime-release-contract.test.mjs`
- `cd product && npm ci --no-audit --no-fund`
- `cd product && npm run typecheck`
- `cd product && npm test`
- `cd product && npm run lint`
- `cd product && npm run build`

Expected: all PASS.

- [ ] **Step 2: Open exactly one implementation PR to `develop`**

Because central certification policy changed, the old/current policy may still cause a one-time broad run on PR creation. Do not make exploratory follow-up commits after opening the PR unless a concrete verified defect requires one.

- [ ] **Step 3: Classify any red before action**

For every failure record one primary class: `CODE_REGRESSION`, `POLICY_CERTIFICATION`, `INFRA_TRANSIENT`, or `CASCADE`.

Do not rerun CASCADE. Same-SHA retry only for `INFRA_TRANSIENT`.

- [ ] **Step 4: Perform one full transition assurance**

On the exact implementation head, verify:
- Product DEVELOPMENT preflight PASS;
- one-time central certification full assurance required by CV2 policy PASS;
- candidate transition on Ready for review uses exact SHA;
- browser candidate gates required by the diff PASS;
- candidate DB replay/recovery PASS when required;
- ASVS/security required gates PASS;
- no auto-merge/Beta promotion/live DB mutation.

- [ ] **Step 5: Cost-containment acceptance probe**

After the new pipeline is active on the implementation branch/head, create a controlled DEVELOPMENT-only test commit or fixture that deterministically fails a cheap prerequisite without changing production behavior.

Evidence required:
- `cv2/development-preflight` fails;
- Browser Certification heavy job does not start;
- K1 heavy authenticated browser job does not start;
- Supabase deep replay does not start;
- P7 PostgreSQL restore does not start;
- workflow/heavy-job count is materially below the PR #706 baseline of 17 pull-request workflow runs on one exact head.

Revert the controlled failing fixture before candidate qualification.

- [ ] **Step 6: Human Review**

Present exact-head evidence and cost delta. No merge until Human Review approves the cutover.

---

## Rollback

If the candidate coordinator cannot prove required gate coverage or branch/status semantics are ambiguous:

1. do not retire additional legacy triggers;
2. restore previous full candidate behavior for affected gates;
3. keep the DEVELOPMENT preflight improvement only if it does not suppress required assurance;
4. classify the failure as `POLICY_CERTIFICATION`, not as a product defect;
5. no merge until exact-head full assurance is restored.

## Post-cutover operating rule

For future product work:

- ordinary commit → DEVELOPMENT only;
- fix the primary failure before any candidate escalation;
- Ready for review → one CANDIDATE qualification on the exact head;
- new commit after CANDIDATE → back to DEVELOPMENT automatically;
- runtime/deploy checks remain separate;
- no rerun-all; same-SHA targeted retry only for verified transient infrastructure failure.
