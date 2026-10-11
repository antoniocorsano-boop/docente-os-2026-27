# TRAMA-TERM-01 — Docente OS execution receipt

State: IMPLEMENTATION_COMPLETE / HUMAN_REVIEW_REQUIRED / NO_MERGE

Baseline: `develop@a9006cb632fc5c3c9b1b0e4a9f2587c55c9c5ba2`
Qualified implementation head before this receipt: `2a714c4be005ec127e3101df9d512ce25a328d58`

## Canonical vocabulary

- canonical institutional term: **curricolo di istituto**
- canonical short form: **curricolo**
- new occurrences of the governed legacy English vocabulary are rejected unless an exact path, fragment and reason are explicitly governed

## Frozen legacy baseline

The pre-existing repository debt is measured rather than destructively renamed:

- total occurrences: **1494**
- product runtime: **977**
- persistence: **258**
- docs / governance / history: **231**
- other: **28**
- removed by this tranche: **0**

This tranche intentionally does not globally rewrite published v1 identifiers, persisted fields, RPC/schema names, historical evidence or other compatibility surfaces. Future targeted changes may only reduce this baseline; the diff-aware guard prevents new debt from being introduced.

## Permanent guard

- runs on pull requests
- runs on pushes to `develop` and `main`
- uses complete Git history
- validates only added lines for anti-regression, so removals are always allowed
- blocks both governed legacy English forms, case-insensitively
- supports only exact path + exact fragment + non-empty reason exceptions
- current exception set: **0**

## Authority and compatibility

- Arena remains the sole institutional authority sul curricolo
- Docente OS remains the teacher operational workspace
- no authority promotion was introduced
- no transport, handoff or persistence semantics were changed
- no v1 contract or wire field was renamed in place

Integration remains subject to exact-head CI and Human Review. No automatic merge is authorized.
