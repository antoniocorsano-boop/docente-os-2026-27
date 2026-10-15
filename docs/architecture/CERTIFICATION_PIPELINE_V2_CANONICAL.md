# Certification Pipeline V2 — canonical foundation

## Purpose

Certification Pipeline V2 reduces duplicated certification work without weakening exact-head assurance. The invariant remains: a product state is promoted only with evidence bound to the exact state being promoted, or with a deterministic equivalence proof plus the required runtime smoke.

## `certification-impact.v1`

The impact classifier receives the changed file set for an exact PR head and produces a deterministic machine-readable receipt.

Dimensions:

- `ui`
- `accessibility`
- `planner_write`
- `performance`
- `security`
- `runtime`
- `certification_contract`

Every positive dimension includes file-level reasons. A relevant file that cannot be classified forces `conservative=true` and the full heavy-gate set. The classifier is therefore fail-closed.

From CV2-1 the receipt is authorized to select browser certification work:

- `orchestrationAuthorized=true`
- `advisoryOnly=false`
- `mergeAuthorized=false`

This authority is deliberately narrow: the receipt may decide whether a browser gate is `RUN` or `NOT_APPLICABLE` for the exact PR head. It can never authorize merge, promotion, persistence, or evidence rebinding.

A central certification-policy change (`.github/scripts/certification/**`, browser orchestrator, Product CI certification contract, queue-governance contract, classifier workflow, canonical CV2 contract) requires a one-time full heavy certification. A change to one heavy-gate workflow requires at least that gate. Unknown relevant files require all heavy gates.

## `certification-gate-decision.v1`

A gate may be skipped only when all of these conditions are true:

1. the receipt schema is exactly `certification-impact.v1`;
2. `orchestrationAuthorized=true` and `advisoryOnly=false`;
3. `mergeAuthorized=false`;
4. `requiredGates` is valid;
5. receipt `baseSha` equals the PR base SHA;
6. receipt `testedSha` equals the exact PR head SHA;
7. `conservative=false`;
8. the gate is absent from `requiredGates`.

Any missing receipt, parser failure, checkout failure, SHA mismatch, unknown gate, malformed field, conservative classification, or execution error produces `RUN` with `failClosed=true`.

`NOT_APPLICABLE` is evidence that the gate was not required by the exact-head impact contract. It must never be described as a browser test having passed.

## CV2-1 browser certification orchestrator

For pull requests, HVA, WCAG 2.2 AA, P6 and X4 share a two-stage workflow:

1. **preflight** — lightweight, outside the governed MFA concurrency group; creates the exact-head impact receipt and gate decisions;
2. **selected browser certification** — enters the governed MFA queue only if at least one browser gate is required.

When browser work is required, the selected gates share one trusted preparation chain:

`checkout exact head → Node 22 → npm ci → pinned Playwright/axe → build once → start once → Chromium once → selected gates`

The orchestrator publishes per-gate commit statuses. A non-required gate is published as `CV2 NOT_APPLICABLE`; a required gate receives success/failure only from its real selected test. Consolidated evidence is retained for 90 days.

The legacy HVA/WCAG/P6/X4 workflows remain authoritative for push/runtime and explicit manual execution until their PR triggers are retired after the orchestrator itself has passed full certification. This staged cutover prevents a new orchestrator from disabling the controls that are validating it.

## CV2-4 DEVELOPMENT → CANDIDATE → RUNTIME lifecycle

CV2-4 separates cheap development feedback, exact-head candidate qualification and post-promotion runtime assurance. It changes when expensive assurance is allowed to run; it does not weaken any gate required by the complete candidate diff.

### DEVELOPMENT

Ordinary `pull_request` activity on the governed `develop` line (`opened`, `reopened`, `synchronize`) is DEVELOPMENT. DEVELOPMENT is fail-fast and bounded: static contracts, dependency installation, typecheck, product tests, lint and build precede any expensive environment-dependent work. Heavy browser certification, full Supabase replay and recovery rehearsal are not authorized by ordinary DEVELOPMENT synchronization.

A successful DEVELOPMENT head publishes the stable exact-head status:

- `cv2/development-preflight`

This status proves only that the current head is coherent enough to be considered for candidate qualification. It never authorizes merge, promotion, persistence or evidence rebinding.

### CANDIDATE

There is exactly one automatic PR event that authorizes candidate qualification: `pull_request` with activity type `ready_for_review`, targeting `develop`.

The candidate orchestrator must:

1. bind the event PR, base SHA and exact head SHA;
2. re-read the live PR immediately before candidate work;
3. fail closed when the live head differs from the event head;
4. require same-SHA success of `cv2/development-preflight`;
5. explicitly checkout the exact PR head rather than the merge ref;
6. classify the complete base-to-head diff with `certification-impact.v1`;
7. apply Runtime Release Contract timing for DB/recovery assurance;
8. run every required heavy gate and publish one machine-readable candidate receipt.

The stable final status is:

- `cv2/candidate-qualification`

Candidate evidence is SHA-bound. Any new commit invalidates the prior candidate receipt and returns the effective state to DEVELOPMENT. Requalification requires an explicit Draft → Ready transition on the new exact head; rerunning stale heavy jobs is not a substitute.

### QUALIFIED / REWORK

A candidate becomes QUALIFIED only when every authoritative required gate for that exact head is success or explicit `NOT_APPLICABLE`, and any human gate required by existing governance has passed. A real code or policy failure yields REWORK and returns the PR to DEVELOPMENT after correction.

Failures are classified as `CODE_REGRESSION`, `POLICY_CERTIFICATION`, `INFRA_TRANSIENT` or `CASCADE`. Same-SHA retry is permitted only for evidence-backed `INFRA_TRANSIENT`. `CASCADE` is not an independent defect and is never a reason for rerun-all.

### RUNTIME

RUNTIME assurance remains separate from DEVELOPMENT and CANDIDATE. It verifies that the promoted exact state is actually served and coherent in the target runtime. DEVELOPMENT evidence cannot substitute for runtime evidence, and runtime evidence cannot retroactively qualify a stale candidate SHA.

### Cost-governance invariant

An ordinary DEVELOPMENT commit that fails a cheap prerequisite must not automatically start browser certification, authenticated K1 work, full Supabase replay or PostgreSQL restore rehearsal. Central certification-policy changes receive a deliberate one-time shadow qualification before legacy controls are retired and a final exact-head qualification after cutover.

## `certification-rebinding.v1`

Evidence rebinding is allowed to become *eligible* only when all of these facts are explicitly proven true:

1. product tree equivalence;
2. lockfile equivalence;
3. migration-set equivalence;
4. certification-contract equivalence;
5. complete source certification.

Missing evidence is not inferred. Any false or missing proof produces `BLOCKED`.

Even when the result is `ELIGIBLE`, the contract always returns:

- `promotionAuthorized=false`
- `persistentEffect=NONE`
- `requiresRuntimeSmokeBeforePromotion=true`

Therefore rebinding eligibility is not a release decision.

## Planned migration

- **CV2-1A**: certify the shared browser orchestrator while legacy PR gates remain active.
- **CV2-1B**: retire duplicate legacy PR triggers after exact-head certification of CV2-1A; preserve runtime/manual workflows.
- **CV2-2**: operational exact-head evidence rebinding with deterministic Git/tree checks and a new receipt bound to the target SHA.
- **CV2-3**: replace redundant post-merge full suites with runtime smoke when equivalence is proven; full assurance remains mandatory when impact or equivalence requires it.
- **CV2-4**: DEVELOPMENT preflight → exact-head CANDIDATE via Draft → Ready → separate RUNTIME assurance, with staged retirement of duplicated heavy PR work only after shadow qualification.

## Non-goals

CV2 must not make security, write-boundary, accessibility, performance, or human/visual assurance optional merely to reduce execution time. Optimization is permitted only by removing duplicated setup, narrowing gates through explicit impact classification, and reusing evidence through verifiable equivalence.


## Runtime Release Contract companion

Il Runtime Release Contract V1 è complementare a CV2 e non ne modifica il significato dei gate.

CV2 risponde a: **quali assurance gate sono richiesti da questo diff?**

Il Runtime Release Contract risponde a: **quali verifiche di coerenza applicazione/schema/capability devono essere eseguite e quando?**

La classificazione centrale considera quindi modifiche al Runtime Release Contract come modifiche di orchestrazione e richiede una one-time full assurance del contratto stesso.

Il costo resta selettivo:
- DEVELOPMENT: preflight statico L0 su ogni diff rilevante;
- CANDIDATE con impatto DB/persistenza: replay Supabase locale L1 e recovery assurance richiesto;
- RUNTIME: riconciliazione L2 sul Beta dopo promozione;
- write E2E reale L3 solo su percorsi critici e solo con fixture isolata.
