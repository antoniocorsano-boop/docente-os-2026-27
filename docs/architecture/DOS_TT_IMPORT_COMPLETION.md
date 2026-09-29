# DOS-TT-IMPORT-01 — Completion Contract

## Purpose

This branch closes the timetable-import feature end-to-end against issue #601. It replaces further micro-slices and intermediate human approvals.

## DONE

The feature is complete when, from `/orario`, a teacher can:

1. upload a timetable PDF or image;
2. identify/select the relevant teacher context privacy-first;
3. obtain a structured proposal with unresolved cells explicitly marked;
4. review and correct the proposal;
5. confirm it;
6. atomically apply the confirmed result to the canonical DRAFT timetable;
7. receive clear success/error feedback;
8. leave DRAFT activation outside this feature.

## Constraints

- no discipline inference from surname alone;
- no T/D/DIS semantics forced into import;
- no `DRAFT -> ACTIVE`;
- no automatic replan;
- no DOS-A1 activation;
- authoritative workspace/year provenance at apply time;
- exact DRAFT revision recheck inside the same transaction as mutation;
- PostgreSQL bigint revision semantics preserved exactly;
- failure is atomic and fail-closed.

## Process

One completion branch and one final PR.

Intermediate implementation commits may be numerous, but there are no intermediate HUMAN REVIEW gates. CI, tests and independent technical review are treated as one final qualification cycle. A single HUMAN REVIEW is required immediately before merge.

## Holds

Until final qualification:
- HOLD_PRODUCTION_APPLY
- HOLD_REPLAN
- DOS-A1 RUNTIME_DEFERRED
