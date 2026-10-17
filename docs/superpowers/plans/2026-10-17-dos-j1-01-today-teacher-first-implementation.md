# DOS-J1-01 — Oggi teacher-first Implementation Plan

> **Required sub-skill:** execute with `executing-plans` for Native execution, or `subagent-driven-development` if explicitly selected.

**Goal:** Turn the real `/planner` surface into the teacher-first `Oggi` experience approved in DOS-J1-01, so a teacher can identify the current/next lesson and enter preparation directly without reconstructing context.

**Architecture:** Reuse the existing temporal, lesson-preparation, class-progression, lesson-workspace, planner and materials authorities. Introduce no new persistence. Extract one reusable operational Today loader, project it through a pure `TodayTeachingFocus` model, render that model before generic planner detail, and preserve current fail-closed fallbacks.

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
- Keep planner/timeline behavior available as fallback and secondary content.
- The approved mockup is a hierarchy/visual target, not authority to invent capabilities.
- Product work remains in a Draft PR. No merge or deploy in this plan.
- TDD is mandatory: RED → minimal GREEN → focused regression → commit for each implementation task.
- Final product acceptance remains human: automated GREEN does not change J1 from `BLOCKER` to `PASS`.

## Review Focus

Reviewers should look specifically for these failure modes:

1. **Duplicated authority:** `/planner` independently reimplements safe lesson resolution already used by Today Copilot / next-lesson preparation.
2. **False preparation affordance:** UI says `Prepara lezione` when no canonical lesson block/workspace is available.
3. **Synthetic resume state:** teaching-session continuity is mislabeled as an unfinished draft or `Continua da dove eri` without an actual resumable state.
4. **Hierarchy regression:** planner counters, timeline, assistant or quick actions again compete visually with the known teaching task on mobile.
5. **Mockup-driven scope creep:** global navigation, materials ownership, student surfaces or unrelated UI change only to imitate the concept image.

---

## Task 1 — Expose one authoritative operational Today load path

**Files:**
- Modify: `product/src/app/api/assistant/today-context-loader.ts`
- Modify: `product/src/app/api/assistant/today-context-loader-contract.test.ts`
- Verify unchanged safety contract: `product/src/app/api/assistant/next-lesson-preparation-loader.ts`
- Verify unchanged safety contract: `product/src/app/api/assistant/next-lesson-preparation-loader-contract.test.ts`

**Interface:**

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

The existing `loadCurrentTodayCopilotContext()` becomes a wrapper over this result, not a second read path.

**Steps:**

- [ ] Extend `today-context-loader-contract.test.ts` first to require `loadCurrentTodayOperationalContext()` and verify that `loadCurrentTodayCopilotContext()` delegates to it.
- [ ] Add coverage proving optional lesson-preparation failure stays fail-soft (`preparation: null`) rather than breaking Oggi.
- [ ] Add coverage for no academic year: operational context still exists with `projectedDay: null`, empty daily context and no preparation.
- [ ] Run RED:

```bash
cd product
npx tsx --test src/app/api/assistant/today-context-loader-contract.test.ts src/app/api/assistant/next-lesson-preparation-loader-contract.test.ts
```

Expected: new operational-loader assertions fail.

- [ ] Extract the existing workspace/clock/planner/temporal/homeDaily/preparation composition behind `loadCurrentTodayOperationalContext()`; retain the existing guarded `try/catch` around `loadNextLessonPreparationBundle()`.
- [ ] Refactor `loadCurrentTodayCopilotContext()` to build the assistant context from that operational result with no second repository pass.
- [ ] Run the same targeted tests GREEN.
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
- Modify: `product/src/core/presentation/next-lesson-preparation.ts`
- Modify: `product/src/core/presentation/next-lesson-preparation.test.ts`
- Modify: `product/package.json`
- Reuse: `product/src/core/presentation/human-task-runtime.ts`
- Existing regression: `product/src/core/application/today-projection-service.test.ts`

**Small truthful enrichment:**

`NextLessonPreparation.canonicalLesson` already comes from `LessonCopilotContext`. Add the existing human discipline label from `lessonContext.discipline` to that projection so Oggi can render `Tecnologia` separately without parsing a temporal title or inventing a subject.

**Interface:**

```ts
export type TodayTeachingFocusAction = {
  kind: 'PREPARE' | 'CLASS'
  label: 'Prepara lezione' | 'Apri la classe'
  href: string
}

export type TodayTeachingContinuity = {
  label: 'Riprendi il filo'
  detail: string
} | null

export type TodayTeachingFocus = {
  state: 'CURRENT' | 'NEXT'
  stateLabel: 'Lezione in corso' | 'Prossima lezione'
  minutesUntilStart: number | null
  classLabel: string | null
  subjectLabel: string | null
  occurrenceTitle: string
  lessonTitle: string
  startAt: string
  endAt: string
  authority: 'IN_FORCE' | 'PROVISIONAL_DRAFT'
  chips: string[]
  continuity: TodayTeachingContinuity
  action: TodayTeachingFocusAction | null
}

export function buildTodayTeachingFocus(input: {
  preparation: NextLessonPreparation | null
  minuteOfDay: number
}): TodayTeachingFocus | null
```

**Projection rules:**

- `preparation === null` → `null`.
- Current/next is calculated only from `startAt/endAt` and `minuteOfDay`.
- Prefer `canonicalLesson.title`; keep temporal `lesson.title` as secondary context.
- `classLabel` and `subjectLabel` come only from canonical/human context already resolved by the loader.
- Direct `PREPARE` requires both `lesson.sectionId` and `canonicalLesson.blockId`; build href with governed `buildLessonWorkspaceHref(sectionId, blockId, 'prepare')`.
- Section known but canonical lesson unavailable → truthful `/classi/<sectionId>` fallback labeled `Apri la classe`.
- No section → no invented action.
- `preparation.continuity.nextActivity` may become a small `Riprendi il filo` note because it is real Diario continuity; it must **not** become `Continua da dove eri`, `Bozza materiali` or a fabricated draft/resume route.
- DOS-J1-01 does not render a separate `Continua da dove eri` card unless an already-existing authoritative resumable draft is found. Read-only exploration found no such canonical draft authority, so the initial implementation deliberately omits that mockup card.
- Chips are optional, human-readable and capped at 3. Never inject mockup labels such as `Lezione frontale` or `Slides` unless runtime evidence actually supplies them.
- Provisional timetable authority stays explicit.

**Steps:**

- [ ] First extend `next-lesson-preparation.test.ts` with a failing assertion that the canonical projection carries the existing discipline label.
- [ ] Create `today-teaching-focus.test.ts` first with RED cases for: resolvable next lesson; current lesson; canonical lesson missing; section missing; null preparation; real continuity note; no continuity; provisional timetable.
- [ ] Update the fixed `npm test` script in `product/package.json` to include `today-teaching-focus.test.ts` and the already-existing `src/core/application/today-projection-service.test.ts` so Product CI cannot silently skip Today contracts.
- [ ] Run RED:

```bash
cd product
npx tsx --test src/core/presentation/next-lesson-preparation.test.ts src/core/presentation/today-teaching-focus.test.ts src/core/application/today-projection-service.test.ts
```

- [ ] Add only the discipline-label enrichment to `buildNextLessonPreparation()`.
- [ ] Implement `today-teaching-focus.ts` with no repository access and no side effects.
- [ ] Run the targeted command GREEN.
- [ ] Run full `npm test` once to prove the files are wired into the fixed test list.
- [ ] Commit:

```bash
git add product/src/core/presentation/next-lesson-preparation.ts product/src/core/presentation/next-lesson-preparation.test.ts product/src/core/presentation/today-teaching-focus.ts product/src/core/presentation/today-teaching-focus.test.ts product/package.json
git commit -m "feat: project teacher-first Today focus"
```

---

## Task 3 — Recompose the real `/planner` surface around the lesson task

**Files:**
- Create: `product/src/app/planner/today-teacher-first-contract.test.ts`
- Modify: `product/src/app/planner/page.tsx`
- Create: `product/src/app/planner/today-teaching-focus-card.tsx`
- Modify: `product/src/app/planner/today-home.css`
- Modify: `product/package.json`
- Reuse unchanged: `product/src/components/app-shell/app-shell.tsx`
- Reuse unchanged: `product/src/components/app-shell/navigation.ts`

**Behavior:**

`/planner` consumes `loadCurrentTodayOperationalContext()` once, derives the existing `TodayProjection` from `tasks + projectedDay`, and derives `TodayTeachingFocus` from `preparation + minuteOfDay`.

When a teaching focus exists, mobile semantic order is:

1. `Oggi` + human date + secondary `Calendario` link;
2. current/next lesson card;
3. optional real `Riprendi il filo` note inside that lesson context;
4. small `Azioni rapide` area;
5. timeline/planner/day-close/task-capture as secondary content.

There is **no separate resume card** in this slice because the repository does not currently expose a truthful resumable-draft authority for Oggi.

When no teaching focus exists, preserve current ACT_NOW planner behavior.

**Exact quick actions for this slice:**

- with known section: `Apri la classe` → `/classi/<sectionId>`;
- when a current next-lesson preparation exists: `Materiali della prossima lezione` → existing `/materiali/prossima` surface;
- `Calendario` remains the header-level secondary action → `/calendario`.

Do not add `Registro rapido`, `Alunni` or `Crea materiali` simply to fill the four mockup tiles; those labels are not backed by equivalent canonical destinations in the inspected baseline.

**Visual target:** reproduce the mockup hierarchy, warm calm card treatment, scannable class badge and wide CTA as closely as governed tokens/accessibility permit. Do not alter the global bottom navigation (`Home`, `Oggi`, `Classi`, `Orario`, `Naviga`).

**Steps:**

- [ ] Create `today-teacher-first-contract.test.ts` first and add it to `product/package.json`. Require the page to consume `loadCurrentTodayOperationalContext`, `buildTodayTeachingFocus` and `TodayTeachingFocusCard`; require the old `TodayFocusCard` fallback to remain; reject first-level CAN/UUID labels.
- [ ] Run RED:

```bash
cd product
npx tsx --test src/app/planner/today-teacher-first-contract.test.ts
```

Expected: missing teacher-first imports/component assertions fail.

- [ ] Implement `TodayTeachingFocusCard` as a focused server-renderable component: state label, class badge/context, subject, time, human lesson title, optional chips/continuity, exactly one primary action.
- [ ] Recompose `PlannerPage()` so teacher-first content precedes timeline/planner when available; keep old `TodayFocusCard` for the no-teaching-focus fallback.
- [ ] Add only the exact quick actions above.
- [ ] Make generic timeline/planner sections visually secondary using existing accessible disclosure patterns or lower-page hierarchy; do not remove their authority/actions.
- [ ] Update `today-home.css` for mockup-like proportions and governed tokens: warm surface, thin borders, restrained elevation, strong wide CTA, safe wrapping.
- [ ] Run the focused contract GREEN, then:

```bash
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

**Browser contract:** automated evidence proves discoverability mechanics and layout stability; it does not replace the later human verdict.

**Steps:**

- [ ] Add a Playwright test for `/planner` that authenticates with `loginE2E()` and requires the HVA fixture to expose a deterministic current/next lesson. If the fixture does not, fail explicitly as a fixture-coverage defect rather than reporting `NOT_APPLICABLE`.
- [ ] Assert `h1 = Oggi` and the teaching card is visually before generic planner detail.
- [ ] Assert exactly one primary action inside the teaching card.
- [ ] When the action is `Prepara lezione`, assert href matches `/classi/<section>/lezioni/<block>?mode=prepare`, click it, and verify recognizable class/lesson context in the destination.
- [ ] Verify return to Oggi uses an existing predictable product route/navigation; do not modify AppShell merely to satisfy the test.
- [ ] For the mobile project, add a 320px viewport checkpoint and assert `document.documentElement.scrollWidth <= window.innerWidth + 1`.
- [ ] Capture screenshots in the existing `test-results/experience/screenshots` convention.
- [ ] Run:

```bash
cd product
npx playwright test -c playwright.experience.config.mjs e2e/experience/today-teacher-first.spec.mjs --project=mobile-412x915
npx playwright test -c playwright.experience.config.mjs e2e/experience/today-teacher-first.spec.mjs --project=desktop-1440x1000
```

- [ ] If the test exposes a product defect, obtain RED and make only the minimal DOS-J1-01 correction before rerunning GREEN.
- [ ] Run the existing planner case in `surfaces.spec.mjs` as regression for overflow/runtime/network errors.
- [ ] Commit:

```bash
git add product/e2e/experience/today-teacher-first.spec.mjs
git commit -m "test: certify teacher-first Oggi journey"
```

---

## Task 5 — Exact-head qualification and stop at Human Review gate

**Files:** no new product scope. Fix only demonstrated gate failures.

**Steps:**

- [ ] Run exact-head local qualification:

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

- [ ] Re-run both targeted Playwright projects when governed E2E credentials are available.
- [ ] Push exact head to PR #718 and wait for Product CI / Human + Visual / relevant certification workflows.
- [ ] Inspect failures by exact SHA; never reuse stale GREEN evidence.
- [ ] Repair only demonstrated DOS-J1-01 failures with RED → GREEN; no opportunistic refactors.
- [ ] Confirm PR #718 remains Draft and unmerged.
- [ ] Record terminal engineering state:

```text
IMPLEMENTATION_VERIFIED / HUMAN_REVIEW_PENDING / NO_MERGE_AUTHORIZED
```

- [ ] Do **not** declare J1 PASS from automation.
- [ ] After separately authorized Beta promotion/deploy, repeat the actual authenticated Human Review without coaching:

```text
Oggi → prossima lezione → preparazione → materiali
```

J1 becomes `PASS` only if the teacher completes that sequence naturally. Otherwise it remains `BLOCKER`, and J2–J4 remain `NOT_RUN` until the blocker is resolved.

## Plan completion criteria

The plan is complete when:

- one authoritative operational loader feeds Oggi and Today Copilot;
- one pure presenter decides the teacher-first card and safe action;
- `/planner` visually matches the approved mockup’s **hierarchy** as closely as truthful capabilities allow;
- direct preparation uses existing canonical lesson authority;
- no fake resume state or mockup-only capability has been introduced;
- fallback Planner behavior still works when no lesson is safely resolvable;
- unit, product, build and browser gates are green on the exact head;
- PR #718 remains Draft/unmerged;
- DOS-CLOSE-02 is waiting only for the real J1 Human Review, not for additional feature work.
