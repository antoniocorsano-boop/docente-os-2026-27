# DOCENTE OS — Task-Centric P0 Visual Review Artifact

**Status:** REALIGNED / HUMAN REVIEW PENDING  
**Date:** 2026-10-18  
**Parent PR:** #719 — DOS-UX-01 — task-centric flow architecture  
**Design contract:** `docs/superpowers/specs/2026-10-18-docente-os-task-centric-p0-mockup-contract.md`

## Visual source of truth

The raster PNG generated during the review is the **canonical visual baseline** for this gate.

SHA-256:

`8de8bfc1e0e95438415e55914ec9d074aed1798532e18e191bb6c0cb65847b1f`

Its canonical flow is:

`OGGI → PREPARA → MATERIALI → VISUALIZZA MATERIALE → CONDUCI → OSSERVA → REGISTRA → CONTINUA`

with `CLASSE` as voluntary access and `ESPLORA` outside the primary flow.

Canonical scenario shown by the raster:

- class: `3ª E`;
- discipline: `Tecnologia`;
- lesson: `Energia: forme, trasformazioni e fabbisogni`;
- lesson context: `11:00–12:00` / next lesson as represented in the raster.

## Canonical editable Figma board

Figma file:

https://www.figma.com/design/hCtCzxTuLs6bNXXExZm7tr

Canonical page:

`4:2` — `00 CANONICAL — PNG-Matched Editable`

Canonical board node:

`4:3` — `Canonical PNG-matched board`

The previous five-screen reconstruction has been explicitly renamed:

`ZZ DEPRECATED — prior reconstruction`

because it did not match the raster source of truth: it used a different scenario and omitted `OSSERVA`, `REGISTRA`, `CONTINUA`, `CLASSE` and the `ESPLORA` panel.

The replacement editable board now mirrors the raster in:

- nine numbered views;
- their order and primary/secondary-flow relationship;
- the `3ª E · Energia` scenario;
- the same teacher-facing questions above each view;
- the same principal actions and information hierarchy;
- the explicit `ESPLORA` panel outside the primary journey;
- a 1536 × 1024 canonical canvas.

The PNG remains the pixel-level visual authority for Human Review. The editable Figma board must be judged against it and must not introduce independent design decisions.

## Scope guard

This artifact does not authorize product implementation, merge, deploy, schema change, navigation change, Atlas runtime activation or Studio Atlas handoff.

Allowed gate outcomes remain:

- `PASS` — proceed to implementation planning only after the complete visual flow is approved;
- `REWORK` — revise the visual board only;
- `REJECT` — reopen the underlying task-centric architecture.
