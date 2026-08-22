# DOCENTE OS — Project Health

Updated: 2026-08-22

```text
STATE: ACTIVE_DEVELOPMENT_STABLE
CANONICAL_DEV_BRANCH: develop
BASELINE_COMMIT: 3685066ed91695357b10a20e821199464e06f593
CANONICAL_DEV_RUNTIME: Netlify deploy preview for develop
CI_GATE: test + typecheck + lint + build
PRODUCT_EXPERIENCE: X0 COMPLETE / X1 COMPLETE / X2 COMPLETE / X3 TECHNICALLY COMPLETE
PRIMARY_FOCUS: X3 INTERACTIVE ACCEPTANCE
NEXT_ACTION: verify the contextual assistant on a real Knowledge document on desktop/mobile
X4_GATE: HOLD_FOR_X3_INTERACTIVE_ACCEPTANCE
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
- Product Language & Collaboration System v1.
- Product Experience canonical package X0.
- Tailwind v4 + open-code component foundation X1.
- Professional AppShell X2 with shared navigation, command palette and mobile navigation.
- Knowledge list/detail on shared AppShell.
- assistant-ui contextual assistant X3 on Knowledge detail, READ_ONLY / PROPOSE only.
- GitHub Actions product gates passing on merged slices.
- Netlify Next.js deploy preview verified as the operational development runtime.

## Deployment status

### Netlify

Status: `DEV_RUNTIME_VERIFIED`.

- project: `docente-os-dev`;
- develop preview is the current interactive reference;
- X3 merge `3685066…` deployed `READY`;
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
3. X3 ha superato i gate tecnici ma richiede ancora accettazione interattiva;
4. nessun provider LLM reale è ancora collegato: il runtime X3 è deterministico/provider-neutral per validare UX e confini;
5. Timetable T3/T4 remain pending;
6. production URL and final auth recovery UX remain to be frozen;
7. legacy static files remain in root and must stay clearly marked as non-canonical.

## Active program

### X0 — Product Experience canonical freeze

Status: `COMPLETE`.

### X1 — Component Foundation

Status: `COMPLETE`.

Evidence:

- Tailwind v4/PostCSS without preflight;
- semantic theme layer;
- canonical open-code UI primitives;
- Login pilot;
- Product CI #200 green;
- Netlify READY on `aeb66cd8…`.

### X2 — Professional AppShell

Status: `COMPLETE`.

Evidence:

- shared AppShell;
- canonical navigation registry;
- responsive sidebar and mobile navigation;
- `Ctrl/Cmd+K` command palette;
- Knowledge list/detail rollout;
- Product CI #208 green;
- Netlify READY on `1813a17…`.

### X3 — Contextual Assistant

Status: `COMPLETE_TECHNICAL / INTERACTIVE_ACCEPTANCE_PENDING`.

Evidence:

- `@assistant-ui/react` LocalRuntime;
- authenticated read-only AssistantContext endpoint;
- minimized context builder;
- capability allowlist/denylist;
- deterministic provider-neutral ChatModelAdapter;
- no write tools;
- no chat persistence;
- optional/off state;
- 27/27 tests PASS;
- typecheck PASS;
- lint PASS;
- build PASS;
- Product CI #213 green;
- Netlify READY on merge `3685066…`.

Interactive acceptance checklist:

1. open a real Knowledge document;
2. verify “Ti aiuto da qui” appears without obscuring the document;
3. ask “Cosa contiene questo documento?”;
4. ask “Crea una attività nel Planner” and confirm the assistant refuses/degrades to a manual proposal;
5. verify desktop and mobile usability.

### X4 — Human-in-the-loop writes

Status: `HOLD_FOR_X3_INTERACTIVE_ACCEPTANCE`.

No write capability is authorized before the acceptance checklist above passes.

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
