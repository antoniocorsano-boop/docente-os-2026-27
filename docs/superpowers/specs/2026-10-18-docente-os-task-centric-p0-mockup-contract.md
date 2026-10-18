# DOCENTE OS — P0 Task-Centric Visual Mockup Contract

**Status:** VISUAL DESIGN / HUMAN REVIEW REQUIRED  
**Date:** 2026-10-18  
**Baseline:** `develop@692dcce6b6b2d75c45780d147118f6436a6704d7`  
**Parent design:** `docs/superpowers/specs/2026-10-18-docente-os-task-centric-flow-architecture-design.md`  
**Gap Matrix:** `docs/superpowers/specs/2026-10-18-docente-os-task-centric-gap-matrix.md`  
**Runtime:** NO PRODUCT CHANGE AUTHORIZED

## 1. Purpose

This document freezes the first visual mockup tranche for the P0 journey:

`OGGI → PREPARA → MATERIALI → ANTEPRIMA → PREPARA → CONDUCI`

It is a review artifact, not an implementation specification. The goal is to validate hierarchy, continuity, noise budget and task identity before any code plan is written.

## 2. Visual language

The mockups reuse the existing Docente OS design system rather than introducing a new aesthetic.

Canonical palette:

- navy `#0b2d5b`;
- blue `#245ad4`;
- light blue `#edf3ff`;
- canvas `#f5f8fd`;
- surface `#ffffff`;
- ink `#10233f`;
- secondary ink `#5d6f88`;
- borders `#e4e9f1`;
- success `#0f7f3c`.

Visual character remains **operational calm**: high information quality, restrained color, borders before shadows, progressive disclosure, no decorative dashboard density.

Mobile target: 390 × 844 CSS-like frame.  
Desktop reference: 1440 × 1024 with focused lesson frame.

## 3. Global rules for every P0 screen

1. One dominant professional object.
2. One primary CTA.
3. Maximum two secondary actions at the same visual level.
4. No technical codes (`B01`, UUIDs, generation ids) at first level.
5. Class, discipline, lesson title and professional phase remain visible once inside the lesson cycle.
6. Material source is provenance, not navigation.
7. Broader product navigation becomes perceptually secondary during focused lesson work.
8. All touch targets are visually sized for at least 44 px.
9. No horizontal scrolling at 320 px.
10. No Atlas affordance appears unless a qualified Atlas resource actually exists.

## 4. Scenario used in the P0 board

The visual board uses one coherent example:

- class: `2ª C`;
- discipline: `Tecnologia`;
- lesson: `Il territorio agricolo come sistema`;
- next occurrence: `Domani · 10:00–11:00`;
- lesson has existing preparation context;
- one qualified Atlas pilot resource is available for this scenario.

This is a design scenario only. It does not create or mutate runtime data.

## 5. Screen M1 — OGGI

### Human question

**What needs my attention now?**

### Composition

Compact mobile app header:

- Docente OS mark;
- label `OGGI`;
- workspace name in small text;
- search/profile controls remain secondary.

Main content:

- human date: `Domenica 18 ottobre`;
- headline: `La prossima cosa utile è preparare domani.`;
- one dominant lesson card.

Lesson card:

- eyebrow `PROSSIMA LEZIONE`;
- badge `2ª C`;
- `Tecnologia`;
- title `Il territorio agricolo come sistema`;
- `Domani · 10:00–11:00`;
- small chips: `UDA 2-01`, `2 materiali pronti`, `1 da verificare`;
- primary CTA `Prepara lezione`.

Continuity strip directly below:

- label `RIPRENDI IL FILO`;
- detail `Distinguere risorse, processi e impatti del sistema agricolo.`;
- same lesson context, not a second destination.

Secondary content:

- compact disclosure `Altre cose da fare · 2`;
- no planner statistics or catalogues above the fold.

Bottom navigation outside focused mode:

`Oggi | Classi | Orario | Altro`

## 6. Screen M2 — PREPARA

### Human question

**What must be ready before class?**

### Persistent Lesson Shell

Top compact frame:

- back to `Oggi`;
- `2ª C · Tecnologia`;
- `Il territorio agricolo come sistema`;
- `Domani · 10:00–11:00`;
- phase rail: `PREPARA · Conduci · Osserva · Registra` with PREPARA active.

### Main hierarchy

Objective card:

`Riconoscere il territorio agricolo come sistema di risorse, processi, prodotti e impatti.`

Readiness block:

- `Ti serve` → `Mappa del sistema agricolo`, `Scheda studenti`, `LIM`;
- `Già pronto` → two ready items;
- one amber row `1 materiale da verificare`.

Primary CTA:

`Approva e procedi`

Secondary actions:

- `Materiali`;
- `Adatta`.

Progressive disclosure:

`Vedi progettazione completa` contains UDA, outcomes, references and broader authoring tools.

No `Progetta` or `Conoscenza` macro-destination is required to finish PREPARA.

## 7. Screen M3 — MATERIALI

### Human question

**What do I use in this lesson?**

Lesson Shell remains visible and PREPARA remains the parent phase.

First-level intent selector:

`Riutilizza | Adatta | Crea`

Default active state: `Riutilizza`.

Material card A — qualified Atlas:

- provenance pill `ATLAS`;
- type `Infografica`;
- title `Mappa del sistema agricolo`;
- short relevance: `Mostra risorse, processi, prodotti e impatti nello stesso schema.`;
- status `Pronta`;
- actions: `Anteprima` and primary `Usa`.

Material card B — Docente OS / Knowledge:

- provenance pill `DOCENTE OS`;
- type `Scheda studenti`;
- title `Leggere un sistema agricolo`;
- short relevance;
- actions: `Anteprima` and primary `Usa`.

Footer action:

`← Torna a Prepara`

Do not expose processing state, generation metadata, ingestion controls, asset versions or generic catalogue navigation.

## 8. Screen M4 — ANTEPRIMA MATERIALE

### Human question

**Is this material suitable for the lesson?**

Top shell remains:

`PREPARA · 2ª C · Il territorio agricolo come sistema`

Material identity:

- provenance `Atlas`;
- `Infografica`;
- title `Mappa del sistema agricolo`.

Main preview:

- large readable material canvas;
- simple diagram of `risorse → processi → prodotti → impatti`;
- no Knowledge product chrome.

Primary CTA:

`Usa nella lezione`

Secondary actions:

- `Adatta`;
- `Apri originale`.

Predictable return:

`← Materiali`

## 9. Screen M5 — CONDUCI

### Human question

**What do I do now with the class?**

Focused Lesson Shell:

- `2ª C · Tecnologia`;
- lesson title;
- active phase `CONDUCI`;
- global navigation visually reduced.

Runbook body:

- `PASSO 2 DI 5`;
- timing `12 min`;
- title `Leggi la mappa del sistema agricolo`;
- instruction `Chiedi alla classe di riconoscere almeno una risorsa, un processo, un prodotto e un impatto.`;
- attached material preview in the same view;
- optional cue in a light-blue note.

Sticky footer:

- secondary `Indietro`;
- primary `Avanti`.

One small secondary link below the task surface:

`Vedi evidenze`.

Do not show authoring tools, UDA detail, unused material catalogue or global planning controls.

## 10. Desktop reference

Desktop does not restore the old navigation-first hierarchy.

Focused lesson mode uses:

- compact left rail or reduced global rail;
- central lesson column max readable width around 880–960 px;
- persistent Lesson Shell across the top of the work surface;
- phase rail visible without becoming a second navigation system;
- optional material preview side panel only when it directly supports the current task.

The dominant object remains the lesson, not the application module.

## 11. Human Review questions

The P0 visual board passes only if a reviewer can answer **yes** to all of these:

1. From Oggi, is the next useful teacher action obvious within about three seconds?
2. Does entering PREPARA preserve class and lesson identity without requiring the user to understand internal modules?
3. Are Materiali clearly a subtask of PREPARA rather than a new section?
4. Does opening an Atlas/Knowledge resource preserve the lesson context?
5. Can the user preview and attach a material without falling into asset-management UI?
6. Does CONDUCI feel like a runbook for the classroom rather than a document viewer?
7. Is there only one primary CTA on every screen?
8. Is global navigation visibly subordinate while the user is in the lesson cycle?
9. Are technical identifiers absent from the first visual level?
10. Would the same hierarchy still make sense at 320 px mobile width?

## 12. Explicitly deferred from this first board

Not included in P0 board yet:

- OSSERVA visual detail;
- REGISTRA fast path;
- CONTINUA post-record state;
- Class longitudinal redesign;
- Atlas-unavailable alternate state;
- ambiguous-context fallback;
- desktop full set;
- general Atlas catalogue;
- Studio Atlas runtime handoff.

Those follow only after P0 visual review.

## 13. Gate

No implementation plan is authorised by this document.

Next gate after visual board review:

- `PASS` → produce P1 visual board (`OSSERVA → REGISTRA → CONTINUA`) and remaining alternate states;
- `REWORK` → revise this P0 board only;
- `REJECT` → revisit the approved UX architecture before any product change.
