# Docente OS Task-Centric Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved teacher-first flow `OGGI → PREPARA → MATERIALI → VISUALIZZA MATERIALE → CONDUCI → OSSERVA → REGISTRA → CONTINUA` by recomposing existing Docente OS capabilities without creating a second lesson, materials, curriculum, or continuity authority.

**Architecture:** Keep the current authoritative runtime stores and lesson workspace route. Make `Oggi` the only primary daily cockpit, add a persistent focused Lesson Shell around the existing `prepare / teach / observe / record` modes, extract the existing material-intent UI from the broader design tools, make Knowledge task-aware visually as well as in routing, and keep post-registration continuity inside the lesson task before returning to broader navigation. `Classe` remains voluntary longitudinal context; `Progetta`, `Conoscenza`, `Piano annuale`, Atlas and Studio Atlas remain subordinate/exploratory capabilities.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript 5.9.2, Node 22.x, Supabase repositories already in the product, `node:test`/`tsx`, Playwright experience tests, existing Docente OS CSS and Lucide icons.

**Spec:** `docs/superpowers/specs/2026-10-18-docente-os-task-centric-flow-architecture-design.md`

**Supporting contracts:**
- `docs/superpowers/specs/2026-10-18-docente-os-task-centric-gap-matrix.md`
- `docs/superpowers/specs/2026-10-18-docente-os-task-centric-p0-mockup-contract.md`
- `docs/superpowers/evidence/2026-10-18-docente-os-task-centric-p0-visual-review.md` — `PASS / VISUAL FLOW CONTRACT FROZEN`

## Global Constraints

- Implementation baseline is `develop@692dcce6b6b2d75c45780d147118f6436a6704d7` unless an explicitly approved integration of PR #719 advances `develop` first.
- PR #719 remains documentation/design only; product implementation must use a separate branch and PR.
- The teacher-visible primary graph is exactly `OGGI → PREPARA → MATERIALI → VISUALIZZA MATERIALE → CONDUCI → OSSERVA → REGISTRA → CONTINUA`.
- `CLASSE` is voluntary longitudinal access, not a mandatory waypoint.
- `ESPLORA` is outside the primary task flow.
- Focused views expose one primary CTA, at most two secondary actions, one dominant professional object, no technical codes at first level, and no mandatory cross-domain navigation.
- Do not add a database migration, lesson store, material store, curriculum authority, or teacher-facing macro-section for this work.
- Do not change Arena/curriculum authority, annual-plan status semantics, preparation-approval semantics, teaching-session authority, or timetable authority.
- Do not fabricate a lesson, class, block, timetable occurrence, Atlas catalogue, Atlas availability, or Studio Atlas handoff.
- Atlas appears only when the existing qualified suggestion resolver returns a real suggestion; provider identity remains provenance, not navigation taxonomy.
- Studio Atlas runtime activation remains out of scope.
- Opening a Knowledge material from PREPARE must preserve the lesson task and return path; the full Knowledge management surface remains available only by deliberate disclosure.
- Global navigation may be visually subordinated in focused lesson work, but accessibility escape paths and the command/navigation surfaces must remain reachable.
- No production deploy. Beta promotion requires separate explicit authorization after exact-head engineering qualification.
- Automated gates never convert the final unaided teacher Human Review to PASS.

## Review Focus

1. **Canonical lesson unresolved:** Oggi must explain uncertainty in task language and must not silently dump the teacher into `Classi → Progetta`; test this in Task 1.
2. **Material provider unavailable or empty:** PREPARA must remain usable with zero Atlas/Knowledge suggestions and must not show a false Atlas capability; test this in Task 3.
3. **Preparation approval `NEEDS_APPROVAL / STALE / CURRICULUM_REQUIRED`:** recomposition must not bypass or weaken the existing approval gate; test this in Task 3.
4. **Registration save failure or browser-storage failure:** entered facts/notes must remain recoverable and CONTINUA must appear only after the authoritative receipt succeeds; test this in Task 6.
5. **Focused material with missing readable text or malicious `returnTo`:** the viewer must stay inside the task safely, show the existing empty-state fallback, and sanitize return navigation; test this in Task 4.

---

## File Structure

### New focused UI units

- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.tsx` — persistent class/lesson/phase shell; presentation only.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.css` — focused shell and phase rail styling.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials-panel.tsx` — extracted `Riutilizza / Adatta / Crea` material subtask using existing actions and suggestion types.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continue-view.tsx` — post-receipt continuity state; no new persistence.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.ts` — pure presentation model for the post-registration next step.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.test.ts` — unit contract for truthful continuity.
- `product/src/components/app-shell/focused-shell-contract.test.ts` — contract that focused lesson work subordinates global chrome without removing escape/navigation capability.

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
- `product/e2e/experience/today-teacher-first.spec.mjs`
- `product/e2e/experience/lesson-close-task-first.spec.mjs`
- `product/e2e/experience/lesson-materials.spec.mjs`
- `product/e2e/experience/classroom-cockpit.spec.mjs`
- `product/e2e/experience/accessibility.spec.mjs`
- `product/package.json` only when a new unit test must be added to the explicit `npm test` list.

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
- Consumes: existing `NextLessonPreparation`, `buildLessonWorkspaceHref(sectionId, blockId, 'prepare')`, and the current `TodayTeachingFocus` model.
- Produces: the unchanged canonical PREPARE href when `sectionId + canonical blockId` exist; an explicit uncertainty presentation when they do not; primary navigation `Oggi / Classi / Orario / Altro` with Home no longer competing as a daily cockpit.

- [ ] **Step 1: Write the failing unit tests for canonical PREPARE and unresolved fallback**

Add `today-teaching-focus.test.ts` with two contracts:

```ts
test('canonical next lesson points directly to PREPARE', () => {
  const focus = buildTodayTeachingFocus(canonicalPreparationFixture)
  assert.equal(focus?.action?.kind, 'PREPARE')
  assert.equal(focus?.action?.label, 'Prepara lezione')
  assert.equal(focus?.action?.href, '/classi/section-3e/lezioni/B01?mode=prepare')
})

test('unresolved lesson never presents class navigation as if it were preparation', () => {
  const focus = buildTodayTeachingFocus(unresolvedPreparationFixture)
  assert.equal(focus?.action?.kind, 'CLASS')
  assert.equal(focus?.continuity, null)
})
```

The unresolved case may still expose `Apri la classe` as a deliberate secondary escape; it must not label it `Prepara lezione` and must not make `Riprendi il filo` point to that fallback.

- [ ] **Step 2: Run the new test and verify RED**

Run from `product/`:

`npx tsx --test src/core/presentation/today-teaching-focus.test.ts`

Expected: at least the unresolved-continuity assertion fails on the baseline.

- [ ] **Step 3: Implement the minimal focus-model correction**

In `today-teaching-focus.ts`, keep the existing action union and canonical PREPARE behavior. Build `continuity` only when `action.kind === 'PREPARE'`. Do not invent a block when `canonicalLesson?.blockId` is absent.

- [ ] **Step 4: Recompose the Oggi card and remove competing quick actions from the focused state**

In `today-teaching-focus-card.tsx`:
- canonical PREPARE remains the single dominant CTA;
- when `action.kind === 'CLASS'`, render an uncertainty message such as `Non riesco ancora a collegare con certezza la prossima fase.` and keep `Apri la classe` visually secondary;
- do not show technical block/UDA codes.

In `planner/page.tsx`, stop rendering `TodayQuickActions` as a second action grid when `teachingFocus` is present. Keep the day remainder below the primary card.

- [ ] **Step 5: Make Oggi the primary navigation entry without deleting Home functionality**

In `navigation.ts`:
- set `MOBILE_NAVIGATION_KEYS` to `['today', 'classes', 'timetable']`; the existing separate `Naviga` button is the fourth mobile item;
- change the `Adesso` navigation group to contain `today` only;
- leave the `home` route/item defined for compatibility, but remove it from primary work navigation.

In `app-shell.tsx`, change brand links from `/` to `/planner` so the product logo returns to the daily cockpit. Do **not** delete `product/src/app/page.tsx` in this tranche.

- [ ] **Step 6: Extend navigation tests**

Assert:
- mobile work navigation resolves `Oggi`, `Classi`, `Orario` in that order;
- `Home` is not in the primary `Adesso` group;
- secondary/explore groups remain reachable.

Run:

`npx tsx --test src/components/app-shell/navigation.test.ts src/core/presentation/today-teaching-focus.test.ts`

Expected: PASS.

- [ ] **Step 7: Tighten the existing J1 browser contract, without weakening its HVA fixture rules**

Update `today-teacher-first.spec.mjs` so that when a canonical lesson exists it asserts the first lesson CTA resolves directly to `?mode=prepare`, and the teacher is not required to visit `/classi/{id}` or `/progetta` first. Keep all existing fixture isolation/rollback logic and fail-closed behavior.

- [ ] **Step 8: Run focused static/unit verification**

Run:

`npm run typecheck && npx tsx --test src/components/app-shell/navigation.test.ts src/core/presentation/today-teaching-focus.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add product/src/core/presentation/today-teaching-focus.ts \
  product/src/core/presentation/today-teaching-focus.test.ts \
  product/src/app/planner product/src/components/app-shell \
  product/e2e/experience/today-teacher-first.spec.mjs product/package.json
git commit -m "feat: make Oggi the teacher-first cockpit"
```

---

### Task 2: Add the persistent Lesson Shell and focused AppShell mode

**Files:**
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.tsx`
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.css`
- Create: `product/src/components/app-shell/focused-shell-contract.test.ts`
- Modify: `product/src/components/app-shell/app-shell.tsx`
- Modify: `product/src/app/app-shell.css`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- Modify: `product/package.json`

**Interfaces:**
- Consumes: `sectionLabel`, `projection.title`, and `LessonWorkspaceMode` from the existing lesson workspace.
- Produces:

```ts
type LessonShellMode = 'prepare' | 'teach' | 'observe' | 'record'

type LessonShellProps = {
  sectionLabel: string
  lessonTitle: string
  mode: LessonShellMode
  children: React.ReactNode
}
```

`AppShellProps` gains `focusMode?: boolean`, default `false`.

- [ ] **Step 1: Write the focused-shell RED contract**

Create `focused-shell-contract.test.ts` to assert from the real sources that:
- `AppShellProps` exposes `focusMode?: boolean`;
- focused shell uses a dedicated class on the root/main column;
- `LessonShell` renders the four teacher phases `Prepara / Conduci / Osserva / Registra` and marks exactly one as current with `aria-current="step"`;
- the shell contains class label and human lesson title;
- no `B01`, `CAN-PACK`, UUID, or technical-source label is generated by the component.

- [ ] **Step 2: Run RED**

`npx tsx --test src/components/app-shell/focused-shell-contract.test.ts`

Expected: FAIL because `focusMode` and `lesson-shell.tsx` do not yet exist.

- [ ] **Step 3: Implement `AppShell focusMode`**

Add `focusMode?: boolean` to `AppShellProps`. When true, add a stable CSS class such as `dosShellFocused`. CSS must subordinate sidebar/bottom navigation visually on focused lesson work while preserving:
- skip link;
- search/command access;
- profile access;
- content focus target.

Do not remove navigation from the DOM solely to obtain the visual result unless accessibility tests prove the alternate exit path is sufficient.

- [ ] **Step 4: Implement `LessonShell`**

Render:
- `sectionLabel`;
- `lessonTitle`;
- non-technical phase rail with one `aria-current="step"`;
- children.

The phase rail is orientation, not an authority bypass: do not make future phases clickable in a way that circumvents preparation approval.

- [ ] **Step 5: Wrap the existing lesson mode switch in the shell**

In `page.tsx`, use `<AppShell ... focusMode>` and wrap the selected client in `<LessonShell sectionLabel={sectionLabel} lessonTitle={projection.title} mode={mode}>`.

Do not change mode authorization, approval redirects, repositories, or data loading.

- [ ] **Step 6: Run contract + typecheck**

`npm run typecheck && npx tsx --test src/components/app-shell/focused-shell-contract.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add product/src/components/app-shell product/src/app/app-shell.css \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]' product/package.json
git commit -m "feat: add focused lesson shell"
```

---

### Task 3: Recompose PREPARA and extract the Materials subtask

**Files:**
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials-panel.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.css`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`

**Interfaces:**
- Consumes: existing `LessonDesignExtension[]`, `LessonKnowledgeSuggestion[]`, `LessonAtlasSuggestion[]`, `runLessonDesignWrite`, and existing explicit attachment/revision actions.
- Produces:

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

No new write path is introduced.

- [ ] **Step 1: Move the existing material-intent contract to the new component and make it fail first**

Update `lesson-material-task-ux-contract.test.ts` to load `lesson-materials-panel.tsx` and require:
- exactly three intent controls `Riutilizza / Adatta / Crea`;
- intent switches are local UI state only;
- Knowledge and Atlas attachment remain explicit server writes;
- provider is provenance, not the primary taxonomy;
- zero suggestions render a truthful empty state and **no** Atlas placeholder;
- create reuses canonical Knowledge capture and never auto-attaches.

Run:

`node --import tsx 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts'`

Expected: FAIL because the new component does not exist.

- [ ] **Step 2: Extract `LessonMaterialsPanel` without duplicating authority**

Move only the material preparation UI and the helper functions it needs from `lesson-design-tools.tsx`. Keep the same `runLessonDesignWrite` intents (`attach-atlas`, `attach-knowledge`, `revise`, `accept`, `remove`) and existing source-preservation rules.

`LessonDesignTools` remains the advanced enrichment/proposal surface and must not render a second copy of the material chooser.

- [ ] **Step 3: Promote materials into PREPARA**

In `lesson-prepare-client.tsx`:
- keep objective and preparation summary above the fold;
- render a compact `Materiali della lezione` summary/entry before the primary approval CTA;
- render `LessonMaterialsPanel` as the explicit MATERIALI subtask, not inside `Vedi progettazione completa`;
- keep `Vedi progettazione completa` for sequence, outcomes, enrichment tools and technical/professional detail;
- preserve the current preparation approval state machine and `approveLessonPreparationAndProceed` action unchanged.

Do not rename an approval action in a way that hides what is being approved. The visual hierarchy may say `Lezione pronta`; the actual approval copy must remain truthful to the existing approval receipt semantics.

- [ ] **Step 4: Add approval-regression assertions**

Extend the contract test/source checks so that:
- `CURRICULUM_REQUIRED` still provides no proceed action;
- `STALE` still requires a new explicit approval;
- `APPROVED` still permits teach;
- material intent changes never invoke approval or attachment implicitly.

- [ ] **Step 5: Run focused tests**

`node --import tsx 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts' && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials-panel.tsx' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.tsx' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]'/*.css
git commit -m "feat: make materials a preparation subtask"
```

---

### Task 4: Make the Knowledge material viewer truly task-focused

**Files:**
- Modify: `product/src/core/presentation/task-continuity.ts`
- Create or modify the existing task-continuity test under `product/src/core/presentation/` to cover the exact focused return contract.
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials-panel.tsx`
- Modify: `product/src/app/knowledge/[assetId]/page.tsx`
- Modify: `product/src/app/knowledge/knowledge-focus.css`
- Test: `product/e2e/experience/lesson-materials.spec.mjs`

**Interfaces:**
- Consumes: existing `buildTaskAwareKnowledgeHref(assetId, { mode, returnTo, sectionId, blockId })` and `sanitizeInternalReturnTo`.
- Produces: focused material navigation that returns to the exact PREPARA route and presents the resource as part of the lesson task rather than as a Knowledge-management destination.

- [ ] **Step 1: Write/extend task-continuity RED tests**

Pin these exact behaviors:
- `returnTo=/classi/<section>/lezioni/<block>?mode=prepare` survives round trip;
- external/protocol-relative/backslash return targets fall back safely;
- focused PREPARE links include `mode=prepare`, `section`, `block`, and encoded `returnTo`.

Run the exact task-continuity test file with `npx tsx --test ...`.

Expected: existing sanitization tests pass; the new focused material-link assertion fails until the caller is updated.

- [ ] **Step 2: Use task-aware links from `LessonMaterialsPanel`**

For Knowledge suggestions, replace the generic `/knowledge/{assetId}` preview link with `buildTaskAwareKnowledgeHref` using the current PREPARE route as `returnTo`.

Atlas remains an external/public preview only when a real Atlas suggestion exists; do not route a fake Atlas item through Knowledge.

- [ ] **Step 3: Recompose the focused branch of `knowledge/[assetId]/page.tsx`**

When `taskMode === 'prepare'`:
- use focused AppShell presentation (`focusMode`) and do not make `Conoscenza` the dominant visual identity;
- show the task return link first;
- show human title, category/provenance, readable preview and the original-source action when available;
- remove visible block IDs and technical processing metadata from first level;
- keep `Gestisci o approfondisci questa risorsa` as the explicit exit to the full Knowledge sheet;
- if no readable text exists, retain the truthful existing empty-state message rather than fabricating content.

Full `/knowledge/{assetId}` without task mode remains unchanged as Explore/management.

- [ ] **Step 4: Add browser assertions**

In `lesson-materials.spec.mjs`, add a focused path assertion:
- open a Knowledge suggestion from PREPARE;
- URL carries task context;
- page offers `Torna alla preparazione`;
- first-level screen does not expose management-only headings such as `CONTESTO PROFESSIONALE` or `DAL CONTENUTO ALL’AZIONE`;
- explicit full-sheet disclosure remains available.

- [ ] **Step 5: Verify**

Run:

`npm run typecheck && node --import tsx 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts'`

Then run the focused Playwright spec in the repository's normal browser-certification environment.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add product/src/core/presentation/task-continuity.ts \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials-panel.tsx' \
  'product/src/app/knowledge/[assetId]/page.tsx' product/src/app/knowledge/knowledge-focus.css \
  product/e2e/experience/lesson-materials.spec.mjs
git commit -m "feat: keep material preview inside the lesson task"
```

---

### Task 5: Align CONDUCI and OSSERVA to the persistent lesson task

**Files:**
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-workspace.css`
- Modify/Test: `product/src/app/classi/[sectionId]/lezioni/lesson-observation-model.test.ts`
- Test: `product/e2e/experience/classroom-cockpit.spec.mjs`

**Interfaces:**
- Consumes: Lesson Shell from Task 2, accepted lesson resources from the existing design-extension pipeline, and existing observation draft/sessionStorage model.
- Produces: body-only task views under the shared shell; no new teaching-session or observation persistence.

- [ ] **Step 1: Add failing presentation assertions to the existing browser/contract coverage**

Pin that CONDUCI:
- shows the current step/instruction and already selected material actions;
- does not expose authoring/design controls;
- primary CTA progresses to observation.

Pin that OSSERVA:
- shows concise lesson-relevant criteria and expected evidence;
- retains the existing optional note/draft behavior;
- full criteria remain progressive disclosure rather than first-level chrome.

- [ ] **Step 2: Run the existing observation unit tests and browser spec to establish baseline behavior**

Run:

`npx tsx --test 'src/app/classi/[sectionId]/lezioni/lesson-observation-model.test.ts'`

Expected: current unit tests PASS; newly tightened browser assertions RED.

- [ ] **Step 3: Remove duplicate task identity from the clients and rely on Lesson Shell**

Keep client-specific instructions and actions only. Do not duplicate class/title/phase headers that the shell now owns.

- [ ] **Step 4: Recompose hierarchy/CSS to the frozen visual contract**

Do not alter lesson sequence resolution, accepted-extension ordering, sessionStorage keys, or observation model semantics.

- [ ] **Step 5: Verify**

`npm run typecheck && npx tsx --test 'src/app/classi/[sectionId]/lezioni/lesson-observation-model.test.ts'`

Then run `classroom-cockpit.spec.mjs` in browser certification.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx' \
  'product/src/app/classi/[sectionId]/lezioni/[blockId]'/*.css \
  product/e2e/experience/classroom-cockpit.spec.mjs
git commit -m "feat: align teach and observe with the lesson shell"
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
- Consumes: authoritative success result from `recordLessonExecution`, the teacher-entered `nextActivity`, current lesson href, and `/planner`.
- Produces:

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

No new persisted status is created. Existing annual-plan semantics `PIANIFICATO / SVOLTO / RECUPERATO / RIMODULATO / ANNULLATO` remain unchanged.

- [ ] **Step 1: Write RED continuation-model tests**

Test:
- with a non-empty confirmed `nextActivity`, CONTINUA shows it and primary CTA returns to PREPARA for the same lesson context (`Riprendi la preparazione` or equivalent truthful copy);
- with no `nextActivity`, do not invent a next block; primary CTA is `Torna a Oggi`;
- whitespace-only next activity is treated as absent.

Run:

`npx tsx --test 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.test.ts'`

Expected: FAIL because the model does not exist.

- [ ] **Step 2: Implement the pure continuation presenter**

The model may decide presentation only. It must not inspect or advance the annual plan and must not infer that the next canonical block is the teacher's next real step.

- [ ] **Step 3: Change `LessonCloseClient` success behavior**

On successful `recordLessonExecution`:
- clear the existing observation/live sessionStorage keys exactly as today;
- retain the authoritative `teachingSessionId` in local success state;
- render `LessonContinueView` instead of immediately `router.push(classHref)`;
- show the teacher's confirmed next activity when present;
- expose the safe primary/secondary actions from `buildLessonContinuation`.

On save failure:
- do not show CONTINUA;
- preserve current entered state and current retry copy;
- do not clear browser storage.

This task deliberately does **not** invent a persisted `PARZIALE` status. Any future mapping of visual labels such as “Parzialmente svolta” must reuse the authoritative annual-plan/session model in a separately proved change rather than create a parallel status vocabulary.

- [ ] **Step 4: Tighten close/register browser tests**

Assert:
- successful registration stays in the lesson task and shows `Lezione registrata` + `Prossimo passo` before any class navigation;
- `Torna a Oggi` is available;
- failure leaves form state/retry path intact;
- the old automatic class redirect is absent after success.

- [ ] **Step 5: Verify**

`npx tsx --test 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continuation-model.test.ts' && npm run typecheck`

Then run the two existing close/register Playwright specs in browser certification.

Expected: PASS.

- [ ] **Step 6: Commit**

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
- Consumes: existing `learningFocus`, annual-plan progress, teaching sessions, next modeled lesson, and existing task-aware links.
- Produces: top-level class summary with next lesson, last real registered state, next activity/continuity when available, progress, and recent lessons. Deeper planning/material management remains progressive disclosure.

- [ ] **Step 1: Extend `class-workspace-model.test.ts` with the approved longitudinal hierarchy**

Pin:
- next lesson is first when modeled;
- recent actual session/continuity is represented from recorded data, not inferred from the next plan block;
- no next modeled lesson yields a truthful completion/uncertainty state;
- class view can link to PREPARE but primary Oggi flow does not require visiting Class first.

- [ ] **Step 2: Run RED**

`npx tsx --test src/app/classi/class-workspace-model.test.ts`

Expected: new hierarchy assertions fail before recomposition.

- [ ] **Step 3: Recompose only the first-level class page**

Reuse existing loaded repositories/data. Promote:
- next lesson;
- latest actual lesson state;
- next activity/continuity;
- progress/recent lessons.

Demote advanced registration/planning/material exploration into existing disclosures. Do not add new data loading unless an approved first-level field cannot be built from already loaded authoritative data.

- [ ] **Step 4: Verify**

`npx tsx --test src/app/classi/class-workspace-model.test.ts && npm run typecheck`

Then run the affected critical-journey browser checks.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/app/classi/class-workspace-model.ts \
  product/src/app/classi/class-workspace-model.test.ts \
  'product/src/app/classi/[sectionId]/page.tsx' \
  product/src/app/classi/class-workspace-operational.css \
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
- Modify: `product/e2e/experience/accessibility.spec.mjs` only if the new focused surfaces require additional selectors/coverage.
- Optional create: `product/e2e/experience/task-centric-lesson-flow.spec.mjs` only if extending the existing specs would duplicate setup or make ownership unclear.

**Interfaces:**
- Consumes: all prior task contracts.
- Produces: exact-head engineering evidence that the real product implements the approved graph without weakening existing J1/HVA gates.

- [ ] **Step 1: Add one end-to-end teacher journey assertion**

The test must prove, with the existing governed authenticated fixture where applicable:

`Oggi → PREPARA → MATERIALI → focused preview → PREPARA → CONDUCI → OSSERVA → REGISTRA → CONTINUA`

Assertions:
- task identity remains class + lesson across the focused journey;
- no mandatory `/progetta` visit;
- no full Knowledge-management chrome during focused preview;
- Atlas appears only when an actual qualified suggestion exists;
- one primary CTA per focused state;
- after registration, CONTINUA appears before broader navigation;
- Class remains directly reachable but is not required by the primary path.

- [ ] **Step 2: Run the browser test and obtain a genuine RED if the full flow is not yet wired**

Use the repository's normal Browser Certification / HVA workflow. Do not weaken fixtures or add a NOT_APPLICABLE escape merely to obtain GREEN.

Expected before final fixes: a specific failure identifying the first broken transition, or PASS if all prior task browser tests already compose correctly.

- [ ] **Step 3: Fix only integration seams exposed by the end-to-end test**

No new feature work in this step. Typical allowed seams are return href, focus CSS, missing task label, or selector semantics.

- [ ] **Step 4: Run local/full product qualification**

From `product/`:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 5: Run exact-head governed CI**

Require:
- Product CI PASS on the exact head;
- Browser Certification/CV2 PASS on the exact head;
- existing strict `today-teacher-first.spec.mjs` PASS on mobile and desktop;
- WCAG/accessibility gate PASS;
- no database/schema replay delta unless unrelated baseline policy already requires the replay.

Do not rerun deterministic failures hoping for GREEN; diagnose first.

- [ ] **Step 6: Perform independent whole-branch review**

Review specifically for:
- authority duplication;
- accidental approval bypass;
- domain leakage in focused mode;
- synthetic Atlas/Studio Atlas claims;
- hidden regression in Home/Class/Knowledge Explore;
- mobile overflow and touch-target regressions.

- [ ] **Step 7: Stop at the Beta authorization boundary**

Engineering success is not authorization to merge or promote. Report exact head and evidence. Request separate explicit authorization for any integration/fast-forward and Beta promotion.

After authorized Beta promotion, the final teacher Human Review is unaided and must exercise the real runtime. Automation cannot mark it PASS.

---

## Execution Order and Review Gates

Execute strictly in this order:

`Task 1 Oggi → Task 2 Lesson Shell → Task 3 PREPARA/Materiali → Task 4 focused viewer → Task 5 Conduci/Osserva → Task 6 Registra/Continua → Task 7 Classe → Task 8 full qualification`

Each task must finish its RED → GREEN cycle and commit before the next task begins. Do not batch multiple task failures into one implementation commit.

The implementation branch should be created separately from PR #719, preferably from the then-current approved `develop`. Suggested branch name:

`feat/dos-ux-02-task-centric-flow`

Suggested product PR title:

`DOS-UX-02 — task-centric teacher flow implementation`

PR #719 remains the design source; it is not converted into the product PR.

## Definition of Done

Engineering is complete only when all of the following are true on the same exact head:

- the primary teacher path is the frozen task graph;
- Oggi is the unambiguous daily cockpit;
- PREPARA opens directly when the canonical lesson is known;
- focused lesson work preserves class + lesson identity;
- Materials are a PREPARA subtask with `Riutilizza / Adatta / Crea`;
- focused Knowledge preview does not become Knowledge management;
- Atlas is shown only as real qualified provenance/source;
- CONDUCI and OSSERVA remain operational, not authoring surfaces;
- REGISTRA success produces CONTINUA before leaving the task;
- Classe is useful but optional;
- existing approval, timetable, curriculum, teaching-session and annual-plan authorities are unchanged;
- `npm run test`, `typecheck`, `lint`, `build`, Product CI, Browser Certification and accessibility all PASS;
- exact-head Beta promotion, if desired, has separate explicit authorization;
- final runtime Human Review remains pending until performed manually.
