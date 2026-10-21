# DOCENTE OS — Visual Conformance Realignment Design

**Status:** DESIGN APPROVED / SPEC REVIEW REQUIRED  
**Date:** 2026-10-21  
**Baseline:** `develop@8177ceb1e24977eba261b8988243d0ba9f750761`  
**Branch:** `docs/dos-visual-conformance-realignment`  
**Scope:** presentation-only realignment to the frozen task-centric visual contract  
**No authority change:** yes  
**No schema change:** yes  
**No Production change:** yes

## 1. Purpose

This design closes the gap between the frozen Docente OS visual/user-flow contract and the current Beta implementation without reopening product architecture or adding new capability.

The approved teacher journey remains:

`OGGI → PREPARA → MATERIALI → VISUALIZZA MATERIALE → CONDUCI → OSSERVA → REGISTRA → CONTINUA`

with `CLASSE` as voluntary longitudinal access and `ESPLORA` outside the primary flow.

The implementation already satisfies the functional graph and runtime gates. The remaining work is a **Visual Conformance Pass**: recompose current surfaces so hierarchy, noise budget, task identity and CTA structure match the already-approved visual baseline.

## 2. Visual authority

No new visual design is introduced by this work.

The authority order is:

1. canonical raster baseline recorded by `docs/superpowers/evidence/2026-10-18-docente-os-task-centric-p0-visual-review.md`;
2. Figma board `4:3` — `Canonical PNG-matched board`;
3. Figma mobile review board `10:2` — `Mobile Review — canonical vertical board`;
4. responsive/accessibility implementation corrections subordinate to the frozen hierarchy.

Canonical raster SHA-256:

`8de8bfc1e0e95438415e55914ec9d074aed1798532e18e191bb6c0cb65847b1f`

Mobile derivative SHA-256:

`66ace6832b35fd74a8a429e1e2212977078ff3a5bffcdf5a451752d51ea62705`

Figma cannot silently introduce a new product decision. If a required correction would change the primary graph, domain semantics or authority boundary, this spec stops and the visual contract must be reopened explicitly.

## 3. Current-state finding

The current Beta on `8177ceb1…` is functionally qualified and all published runtime checks are green. However, visual conformance is incomplete.

The implementation preserves the task-centric graph but several surfaces have accumulated extra hierarchy or system-facing detail:

- `OGGI`: dominant lesson task exists, but global navigation and secondary planner content remain visually strong;
- `PREPARA`: all required elements exist, but approval/curriculum and extended context create more visual weight than the frozen composition;
- `MATERIALI`: correct intents exist, but the subtask is embedded inside PREPARA and cards expose more explanatory/provenance detail than the canonical board;
- `VISUALIZZA`: lesson context and attach action are correct, but the preview is document/system-oriented rather than materially visual-first;
- `CONDUCI`: closest to the frozen model; only noise reduction and hierarchy tightening are expected;
- `OSSERVA`: the core checklist is present, but professional observation controls are promoted too high;
- `REGISTRA`: largest divergence; current multi-step wizard is functionally richer than the frozen one-screen fast path;
- `CONTINUA`: substantially aligned;
- `CLASSE`: longitudinal facts are present, but advanced panels and technical details compete with the compact overview.

This is not a functional redesign problem. It is a presentation composition problem.

## 4. Decision

Use **recompose-in-place**.

Existing actions, routes, domain models, receipts, authority boundaries and persistence remain unchanged. Markup composition and CSS hierarchy may change. Existing advanced capability remains available only where useful, mainly through progressive disclosure.

Rejected alternatives:

- **CSS-only pass:** insufficient because some divergences are structural, especially MATERIALI, REGISTRA and CLASSE.
- **Rewrite surfaces from scratch:** unnecessary and high-risk because the working domain/action layer is already qualified.

## 5. Global conformance rules

Every focused state must preserve these frozen rules:

1. one dominant professional object;
2. one primary CTA;
3. at most two secondary actions at the same visual level;
4. no technical identifiers at first level;
5. class, discipline, lesson title and professional phase remain visible inside the lesson cycle;
6. material source is provenance, not navigation;
7. broader product navigation is perceptually subordinate during focused lesson work;
8. touch targets remain at least 44 px;
9. no horizontal scrolling at 320 px;
10. Atlas appears only when a qualified resource exists;
11. advanced authoring, technical provenance and system controls use progressive disclosure;
12. no visual simplification may weaken an approval, revalidation, receipt or explicit teacher-decision boundary.

## 6. State-by-state target

### 6.1 OGGI

**Goal:** restore the next useful teacher action as the unmistakable first object.

Keep:
- current authoritative `TodayTeachingFocus` decision;
- next/current lesson card;
- continuity link when real;
- `Prepara lezione` / other truthful task CTA.

Recompose:
- lesson card remains dominant above the fold;
- rest-of-day information becomes compact secondary content;
- generic planner statistics, quick actions or module navigation must not visually compete with the lesson task;
- mobile navigation follows the frozen perceptual hierarchy: Oggi, Classi and Orario remain primary; broader navigation is one subordinate escape.

No route or authority change is implied.

### 6.2 PREPARA

**Goal:** match the compact decision surface in the frozen board.

First level:
- Lesson Shell;
- lesson objective;
- `Ti serve` / readiness summary;
- one visible Materiali entry;
- approval/proceed CTA;
- `Vedi progettazione completa` as progressive disclosure.

Move below first level where possible:
- verbose authority explanations;
- complete preparation checklist;
- broad design tools;
- extended UDA/outcome context.

Curriculum and preparation approval semantics remain unchanged. Required warnings still appear when they block the primary action, but explanatory detail should not dominate the default healthy state.

### 6.3 MATERIALI

**Goal:** make Materiali feel like a focused PREPARA subtask, not a long embedded management section.

First level:
- `Riutilizza | Adatta | Crea`;
- compact cards answering: what is it, why is it useful here, provenance, preview, use;
- one primary attach/use action per card;
- predictable return to PREPARA.

Demote or hide by default:
- version strings;
- long provenance sentences;
- internal state labels that do not affect the teacher decision;
- verbose tips when they can be shortened or disclosed;
- accepted-resource management details unless directly needed.

No duplication of material actions or stores.

### 6.4 VISUALIZZA MATERIALE

**Goal:** content-first preview in the lesson context.

First level:
- persistent Lesson Shell;
- material identity;
- readable/visual preview canvas;
- `Usa nella lezione` primary CTA;
- `Adatta` and/or `Apri originale` only when applicable;
- `Torna ai materiali` predictable return.

Knowledge processing/version/management chrome remains outside the first level and may stay under `Approfondisci la risorsa`.

The implementation must reuse the current task-continuity route and attach action.

### 6.5 CONDUCI

**Goal:** preserve current qualified runbook while tightening noise.

Keep:
- Lesson Shell;
- current step;
- timing;
- instruction;
- directly relevant material;
- Indietro/Avanti or close transition.

Subordinate:
- sequence overview;
- attached-material catalogue;
- preparation/class exits;
- non-current authoring context.

No runbook domain redesign.

### 6.6 OSSERVA

**Goal:** restore a quick observation state.

First level:
- evidence expected;
- compact checklist;
- one primary transition toward registration;
- one predictable return to lesson;
- privacy-preserving language.

Professional observation capture remains available but should move under a clear optional disclosure in the healthy default state.

No student identity or tracking is introduced.

### 6.7 REGISTRA

**Goal:** restore the frozen **fast path** without removing current richer capability.

Default first level should allow the teacher to record the lesson without navigating a wizard when no extra reflection is needed:
- effective outcome;
- short factual note / what was done;
- next activity;
- one `Registra lezione` CTA.

Secondary disclosure can contain:
- actual date/minutes when not already safely resolved;
- professional observation transfer;
- optional reflection;
- Copilot organization;
- voice capture;
- UDA change proposal;
- extended confirmation detail.

Safety constraints:
- canonical TeachingSession receipt remains the single write authority;
- no automatic annual-plan advancement;
- no loss of current validation or idempotency protections;
- partial/remodelled/recovered outcomes remain expressible.

If a mandatory data field cannot truthfully be derived, it may remain visible in the fast path. The visual contract does not authorize inventing defaults.

### 6.8 CONTINUA

**Goal:** preserve the current aligned state and reduce only incidental noise.

First level:
- `Lezione registrata` confirmation;
- effective outcome;
- next activity;
- `Prepara la prossima` primary CTA;
- return to Oggi.

No new continuation model.

### 6.9 CLASSE

**Goal:** restore the compact voluntary longitudinal overview.

First level:
- next lesson / next useful action;
- annual progress;
- recent lesson history;
- visible continuity from latest recorded work.

Move under progressive disclosure:
- advanced recording;
- completion decisions;
- support materials management;
- alternate product paths;
- technical identifiers/provenance.

The existing longitudinal data model and calculations remain authoritative.

### 6.10 ESPLORA

No change to product authority or routing. It remains outside the primary teacher cycle. Atlas/Studio Atlas remain exploratory only according to their existing availability/governance state.

## 7. AppShell and focused-mode behavior

The current AppShell remains the product shell; this spec does not authorize replacing it.

Required behavior:

- outside focused lesson work, normal navigation remains available;
- inside PREPARA/MATERIALI/VISUALIZZA/CONDUCI/OSSERVA/REGISTRA/CONTINUA, global navigation must be visually subordinate to the Lesson Shell and current task;
- the shell may use CSS/state-aware presentation to reduce navigation prominence, but no inaccessible or hidden escape route is allowed;
- mobile must retain a predictable way back to Oggi and broader navigation.

If implementing this requires a new AppShell API, it must be presentation-only (for example `focusMode`) and must not introduce a parallel navigation model.

## 8. Files expected to be touched

Expected presentation surfaces include:

- `product/src/app/planner/today-teaching-focus-card.tsx`;
- planner/home composition and relevant global CSS;
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.tsx`;
- `lesson-prepare-client.tsx`;
- `lesson-materials.tsx`;
- `lesson-live-client.tsx`;
- `lesson-observe-client.tsx`;
- `lesson-close-client.tsx`;
- `lesson-continue.tsx`;
- `product/src/app/knowledge/[assetId]/page.tsx` focused branch;
- `product/src/app/classi/[sectionId]/page.tsx`;
- current lesson/class/AppShell CSS files;
- existing experience/browser tests.

This list is not permission to edit unrelated domain or infrastructure code.

## 9. Testing and evidence

Implementation must be TDD and evidence-driven.

Required verification layers:

1. **Executable visual hierarchy contract**
   - one primary CTA per focused state where applicable;
   - first-level absence of technical identifiers;
   - Lesson Shell identity continuity;
   - Materiali remains a PREPARA subtask;
   - fast-path registration is available without mandatory optional steps;
   - progressive disclosures contain advanced controls.

2. **Responsive**
   - mobile 412 × 915;
   - mobile 390 × 844;
   - mobile 320 × 800;
   - desktop 1440 × 1024;
   - no horizontal overflow;
   - touch targets >=44 px.

3. **Visual evidence**
   - fresh screenshots for all nine canonical states plus ESPLORA containment where relevant;
   - side-by-side review against Figma board `4:3` / canonical raster;
   - classify each state `CONFORMANT`, `ACCEPTABLE IMPLEMENTATION DELTA`, or `REWORK`;
   - no pixel-diff threshold may override human product judgment.

4. **Regression / governance**
   - Product CI;
   - Human + Visual Acceptance;
   - WCAG 2.2 AA where selected;
   - P6 Performance;
   - X3/X4/X5 and other currently applicable runtime gates;
   - exact-head candidate qualification before merge.

5. **Beta Human Product Review**
   - after qualified merge and automatic Beta deployment, repeat the nine-state review on the actually served exact product state;
   - only demonstrated blockers authorize further change.

## 10. Acceptance criteria

This work is complete only when:

- the primary graph is unchanged from the frozen contract;
- every state preserves one dominant task and primary CTA hierarchy;
- optional/advanced capability no longer competes with the default task;
- Materiali and Viewer retain lesson identity and focused return paths;
- Registra exposes a true fast path while retaining all current safety/receipt semantics;
- Classe reads as a longitudinal overview before exposing advanced controls;
- 320 px remains overflow-free;
- Beta screenshots are reviewed against the canonical board;
- all applicable engineering/runtime gates pass on the exact candidate/served SHA;
- Human Product Review returns PASS.

## 11. Non-goals

Explicitly out of scope:

- new product capabilities;
- new lesson/material/continuity domain models;
- schema or migration changes;
- changes to Arena/curriculum authority;
- new Atlas or Studio Atlas runtime integration;
- DOC-04 expansion;
- redesign of global information architecture outside what is necessary to subordinate navigation in focused mode;
- Production promotion;
- unrelated accessibility, performance or refactoring work not required by the visual conformance pass.

## 12. Stop rules

Stop and request a new product decision if any proposed implementation would:

- alter the frozen teacher graph;
- remove a required safety/approval/revalidation control rather than recompose it;
- invent a value to preserve visual simplicity;
- create a new persistence or authority source;
- activate Atlas/Studio Atlas beyond current governed capability;
- require a second navigation architecture;
- expand scope beyond visual conformance.

## 13. Gate sequence

1. **SPEC REVIEW** — this document.
2. **IMPLEMENTATION PLAN REVIEW** — only after explicit approval of this written spec.
3. **TDD EXECUTION** — isolated branch/worktree, RED → GREEN by state/slice.
4. **EXACT-HEAD QUALIFICATION**.
5. **MERGE DECISION** — explicit human authorization only.
6. **AUTOMATIC BETA DEPLOY** from governed `develop`.
7. **POST-DEPLOY RUNTIME RECONCILIATION**.
8. **BETA HUMAN PRODUCT REVIEW against canonical raster/Figma**.
9. **FREEZE** if PASS; otherwise only demonstrated visual blockers re-enter REWORK.

No implementation, merge, Beta mutation or Production action is authorized by this spec alone.
