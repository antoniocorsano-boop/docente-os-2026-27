# DOCENTE OS — Project Health

Updated: 2026-08-22

```text
STATE: ACTIVE_DEVELOPMENT_STABLE
CANONICAL_DEV_BRANCH: develop
BASELINE_COMMIT: 1813a17ff6414439f8a5195a8de1d48b72925111
CANONICAL_DEV_RUNTIME: Netlify deploy preview for develop
CI_GATE: test + typecheck + lint + build
PRODUCT_EXPERIENCE: X0 COMPLETE / X1 COMPLETE / X2 COMPLETE
PRIMARY_FOCUS: X3 Contextual Assistant — READ_ONLY / PROPOSE
NEXT_ACTION: mount optional assistant experience on Knowledge using authentic AssistantContext and a mock/local runtime first
DONE_WHEN_X3: contextual assistant renders real context and proposals, performs no writes, remains optional, passes CI and Netlify gates
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
- Professional AppShell X2 with shared navigation, command palette and mobile navigation.
- Knowledge list/detail migrated to the shared AppShell.
- GitHub Actions product gate passing on merged slices.
- Netlify Next.js deploy preview on `develop` verified as the operational development runtime.

## Deployment status

### Netlify

Status: `DEV_RUNTIME_VERIFIED`.

- project: `docente-os-dev`;
- `develop` deploy preview is the current reference for interactive acceptance;
- merge X2 `1813a17…` deployed `READY`;
- Next.js server handler is deployed;
- Supabase redirect configuration includes the Netlify preview pattern.

### Vercel

Status: `OPTIONAL_PROVIDER / NOT_A_GATE`.

Current automated builds are constrained by account build-rate limits. This does not block product development. DOCENTE OS remains hosting-neutral.

### Production

Status: `NOT_YET_FROZEN`.

A production alias/provider decision will be made only after release gates are satisfied. A successful development preview is not automatically a production release.

## Current risks

1. alcune superfici non sono ancora migrate alla shell condivisa;
2. parte del CSS rimane locale mentre la migrazione prosegue;
3. AI collaboration è specificata ma non ancora collegata a un runtime assistente reale;
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

Status: `COMPLETE`.

Evidence:

- shared AppShell;
- canonical navigation registry;
- responsive sidebar;
- bottom navigation + complete mobile menu;
- `Ctrl/Cmd+K` command palette;
- Radix dialog / cmdk / Lucide integration;
- Knowledge list and document detail migrated;
- Product CI #208 all green;
- Netlify deploy READY on merge `1813a17…`;
- no DB/RLS/data changes.

### X3 — Contextual Assistant

Status: `NEXT`.

Baseline:

- mount assistant experience on a real Knowledge surface;
- derive `AssistantContext` from real workspace/document data;
- support `READ_ONLY` and `PROPOSE` only;
- start with mock/local provider-neutral runtime;
- assistant must be optional and non-blocking;
- no write capability in X3.

### X4 — Human-in-the-loop writes

Status: `PLANNED`.

- preview + explicit confirmation;
- first reversible Planner write through application layer;
- proposal provenance preserved.

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
