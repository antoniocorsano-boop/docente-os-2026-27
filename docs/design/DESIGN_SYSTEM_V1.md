# DOCENTE OS — Design System V1

Status: APPROVED_FOR_P2_IMPLEMENTATION
Date: 2026-08-21

## 1. Product design thesis

DOCENTE OS is not a generic task manager. It is a professional operating environment for a teacher, where actions originate from communications, deadlines, calendar commitments, teaching work and documents.

The interface must optimize for five outcomes:

1. know what requires attention now;
2. understand why a task exists and where it came from;
3. avoid overload and unrealistic daily plans;
4. preserve context across Planner, Calendar, Communications, Documents and Teaching;
5. make every consequential action explicit, reversible where possible, and human-verifiable.

Design character: **operational calm** — high information quality without visual noise.

## 2. Benchmark validation

### Todoist — adopt
- Built-in Today / Upcoming mental model.
- Priority as a fast scanning cue.
- Fast task capture and filtering.

### Todoist — do not copy
- Project-centric taxonomy as the primary organizing principle.
- Priority encoded only by color.

### Linear — adopt
- Triage as a separate decision boundary for externally-created work.
- Dense, fast rows and keyboard efficiency on desktop.
- Clear workflow states.

### Linear — do not copy
- Engineering-specific language and excessive issue-tracker density for a teacher workflow.

### Sunsama — adopt
- Realistic daily workload as a first-class design concern.
- Optional timeboxing between tasks and calendar.
- Deferral as a normal planning action, not a failure state.

### Sunsama — do not copy
- Mandatory guided rituals before work can begin.
- Forced calendar placement for every task.

### Apple HIG / mature platform guidance — adopt
- Familiar patterns before custom gestures.
- Preserve context across responsive layouts.
- Strong hierarchy and alignment.
- Mobile controls target approximately 44x44 CSS px or larger.
- Never rely on color alone to communicate meaning.

## 3. Information architecture

Primary destinations:

- **Oggi** — executable view of the current day.
- **Planner** — all actionable work grouped by urgency/time horizon.
- **Inbox** — triage of work derived from communications and integrations.
- **Calendario** — fixed commitments and optional timeboxed work.
- **Documenti** — files and generated artifacts.
- **Didattica** — classes, UDA, lessons, assessments.
- **Archivio** — closed/completed yearly material.

P2 implements Oggi + Planner. Other destinations remain visible only when their navigation target is meaningful; avoid dead controls.

## 4. Responsive application shell

### Desktop >= 1024 px
Three zones:

1. left navigation rail: 232–256 px;
2. main work surface: fluid, max readable width around 1040 px;
3. optional contextual inspector: 320–380 px, opened only when a task is selected.

The main work surface owns scrolling. Navigation remains stable.

### Tablet 720–1023 px
- Collapsible navigation rail.
- Main surface full width.
- Inspector becomes an overlay/sheet.

### Mobile < 720 px
- No persistent side rail.
- Compact top context header.
- Bottom navigation for the highest-frequency destinations.
- Task inspector opens as a full-height sheet.
- Primary actions remain reachable with one thumb and use >= 44 px targets.

## 5. Planner north-star layout

Top to bottom:

1. **Context header** — workspace + academic year, no technical security wording.
2. **Day headline** — human date and one concise operational summary.
3. **Workload strip** — number of open tasks, overdue count, today count; later planned minutes vs available time.
4. **Quick capture** — one-line task input, advanced fields disclosed progressively.
5. **Task sections**:
   - DA FARE ORA
   - OGGI
   - QUESTA SETTIMANA
   - IN ATTESA
   - SENZA DATA

Empty sections collapse to a compact empty state rather than occupying a large blank panel.

## 6. Task row anatomy

Each row may show, in scan order:

- completion control;
- title;
- source chip (e.g. Circolare, Calendario, Didattica, Manuale);
- date/deadline chip;
- explicit priority label/icon when HIGH or URGENT;
- waiting indicator when applicable;
- overflow actions.

Secondary notes are hidden from the list unless needed; they appear in the inspector.

A task derived from an external source must preserve a visible provenance affordance.

## 7. State semantics

Canonical statuses:

- OPEN — actionable;
- WAITING — blocked or awaiting another party/event;
- DONE — completed;
- CANCELLED — intentionally closed without completion.

Never overload status with time. `planned_for` and `due_at` remain separate.

No destructive delete in P2. Cancel is the reversible/auditable terminal path.

## 8. Sorting and section rules

Default ranking inside actionable sections:

1. overdue;
2. URGENT;
3. due today;
4. HIGH;
5. earliest due date;
6. creation time as stable fallback.

Section membership:

- DA FARE ORA: overdue OPEN tasks, then urgent OPEN tasks due <= today.
- OGGI: OPEN tasks planned today or due today not already in DA FARE ORA.
- QUESTA SETTIMANA: OPEN tasks due/planned in next 7 days excluding today.
- IN ATTESA: WAITING tasks.
- SENZA DATA: OPEN tasks without due/planned date.

A task appears in one primary section only.

## 9. Visual system

### Palette roles
- canvas: cool near-white;
- surface: white;
- ink: deep navy/slate;
- secondary ink: neutral gray;
- brand/action: saturated blue;
- overdue/destructive: red family;
- warning/urgent: amber family;
- success/completed: green family;
- borders: low-contrast cool gray.

Color is always paired with text, icon, position or shape.

### Typography
Use system UI stack initially for speed, accessibility and cross-platform consistency.

- Display: 32–40 px desktop, 28–32 px mobile, weight 700–750.
- Section heading: 12–13 px uppercase/letterspaced or 15–16 px semibold; use sparingly.
- Task title: 15–16 px, weight 550–650.
- Metadata: 12–13 px.

### Spacing
4 px base grid. Preferred increments: 4 / 8 / 12 / 16 / 24 / 32 / 48.

### Radius
- controls: 10–12 px;
- cards/panels: 16 px;
- large shell panels: 20–24 px;
- chips: pill.

### Elevation
Prefer borders + subtle tonal separation. Shadows only for floating inspector/sheet/modal.

## 10. Interaction principles

- Quick capture requires only a title.
- Advanced metadata uses progressive disclosure.
- Completing a task is immediate but offers short undo feedback in later slice.
- Drag-and-drop is an accelerator, never the only way to reschedule.
- Keyboard shortcuts supplement visible controls on desktop.
- No hidden swipe-only actions on mobile.

## 11. Accessibility gate

Before P2 UI is considered complete:

- semantic headings and landmarks;
- visible keyboard focus;
- minimum mobile touch target approximately 44x44 px;
- WCAG AA contrast target for normal text;
- status/priority never represented by color alone;
- controls have accessible names;
- reduced-motion preference respected;
- layout remains usable at 200% zoom;
- no horizontal scrolling at 320 CSS px width for the primary Planner flow.

## 12. Product-specific differentiation

DOCENTE OS differentiates from generic planners through:

- provenance-first task rows;
- institutional deadline awareness;
- explicit distinction Planner vs Calendar;
- later communication triage feeding Planner;
- direct links between task, source document, generated artifact and school-year archive;
- teacher-centric vocabulary and annual-workflow context.

## 13. P2 design acceptance criteria

P2 Planner UI passes when:

1. a user can identify the most urgent action in <= 3 seconds from the default view;
2. a new task can be captured in one primary action;
3. overdue, today, week, waiting and undated work are distinguishable without opening filters;
4. provenance is visible for source-derived tasks;
5. mobile layout works at 320–430 px without horizontal overflow;
6. the same task does not appear in multiple primary sections;
7. task actions remain available without gesture-only interaction;
8. visual hierarchy remains clear with color removed/desaturated;
9. the authenticated workspace/year context is visible but not dominant;
10. the design can extend to Inbox, Calendar and Teaching without changing the application shell.

## 14. Implementation order

1. AppShell + design tokens.
2. Planner read-only live view.
3. Quick capture.
4. Complete / wait / reschedule actions.
5. Task inspector.
6. Mobile bottom navigation.
7. Workload/time estimate enrichment.

Do not add visual complexity before the interaction model is validated.