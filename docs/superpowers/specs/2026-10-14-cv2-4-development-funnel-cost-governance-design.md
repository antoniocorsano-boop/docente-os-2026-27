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

The current repository already has a deterministic impact classifier and a shared browser certification orchestrator, but the execution model still mixes development and final certification.

A normal pull-request synchronize can currently trigger many independent workflows. Expensive work may begin even when the current head later fails an earlier logical prerequisite such as TypeScript typecheck.

Two structural causes are relevant:

- some workflows classify the entire PR diff from base SHA to exact head, which is correct for final qualification but causes historical PR changes such as migrations to keep triggering expensive work on every later commit;
- multiple workflows independently perform checkout, dependency installation, build, browser preparation, database setup or other repeated environment work.

This produces a certification feedback loop whose cost is proportional to the number of intermediate commits rather than to the number of genuinely qualifiable candidates.

## 3. Design principles

### 3.1 Assurance is preserved

CV2-4 MUST NOT reduce the assurance required for a candidate exact head. If a complete PR diff requires DB, security, accessibility, performance or browser assurance, the candidate must still receive it before qualification.

### 3.2 Development evidence is not qualification evidence

A successful development preflight proves only that the current incremental change is coherent enough to continue development. It MUST NOT authorize merge, promotion, persistence, evidence rebinding or candidate qualification.

### 3.3 Fail fast before expensive work

Cheap deterministic checks must precede expensive environment-dependent checks. A failure in a prerequisite must prevent downstream expensive work whose result cannot change the prerequisite failure.

### 3.4 Exact-head qualification remains canonical

Candidate qualification remains bound to the exact PR head SHA and the complete PR base-to-head diff. CV2-4 changes *when* expensive assurance runs, not the exact-head invariant.

### 3.5 One source of truth

`docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md` remains the normative architecture. This design introduces CV2-4 as an extension of that contract. `AGENTS.md` must reference the canonical contract rather than duplicate its rules.

### 3.6 Cost is an engineering quality attribute

A CI pipeline is not mature if correctness requires unnecessary repeated compute. CV2-4 treats avoidable Actions execution, repeated setup and redundant certification as observable engineering waste.

## 4. Canonical states

Every active product PR that can affect runtime or assurance has one of four process states:

### `DEVELOPMENT`

The PR is being changed. Feedback must be fast and bounded. Heavy assurance is not automatically authorized.

### `CANDIDATE`

The exact head has passed development preflight and is explicitly submitted for qualification. The full base-to-head impact contract is evaluated and all required candidate gates run.

### `QUALIFIED`

All required candidate gates for the exact head are satisfied and any required human review has passed. Qualification does not itself authorize merge or promotion unless existing governance separately authorizes those actions.

### `REWORK`

A candidate gate found a real defect or a policy failure. The PR returns to development. Cascade failures are not treated as independent defects.

Transitions:

`DEVELOPMENT -> CANDIDATE -> QUALIFIED`

or

`DEVELOPMENT -> CANDIDATE -> REWORK -> DEVELOPMENT`

A new commit after `CANDIDATE` or `QUALIFIED` invalidates that exact-head candidate state and returns the PR to `DEVELOPMENT`.

## 5. Development funnel

The development funnel operates on the latest incremental change and exists to minimize time-to-root-cause.

The default order is:

1. checkout exact head;
2. validate repository/static CI contracts needed to run safely;
3. install/cache dependencies once;
4. run targeted contract tests implied by the changed files when available;
5. run TypeScript typecheck;
6. run affected unit/integration tests or the minimum safe product test slice;
7. run lint where applicable;
8. run build only after prerequisites that make build meaningful have passed.

The concrete ordering may be optimized when measured evidence shows another cheap prerequisite has higher failure-detection value, but expensive browser, database-recovery and full assurance work remains outside DEVELOPMENT.

### 5.1 Development scope

Development feedback SHOULD use the smallest trustworthy scope that explains the latest change. It may consider:

- previous branch head -> current branch head;
- changed paths in the latest commit;
- explicit task-local test contracts;
- deterministic dependency closure where the repository has such mapping.

This incremental scope is advisory for development only and MUST NOT substitute for base-to-head candidate impact classification.

### 5.2 Development stop rule

If a development prerequisite fails, downstream expensive work MUST NOT start automatically.

At minimum:

- typecheck failure blocks build-dependent browser work;
- build failure blocks application/browser acceptance;
- deterministic contract-test failure blocks candidate escalation;
- migration syntax/schema preflight failure blocks deeper database assurance.

## 6. Candidate qualification

Candidate qualification is an explicit event, not an automatic consequence of every PR synchronize.

A candidate is created by a governed transition such as:

- `ready_for_review`; or
- an explicit workflow dispatch/status transition defined by the implementation plan.

The implementation must choose one canonical machine-detectable mechanism and avoid two parallel candidate authorities.

Candidate qualification uses:

- PR base SHA;
- exact tested head SHA;
- full base-to-head changed-file set;
- `certification-impact.v1` and its fail-closed rules;
- runtime-release impact classification;
- all currently required security, DB, browser, accessibility, performance and governance gates.

No candidate gate may infer success from DEVELOPMENT evidence unless a future evidence-rebinding contract explicitly proves equivalence under the existing CV2 rules.

## 7. Runtime verification

Runtime workflows remain separate from local/application candidate assurance.

Runtime checks answer whether the promoted exact product state is actually available and healthy in the target runtime. They may include deployment reconciliation, runtime HVA/smoke and other existing release-contract checks.

CV2-4 MUST NOT convert runtime evidence into development evidence or vice versa.

## 8. Heavy-gate policy

The following classes are considered heavy or externally material for cost-governance purposes:

- browser preparation and Playwright/Chromium execution;
- HVA;
- WCAG automated browser assurance;
- performance baselines;
- critical write E2E;
- full Supabase migration replay;
- PostgreSQL backup/restore rehearsal;
- other future workflows that start service containers, browsers or full product environments.

Heavy gates are allowed during CANDIDATE, explicit manual verification, push/runtime flows where already required by governance, or when the certification contract itself is under one-time qualification.

They are not automatically authorized by ordinary DEVELOPMENT synchronize events.

## 9. Failure classification

Every candidate failure must be assigned one primary class before rerun or code modification:

### `CODE_REGRESSION`

A reproducible defect caused by source, tests, migrations or build configuration. Return to DEVELOPMENT and fix the root cause.

### `POLICY_CERTIFICATION`

The product may compile, but a governance, security, accessibility, design, evidence or certification contract is not satisfied. Correct that contract violation; do not treat it as infrastructure noise.

### `INFRA_TRANSIENT`

The tested exact head is not implicated and evidence supports an external/transient runner, network, package registry or service failure. Only the failed job may be retried when safe.

### `CASCADE`

A downstream gate could not produce meaningful independent evidence because an upstream prerequisite failed. Cascade failures MUST NOT be counted as separate product defects and SHOULD NOT be individually rerun.

A single primary root cause may therefore explain multiple red commit statuses.

## 10. Rerun policy

The default is **no indiscriminate rerun**.

Allowed reruns:

- same-SHA retry of a job classified `INFRA_TRANSIENT`;
- explicit manual diagnostic execution when needed to gather evidence;
- full candidate recertification after a new exact head has passed DEVELOPMENT.

Disallowed patterns:

- rerun all failed jobs without failure classification;
- rerun browser/DB gates when the exact head still fails typecheck/build prerequisites;
- repeated full certification merely to obtain a green result without a root-cause change.

## 11. Persistence across chats and agents

CV2-4 must be recoverable from the repository without conversational memory.

Implementation must therefore:

1. update `docs/architecture/CERTIFICATION_PIPELINE_V2_CANONICAL.md` with the final approved CV2-4 contract;
2. add a mandatory pointer in `AGENTS.md` requiring the canonical CV2 contract to be read before significant work involving code changes, CI, testing, PR qualification, reruns, merge/promotion or workflow changes;
3. keep temporary run IDs, diagnostics and task checkpoints outside canonical architecture documents;
4. expose process state through repository/PR machine-readable signals rather than requiring reconstruction from chat history;
5. add contract tests that fail if the key DEVELOPMENT/CANDIDATE separation is accidentally removed.

A new agent session must be able to determine the governing process from repository files alone.

## 12. CI topology target

The target architecture has three logical layers.

### Layer A — Development Preflight

Runs on ordinary PR synchronization for relevant paths.

Properties:

- cheap;
- deterministic where possible;
- fail-fast;
- no browser/container recovery assurance;
- does not authorize candidate qualification;
- publishes a clear development-preflight status.

### Layer B — Candidate Certification Orchestrator

Runs only for an explicit candidate transition.

Properties:

- exact-head;
- full base-to-head impact classification;
- heavy gates selected by authoritative contracts;
- shared setup where technically safe;
- one candidate receipt/status surface;
- human gates remain human.

### Layer C — Runtime Assurance

Runs on the promoted/deployed lifecycle according to existing runtime contracts.

Properties:

- verifies served state;
- does not redo application assurance when deterministic evidence reuse is already authorized;
- remains fail-closed when equivalence cannot be proven.

## 13. Workflow migration strategy

Migration must be staged to avoid disabling controls while changing the control system.

### Stage 1 — Contract qualification

Add CV2-4 documentation and tests while current workflows remain authoritative. Because central certification policy changes, one-time full assurance is expected.

### Stage 2 — Development preflight

Introduce/reshape the cheap DEVELOPMENT workflow and prove that prerequisite failures prevent heavy work from being required for ordinary synchronize events.

### Stage 3 — Candidate trigger

Move PR heavy-gate automatic authorization from every synchronize event to the canonical CANDIDATE transition. Preserve manual and runtime triggers where required.

### Stage 4 — Retire duplicate PR triggers

Complete the existing CV2-1B intent by removing redundant legacy PR triggers only after the shared orchestrator and required status semantics have been exact-head certified.

### Stage 5 — Measure and tighten

Record workflow/run counts and execution minutes by logical layer. Use the evidence to remove remaining duplicated setup without weakening assurance.

## 14. Cost observability

CV2-4 does not require direct GitHub billing API access.

The repository should nevertheless expose enough evidence to answer:

- how many workflows started for a DEVELOPMENT commit;
- how many heavy jobs started before candidate qualification;
- how many candidate certifications occurred per PR;
- how many reruns were classified transient vs code/policy;
- whether expensive setup was duplicated across gates.

Initial implementation may use workflow metadata and receipts rather than a new persistent datastore.

The first hard target is structural, not monetary:

> An ordinary DEVELOPMENT commit that fails a cheap prerequisite must not automatically start heavy certification work.

A later optimization may add a numerical Actions-minute budget once reliable baseline data is available.

## 15. Security and governance invariants

CV2-4 MUST preserve these invariants:

- exact-head SHA binding for candidate evidence;
- fail-closed behavior for unknown relevant files and invalid impact receipts;
- no automatic merge;
- no automatic Beta promotion introduced by CV2-4;
- no weakening of ASVS/security requirements;
- no weakening of DB recovery requirements when the full candidate diff requires them;
- no weakening of WCAG, HVA or performance requirements when the classifier requires them;
- no use of DEVELOPMENT evidence as institutional/product authority;
- no live database mutation as part of CI optimization.

## 16. Interaction with current CV2 contracts

`certification-impact.v1` remains authoritative for candidate heavy-gate selection.

`certification-gate-decision.v1` remains fail-closed and exact-head bound.

`certification-rebinding.v1` remains the only route for future deterministic evidence reuse across equivalent product states.

The Runtime Release Contract remains responsible for application/schema/capability coherence and runtime reconciliation.

CV2-4 therefore adds lifecycle timing and cost-governance semantics without replacing existing impact or release contracts.

## 17. Acceptance criteria

CV2-4 implementation is complete only when all of the following are demonstrated on an exact head:

1. repository documentation contains one canonical DEVELOPMENT/CANDIDATE/RUNTIME model;
2. `AGENTS.md` requires future agents to load the canonical model before CI/qualification work;
3. ordinary PR synchronize enters DEVELOPMENT, not automatic full candidate qualification;
4. a deliberately failing typecheck or equivalent cheap prerequisite does not start browser certification or DB restore/replay work as a consequence of that synchronize event;
5. an explicit CANDIDATE transition evaluates the full base-to-head diff and runs every heavy gate required by `certification-impact.v1` and runtime-release impact;
6. changing the head after candidate qualification invalidates the old candidate state;
7. cascade failures are distinguishable from primary failures in evidence/status reporting;
8. same-SHA targeted retry remains possible for verified transient infrastructure failure;
9. legacy duplicate PR heavy triggers are removed or made non-duplicative after the new orchestrator is qualified;
10. one-time full assurance of the changed certification contract passes;
11. no auto-merge, live DB mutation or Beta promotion is introduced;
12. the exact-head workflow count for a failing DEVELOPMENT preflight is materially lower than the current baseline behavior.

## 18. Non-goals

CV2-4 does not:

- remove exact-head qualification;
- make human review automatic;
- eliminate browser, accessibility, security, performance or recovery testing;
- introduce a GitHub billing dependency;
- optimize every workflow in one change;
- merge CPRI-01 concerns into CI governance;
- replace the existing CV2 classifier with a second classifier;
- authorize evidence reuse without the established equivalence contract.

## 19. Rollback principle

If the new DEVELOPMENT/CANDIDATE routing cannot deterministically prove that required candidate gates still run, the system must fail closed by restoring/retaining the previous full candidate behavior.

Rollback must favor excess assurance over silent under-testing.

## 20. Implementation boundary

Implementation will occur on a dedicated CI-governance branch/PR, separate from CPRI-01 PR #706.

The implementation plan must identify the minimum workflow and contract-test changes necessary to realize CV2-4. Unrelated product refactors are out of scope.

No workflow implementation begins until this written design has received Human Architecture Review approval and a separate implementation plan has been reviewed.