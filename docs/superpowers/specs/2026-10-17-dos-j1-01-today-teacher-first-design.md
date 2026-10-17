# DOS-J1-01 — Oggi teacher-first design

Status: DRAFT_FOR_HUMAN_REVIEW  
Date: 2026-10-17  
Repository baseline: `develop@3f2b4fbac475109fdc331415aa16af680fd96c87`  
Trigger: DOS-CLOSE-02 Human Review, J1 = `BLOCKER`

## 1. Purpose

This design corrects the first demonstrated closure blocker in Docente OS:

> A teacher entering the real product cannot identify, with sufficient immediacy, the path from the current/next lesson to lesson preparation and its materials.

The correction is intentionally narrow. It changes the **operational hierarchy of `/planner` (Oggi)** so that the teacher's most plausible current teaching action is visible before generic planner detail.

It does **not** create a second planner, a second lesson model, a second materials authority, or new persistence.

The target experience is the approved mobile mockup: a calm, teacher-first `Oggi` surface centered on **Prossima lezione → Prepara lezione**, followed by **Continua da dove eri** and a small set of secondary quick actions.

## 2. Why the current surface fails J1

At the baseline, `/planner` already composes timetable/calendar data and planner tasks through `buildTodayProjection()`. Its visible hierarchy is nevertheless generic:

1. date/greeting and daily summary;
2. a generic `TodayFocusCard`;
3. day timeline;
4. planner activity sections;
5. day-closing and task-creation details.

For a temporal teaching focus, the primary action is currently `Apri la classe`. That is a valid navigation target, but it forces the teacher to reconstruct the intended professional sequence after entering the class.

This conflicts with the canonical Human Task Model already present in the repository:

- Oggi should show the next operational task first;
- a FOCUSED surface has one primary action;
- context must remain visible;
- task continuity must survive internal navigation;
- the canonical teaching example is `Classe → Prepara la prossima lezione → Apri un materiale → ...`.

The blocker is therefore principally an **orchestration and hierarchy defect**, not a missing-domain problem.

## 3. Design choice

### Chosen approach — teacher-first orchestration over existing authorities

`Oggi` remains the same canonical destination and continues to use existing timetable/calendar, class, lesson, planner and materials authorities. Its presentation is reorganized around the teacher's current intent.

When the system can deterministically resolve the current or next teaching lesson and its preparation target, the first card becomes a **Lesson Focus Card** with a direct `Prepara lezione` action.

Generic planner content remains available below the primary teaching flow or through existing full views, but it no longer competes visually with a known teaching task.

### Rejected approach A — styling-only restyle

Changing colors, spacing and card shapes without changing the action hierarchy would preserve the same J1 failure. `Apri la classe` would remain an indirect route to the actual task.

### Rejected approach B — new daily cockpit persistence/model

A new `TodayLesson`, resume-state table, or second daily-work model would duplicate information already owned by timetable, class progression, lesson workspace and planner domains. It is unnecessary for this blocker and would open a new architectural front.

## 4. Product contract

### 4.1 Primary question

Within a few seconds of opening `Oggi`, the teacher must be able to answer:

- **Qual è la prossima lezione?**
- **Con quale classe?**
- **Quando?**
- **Che cosa sto preparando?**
- **Qual è il pulsante da premere adesso?**

When the answer is known, the page must not require the teacher to infer it from a generic timeline or enter the class merely to rediscover the next action.

### 4.2 Screen hierarchy

On mobile, the target order is:

1. compact product/app context;
2. `Oggi` + human date;
3. **Prossima lezione / Lezione in corso** primary card;
4. **Continua da dove eri** only when a real resumable state exists;
5. **Azioni rapide**;
6. secondary daily timeline/planner content through progressive disclosure or lower-page sections.

On wider layouts the same semantic order is preserved. Desktop may use more horizontal space, but it must not promote secondary planner content above the primary teaching task.

## 5. Primary Lesson Focus Card

### 5.1 Required content

When the focus is a resolvable class lesson, the card shows, in scan order:

- state label: `Lezione in corso` or `Prossima lezione`;
- time-to-start when useful and deterministic (for example `Tra 32 min`), otherwise the normal time range;
- class human label (for example `2C`);
- subject/teaching area when available;
- start/end time;
- date only when it helps disambiguate;
- human lesson title/focus;
- at most three concise semantic chips derived from existing approved lesson data;
- one dominant CTA: **`Prepara lezione`** before the lesson, or the corresponding current-lesson action if an already-supported canonical state requires it.

No UUID, CAN code, block code, source identifier or technical provenance appears at first level.

### 5.2 Direct action

When an approved modeled lesson workspace exists, `Prepara lezione` routes directly to the canonical lesson workspace already used by the class surface, equivalent to the existing `buildLessonWorkspaceHref(sectionId, blockId)` path.

If a modeled lesson workspace cannot be resolved but the existing class planning flow can be resolved, the card may fall back to the canonical focused planning route. The label must describe the actual action; it must not say `Prepara lezione` if the destination cannot provide that task.

If neither target can be resolved safely, the UI must fail closed to a truthful action such as `Apri la classe`; it must not invent a lesson or preparation state.

### 5.3 Context continuity

The destination must preserve or reconstruct enough context to answer:

- quale classe;
- quale lezione/fase;
- perché il docente è arrivato lì;
- come tornare a `Oggi` or to the originating focused task.

No new canonical ownership is introduced by passing context.

## 6. Continua da dove eri

### 6.1 Rule

This card is **conditional**, not decorative.

It appears only if Docente OS can identify a real, existing resumable professional state from current authoritative data, for example an existing lesson preparation/material draft or an unfinished supported lesson workflow.

### 6.2 Content

The card may show:

- `Continua da dove eri`;
- a human state label such as `Bozza materiali`;
- the lesson/class context;
- a truthful last-update time if already available from authoritative persistence;
- one direct resume affordance.

### 6.3 Prohibition

DOS-J1-01 does not authorize a new generic “recent activity” tracker, new analytics, new session-history table or synthetic resume state solely to populate this card.

If no valid resume state exists, the card is absent and the layout closes the gap naturally.

## 7. Azioni rapide

The mockup expresses four secondary entries:

- `Registro rapido`;
- `Diario classe`;
- `Crea materiali`;
- `Alunni`.

For implementation, an action is shown only when a real canonical destination already exists and the label accurately describes that destination.

Rules:

1. these entries are visually secondary to the Lesson Focus Card;
2. no dead controls;
3. no new subsystem is created to satisfy the mockup label;
4. if fewer than four actions are currently valid, show fewer than four rather than inventing capability;
5. class-specific quick actions use the known focus section when safe; otherwise they route to the existing full canonical destination.

The visual target is a compact 2-column grid on mobile where space permits, collapsing to one column at narrow widths without horizontal overflow.

## 8. Planner and timeline content

Existing planner capabilities remain authoritative and must not be deleted by this correction.

However, when a specific teaching task is known, the detailed timeline, workload counters, task sections, day-closing flow and quick task capture become **secondary content**.

Implementation may use existing disclosure patterns (`details` or equivalent accessible progressive disclosure) or position these sections after the teacher-first content.

The requirement is semantic, not merely spatial:

> generic work management must not visually compete with a known next teaching action.

When no teaching focus is known, `Oggi` may fall back to the existing ACT_NOW planner behavior so urgent professional tasks remain useful.

## 9. Focus resolution and data flow

### 9.1 Existing inputs

The design reuses:

- workspace/academic-year context;
- `TemporalProjectionService` for the day timetable/calendar projection;
- `buildTodayProjection()` for current temporal/planner focus;
- existing class progression / next-block resolution;
- existing approved human-task lesson projection;
- existing lesson-workspace route construction;
- existing planner repository and task actions.

### 9.2 New composition boundary

A small presentation/application composition boundary should transform the existing `TodayFocus` plus existing class/lesson information into a UI-ready **Today Teaching Focus**.

The boundary should answer only what `Oggi` needs, for example:

- `sectionId`;
- human class label;
- subject label if available;
- start/end time;
- lesson title;
- focus state (`CURRENT`, `NEXT`);
- safe preparation href;
- optional approved semantic chips;
- optional supported resume target.

It must not become a new persistence authority.

The UI component consumes this presentation object instead of duplicating class-page routing or lesson-resolution logic inside JSX.

### 9.3 Failure behavior

Resolution failures are non-destructive and truthful:

- no section → temporal/calendar focus with existing safe action;
- section known but lesson block unknown → class/focused-planning action;
- no temporal teaching focus → planner ACT_NOW behavior;
- missing optional subject/title/chips → omit the optional field rather than fabricate content.

## 10. Visual contract

The approved mockup is translated into these implementation constraints.

### 10.1 Character

- preserve Docente OS identity and governed tokens where compatible;
- operational calm, warm and legible;
- one visually dominant action;
- soft tonal separation, thin borders, restrained elevation;
- no decorative density.

The exact mockup palette is a target, but token governance and contrast requirements take precedence over pixel imitation.

### 10.2 Mobile card proportions

At `<720px`:

- the primary card spans the usable content width;
- class label is immediately scannable;
- title may wrap but primary CTA remains fully visible;
- CTA target is at least 44 CSS px high;
- no horizontal scrolling at 320 CSS px;
- secondary chips wrap or reduce gracefully;
- quick-action cards remain touch-safe.

### 10.3 Typography and semantics

- `Oggi` remains the page H1;
- card state is supporting text, not a second page title;
- lesson title is the strongest text within the card after the page H1;
- button language uses teacher actions, not system nouns;
- color never carries state alone.

## 11. App shell and navigation

DOS-J1-01 does not redesign the global application shell.

The existing governed mobile navigation remains authoritative. Visual alignment with the mockup is permitted only through the existing shell/tokens or a narrowly justified local extension.

This slice does not authorize renaming or restructuring global destinations merely to make the bottom bar visually identical to the concept image.

## 12. Accessibility

The existing Design System accessibility gate remains binding:

- semantic landmarks/headings;
- visible keyboard focus;
- controls approximately 44×44 CSS px or larger on mobile;
- WCAG AA contrast for normal text;
- no state communicated only by color;
- accessible names for icon controls;
- usable at 200% zoom;
- no horizontal scroll at 320 CSS px for the primary flow;
- reduced-motion preferences respected.

The J1 flow must be operable by keyboard as well as touch.

## 13. Scope and non-goals

### In scope

- `/planner` information hierarchy and presentation;
- deriving a direct, truthful preparation target for the current/next lesson;
- primary Lesson Focus Card;
- conditional resume card using existing authoritative state only;
- validated secondary quick actions;
- progressive demotion of generic planner/timeline detail;
- tests and visual evidence for the new hierarchy.

### Out of scope

- new lesson content generation;
- new materials storage/library;
- new timetable import;
- new diary/registro subsystem;
- new student tracking/authentication;
- new generic recents/activity analytics;
- changes to autorità del curricolo;
- global navigation redesign;
- provider/runtime authority changes;
- DOC-04, IUI, Access, Argo, Visual Factory or other parked fronts.

## 14. Expected code boundaries

The implementation plan should prefer a small set of focused changes rather than a rewrite.

Likely boundaries to evaluate during planning:

- `product/src/app/planner/page.tsx` — page composition only;
- `product/src/app/planner/today-home.css` — local visual layout;
- a focused application/presentation resolver for Today Teaching Focus;
- reuse/extraction of existing canonical lesson-workspace href and next-block resolution rather than duplicate logic;
- focused unit tests for resolution/fallback states;
- browser/visual tests for the teacher-first J1 path.

If implementation discovers that safe direct lesson resolution requires broad cross-domain refactoring, stop and re-evaluate scope rather than expanding DOS-J1-01 silently.

## 15. Test contract

### 15.1 Unit/application tests

Cover at minimum:

1. next class lesson resolvable → Lesson Focus Card model with direct preparation href;
2. current class lesson resolvable → current state is explicit and action truthful;
3. section known, modeled lesson unavailable → safe focused fallback;
4. calendar event without class → no invented class/lesson;
5. no temporal focus + urgent planner task → existing ACT_NOW behavior preserved;
6. no real resumable state → resume card absent;
7. optional metadata missing → layout/model remains valid.

### 15.2 Browser acceptance

At representative mobile width and desktop width:

- opening `Oggi` with a known upcoming lesson shows class, time and lesson context without another navigation step;
- `Prepara lezione` is the only dominant CTA;
- activating it reaches the existing canonical preparation/lesson workspace directly;
- the destination retains recognizable class/lesson context;
- returning to `Oggi` is explicit/predictable;
- planner/timeline content remains accessible but secondary;
- 320 CSS px has no horizontal overflow;
- keyboard focus order follows visual/task order.

### 15.3 Human acceptance — DOS-CLOSE-02 J1

The fix is not accepted merely because automated tests pass.

Repeat J1 with a real authenticated teacher session:

**Oggi / prossima lezione → preparazione → materiali**

PASS only if the teacher can, without coaching:

1. identify the relevant current/next lesson;
2. understand class and lesson context;
3. choose the preparation action naturally;
4. reach preparation/materials without reconstructing the task manually;
5. retain enough context to understand where they are and why.

If the teacher again requires procedural instructions to find the route, J1 remains `BLOCKER`.

## 16. Success criterion

DOS-J1-01 succeeds when `Oggi` behaves as a **teacher's operational starting point**, not as a generic dashboard that happens to contain school data.

The observable product change is deliberately simple:

> When Docente OS knows the teacher's next lesson, the interface says what it is and offers the correct next teaching action immediately.

No additional capability is required to satisfy this design.
