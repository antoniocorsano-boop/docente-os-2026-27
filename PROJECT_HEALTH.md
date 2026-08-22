# DOCENTE OS — Project Health

Updated: 2026-08-22

```text
STATE: ACTIVE_DEVELOPMENT_STABLE
CANONICAL_DEV_BRANCH: develop
BASELINE_COMMIT: cca482bdd761b77c4fa8b42e0f9f0ed097518c68
CANONICAL_DEV_RUNTIME: Netlify deploy preview for develop
CI_GATE: test + typecheck + lint + build
PRODUCT_EXPERIENCE: X0 COMPLETE / X1 COMPLETE / X2 COMPLETE / X3 TECHNICALLY COMPLETE
SETTINGS_EXPERIENCE: GUIDED CONTRACT COMPLETE / PROGRESSIVE DISCLOSURE BASELINE READY / INTERACTIVE ACCEPTANCE PENDING
PRIMARY_FOCUS: SETTINGS + X3 INTERACTIVE ACCEPTANCE
X4_GATE: HOLD_FOR_X3_UX_ACCEPTANCE
TEMPORAL_ARCHITECTURE: TIMETABLE INDEPENDENT / CALENDAR INDEPENDENT / TEMPORAL PROJECTION COMPOSES BOTH
```

## Current product line

The canonical product line is the Next.js application under `product/`.

The static root application is retained as legacy/reference material only. It is no longer the source of truth for architecture, persistence or deployment state.

## Verified capabilities

- Supabase Auth and server session handling.
- Password login for routine access; magic link for activation/recovery.
- PostgreSQL persistence with Row Level Security.
- Oggi/Attività persistent workflow.
- Knowledge ingestion/transformation/provenance/generations.
- Progetta and Classes read models.
- Annual plan execution by class/section.
- Canonical teacher/settings/class registry.
- Timetable T1 persistence/configuration.
- Timetable T2 Week/Day visual grid and slot editing.
- Product Language & Collaboration System v1.
- Product Experience canonical package X0.
- Tailwind v4 + open-code component foundation X1.
- Professional AppShell X2 with command palette and mobile navigation.
- Knowledge list/detail, Oggi, Piano annuale, Orario and Impostazioni on shared AppShell.
- grouped navigation by teacher mental model: `Il mio lavoro / Didattica / Tempo / Risorse / Sistema`.
- assistant-ui contextual assistant X3 on Knowledge detail, READ_ONLY / PROPOSE only.
- lighter floating assistant trigger and reduced expanded footprint.
- canonical Work/Time mental model separating Activities, Annual Plan, Timetable and Calendar.
- Timetable and Calendar frozen as independent domains; Temporal Projection is the only composition boundary.
- **Settings Experience Contract** with guided setup and maintenance mode.
- Settings five-area read model: `Tu e la scuola / Discipline / Classi / Cattedra / Organizzazione scolastica`.
- Cattedra configured from Settings using the same canonical `teaching_assignments` consumed by Orario.
- read-only teaching-assignment reader in Settings that does not create a Timetable draft.
- Settings context governed by **progressive disclosure**: full explanation available on demand, minimal primary surface.
- mobile Settings overview uses compact horizontal navigation instead of stacking five large cards.
- GitHub Actions product gates passing on merged slices.
- Netlify Next.js deploy preview verified as the operational development runtime.

## Deployment status

### Netlify

Status: `DEV_RUNTIME_VERIFIED`.

- project: `docente-os-dev`;
- develop preview is the current interactive reference;
- compact Settings baseline `cca482bd…` deployed `READY`;
- Next.js server handler is deployed;
- Supabase redirect configuration includes the Netlify preview pattern.

### Vercel

Status: `OPTIONAL_PROVIDER / NOT_A_GATE`.

Automated builds remain constrained by account build-rate limits. This does not block product development. DOCENTE OS remains hosting-neutral.

### Production

Status: `NOT_YET_FROZEN`.

A production alias/provider decision will be made only after release gates are satisfied.

## Current risks

1. alcune superfici secondarie non sono ancora migrate alla shell condivisa;
2. parte del CSS rimane locale mentre la migrazione prosegue;
3. X3 raffinato richiede una nuova accettazione visiva desktop/mobile;
4. le Impostazioni guidate e compatte hanno superato tutti i gate tecnici ma richiedono accettazione interattiva con dati reali;
5. nessun provider LLM reale è ancora collegato: X3 resta deterministico/provider-neutral per validare UX e confini;
6. T3A/T3B/T3C e T4 restano da implementare;
7. production URL and final auth recovery UX remain to be frozen;
8. legacy static files remain in root and must stay clearly marked as non-canonical.

## Settings program

### Guided Settings contract

Status: `COMPLETE / REFINED_INTERACTIVE_ACCEPTANCE_PENDING`.

Canonical sources:

- `docs/architecture/SETTINGS_CANONICAL_SPEC.md` — persistence and invariants;
- `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md` — guided experience, states, explanations and feedback;
- `docs/product/SETTINGS_CONTEXT_DISCLOSURE_NOTE.md` — **contesto completo, esposizione minima**;
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` — tone and microcopy.

Runtime baseline:

- `/impostazioni` uses AppShell;
- summary of five areas and `N/5` readiness;
- deterministic `Completo / Da completare / Da controllare` read model;
- Cattedra lives in professional-context configuration without duplicating data;
- same `teaching_assignments` remain authoritative for Settings and Orario;
- no automatic Timetable slot creation;
- no Calendar/Piano annuale/Planner side effects;
- read-only assignment reader avoids creating a Timetable draft just to render Settings.

UX refinement merged in `cca482bd…`:

- `Serve a / Usato in / Non modifica` preserved behind native `Come viene usata` disclosure;
- disclosure closed by default and keyboard accessible;
- redundant concept callouts removed from the primary reading flow;
- only action-critical microcopy remains visible near fields, e.g. `Non crea lezioni nell'Orario` for Cattedra;
- top next-step strip reduced to one actionable message;
- mobile five-area summary changed to horizontal scrolling to reduce vertical density;
- Product CI #229: test/typecheck/lint/build all PASS;
- Netlify deploy `READY` on `cca482bd…`.

Interactive acceptance checklist:

1. open `/impostazioni` on the real mobile workspace;
2. verify Cattedra shows fields immediately without the previous three-row context panel;
3. verify `Come viene usata` opens the full context only when requested;
4. verify `Non crea lezioni nell'Orario` remains visible near the Cattedra action;
5. verify the five-area overview can be scanned horizontally on mobile;
6. verify states and next step remain understandable without opening any explanation;
7. add/update one Cattedra association and confirm it is immediately visible in Orario without creating a lesson.

## Active program

### X0 — Product Experience canonical freeze

Status: `COMPLETE`.

### X1 — Component Foundation

Status: `COMPLETE`.

### X2 — Professional AppShell

Status: `COMPLETE`.

### X3 — Contextual Assistant

Status: `COMPLETE_TECHNICAL / REFINED_ACCEPTANCE_PENDING`.

- `@assistant-ui/react` LocalRuntime;
- authenticated read-only AssistantContext endpoint;
- minimized context builder;
- capability allowlist/denylist;
- deterministic provider-neutral ChatModelAdapter;
- no write tools;
- no chat persistence;
- optional/off state;
- compact assistant trigger and smaller expanded panel.

### X4 — Human-in-the-loop writes

Status: `HOLD_FOR_X3_UX_ACCEPTANCE`.

No write capability is authorized until the refined X3 experience is accepted.

## Temporal program

### T3A — Timetable lifecycle

Status: `NEXT_AFTER_UX_ACCEPTANCE`.

- activate/archive timetable versions;
- effective date lifecycle;
- independent of Calendar;
- no Calendar imports in Timetable domain/repository.

### T3B — Calendar core

Status: `PLANNED`.

- school days and suspensions;
- real events and date constraints;
- independent of Timetable.

### T3C — Temporal Projection

Status: `PLANNED`.

- application read model combining Timetable + Calendar through read ports;
- projected real occurrences;
- first use in Oggi;
- neither source domain is mutated.

### T4 — Didactic allocation

Status: `PENDING`.

- map teaching sessions / projected occurrences to CAN-PLAN B01–B33;
- actual minutes/evidence drive execution;
- no rewrite of the canonical annual plan.

## Development rule

Continue through small isolated slices; do not introduce a second competing architecture and do not rewrite working modules in bulk.

Every meaningful slice must:

- preserve domain boundaries;
- preserve RLS;
- avoid fabricated school data;
- pass test/typecheck/lint/build;
- deploy successfully to the reference preview when runtime is changed;
- update canonical docs if it changes a product or architecture decision.
