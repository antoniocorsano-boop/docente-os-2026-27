# CV2-4 — Development Funnel & Cost Governance

Status: DESIGN_SPEC_FOR_HUMAN_REVIEW  
Date: 2026-10-14  
Repository: `antoniocorsano-boop/docente-os-2026-27`  
Canonical parent: `docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md`

## 1. Purpose

CV2-4 completes Certification Pipeline V2 by separating three concerns that are currently conflated:

1. **development feedback** — determine quickly whether the latest code change is internally coherent;
2. **candidate qualification** — determine whether the complete PR exact head satisfies all assurance requirements implied by the complete PR diff;
3. **runtime verification** — determine whether the promoted state is actually served and healthy in the target runtime.

The objective is to reduce duplicated GitHub Actions work and avoid expensive certification activity on commits that are not yet buildable, while preserving exact-head assurance, fail-closed behavior, security, accessibility, Human + Visual Acceptance, database recovery assurance and human merge authority.

CV2-4 is a cost-governance completion of CV2. It is not permission to weaken existing assurance requirements.

## 2. Problem statement

The repository already has a deterministic impact classifier and a shared browser certification orchestrator, but execution still mixes development and final certification.

A normal pull-request synchronize can trigger many independent workflows. Expensive work may begin even when the current head later fails an earlier prerequisite such as TypeScript typecheck.

Two structural causes dominate:

- full PR base-to-head impact is correctly used for final qualification, but historical PR changes such as migrations therefore continue to trigger expensive work on every later commit;
- multiple workflows independently repeat checkout, dependency installation, build, browser preparation, database setup or other environment work.

The result is a certification feedback loop whose cost grows with intermediate commits rather than with genuinely qualifiable candidates.

## 3. Design principles

### 3.1 Assurance is preserved

CV2-4 MUST NOT reduce the assurance required for a candidate exact head. If the complete PR diff requires DB, security, accessibility, performance or browser assurance, the candidate must still receive it before qualification.

### 3.2 Development evidence is not qualification evidence

A successful development preflight proves only that the current incremental change is coherent enough to continue development. It MUST NOT authorize merge, promotion, persistence, evidence rebinding or candidate qualification.

### 3.3 Fail fast before expensive work

Cheap deterministic checks must precede expensive environment-dependent checks. A failure in a prerequisite must prevent downstream expensive work whose result cannot change that prerequisite failure.

### 3.4 Exact-head qualification remains canonical

Candidate qualification remains bound to the exact PR head SHA and the complete PR base-to-head diff. CV2-4 changes *when* expensive assurance runs, not the exact-head invariant.

### 3.5 One source of truth

`docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md` remains the normative certification architecture. `docs/architecture/RUNTIME_RELEASE_CONTRACT_V1.md` remains the normative application/schema/capability timing contract. The two documents MUST be updated consistently when CV2-4 is implemented. `AGENTS.md` must point to the canonical contracts rather than duplicate their rules.

### 3.6 Cost is an engineering quality attribute

Avoidable Actions execution, repeated setup and redundant certification are engineering waste and must be observable and reducible without weakening assurance.

## 4. Canonical states

Every active product PR that can affect runtime or assurance has one of four process states.

### `DEVELOPMENT`

The PR is being changed. Feedback must be fast and bounded. Heavy assurance is not automatically authorized.

### `CANDIDATE`

A specific exact head has passed development preflight and has been explicitly submitted for qualification. The full base-to-head impact contract is evaluated and all required candidate gates run.

### `QUALIFIED`

All required candidate gates for that exact head are satisfied and any required human review has passed. Qualification does not itself authorize merge or promotion unless existing governance separately authorizes them.

### `REWORK`

A candidate gate found a real code or policy defect. The PR returns to development. Cascade failures are not independent defects.

Transitions:

`DEVELOPMENT -> CANDIDATE -> QUALIFIED`

or

`DEVELOPMENT -> CANDIDATE -> REWORK -> DEVELOPMENT`

Any new commit after `CANDIDATE` or `QUALIFIED` creates a new SHA with no valid candidate receipt and therefore returns the effective PR state to `DEVELOPMENT` automatically.

GitHub Draft/Ready state is the **transition mechanism**, not the source of truth for qualification. The authoritative state remains the exact-head status/receipt. A Ready PR with a newer, uncertified SHA is DEVELOPMENT until that SHA is explicitly re-candidated.

## 5. Development funnel

The DEVELOPMENT funnel operates on the latest incremental change and minimizes time-to-root-cause.

Default order:

1. checkout exact head;
2. validate static repository/CI contracts required for safe execution;
3. install or restore cached dependencies once;
4. run targeted contract tests implied by changed files when available;
5. run TypeScript typecheck;
6. run affected unit/integration tests or the minimum safe product test slice;
7. run lint where applicable;
8. run build only after prerequisites that make build meaningful have passed.

Ordering may later be tuned using measured failure-detection value, but expensive browser, database-recovery and full assurance work remains outside ordinary DEVELOPMENT.

### 5.1 Development scope

Development feedback SHOULD use the smallest trustworthy scope that explains the latest change, for example:

- previous branch head -> current branch head;
- changed paths in the latest commit;
- explicit task-local test contracts;
- deterministic dependency closure where the repository has such mapping.

This incremental scope is DEVELOPMENT-only and MUST NOT replace base-to-head candidate impact classification.

### 5.2 Development stop rule

If a development prerequisite fails, downstream expensive work MUST NOT start automatically.

At minimum:

- typecheck failure blocks build-dependent browser work;
- build failure blocks application/browser acceptance;
- deterministic contract-test failure blocks candidate escalation;
- migration syntax/schema preflight failure blocks deeper database assurance.

### 5.3 Database development scope

For DB/persistence changes, DEVELOPMENT runs only cheap deterministic L0/static migration checks sufficient to detect obvious contract or lineage errors. Full ephemeral Supabase replay and recovery rehearsal are CANDIDATE assurance when the full base-to-head impact requires them.

This refines the timing described by Runtime Release Contract V1; implementation MUST update that document so no future agent interprets `DB/persistenza: L0 + L1` as authorization to run L1 on every ordinary synchronize event.

## 6. Canonical CANDIDATE transition

There is exactly one machine event that authorizes entry into `CANDIDATE`: **`pull_request` with activity type `ready_for_review`**, for PRs targeting the governed `develop` branch.

This choice is deliberate. The repository default branch is `main`, while `develop` is the governed product line. `workflow_dispatch` and other default-branch-bound events MUST NOT be the canonical candidate authority because that would require duplicating or governing the candidate workflow from stale `main`.

Ordinary `pull_request` events including `opened`, `reopened` and `synchronize` MUST NOT themselves authorize heavy candidate certification.

The `ready_for_review` candidate contract must:

1. read PR number, base SHA and head SHA from the event;
2. re-read the PR immediately before candidate work;
3. fail closed if the live PR head no longer equals the event head SHA;
4. require `cv2/development-preflight` success for that exact head SHA;
5. explicitly checkout `github.event.pull_request.head.sha`, never rely on the default PR merge ref for exact-head evidence;
6. generate a candidate receipt bound to PR base SHA and exact tested head SHA;
7. evaluate the complete base-to-head changed-file set;
8. run every heavy gate required by the authoritative certification and runtime-release contracts.

The Ready transition is an execution boundary, not a human merge authority. An authorized agent or maintainer may mark a Draft PR Ready once DEVELOPMENT is green without asking for a separate product decision. Human review remains mandatory only where existing governance requires it.

After `REWORK` or after a new commit invalidates a prior candidate, re-candidating the current SHA requires an explicit `Draft -> Ready for review` transition. The implementation and `AGENTS.md` must make this recovery path explicit so agents never attempt to obtain a new candidate run by rerunning stale heavy jobs.

## 7. Runtime verification

Runtime workflows remain separate from application candidate assurance.

Runtime checks answer whether the promoted exact product state is actually available and healthy in the target runtime. They may include deployment reconciliation, runtime HVA/smoke and other existing release-contract checks.

CV2-4 MUST NOT convert runtime evidence into development evidence or vice versa.

## 8. Heavy-gate policy

The following classes are heavy or externally material for cost-governance purposes:

- browser preparation and Playwright/Chromium execution;
- HVA;
- WCAG automated browser assurance;
- performance baselines;
- critical write E2E;
- full Supabase migration replay;
- PostgreSQL backup/restore rehearsal;
- future workflows that start service containers, browsers or full product environments.

Heavy gates are permitted during CANDIDATE, explicit manual diagnostics, push/runtime flows already required by governance, or the one-time qualification of the certification contract itself.

They are not automatically authorized by ordinary DEVELOPMENT synchronize events.

Manual diagnostic execution must be the narrowest gate needed to gather missing evidence; it is not a bypass for the candidate lifecycle.

## 9. Failure classification

Every candidate failure must receive one primary class before rerun or code modification.

### `CODE_REGRESSION`

A reproducible defect caused by source, tests, migrations or build configuration. Return to DEVELOPMENT and fix the root cause.

### `POLICY_CERTIFICATION`

The product may compile, but a governance, security, accessibility, design, evidence or certification contract is not satisfied. Correct the contract violation; do not treat it as infrastructure noise.

### `INFRA_TRANSIENT`

The tested exact head is not implicated and evidence supports an external/transient runner, network, package registry or service failure. Only the failed job may be retried when safe.

### `CASCADE`

A downstream gate could not produce meaningful independent evidence because an upstream prerequisite failed. Cascade failures MUST NOT be counted as separate product defects and SHOULD NOT be individually rerun.

One primary root cause may therefore explain multiple red statuses.

## 10. Rerun policy

The default is **no indiscriminate rerun**.

Allowed:

- same-SHA retry of a job classified `INFRA_TRANSIENT`;
- explicit diagnostic execution needed to gather evidence;
- a new full candidate qualification after a current exact head has passed DEVELOPMENT and has been re-candidated through Draft -> Ready.

Disallowed:

- rerun all failed jobs without failure classification;
- rerun browser/DB gates while the exact head still fails typecheck/build prerequisites;
- repeat full certification merely to obtain green without a root-cause change;
- use a stale candidate run as evidence for a newer head SHA.

## 11. Persistence across chats and agents

CV2-4 must be recoverable from repository state without conversational memory.

Implementation must therefore:

1. update `docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md` with the approved CV2-4 lifecycle contract;
2. update `docs/architecture/RUNTIME_RELEASE_CONTRACT_V1.md` so L0/L1 timing is consistent with DEVELOPMENT/CANDIDATE;
3. add a mandatory pointer in `AGENTS.md` requiring both contracts to be read before significant work involving code changes, CI, testing, PR qualification, reruns, merge/promotion or workflow changes;
4. keep temporary run IDs, diagnostics and task checkpoints outside canonical architecture documents;
5. expose lifecycle through SHA-bound statuses/receipts rather than chat reconstruction;
6. add contract tests that fail if DEVELOPMENT/CANDIDATE separation, exact-head binding or candidate transition semantics are accidentally removed.

Canonical status contexts should be stable and machine-readable. The implementation plan should use these names unless an existing required context forces an alias:

- `cv2/development-preflight`
- `cv2/candidate-qualification`

A new agent session must be able to determine the governing process from repository files, PR Draft/Ready transition history and current exact-head statuses alone.

## 12. CI topology target

### Layer A — Development Preflight

Runs on ordinary relevant PR synchronization.

Properties:

- cheap;
- deterministic where possible;
- fail-fast;
- no browser or recovery containers;
- no candidate authority;
- publishes `cv2/development-preflight` for the exact head.

### Layer B — Candidate Certification Orchestrator

Runs only from `pull_request.ready_for_review` on PRs targeting `develop`.

Properties:

- re-reads the PR and verifies event head SHA against the live head;
- explicitly checks out the exact PR head SHA;
- requires green DEVELOPMENT preflight on the same SHA;
- uses full PR base-to-head impact;
- selects heavy gates using authoritative contracts;
- shares expensive setup where technically safe;
- publishes `cv2/candidate-qualification` and exact-head receipts;
- keeps human gates human.

### Layer C — Runtime Assurance

Runs on the promoted/deployed lifecycle under existing runtime contracts.

Properties:

- verifies served state;
- avoids application reassurance only where deterministic evidence reuse is already authorized;
- remains fail-closed when equivalence cannot be proven.

## 13. Workflow migration strategy

Migration must be staged so the control system is not weakened while being changed.

### Stage 1 — Contract qualification

Add CV2-4 canonical documentation and contract tests while current workflows remain authoritative. Because central certification policy changes, one-time full assurance is expected.

### Stage 2 — Development preflight

Introduce/reshape the cheap DEVELOPMENT workflow and demonstrate that ordinary synchronize events cannot authorize heavy browser/DB work.

### Stage 3 — Candidate orchestrator

Introduce the `ready_for_review` candidate path with exact-head lease, DEVELOPMENT prerequisite and full base-to-head classification. Prove it on Draft PRs targeting `develop` before retiring any legacy trigger.

### Stage 4 — Retire duplicate PR triggers

Complete the existing CV2-1B intent by removing redundant automatic PR heavy triggers only after the candidate orchestrator and required status semantics have been exact-head certified.

### Stage 5 — Measure and tighten

Record workflow/run counts and execution minutes by logical layer. Remove remaining duplicated setup without weakening assurance.

## 14. Cost observability

CV2-4 does not require GitHub billing API access.

Repository evidence should answer:

- how many workflows started for a DEVELOPMENT commit;
- how many heavy jobs started before candidate transition;
- how many candidate qualifications occurred per PR;
- how many reruns were transient vs code/policy;
- whether expensive setup was duplicated across gates.

Initial implementation may use workflow metadata and receipts rather than a new datastore.

First hard target:

> An ordinary DEVELOPMENT commit that fails a cheap prerequisite must not automatically start heavy certification work.

A later optimization may add an Actions-minute budget after a reliable baseline exists.

## 15. Security and governance invariants

CV2-4 MUST preserve:

- exact-head SHA binding for candidate evidence;
- fail-closed behavior for unknown relevant files and invalid impact receipts;
- no automatic merge;
- no automatic Beta promotion introduced by CV2-4;
- no weakening of ASVS/security requirements;
- no weakening of DB recovery requirements when the full candidate diff requires them;
- no weakening of WCAG, HVA or performance requirements when required;
- no use of DEVELOPMENT evidence as product/institutional authority;
- no live database mutation as part of CI optimization;
- no candidate authority hosted only on stale/default `main` while `develop` remains the governed product line.

## 16. Interaction with current CV2 and Runtime Release contracts

`certification-impact.v1` remains authoritative for candidate heavy-gate selection.

`certification-gate-decision.v1` remains fail-closed and exact-head bound.

`certification-rebinding.v1` remains the only future route for deterministic evidence reuse across equivalent product states.

The Runtime Release Contract remains responsible for application/schema/capability coherence and runtime reconciliation, but its execution timing is refined by CV2-4:

- DEVELOPMENT: L0/static preflight only;
- CANDIDATE with DB/persistence impact: L0 + L1 ephemeral replay and required recovery assurance;
- RUNTIME after promotion: L2 reconciliation;
- critical write paths: L3 only when the isolated fixture contract authorizes it.

Implementation MUST update the Runtime Release Contract text to state this timing explicitly. CV2-4 therefore adds lifecycle timing and cost-governance semantics without replacing the impact or release contracts.

## 17. Acceptance criteria

Implementation is complete only when all are demonstrated on exact heads:

1. repository documentation contains one canonical DEVELOPMENT/CANDIDATE/RUNTIME model;
2. both `CERTIFICATION_PIPELINE_V2_CANONICAL.md` and `RUNTIME_RELEASE_CONTRACT_V1.md` are aligned with that model;
3. `AGENTS.md` requires future agents to load those contracts before CI/qualification work;
4. ordinary PR synchronize enters DEVELOPMENT and cannot itself authorize full candidate qualification;
5. a deliberately failing typecheck or equivalent cheap prerequisite starts no browser certification, full Supabase replay or DB restore/rehearsal as a consequence of that synchronize event;
6. `pull_request.ready_for_review` is the single automatic CANDIDATE authority for PRs targeting `develop`;
7. the candidate workflow re-reads the PR and fails closed if the live head differs from the event head SHA;
8. the candidate workflow refuses a head without green `cv2/development-preflight`;
9. the candidate workflow explicitly checks out and certifies the exact PR head SHA;
10. a valid candidate evaluates the full base-to-head diff and runs every heavy gate required by certification/runtime-release contracts;
11. a new commit after candidate qualification has no valid candidate status for the new SHA;
12. requalification after REWORK requires a new Draft -> Ready transition rather than rerunning stale heavy jobs;
13. cascade failures are distinguishable from primary failures;
14. same-SHA targeted retry remains possible for verified transient infrastructure failure;
15. legacy duplicate PR heavy triggers are removed or made non-duplicative only after the new candidate path is qualified;
16. one-time full assurance of the changed certification contract passes;
17. no auto-merge, live DB mutation or Beta promotion is introduced;
18. exact-head workflow/heavy-job count for a failing DEVELOPMENT preflight is materially below the current baseline behavior.

## 18. Non-goals

CV2-4 does not:

- remove exact-head qualification;
- automate human review;
- eliminate browser, accessibility, security, performance or recovery testing;
- introduce a GitHub billing dependency;
- optimize every workflow in one change;
- mix CPRI-01 concerns into CI governance;
- replace the existing classifier with a second classifier;
- authorize evidence reuse without the established equivalence contract;
- change the repository default branch as a side effect of CI cost governance.

## 19. Rollback principle

If DEVELOPMENT/CANDIDATE routing cannot deterministically prove that required candidate gates still run, the system must fail closed by retaining or restoring previous full candidate behavior.

Rollback favors excess assurance over silent under-testing.

## 20. Implementation boundary

Implementation will occur on a dedicated CI-governance branch/PR, separate from CPRI-01 PR #706.

The implementation plan must identify the minimum workflow, canonical-document and contract-test changes necessary to realize CV2-4. Unrelated product refactors are out of scope.

No workflow implementation begins until this written design has received explicit Human Architecture Review approval and a separate implementation plan has been reviewed.