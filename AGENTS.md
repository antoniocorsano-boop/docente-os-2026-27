# Docente OS Agent Working Memory

## Mandatory integrated-project memory

Before any work that can affect product ownership, curriculum intake, Arena interoperability, authority, Knowledge Base boundaries, Human Task/HIM, UI semantics, roadmap order, external frameworks or promotion/deploy decisions, read:

`docs/architecture/INTEGRATED_PROJECT_GOVERNED_MEMORY_V1.md`

Memory ID: `CML-DOS-INTEGRATED-GOVERNANCE-V1`.

This is the canonical shared logical memory for CurManLight Arena + Docente OS. It overrides stale conversation summaries, old PR descriptions and local assumptions on cross-system boundaries.


## Mandatory professional guided Arena ↔ Docente OS workflow

Before any work that affects curriculum transport, intake, class baseline persistence, revalidation, Arena → Docente OS routing, lesson consumption of curricular context, or user feedback around cross-system transfer, read:

`docs/architecture/CML_DOS_PROFESSIONAL_GUIDED_WORKFLOW_V1.md`

Contract ID: `CML-DOS-PROFESSIONAL-GUIDED-WORKFLOW-V1`.

The target professional model is **assisted/automatic transport + visible provenance + explicit teacher acceptance + persistent class baseline**. Manual handoff files are a pilot/interoperability fallback, not the target routine workflow. Do not re-import curriculum per lesson, do not silently replace an accepted baseline, and do not confuse automated transport with authority or persistence.

## Mandatory ECO Agentic Officina

Before any significant agent-assisted task involving cross-system behavior, authority/provenance, Human Task/HIM, persistence, security/privacy, external dependencies, release/deploy, governed memory or material product behavior, read:

`docs/architecture/ECO_AGENTIC_OFFICINA_V1.md`

Contract ID: `ECO-AGENTIC-OFFICINA-V1`.

Use the sequence `intent -> plan -> test contract -> execute -> independent review -> verify -> human gate -> remember`. This execution contract is subordinate to the integrated governed memory and repository-specific architecture/governance. It creates no new product or institutional authority and does not authorize autonomous promotion, merge, deploy or canonical memory mutation.

## Mandatory lesson-preparation and material foundation

Before any work that affects Copilot-driven lesson preparation, end-of-day reflection, next-day readiness, lesson materials, LIM/student/teacher outputs, Canva/Drive rendering/export or reuse of teaching content, read:

`docs/architecture/LESSON_PREPARATION_ORCHESTRATION_CANONICAL.md`

This specification is the canonical foundation for **resoconto → prossima lezione → materiali pronti → uso → Diario**.

Future slices must reference it rather than restating the vision. They must reuse `NextLessonPreparation`, `LessonDesignExtension`, CAN-PACK, Knowledge/Material assets and the canonical Copilot frontdoor before proposing any new store, semantic layer, provider-specific path or rendering dependency.

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
11. Do not create a second lesson-material model, Copilot frontdoor or provider-owned source of truth when the canonical lesson-preparation composition can express the requirement.
12. Prefer reuse and an internal provider-independent fallback before adding an external service or open/free dependency.

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