# DOCENTE OS — Task-Centric P0 Visual Review Artifact

**Status:** PASS / VISUAL FLOW CONTRACT FROZEN  
**Date:** 2026-10-18  
**Parent PR:** #719 — DOS-UX-01 — task-centric flow architecture  
**Design contract:** `docs/superpowers/specs/2026-10-18-docente-os-task-centric-p0-mockup-contract.md`

## Human Review verdict

**Verdict:** `PASS`

The complete task-centric experience traced in the long mobile review was reviewed by the human product owner and judged coherent for the intended teacher journey.

This PASS freezes the **Visual/User Flow Contract** only. It does **not** certify the current Beta/runtime implementation, responsive behavior, accessibility, real-data fallbacks, Atlas availability, or end-to-end execution. Those remain implementation and Beta Human Review gates.

The frozen teacher journey is:

`OGGI → PREPARA → MATERIALI → VISUALIZZA MATERIALE → CONDUCI → OSSERVA → REGISTRA → CONTINUA`

with `CLASSE` as voluntary longitudinal access and `ESPLORA` outside the primary flow.

## Visual source of truth

The raster PNG generated during the review remains the **canonical visual baseline** for this gate.

SHA-256:

`8de8bfc1e0e95438415e55914ec9d074aed1798532e18e191bb6c0cb65847b1f`

Canonical scenario shown by the raster:

- class: `3ª E`;
- discipline: `Tecnologia`;
- lesson: `Energia: forme, trasformazioni e fabbisogni`;
- lesson context: `11:00–12:00` / next lesson as represented in the raster.

## Figma review surfaces

Figma file:

https://www.figma.com/design/hCtCzxTuLs6bNXXExZm7tr

The file intentionally contains two review surfaces only.

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
- first page in the file so mobile Figma opens the review surface directly.

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

The earlier five-screen reconstruction was removed because it used a different scenario and omitted downstream states.

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

## Frozen review rule

Implementation must preserve the approved model, hierarchy and continuity. Figma may be used to inspect implementation fidelity but must not silently introduce independent design decisions.

Any runtime evidence that requires changing the primary graph is a new product decision and must reopen this contract explicitly; ordinary responsive, accessibility and implementation corrections do not reopen it.

## Scope guard

This PASS authorizes **implementation planning only**. It does not authorize product implementation, merge, deploy, schema change, Atlas runtime activation, Studio Atlas handoff, or Beta promotion.

Next gate:

`IMPLEMENTATION PLAN REVIEW`
