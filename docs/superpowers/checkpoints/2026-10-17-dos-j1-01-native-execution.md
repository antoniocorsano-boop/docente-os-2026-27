# DOS-J1-01 — Native execution checkpoint

Date: 2026-10-18  
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
- Task 3 qualified implementation: `f005b55914e3b49381ae00a1ca5b24366d1485da` — Product CI and ordinary governance gates PASS; first CV2 exposed the future-lesson gap below.
- Task 4A RED: `5796086b83e08ec37683c010a310a719c8fcd7ef` — expected `localDate` / future-day presentation contract failures.
- Task 4A GREEN: `8838c5d8b042d5fd234c983095f5b14846c9c804` — Product CI PASS; future-day focus is labelled truthfully and no longer derives state from today's clock alone.
- Task 4B RED: `4258feaa4c27e7d1e82ceaff2e39a88ced16696c` — expected bounded future next-lesson lookup contract failure.
- Task 4B GREEN: `9bc3fb76e227af577b8f03f7ee51c593cd321f1e` — Product CI PASS; Design Policy, TERM-01, Human Interaction Model, Perceptible Write, Certification Impact Classifier and MFA hygiene PASS.

## CV2 finding and correction

The first Candidate Qualification on `f005b55914e3b49381ae00a1ca5b24366d1485da` failed only on the new J1 browser journey in mobile and desktop. The run happened on Sunday 2026-10-18, so the original implementation found no current-day lesson and did not render `.todayTeachingFocus`.

This was treated as a real product-semantics finding, not hidden as a fixture exception. The approved question is “Qual è la prossima lezione?”, therefore a weekend must still resolve the nearest deterministic future lesson when the existing timetable/calendar authority supports it.

The correction deliberately does **not** introduce a synthetic Sunday lesson, test-only clock, new temporal authority or persistence. Instead:

- the presentation model receives the authoritative local date and distinguishes same-day from future-day lessons;
- a future lesson remains `Prossima lezione` independently of today's minute-of-day;
- the card shows `Domani` or an Italian human date rather than a misleading large minute countdown;
- when the current day yields no preparation, the existing Today loader searches at most 7 subsequent days using the timetable/calendar projections already loaded;
- future `AMBIGUOUS` temporal authority fails closed immediately rather than skipping ambiguity to choose a later day;
- the returned `homeDaily` remains the real current-day context; only the optional preparation target may refer to the nearest deterministic future lesson.

## Integrity note

During the Task 3 qualification, transient create/delete commits touched a checkpoint path by mistake. The resulting branch head was compared against `0320adad53c36dbca723b37737bffc89f8aab23d` and GitHub reported `files: []`, confirming no residual repository-content delta from those transient commits.

## Current product boundary

The implementation:

- reuses the existing authoritative Today/next-lesson preparation pipeline;
- adds a pure teacher-first presentation model;
- gives `/planner` a direct, truthful `Prepara lezione` action only when resolvable;
- resolves the nearest deterministic future lesson across a bounded 7-day horizon when today has none;
- presents real Diario continuity as `Riprendi il filo` rather than fabricating a resumable draft;
- keeps planner/timeline capabilities available but visually secondary;
- keeps AppShell and global navigation unchanged;
- introduces no persistence, schema, second materials authority, test-only temporal override or new lesson model.

## Current gate

Engineering implementation is ready for a fresh exact-head Candidate Qualification. The PR remains unmerged and no deploy is authorized.

Automated GREEN can establish engineering readiness only. It cannot turn J1 into PASS. After Candidate Qualification and a separately authorized Beta promotion, J1 must be repeated unaided in a real authenticated teacher session:

`Oggi → prossima lezione → preparazione → materiali`
