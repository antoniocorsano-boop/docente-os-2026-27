# Docente OS Product IA Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Docente OS information-architecture reset around **Oggi · Orario · Classi · Altro**, with **Lezione** as the single contextual operational workspace, while preserving every professional capability and governance boundary.

**Architecture:** Keep domain authority, Supabase persistence/RLS, timetable lifecycle, TeachingSession/Diario, curriculum gates, material provenance/revalidation, Drive synchronization, authentication and MFA unchanged. Implement the reset in presentation and routing through small pure projection/resolution models, then render those decisions in the existing App Router surfaces. Legacy URLs remain compatible until behavioral parity is executable and proven.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript 5.9.2, Supabase repositories/RLS, Node `node:test` through `tsx`, Playwright browser qualification.

**Spec:** `docs/superpowers/specs/2026-10-21-docente-os-product-ia-reset-design.md` at exact approved spec commit `aa1ba597d2d8c55b92ae440e25fde465d75e184c` — human-approved 2026-10-21.

## Global Constraints

- Primary teacher-facing IA is exactly **Oggi · Orario · Classi · Altro**. Lezione is contextual, never a global destination.
- `/planner` remains Oggi; `/` and `/workspace` resolve to Oggi rather than rendering another teacher dashboard.
- Oggi exposes at most two lesson objects: one ended/unregistered lesson plus the first useful current/upcoming lesson. Calendar commitments are compact. Generic PlannerTask lists do not appear there.
- PlannerTask remains complete and persistent under **Altro → Attività**.
- Orario daily/weekly consultation UI is preserved. The governed `Modifica → Data di decorrenza → Controlla / attiva` flow is preserved and interaction cannot be confused with opening a lesson.
- Orario and Calendario remain separate domains. Piano annuale remains separate from both.
- Classi is primarily a selector. Classe exposes continuity, one dominant contextual CTA, visible Diario and one **Altro della classe** disclosure.
- Lezione resolves future/current/ended-unregistered/registered state from reliable context. Ambiguity is explicit and fail-closed.
- Curriculum, approval, authority, material provenance/version/revalidation, Atlas fail-closed behavior, TeachingSession persistence and Drive synchronization are not weakened.
- `Osserva`, assistant/Copilot, voice, curriculum details and revalidation remain contextual capabilities.
- `Materiali di domani` has one stable home under **Altro → Materiali e fonti** and may be entered contextually from Orario when viewing tomorrow.
- Legacy routes follow: relocate capability → prove parity/governance → stop generating old URL → redirect/retire.
- Touch targets remain at least 44 px. No horizontal overflow at 320 px. Browser evidence covers 320 px, 390 px and desktop.
- No database migration, new student auth/tracking, unrelated technical front, merge, Beta promotion or production deploy is authorized by this plan.

## Review Focus

1. **Ambiguous lesson context:** multiple compatible slots/classes must lead to explicit disambiguation in Orario/Classe; no class or phase is guessed. Pin in Tasks 3 and 5.
2. **Pending registration + upcoming lesson + Calendar:** Oggi must show both lesson objects and compact Calendar items without PlannerTask buckets or a full timeline. Pin in Task 2.
3. **Orario view/edit separation:** consultation opens Lezione only when resolved; edit mode edits the timetable and never opens Lezione. Pin in Task 3.
4. **Known lesson with missing/uncertain preparation/material:** remain in Lezione, preserve blocker/provenance and expose the next legitimate action. Pin in Task 5.
5. **Legacy deep links:** Home/day-review/material/phase links remain safe until capability parity is demonstrated. Pin in Tasks 7 and 8.

---

## File Structure and Responsibility Map

### Existing files to modify

- `product/src/components/app-shell/navigation.ts` — canonical destinations and Altro grouping.
- `product/src/components/app-shell/navigation.test.ts` — executable shell IA contract.
- `product/src/components/app-shell/app-shell.tsx` — Oggi/Orario/Classi/Altro rendering.
- `product/src/app/page.tsx` — root alias/redirect to Oggi.
- `product/src/app/planner/page.tsx` — sparse Oggi only.
- `product/src/app/api/assistant/today-context-loader.ts` — authoritative day/timetable/calendar/session inputs.
- `product/src/core/presentation/today-teaching-focus.ts` — direct lesson entry when context is resolved.
- `product/src/app/orario/TimetableExperience.tsx` — preserved timetable UI plus consultation routing.
- `product/src/app/orario/TimetableGrid.tsx` — consultation-only lesson activation affordance.
- `product/src/app/orario/timetable-operational-model.ts` and `.test.ts` — pure view/edit entry rules.
- `product/src/app/classi/page.tsx` — section selector.
- `product/src/app/classi/[sectionId]/page.tsx` — continuity-first Classe.
- `product/src/app/classi/class-workspace-model.ts` and `.test.ts` — class continuity projection.
- `product/src/app/classi/[sectionId]/class-task-state.ts` and `.test.ts` — lesson/task state semantics for Classe.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx` — authoritative Lezione state resolution.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx` — preparation rendering.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx` — teaching rendering.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx` — observation capability retained contextually.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx` — closure/registration rendering.
- `product/src/core/presentation/human-task-content.ts` and `.test.ts` — canonical lesson href and legacy phase compatibility.
- `product/src/app/knowledge/page.tsx` — teacher-facing Materiali e fonti home.
- `product/src/app/materiali/domani/tomorrow-preparation-loader.ts` — existing tomorrow-material source logic to reuse, not duplicate.
- `product/src/app/materiali/domani/page.tsx` and `product/src/app/materiali/prossima/page.tsx` — compatibility surfaces until Task 8.
- `product/src/app/giornata/resoconto/page.tsx` — compatibility surface until Task 8.
- `product/e2e/experience/information-architecture.spec.mjs` — shell IA browser contract.
- `product/e2e/experience/critical-journeys.spec.mjs` — Oggi/Orario/Classi/Lezione journeys.
- `product/e2e/experience/contextual-capabilities.spec.mjs` — contextual materials/Copilot/voice/governance.
- `product/e2e/experience/day-review.spec.mjs` — parity/legacy compatibility.
- `product/e2e/experience/accessibility.spec.mjs` — focus/touch/responsive assertions.
- `product/package.json` — register new Node contract tests in the explicit `test` script.

### New focused files

- `product/src/core/presentation/today-ia-projection.ts`
- `product/src/core/presentation/today-ia-projection.test.ts`
- `product/src/core/presentation/lesson-workspace-state.ts`
- `product/src/core/presentation/lesson-workspace-state.test.ts`
- `product/src/app/attivita/page.tsx`
- `product/src/app/attivita/planner-task-board.tsx`
- `product/src/app/attivita/attivita.css`
- `product/src/app/altro/altro-model.ts`
- `product/src/app/altro/altro-model.test.ts`
- `product/playwright.ia-reset.config.mjs` — dedicated 320/390/desktop qualification configuration; it must import/extend the existing `playwright.config.mjs` assumptions rather than changing the existing X3 412×915 gate.

No Supabase migration or new table is planned.

---

### Task 1: Pin and implement the canonical shell IA

**Files:**
- Create: `product/playwright.ia-reset.config.mjs`
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/src/components/app-shell/navigation.test.ts`
- Modify: `product/src/components/app-shell/app-shell.tsx`
- Modify: `product/src/app/page.tsx`
- Test: `product/e2e/experience/information-architecture.spec.mjs`

**Interfaces:**
- Produces: work keys `['today', 'timetable', 'classes', 'more']` rendered as `Oggi · Orario · Classi · Altro`.
- Produces: `/` → `/planner`; `/workspace` continues to resolve to `/planner`.
- Produces: Playwright projects `ia-mobile-320`, `ia-mobile-390`, `ia-desktop` against `E2E_BASE_URL`, preserving existing governed E2E credentials and not replacing `playwright.config.mjs`.

- [ ] **Step 1: Write the failing shell contract**

In `navigation.test.ts` require:

```ts
assert.deepEqual(workNavigationItems().map((item) => item.key), ['today', 'timetable', 'classes', 'more'])
assert.deepEqual(workNavigationItems().map((item) => item.label), ['Oggi', 'Orario', 'Classi', 'Altro'])
assert.equal(PRIMARY_NAVIGATION.some((item) => item.key === 'home'), false)
```

Also pin the approved Altro group labels: `Lavoro`, `Risorse e organizzazione`, `Sistema`.

- [ ] **Step 2: Add the dedicated browser qualification config**

`playwright.ia-reset.config.mjs` defines only these projects:
- `ia-mobile-320`: viewport 320×800, `isMobile: true`, `hasTouch: true`;
- `ia-mobile-390`: viewport 390×844, `isMobile: true`, `hasTouch: true`;
- `ia-desktop`: viewport 1440×1000, `isMobile: false`, `hasTouch: false`.

Keep `testDir`, timeouts, locale, timezone, evidence folders and `baseURL = process.env.E2E_BASE_URL ?? ...` aligned with the existing Playwright configuration.

- [ ] **Step 3: Run RED**

Run:

```bash
cd product
npx tsx --test src/components/app-shell/navigation.test.ts
```

Expected: FAIL because Home/Naviga still define the current shell.

- [ ] **Step 4: Implement the minimum shell change**

In `navigation.ts`, introduce `more`, remove Home from work navigation, retain all professional destinations inside Altro, and keep the three groups presentational rather than creating nested route levels. In `app-shell.tsx`, render Altro as the fourth global control on mobile and desktop using the existing secondary-surface mechanism.

Replace the teacher-facing Home body in `product/src/app/page.tsx` with the existing authenticated route behavior followed by redirect to `/planner`; no Home-only priority/decision projection remains rendered.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
cd product
npx tsx --test src/components/app-shell/navigation.test.ts
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.ia-reset.config.mjs e2e/experience/information-architecture.spec.mjs --project=ia-mobile-390
```

Prerequisite for the Playwright command: use the existing X3 application harness to build/start the exact branch locally with governed E2E credentials. Expected: unit PASS; browser contract sees only Oggi, Orario, Classi, Altro at primary level.

- [ ] **Step 6: Commit**

```bash
git add product/playwright.ia-reset.config.mjs product/src/components/app-shell/navigation.ts product/src/components/app-shell/navigation.test.ts product/src/components/app-shell/app-shell.tsx product/src/app/page.tsx product/e2e/experience/information-architecture.spec.mjs
git commit -m "feat: establish canonical teacher IA shell"
```

---

### Task 2: Make Oggi sparse and relocate PlannerTask to Attività

**Files:**
- Create: `product/src/core/presentation/today-ia-projection.ts`
- Create: `product/src/core/presentation/today-ia-projection.test.ts`
- Create: `product/src/app/attivita/page.tsx`
- Create: `product/src/app/attivita/planner-task-board.tsx`
- Create: `product/src/app/attivita/attivita.css`
- Modify: `product/src/app/planner/page.tsx`
- Modify: `product/src/app/api/assistant/today-context-loader.ts`
- Modify: `product/src/core/presentation/today-teaching-focus.ts`
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/package.json`
- Test: `product/e2e/experience/critical-journeys.spec.mjs`

**Interfaces:**
- Produces: `buildTodayIAProjection(input): TodayIAProjection` with `lessonObjects.length <= 2` and compact `calendarCommitments`.
- Produces: `/attivita` with the complete existing PlannerTask create/complete/move/wait/reopen/provenance behavior.
- Consumes: `LoadedTodayOperationalContext.homeDaily`, projected Calendar data, TeachingSession state and next-lesson preparation.

- [ ] **Step 1: Write failing projection tests**

Pin:

```ts
assert.deepEqual(result.lessonObjects.map((item) => item.kind), ['PENDING_REGISTRATION', 'UPCOMING_LESSON'])
assert.equal(result.lessonObjects.length, 2)
assert.equal(result.calendarCommitments.length, 1)
assert.equal('plannerTasks' in result, false)
```

Also assert deduplication and safe Orario disambiguation when lesson context is ambiguous.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/core/presentation/today-ia-projection.test.ts`

Expected: FAIL because the projection does not exist.

- [ ] **Step 3: Implement the pure Oggi projection**

Keep selection rules in `today-ia-projection.ts`. Extend `today-context-loader.ts` only with authoritative inputs that the projection needs; do not move presentation policy into repositories.

Update `today-teaching-focus.ts`: when section + canonical block are certain, use the canonical Lezione href; otherwise stop at Orario/Classe without guessing.

- [ ] **Step 4: Split PlannerTask UI from Oggi**

Move the existing task board/capture/actions rendering into `/attivita` and `planner-task-board.tsx`; keep server actions/persistence semantics unchanged. Give the moved surface its own `attivita.css` so Oggi styles no longer own PlannerTask presentation.

Remove from `/planner`: generic task buckets/capture, generic quick links, full timeline, day-review CTA and tomorrow-material CTA. Render only the Oggi projection.

Add `Attività` under Altro → Lavoro.

- [ ] **Step 5: Verify**

Run:

```bash
cd product
npx tsx --test src/core/presentation/today-ia-projection.test.ts src/components/app-shell/navigation.test.ts
npm test
npm run typecheck
```

Expected: PASS; existing PlannerTask persistence tests remain green.

- [ ] **Step 6: Commit**

```bash
git add product/src/core/presentation/today-ia-projection.ts product/src/core/presentation/today-ia-projection.test.ts product/src/app/attivita product/src/app/planner/page.tsx product/src/app/api/assistant/today-context-loader.ts product/src/core/presentation/today-teaching-focus.ts product/src/components/app-shell/navigation.ts product/package.json
git commit -m "feat: make Oggi lesson-first and move activities to Altro"
```

---

### Task 3: Preserve Orario and add consultation-only direct Lezione entry

**Files:**
- Modify: `product/src/app/orario/TimetableExperience.tsx`
- Modify: `product/src/app/orario/TimetableGrid.tsx`
- Modify: `product/src/app/orario/timetable-operational-model.ts`
- Modify: `product/src/app/orario/timetable-operational-model.test.ts`
- Test: `product/e2e/experience/critical-journeys.spec.mjs`

**Interfaces:**
- Produces: `resolveTimetableLessonEntrypoint(input): { kind: 'LESSON'; href: string } | { kind: 'CLASS'; href: string } | { kind: 'AMBIGUOUS' } | null`.
- Invariant: `mode !== 'view'` never returns a navigable lesson/class activation for the grid cell.
- Consumes: existing slot → assignment → section/discipline mapping and current class continuity/canonical block resolution.

- [ ] **Step 1: Write failing model tests**

Assert:
- resolved consultation slot → canonical Lezione href;
- section known but canonical block unresolved → Classe href;
- ambiguous context → `AMBIGUOUS`;
- `update`/`manage` mode → no lesson navigation.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/app/orario/timetable-operational-model.test.ts`

- [ ] **Step 3: Implement minimum routing only**

Wire the resolver into the existing grid/experience without restructuring daily/weekly views, density, view switching, draft edits, effective-date selection or activation.

- [ ] **Step 4: Add browser assertions**

In `critical-journeys.spec.mjs` pin direct entry from consultation and no navigation from `/orario/aggiorna`.

Run, against the exact branch started by the existing local X3 harness:

```bash
cd product
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.ia-reset.config.mjs e2e/experience/critical-journeys.spec.mjs --project=ia-mobile-390
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/app/orario/TimetableExperience.tsx product/src/app/orario/TimetableGrid.tsx product/src/app/orario/timetable-operational-model.ts product/src/app/orario/timetable-operational-model.test.ts product/e2e/experience/critical-journeys.spec.mjs
git commit -m "feat: open resolved lessons directly from timetable"
```

---

### Task 4: Simplify Classi and make Classe a continuity surface

**Files:**
- Modify: `product/src/app/classi/page.tsx`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify: `product/src/app/classi/class-workspace-model.ts`
- Modify: `product/src/app/classi/class-workspace-model.test.ts`
- Modify: `product/src/app/classi/[sectionId]/class-task-state.ts`
- Modify: `product/src/app/classi/[sectionId]/class-task-state.test.ts`
- Test: `product/e2e/experience/critical-journeys.spec.mjs`

**Interfaces:**
- Produces: `ClassWorkspaceProjection` containing `latestRecorded`, `nextActivity`, essential progress, `primaryAction`, `diaryHref`, `moreItems`.
- Consumes: existing annual-plan execution, TeachingSession/Diario continuity, assignments and canonical runtime projection.

- [ ] **Step 1: Write failing hierarchy tests**

Pin one dominant CTA, visible Diario, and that Piano annuale/Progetta/materials/knowledge/curriculum/cattedra are not peer first-level cards.

- [ ] **Step 2: Run RED**

```bash
cd product
npx tsx --test src/app/classi/class-workspace-model.test.ts src/app/classi/'[sectionId]'/class-task-state.test.ts
```

- [ ] **Step 3: Reduce Classi**

Keep section identity, essential assignment/discipline context, concise useful state and secondary `Gestisci classi`. Remove dashboard-like summary weight not required for selection.

- [ ] **Step 4: Recompose Classe**

Order: identity/discipline → latest recorded work → next activity → essential progress/context → one contextual CTA → visible Diario → one `Altro della classe` disclosure. Reuse existing capability hrefs inside the disclosure; do not duplicate their internals.

- [ ] **Step 5: Verify**

```bash
cd product
npx tsx --test src/app/classi/class-workspace-model.test.ts src/app/classi/'[sectionId]'/class-task-state.test.ts
npm run typecheck
```

Expected: PASS; no TeachingSession or Drive sync persistence change.

- [ ] **Step 6: Commit**

```bash
git add product/src/app/classi/page.tsx product/src/app/classi/'[sectionId]'/page.tsx product/src/app/classi/class-workspace-model.ts product/src/app/classi/class-workspace-model.test.ts product/src/app/classi/'[sectionId]'/class-task-state.ts product/src/app/classi/'[sectionId]'/class-task-state.test.ts product/e2e/experience/critical-journeys.spec.mjs
git commit -m "feat: make class surfaces continuity-first"
```

---

### Task 5: Turn Lezione into one automatically resolved workspace

**Files:**
- Create: `product/src/core/presentation/lesson-workspace-state.ts`
- Create: `product/src/core/presentation/lesson-workspace-state.test.ts`
- Modify: `product/src/core/presentation/human-task-content.ts`
- Modify: `product/src/core/presentation/human-task-content.test.ts`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx`
- Modify: `product/package.json`
- Test: `product/e2e/experience/lesson-close-task-first.spec.mjs`
- Test: `product/e2e/experience/contextual-capabilities.spec.mjs`

**Interfaces:**
- Produces: `resolveLessonWorkspaceState(input): 'PREPARATION' | 'TEACHING' | 'CLOSURE' | 'CONTINUITY' | 'AMBIGUOUS'`.
- Produces: `buildLessonWorkspaceHref(sectionId, blockId)` without a teacher-selected phase query.
- Consumes: reliable temporal context for the section occurrence, recorded session/progress state and preparation approval state.
- Compatibility: legacy `?mode=prepare|teach|observe|record` remains parseable but cannot bypass authority/approval and is not emitted by new UI.

- [ ] **Step 1: Write failing state tests**

Pin:

```text
future -> PREPARATION
current -> TEACHING
ended + not registered -> CLOSURE
registered -> CONTINUITY
insufficient/contradictory context -> AMBIGUOUS
```

Also pin known-lesson/missing-material behavior and fail-closed approval.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/core/presentation/lesson-workspace-state.test.ts`

- [ ] **Step 3: Implement canonical href and server-side resolver**

Change canonical lesson href generation to omit `mode`. In `page.tsx`, resolve temporal/professional state server-side. A query parameter is compatibility input, never state authority.

- [ ] **Step 4: Unify the workspace hierarchy**

Shared header: `Lezione · Classe · Disciplina · Titolo`.

Dominant CTAs:
- PREPARATION → `Inizia la lezione`;
- TEACHING → `Concludi la lezione`;
- CLOSURE → `Registra la lezione`;
- CONTINUITY → `Prepara la prossima` or `Torna a Oggi`.

`Osserva` becomes contextual `Aggiungi osservazione`. Voice, Copilot, detailed observations, UDA-change proposal, materials, curriculum/provenance and revalidation remain secondary/contextual.

- [ ] **Step 5: Verify**

```bash
cd product
npx tsx --test src/core/presentation/lesson-workspace-state.test.ts src/core/presentation/human-task-content.test.ts
npm test
npm run typecheck
```

Expected: PASS with curriculum/approval/material/registration semantics unchanged.

- [ ] **Step 6: Commit**

```bash
git add product/src/core/presentation/lesson-workspace-state.ts product/src/core/presentation/lesson-workspace-state.test.ts product/src/core/presentation/human-task-content.ts product/src/core/presentation/human-task-content.test.ts product/src/app/classi/'[sectionId]'/lezioni/'[blockId]' product/package.json product/e2e/experience/lesson-close-task-first.spec.mjs product/e2e/experience/contextual-capabilities.spec.mjs
git commit -m "feat: resolve one lesson workspace from context"
```

---

### Task 6: Complete Altro as the single scannable secondary surface

**Files:**
- Create: `product/src/app/altro/altro-model.ts`
- Create: `product/src/app/altro/altro-model.test.ts`
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/src/components/app-shell/navigation.test.ts`
- Modify: `product/src/components/app-shell/app-shell.tsx`
- Modify: `product/package.json`
- Test: `product/e2e/experience/information-architecture.spec.mjs`

**Interfaces:**
- Produces exact groups:
  - `Lavoro`: Attività, Progetta, Piano annuale
  - `Risorse e organizzazione`: Materiali e fonti, Calendario, Documentazione
  - `Sistema`: Impostazioni, Account e sicurezza
- No nested category route is introduced.

- [ ] **Step 1: Write failing model tests**

Assert exact labels/order, unique hrefs, complete capability coverage and absence of Curricolo Arena/Copilot/voice/revalidation as global entries.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/app/altro/altro-model.test.ts`

- [ ] **Step 3: Implement and wire Altro**

Use the existing shell secondary surface. Label the existing `/knowledge` destination `Materiali e fonti` without weakening the knowledge/provenance domain. Attività points to `/attivita`.

- [ ] **Step 4: Verify**

```bash
cd product
npx tsx --test src/app/altro/altro-model.test.ts src/components/app-shell/navigation.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add product/src/app/altro product/src/components/app-shell/navigation.ts product/src/components/app-shell/navigation.test.ts product/src/components/app-shell/app-shell.tsx product/package.json product/e2e/experience/information-architecture.spec.mjs
git commit -m "feat: complete Altro secondary workspace"
```

---

### Task 7: Give Materiali di domani one stable home plus Orario contextual entry

**Files:**
- Modify: `product/src/app/knowledge/page.tsx`
- Modify: `product/src/app/materiali/domani/tomorrow-preparation-loader.ts` only to make its existing read model reusable outside the legacy route; do not change source semantics.
- Modify: `product/src/app/orario/TimetableExperience.tsx`
- Modify: `product/e2e/experience/contextual-capabilities.spec.mjs`
- Modify: `product/e2e/experience/day-review.spec.mjs`

**Interfaces:**
- Produces: stable tomorrow overview under `/knowledge?focus=domani` as the Materiali e fonti surface.
- Produces: Orario contextual link to `/knowledge?focus=domani` only when the viewed day is tomorrow.
- Consumes: `tomorrow-preparation-loader.ts`; no second tomorrow-material loader is created.

- [ ] **Step 1: Write failing browser assertions**

Pin that Altro → Materiali e fonti exposes the tomorrow overview; lesson-specific materials remain inside Lezione; Orario tomorrow points to `/knowledge?focus=domani`, not `/materiali/domani`.

- [ ] **Step 2: Run RED against the exact local branch**

```bash
cd product
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.ia-reset.config.mjs e2e/experience/contextual-capabilities.spec.mjs e2e/experience/day-review.spec.mjs --project=ia-desktop
```

Expected: FAIL on the new canonical entrance.

- [ ] **Step 3: Reuse the existing tomorrow loader in Materiali e fonti**

`knowledge/page.tsx` handles `focus=domani` and renders the existing tomorrow projection. Keep canonical material linkage, provenance and revalidation rules unchanged.

- [ ] **Step 4: Add Orario contextual entrance and stop generating the old URL from new UI**

Do not redirect the legacy route yet.

- [ ] **Step 5: Verify**

```bash
cd product
npm test
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add product/src/app/knowledge/page.tsx product/src/app/materiali/domani/tomorrow-preparation-loader.ts product/src/app/orario/TimetableExperience.tsx product/e2e/experience/contextual-capabilities.spec.mjs product/e2e/experience/day-review.spec.mjs
git commit -m "feat: relocate tomorrow materials to stable resource home"
```

---

### Task 8: Soft-retire duplicate/legacy destinations after parity

**Files:**
- Modify: `product/src/app/giornata/resoconto/page.tsx`
- Modify: `product/src/app/materiali/domani/page.tsx`
- Modify: `product/src/app/materiali/prossima/page.tsx`
- Modify: legacy `product/src/app/classi/[sectionId]/in-classe/[assetId]/...` route entry only where canonical Lezione material parity is proven.
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- Modify: `product/e2e/experience/day-review.spec.mjs`
- Modify: `product/e2e/experience/contextual-capabilities.spec.mjs`
- Modify: `product/e2e/experience/critical-journeys.spec.mjs`

**Interfaces:**
- Produces safe aliases/redirects only after the destination capability exists and is tested.
- Legacy `mode` can remain accepted but never overrides server-side state/governance.

- [ ] **Step 1: Add parity assertions before redirects**

For each old route, test both destination and capability availability; a redirect alone is insufficient.

- [ ] **Step 2: Stop new UI from generating old URLs**

Search canonical UI call sites and replace only those whose parity test is already green.

- [ ] **Step 3: Add redirects/aliases one by one**

Target mapping:
- `/giornata/resoconto` → Oggi/Classe/Materiali canonical context appropriate to the requested work; never another dashboard;
- `/materiali/domani` → `/knowledge?focus=domani`;
- `/materiali/prossima` → resolved Lezione material context when deterministic, otherwise safe Classe/Materiali e fonti context;
- `in-classe/...` → Lezione contextual material view only when canonical lesson resolution is reliable;
- legacy lesson `mode` → compatibility input normalized by the Task 5 resolver.

- [ ] **Step 4: Verify**

```bash
cd product
npm test
npm run typecheck
```

Then, against the exact local branch:

```bash
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.ia-reset.config.mjs e2e/experience/day-review.spec.mjs e2e/experience/contextual-capabilities.spec.mjs e2e/experience/critical-journeys.spec.mjs --project=ia-mobile-390
```

Expected: PASS with no capability loss.

- [ ] **Step 5: Commit**

```bash
git add product/src/app/giornata/resoconto product/src/app/materiali product/src/app/classi product/e2e/experience/day-review.spec.mjs product/e2e/experience/contextual-capabilities.spec.mjs product/e2e/experience/critical-journeys.spec.mjs
git commit -m "refactor: retire duplicate teacher routes after parity"
```

---

### Task 9: Exact-head automated and responsive qualification

**Files:**
- No feature expansion. Modify only an owning implementation/test file if a real defect is found.
- Test: `product/e2e/experience/information-architecture.spec.mjs`
- Test: `product/e2e/experience/critical-journeys.spec.mjs`
- Test: `product/e2e/experience/contextual-capabilities.spec.mjs`
- Test: `product/e2e/experience/day-review.spec.mjs`
- Test: `product/e2e/experience/accessibility.spec.mjs`

**Interfaces:**
- Produces one exact-head evidence set for automated, responsive and domain regression gates.

- [ ] **Step 1: Run full product verification**

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Start the exact built head using the existing X3 application harness**

Use the same governed environment/credentials as `.github/workflows/x3-e2e.yml`, with `E2E_BASE_URL=http://127.0.0.1:3000`. Do not point application qualification at Render Beta before the exact head is promoted there.

- [ ] **Step 3: Run IA browser suite on all three explicit viewport projects**

```bash
cd product
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.ia-reset.config.mjs e2e/experience/information-architecture.spec.mjs e2e/experience/critical-journeys.spec.mjs e2e/experience/contextual-capabilities.spec.mjs e2e/experience/day-review.spec.mjs e2e/experience/accessibility.spec.mjs --project=ia-mobile-320 --project=ia-mobile-390 --project=ia-desktop
```

Expected evidence covers Oggi composite state, Orario day/week/edit separation, Classi, Classe, Diario, Altro della classe, all four Lezione states, Altro groups, tomorrow materials, and legacy compatibility.

- [ ] **Step 4: Pin responsive/accessibility requirements**

At 320 and 390: no horizontal overflow, touch targets ≥44 px, visible focus, no technical identifiers at first level. Desktop must not restore a navigation-first hierarchy.

- [ ] **Step 5: Record exact head and workflow evidence**

Capture `git rev-parse HEAD` plus CI/workflow run IDs. Any failed gate keeps the head unqualified. Fix only the owning defect, then rerun the failed contract and the full qualification set.

No empty qualification commit.

---

### Task 10: Final Human Product Review gate

**Files:**
- No implementation file is changed by this task.
- Evidence may be recorded in the controlling PR/checklist after Task 9 fixes the exact head.

**Interfaces:**
- Produces one human decision: `PASS | REWORK | REJECT` on the exact qualified head.

- [ ] **Step 1: Review the exact served candidate only after Task 9 PASS**

Walk the approved scenarios in browser with mobile and desktop evidence. No new functionality is introduced during review.

- [ ] **Step 2: Judge the seven product questions**

1. Can the teacher understand what to do without learning internal module names?
2. Does Oggi remain sparse?
3. Is Orario at least as convenient as before?
4. Does Classe feel like continuity rather than a dashboard?
5. Does Lezione behave as one coherent workspace?
6. Is Altro complete without becoming noisy?
7. Has any important professional capability disappeared?

- [ ] **Step 3: Stop at the decision boundary**

`PASS` means eligible for a separate merge/promotion decision. `REWORK` returns only observed defects to their owning task. `REJECT` stops the branch. This plan itself authorizes no merge, Beta promotion or production deploy.

---

## Self-Review Result

### Spec coverage

- primary backbone/Home removal → Task 1;
- Oggi + PlannerTask separation → Task 2;
- Orario preservation/direct lesson entry → Task 3;
- Classi/Classe/Diario hierarchy → Task 4;
- single Lezione/state resolution/contextual capabilities → Task 5;
- Altro grouping → Task 6;
- Materiali di domani stable/contextual home → Task 7;
- soft legacy retirement/capability parity → Task 8;
- automated/browser/responsive qualification → Task 9;
- final Human Review → Task 10.

No requirement needs a database migration or domain-authority rewrite.

### Step scan

Tasks 1–8 each define the owning files, an executable RED contract, minimal implementation boundary, GREEN verification and commit boundary. Tasks 9–10 are deliberately qualification-only.

### Type consistency

Only three new presentation contracts carry cross-task semantics:
- `buildTodayIAProjection(...) -> TodayIAProjection`;
- `resolveTimetableLessonEntrypoint(...) -> LESSON | CLASS | AMBIGUOUS | null`;
- `resolveLessonWorkspaceState(...) -> PREPARATION | TEACHING | CLOSURE | CONTINUITY | AMBIGUOUS`.

Canonical Lezione URLs do not encode a teacher-selected phase; legacy `mode` remains compatibility input only.

### Review Focus coverage

All five high-risk conditions are explicitly tested in Tasks 2, 3, 5, 7 and 8 and re-exercised across 320/390/desktop in Task 9.

### Proportion and scope

The plan reuses current repositories, loaders, Planner actions, timetable UI, lesson clients and material logic. It adds presentation models and a dedicated responsive test configuration, not a new product architecture. The implementation remains a controlled IA/routing migration.