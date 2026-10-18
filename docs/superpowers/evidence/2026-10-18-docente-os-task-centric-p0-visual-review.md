# DOCENTE OS — Task-Centric P0 Visual Review Artifact

**Status:** REALIGNED / HUMAN REVIEW PENDING  
**Date:** 2026-10-18  
**Parent PR:** #719 — DOS-UX-01 — task-centric flow architecture  
**Design contract:** `docs/superpowers/specs/2026-10-18-docente-os-task-centric-p0-mockup-contract.md`

## Visual source of truth

The raster PNG generated during the review remains the **canonical visual baseline** for this gate.

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

## Figma review surfaces

Figma file:

https://www.figma.com/design/hCtCzxTuLs6bNXXExZm7tr

The file now intentionally contains **two** review surfaces only.

### 1. Mobile Human Review — default first page

Page:

`8:2` — `01 MOBILE REVIEW — Canonical flow`

Board:

`10:2` — `Mobile Review — canonical vertical board`

Purpose:

- mobile-first review without horizontal panning;
- one state per vertical section;
- same canonical sequence and scenario as the overview;
- no global title overlap;
- clear separation of each teacher task state;
- first page in the file so mobile Figma does not reopen an obsolete reconstruction.

The Mobile Review is an **editable support surface**, not a new visual authority.

### 2. Canonical editable overview

Page:

`4:2` — `00 CANONICAL — PNG-Matched Editable`

Board:

`4:3` — `Canonical PNG-matched board`

Purpose:

- whole-flow architecture at a glance;
- nine numbered views plus `ESPLORA` outside the primary flow;
- 1536 × 1024 canonical canvas;
- comparison against the raster source of truth.

The earlier five-screen reconstruction has been removed from the file rather than retained as another review surface, because it used a different scenario and omitted downstream states.

## Realignment corrections applied

The editable source and regenerated mobile review were corrected without changing the approved flow:

- `PREPARA`: phase underline moved below the phase rail; lesson title no longer collides with the rail;
- `MATERIALI`: `Anteprima` remains on one line;
- `REGISTRA`: next-activity field and primary CTA no longer overlap;
- `ESPLORA`: `Studio Atlas` is fully contained;
- `CLASSE`: wording corrected to `accesso volontario`;
- Mobile Review: no global header competing with the first state; sections begin directly with the numbered task view.

## Mobile raster derivative

For device review outside the Figma chrome, a vertical raster derivative was generated from the canonical board without introducing new design decisions:

`docente-os-mobile-review-pixel-reference.png`

SHA-256:

`66ace6832b35fd74a8a429e1e2212977078ff3a5bffcdf5a451752d51ea62705`

This derivative is a review convenience only. The canonical raster baseline above remains the pixel-level authority.

## Review rule

Human Review must judge the product model, hierarchy and continuity against the canonical raster. Figma is used to inspect and revise the design but must not silently introduce independent design decisions.

## Scope guard

This artifact does not authorize product implementation, merge, deploy, schema change, navigation change, Atlas runtime activation or Studio Atlas handoff.

Allowed gate outcomes remain:

- `PASS` — proceed to implementation planning only after the complete visual flow is approved;
- `REWORK` — revise the visual board only;
- `REJECT` — reopen the underlying task-centric architecture.
