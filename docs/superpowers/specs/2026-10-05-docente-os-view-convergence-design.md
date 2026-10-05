# DOS-VIEW-CONV-01 — Docente OS view convergence design

Date: 2026-10-05
Status: SPEC_FOR_HUMAN_REVIEW
Target repository: `antoniocorsano-boop/docente-os-2026-27`
Target base: `develop`
Execution policy: isolated branch, TDD, no automatic merge

## 1. Purpose

Converge the existing Docente OS user-facing surfaces toward one coherent interaction model without opening new major functional fronts and without destabilizing the recently consolidated timetable/PWA/sharing work.

The tranche addresses two concrete defects observed during the view audit and extends the correction into a controlled design-system convergence pass:

1. the mobile bottom navigation reserves five columns while rendering four destinations, leaving a visible empty slot;
2. Settings mixes configuration, operational destinations and optional features in ways that make some functions difficult to discover and overstate configuration readiness.

The goal is not to make thirty-four screens merely prettier. The goal is to make them behave as parts of one professional teacher-first product.

## 2. Product principle

Canonical Docente OS interaction grammar:

> Context → what needs attention now → one primary action → feedback/state → details on demand.

Home, Oggi, Classe and Orario are the current reference surfaces. Less mature views should converge toward this grammar instead of presenting many sections and controls with no clear starting point.

## 3. Scope

### 3.1 In scope

- mobile shell and bottom navigation;
- mobile secondary navigation (`Altro`);
- Settings information architecture and mobile presentation;
- terminology used in Settings;
- readiness semantics for required versus optional setup;
- selective consolidation of shared presentation primitives;
- convergence of the densest views: Piano annuale, Calendario, Conoscenza and Progetta;
- follow-up convergence of material/lesson/account/auth surfaces where needed;
- view-level visual, responsive and accessibility evidence using existing certification infrastructure.

### 3.2 Explicitly out of scope

- new major teacher capabilities;
- changes to Arena authority boundaries;
- changes to Atlas publication authority;
- DOS-A1 activation;
- redesign of timetable domain logic;
- replacement of the browser-native PWA install experience;
- broad backend/data-model refactors unrelated to view convergence;
- automatic merge or release promotion.

## 4. Mobile navigation

### 4.1 Primary destinations

The mobile bottom navigation keeps exactly four operational destinations:

- Oggi
- Classi
- Orario
- Altro

Home remains reachable from the mobile brand/header affordance and continues to act as the recomposition surface rather than a duplicate operational destination.

### 4.2 Layout rule

The bottom navigation must not encode a fixed number of columns independent of the rendered destinations. Column count must derive from the number of rendered primary items so that adding or removing a destination cannot leave an empty slot.

Acceptance criteria:

- no visible empty navigation slot at supported mobile widths;
- all visible items receive equal available width;
- all interactive targets remain at least 44 × 44 CSS px;
- safe-area insets remain respected;
- active state and `aria-current` remain correct;
- keyboard/focus behavior remains valid where the layout is reachable by keyboard.

### 4.3 `Altro` information architecture

`Altro` is a secondary navigation surface, not a catch-all bucket. It is grouped as follows:

**Prepara e insegna**
- Progetta
- Piano annuale

**Organizza**
- Calendario

**Trova**
- Conoscenza

**Configura**
- Impostazioni
- Account e sicurezza

Search/command navigation remains intent-oriented and may expose all routable destinations.

## 5. Settings information architecture

### 5.1 Principle

Settings must contain things that configure Docente OS, not silently become the only route to ordinary product capabilities.

The page becomes a readable setup/maintenance index with four conceptual groups.

### 5.2 Groups

**Il tuo incarico**
- Tu e la scuola
- Discipline
- Classi assegnate
- Cattedra

**Organizzazione didattica**
- Settimana scolastica
- Libri di testo

**Docente OS sul dispositivo**
- Installazione
- Accessi rapidi Home

**Identità e sicurezza**
- Account e sicurezza (linked destination, not duplicated account management)

### 5.3 Terminology

Rename Settings labels for disambiguation:

- `Classi` → `Classi assegnate`
- `Organizzazione scolastica` → `Settimana scolastica`

The main navigation destination `Classi` retains its current name because it represents operational class work, not setup.

Internal governance/implementation terminology such as wave identifiers, generation IDs or contract codes must not appear in ordinary teacher-facing copy unless there is a documented support/debug reason and explicit disclosure.

## 6. Settings readiness semantics

Required setup and optional setup must be measured separately.

### 6.1 Essential setup

Essential areas:

1. Tu e la scuola
2. Discipline
3. Classi assegnate
4. Cattedra
5. Settimana scolastica

The main readiness counter reports only these essential areas.

Example:

> 5/5 configurazioni essenziali pronte

### 6.2 Optional setup

Optional areas:

- Libri di testo
- Installazione
- Accessi rapidi Home

Optional areas must not increment the essential readiness numerator or denominator. Their state is reported separately, for example:

> 2 opzioni facoltative disponibili

Optional items may still have their own state (`not configured`, `configured`, `review needed`) when useful, but they do not block essential readiness.

### 6.3 Guidance mode

`GUIDED` mode remains active while any essential area is incomplete or requires review. `MAINTENANCE` becomes valid only when all essential areas are ready.

Optional areas alone must not force `GUIDED` mode.

## 7. Settings mobile behavior

The horizontal carousel of overview cards is removed on small screens.

Mobile Settings uses a vertical, grouped index. Each row contains, in this order:

1. icon or compact category marker;
2. area name;
3. current status;
4. one-line explanation;
5. navigation indicator/action affordance.

The next essential action, when one exists, is placed before the complete index.

Long configuration sections use progressive disclosure or dedicated subviews where already available. The page must not require horizontal swiping to discover setup categories.

## 8. Shared presentation primitives

This tranche may introduce or consolidate only primitives that directly support convergence. Candidate primitives:

- `PageHeader`
- `TaskFocus`
- `SectionDisclosure`
- `StatusFeedback`
- `EmptyState`
- `SettingsIndexItem`
- `SettingsGroup`
- `MobileBottomNavigation`

Domain-specific components remain domain-specific. The implementation must not create a generalized component abstraction unless at least two real consumers need the same behavior or styling.

## 9. Dense-view convergence

### 9.1 Piano annuale

- preserve desktop information density where useful;
- add a genuine mobile representation for the current wide tabular structure rather than relying only on horizontal scrolling;
- hide or demote technical provenance from the normal teacher workflow;
- preserve access to evidence/provenance where needed for support or governance.

### 9.2 Calendario

- keep next event / operational agenda / add-event path prominent;
- demote structural/history information;
- remove internal project terminology from ordinary UI;
- preserve the distinction between recurring timetable and date-specific calendar information.

### 9.3 Conoscenza

- preserve context when entered from class/preparation/calendar;
- choose one visual priority according to entry intent (find, capture or browse) instead of giving all three equal weight;
- keep secondary modes available without hiding them.

### 9.4 Progetta

- treat contextual/guided mode as the canonical authoring experience when context is available;
- keep general/archive mode as a secondary entry pattern;
- preserve existing domain contracts and saved data.

## 10. Secondary-view convergence

After the four densest views, review remaining material, diary, authoring, account and authentication surfaces against the canonical grammar. Changes are limited to presentation hierarchy, shared chrome, feedback consistency, mobile behavior and terminology unless a defect blocks task completion.

## 11. Feedback and state language

Use consistent states across converged views:

- neutral/informational;
- success;
- warning/review needed;
- error;
- loading/pending where applicable.

Feedback must be noticeable without being disruptive, persistent only when the state itself persists, and associated with the action or surface that produced it. Recent timetable feedback behavior is the interaction reference where appropriate.

Destructive actions must remain explicitly confirmable and must not be promoted as primary actions.

## 12. Accessibility and responsive requirements

All changed surfaces must preserve or improve:

- semantic landmarks;
- visible focus;
- skip-navigation behavior where applicable;
- accessible names for icon-only controls;
- `aria-current` on active navigation;
- 44 × 44 minimum coarse-pointer targets;
- reduced-motion preferences;
- no unintended horizontal overflow;
- logical reading order independent of visual reflow;
- usable mobile layouts down to the smallest currently supported viewport.

No tranche-completion statement may claim WCAG 2.2 AA coverage for all views unless the corresponding browser/accessibility evidence exists.

## 13. Verification strategy

Use existing repository infrastructure rather than creating a parallel certification system.

Relevant existing gates include Browser Certification, Design Policy, Experience Acceptance and Human Interaction Model.

### 13.1 Minimum view evidence

For every view classified as converged:

- desktop rendering;
- smartphone rendering;
- normal state;
- empty state when the view can be empty;
- feedback/success state when the view performs mutations;
- focus/keyboard validation for interactive surfaces;
- no improper horizontal overflow.

### 13.2 Additional evidence for critical views

Where applicable:

- loading/pending;
- error;
- destructive confirmation;
- reduced-motion behavior;
- device/safe-area behavior for mobile navigation.

### 13.3 TDD

Behavioral changes follow RED → GREEN → relevant suite → full qualifying suite. Tests are added before implementation for:

- dynamic bottom-navigation layout semantics;
- Settings essential/optional readiness calculations;
- Settings grouping and discoverability contracts;
- any new shared primitive with behavior rather than pure presentation.

## 14. Implementation sequence

The implementation plan must preserve this dependency order:

1. **DOS-VIEW-CONV-01A — Mobile shell**
   - dynamic four-item bottom navigation;
   - secondary navigation grouping;
   - mobile shell tests.

2. **DOS-VIEW-CONV-01B — Settings IA/model**
   - essential vs optional semantics;
   - Installazione in the Settings index;
   - Account/security linked destination;
   - terminology changes;
   - model tests.

3. **DOS-VIEW-CONV-01C — Settings mobile**
   - vertical grouped index;
   - remove mobile horizontal carousel;
   - responsive/accessibility checks.

4. **DOS-VIEW-CONV-01D — Shared primitives**
   - consolidate only repeated patterns proven necessary by A–C;
   - migrate targeted consumers without unrelated refactoring.

5. **DOS-VIEW-CONV-01E — Dense views**
   - Piano annuale;
   - Calendario;
   - Conoscenza;
   - Progetta.

6. **DOS-VIEW-CONV-01F — Secondary views**
   - materials/diary/authoring/account/auth convergence where audit identifies remaining debt.

7. **DOS-VIEW-CONV-01G — View certification**
   - complete route/state/viewport evidence matrix;
   - run qualifying gates;
   - produce final delta report.

## 15. Branching and governance

Implementation must:

- start from current `develop` in an isolated branch/worktree;
- never modify `main` directly;
- avoid automatic merge;
- preserve Human Review as the final integration gate;
- keep DOS-A1 `RUNTIME_DEFERRED`;
- avoid unrelated capability work;
- preserve Arena/Atlas/Docente OS authority boundaries;
- avoid reopening already-closed PWA/share-target application-scope work except where a view-only regression is discovered.

## 16. Definition of done

DOS-VIEW-CONV-01 is complete only when all of the following are true:

- mobile bottom navigation has no empty slot and remains accessible/responsive;
- `Altro` has the defined information architecture;
- Settings distinguishes essential and optional setup correctly;
- Installazione is discoverable from Settings;
- mobile Settings no longer relies on a horizontal category carousel;
- Settings terminology disambiguates setup from operational destinations;
- targeted shared primitives are consolidated without unnecessary abstraction;
- Piano annuale, Calendario, Conoscenza and Progetta pass their convergence acceptance criteria;
- remaining audited views receive the planned secondary convergence pass or a documented no-change decision;
- view-level evidence matrix is complete for all covered routes/states/viewports;
- relevant automated suites and repository gates pass on the exact implementation head;
- no automatic merge has occurred;
- final Human Review remains pending until explicitly approved.

## 17. Non-goals and stop conditions

Stop and require a new design decision if implementation reveals that a requested visual change requires:

- a new authority boundary;
- destructive data migration;
- a new major navigation concept beyond the four-primary-plus-Altro model;
- changes to timetable domain behavior;
- activation of a deferred runtime capability;
- a new subsystem rather than convergence of an existing one.

These conditions are outside DOS-VIEW-CONV-01 and must not be smuggled into the tranche as incidental refactoring.
