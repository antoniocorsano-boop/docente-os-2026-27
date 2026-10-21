# Docente OS — Product IA Reset Design

Date: 2026-10-21  
Status: **DESIGN FROZEN — WRITTEN SPEC PENDING HUMAN REVIEW**  
Scope: product architecture, information architecture, routing semantics, progressive disclosure  
Out of scope: implementation, merge, Beta promotion, production deploy

## 1. Purpose

Docente OS has accumulated valid professional capabilities through too many equivalent destinations and parallel decision surfaces. The result is cognitive overhead: the teacher is repeatedly asked to understand the software structure instead of being taken directly to the professional work that matters.

This design resets the information architecture around the teacher's context and immediate work while preserving the existing domain boundaries, persistence rules, governance controls, provenance, fail-closed behavior, and professional capabilities.

The intended product outcome is:

> **The teacher chooses the work, not the software module that performs it.**

Success means that everyday use can be understood through four primary entrances — **Oggi, Orario, Classi, Altro** — while **Lezione** becomes the central operational object reached directly whenever the context is already known.

## 2. Design principles

### 2.1 Context first

If Docente OS knows the class and lesson with sufficient certainty, it must take the teacher directly to that lesson. It must not insert an intermediate Class page merely because the Class page exists.

If the context is ambiguous, Docente OS must not guess. It stops at the most reliable context available, such as Orario or Classe, and makes the ambiguity explicit.

### 2.2 Capability does not imply destination

A capability can remain powerful, complete, governed, and testable without being a primary navigation destination.

This applies especially to:

- preparing a lesson;
- observing during a lesson;
- registering a lesson;
- using materials in class;
- curriculum checks;
- Copilot/assistant actions;
- voice capture;
- material revalidation;
- annual-plan and design support.

### 2.3 One dominant professional object

Every primary surface should make one professional object dominant and expose one primary action that is coherent with that object's state.

The product must avoid presenting several equally weighted actions or modules when one action is clearly the next professional step.

### 2.4 Progressive disclosure

Advanced, technical, governance, provenance, or less frequent functions remain available but do not compete with the current task.

### 2.5 Preserve domain authority

This IA redesign changes exposure, hierarchy, and routing only. It does not weaken or merge domain boundaries.

In particular:

- Orario and Calendario remain distinct domains;
- Piano annuale remains distinct from Calendario, Orario, and Attività;
- curriculum and authority blockers remain fail-closed;
- sources and materials retain provenance, version, and approval state;
- timetable changes remain versioned and explicitly activated;
- TeachingSession/Diario remains the source of actual class continuity;
- no automatic mutation is introduced merely to simplify the UI.

## 3. Primary product backbone

The approved primary navigation is:

```text
Oggi · Orario · Classi · Altro
```

**Lezione is not a global navigation item.** It is the central operational object reached from Oggi, Orario, or Classe.

Conceptual routing:

```text
Oggi  -----------> Lezione
Orario ----------> Lezione
Classi -> Classe -> Lezione

Altro -> professional tools
```

When Oggi or Orario already identifies the lesson with sufficient certainty, the Class step is skipped.

## 4. IA-01 — Oggi

### 4.1 Purpose

Oggi answers only:

> **What teaching work requires my attention now, and what calendar commitments do I need to keep in mind today?**

Oggi is not a general planner, a product dashboard, a complete daily timeline, or a catalogue of Docente OS capabilities.

### 4.2 Allowed first-level content

Oggi may show only:

1. **one lesson to register**, if a lesson has ended and has not yet been registered;
2. **the first useful available/upcoming lesson** of the day;
3. **today's Calendar commitments**, when present.

If a past unregistered lesson and a next lesson coexist, both are shown.

Maximum first-level teaching load:

> **two operational lesson objects + today's Calendar commitments**

### 4.3 Direct actions

When the lesson is known, the CTA goes directly to Lezione. Examples:

- `Registra la lezione`
- `Apri la lezione`
- `Continua la lezione`
- `Inizia la lezione`

Oggi must not route to Classe merely as an intermediate step.

### 4.4 Excluded content

The following do not belong on the first level of Oggi:

- generic PlannerTask lists;
- overdue/week/waiting task buckets;
- generic quick links;
- materials catalogue;
- Progetta;
- Knowledge/material library;
- Piano annuale;
- complete daily timeline;
- day-review dashboard;
- generic “other decisions” containers.

### 4.5 Generic activities

PlannerTask remains a fully supported capability — create, complete, move, wait, reopen, provenance, due date, priority — but moves to:

```text
Altro -> Attività
```

It is no longer composed into Oggi.

## 5. IA-02 — Orario

### 5.1 Preserve the existing UI

The current daily and weekly timetable views are explicitly preserved. They are considered useful and are not subject to structural redesign in this IA reset.

The redesign must not remove or replace:

- daily view;
- weekly view;
- normal movement between those views;
- current readable timetable density and organization.

### 5.2 Role

Orario is the temporal alternative to Oggi. It answers:

> **How is my teaching week organized, and which lesson am I looking for?**

### 5.3 Consultation mode

When a timetable slot identifies class and lesson with sufficient certainty, activating that slot opens Lezione directly.

If the lesson cannot be resolved safely, the product must stop at the most reliable context rather than inventing one.

### 5.4 Timetable editing

Timetable editing remains a capability of Orario. It is not moved to Altro.

Consultation and maintenance remain separate modes. The existing governed editing flow is preserved conceptually:

```text
Modifica -> Data di decorrenza -> Controlla / attiva
```

Editing a draft does not immediately change the timetable in force. Activation remains an explicit final decision.

In edit mode the grid is used to edit the timetable. A tap/click must never be ambiguous between “open lesson” and “edit slot”.

### 5.5 Canonical rule

> **ORARIO = current daily/weekly UI preserved + direct lesson entry in consultation mode + separate governed editing mode.**

## 6. IA-03 — Classi and Classe

### 6.1 Classi

Classi is primarily a selector of sections.

Its first level should show only what is needed to recognize and enter a class quickly:

- class;
- essential discipline/teaching assignment context;
- concise state indicator when useful.

`Gestisci classi` remains a secondary configuration function.

Classi must not become another progress dashboard, material hub, or planning environment.

### 6.2 Classe

Classe is the **professional memory and continuity surface for a section**, not a mini Docente OS.

It must answer four questions:

1. Where are we?
2. What did we actually do last time?
3. What comes next?
4. What can/should I do now?

### 6.3 First-level Classe content

The first level contains:

- class identity and discipline;
- latest actually recorded work;
- next activity;
- essential progress/context;
- one dominant contextual CTA.

Possible CTA labels include:

- `Prepara la lezione`
- `Apri la lezione`
- `Continua la lezione`
- `Registra la lezione`

Classe is not a mandatory gateway when Oggi or Orario already knows the lesson.

### 6.4 Secondary hierarchy

After the essential content and dominant CTA, exactly one named secondary access remains always visible:

```text
Diario
```

Diario is the historical professional memory of the class. It preserves lessons taught, observations, next activity, and Drive synchronization state where applicable.

All other class-related capabilities are grouped under one secondary disclosure:

```text
Altro della classe
```

This may include, when relevant:

- class materials;
- Piano annuale;
- Progetta;
- Conoscenza / fonti;
- curriculum;
- advanced recording;
- teaching assignment/cattedra;
- professional/technical details.

Canonical rule:

> **Classe = continuity + one dominant CTA + Diario visible; everything else lives in Altro della classe.**

## 7. IA-04 — Lezione

### 7.1 Central operational object

Lezione becomes the central operational workspace.

The existing conceptual sequence:

```text
Prepara -> Conduci -> Osserva -> Registra
```

may remain useful internally, but it is no longer exposed as four competing destinations the teacher must navigate manually.

For the teacher there is one workspace:

```text
Lezione · Classe · Disciplina · Titolo
```

The workspace adapts to the lesson state.

### 7.2 Automatic state resolution

The teacher does not choose the phase from a phase-navigation bar. Docente OS opens the lesson in the state most consistent with reliable temporal and professional context:

```text
future lesson ------------------> preparation
lesson in progress -------------> teaching
ended, not registered ----------> closure / registration
registered lesson --------------> continuity / next step
```

The context may come from Oggi, Orario, or Classe.

If Docente OS cannot resolve the state with sufficient certainty, it must not guess. It presents the reliable context it has, makes the uncertainty explicit, and does not force an unjustified state transition.

### 7.3 Before the lesson

First-level content:

- objective;
- what is needed;
- essential materials;
- any real blocker;
- dominant CTA `Inizia la lezione`.

Curriculum, approval, and authority rules remain active and may block progression. They should be explained in human terms but must not be bypassed.

### 7.4 During the lesson

First-level content:

- current activity/passage;
- essential instruction;
- necessary material;
- very light progress indicator where useful;
- dominant CTA `Concludi la lezione`.

`Osserva` becomes a contextual capability, for example `Aggiungi osservazione`. It is not a mandatory page or phase.

### 7.5 Closure

After the lesson ends, the same workspace moves to closure/registration.

First-level content:

- outcome;
- what was actually done;
- next activity;
- dominant CTA `Registra la lezione`.

Secondary options may include:

- actual minutes;
- detailed observations;
- difficulties;
- ideas;
- UDA-change proposal;
- voice capture;
- assistant/Copilot support;
- additional professional details.

### 7.6 After registration

Show a short confirmation and continuity state:

- lesson registered;
- next activity;
- CTA such as `Prepara la prossima` or `Torna a Oggi`.

### 7.7 Materials inside Lezione

Capabilities currently exposed through surfaces such as next-lesson materials and in-class material viewer remain valid, including:

- teacher view;
- LIM view;
- student handout view;
- canonical material linkage;
- explicit revalidation;
- provenance and approval state;
- classroom-use support.

These become contextual views/capabilities of Lezione rather than mandatory navigation destinations.

Canonical rule:

> **Lezione = one workspace, state resolved from context, one coherent primary CTA, secondary capabilities surfaced only when useful.**

## 8. IA-05 — Altro

### 8.1 Purpose

Altro contains important professional tools that must remain fully available without competing with the primary everyday flow.

Altro is a single scannable surface. Its grouping is visual/informational only; the groups do not add extra navigation levels.

### 8.2 Approved grouping

#### Lavoro

- Attività
- Progetta
- Piano annuale

#### Risorse e organizzazione

- Materiali e fonti
- Calendario
- Documentazione

#### Sistema

- Impostazioni
- Account e sicurezza

### 8.3 Contextual capabilities

The following do not become primary entries merely because they are important:

- Curricolo Arena;
- assistant/Copilot;
- voice;
- material revalidation;
- other governance/technical details.

They appear in the relevant professional context.

## 9. Materiali di domani

`Materiali di domani` has one stable home:

```text
Altro -> Materiali e fonti
```

It may also be reached contextually from Orario when the teacher is looking at the following day.

It is not:

- a primary navigation item;
- a new top-level dashboard;
- content inside Oggi.

Rule:

> **One stable home, plus intelligent contextual access.**

## 10. Home and duplicate decision surfaces

The current Home independently computes next work, lessons, tasks, and quick entrances. Oggi independently performs overlapping decision work.

The new IA removes that duplication at product level.

There is no separate teacher-facing “Home” dashboard in the target IA. Oggi is the single everyday landing concept.

## 11. Day review / Resoconto della giornata

The current day-review surface combines several responsibilities:

- lessons to register;
- class continuity/reflections;
- tomorrow materials;
- open decisions.

In the target IA these responsibilities are assigned to their natural homes:

- ended lesson to register -> Oggi / Lezione;
- continuity and reflections -> Classe / Diario;
- tomorrow packages -> Materiali e fonti / Orario / Lezione context;
- generic decisions -> do not recreate a parallel dashboard.

The day-review page is therefore a candidate for retirement as an autonomous destination once capability parity has been demonstrated.

Its useful loaders/domain logic may be reused. Retiring a page does not imply deleting useful domain logic.

## 12. Route compatibility and migration

### 12.1 Goal

Simplify the teacher-facing architecture without breaking existing links abruptly.

### 12.2 Initial canonical route behavior

For the first migration stage:

- `/planner` remains the technical route for **Oggi**;
- `/workspace` continues to resolve to Oggi;
- `/` stops acting as a separate Home/dashboard and becomes an alias or redirect to Oggi.

This avoids inventing a new route name merely for the IA reset.

### 12.3 Soft retirement of legacy routes

Legacy routes are not deleted first.

The migration order is:

```text
1. move/expose capability in the new canonical context
2. verify behavioral parity and governance
3. stop generating the legacy route from the new UI
4. redirect/retire the legacy route only when safe
```

This applies to routes/surfaces such as:

- Home `/`;
- `/giornata/resoconto`;
- `/materiali/prossima`;
- `/materiali/domani`;
- `in-classe/...`;
- legacy lesson phase URLs/parameters such as prepare/teach/observe/record where applicable.

Legacy lesson phase URLs may remain temporarily compatible, but the new UI must not require the teacher to know or choose those internal phases.

### 12.4 Compatibility invariant

> **First relocate the capability, then retire the route. Never retire first and hope the capability survived elsewhere.**

## 13. Capability anti-regression map

| Current capability/surface | Target placement | Rule |
| --- | --- | --- |
| Home | absorbed by Oggi | no second dashboard |
| Oggi | primary | max two lesson objects + today's Calendar commitments |
| Timetable daily/weekly | primary | UI preserved |
| Timetable edit/activate | inside Orario | separate governed maintenance mode |
| Classi | primary | selector |
| Classe | class continuity | one dominant CTA + Diario + Altro della classe |
| Lezione | central workspace | state resolved from context |
| Prepara | internal lesson state | future lesson |
| Conduci | internal lesson state | current lesson |
| Osserva | contextual capability | never mandatory page/phase |
| Registra | lesson closure state | ended unregistered lesson |
| Post-registration continuity | Lezione | confirmation + next step |
| Diario | visible secondary action in Classe | professional history |
| In-class material viewer | Lezione | contextual |
| Next-lesson materials | Lezione | contextual |
| Tomorrow materials | Altro -> Materiali e fonti | contextual access from Orario next-day view |
| PlannerTask | Altro -> Attività | excluded from Oggi |
| Calendario | Altro -> Calendario | Oggi reads today's commitments only |
| Circular -> Calendar intake | Calendario | explicit confirmation preserved |
| Progetta | Altro -> Progetta | callable contextually from class/lesson |
| Knowledge / sources | Altro -> Materiali e fonti | callable contextually |
| Piano annuale | Altro -> Piano annuale | read by class/lesson where needed |
| Documentazione | Altro -> Documentazione | professional tool |
| Curricolo Arena | Altro della classe / Lezione | governed, fail-closed |
| Assistant/Copilot | contextual | never primary destination |
| Voice | contextual | never primary destination |
| Impostazioni | Altro | configuration |
| Account / MFA | Altro | security |
| Day review | capabilities redistributed | autonomous page can retire after parity |

## 14. Visual and interaction rules carried forward

The previous visual work remains useful as research even though it is no longer the normative product architecture.

The following visual principles remain valid:

- one dominant professional object per surface;
- one primary CTA;
- no more than two secondary actions at the same visual level unless a specific workflow requires otherwise;
- no technical identifiers at first level;
- class, discipline, lesson title, and professional context visible where relevant;
- provenance is information, not navigation;
- global navigation is visually secondary while working inside a lesson;
- touch targets remain at least 44 px;
- no horizontal overflow at 320 px;
- desktop must not restore a navigation-first hierarchy;
- Atlas affordances remain fail-closed when no qualified resource exists.

The old `OGGI -> PREPARA -> MATERIALI -> ...` storyboard is therefore **not** a routing contract. It is reference material for hierarchy, calmness, and focus.

## 15. Failure and ambiguity behavior

### 15.1 Context ambiguity

When multiple lessons or contexts are compatible and no deterministic choice is justified:

- do not choose a class on the teacher's behalf;
- show the ambiguity in human language;
- route to Orario or Classe as the safe disambiguation surface.

### 15.2 Governance blockers

When curriculum, approval, authority, material state, or other governed prerequisites block progression:

- keep the block fail-closed;
- explain what is blocked and why in professional language;
- do not weaken the requirement to preserve a simpler visual flow;
- expose technical/provenance details progressively when needed.

### 15.3 Missing material or preparation

If a lesson is known but its preparation/material cannot be resolved with sufficient certainty:

- keep the lesson context;
- show the unavailable/uncertain preparation state inside Lezione;
- provide the next legitimate professional action;
- do not bounce the teacher through unrelated modules.

## 16. Testing and qualification requirements

Implementation must not be accepted solely because routes render or unit tests pass.

### 16.1 Contract tests

Add or adapt executable IA contracts for:

- primary navigation = Oggi, Orario, Classi, Altro;
- Oggi content limits;
- direct routing from Oggi/Orario to Lezione when context is certain;
- no forced Class intermediate step;
- Classe first-level content and Diario/Altro della classe hierarchy;
- lesson state resolution for future/current/ended-unregistered/registered;
- `Osserva` contextual, not mandatory;
- Altro grouping;
- tomorrow-material stable home + timetable contextual access;
- legacy compatibility and redirect behavior.

### 16.2 Domain regression

Existing tests for:

- timetable versioning/activation;
- calendar separation;
- planner persistence;
- teaching-session/Diario persistence;
- curriculum and authority gating;
- material provenance/versioning;
- Drive synchronization;
- authentication/MFA

must continue to pass or be intentionally updated without weakening semantics.

### 16.3 Browser and responsive evidence

Human-visible qualification must cover at least:

- Oggi with pending registration + upcoming lesson + calendar commitment;
- Orario daily view;
- Orario weekly view;
- Orario edit mode kept distinct from lesson opening;
- Classi selector;
- Classe first level;
- Diario;
- Altro della classe;
- Lezione future/preparation state;
- Lezione in-progress state;
- Lezione ended-unregistered state;
- Lezione registered/continuity state;
- Altro grouped tools;
- Materiali di domani through stable and contextual entrances;
- legacy route compatibility during migration.

Check at minimum mobile narrow width and desktop. Existing 320/390 px hardening expectations remain applicable.

### 16.4 Human product review

A final Human Review must judge:

- whether the teacher can understand what to do without learning internal module names;
- whether Oggi stays sparse;
- whether Orario remains as convenient as before;
- whether Classe feels like continuity rather than a dashboard;
- whether Lezione behaves as one coherent workspace;
- whether Altro is complete without becoming a new noisy menu;
- whether no important capability disappeared.

## 17. Migration sequencing constraints

The implementation plan should preserve the following order of risk reduction:

1. establish executable IA contracts before broad UI changes;
2. introduce primary shell/navigation semantics;
3. simplify Oggi;
4. preserve and wire Orario direct lesson entry without redesigning its views;
5. simplify Classi/Classe and protect Diario;
6. unify Lezione state presentation while preserving persistence/governance;
7. introduce Altro and stable tool placement;
8. relocate tomorrow-material entrances;
9. retire duplicate/legacy surfaces only after parity evidence;
10. qualify exact head with automated + browser + human review.

This sequence is a design constraint, not yet an implementation plan.

## 18. Non-goals

This reset does **not** authorize:

- rewriting the timetable UI;
- merging Calendario and Orario;
- deleting PlannerTask capability;
- weakening curriculum approval or authority rules;
- removing Diario or Drive synchronization;
- removing materials/provenance/revalidation capability;
- redesigning all tool internals under Altro;
- changing production deployment policy;
- opening unrelated technical fronts;
- introducing new student auth/tracking;
- merging or deploying any implementation branch.

## 19. Definition of design completion

This design is complete when the written spec is reviewed and approved by the human partner.

Only after that approval may the project move to the separate implementation-planning stage.

No implementation, merge, Beta promotion, or production deployment is authorized by this document.
