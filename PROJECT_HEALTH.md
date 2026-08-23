# DOCENTE OS — Project Health

Updated: 2026-08-23

```text
STATE: ACTIVE_DEVELOPMENT_STABLE
CANONICAL_DEV_BRANCH: develop
BASELINE_COMMIT: cba24b1257d7f276d6621da0f6dbb55b18d361b2
CANONICAL_BETA_RUNTIME: Render Free / docente-os-2026-27-beta
CI_GATE: test + typecheck + lint + build
PRODUCT_EXPERIENCE: X0 COMPLETE / X1 COMPLETE / X2 COMPLETE / X3 TECHNICALLY COMPLETE
SETTINGS_EXPERIENCE: GUIDED CONTRACT COMPLETE / INTERACTIVE ACCEPTANCE PARTIAL
X4_GATE: HOLD_FOR_X3_UX_ACCEPTANCE
TEMPORAL_PROGRAM: T3A COMPLETE / T3B COMPLETE / T3C COMPLETE / T4 COMPLETE
T4_DATABASE: MIGRATION APPLIED / RLS AUDITED / HUMAN COMPLETION REQUIRED
```

## Current product line

The canonical product line is the Next.js application under `product/` on branch `develop`.

The static root application is legacy/reference material only. It is not the source of truth for architecture, persistence or deployment.

## Verified capabilities

- Supabase Auth and server session handling.
- PostgreSQL persistence with Row Level Security.
- Oggi/Attività persistent workflow.
- Knowledge ingestion, transformation, provenance and generations.
- Progetta and Classes human-task read models.
- Annual-plan execution by class/section.
- Canonical teacher/settings/class registry.
- Timetable persistence, visual week/day grid and lifecycle.
- Independent Calendar core for real school dates, suspensions and events.
- Read-only Temporal Projection composing Timetable + Calendar without mutating either source domain.
- TeachingSession persistence for actual teaching evidence and canonical B01–B33 minute allocations.
- Explicit anti-double-counting rules: allocated minutes cannot exceed actual session minutes.
- Quantitative completion can generate a proposal but never auto-promotes a block to `SVOLTO`.
- Product Language & Collaboration System v1.
- Product Experience canonical package X0.
- Tailwind v4 + open-code component foundation X1.
- Professional AppShell X2 with command palette and mobile navigation.
- Contextual Assistant X3 in READ_ONLY / PROPOSE mode.
- GitHub Actions product gates passing on promoted slices.

## Deployment status

### Render beta

Status: `BETA_RUNTIME_WORKING / LATEST_T4_RUNTIME_CONFIRMATION_PENDING`.

- service: `docente-os-2026-27-beta`;
- plan: Free;
- region: Frankfurt;
- source branch: `develop`;
- root: `product`;
- deployment trigger: commit;
- user verified successful navigation through Orario and class workspace on 2026-08-23;
- baseline Render deployment was verified Live before T4;
- current T4 merge is expected to auto-deploy, but the exact Render release SHA must still be confirmed externally before marking the latest runtime `VERIFIED`.

### Netlify

Status: `LEGACY_BETA / NOT_CANONICAL`.

Netlify is no longer the development reference runtime. Old `netlify.app` links may still exist but must not be treated as canonical.

### Vercel

Status: `OUT / NOT_A_GATE`.

Vercel free build-rate limits make it unsuitable for the current beta workflow. Vercel checks must not block Render deployment.

### Production

Status: `NOT_YET_FROZEN`.

A production alias/provider decision will be made only after release gates are satisfied.

## Supabase state

### Calendar

`calendar_core` migration is applied.

### T4 TeachingSession

`teaching_sessions` migration is applied to project `gnshgapmwyjamhmlikeg`.

Audited properties:

- RLS enabled on `teaching_sessions` and `teaching_session_allocations`;
- `authenticated` receives `SELECT` only on both tables;
- direct table writes are not granted to `authenticated` or `anon`;
- atomic write boundary: `public.record_teaching_session(...)`;
- RPC is `SECURITY DEFINER` with `search_path=''`;
- `EXECUTE` is granted to `authenticated`, not to `anon`/`public`;
- workspace/year/section and canonical-generation constraints are enforced in PostgreSQL;
- no T4 write marks `annual_plan_block_progress` as `SVOLTO` automatically.

Canonical human approval receipt:

`T4-HUMAN-APPROVAL:2026-08-23T19:44+02:00`

## Settings program

Status: `COMPLETE_TECHNICAL / INTERACTIVE_ACCEPTANCE_PARTIAL`.

Canonical sources:

- `docs/architecture/SETTINGS_CANONICAL_SPEC.md`;
- `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md`;
- `docs/product/SETTINGS_CONTEXT_DISCLOSURE_NOTE.md`;
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md`.

The canonical Cattedra registry is shared with Orario and does not create timetable slots implicitly.

## Active experience program

### X0 — Product Experience canonical freeze

Status: `COMPLETE`.

### X1 — Component Foundation

Status: `COMPLETE`.

### X2 — Professional AppShell

Status: `COMPLETE`.

### X3 — Contextual Assistant

Status: `COMPLETE_TECHNICAL / REFINED_ACCEPTANCE_PENDING`.

Current constraints:

- authenticated read-only AssistantContext;
- deterministic/provider-neutral adapter;
- capability allowlist/denylist;
- no write tools;
- no chat persistence;
- optional/off state;
- compact assistant surface.

### X4 — Human-in-the-loop AI writes

Status: `HOLD_FOR_X3_UX_ACCEPTANCE`.

No AI write capability is authorized until the refined X3 interaction has been accepted in the real beta experience. Technical contracts and guardrails may be prepared, but persistent AI actions must remain disabled.

## Temporal program

### T3A — Timetable lifecycle

Status: `COMPLETE`.

Version activation/archive and effective intervals are implemented without Calendar dependencies.

### T3B — Calendar core

Status: `COMPLETE`.

Calendar remains an independent domain with explicit source-bound dates and events. Absence of a date classification remains `UNDETERMINED`.

### T3C — Temporal Projection

Status: `COMPLETE`.

Timetable + Calendar composition is read-only and first integrated into Oggi. Suspensions suppress only the projected occurrence for the date and never rewrite recurring timetable slots.

### T4 — Didactic allocation

Status: `COMPLETE / DATABASE_APPLIED`.

- projected occurrences are candidates, not execution evidence;
- teacher explicitly records actual TeachingSessions;
- actual minutes may be allocated to one or more canonical B01–B33 blocks;
- the allocation total cannot exceed actual session minutes;
- current successful plan generation is required;
- historical evidence preserves provenance;
- minute thresholds may suggest completion but never auto-mark `SVOLTO`.

The temporal roadmap currently ends at T4. A `T5` label must not be invented until a new canonical problem and dependency boundary are explicitly defined.

## Current risks and next gates

1. Confirm the latest T4 merge is actually Live on the Render beta runtime.
2. X3 refined assistant still needs real interactive acceptance before X4 persistent AI writes.
3. Settings guided experience still needs final interactive acceptance with real data.
4. Magic-link/auth recovery URL policy should be frozen on the canonical Render beta domain.
5. Some secondary surfaces and local CSS still need convergence toward the shared design system.
6. Legacy static files and old Netlify links must remain clearly non-canonical.
7. No real LLM provider is connected; X3 remains provider-neutral by design.

## Development rule

Continue through small isolated slices. Do not introduce a second competing architecture or rewrite working modules in bulk.

Every meaningful slice must:

- preserve domain boundaries;
- preserve RLS;
- avoid fabricated school data;
- distinguish system inference from professional evidence;
- pass test/typecheck/lint/build;
- deploy successfully to the canonical beta runtime when runtime code changes;
- update canonical docs when a product or architecture decision changes.
