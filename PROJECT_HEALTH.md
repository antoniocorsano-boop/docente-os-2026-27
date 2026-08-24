# DOCENTE OS — Project Health

Updated: 2026-08-24

```text
STATE: ACTIVE_DEVELOPMENT_STABLE
CANONICAL_DEV_BRANCH: develop
BASELINE_COMMIT: 98bbd6f48285df3e25477587e8f6f5804a08ab7d
CANONICAL_BETA_RUNTIME: Render Free / docente-os-2026-27-beta
CI_GATE: test + typecheck + lint + build
RUNTIME_GATE: exact commit + authenticated Playwright
PRODUCT_EXPERIENCE: X0 COMPLETE / X1 COMPLETE / X2 COMPLETE / X3 KNOWLEDGE ACCEPTED / PLANNER EXTENSION IN ACCEPTANCE
ASSISTANT_CONTRACT: ANSWER_FIRST / GROUNDED / READ_ONLY + PROPOSE
SETTINGS_EXPERIENCE: GUIDED CONTRACT COMPLETE / INTERACTIVE ACCEPTANCE PARTIAL
X4_GATE: HOLD / NOT_AUTHORIZED
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
- Contextual Assistant X3 with authenticated minimized context, explicit allowlist/denylist and no write tools.
- Answer First response contract with `SUPPORTED / PARTIAL / NOT_FOUND`, explicit grounding and anti-evasion tests.
- Authenticated mobile E2E gates for local application and canonical Render beta.
- Exact-commit runtime verification through `/api/build-info` before browser acceptance.

## Assistant program

### Canonical Answer First rule

An operational restriction may prevent execution, but it must not be used as a substitute for an answer.

The assistant must, in this order:

1. answer from available, relevant evidence;
2. distinguish supported facts, partial support and information not found;
3. provide a useful proposal when appropriate;
4. state the operational boundary only after the useful content;
5. never invent missing school/professional data;
6. never claim a mutation that did not occur.

Navigation instructions such as “open this page” or “check manually” are not sufficient when the requested information is already present in the assistant context.

### X3 — Contextual Assistant

Status: `KNOWLEDGE REAL-BETA ACCEPTED / PLANNER EXTENSION MERGED_AND_IN_GATE`.

Knowledge baseline verified on commit:

`efd5432fc5e537a4b2b0345c59a78f286b72a948`

Both checks are green on that exact commit:

- `x3-e2e/application`;
- `x3-e2e/render-beta`.

The authenticated mobile scenario verifies:

- document context;
- substantive summary;
- useful next step;
- free-form question not limited to suggested prompts;
- Answer First behavior;
- write-like request downgraded to preview;
- no automatic Planner mutation.

Planner X3 was integrated in `develop` by PR #120 at baseline `98bbd6f48285df3e25477587e8f6f5804a08ab7d`.

Planner X3 is limited to `READ_ONLY / PROPOSE` and can:

- summarize real Planner tasks;
- explain priorities and due dates;
- propose a sequence for today;
- explain waiting tasks;
- answer free questions about named tasks;
- provide an informative preview for write-like requests without execution.

Explicitly forbidden in X3:

- task creation;
- task completion;
- task reopening;
- task movement/rescheduling;
- task deletion;
- Calendar writes;
- Drive writes;
- Gmail sends.

The Planner browser gate additionally compares the task count visible in the page with the assistant context and verifies after a write-like request that the Planner count is unchanged.

A review defect was fixed before merge: an informational question such as “Cosa devo completare oggi?” must not be classified as a write command merely because it contains the verb “completare”. Write intent now requires an imperative or an explicit request for modification.

### X4 — Human-in-the-loop AI writes

Status: `HOLD / NOT_AUTHORIZED`.

Closure of X3 acceptance does **not** authorize persistent AI writes. Any first X4 slice requires a separate gate and must include at minimum:

- explicit preview;
- action-specific confirmation bound to the preview;
- server-side capability validation;
- domain/RLS enforcement;
- provenance/audit receipt;
- reversible action/undo where the domain permits it.

No external write or institutional decision is implicitly authorized by X3.

## Deployment status

### Render beta

Status: `CANONICAL / EXACT_COMMIT_VERIFIED` for X3 Knowledge baseline; current Planner baseline under the same gate.

- service: `docente-os-2026-27-beta`;
- plan: Free;
- region: Frankfurt;
- source branch: `develop`;
- root: `product`;
- deployment trigger: `commit`;
- canonical URL: `https://docente-os-2026-27-beta.onrender.com`.

The first exact-commit check on `efd5432...` timed out after 12 minutes while `/api/build-info` still returned 404. Re-running the same job without changing code then observed the exact SHA and the full Render browser test passed. This is recorded as Render Free deployment latency, not application failure.

The gate now allows up to 30 minutes for Render to expose the expected SHA. If alignment does not occur, the state is classified as `DEPLOY_STALE` and the browser is not reported as failed or passed. If the SHA matches and Playwright fails, it is an application/runtime failure.

### Netlify

Status: `LEGACY_BETA / NOT_CANONICAL`.

Old `netlify.app` links may still exist but are not the development reference runtime.

### Vercel

Status: `OUT / NOT_A_GATE`.

Vercel free build-rate failures are legacy hosting signals and must not block Render deployment or product promotion when Product CI and the canonical Render gate are valid.

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

1. Complete exact-commit application + Render acceptance for Planner X3 baseline `98bbd6f...`.
2. Keep X4 disabled until a distinct write-capability gate is intentionally opened.
3. Settings guided experience still needs final interactive acceptance with real data.
4. Magic-link/auth recovery URL policy should be frozen on the canonical Render beta domain.
5. Continue horizontal AssistantContext expansion only through isolated read/propose slices with Answer First contract tests.
6. Some secondary surfaces and local CSS still need convergence toward the shared design system.
7. Legacy static files and old Netlify links must remain clearly non-canonical.
8. X3 remains provider-neutral; connecting a real LLM is a separate architecture/security decision and is not required for current deterministic contextual behavior.

## Development rule

Continue through small isolated slices. Do not introduce a second competing architecture or rewrite working modules in bulk.

Every meaningful slice must:

- preserve domain boundaries;
- preserve RLS;
- avoid fabricated school data;
- distinguish system inference from professional evidence;
- obey Answer First without weakening execution boundaries;
- pass test/typecheck/lint/build;
- deploy successfully to the canonical beta runtime when runtime code changes;
- match the exact tested commit before runtime acceptance;
- update canonical docs when a product or architecture decision changes.