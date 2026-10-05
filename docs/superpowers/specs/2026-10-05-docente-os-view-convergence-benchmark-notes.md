# DOS-VIEW-CONV-01 — Benchmark note

Date: 2026-10-05
Purpose: record the mature-product benchmark refinements applied to the approved Docente OS view-convergence specification.

## Refined decisions

The benchmark did not change the tranche scope. It refined three interaction decisions before implementation planning:

1. Mobile bottom navigation uses five intentional destinations: `Home`, `Oggi`, `Classi`, `Orario`, `Naviga`.
2. `Naviga` replaces `Altro` to express a structured secondary-navigation hub rather than a residual overflow bucket.
3. `App e dispositivo` replaces `Installazione` as the Settings concept; install/device state remains optional and outside essential readiness.

## Rationale

These refinements preserve the teacher-first model while improving discoverability, semantic clarity, and consistency with mature mobile productivity patterns. They do not modify domain logic, authority boundaries, PWA install mechanics, timetable behavior, or release governance.

## Planning implication

The implementation plan must treat these decisions as fixed inputs and must not reopen navigation taxonomy or essential/optional Settings semantics unless implementation uncovers a stop condition defined by DOS-VIEW-CONV-01.
