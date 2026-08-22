# DOCENTE OS — Project Health

Updated: 2026-08-22

```text
STATE: ACTIVE_DEVELOPMENT_STABLE
CANONICAL_DEV_BRANCH: develop
BASELINE_COMMIT: eba03168bcb20892a61508fc8ef37bf7e6a60367
CANONICAL_DEV_RUNTIME: Netlify deploy preview for develop
CI_GATE: test + typecheck + lint + build
PRIMARY_FOCUS: X0/X1 Product Experience Platform
NEXT_ACTION: merge canonical experience package, then implement X1 component foundation
DONE_WHEN_X1: shadcn/Tailwind foundation is integrated progressively with all gates green and no regression to auth/RLS/data
```

## Current product line

The canonical product line is the Next.js application under `product/`.

The static root application is retained as legacy/reference material only. It is no longer the source of truth for architecture, persistence or deployment state.

## Verified capabilities

- Supabase Auth and server session handling.
- Password login for routine access; magic link for activation/recovery.
- PostgreSQL persistence with Row Level Security.
- Planner/Oggi persistent workflow.
- Knowledge ingestion/transformation/provenance/generations.
- Progetta and Classes read models.
- Annual plan execution by class/section.
- Canonical teacher/settings/class registry.
- Timetable T1 persistence/configuration.
- Timetable T2 Week/Day visual grid and slot editing.
- Product Language & Collaboration System v1 rolled out to primary surfaces.
- GitHub Actions product gate passing on merged slices.
- Netlify Next.js deploy preview on `develop` verified as the operational development runtime.

## Deployment status

### Netlify

Status: `DEV_RUNTIME_VERIFIED`.

- project: `docente-os-dev`;
- `develop` deploy preview is the current reference for interactive acceptance;
- Next.js server handler is deployed;
- Supabase redirect configuration includes the Netlify preview pattern.

### Vercel

Status: `OPTIONAL_PROVIDER / NOT_A_GATE`.

Current automated builds are constrained by account build-rate limits. This does not block product development. DOCENTE OS remains hosting-neutral.

### Production

Status: `NOT_YET_FROZEN`.

A production alias/provider decision will be made only after release gates are satisfied. A successful development preview is not automatically a production release.

## Current risks

1. UI patterns are still partly local CSS rather than canonical components.
2. ADR-001's shadcn/Tailwind target is not yet implemented in runtime.
3. AI collaboration is specified but not yet connected to a real assistant runtime.
4. Timetable T3/T4 remain pending.
5. Legacy static files at repository root may mislead agents unless canonical docs are read first.
6. Production URL and final auth recovery UX remain to be frozen.

## Active program

### X0 — Product Experience canonical freeze

Status: `IN_PROGRESS` in documentation PR.

Outputs:

- Product Experience Masterplan;
- ADR-002 Experience Platform;
- AI Collaboration Canonical Spec;
- Design System V2;
- canonical documentation index;
- updated repository/readme/health state.

### X1 — Component Foundation

Status: `NEXT`.

- Tailwind foundation;
- shadcn component base;
- semantic tokens;
- first migrated surface;
- regression gates.

### X2 — Professional AppShell

Status: `PLANNED`.

- responsive sidebar/sheet;
- command palette;
- canonical page headers/status feedback.

### X3/X4 — Contextual Assistant

Status: `PLANNED`.

- assistant-ui read/propose first;
- write actions only with human-in-the-loop.

### T3/T4 — Timetable evolution

Status: `PENDING`.

- T3 calendar/activation/exceptions;
- T4 B01-B33 allocation/materialization.

## Development rule

Do not freeze the project waiting for a perfect platform. Continue through small isolated slices, but do not introduce a second competing architecture.

Every meaningful slice must:

- preserve domain boundaries;
- preserve RLS;
- avoid fabricated school data;
- pass test/typecheck/lint/build;
- deploy successfully to the reference preview when runtime is changed;
- update canonical docs if it changes a product or architecture decision.
