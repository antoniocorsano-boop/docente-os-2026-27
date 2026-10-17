# MATERIAL-CORE-01 — Task 1 legacy material inventory checkpoint

Date: 2026-10-16

Status: `TASK_1_COMPLETE / READ_ONLY / NO_MUTATION / HOLD_BEFORE_TASK_2`

## Scope

This checkpoint closes only Task 1 of `MATERIAL-CORE-01`: classify legacy prepared-material evidence and inventory every direct runtime consumer of legacy material approval semantics before any reconciliation or product mutation.

Execution baseline:

- `develop@4e04e5eb0712089ccb13f5f72eef43c44679ac77`
- PR `#712`
- branch `feat/material-core-01-canonical-acceptance`

No database row, schema, runtime product flow, deploy target, provider integration, or canonical material binding was mutated.

## TDD evidence

The test harness itself was first made observable because Node 22 suppresses recursive `node:test` execution when `node --test` is started from a running test process. The wrapper now executes the focused fixture file directly.

Evidence sequence:

1. wrapper execution sentinel RED: `d28b29b546da8d892193a0934d1e5a9820cc3a53`, Product CI `38891964859` — expected failure in product tests;
2. real classifier RED after fixing the nested-test suppression: `837668094ab860d48d3dea243e877bbdab57b506`, Product CI `38892377765` — expected failure with the classifier absent;
3. classifier GREEN: `c77fb2708b08503974195c777ba144aca7ccc2cd`, Product CI `38892650101` — PASS;
4. repository-wide consumer scan RED: `65a03513a48e64206a74cd93d815af42adb5cd00`, Product CI `38893425075` — expected failure in product tests with the scanner absent;
5. repository-wide consumer scan GREEN: `f47a07bf75378c79b5f1284c8a327387ad36613d`, Product CI `38893714609` — PASS, including typecheck, product tests, lint and build.

## Classification contract

The pure read-only classifier distinguishes:

- `PREPARED_ONLY`: prepared support without canonical accepted binding;
- `RECONCILABLE`: legacy approved evidence only when exact material identity, exact SHA-256 digest using `docente-os.material-content.v1`, exact lesson context, explicit teacher acceptance and aligned canonical binding are all present;
- `REVALIDATION_REQUIRED`: historical approved metadata without sufficient exact digest/context evidence;
- `BLOCKED_FOR_AUTOMATIC_RECONCILIATION`: invalid or unknown legacy metadata.

Historical `approvalState=APPROVED` is not treated as current canonical authority.

## Repository-wide direct consumer inventory

The scanner recursively evaluates all runtime source files under `product/src`, excludes tests/specs, and reports a direct consumer only when legacy material identity and approval/display semantics are both present. It does not rely on a hand-curated file list.

Direct authority consumers found and independently inspected:

| Consumer | Legacy behavior | Disposition |
| --- | --- | --- |
| `product/src/app/classi/class-workspace-model.ts` | `approvalState=APPROVED` is translated directly to the UI label `Confermato`; other matching rows become `Predisposto` | must migrate away from metadata-only authority in later MATERIAL-CORE tasks |
| `product/src/app/classi/[sectionId]/in-classe/[assetId]/classroom-session-model.ts` | `approvalState=APPROVED` is translated directly to `Confermato`; `source_locator` is propagated as the classroom source URL | must migrate to digest-bound canonical material authority in later MATERIAL-CORE tasks |

Propagation surfaces, not independent authority consumers:

- `product/src/app/classi/[sectionId]/page.tsx` renders the prepared-material label returned by `selectPreparedClassMaterials()` and links into the classroom cockpit;
- `product/src/app/classi/[sectionId]/in-classe/[assetId]/page.tsx` materializes the classroom session view;
- the classroom client can open the propagated external HTTPS source URL.

The code therefore still contains a real legacy authority debt even though current Beta data contains no approved legacy row.

## Beta read-only inventory

Read-only inspection of canonical Beta `knowledge_assets` for `docenteOsResource=CLASS_LESSON_MATERIAL` returned:

- total legacy rows: `29`;
- `PENDING_HUMAN`: `29`;
- `APPROVED`: `0`;
- canonical binding `ALIGNED`: `1`;
- canonical binding `PRE_CANONICAL_DIAGNOSTIC`: `28`;
- rows with `current_generation_id`: `0`;
- rows with asset SHA-256: `0`;
- rows with metadata content digest: `0`;
- rows with HTTPS source locator: `29`.

Task 1 classification of the live rows:

- `PREPARED_ONLY`: `29`;
- `RECONCILABLE`: `0`;
- no live row has enough evidence for automatic canonical acceptance or reconciliation.

The one `ALIGNED` row remains `PENDING_HUMAN` and has no digest/generation evidence, therefore it is also `PREPARED_ONLY`.

## Canonical extension cross-check

Read-only inspection of `lesson_design_extensions` returned:

- extensions: `19`;
- accepted extensions: `11`;
- direct `source_ref` matches to the 29 legacy material assets: `0`;
- payloads containing an asset identifier: `5`;
- payload asset identifiers matching the 29 legacy material assets: `0`;
- payloads containing a generation identifier: `0`;
- payloads containing a material content digest: `0`.

Therefore none of the 29 legacy prepared-material rows is already represented by an accepted canonical material extension, directly or through an asset-id payload match.

## Decision

Task 1 is complete as a read-only inventory and classification step.

Canonical disposition at this boundary:

- preserve all 29 current Beta rows as prepared/supporting evidence;
- do not promote or rewrite any row;
- do not infer acceptance from `approvalState`, provider identifiers, or mutable URLs;
- do not create a second material store or provider-specific authority;
- later MATERIAL-CORE tasks must replace the two direct metadata-only approval consumers with exact digest-bound canonical material bindings before the legacy authority can be retired.

No Task 2 implementation starts from this checkpoint without a new explicit execution step. PR #712 remains open and unmerged.
