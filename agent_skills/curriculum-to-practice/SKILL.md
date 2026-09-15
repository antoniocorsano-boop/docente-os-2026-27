# Curriculum-to-Practice Skill

Skill ID: `CML-DOS-C2P-CODEX-SKILL-V1`
Scope: CurManLight Arena + Docente OS

## Mission

Execute the integrated Curriculum-to-Practice programme without duplicating authority, rewriting existing capabilities or skipping governed gates.

## Mandatory startup

Before any C2P task:

1. Read repository `AGENTS.md`.
2. Read `docs/architecture/INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md`.
3. Read:
   - `docs/architecture/CURRICULUM_TO_PRACTICE_OPERATING_MODEL_V1.md`
   - `docs/architecture/CURRICULUM_TO_PRACTICE_CONTRACTS_V1.md`
   - `docs/architecture/CURRICULUM_TO_PRACTICE_EXECUTION_PLAN_V1.md`
   - `docs/architecture/CURRICULUM_TO_PRACTICE_ACCEPTANCE_V1.md`
4. Re-check live branches, open PRs, exact heads and applicable gates.
5. Identify the single authorized C2P tranche.

Do not rely on conversation history as authority.

## Classification before editing

Answer internally:

- Which product owns this capability/data?
- Which C1–C6 contract is involved?
- Is this domain, interoperability, UI, evidence, authority or teacher operational work?
- Does a higher-order gate block runtime implementation?
- Does an existing capability already solve all or part of the problem?
- What is the minimum coherent delta?

If ownership/authority is ambiguous, stop before runtime edits.

## Reuse-first rule

Search the repository before creating new types, stores, routes, tables, services or screens.

Classify each needed capability as:

- `EXISTS_REUSE`
- `EXISTS_EXTEND`
- `MISSING_REQUIRED`
- `DUPLICATE_REMOVE_OR_AVOID`
- `FORBIDDEN_BY_GOVERNANCE`

`CREATE_NEW` is allowed only after `MISSING_REQUIRED` is evidenced and product ownership is clear.

## Non-negotiable invariants

- Arena owns institutional curriculum meaning/authority.
- Docente OS owns teacher professional execution.
- No shared canonical database.
- No second curriculum source of truth in Docente OS.
- No automatic common-UDA copies per section.
- No silent rewrite of teacher-authored reviewed work.
- No silent rewrite of completed historical execution.
- No pupil-level data into Arena curricular review.
- `Observation != TeamOutcome != VerticalReview != InstitutionalDecision`.
- Documents are projections/receipts, not the integration database.
- Same-version authority/structural changes must be detectable through footprint.

## Tranche execution loop

For one authorized tranche only:

1. Record base SHA and intended head branch.
2. State contract input/output and invariants.
3. Search for reusable implementation.
4. Implement the minimum delta.
5. Add positive contract tests.
6. Add negative/invariant tests.
7. Run applicable TypeScript/lint/tests/build/browser checks.
8. Re-check exact head.
9. Record what changed and explicitly what did not change.
10. State gate result.
11. Stop. Do not automatically begin the next tranche.

## Human boundary rule

Automation may prepare evidence. It must not manufacture human validation, team consensus, vertical review or institutional decisions.

## Working prompt for Codex/Astra

Use this orientation when starting a C2P task:

> Work on the integrated CurManLight Arena + Docente OS Curriculum-to-Practice programme. Read AGENTS, integrated governed memory and all four C2P specification documents first. Re-check live repository/gate state. Execute only the explicitly authorized tranche. Preserve product ownership and authority boundaries. Reuse or extend existing capabilities before creating anything. Keep curriculum references as bindings rather than semantic copies. Preserve historical execution. Do not export pupil-level data to Arena. Add contract and negative tests, validate the exact head, record a receipt and stop at the tranche gate.

## C2P-00 special rule

During `C2P-00`, documentation and agent guidance only. No runtime, schema, API, deployment or authority state change is permitted.
