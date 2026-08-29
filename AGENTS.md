# Docente OS Agent Working Memory

## Mandatory integrated-project memory

Before any work that can affect product ownership, curriculum intake, Arena interoperability, authority, Knowledge Base boundaries, Human Task/HIM, UI semantics, roadmap order, external frameworks or promotion/deploy decisions, read:

`docs/architecture/INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md`

Memory ID: `CML-DOS-INTEGRATED-GOVERNANCE-V1`.

This is the canonical shared logical memory for CurManLight Arena + Docente OS. It overrides stale conversation summaries, old PR descriptions and local assumptions on cross-system boundaries.

## Mandatory rules

1. Docente OS owns teacher operational work; it does not own institutional curriculum authority.
2. Never reinterpret an Arena proposal as an institutional decision.
3. Never promote provisional curriculum to approved authority inside Docente OS without a governed Arena authority signal.
4. Incoming curriculum changes must be evaluated by structural/authority footprint, not only by `curriculumVersionRef`.
5. Preserve teacher-authored reviewed work unless the teacher explicitly changes it.
6. Do not create a second professional source archive outside the canonical Knowledge Base pipeline.
7. Do not introduce shared databases or automatic canonical writes across Arena and Docente OS.
8. AILit remains architecture-only until the integrated governed memory explicitly authorizes implementation.
9. Before merge/promotion/deploy, re-check exact head SHA, mergeability and all required gates on that same SHA.
10. If a task conflicts with the integrated execution order, stop promotion and classify the conflict instead of improvising a new architecture.

## Canonical development branch

The active Docente OS product line is `develop` unless a newer explicit governance decision supersedes it.

Use dedicated branches for implementation and governance changes. Do not treat stale `main` state as the active product baseline when `develop` is the governed source line.

## Cross-system change rule

Any semantic change to:

- Arena/Docente OS ownership;
- authority model;
- handoff contract;
- same-version revalidation;
- Knowledge boundary;
- integrated roadmap order;
- AILit authorization;

must update `INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md` consistently in both repositories under the same Memory ID/version.

## Session/checkpoint rule

Keep temporary findings, test runs and implementation checkpoints outside the canonical shared memory. The integrated memory contains durable governance only.
