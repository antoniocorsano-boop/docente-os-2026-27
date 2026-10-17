# DOS-J1-01 — Oggi teacher-first Implementation Plan

> **Required sub-skill:** execute with `executing-plans` for Native execution, or `subagent-driven-development` if explicitly selected.

**Goal:** Turn the real `/planner` surface into the teacher-first `Oggi` experience approved in DOS-J1-01, so a teacher can identify the current/next lesson and enter preparation directly without reconstructing context.

**Architecture:** Reuse the existing temporal, lesson-preparation, class-progression, lesson-workspace, planner and materials authorities. Introduce no new persistence. Extract one reusable operational Today loader, project it through a pure `TodayTeachingFocus` presentation model, render that model before generic planner detail, and preserve the current fail-closed fallbacks.

**Tech Stack:** Next.js 16 / React 19 / TypeScript 5.9, Supabase-backed repositories, Node 22 tests via `tsx --test`, Playwright Human + Visual Acceptance, governed Docente OS design tokens.

**Spec:** `docs/superpowers/specs/2026-10-17-dos-j1-01-today-teacher-first-design.md`

**Baseline:** `develop@3f2b4fbac475109fdc331415aa16af680fd96c87`

## Global Constraints

- Fix only the demonstrated DOS-CLOSE-02 J1 blocker.
- No new database tables, migrations, analytics, recent-activity tracker, material authority or lesson authority.
- No redesign of the global AppShell or mobile navigation.
- No work on DOC-04, IUI, Access, Argo, Visual Factory, gh-aw/QE-01 or other parked fronts.
- Never fabricate class, lesson, subject, material, draft or resume state.
- `Prepara lezione` is allowed only when the canonical lesson workspace target is deterministically resolvable.
- Keep planner/timeline behavior available as a fallback and as secondary content.
- Product work remains in a Draft PR. No merge or deploy in this plan.
- TDD is mandatory: RED → minimal GREEN → focused regression → commit for each implementation task.
- Final product acceptance remains human: automated GREEN does not change J1 from `BLOCKER` to `PASS`.

## Review Focus

Reviewers should look specifically for these failure modes:

1. **Duplicated authority:** `/planner` independently reimplements the safe lesson-resolution logic already used by Today Copilot / next-lesson preparation.
2. **False preparation affordance:** UI says `Prepara lezione` even when no canonical lesson block/workspace is available.
3. **Synthetic continuity:** `Continua da dove eri` appears from guessed/recent activity rather than real persisted continuity.
4. **Hierarchy regression:** planner counters, timeline, assistant or quick actions again compete visually with the known teaching task on mobile.
5. **Mockup-driven scope creep:** global navigation, materials ownership, student surfaces or unrelated UI are changed merely to imitate the concept image.

---

## Task 1 — Expose one authoritative operational Today load path

**Files:**
- Modify: `product/src/app/api/assistant/today-context-loader.ts`
- Modify: `product/src/app/api/assistant/today-context-loader-contract.test.ts`
- Verify unchanged safety contract: `product/src/app/api/assistant/next-lesson-preparation-loader.ts`
- Verify unchanged safety contract: `product/src/app/api/assistant/next-lesson-preparation-loader-contract.test.ts`

**Interfaces:**

Add an exported server-side operational result, keeping the existing Copilot API as a wrapper rather than creating another read path:

```ts
export type LoadedTodayOperationalContext = {
  workspaceContext: NonNullable<Awaited<ReturnType<SupabaseWorkspaceRepository['getCurrentContext']>>>
  localDate: string
  minuteOfDay: number
  tasks: PlannerTask[]
  projectedDay: ProjectedDay | null
  homeDaily: HomeDailyContext
  preparation: LoadedNextLessonPreparation | null
}

export async function loadCurrentTodayOperationalContext(): Promise<LoadedTodayOperationalContext | null>
```

The existing `loadCurrentTodayCopilotContext()` must consume this operational result and preserve its public behavior.

**Steps:**

- [ ] Extend `today-context-loader-contract.test.ts` first so it requires `loadCurrentTodayOperationalContext()` and verifies that `loadCurrentTodayCopilotContext()` delegates to it instead of duplicating repository reads.
- [ ] Add contract coverage proving optional lesson-preparation failure remains fail-soft (`preparation: null`) rather than breaking Oggi.
- [ ] Add contract coverage for the no-academic-year path: operational context still exists with `projectedDay: null`, empty daily context and no preparation.
- [ ] Run RED:

```bash
cd product
npx tsx --test src/app/api/assistant/today-context-loader-contract.test.ts src/app/api/assistant/next-lesson-preparation-loader-contract.test.ts
```

Expected: the new operational-loader assertions fail before implementation.

- [ ] Implement the smallest extraction in `today-context-loader.ts`: move the current workspace/clock/planner/temporal/homeDaily/preparation composition behind `loadCurrentTodayOperationalContext()`; retain the existing `try/catch` around `loadNextLessonPreparationBundle()`.
- [ ] Refactor `loadCurrentTodayCopilotContext()` to build the assistant context from the operational result, with no second repository pass.
- [ ] Run GREEN using the same targeted command.
- [ ] Run `npm run typecheck`.
- [ ] Commit:

```bash
git add product/src/app/api/assistant/today-context-loader.ts product/src/app/api/assistant/today-context-loader-contract.test.ts
git commit -m "refactor: expose authoritative Today operational context"
```

---

## Task 2 — Build a pure teacher-first presentation model

**Files:**
- Create: `product/src/core/presentation/today-teaching-focus.ts`
- Create: `product/src/core/presentation/today-teaching-focus.test.ts`
- Modify: `product/package.json`
- Reuse: `product/src/core/presentation/human-task-runtime.ts`
- Reuse: `product/src/core/presentation/next-lesson-preparation.ts`
- Existing regression: `product/src/core/application/today-projection-service.test.ts`

**Interfaces:**

Create a UI-ready model containing only truthful information needed by `Oggi`:

```ts
export type TodayTeachingFocusAction = {
  kind: 'PREPARE' | 'CLASS'
  label: 'Prepara lezione' | 'Apri la classe'
  href: string
}

export type TodayTeachingResume = {
  title: 'Continua da dove eri'
  detail: string
  href: string
} | null

export type TodayTeachingFocus = {
  state: 'CURRENT' | 'NEXT'
  stateLabel: 'Lezione in corso' | 'Prossima lezione'
  minutesUntilStart: number | null
  classLabel: string | null
  occurrenceTitle: string
  lessonTitle: string
  startAt: string
  endAt: string
  authority: 'IN_FORCE' | 'PROVISIONAL_DRAFT'
  chips: string[]
  action: TodayTeachingFocusAction | null
  resume: TodayTeachingResume
}

export function buildTodayTeachingFocus(input: {
  preparation: NextLessonPreparation | null
  minuteOfDay: number
}): TodayTeachingFocus | null
```

**Projection rules:**

- `preparation === null` → `null`.
- Current/next is calculated only from `startAt/endAt` and `minuteOfDay`.
- Prefer `canonicalLesson.title` for the teaching title; preserve temporal `lesson.title` as context.
- Direct `PREPARE` only when both `lesson.sectionId` and `canonicalLesson.blockId` exist; build the href with the already-governed `buildLessonWorkspaceHref(sectionId, blockId, 'prepare')`.
- Section known but canonical lesson unavailable → truthful `Apri la classe` fallback.
- No section → no invented action.
- `resume` exists only when `preparation.continuity?.nextActivity` is real; use the same safe action target, never a fabricated draft route.
- Chips are optional and capped at 3. Use only existing human values (for example UDA title, preparation status, ready-material count); never copy mockup labels such as `Lezione frontale` or `Slides` unless the runtime really knows them.
- Provisional timetable state stays explicit in the model and must not be presented as definitive.

**Steps:**

- [ ] Write `today-teaching-focus.test.ts` first with cases for: resolvable next lesson; current lesson; canonical lesson missing; section missing; null preparation; continuity present; continuity absent; provisional timetable.
- [ ] Update the fixed `npm test` script in `product/package.json` to include the new test and the already-existing `src/core/application/today-projection-service.test.ts`, so CI cannot silently skip the Today contracts.
- [ ] Run RED:

```bash
cd product
npx tsx --test src/core/presentation/today-teaching-focus.test.ts src/core/application/today-projection-service.test.ts
```

Expected: missing module/function failures for the new presenter.

- [ ] Implement `today-teaching-focus.ts` with no repository access and no side effects.
- [ ] Run the targeted tests GREEN.
- [ ] Run the existing next-lesson regression:

```bash
npx tsx --test src/core/presentation/next-lesson-preparation.test.ts
```

- [ ] Run full `npm test` once to prove the new files are actually wired into the fixed test list.
- [ ] Commit:

```bash
git add product/src/core/presentation/today-teaching-focus.ts product/src/core/presentation/today-teaching-focus.test.ts product/package.json
git commit -m "feat: project teacher-first Today focus"
```

---

## Task 3 — Recompose the real `/planner` surface around the lesson task

**Files:**
- Modify: `product/src/app/planner/page.tsx`
- Create: `product/src/app/planner/today-teaching-focus-card.tsx`
- Modify: `product/src/app/planner/today-home.css`
- Reuse unchanged: `product/src/components/app-shell/app-shell.tsx`
- Reuse unchanged: `product/src/components/app-shell/navigation.ts`

**Behavior:**

`/planner` should consume `loadCurrentTodayOperationalContext()` once, derive the existing `TodayProjection` from `tasks + projectedDay`, and derive `TodayTeachingFocus` from `preparation + minuteOfDay`.

When a teaching focus exists, mobile semantic order is:

1. `Oggi` and human date, with a secondary link to `/calendario`;
2. teacher-focused current/next lesson card;
3. conditional `Continua da dove eri` card;
4. small `Azioni rapide` area with only truthful existing routes;
5. timeline/planner/day-close/task-capture as secondary content.

When no teaching focus exists, preserve the current ACT_NOW planner behavior.

**Quick-action rule:** do not implement the mockup literally where capability is absent. Prefer a small set of existing safe destinations. Class-scoped actions may be shown only with a known section; generic actions use existing canonical routes. Do not create an `Alunni` destination or a second `Materiali` system for visual symmetry.

**Visual target:** reproduce the mockup’s hierarchy, warm calm card treatment, scannable class badge and wide CTA as closely as governed tokens/accessibility permit. Do not alter the global mobile bottom navigation.

**Steps:**

- [ ] Add a focused page/presenter contract test before JSX changes if needed (for example `product/src/app/planner/today-teacher-first-contract.test.ts`), and wire it into `product/package.json`. Assert that `/planner` consumes the operational loader/presenter and does not hard-code CAN/UUID identifiers.
- [ ] Run the focused contract test RED.
- [ ] Implement `TodayTeachingFocusCard` as a small server-renderable presentation component: state label, class/context, time, human title, optional chips, exactly one primary action.
- [ ] Add conditional resume rendering using only `focus.resume`.
- [ ] Recompose `PlannerPage()` so the teacher-first block precedes timeline/planner when available; preserve old `TodayFocusCard` as fallback when the teacher focus is absent.
- [ ] Add a visible but secondary `Calendario` link; do not move calendar authority into Oggi.
- [ ] Add only truthful quick actions that already have real routes. If two are valid, render two; do not manufacture four.
- [ ] Update `today-home.css` for the mockup-like card proportions, class badge, CTA, quick-action grid and progressive secondary sections.
- [ ] Verify at 320 CSS px by inspection/test that chips/actions wrap and the primary CTA remains visible without horizontal overflow.
- [ ] Run targeted test(s) GREEN, then:

```bash
cd product
npm run typecheck
npm run lint
```

- [ ] Commit:

```bash
git add product/src/app/planner product/package.json
git commit -m "feat: make Oggi teacher-first"
```

---

## Task 4 — Certify J1 mechanically in the Human + Visual suite

**Files:**
- Create: `product/e2e/experience/today-teacher-first.spec.mjs`
- Reuse: `product/e2e/support/e2e-auth.mjs`
- Reuse: `product/playwright.experience.config.mjs`
- Existing coverage: `product/e2e/experience/surfaces.spec.mjs`
- Existing surface registry: `product/e2e/experience/surfaces.mjs`

**Browser contract:**

The test is not a substitute for the later Human Review. It proves only that the intended path is mechanically present and visually stable.

**Steps:**

- [ ] Write the Playwright spec before relying on the new UI. Authenticate with `loginE2E()` and navigate to `/planner`.
- [ ] Require a known teaching-focus fixture rather than returning PASS on an empty/irrelevant day. If the canonical HVA fixture cannot expose a deterministic current/next lesson, fail with an explicit fixture-coverage message rather than silently marking the journey `NOT_APPLICABLE`.
- [ ] Assert `h1 = Oggi` and visible current/next lesson context before generic planner sections.
- [ ] Assert only one dominant primary CTA in the teacher-focus card.
- [ ] If the CTA is `Prepara lezione`, assert href matches `/classi/<section>/lezioni/<block>?mode=prepare`, activate it, and verify recognizable class/lesson context in the destination.
- [ ] Verify the route back to Oggi is explicit/predictable using the destination’s existing navigation contract; do not add a new global nav mechanism only for the test.
- [ ] On the mobile project, set an additional 320px viewport checkpoint and assert `scrollWidth <= innerWidth + 1`.
- [ ] Capture full-page screenshots in the existing `test-results/experience/screenshots` convention.
- [ ] Run locally when governed E2E credentials are available:

```bash
cd product
npx playwright test -c playwright.experience.config.mjs e2e/experience/today-teacher-first.spec.mjs --project=mobile-412x915
npx playwright test -c playwright.experience.config.mjs e2e/experience/today-teacher-first.spec.mjs --project=desktop-1440x1000
```

Expected before UI completion: RED on missing teacher-first hierarchy/direct CTA. Expected after Task 3: GREEN.

- [ ] Run the existing planner surface HVA test as a regression for overflow/runtime errors.
- [ ] Commit:

```bash
git add product/e2e/experience/today-teacher-first.spec.mjs
git commit -m "test: certify teacher-first Oggi journey"
```

---

## Task 5 — Exact-head qualification and stop at Human Review gate

**Files:** no new product scope. Only fix defects demonstrated by the gates above.

**Steps:**

- [ ] Run the exact-head local product qualification:

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

- [ ] Re-run the two targeted Playwright projects for `today-teacher-first.spec.mjs` when governed credentials are available.
- [ ] Push the exact head to PR #718 and wait for Product CI / Human + Visual / relevant certification workflows.
- [ ] Inspect failures by exact SHA. Do not treat a stale earlier GREEN as evidence for the new product head.
- [ ] If a gate fails, repair only the demonstrated DOS-J1-01 defect using RED → GREEN; no opportunistic refactors.
- [ ] Confirm PR #718 remains Draft and unmerged.
- [ ] Record terminal engineering state as:

```text
IMPLEMENTATION_VERIFIED / HUMAN_REVIEW_PENDING / NO_MERGE_AUTHORIZED
```

- [ ] Do **not** declare J1 PASS from automation.
- [ ] After a separately authorized Beta promotion/deploy, repeat the actual authenticated Human Review unaided:

```text
Oggi → prossima lezione → preparazione → materiali
```

J1 becomes `PASS` only if the teacher completes that sequence naturally without procedural coaching. If not, it remains `BLOCKER`, and J2–J4 remain `NOT_RUN` until the blocker is resolved.

## Plan completion criteria

The plan is complete when:

- one authoritative operational loader feeds Oggi and Today Copilot;
- one pure presenter decides the teacher-first card and safe action;
- `/planner` visually matches the approved mockup’s hierarchy without inventing capability;
- the direct preparation route uses existing canonical lesson authority;
- fallback Planner behavior still works when no lesson is safely resolvable;
- unit, product, build and browser gates are green on the exact head;
- PR #718 is still Draft/unmerged;
- DOS-CLOSE-02 is waiting only for the real J1 Human Review, not for additional feature work.
