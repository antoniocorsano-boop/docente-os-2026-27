# Certification Pipeline V2 — canonical foundation

## Purpose

Certification Pipeline V2 reduces duplicated certification work without weakening exact-head assurance. The invariant remains: a product state is promoted only with evidence bound to the exact state being promoted, or with a deterministic equivalence proof plus the required runtime smoke.

## CV2-0 scope

CV2-0 is advisory infrastructure only. It does not remove, skip, downgrade, or replace any existing gate.

### `certification-impact.v1`

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

The receipt is advisory in CV2-0:

- `advisoryOnly=true`
- `mergeAuthorized=false`

No consumer may interpret a reduced `requiredGates` set as permission to bypass the current workflows until a later CV2 slice explicitly promotes the classifier into the orchestration authority.

### `certification-rebinding.v1`

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

- **CV2-1**: browser certification orchestrator; build once and reuse artifacts/caches where trust boundaries permit it.
- **CV2-2**: operational exact-head evidence rebinding with deterministic Git/tree checks and a new receipt bound to the target SHA.
- **CV2-3**: replace redundant post-merge full suites with runtime smoke when equivalence is proven; full assurance remains mandatory when impact or equivalence requires it.

## Non-goals

CV2 must not make security, write-boundary, accessibility, performance, or human/visual assurance optional merely to reduce execution time. Optimization is permitted only by removing duplicated setup, narrowing gates through explicit impact classification, and reusing evidence through verifiable equivalence.
