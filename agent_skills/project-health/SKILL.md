---
name: project-health
description: >-
  Operational project-health gate for DOCENTE OS. Prevents feature creep and
  unfinished releases by classifying the current project state, identifying the
  single blocking gate, and requiring SHIPPED before non-essential expansion.
license: Apache-2.0
metadata:
  version: "1.0.0"
  adapted_from: "project-graveyard concepts by Shubham Saboo"
---

# Project Health — DOCENTE OS

## Purpose

Keep DOCENTE OS moving toward a usable, deployed product instead of accumulating unfinished features.

## Core rule

**Close the current shipping gate before starting non-essential new features.**

A version is not considered complete because the code exists. It is complete only when the release reaches a user-visible, verified outcome.

## Canonical states

- `IDEA` — concept only.
- `BUILDING` — implementation in progress.
- `RUNS_LOCAL` — works locally but has no verified remote release.
- `REMOTE_CANONICAL` — source is safely versioned in the canonical remote repository.
- `DEPLOY_BLOCKED` — application is otherwise ready but public deployment is blocked.
- `SHIPPED` — a stable URL or release exists and has been verified.
- `OPERATING` — shipped and used in the real DOCENTE OS workflow.
- `PAUSED` — intentionally suspended with reason recorded.
- `ARCHIVED` — deliberately closed; no hidden expectation of continuation.

## Health check

Before any significant development step:

1. Determine the current canonical state from evidence, not assumption.
2. Identify the **single main blocker** between current state and `SHIPPED`.
3. Check whether the proposed work removes that blocker.
4. If not, defer it unless it is required for safety, data integrity, or the blocker itself.
5. Keep unresolved dependencies explicit.

## Evidence hierarchy

Use, in order:

1. verified live deployment;
2. remote repository state and commit history;
3. build/deploy logs;
4. local runtime verification;
5. planning notes.

Never promote a project to `SHIPPED` from planning notes or local files alone.

## Shipping gate

`SHIPPED` requires all of the following:

- canonical source exists in remote version control;
- current release source is identifiable by commit;
- deployment succeeds;
- public or intended-access URL resolves;
- primary app shell loads;
- core navigation works;
- no known data-loss regression is introduced;
- release status is recorded.

## Scope discipline

While status is `DEPLOY_BLOCKED`, permitted work is limited to:

- deployment configuration;
- repository/CI fixes;
- build/runtime fixes required for deploy;
- security or data-integrity corrections;
- verification tooling.

Do **not** add unrelated features while the release gate is open.

## One-blocker policy

Maintain exactly one primary blocker at a time. Secondary issues may be recorded but must not dilute the next action.

Format:

```
STATE: DEPLOY_BLOCKED
PRIMARY_BLOCKER: <one concrete blocker>
EVIDENCE: <commit/log/tool result>
NEXT_ACTION: <one concrete action>
DONE_WHEN: <verifiable condition>
```

## Release plan

When recovering a stalled version, use at most 7 steps:

0. Confirm the current version still runs.
1. Perform one action that creates visible progress immediately.
2-5. Remove only the blockers necessary to ship.
6. Verify the live release and record the state as `SHIPPED`.

The last step must be a verified URL/release, not “continue development.”

## DOCENTE OS current application

For DOCENTE OS v2.1, the canonical interpretation at the time this skill was introduced is:

- source repository exists remotely;
- PWA source is committed on `main`;
- Netlify project exists;
- Netlify configuration exists in the repo;
- public production deploy has not yet been verified.

Therefore the project must remain `DEPLOY_BLOCKED` until a live deployment is verified.

## After shipping

Once `SHIPPED` is verified, the next feature may begin. Prefer the highest-value operational workflow, not the most visually attractive addition.

For DOCENTE OS the intended post-v2.1 sequence is:

1. real Gmail circular intake;
2. circular → action → Calendar/Drive closure;
3. bidirectional planner/day view;
4. section-specific teaching implementation tracking.

Re-evaluate this order if school operations create a more urgent requirement.

## Relapse check

If a shipped version goes more than one development cycle with major local changes but no new verified release, flag `RELEASE_DRIFT` and force a shipping checkpoint before further expansion.
