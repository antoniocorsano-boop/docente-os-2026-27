# DOCENTE OS — Project Health

Updated: 2026-08-22

```text
STATE: ACTIVE_DEVELOPMENT_STABLE
CANONICAL_DEV_BRANCH: develop
BASELINE_COMMIT: 0ad96c95b7a5b66bba627f3a304cb936c5e89026
CANONICAL_DEV_RUNTIME: Netlify deploy preview for develop
CI_GATE: test + typecheck + lint + build
PRODUCT_EXPERIENCE: X0 COMPLETE / X1 COMPLETE / X2 COMPLETE / X3 TECHNICALLY COMPLETE
PRIMARY_FOCUS: UX CONSOLIDATION — clear mental model, lighter shell/assistant
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
- Professional AppShell X2 with shared navigation, command palette and mobile navigation.
- Knowledge list/detail, Oggi and Piano annuale on shared AppShell.
- assistant-ui contextual assistant X3 on Knowledge detail, READ_ONLY / PROPOSE only.
- canonical Work/Time mental model separating Activities, Annual Plan, Timetable and Calendar.
- Timetable and Calendar frozen as independent domains; Temporal Projection is the composition boundary.
- GitHub Actions product gates passing on merged slices.
- Netlify Next.js deploy preview verified as the operational development runtime.

## Deployment status

### Netlify

Status: `DEV_RUNTIME_VERIFIED`.

- project: `docente-os-dev`;
- develop preview is the current interactive reference;
- latest accepted baseline `0ad96c95…` deployed `READY`;
- Next.js server handler is deployed;
- Supabase redirect configuration includes the Netlify preview pattern.

### Vercel

Status: `OPTIONAL_PROVIDER / NOT_A_GATE`.

Automated builds remain constrained by account build-rate limits. This does not block product development. DOCENTE OS remains hosting-neutral.

### Production

Status: `NOT_YET_FROZEN`.

A production alias/provider decision will be made only after release gates are satisfied.

## Current risks

1. alcune superfici non sono ancora migrate alla shell condivisa;
2. parte del CSS rimane locale mentre la migrazione prosegue;
3. X3 ha superato i gate tecnici ma l'accettazione visiva ha mostrato eccessiva competizione con il documento;
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

Status: `COMPLETE_TECHNICAL / UX_REFINEMENT_ACTIVE`.

Technical evidence:

- `@assistant-ui/react` LocalRuntime;
- authenticated read-only AssistantContext endpoint;
- minimized context builder;
- capability allowlist/denylist;
- deterministic provider-neutral ChatModelAdapter;
- no write tools;
- no chat persistence;
- optional/off state;
- CI and Netlify gates green on the technical baseline.

UX feedback already accepted:

- the direction is useful and collaborative;
- the floating trigger is valid;
- the expanded assistant is still too visually competitive with the document;
- navigation hierarchy must make product objects easier to distinguish.

Current refinement:

- grouped navigation by `Il mio lavoro / Didattica / Tempo / Risorse / Sistema`;
- lighter contextual-assistant trigger;
- smaller expanded assistant footprint;
- shorter safety copy;
- preserve full manual usability beneath the assistant.

### X4 — Human-in-the-loop writes

Status: `HOLD_FOR_X3_UX_ACCEPTANCE`.

No write capability is authorized until the refined X3 experience is accepted.

## Temporal program

### T3A — Timetable lifecycle

Status: `NEXT_AFTER_UX_CONSOLIDATION`.

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

- application read model combining Timetable + Calendar;
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
