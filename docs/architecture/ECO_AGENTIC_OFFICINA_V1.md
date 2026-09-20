# ECO Agentic Officina v1

Status: **PROPOSED_SHARED_EXECUTION_CONTRACT / HUMAN REVIEW REQUIRED**  
Contract ID: `ECO-AGENTIC-OFFICINA-V1`  
Scope: **CurManLight Arena + Docente OS**  
Date: 2026-09-20

## 1. Purpose

Define one small, repeatable execution protocol for significant agent-assisted work across Arena and Docente OS.

The protocol adopts the useful operating pattern:

`intent -> plan -> test contract -> execute -> independent review -> verify -> human gate -> remember`

It does **not** import a third-party agent framework, does not add runtime dependencies and does not create a new authority layer.

## 2. Precedence

This contract is subordinate to, and must never override:

1. `docs/architecture/INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md`;
2. repository-specific architecture, Human Task/HIM, security, release and curriculum contracts;
3. exact-head review and deployment gates already required by each repository.

If any step conflicts with a higher-precedence contract, execution stops and the conflict is classified before further mutation.

## 3. Human authority

The human remains outside and above the agent chain.

Only the human may authorize, where required by the governing contracts:

- semantic or pedagogical acceptance;
- institutional or curricular decisions;
- consequential teacher-facing behavior;
- merge/promotion when exact-head human approval is required;
- deployment or activation where a human gate is prescribed.

An automated `PASS` is evidence only. It is never a substitute for a required human verdict.

## 4. Roles

### 4.1 Planner

Purpose: convert the human intent into a bounded, testable plan.

Must:

- read current governed memory and relevant contracts first;
- verify repository, base branch and exact base SHA;
- state scope, non-goals, affected boundaries, risks and stop condition;
- define acceptance criteria before mutation;
- identify decisions that still require a human.

Must not mutate product or governance files while acting as Planner.

### 4.2 Executor

Purpose: perform only the authorized plan.

Must:

- work from the verified base;
- remain inside the declared scope;
- preserve authority, provenance and product boundaries;
- stop on ambiguity that would change semantics;
- bind all resulting evidence to the exact resulting head.

Must not expand scope, merge, promote or reinterpret a human decision.

### 4.3 Independent Reviewer

Purpose: challenge the result from a clean evaluation context.

The reviewer should receive, at minimum:

- human intent;
- governing contracts;
- approved plan and acceptance criteria;
- changed files/diff;
- exact head SHA;
- relevant evidence.

The initial review should not depend on the Executor's narrative justification.

The reviewer checks for:

- scope drift;
- broken authority or provenance boundaries;
- contradictions with current contracts;
- missing failure/recovery paths;
- unsafe assumptions;
- insufficient tests/evidence;
- technical leakage into primary human interaction;
- claims of completion not supported by evidence.

Reviewer output is evidence, not promotion authority.

### 4.4 Verifier

Purpose: run the smallest complete set of objective checks required for the change.

Typical checks include:

- focused tests;
- type checking/lint/build where applicable;
- contract/schema validation;
- browser/HIM/HVA evidence where applicable;
- security/data-integrity gates;
- deploy identity and smoke checks where runtime changed;
- exact-head parity across all evidence.

The Verifier must distinguish `NOT_APPLICABLE` from `PASS`.

### 4.5 Memory Custodian

Purpose: record only durable facts after the relevant decision exists.

May record:

- exact heads;
- merged commits;
- verified gate results;
- explicit human decisions;
- unresolved blockers;
- next authorized action.

Must not turn proposals, agent opinions, draft PR text or unverified claims into canonical memory.

## 5. Canonical state machine

Use these states for significant work:

1. `INTENT_CAPTURED`
2. `PLAN_READY`
3. `TEST_CONTRACT_READY`
4. `EXECUTED`
5. `INDEPENDENT_REVIEWED`
6. `VERIFIED`
7. `HUMAN_DECIDED`
8. `MEMORY_UPDATED`

Failure/hold states:

- `BLOCKED_CONTRACT_CONFLICT`
- `BLOCKED_SCOPE_AMBIGUITY`
- `BLOCKED_TEST_FAILURE`
- `BLOCKED_REVIEW_FINDING`
- `AWAITING_HUMAN_DECISION`

No later state may be inferred from an earlier one.

## 6. Exact-head rule

For work subject to exact-head governance:

- the plan identifies the base SHA;
- execution produces a new exact head;
- review is bound to that exact head;
- verification is bound to that exact head;
- human approval names that exact head;
- any subsequent commit invalidates the earlier review/approval for promotion purposes unless the governing contract explicitly permits a narrower rebinding.

## 7. When the full protocol is required

Use the full protocol for changes involving one or more of:

- Arena <-> Docente OS interoperability;
- curriculum authority, provenance or revalidation;
- Human Task/HIM or consequential interaction;
- persistence, migrations or data integrity;
- security/privacy boundaries;
- external services or new dependencies;
- release/deploy/promotion;
- material product behavior;
- governed memory or cross-system execution order.

A small typo or non-semantic documentation correction may use a shortened path, but must still respect repository branch and review rules.

## 8. Teacher-first invariant

For ECO work, the execution protocol must preserve:

- Arena as curriculum authority;
- Atlas as subordinate publication/navigation/resource layer;
- Docente OS as teacher operational workspace;
- teacher control over adaptation, acceptance and use;
- no silent curriculum promotion;
- no pupil personal data unless separately authorized and protected;
- no autonomous publication or consequential action beyond the current governed capability;
- `DOS-A1` remains `RUNTIME_DEFERRED` unless a separate governance decision changes it.

## 9. Third-party framework boundary

This contract may be informed by external agent-engineering practices, but it does not authorize installation of a full external agent pack or plugin.

External agent frameworks remain:

`REFERENCE / OPTIONAL EXECUTION AID / NO AUTHORITY`

Any future installation requires its own compatibility, security and duplication assessment.

## 10. Completion record

A substantial task should close with a compact record containing:

- **INTENT**
- **BASE**
- **PLAN**
- **TEST CONTRACT**
- **EXECUTION HEAD**
- **INDEPENDENT REVIEW**
- **VERIFICATION**
- **HUMAN DECISION**
- **MEMORY UPDATE**
- **NEXT AUTHORIZED ACTION**

This format is intended to reduce repeated narrative and make the state resumable by another agent without relying on conversation history.
