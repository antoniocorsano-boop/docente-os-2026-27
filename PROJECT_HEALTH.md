# DOCENTE OS — Project Health

Updated: 2026-08-22

```text
STATE: ACTIVE_DEVELOPMENT_STABLE
CANONICAL_DEV_BRANCH: develop
BASELINE_COMMIT: 2067c130c217730ae6f74a8cf664f85ba207c50c
CANONICAL_DEV_RUNTIME: Netlify deploy preview for develop
CI_GATE: test + typecheck + lint + build
PRODUCT_EXPERIENCE: X0 COMPLETE / X1 COMPLETE / X2 COMPLETE / X3 TECHNICALLY COMPLETE
PRIMARY_FOCUS: X3 REFINED INTERACTIVE ACCEPTANCE
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
- Knowledge list/detail, Oggi, Piano annuale and Orario on shared AppShell.
- grouped navigation by teacher mental model: `Il mio lavoro / Didattica / Tempo / Risorse / Sistema`.
- assistant-ui contextual assistant X3 on Knowledge detail, READ_ONLY / PROPOSE only.
- lighter floating assistant trigger and reduced expanded footprint.
- canonical Work/Time mental model separating Activities, Annual Plan, Timetable and Calendar.
- Timetable and Calendar frozen as independent domains; Temporal Projection is the only composition boundary.
- GitHub Actions product gates passing on merged slices.
- Netlify Next.js deploy preview verified as the operational development runtime.

## Deployment status

### Netlify

Status: `DEV_RUNTIME_VERIFIED`.

- project: `docente-os-dev`;
- develop preview is the current interactive reference;
- baseline `2067c130…` deployed `READY`;
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
4. nessun provider LLM reale è ancora collegato: X3 resta deterministico/provider-neutral per validare UX e confini;
5. T3A/T3B/T3C e T4 restano da implementare;
6. production URL and final auth recovery UX remain to be frozen;
7. legacy static files remain in root and must stay clearly marked as non-canonical.

## Active program

### X0 — Product Experience canonical freeze

Status: `COMPLETE`.

### X1 — Component Foundation

Status: `COMPLETE`.

### X2 — Professional AppShell

Status: `COMPLETE`.

### X3 — Contextual Assistant

Status: `COMPLETE_TECHNICAL / REFINED_ACCEPTANCE_PENDING`.

Technical evidence:

- `@assistant-ui/react` LocalRuntime;
- authenticated read-only AssistantContext endpoint;
- minimized context builder;
- capability allowlist/denylist;
- deterministic provider-neutral ChatModelAdapter;
- no write tools;
- no chat persistence;
- optional/off state.

Refinement merged in `2067c130…`:

- grouped AppShell navigation;
- Orario migrated to AppShell;
- compact assistant trigger;
- smaller expanded assistant panel;
- shorter safety/context copy;
- Product CI #220 fully green;
- Netlify deploy `READY`.

Interactive acceptance checklist:

1. verify grouped sidebar is clearer than the previous flat list;
2. verify Orario is clearly autonomous from Calendario;
3. open a real Knowledge document;
4. verify “Chiedi a DOCENTE OS” does not compete with the document when closed;
5. open the assistant and verify the smaller panel remains usable;
6. test desktop and mobile.

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
