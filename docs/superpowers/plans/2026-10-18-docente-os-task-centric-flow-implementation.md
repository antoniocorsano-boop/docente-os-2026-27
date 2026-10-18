# Docente OS Task-Centric Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved teacher-first flow `OGGI → PREPARA → MATERIALI → VISUALIZZA MATERIALE → CONDUCI → OSSERVA → REGISTRA → CONTINUA` by recomposing existing Docente OS capabilities without creating a second lesson, materials, curriculum, or continuity authority.

**Architecture:** Keep the existing lesson workspace, repositories, annual-plan authority, timetable authority, TeachingSession model and preparation-approval boundary. Make `Oggi` the only primary daily cockpit; use a shared persistent Lesson Shell across the lesson workspace and task-aware material viewer; extract the existing `Riutilizza / Adatta / Crea` capability from the broader design tools; keep post-registration continuity inside the lesson task before broader navigation. `Classe` remains voluntary longitudinal context; `Progetta`, `Conoscenza`, `Piano annuale`, Atlas and Studio Atlas remain subordinate/exploratory capabilities.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript 5.9.2, Node 22.x, existing Supabase repositories, `node:test`/`tsx`, Playwright experience tests, existing Docente OS CSS and Lucide icons.

**Spec:** `docs/superpowers/specs/2026-10-18-docente-os-task-centric-flow-architecture-design.md`

**Supporting contracts:**
- `docs/superpowers/specs/2026-10-18-docente-os-task-centric-gap-matrix.md`
- `docs/superpowers/specs/2026-10-18-docente-os-task-centric-p0-mockup-contract.md`
- `docs/superpowers/evidence/2026-10-18-docente-os-task-centric-p0-visual-review.md` — `PASS / VISUAL FLOW CONTRACT FROZEN`

## Global Constraints

- Implementation baseline is `develop@692dcce6b6b2d75c45780d147118f6436a6704d7` unless an explicitly approved integration advances `develop` first.
- PR #719 remains documentation/design only. Product implementation uses a separate branch and PR.
- The teacher-visible primary graph is exactly `OGGI → PREPARA → MATERIALI → VISUALIZZA MATERIALE → CONDUCI → OSSERVA → REGISTRA → CONTINUA`.
- `CLASSE` is voluntary longitudinal access; `ESPLORA` is outside the primary task flow.
- Focused views: one primary CTA, at most two secondary actions, one dominant professional object, no technical codes at first level, no mandatory cross-domain navigation.
- No database migration, new lesson/material store, new curriculum/continuity authority, or new teacher-facing macro-section.
- Do not change Arena/curriculum authority, annual-plan status semantics, preparation-approval semantics, TeachingSession authority, or timetable authority.
- Do not fabricate class, lesson, block, occurrence, Atlas catalogue, Atlas availability, or Studio Atlas handoff.
- Atlas appears only when the existing qualified resolver returns a real suggestion; provider identity is provenance, not navigation taxonomy.
- Studio Atlas runtime activation remains out of scope.
- Opening a Knowledge material from PREPARE preserves class + lesson + task identity and a safe return path. Full Knowledge management appears only by deliberate disclosure.
- Global navigation may be visually subordinate in focused lesson work, but accessibility escape paths, search and profile remain reachable.
- No production deploy. Beta promotion needs separate explicit authorization after exact-head qualification.
- Automated gates never convert final unaided teacher Human Review to PASS.

## Review Focus

1. **Canonical lesson unresolved:** explain uncertainty in task language; never silently dump the teacher into `Classi → Progetta`. Owned by Task 1.
2. **No qualified materials / no Atlas:** PREPARA remains usable; no synthetic provider card. Owned by Task 3.
3. **Approval states `NEEDS_APPROVAL / STALE / CURRICULUM_REQUIRED`:** recomposition must not bypass the existing gate. Owned by Task 3.
4. **Registration failure/browser-storage failure:** CONTINUA appears only after authoritative success; entered data remains retryable. Owned by Task 6.
5. **Focused material missing readable text or malicious `returnTo`:** truthful empty state and sanitized navigation. Owned by Task 4.

---

## File Structure

### New shared/focused units

- `product/src/components/lesson-task/lesson-shell.tsx` — shared persistent class/lesson/phase shell usable from lesson routes and task-aware Knowledge.
- `product/src/components/lesson-task/lesson-shell.css` — shell/phase rail styles.
- `product/src/components/lesson-task/lesson-shell-contract.test.ts` — shell semantics and no technical-code leakage.
- `product/src/components/app-shell/focused-shell-contract.test.ts` — focused AppShell chrome contract.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials-panel.tsx` — extracted `Riutilizza / Adatta / Crea` subtask, reusing existing writes.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continue-view.tsx` — post-receipt continuation screen.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.ts` — pure truthful continuation presenter.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.test.ts`.

### Existing files to recompose

- `product/src/app/planner/page.tsx`
- `product/src/app/planner/today-teaching-focus-card.tsx`
- `product/src/app/planner/today-home.css`
- `product/src/core/presentation/today-teaching-focus.ts`
- `product/src/components/app-shell/app-shell.tsx`
- `product/src/components/app-shell/navigation.ts`
- `product/src/components/app-shell/navigation.test.ts`
- `product/src/app/app-shell.css`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.tsx`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-workspace.css`
- `product/src/app/knowledge/[assetId]/page.tsx`
- `product/src/app/knowledge/knowledge-focus.css`
- `product/src/core/presentation/task-continuity.ts`
- `product/src/app/classi/[sectionId]/page.tsx`
- `product/src/app/classi/class-workspace-model.ts`
- `product/src/app/classi/class-workspace-model.test.ts`
- existing E2E specs listed in Task 8.
- `product/package.json` only to register newly created unit/contract tests in the explicit `npm test` command.

---

### Task 1: Make Oggi the single primary daily cockpit

**Files:**
- Modify: `product/src/core/presentation/today-teaching-focus.ts`
- Create: `product/src/core/presentation/today-teaching-focus.test.ts`
- Modify: `product/src/app/planner/today-teaching-focus-card.tsx`
- Modify: `product/src/app/planner/page.tsx`
- Modify: `product/src/app/planner/today-home.css`
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/src/components/app-shell/navigation.test.ts`
- Modify: `product/src/components/app-shell/app-shell.tsx`
- Modify: `product/package.json`
- Test: `product/e2e/experience/today-teacher-first.spec.mjs`

**Interfaces:**
- Consumes: `NextLessonPreparation`, `buildLessonWorkspaceHref(sectionId, blockId, 'prepare')`, current `TodayTeachingFocus`.
- Produces: direct canonical PREPARE when `sectionId + canonical blockId` exist; explicit task-language uncertainty otherwise; primary mobile/work navigation `Oggi / Classi / Orario / Altro`.

- [ ] **Step 1: Write RED unit tests**

```ts
test('canonical next lesson points directly to PREPARE', () => {
  const focus = buildTodayTeachingFocus(canonicalPreparationFixture)
  assert.equal(focus?.action?.kind, 'PREPARE')
  assert.equal(focus?.action?.label, 'Prepara lezione')
  assert.equal(focus?.action?.href, '/classi/section-3e/lezioni/B01?mode=prepare')
})

test('unresolved lesson never turns class fallback into preparation continuity', () => {
  const focus = buildTodayTeachingFocus(unresolvedPreparationFixture)
  assert.equal(focus?.action?.kind, 'CLASS')
  assert.equal(focus?.continuity, null)
})
```

- [ ] **Step 2: Verify RED**

From `product/`:

`npx tsx --test src/core/presentation/today-teaching-focus.test.ts`

Expected: unresolved-continuity assertion fails on baseline.

- [ ] **Step 3: Implement minimal focus-model correction**

Keep the existing action union and canonical PREPARE href. Build `continuity` only when `action.kind === 'PREPARE'`. Never invent a block when `canonicalLesson?.blockId` is absent.

- [ ] **Step 4: Recompose Oggi UI**

In `today-teaching-focus-card.tsx`:
- PREPARE is the only dominant CTA when canonical;
- unresolved case states `Non riesco ancora a collegare con certezza la prossima fase.` (or equivalent approved task-language copy) and keeps `Apri la classe` secondary;
- no technical block/UDA identifiers first-level.

In `planner/page.tsx`, do not render `TodayQuickActions` as a competing action grid when a `teachingFocus` exists. Keep remainder-of-day content below the focus.

- [ ] **Step 5: Remove Home from primary navigation without deleting its route**

In `navigation.ts`:
- `MOBILE_NAVIGATION_KEYS = ['today', 'classes', 'timetable']`;
- `NAVIGATION_GROUPS` → `Adesso` contains `today` only;
- retain the `home` item/route for compatibility.

In `app-shell.tsx`, brand links point to `/planner`, not `/`.

- [ ] **Step 6: Extend navigation tests and run GREEN**

`npx tsx --test src/components/app-shell/navigation.test.ts src/core/presentation/today-teaching-focus.test.ts`

Expected: PASS; mobile work items are `Oggi / Classi / Orario`, while secondary/explore functions remain reachable.

- [ ] **Step 7: Tighten J1 browser contract**

In `today-teacher-first.spec.mjs`, canonical next lesson must go directly to `?mode=prepare`; no required `/classi/{id}` or `/progetta` waypoint. Preserve all existing HVA fixture isolation, rollback and fail-closed rules.

- [ ] **Step 8: Verify and commit**

`npm run typecheck && npx tsx --test src/components/app-shell/navigation.test.ts src/core/presentation/today-teaching-focus.test.ts`

```bash
git add product/src/core/presentation/today-teaching-focus* product/src/app/planner \
  product/src/components/app-shell product/e2e/experience/today-teacher-first.spec.mjs product/package.json
git commit -m "feat: make Oggi the teacher-first cockpit"
```

---

### Task 2: Add shared Lesson Shell and focused AppShell mode

**Files:**
- Create: `product/src/components/lesson-task/lesson-shell.tsx`
- Create: `product/src/components/lesson-task/lesson-shell.css`
- Create: `product/src/components/lesson-task/lesson-shell-contract.test.ts`
- Create: `product/src/components/app-shell/focused-shell-contract.test.ts`
- Modify: `product/src/components/app-shell/app-shell.tsx`
- Modify: `product/src/app/app-shell.css`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- Modify: `product/package.json`

**Interfaces:**

```ts
export type LessonShellMode = 'prepare' | 'teach' | 'observe' | 'record'

export type LessonShellProps = {
  sectionLabel: string
  lessonTitle: string
  mode: LessonShellMode
  children: React.ReactNode
}
```

`AppShellProps` gains `focusMode?: boolean`, default `false`.

- [ ] **Step 1: Write RED shell contracts**

Assert:
- AppShell exposes `focusMode?: boolean` and applies a stable focused class;
- LessonShell shows class, human lesson title, four phases `Prepara / Conduci / Osserva / Registra`;
- exactly one phase has `aria-current="step"`;
- no `B01`, `CAN-PACK`, UUID or provider metadata is generated by LessonShell.

- [ ] **Step 2: Verify RED**

`npx tsx --test src/components/app-shell/focused-shell-contract.test.ts src/components/lesson-task/lesson-shell-contract.test.ts`

Expected: FAIL; files/prop absent.

- [ ] **Step 3: Implement `AppShell focusMode`**

Focused CSS visually subordinates sidebar/bottom nav while retaining skip link, search/command, profile and a clear task exit. Do not remove future escape capability merely to match a screenshot.

- [ ] **Step 4: Implement shared `LessonShell`**

Phase rail is orientation, not an authority bypass: future phases are not made freely clickable around the preparation gate.

- [ ] **Step 5: Wrap the lesson workspace**

In `page.tsx`, keep all current mode/approval authorization. Render `<AppShell ... focusMode>` and wrap the selected mode client in `<LessonShell sectionLabel={sectionLabel} lessonTitle={projection.title} mode={mode}>`.

- [ ] **Step 6: Verify and commit**

`npm run typecheck && npx tsx --test src/components/app-shell/focused-shell-contract.test.ts src/components/lesson-task/lesson-shell-contract.test.ts`

```bash
git add product/src/components/lesson-task product/src/components/app-shell \
  product/src/app/app-shell.css 'product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx' product/package.json
git commit -m "feat: add persistent lesson task shell"
```

---

### Task 3: Recompose PREPARA and extract Materials

**Files:**
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials-panel.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.css`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`

**Interfaces:**

```ts
type LessonMaterialsPanelProps = {
  sectionId: string
  sectionLabel: string
  blockId: string
  projectionId: string
  lessonTitle: string
  extensions: LessonDesignExtension[]
  knowledgeSuggestions: LessonKnowledgeSuggestion[]
  atlasSuggestions: LessonAtlasSuggestion[]
}
```

It reuses the existing `runLessonDesignWrite` intents and never creates a second write path.

- [ ] **Step 1: Point the existing material UX contract at the new component and verify RED**

Require exactly three local intent controls `Riutilizza / Adatta / Crea`; explicit attachment only; provider as provenance; truthful zero-suggestion state; create via canonical Knowledge capture; source-preserving adaptation.

`node --import tsx 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts'`

Expected: FAIL because `lesson-materials-panel.tsx` does not exist.

- [ ] **Step 2: Extract Materials from `LessonDesignTools`**

Move only material intent UI and required helpers. Keep existing write intents (`attach-atlas`, `attach-knowledge`, `revise`, `accept`, `remove`) and source-preservation rules. `LessonDesignTools` remains advanced enrichment/proposals and must not render another material chooser.

- [ ] **Step 3: Promote Materials in PREPARA**

Above full-design disclosure, show objective, readiness, material summary/entry and one approval/proceed CTA. `Vedi progettazione completa` keeps sequence/outcomes/enrichment/detail.

Do not weaken `NEEDS_APPROVAL`, `STALE`, `CURRICULUM_REQUIRED`, or approved-to-teach transitions. Intent switching must never approve or attach implicitly.

- [ ] **Step 4: Test zero-provider and approval states**

Add assertions that zero Atlas/Knowledge suggestions do not render fake providers and all approval states preserve current authority semantics.

- [ ] **Step 5: Verify and commit**

`node --import tsx 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts' && npm run typecheck`

```bash
git add 'product/src/app/classi/[sectionId]/lezioni/[blockId]'
git commit -m "feat: make materials a preparation subtask"
```

---

### Task 4: Make Knowledge preview preserve the Lesson Shell

**Files:**
- Modify: `product/src/core/presentation/task-continuity.ts`
- Modify/create its exact test under `product/src/core/presentation/`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials-panel.tsx`
- Modify: `product/src/app/knowledge/[assetId]/page.tsx`
- Modify: `product/src/app/knowledge/knowledge-focus.css`
- Reuse: `product/src/components/lesson-task/lesson-shell.tsx`
- Test: `product/e2e/experience/lesson-materials.spec.mjs`

**Interfaces:**
- Consumes: `buildTaskAwareKnowledgeHref`, `sanitizeInternalReturnTo`, query `section`/`block`, current academic annual-plan snapshot, `resolveRuntimeHumanTaskLessonProjection`.
- Produces: authoritative focused lesson context when section/block resolve; safe generic focused context otherwise; exact return to PREPARE.

- [ ] **Step 1: Extend task-continuity tests**

Pin encoded PREPARE return path and rejection of external/protocol-relative/backslash return targets.

- [ ] **Step 2: Use task-aware Knowledge preview links from Materials**

Knowledge preview links include `mode=prepare`, `section`, `block`, and exact PREPARE `returnTo`. Atlas remains its real external/public preview only when qualified.

- [ ] **Step 3: Resolve class + lesson context server-side in focused Knowledge**

When `taskMode === 'prepare'` and `query.section/query.block` exist, resolve the section from the active annual snapshot, derive grade/block from the canonical model, then call `resolveRuntimeHumanTaskLessonProjection`. Do **not** trust a query-supplied lesson title as authority.

If resolution succeeds, render shared `LessonShell` with authoritative `sectionLabel + projection.title + mode='prepare'`. If not, retain a truthful generic focused context and safe return link; do not invent identity.

- [ ] **Step 4: Recompose the focused Knowledge branch**

Use `<AppShell ... focusMode active="classes">`. First level: task return, resource type/title, provenance, readable preview, primary `Usa nella lezione`/return action as supported by the existing material attachment path, up to two secondary actions (`Adatta`, `Apri originale`) when truthful. Hide visible block IDs, processing/generation internals, professional-context editing and generic task creation. Keep one disclosure linking to full Knowledge management.

If readable text is absent, keep the existing truthful empty-state fallback.

- [ ] **Step 5: Add browser assertions**

From PREPARE open a Knowledge suggestion and assert: task context remains, `Torna alla preparazione` exists, full-management headings are absent first-level, explicit full-sheet exit remains.

- [ ] **Step 6: Verify and commit**

`npm run typecheck && node --import tsx 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts'`

Then run the focused `lesson-materials.spec.mjs` in the normal browser-certification environment.

```bash
git add product/src/core/presentation/task-continuity* \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials-panel.tsx' \
  'product/src/app/knowledge/[assetId]/page.tsx' product/src/app/knowledge/knowledge-focus.css \
  product/e2e/experience/lesson-materials.spec.mjs
git commit -m "feat: keep material preview inside the lesson task"
```

---

### Task 5: Align CONDUCI and OSSERVA to the shared shell

**Files:**
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-workspace.css`
- Test: `product/src/app/classi/[sectionId]/lezioni/lesson-observation-model.test.ts`
- Test: `product/e2e/experience/classroom-cockpit.spec.mjs`

**Interfaces:**
- Consumes: LessonShell, accepted lesson resources, existing observation draft/sessionStorage model.
- Produces: task-body views only; no new teaching-session/observation persistence.

- [ ] **Step 1: Tighten browser assertions first**

CONDUCI: current step/instruction + already selected material actions; no design/authoring controls; primary progress toward observation. OSSERVA: concise lesson criteria + expected evidence; optional note remains; full rubric is disclosure.

- [ ] **Step 2: Establish baseline and RED**

`npx tsx --test 'src/app/classi/[sectionId]/lezioni/lesson-observation-model.test.ts'`

Existing model tests remain PASS; new browser hierarchy assertions should expose remaining UI delta.

- [ ] **Step 3: Remove duplicate class/title/phase identity from clients**

LessonShell owns identity. Preserve lesson sequence, accepted-extension ordering, storage keys and observation semantics.

- [ ] **Step 4: Verify and commit**

`npm run typecheck && npx tsx --test 'src/app/classi/[sectionId]/lezioni/lesson-observation-model.test.ts'`

Run `classroom-cockpit.spec.mjs` in browser certification.

```bash
git add 'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]'/*.css \
  product/e2e/experience/classroom-cockpit.spec.mjs
git commit -m "feat: align teach and observe with the lesson task"
```

---

### Task 6: Keep REGISTRA inside the task and add truthful CONTINUA

**Files:**
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.ts`
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.test.ts`
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continue-view.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`
- Modify: `product/package.json`
- Test: `product/e2e/experience/lesson-close-task-first.spec.mjs`
- Test: `product/e2e/experience/lesson-register.spec.mjs`

**Interfaces:**

```ts
type LessonContinuation = {
  summary: string
  nextActivity: string | null
  primary: { label: string; href: string }
  secondary: { label: 'Torna a Oggi'; href: '/planner' } | null
}

function buildLessonContinuation(input: {
  lessonTitle: string
  nextActivity: string | null
  prepareHref: string
}): LessonContinuation
```

No new persisted status is created. Existing annual-plan statuses `PIANIFICATO / SVOLTO / RECUPERATO / RIMODULATO / ANNULLATO` remain authoritative. “Partial” continuity is represented only from actual session allocation/progress and/or confirmed `nextActivity`, not via a parallel status vocabulary.

- [ ] **Step 1: Write RED continuation tests**

With confirmed non-empty `nextActivity`, show it and a truthful route back to PREPARE for the current continuation context. With no next activity, do not invent the next annual-plan block; primary action returns to Oggi. Whitespace is absent.

- [ ] **Step 2: Verify RED**

`npx tsx --test 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.test.ts'`

- [ ] **Step 3: Implement pure presenter and Continue view**

Presentation only; it never advances annual-plan state.

- [ ] **Step 4: Change registration success behavior**

After authoritative `recordLessonExecution` succeeds: clear existing lesson/observation storage as today, retain receipt in local success state, render `LessonContinueView`, show confirmed next activity when present, and expose presenter actions. Remove immediate `router.push(classHref)`.

On error: no CONTINUA, no storage clear, keep entered state/retry path.

- [ ] **Step 5: Tighten close/register browser tests**

Successful registration shows `Lezione registrata` + `Prossimo passo` before broader navigation; `Torna a Oggi` exists; failure remains retryable; old automatic class redirect is absent.

- [ ] **Step 6: Verify and commit**

`npx tsx --test 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.test.ts' && npm run typecheck`

Run both existing close/register Playwright specs in browser certification.

```bash
git add 'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.ts' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.test.ts' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continue-view.tsx' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx' \
  product/e2e/experience/lesson-close-task-first.spec.mjs \
  product/e2e/experience/lesson-register.spec.mjs product/package.json
git commit -m "feat: continue from the recorded lesson"
```

---

### Task 7: Recompose Classe as voluntary longitudinal context

**Files:**
- Modify: `product/src/app/classi/class-workspace-model.ts`
- Modify: `product/src/app/classi/class-workspace-model.test.ts`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify: `product/src/app/classi/class-workspace-operational.css`
- Test: `product/e2e/experience/critical-journeys.spec.mjs`

**Interfaces:**
- Consumes: existing learning focus, annual-plan progress, TeachingSession data, modeled next lesson, task-aware links.
- Produces: first-level next lesson + recent actual continuity + progress/recent lessons. Advanced planning/material/recording remains behind existing disclosure.

- [ ] **Step 1: Add RED class-model assertions**

Next modeled lesson is first; recent actual session/continuity comes from recorded reality; no modeled lesson gives truthful completion/uncertainty; class can link to PREPARE but Oggi never requires Class as a waypoint.

- [ ] **Step 2: Verify RED**

`npx tsx --test src/app/classi/class-workspace-model.test.ts`

- [ ] **Step 3: Recompose first-level class page using existing loaded authorities**

Promote next lesson, latest actual state/continuity, progress and recent lessons. Demote advanced panels. Add no new data source unless an approved field cannot be obtained from already loaded authoritative data.

- [ ] **Step 4: Verify and commit**

`npx tsx --test src/app/classi/class-workspace-model.test.ts && npm run typecheck`

Run affected critical-journey browser checks.

```bash
git add product/src/app/classi/class-workspace-model* \
  'product/src/app/classi/[sectionId]/page.tsx' product/src/app/classi/class-workspace-operational.css \
  product/e2e/experience/critical-journeys.spec.mjs
git commit -m "feat: make class a voluntary continuity view"
```

---

### Task 8: Exact-flow browser qualification and regression closure

**Files:**
- Modify: `product/e2e/experience/today-teacher-first.spec.mjs`
- Modify: `product/e2e/experience/lesson-materials.spec.mjs`
- Modify: `product/e2e/experience/classroom-cockpit.spec.mjs`
- Modify: `product/e2e/experience/lesson-close-task-first.spec.mjs`
- Modify: `product/e2e/experience/accessibility.spec.mjs` only if new focused selectors/coverage are needed.
- Optional create: `product/e2e/experience/task-centric-lesson-flow.spec.mjs` only if one composed journey cannot be expressed cleanly in the existing specs.

**Interfaces:**
- Consumes: all prior contracts.
- Produces: exact-head engineering evidence for the frozen flow without weakening J1/HVA.

- [ ] **Step 1: Add one composed teacher-journey assertion**

Prove:

`Oggi → PREPARA → MATERIALI → focused preview → PREPARA → CONDUCI → OSSERVA → REGISTRA → CONTINUA`

Assert class + lesson identity persists; no mandatory `/progetta`; no full Knowledge-management chrome; Atlas only when truly qualified; one dominant CTA per focused state; CONTINUA precedes broad navigation; Class remains directly reachable but optional.

- [ ] **Step 2: Obtain a real RED if integration is incomplete**

Use the governed Browser Certification/HVA workflow. No fixture weakening, synthetic clock, alternate timetable authority, or NOT_APPLICABLE shortcut.

- [ ] **Step 3: Fix integration seams only**

Allowed: return href, focus CSS, task label, selector semantics. No new feature scope.

- [ ] **Step 4: Run full local product qualification**

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 5: Run exact-head governed CI**

Require same-head Product CI PASS, Browser Certification/CV2 PASS, strict J1 mobile+desktop PASS, and accessibility/WCAG gate PASS. Do not rerun deterministic failures hoping for GREEN; diagnose first.

- [ ] **Step 6: Independent whole-branch review**

Review for authority duplication, approval bypass, domain leakage, synthetic Atlas/Studio Atlas claims, Explore regressions, mobile overflow and touch-target/accessibility regressions.

- [ ] **Step 7: Stop at the integration/Beta authorization boundary**

Report exact head and evidence. Merge/fast-forward and Beta promotion require separate explicit authorization. After authorized Beta promotion, final teacher Human Review is unaided; automation cannot mark it PASS.

---

## Execution Order and Review Gates

Execute strictly:

`Task 1 Oggi → Task 2 Lesson Shell → Task 3 PREPARA/Materiali → Task 4 focused viewer → Task 5 Conduci/Osserva → Task 6 Registra/Continua → Task 7 Classe → Task 8 qualification`

Each task completes its RED → GREEN cycle and commit before the next task. Do not batch failures from multiple tasks into one commit.

Implementation uses a separate product branch from the then-approved `develop`:

`feat/dos-ux-02-task-centric-flow`

Suggested PR:

`DOS-UX-02 — task-centric teacher flow implementation`

PR #719 remains the design source and is not converted into the product PR.

## Definition of Done

Engineering is complete only when, on one exact head:

- primary teacher path matches the frozen graph;
- Oggi is the unambiguous daily cockpit;
- canonical lesson opens PREPARA directly;
- class + lesson identity persists through focused material preview and lesson phases;
- Materials are a PREPARA subtask with `Riutilizza / Adatta / Crea`;
- focused Knowledge does not become Knowledge management;
- Atlas is only real qualified provenance/source;
- CONDUCI and OSSERVA are operational, not authoring surfaces;
- successful REGISTRA yields CONTINUA before leaving the task;
- Classe is useful but optional;
- approval, timetable, curriculum, TeachingSession and annual-plan authorities remain unchanged;
- `npm run test`, `typecheck`, `lint`, `build`, Product CI, Browser Certification and accessibility all PASS;
- any Beta promotion has separate explicit authorization;
- runtime Human Review remains pending until performed manually.
