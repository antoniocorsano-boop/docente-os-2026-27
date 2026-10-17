# DOS-J1-01 — Native execution checkpoint

Date: 2026-10-17  
PR: #718  
Design classification: `COMPATIBLE`  
Human verdict: `J1 = BLOCKER` until a later unaided authenticated Human Review

## Execution mode

Native execution under TDD. The local runner available to this session could not resolve GitHub, so the dedicated PR branch remains the isolation boundary and GitHub Actions is used as the exact-SHA test runner. No merge or deploy is authorized.

## Verified TDD sequence

- Task 1 RED: `bd1855ca093d6bd82770a2fa94f3705f75da51cd` — expected operational-loader contract failure.
- Task 1 GREEN: `d438d45cc37ea20d70216b0e3911fe6f3ae74d3b` — Product CI PASS.
- Task 2 RED: `49241e560bde0af904cb8949d87dab5b23021428` — expected missing `today-teaching-focus` module failure.
- Task 2 GREEN: `0b416579a10dc87d3f9550fb575c39b0707f4f13` — Product CI PASS.
- Task 3 RED: `fb13f6af3739965edf9a5ba3702e9e1b12aa0067` — expected `/planner` binding/hierarchy failures.
- Task 3 implementation tree: `0320adad53c36dbca723b37737bffc89f8aab23d` — under exact-head qualification.

## Integrity note

During the Task 3 qualification, transient create/delete commits touched a checkpoint path by mistake. The resulting branch head was compared against `0320adad53c36dbca723b37737bffc89f8aab23d` and GitHub reported `files: []`, confirming no residual repository-content delta from those transient commits.

## Current product boundary

The implementation:

- reuses the existing authoritative Today/next-lesson preparation pipeline;
- adds a pure teacher-first presentation model;
- gives `/planner` a direct, truthful `Prepara lezione` action only when resolvable;
- presents real Diario continuity as `Riprendi il filo` rather than fabricating a resumable draft;
- keeps planner/timeline capabilities available but visually secondary;
- keeps AppShell and global navigation unchanged;
- introduces no persistence, schema, second materials authority or new lesson model.

## Stop rule

Automated GREEN can establish engineering readiness only. It cannot turn J1 into PASS. After exact-head qualification and a separately authorized Beta promotion, J1 must be repeated unaided in a real authenticated teacher session:

`Oggi → prossima lezione → preparazione → materiali`
