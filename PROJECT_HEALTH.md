# DOCENTE OS — Project Health

Updated: 2026-08-22

```text
STATE: ACTIVE_DEVELOPMENT_STABLE
CANONICAL_DEV_BRANCH: develop
BASELINE_COMMIT: aeb66cd8d1752de1ee4f8de33103c0617db330e6
CANONICAL_DEV_RUNTIME: Netlify deploy preview for develop
CI_GATE: test + typecheck + lint + build
PRODUCT_EXPERIENCE: X0 COMPLETE / X1 COMPLETE
PRIMARY_FOCUS: X2 Professional AppShell
NEXT_ACTION: implement shared shell + responsive navigation + command palette
DONE_WHEN_X2: primary navigation is shared, keyboard/mobile usable, CI green, Netlify READY, no auth/RLS/data regression
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
- Product Experience canonical package X0.
- Tailwind v4 + open-code component foundation X1.
- Login migrated as first canonical-component pilot.
- GitHub Actions product gate passing on merged slices.
- Netlify Next.js deploy preview on `develop` verified as the operational development runtime.

## Deployment status

### Netlify

Status: `DEV_RUNTIME_VERIFIED`.

- project: `docente-os-dev`;
- `develop` deploy preview is the current reference for interactive acceptance;
- merge X1 `aeb66cd8…` deployed `READY`;
- Next.js server handler is deployed;
- Supabase redirect configuration includes the Netlify preview pattern.

### Vercel

Status: `OPTIONAL_PROVIDER / NOT_A_GATE`.

Current automated builds are constrained by account build-rate limits. This does not block product development. DOCENTE OS remains hosting-neutral.

### Production

Status: `NOT_YET_FROZEN`.

A production alias/provider decision will be made only after release gates are satisfied. A successful development preview is not automatically a production release.

## Current risks

1. shell/navigation markup is still duplicated across primary pages;
2. UI patterns are partly local CSS while migration proceeds;
3. AI collaboration is specified but not yet connected to a real assistant runtime;
4. Timetable T3/T4 remain pending;
5. production URL and final auth recovery UX remain to be frozen;
6. legacy static files remain in root and must stay clearly marked as non-canonical.

## Active program

### X0 — Product Experience canonical freeze

Status: `COMPLETE`.

### X1 — Component Foundation

Status: `COMPLETE`.

Evidence:

- Tailwind v4/PostCSS integrated without preflight;
- semantic theme layer active;
- `cn()` utility;
- Button, Badge, Card, Alert, Separator, Skeleton;
- shadcn registry configuration;
- Login pilot migrated;
- Product CI #200 all green;
- Netlify deploy READY on merge `aeb66cd8…`.

### X2 — Professional AppShell

Status: `NEXT`.

- shared sidebar/navigation;
- responsive mobile sheet/bottom navigation;
- command palette;
- canonical page headers/status feedback;
- first migration of Conoscenza to the shared shell.

### X3/X4 — Contextual Assistant

Status: `PLANNED`.

- assistant-ui read/propose first;
- write actions only with human-in-the-loop.

### T3/T4 — Timetable evolution

Status: `PENDING`.

- T3 calendar/activation/exceptions;
- T4 B01-B33 allocation/materialization.

## Development rule

Continue through small isolated slices; do not introduce a second competing architecture and do not rewrite working modules in bulk.

Every meaningful slice must:

- preserve domain boundaries;
- preserve RLS;
- avoid fabricated school data;
- pass test/typecheck/lint/build;
- deploy successfully to the reference preview when runtime is changed;
- update canonical docs if it changes a product or architecture decision.
