# IUI-03B — Home Fail-Fast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the deterministic IUI core into Home with the smallest safe change set, preserving current Home authority and routing semantics while moving the focused task to registered actions and validated composition.

**Architecture:** Keep Home data loading and authoritative priority selection where they are. Introduce one pure `home-intelligent-ui.ts` adapter that receives the already-selected Home primary view model, maps it to the canonical Human Task Model, and delegates action resolution/validation to the existing IUI registry, policy and composer. Do not start Classe integration until this Home slice is locally green, pushed once, exact-head certified and human-reviewed.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript 5.9.2, Node 22, ESLint 9 + `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`, existing `node:test`/`tsx`, Product CI and Browser Certification.

**Spec:** `docs/superpowers/specs/2026-10-08-intelligent-ui-composition-design.md`

**Supersedes:** Task 5 (`IUI-03B — Home composition adapter`) of `docs/superpowers/plans/2026-10-08-iui-02-03-deterministic-composition.md`. Task 6 must not begin until this plan reaches its Home checkpoint.

## Exact baseline

- Implementation branch: `feat/iui-02-03-deterministic-composition`
- Exact starting head: `5a7eeed28b72401ee5f357e61a0a41ff59c0455e`
- `develop`: `a9006cb632fc5c3c9b1b0e4a9f2587c55c9c5ba2`
- Compare at planning time: branch is 19 commits ahead, 0 behind.
- Exact-head baseline gates already green: Product CI, Browser Certification, Human Interaction Model, ASVS, Dependency Security, Certification Impact, Release Engineering Policy and TRAMA Perceptible Write.

## Root-cause findings from the previous delay

1. Task 4 required focused tests and typecheck, but did **not** require lint before the commit. A plain helper named `useFallback` therefore survived TDD/typecheck and failed only in Product CI under `react-hooks/rules-of-hooks`.
2. The original plan deferred inclusion of new Home/Class test files in the explicit `product/package.json` `npm test` list until Task 7. That permits an intermediate Product CI to pass without running the new slice test.
3. `product/src/app/page.tsx` currently combines infrastructure reads, Home priority selection and rendering. The new adapter must extract only the presentation/composition decision; moving repository reads or temporal authority would create a second source of truth.
4. Home currently creates arbitrary `href` strings and calls `buildLessonWorkspaceHref()` directly. The IUI registry is now supposed to own safe route generation, so Home must produce typed action descriptors instead of prebuilt URLs.
5. The current next-moment fallback can use a raw timetable `sectionId` even when that section is absent from the annual snapshot. Since the Classe page requires the section to exist in that snapshot, the safe IUI behavior is to degrade to Orario rather than emit a potentially dead class route.
6. The current Classe page does not yet reconcile `mode`, `block` and `returnTo`; that remains Task 6. Task 5 may emit sanitized task-aware class URLs, but must not change Class authority or state selection.

## Global Constraints

- Do not modify `develop` or `main` directly. Work from an isolated worktree/check-out pinned to the exact starting head above.
- Do not push RED commits or intermediate GREEN commits. Local commits are allowed; **one remote push only after all Home pre-push gates are green**.
- No plain helper/function may start with `use` unless it is a genuine React Hook. Targeted ESLint is mandatory before every local commit.
- New tests must be added to `product/package.json` in the same Home slice that creates them; do not wait for Task 7.
- Preserve the existing Home priority order exactly: `dailyPrimary` → urgent/immediate Planner task → next teacher moment → day-closed state → fallback.
- `resolveHomeDailyContext()` remains authoritative for current/upcoming/pending lesson state.
- `resolveNextTeacherMoment()` remains authoritative for the next future teaching moment.
- `buildClassWorkspaceLearningFocus()` and `resolveRuntimeHumanTaskLessonProjection()` may determine whether a canonical modeled lesson exists; the Home adapter does not invent this state.
- No repository, Supabase adapter, server action, provider client, persistence call or mutation inside `home-intelligent-ui.ts`.
- No arbitrary href in the Home primary view model. The target is a HOME-only `RegisteredActionDescriptor`; the registry owns href generation.
- Preserve direct Home → modeled Lesson Workspace for current/upcoming/next lessons when the canonical modeled lesson exists.
- Pending registration never jumps directly to a modeled lesson. It opens Classe with `mode=record`; authoritative Class state will decide RECORD vs CATCH_UP in Task 6.
- When the class cannot be validated against the annual snapshot, degrade to Orario with `REVIEW`/`GUIDED`; do not emit a class route that may 404.
- No new visual system. Reuse the existing `humanTaskFocus` markup and the existing `Esplora tutto lo spazio docente` details surface.
- Full-view access remains secondary and non-competing. `HOME_SHOW_ALL` targets `#home-full-view`; do not add it as another peer-level primary/support action unless Human Review later proves it necessary.
- Pinned resources, global navigation and the existing pending-registration reminder remain outside the IUI composition boundary in this tranche.
- No automatic merge. Home completion is an exact-head evidence checkpoint, not integration authority.

## Review Focus

1. **Incomplete lesson context:** timetable lesson exists but section is not found in the annual snapshot → Orario, `REVIEW`, `GUIDED`, no guessed class.
2. **Modeled vs unmodeled lesson:** modeled lesson remains a direct Lesson Workspace link; valid unmodeled class falls back to task-aware Classe without losing mode/block continuity.
3. **Pending + imminent upcoming:** the current authoritative Home priority remains unchanged; an imminent upcoming lesson may stay primary while the pending-registration reminder remains visible.
4. **Provisional draft:** known provisional class may be prepared, but copy/meta must keep provisional authority explicit and must not present it as confirmed teaching state.
5. **No-operational-task states:** day closed becomes contextual `REVIEW`/`GUIDED`; generic fallback becomes `EXPLORE`/`EXPLORE`; neither invents urgency.

---

### Task 1: Pure Home composition adapter — RED → GREEN with immediate lint

**Files:**
- Create: `product/src/app/home-intelligent-ui.ts`
- Create: `product/src/app/home-intelligent-ui.test.ts`
- Modify: `product/package.json`
- Reuse unchanged: `product/src/core/presentation/intelligent-ui-composer.ts`
- Reuse unchanged: `product/src/core/presentation/intelligent-ui-registry.ts`
- Reuse unchanged: `product/src/core/presentation/human-task-model.ts`

**Interfaces:**

```ts
type HomeActionId =
  | 'HOME_OPEN_PLANNER'
  | 'HOME_OPEN_TIMETABLE'
  | 'HOME_OPEN_CLASS'
  | 'HOME_OPEN_LESSON'
  | 'HOME_SHOW_ALL'

export type HomeActionDescriptor = Extract<RegisteredActionDescriptor, { id: HomeActionId }>

export type HomePrimaryViewModel =
  | {
      kind: 'LESSON'
      dailyKind: HomeDailyPrimaryKind
      eyebrow: string
      title: string
      description: string
      meta: readonly string[]
      target: HomeActionDescriptor
    }
  | {
      kind: 'NEXT_MOMENT' | 'PLANNER' | 'DAY_CLOSED' | 'FALLBACK'
      eyebrow: string
      title: string
      description: string
      meta: readonly string[]
      target: HomeActionDescriptor
    }

export type HomeSurfaceComposition = SurfaceComposition & {
  surface: 'HOME'
  primaryAction: CompositionAction
}

export type HomePrimaryTargetRequest =
  | { kind: 'CURRENT_LESSON' | 'UPCOMING_LESSON' | 'NEXT_MOMENT'; sectionId: string | null; blockId: string | null; modeled: boolean; label: string }
  | { kind: 'PENDING_REGISTRATION'; sectionId: string | null; blockId: string | null; label: string }
  | { kind: 'AMBIGUOUS' | 'PLANNER' | 'DAY_CLOSED' | 'FALLBACK'; label: string }

export function resolveHomePrimaryTarget(input: HomePrimaryTargetRequest): HomeActionDescriptor
export function composeHomeIntelligentSurface(primary: HomePrimaryViewModel): HomeSurfaceComposition
```

**Canonical mapping:**

| Input | Intent | Specificity / Mode | Primary target |
| --- | --- | --- | --- |
| `LESSON/CURRENT_LESSON` + valid class/lesson target | `TEACH` | `SPECIFIC` / `FOCUSED` | target supplied by Home primary resolver |
| `LESSON/PENDING_REGISTRATION` + valid class target | `RECORD` | `SPECIFIC` / `FOCUSED` | `HOME_OPEN_CLASS(mode=record)` |
| `LESSON/UPCOMING_LESSON` + valid class/lesson target | `PREPARE` | `SPECIFIC` / `FOCUSED` | target supplied by Home primary resolver |
| `NEXT_MOMENT` + valid class/lesson target | `PREPARE` | `SPECIFIC` / `FOCUSED` | target supplied by Home primary resolver |
| lesson/next target is `HOME_OPEN_TIMETABLE` | `REVIEW` | `CONTEXTUAL` / `GUIDED` | Orario |
| `LESSON/AMBIGUOUS` | `REVIEW` | `CONTEXTUAL` / `GUIDED` | Orario |
| `PLANNER` | `ACT_NOW` | `SPECIFIC` / `FOCUSED` | Oggi |
| `DAY_CLOSED` | `REVIEW` | `CONTEXTUAL` / `GUIDED` | Oggi |
| `FALLBACK` | `EXPLORE` | `NONE` / `EXPLORE` | Oggi |

The adapter builds `TASK_FOCUS` from the existing `eyebrow/title/description/meta`; `reason` is human-readable and derived from the existing description; `contextSummary` is deterministic and contains the title plus at most the first two human meta items.

Support-action policy is frozen to current behavior:
- primary target `HOME_OPEN_PLANNER` → one support action `HOME_OPEN_TIMETABLE` / `Vedi l’orario`;
- any other valid Home primary target → one support action `HOME_OPEN_PLANNER` / `Vedi le attività`;
- full view is always `HOME_SHOW_ALL` / `Esplora tutto lo spazio docente` and is not counted as a peer support action.

Fallback is same-surface and deterministic: `EXPLORE/NONE`, generic `RIPARTI DA QUI`, primary `HOME_OPEN_PLANNER`, support `HOME_OPEN_TIMETABLE`, full view `HOME_SHOW_ALL`. Every valid fixture must have `fallbackReason === undefined`; only deliberately invalid descriptors may exercise fallback.

`resolveHomePrimaryTarget()` is the only pure mapper from already-authoritative route capability to a Home registered action. It does not inspect repositories or infer lesson state. Rules: CURRENT uses `teach`; UPCOMING/NEXT use `prepare`; PENDING uses class `record`; AMBIGUOUS uses Orario; PLANNER/DAY_CLOSED/FALLBACK use Oggi. Missing `sectionId` degrades lesson/next/pending to Orario. `modeled=true` without a canonical `blockId` is incoherent and also degrades to Orario rather than throwing or guessing.

- [ ] **Step 1: Write the failing adapter/target tests before creating the implementation file.** Cover CURRENT modeled, CURRENT class fallback, PENDING class record, UPCOMING modeled, NEXT_MOMENT modeled, AMBIGUOUS, PLANNER, DAY_CLOSED, FALLBACK, missing section to Orario, incoherent `modeled=true` + missing block to Orario, and invalid descriptor fallback. Assert the exact descriptor returned by `resolveHomePrimaryTarget()`, then exact intent, mode, primary action id/href semantics, exactly one support action, full-view action and absence/presence of `fallbackReason`.
- [ ] **Step 2: Add a source-boundary test.** Read `home-intelligent-ui.ts` and reject `core/infrastructure`, `Supabase`, `/actions`, provider/OpenAI imports, arbitrary `href` input fields and any plain helper declaration matching `function use[A-Z]`.
- [ ] **Step 3: Run RED.** `cd product && npx tsx --test src/app/home-intelligent-ui.test.ts` → expected failure because the adapter does not exist yet.
- [ ] **Step 4: Implement only the pure adapter/types/mapping above.** Delegate materialization and validation to `composeDeterministicSurface()`; do not reimplement registry or policy behavior.
- [ ] **Step 5: Run focused GREEN.** `npx tsx --test src/app/home-intelligent-ui.test.ts` → PASS.
- [ ] **Step 6: Run targeted lint immediately.** `npx eslint src/app/home-intelligent-ui.ts src/app/home-intelligent-ui.test.ts --max-warnings=0` → 0 errors, 0 warnings. Stop here on any lint finding; do not continue to page integration.
- [ ] **Step 7: Run typecheck.** `npm run typecheck` → PASS.
- [ ] **Step 8: Add `src/app/home-intelligent-ui.test.ts` to the explicit `npm test` list in `product/package.json` now.** Do not defer this to Task 7.
- [ ] **Step 9: Local commit only, no push.** Commit adapter + test + package inclusion.

### Task 2: Replace Home arbitrary href targets without changing authority or priority

**Files:**
- Modify: `product/src/app/page.tsx`
- Modify tests: `product/src/app/home-intelligent-ui.test.ts`

**Consumes:** `HomePrimaryViewModel`, `HomeActionDescriptor` from Task 1 and existing registry descriptors.

**Rulings locked by this plan:**

1. `page.tsx` may continue to own infrastructure reads and the authoritative primary priority expression; this task does not move them.
2. Replace the local `href` + `action` pair on the primary view model with one typed `target` descriptor.
3. Replace `resolveLessonHref()` with a pure local context helper that determines only canonical block/model availability, never an href:

```ts
type HomeLessonRouteContext = {
  blockId: string | null
  modeled: boolean
}

function resolveHomeLessonRouteContext(
  section: Awaited<ReturnType<SupabaseAnnualPlanExecutionRepository['list']>>['sections'][number],
  annualSnapshot: Awaited<ReturnType<SupabaseAnnualPlanExecutionRepository['list']>>,
): HomeLessonRouteContext
```

The existing `buildClassWorkspaceLearningFocus()` + `buildBlocks()` + `resolveRuntimeHumanTaskLessonProjection()` logic remains unchanged inside this helper.

4. `buildLessonWorkspaceHref` must disappear from Home imports; registered actions own route construction.
5. `page.tsx` must call `resolveHomePrimaryTarget()` rather than hand-assembling `HOME_*` descriptors. This makes every route-mode decision unit-testable before the Next.js integration/browser gate.

**Exact target mapping:**

- ambiguous daily context → `{ id: 'HOME_OPEN_TIMETABLE', label: 'Controlla l’orario' }`;
- current + valid section + modeled block → `HOME_OPEN_LESSON`, mode `teach`, label `Continua la lezione`;
- current + valid section + unmodeled block/no modeled projection → `HOME_OPEN_CLASS`, mode `teach`, canonical block if known, `returnTo: '/'`, label `Apri la classe`;
- pending + valid section → always `HOME_OPEN_CLASS`, mode `record`, canonical block if known, `returnTo: '/'`, label `Apri la classe`;
- upcoming + valid section + modeled block → `HOME_OPEN_LESSON`, mode `prepare`, label `Apri la lezione`;
- upcoming + valid section without modeled projection → `HOME_OPEN_CLASS`, mode `prepare`, canonical block if known, `returnTo: '/'`, label `Apri la classe`;
- daily lesson whose section cannot be validated against annual snapshot → Orario, not a raw class route;
- next moment + validated first section + modeled block → `HOME_OPEN_LESSON`, mode `prepare`, preserve current human action label (`Prepara la prima lezione` / `Prepara con la bozza`);
- next moment + validated first section without modeled projection → `HOME_OPEN_CLASS`, mode `prepare`, canonical block if known, `returnTo: '/'`, preserve current human action label;
- next moment whose first section is not present in annual snapshot → `HOME_OPEN_TIMETABLE`, label `Controlla l’orario`;
- Planner / day closed / fallback → `HOME_OPEN_PLANNER`, label `Apri Oggi`.

The textual title/description/meta and priority expression are otherwise unchanged.

- [ ] **Step 1: Extend RED tests/source assertions before the page refactor.** Unit-test `resolveHomePrimaryTarget()` for every exact mapping below. Assert `page.tsx` must import/call that resolver, must not import/call `buildLessonWorkspaceHref`, must not render `primary.href` or `primary.action`, and must still contain the authoritative order `dailyPrimary` before `immediateTask`, then `nextMomentPrimary`.
- [ ] **Step 2: Run RED.** `npx tsx --test src/app/home-intelligent-ui.test.ts` → expected failure on current source assertions.
- [ ] **Step 3: Refactor only the primary target fields/helper described above.** Do not touch repository queries, `resolveHomeDailyContext`, `resolveNextTeacherMoment`, planner ranking, pinned resources or reminder semantics.
- [ ] **Step 4: Run focused tests.** `npx tsx --test src/app/home-intelligent-ui.test.ts` → PASS.
- [ ] **Step 5: Run upstream Home authority regressions.** `npx tsx --test src/core/presentation/home-daily-context.test.ts` → PASS.
- [ ] **Step 6: Run targeted lint before commit.** `npx eslint src/app/page.tsx src/app/home-intelligent-ui.ts src/app/home-intelligent-ui.test.ts --max-warnings=0` → 0 errors, 0 warnings.
- [ ] **Step 7: Run typecheck.** `npm run typecheck` → PASS.
- [ ] **Step 8: Local commit only, no push.** Commit the target-refactor slice.

### Task 3: Render only the validated Home composition

**Files:**
- Modify: `product/src/app/page.tsx`
- Modify: `product/src/app/home-intelligent-ui.test.ts`

**Rendering contract:**

After the unchanged authoritative primary selection:

```ts
const composition = composeHomeIntelligentSurface(primary)
```

The existing `humanTaskFocus` markup reads only:
- `composition.primaryBlock.eyebrow/title/description/meta`;
- `composition.primaryAction.href/label`;
- `composition.supportActions` (one peer support link in this tranche).

The existing secondary details element receives `id="home-full-view"`. `composition.fullViewAction` is validated against that anchor but is not added as a competing peer action in the focus row.

The pending-registration reminder may continue to use the already-authoritative `primary`/`dailyContext` state outside the composition block. Pinned resources and the `entrances` catalogue remain unchanged and outside IUI composition.

- [ ] **Step 1: Add RED integration/source assertions.** Require `composeHomeIntelligentSurface(primary)`, `composition.primaryBlock`, `composition.primaryAction`, `composition.supportActions`, and `id="home-full-view"` in `page.tsx`; reject `primary.href` / `primary.action` inside the focus rendering.
- [ ] **Step 2: Run RED.** Focused Home test must fail before rendering integration.
- [ ] **Step 3: Apply the minimal rendering substitution only.** No CSS redesign and no general renderer.
- [ ] **Step 4: Run focused GREEN.** `npx tsx --test src/app/home-intelligent-ui.test.ts` → PASS.
- [ ] **Step 5: Run the whole relevant deterministic slice.** `npx tsx --test src/core/presentation/human-task-model.test.ts src/core/presentation/task-continuity.test.ts src/core/presentation/intelligent-ui-contract.test.ts src/core/presentation/intelligent-ui-registry.test.ts src/core/presentation/intelligent-ui-policy.test.ts src/core/presentation/intelligent-ui-composer.test.ts src/core/presentation/home-daily-context.test.ts src/app/home-intelligent-ui.test.ts` → PASS.
- [ ] **Step 6: Targeted lint with zero warnings.** `npx eslint src/app/page.tsx src/app/home-intelligent-ui.ts src/app/home-intelligent-ui.test.ts --max-warnings=0` → 0 errors, 0 warnings.
- [ ] **Step 7: Typecheck.** `npm run typecheck` → PASS.
- [ ] **Step 8: Local commit only, no push.** Commit the validated-render slice.

### Task 4: Pre-push fail-fast gate — no remote CI until this is green

**Files:** no new product behavior; verification only unless a failing gate sends work back to its owning task.

- [ ] **Step 1: Verify exact local range and scope.** `git diff --check <BASE>...HEAD` and inspect changed files. Expected Home tranche changes only: `home-intelligent-ui.ts`, `home-intelligent-ui.test.ts`, `page.tsx`, `package.json`, plus this plan/ledger evidence. Any unrelated product file is a stop condition.
- [ ] **Step 2: Prove the canonical `npm test` actually executes the new Home test.** Run `npm test`; read output and confirm the Home adapter test names appear, not merely that the command exits 0.
- [ ] **Step 3: Full typecheck.** `npm run typecheck` → PASS.
- [ ] **Step 4: Full lint.** `npm run lint` → 0 errors. Existing unrelated warnings are recorded separately; no new warning is allowed on Home-changed files.
- [ ] **Step 5: Full production build.** `npm run build` → PASS. This is mandatory before push because it catches Next.js route/export/server-component constraints that unit tests/typecheck can miss.
- [ ] **Step 6: Re-run targeted zero-warning lint after build-generated checks.** `npx eslint src/app/page.tsx src/app/home-intelligent-ui.ts src/app/home-intelligent-ui.test.ts --max-warnings=0` → clean.
- [ ] **Step 7: Verify no hook-shaped plain helpers.** Inspect changed TS/TSX declarations; no non-hook function begins with `use`.
- [ ] **Step 8: Verify no direct Home primary href builder remains.** `buildLessonWorkspaceHref` must not be imported by `src/app/page.tsx`; primary target construction uses HOME registered descriptors only.
- [ ] **Step 9: Only now push the accumulated Home commits once.** Record exact pushed SHA.

### Task 5: Exact-head remote certification and Home checkpoint

**Required exact-head gates:**
- Product CI;
- Human Interaction Model;
- Certification Impact Classifier;
- Browser Certification Orchestrator;
- WCAG 2.2 AA selected gate;
- HVA selected gate;
- P6 performance selected gate when selected by impact classification;
- X3 no-implicit-write selected gate when selected;
- dependency/security/release-policy gates triggered for the exact head.

**Human/browser scenarios:**

1. current modeled lesson remains direct Home → Lesson Workspace, no artificial Classe detour;
2. current valid but unmodeled class opens task-aware Classe with `mode=teach`;
3. pending registration opens task-aware Classe with `mode=record` and does not mark anything recorded;
4. upcoming/next modeled lesson opens direct prepare path;
5. incomplete/ambiguous context opens Orario and does not guess a class;
6. provisional draft remains visibly provisional;
7. planner task remains one focused action with Orario as support;
8. day-closed and fallback states do not invent urgency;
9. `Esplora tutto lo spazio docente` remains visible/reachable at `#home-full-view` without competing with the primary action;
10. smartphone + desktop show no horizontal overflow, broken focus order or duplicated primary actions.

- [ ] **Step 1: Bind every CI result to the pushed exact SHA.** Never inherit PASS from `5a7eeed...` or any earlier head.
- [ ] **Step 2: If Product CI fails, isolate the failing step/log first.** Do not patch by intuition. A lint/typecheck/test/build failure returns to the owning task and restarts local RED/GREEN + pre-push gate.
- [ ] **Step 3: If Browser Certification fails, classify product vs infrastructure before code changes.** No speculative product edit for runner/install/network failures.
- [ ] **Step 4: Perform Home Human Review only after automated exact-head gates are green.** Judge clarity: location, task, state, next action, reason, full-view escape.
- [ ] **Step 5: Record `HOME_IUI_03B = QUALIFIED` only if all automated gates and Human Review pass.** Otherwise record REWORK with one isolated owner finding.
- [ ] **Step 6: Stop at the Home checkpoint.** Do **not** begin Task 6 / Classe composition until Home is qualified. No automatic merge.

## Stop conditions

Stop and re-plan rather than widening the patch if any of these become necessary:

- moving Supabase/repository access into the Home adapter;
- changing `resolveHomeDailyContext()` or `resolveNextTeacherMoment()` semantics;
- changing Planner priority/ranking to make composition work;
- changing Class task-state authority during this Home tranche;
- adding a new generic renderer/design system;
- allowing arbitrary hrefs into the composition contract;
- adding a runtime model/provider dependency;
- weakening no-implicit-write, privacy, accessibility or Human Task budgets;
- changing global navigation or Settings;
- modifying unrelated Product surfaces to satisfy Home tests.

## Definition of done

IUI-03B Home is complete only when:

- the Home adapter is pure, deterministic, repository-free and lint-clean;
- all valid Home cases produce `fallbackReason === undefined`;
- invalid/incomplete context degrades safely without guessed class/lesson state;
- direct modeled lesson navigation is preserved;
- pending registration uses task-aware Classe continuity rather than a write or direct lesson shortcut;
- Home primary/support actions come only from the registered action catalogue;
- the existing Home priority order is unchanged;
- the new Home test is part of canonical `npm test` before the first remote push;
- focused tests, relevant regression tests, full `npm test`, typecheck, full lint and production build pass locally before push;
- exact-head Product CI and changed-view certification pass remotely;
- Human Review judges the Home surface simpler/clearer, not merely different;
- Task 6 has not started and no merge has occurred.
