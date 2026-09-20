# ECO Agentic Officina — Run 001

Run ID: `ECO-OFFICINA-RUN-001`  
Contract: `ECO-AGENTIC-OFFICINA-V1`  
Target: **ECO-02 teacher-first pilot lineage**  
Date: 2026-09-20  
Status: **AWAITING_HUMAN_DECISION**

## INTENT

Formalize the shared agent-work protocol and apply it immediately to the current ECO-02 pilot without changing product authority, enabling autonomous execution or reopening already settled semantic decisions.

## BASE

### Arena

- repository: `antoniocorsano-boop/CurManLight_arena`
- base: `main@20728e43f484881773291f182db41dfb684d5aca`
- ECO-02/P1 authorization: PR #314
- P1 exact head: `fcb1e1f88f508a83f7cdc33ed574dfe69b5714a5`
- P1 merged commit: `190b8f6b37683eafbbb1d7c1dc8e9b0d2ddd0a8f`
- ECO-02/P2 provisional handoff: PR #315
- P2 exact head: `b88c5ad8c794fab7e35223e6afa74102769b79fc`
- P2 merged commit/current base: `20728e43f484881773291f182db41dfb684d5aca`

### Docente OS

- repository: `antoniocorsano-boop/docente-os-2026-27`
- base: `develop@d5002280907399bc979df763a2ab96300f3e5b49`
- ECO-02/P1 preparation: PR #554
- P1 exact head: `7fc36f740db956f6f45d0753bed3c2563422bb3a`
- P1 merged commit: `34f5dbe915d432614ab0058c7a9b2eb6a4be243d`
- P2 teacher approval gate: PR #557 -> merged `1f2a7779943f0c10e8780c0d0f05ffb2ac70ccc8`
- P3 provisional-curriculum lesson approval: PR #558 -> merged `8cf95b50e5811c219486cec15033481c57ffb946`
- P4 Arena curriculum intake: PR #559
- P4 exact head: `1427138680a1811529e4324b94376d34bd8c6bce`
- P4 merged commit/current base: `d5002280907399bc979df763a2ab96300f3e5b49`

Open draft evidence/demo PRs #555 and #556 are not promoted or implicitly accepted by this run.

## PLAN

1. Add the same `ECO_AGENTIC_OFFICINA_V1.md` contract to both repositories.
2. Add this same Run 001 record to both repositories.
3. Register the contract in both `AGENTS.md` files as a mandatory read for significant governed work.
4. Make no runtime, route, API, persistence, curriculum-state or deployment change.
5. Stop at paired draft PRs for exact-head review.

## TEST CONTRACT

This run passes only if all of the following are true:

- the shared contract text is identical in both repositories;
- the Run 001 record is identical in both repositories;
- both branches originate from the recorded current governed bases;
- `AGENTS.md` points to the shared contract;
- no runtime/product file is changed;
- no integrated governed-memory amendment is made in this run;
- `DOS-A1` remains `RUNTIME_DEFERRED`;
- review and human approval are requested on the final exact heads.

## EXECUTION

Execution is intentionally documentation/governance-only.

Changed paths are limited to:

- `docs/architecture/ECO_AGENTIC_OFFICINA_V1.md`
- `docs/architecture/ECO_AGENTIC_OFFICINA_RUN_001.md`
- `AGENTS.md`

No prior ECO-02 merge is rewritten.

## INDEPENDENT REVIEW

State: **PENDING ON FINAL EXACT HEADS**

Required review focus:

- contract precedence is correct;
- no new authority is created;
- reviewer/verifier roles cannot self-promote;
- exact-head rebinding is explicit;
- ECO-02 boundaries remain teacher-first;
- the contract does not silently install or depend on an external agent framework;
- Run 001 accurately describes current merged state.

## VERIFICATION

State: **PENDING ON FINAL EXACT HEADS**

Required objective verification:

- file parity across repositories;
- changed-file scope check;
- branch/base identity;
- repository checks triggered by the PRs;
- zero unintended runtime changes.

## HUMAN DECISION

State: **AWAITING_HUMAN_DECISION**

The paired PRs must not be merged solely because automated checks pass.

A human decision should bind to both final exact heads.

## MEMORY UPDATE

State: **NOT YET AUTHORIZED**

The canonical integrated governed memory is not changed by this run.

If the contract is accepted and merged, a later explicit governance step may decide whether the shared memory needs a durable reference to it.

## NEXT AUTHORIZED ACTION

Produce paired draft PRs and present the final exact heads for review.
