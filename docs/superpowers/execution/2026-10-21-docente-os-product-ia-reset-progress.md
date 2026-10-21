# Native execution ledger — plan: docs/superpowers/plans/2026-10-21-docente-os-product-ia-reset.md

Execution method: Native / inline.
Implementation branch: `feat/dos-ia-product-reset`.
Planning baseline: `develop@1c50c1bc620cdd0b7bafcff0dc5c613367df3298` plus approved spec/plan documentation commits.

Ruling: the runtime container has no checked-out repository and cannot resolve github.com, so a local git worktree and local test runner cannot be created. Use this isolated GitHub branch as the execution workspace and GitHub Actions on a Draft PR as the observable RED/GREEN test runner. No work occurs on `develop`; no merge or deploy is authorized. Cost if wrong: CI feedback is slower and file-level edits require more care than a local worktree.

Pre-flight shared interfaces:
- Task 1 canonical lesson href/state -> Tasks 3/4/6 routing and lesson UI: state names and query semantics must remain exactly those declared in the plan.
- Task 2 shell/Attività -> Task 3 Oggi and Task 7 materials: primary IA is fixed at Oggi · Orario · Classi · Altro; child tools remain direct routes.
- Task 3 Oggi -> Task 6 Lezione: direct lesson links use the Task 1 phase-free canonical builder.
- Task 4 Orario -> Task 6 Lezione: consultation-only direct entry uses the same canonical builder; edit mode never navigates.
- Task 5 Classe -> Task 6 Lezione: one dominant CTA resolves to canonical lesson intent, with Diario and Altro della classe below it.
- Task 7 materials -> Task 8 compatibility: new UI stops generating legacy material URLs before any redirect/retirement.

No shared-interface conflict found against the approved specification.
