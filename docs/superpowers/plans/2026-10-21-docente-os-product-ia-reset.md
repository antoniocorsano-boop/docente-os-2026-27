# Docente OS Product IA Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Docente OS information-architecture reset so everyday work is organized around **Oggi · Orario · Classi · Altro**, while **Lezione** becomes the single contextual operational workspace and no existing professional capability or governance boundary is lost.

**Architecture:** Keep persistence, domain authority, Supabase repositories, timetable lifecycle, TeachingSession/Diario, curriculum gates, material provenance, Drive synchronization, authentication, and MFA unchanged. Implement the reset in the presentation/routing layer: small pure projection/resolution models decide what each surface exposes, App Router pages render those projections, and legacy URLs stay compatible until parity is proven. No database migration is expected or authorized by this plan.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript 5.9.2, Supabase repositories/RLS, Node `node:test` through `tsx`, Playwright browser qualification.

**Spec:** `docs/superpowers/specs/2026-10-21-docente-os-product-ia-reset-design.md` at approved spec commit `aa1ba597d2d8c55b92ae440e25fde465d75e184c` (human-approved 2026-10-21).

## Global Constraints

- Primary teacher-facing IA is exactly **Oggi · Orario · Classi · Altro**; Lezione is contextual, not a global destination.
- `/planner` remains the canonical technical route for Oggi; `/workspace` and `/` resolve to Oggi rather than a second Home dashboard.
- Oggi exposes at most **two operational lesson objects** — one ended/unregistered lesson plus the first useful current/upcoming lesson — and compact Calendar commitments; generic PlannerTask lists are excluded.
- PlannerTask remains fully supported and moves under **Altro → Attività** without changing persistence semantics.
- Orario daily/weekly consultation UI and the governed `Modifica → Data di decorrenza → Controlla / attiva` lifecycle are preserved; consultation and edit interactions must never be ambiguous.
- Orario and Calendario remain separate domains; Piano annuale remains separate from both.
- Classi remains primarily a selector. Classe exposes continuity, one dominant contextual CTA, visible Diario, and one **Altro della classe** disclosure.
- Lezione is one workspace. Future/current/ended-unregistered/registered states are resolved from reliable context; ambiguity is fail-closed and never guessed.
- Curriculum, approval, authority, material provenance/version/revalidation, Atlas fail-closed behavior, TeachingSession persistence, and Drive synchronization must not be weakened.
- `Osserva`, assistant/Copilot, voice, curriculum details, and revalidation remain contextual capabilities, not primary destinations.
- `Materiali di domani` has one stable home under **Altro → Materiali e fonti** and may also be entered contextually from Orario when viewing the following day.
- Legacy routes are retired only after capability parity: relocate → verify parity/governance → stop generating old URL → redirect/retire.
- Touch targets remain at least 44 px; no horizontal overflow at 320 px; 390 px and desktop remain qualification widths.
- No new student authentication/tracking, no unrelated technical front, no merge, Beta promotion, or production deployment is authorized by this plan itself.

## Review Focus

1. **Ambiguous lesson context:** multiple compatible slots/classes must produce a human-readable disambiguation path to Orario/Classe, never an invented class or phase. Pin in Tasks 3 and 5.
2. **Past unregistered + next lesson + Calendar commitment:** Oggi must show both lesson objects plus compact Calendar items, but no PlannerTask bucket or full timeline. Pin in Task 2.
3. **Orario consultation vs edit mode:** a grid activation opens Lezione only in consultation mode; edit mode modifies the slot and never opens Lezione. Pin in Task 3.
4. **Known lesson with missing/uncertain preparation or material:** remain inside Lezione, expose the legitimate next action, preserve blockers/provenance, and do not bounce through unrelated modules. Pin in Task 5.
5. **Legacy deep links:** old Home/day-review/material/phase URLs continue to resolve safely during migration; no useful capability may disappear before parity is demonstrated. Pin in Tasks 7 and 8.

---

## File Structure and Responsibility Map

**Existing files to modify**

- `product/src/components/app-shell/navigation.ts` — canonical global destinations and Altro grouping.
- `product/src/components/app-shell/navigation.test.ts` — executable IA contract for shell/navigation.
- `product/src/components/app-shell/app-shell.tsx` — render Oggi/Orario/Classi/Altro consistently on mobile and desktop.
- `product/src/app/page.tsx` — remove separate Home decision surface; redirect/alias to Oggi.
- `product/src/app/planner/page.tsx` — sparse Oggi composition only.
- `product/src/app/api/assistant/today-context-loader.ts` — continue loading authoritative day/timetable/calendar/session context; expose only additional data required by the Oggi projection.
- `product/src/core/presentation/today-teaching-focus.ts` — stop routing known lessons through Classe and use canonical lesson entry.
- `product/src/app/orario/TimetableExperience.tsx` — direct Lezione entry in consultation mode while preserving existing daily/weekly/edit experience.
- `product/src/app/orario/TimetableGrid.tsx` — consultation-only lesson activation affordance if the grid owns the click target.
- `product/src/app/orario/timetable-operational-model.ts` and `.test.ts` — pure consultation/edit routing rules.
- `product/src/app/classi/page.tsx` — reduce first level to section recognition/selection.
- `product/src/app/classi/[sectionId]/page.tsx` — continuity-first Classe hierarchy.
- `product/src/app/classi/class-workspace-model.ts` and `.test.ts` — derive latest actual work, next activity, progress, and dominant CTA without duplicating full product navigation.
- `product/src/app/classi/[sectionId]/class-task-state.ts` and `.test.ts` — preserve task/lesson state semantics used by Classe.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx` — server-side state resolution and one Lezione workspace entry.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx` — preparation state.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx` — teaching state.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx` — preserve observation capability but demote it from mandatory phase navigation.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx` — closure/registration state.
- `product/src/core/presentation/human-task-content.ts` and `.test.ts` — canonical lesson href without teacher-selected phase; legacy `mode` remains accepted by the route during migration.
- `product/src/app/knowledge/page.tsx` — teacher-facing **Materiali e fonti** home, including tomorrow overview entry/content without weakening knowledge/provenance behavior.
- `product/src/app/materiali/domani/page.tsx` and `product/src/app/materiali/prossima/page.tsx` — compatibility surfaces until Task 8.
- `product/src/app/giornata/resoconto/page.tsx` — compatibility surface until Task 8.
- `product/e2e/experience/information-architecture.spec.mjs` — primary/secondary IA browser contract.
- `product/e2e/experience/day-review.spec.mjs` — migrate from autonomous day-review expectations to capability-parity/legacy compatibility expectations.
- `product/e2e/experience/critical-journeys.spec.mjs` — canonical Oggi → Lezione, Orario → Lezione, Classi → Classe → Lezione journeys.
- `product/e2e/experience/contextual-capabilities.spec.mjs` — materials/Copilot/voice/governance remain contextual.
- `product/e2e/experience/accessibility.spec.mjs` — 44 px/focus/responsive assertions.
- `product/package.json` — register any new unit-contract test files in the explicit `test` script.

**New focused files**

- `product/src/core/presentation/today-ia-projection.ts`
- `product/src/core/presentation/today-ia-projection.test.ts`
- `product/src/core/presentation/lesson-workspace-state.ts`
- `product/src/core/presentation/lesson-workspace-state.test.ts`
- `product/src/app/attivita/page.tsx`
- `product/src/app/attivita/attivita.css` only if the existing Planner styles cannot be reused without coupling Oggi and Attività.
- `product/src/app/altro/altro-model.ts`
- `product/src/app/altro/altro-model.test.ts`

No new Supabase migration or table is planned.

---

### Task 1: Pin and implement the canonical shell IA

**Files:**
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/src/components/app-shell/navigation.test.ts`
- Modify: `product/src/components/app-shell/app-shell.tsx`
- Modify: `product/src/app/page.tsx`
- Test: `product/e2e/experience/information-architecture.spec.mjs`

**Interfaces:**
- Produces: canonical work navigation `['today', 'timetable', 'classes', 'more']` rendered as `Oggi · Orario · Classi · Altro`.
- Produces: `/` → `/planner` and existing `/workspace` → `/planner` behavior, with no independent Home decision model.
- Consumes: existing AppShell active-key mechanism; do not change domain loaders.

- [ ] **Step 1: Write the failing navigation contract**

Update `navigation.test.ts` so assertions require:

```ts
assert.deepEqual(workNavigationItems().map((item) => item.key), ['today', 'timetable', 'classes', 'more'])
assert.deepEqual(workNavigationItems().map((item) => item.label), ['Oggi', 'Orario', 'Classi', 'Altro'])
assert.equal(PRIMARY_NAVIGATION.some((item) => item.key === 'home'), false)
```

Pin that Altro exposes exactly the approved three visual groups: `Lavoro`, `Risorse e organizzazione`, `Sistema`.

- [ ] **Step 2: Run the contract and verify RED**

Run: `cd product && npx tsx --test src/components/app-shell/navigation.test.ts`

Expected: FAIL because Home is still primary and the existing secondary model is `Naviga`, not the approved Altro IA.

- [ ] **Step 3: Implement the minimal shell/navigation change**

In `navigation.ts`, introduce `NavigationKey = ... | 'more'`, remove Home from work navigation, preserve all current capability hrefs as Altro items, and define the three approved groups without adding another navigation depth. In `app-shell.tsx`, render `Altro` as the fourth global control on both mobile and desktop using the existing secondary-surface mechanism rather than creating a competing dashboard.

Replace `product/src/app/page.tsx` with an authenticated-safe redirect/alias to `/planner`; do not keep any Home-only decision logic alive in the rendered product.

- [ ] **Step 4: Verify GREEN and browser contract**

Run:

```bash
cd product
npx tsx --test src/components/app-shell/navigation.test.ts
npx playwright test e2e/experience/information-architecture.spec.mjs --project=mobile-chromium --project=desktop-chromium
```

Expected: unit PASS; Playwright sees exactly Oggi, Orario, Classi, Altro and no Home/Naviga duplication.

- [ ] **Step 5: Commit**

```bash
git add product/src/components/app-shell/navigation.ts product/src/components/app-shell/navigation.test.ts product/src/components/app-shell/app-shell.tsx product/src/app/page.tsx product/e2e/experience/information-architecture.spec.mjs
git commit -m "feat: establish canonical teacher IA shell"
```

---

### Task 2: Make Oggi sparse and relocate PlannerTask to Attività

**Files:**
- Create: `product/src/core/presentation/today-ia-projection.ts`
- Create: `product/src/core/presentation/today-ia-projection.test.ts`
- Create: `product/src/app/attivita/page.tsx`
- Modify: `product/src/app/planner/page.tsx`
- Modify: `product/src/app/api/assistant/today-context-loader.ts`
- Modify: `product/src/core/presentation/today-teaching-focus.ts`
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/package.json`
- Test: `product/e2e/experience/critical-journeys.spec.mjs`

**Interfaces:**
- Produces: `buildTodayIAProjection(input): TodayIAProjection` where `lessonObjects.length <= 2`, ordered as pending registration then current/upcoming lesson, plus compact `calendarCommitments`.
- Produces: `/attivita` as the complete PlannerTask surface using existing planner actions/persistence.
- Consumes: `LoadedTodayOperationalContext.homeDaily`, authoritative TeachingSession state, projected Calendar events, and next-lesson preparation.

- [ ] **Step 1: Write the failing pure projection tests**

Cover at least:

```ts
assert.deepEqual(result.lessonObjects.map((item) => item.kind), ['PENDING_REGISTRATION', 'UPCOMING_LESSON'])
assert.equal(result.lessonObjects.length, 2)
assert.equal(result.calendarCommitments.length, 1)
assert.equal('plannerTasks' in result, false)
```

Also pin: no lesson duplication when the same occurrence could be both focus and pending; ambiguous day context yields a safe Orario action rather than a guessed class.

- [ ] **Step 2: Verify RED**

Run: `cd product && npx tsx --test src/core/presentation/today-ia-projection.test.ts`

Expected: FAIL because the projection does not exist.

- [ ] **Step 3: Implement the pure Oggi projection and direct lesson hrefs**

Implement normalized types in `today-ia-projection.ts`; keep selection/presentation decisions pure. Update `today-teaching-focus.ts` so a resolved canonical block links directly to the canonical Lezione URL rather than Classe. Preserve fail-closed fallback to Orario/Classe when block/context cannot be resolved.

- [ ] **Step 4: Split UI composition**

In `/planner`, remove PlannerTask buckets, task capture, generic quick links, full timeline, day-review CTA, and tomorrow-material CTA. Render only the two lesson objects and compact Calendar commitments produced by the new projection.

Create `/attivita` by moving/reusing the existing PlannerTask board and create/complete/move/wait/reopen flows; do not change planner persistence or provenance. Add `Attività` to Altro → Lavoro.

- [ ] **Step 5: Verify unit, route, and regression behavior**

Run:

```bash
cd product
npx tsx --test src/core/presentation/today-ia-projection.test.ts src/components/app-shell/navigation.test.ts
npm test
npm run typecheck
```

Expected: new Oggi contract PASS; existing planner/domain tests remain PASS; no schema changes.

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
- Produces: `resolveTimetableLessonEntrypoint(input): { href: string } | { kind: 'AMBIGUOUS' } | null` for consultation mode only.
- Consumes: active timetable slot, section/discipline mapping, current annual-plan continuity/canonical block resolution.
- Invariant: `mode !== 'view'` never returns a lesson-navigation action.

- [ ] **Step 1: Write the failing routing tests**

Assert that a resolved lesson slot in consultation mode produces a direct canonical Lezione href; unresolved/ambiguous data returns safe fallback; `update` and `manage` modes never produce a lesson href.

- [ ] **Step 2: Verify RED**

Run: `cd product && npx tsx --test src/app/orario/timetable-operational-model.test.ts`

Expected: FAIL on the new direct-entry contract.

- [ ] **Step 3: Implement minimal consultation routing**

Add the resolver in `timetable-operational-model.ts` and wire it into `TimetableExperience.tsx`/`TimetableGrid.tsx`. Do not restructure the daily/weekly grid, density, view switch, draft editing, effective-date choice, or activation lifecycle.

- [ ] **Step 4: Pin consultation/edit separation in browser evidence**

Extend `critical-journeys.spec.mjs` so:
- a consultation slot opens Lezione directly when context is certain;
- the same grid in `/orario/aggiorna` edits the slot and does not navigate to Lezione;
- daily and weekly view controls remain available.

Run: `cd product && npx playwright test e2e/experience/critical-journeys.spec.mjs --project=mobile-chromium --project=desktop-chromium`

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
- Produces: `ClassWorkspaceProjection` with `latestRecorded`, `nextActivity`, essential progress, `primaryAction`, `diaryHref`, and secondary `moreItems`.
- Consumes: existing annual-plan execution, TeachingSession/Diario continuity, assignments, canonical runtime projection.

- [ ] **Step 1: Write failing projection tests**

Pin that the first level contains one dominant CTA, that `Diario` is always a named visible secondary action when history exists, and that Piano annuale/Progetta/materials/knowledge/curriculum/cattedra do not become peer first-level cards.

- [ ] **Step 2: Verify RED**

Run: `cd product && npx tsx --test src/app/classi/class-workspace-model.test.ts src/app/classi/'[sectionId]'/class-task-state.test.ts`

Expected: FAIL on the new hierarchy assertions.

- [ ] **Step 3: Implement Classi selector reduction**

Keep only section identity, discipline/assignment context, concise useful state, and secondary `Gestisci classi`. Remove first-level summary/dashboard weight that does not help section selection.

- [ ] **Step 4: Implement Classe continuity hierarchy**

Render, in order: class identity/discipline → latest actually recorded work → next activity → essential progress/context → one dominant contextual CTA → visible Diario → one `Altro della classe` disclosure containing remaining class capabilities. Preserve existing links and authority semantics inside the disclosure.

- [ ] **Step 5: Verify**

Run:

```bash
cd product
npx tsx --test src/app/classi/class-workspace-model.test.ts src/app/classi/'[sectionId]'/class-task-state.test.ts
npm run typecheck
npx playwright test e2e/experience/critical-journeys.spec.mjs --project=mobile-chromium --project=desktop-chromium
```

Expected: PASS; no TeachingSession/Diario persistence changes.

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
- Produces: canonical `buildLessonWorkspaceHref(sectionId, blockId)` with no teacher-selected phase query.
- Consumes: reliable temporal context for the section/occurrence, recorded TeachingSession/progress state, curriculum/preparation approval state.
- Compatibility: legacy `?mode=prepare|teach|observe|record` may still be parsed temporarily, but new UI never requires phase selection; a legacy query cannot bypass approval/governance.

- [ ] **Step 1: Write the failing state-resolver tests**

Cover exactly:

```ts
future -> PREPARATION
current -> TEACHING
ended && !registered -> CLOSURE
registered -> CONTINUITY
insufficient/contradictory temporal context -> AMBIGUOUS
```

Also pin that missing material/preparation does not change a known lesson into an unrelated route and that approval blockers remain fail-closed.

- [ ] **Step 2: Verify RED**

Run: `cd product && npx tsx --test src/core/presentation/lesson-workspace-state.test.ts`

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement canonical href and server-side state resolution**

Change `buildLessonWorkspaceHref(sectionId, blockId)` to emit `/classi/<section>/lezioni/<block>` without `mode`. In `page.tsx`, derive authoritative temporal/professional state server-side and select the current presentation state. Keep the existing approval redirect/fail-closed semantics; do not permit URL parameters to advance a lesson through a blocker.

- [ ] **Step 4: Unify the teacher-facing workspace hierarchy**

Keep a shared header `Lezione · Classe · Disciplina · Titolo`; render one dominant CTA per state:
- preparation → `Inizia la lezione`;
- teaching → `Concludi la lezione`;
- closure → `Registra la lezione`;
- continuity → `Prepara la prossima` or `Torna a Oggi`.

Demote observation to `Aggiungi osservazione` inside teaching/closure context. Preserve voice, Copilot, detailed observation, UDA-change proposal, materials, curriculum/provenance, and revalidation as contextual disclosures/actions.

- [ ] **Step 5: Verify governance and contextual-capability regressions**

Run:

```bash
cd product
npx tsx --test src/core/presentation/lesson-workspace-state.test.ts src/core/presentation/human-task-content.test.ts
npm test
npm run typecheck
npx playwright test e2e/experience/lesson-close-task-first.spec.mjs e2e/experience/contextual-capabilities.spec.mjs --project=mobile-chromium --project=desktop-chromium
```

Expected: PASS; curriculum/approval/material/registration tests remain semantically unchanged.

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
- Produces: exact groups:
  - `Lavoro`: Attività, Progetta, Piano annuale
  - `Risorse e organizzazione`: Materiali e fonti, Calendario, Documentazione
  - `Sistema`: Impostazioni, Account e sicurezza
- Does not produce nested category routes; grouping is presentational only.

- [ ] **Step 1: Write failing model tests**

Assert exact labels, exact order, unique hrefs, and complete capability coverage. Pin that Curricolo Arena, Copilot, voice, and revalidation are absent as global Altro entries because they remain contextual.

- [ ] **Step 2: Verify RED**

Run: `cd product && npx tsx --test src/app/altro/altro-model.test.ts`

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement and wire Altro**

Use the current shell secondary-surface mechanism as one scannable surface. Relabel `/knowledge` teacher-facing entry as `Materiali e fonti` without changing knowledge-domain authority/provenance behavior. Ensure Attività links to `/attivita`.

- [ ] **Step 4: Verify**

Run:

```bash
cd product
npx tsx --test src/app/altro/altro-model.test.ts src/components/app-shell/navigation.test.ts
npx playwright test e2e/experience/information-architecture.spec.mjs --project=mobile-chromium --project=desktop-chromium
```

Expected: PASS and no extra global destination.

- [ ] **Step 5: Commit**

```bash
git add product/src/app/altro product/src/components/app-shell/navigation.ts product/src/components/app-shell/navigation.test.ts product/src/components/app-shell/app-shell.tsx product/package.json product/e2e/experience/information-architecture.spec.mjs
git commit -m "feat: complete Altro secondary workspace"
```

---

### Task 7: Give Materiali di domani one stable home plus Orario contextual entry

**Files:**
- Modify: `product/src/app/knowledge/page.tsx`
- Reuse/modify as needed: current loader/view-model used by `product/src/app/materiali/domani/page.tsx`
- Modify: `product/src/app/orario/TimetableExperience.tsx`
- Modify: `product/e2e/experience/contextual-capabilities.spec.mjs`
- Modify: `product/e2e/experience/day-review.spec.mjs`

**Interfaces:**
- Produces: stable teacher-facing tomorrow overview at `Materiali e fonti` (canonical `/knowledge` surface, with a deterministic tomorrow focus/anchor or query owned by that page).
- Produces: Orario contextual link only when the viewed day is tomorrow.
- Consumes: existing tomorrow-material loader/domain logic; no provenance/revalidation logic is duplicated.

- [ ] **Step 1: Write failing browser/contract assertions**

Pin that Altro → Materiali e fonti exposes `Materiali di domani`, that a specific lesson’s materials stay inside Lezione, and that Orario’s tomorrow context opens the same canonical overview rather than `/materiali/domani`.

- [ ] **Step 2: Verify RED**

Run: `cd product && npx playwright test e2e/experience/contextual-capabilities.spec.mjs e2e/experience/day-review.spec.mjs --project=desktop-chromium`

Expected: FAIL on the new canonical entrance.

- [ ] **Step 3: Reuse the current tomorrow-material model inside Materiali e fonti**

Move/reuse loaders and view-model code; do not fork the source-of-truth logic. Keep lesson-specific material rendering and revalidation in Lezione.

- [ ] **Step 4: Add Orario contextual entry and stop generating the old tomorrow URL from new UI**

Only the following-day view/context generates the contextual entry. Existing `/materiali/domani` remains reachable for compatibility until Task 8.

- [ ] **Step 5: Verify**

Run:

```bash
cd product
npm test
npm run typecheck
npx playwright test e2e/experience/contextual-capabilities.spec.mjs e2e/experience/day-review.spec.mjs --project=mobile-chromium --project=desktop-chromium
```

Expected: PASS; provenance/revalidation behavior unchanged.

- [ ] **Step 6: Commit**

```bash
git add product/src/app/knowledge/page.tsx product/src/app/materiali/domani product/src/app/orario/TimetableExperience.tsx product/e2e/experience/contextual-capabilities.spec.mjs product/e2e/experience/day-review.spec.mjs
git commit -m "feat: relocate tomorrow materials to stable resource home"
```

---

### Task 8: Soft-retire duplicate/legacy destinations only after parity

**Files:**
- Modify: `product/src/app/giornata/resoconto/page.tsx`
- Modify: `product/src/app/materiali/domani/page.tsx`
- Modify: `product/src/app/materiali/prossima/page.tsx`
- Modify: legacy `product/src/app/classi/[sectionId]/in-classe/[assetId]/...` entry route(s) only where parity is proven
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx` legacy `mode` compatibility handling
- Modify: `product/e2e/experience/day-review.spec.mjs`
- Modify: `product/e2e/experience/contextual-capabilities.spec.mjs`
- Modify: `product/e2e/experience/critical-journeys.spec.mjs`

**Interfaces:**
- Produces: safe redirects/aliases from retired destinations to canonical contexts.
- Invariant: no redirect is added until its useful behavior is already covered by Tasks 2–7 and executable parity tests.

- [ ] **Step 1: Add failing compatibility tests before redirects**

For each legacy route, assert its intended canonical destination and that the destination exposes the capability previously owned by the old page. Do not assert redirect alone; assert behavioral parity.

- [ ] **Step 2: Verify RED where new UI still generates legacy destinations**

Run the three experience specs. Expected: failures identify the remaining duplicate route generation/parity gaps.

- [ ] **Step 3: Stop generating legacy URLs from canonical UI**

Search and replace only call sites already covered by parity tests. Keep direct old URLs functional through redirect/alias.

- [ ] **Step 4: Introduce redirects/aliases one route at a time**

Target mapping after parity:
- `/` → `/planner` (already established in Task 1);
- `/giornata/resoconto` → the relevant canonical Oggi/Classe/Materiali context, without recreating a dashboard;
- `/materiali/domani` → Materiali e fonti tomorrow focus;
- `/materiali/prossima` → resolved Lezione material context when deterministic, otherwise a safe class/resource context;
- `in-classe/...` → Lezione contextual material view only where the canonical lesson can be resolved;
- legacy lesson `mode` query → accepted but normalized by server-side state/governance rather than treated as authority.

- [ ] **Step 5: Verify compatibility**

Run:

```bash
cd product
npm test
npm run typecheck
npx playwright test e2e/experience/day-review.spec.mjs e2e/experience/contextual-capabilities.spec.mjs e2e/experience/critical-journeys.spec.mjs --project=mobile-chromium --project=desktop-chromium
```

Expected: PASS with no capability loss.

- [ ] **Step 6: Commit**

```bash
git add product/src/app/giornata/resoconto product/src/app/materiali product/src/app/classi product/e2e/experience/day-review.spec.mjs product/e2e/experience/contextual-capabilities.spec.mjs product/e2e/experience/critical-journeys.spec.mjs
git commit -m "refactor: retire duplicate teacher routes after parity"
```

---

### Task 9: Run full automated IA/domain/responsive qualification on the exact head

**Files:**
- Modify only if a test reveals a real contract gap: relevant test or minimal owning implementation file.
- Test: `product/e2e/experience/information-architecture.spec.mjs`
- Test: `product/e2e/experience/critical-journeys.spec.mjs`
- Test: `product/e2e/experience/contextual-capabilities.spec.mjs`
- Test: `product/e2e/experience/day-review.spec.mjs`
- Test: `product/e2e/experience/accessibility.spec.mjs`

**Interfaces:**
- Produces: one exact-head evidence set proving IA contracts plus existing domain regressions.
- Consumes: Tasks 1–8 only; no feature expansion is allowed during qualification.

- [ ] **Step 1: Run complete product checks**

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Run focused browser suite at narrow mobile and desktop**

Run the repository’s configured 320/390 mobile projects plus desktop for the five experience specs above. If the Playwright configuration uses different project names, use the existing named projects rather than inventing new configuration.

Expected evidence covers:
- Oggi pending registration + upcoming lesson + compact Calendar;
- Orario daily/weekly;
- Orario edit-mode separation;
- Classi selector;
- Classe + Diario + Altro della classe;
- Lezione preparation/teaching/closure/continuity;
- Altro groups;
- tomorrow materials canonical/contextual entrances;
- legacy compatibility.

- [ ] **Step 3: Explicit responsive/accessibility assertions**

Verify no horizontal overflow at 320 px, touch targets ≥44 px, visible focus, and no technical identifiers at first level. Desktop must not restore a navigation-first hierarchy.

- [ ] **Step 4: Record exact head and gate result without merging/deploying**

Capture `git rev-parse HEAD` and the exact CI/workflow runs. If any gate fails, classify the failure and fix only the owning task; rerun the failed test plus full regression before changing qualification status.

- [ ] **Step 5: Commit only qualification-test hardening if required**

If no code/test change is required, do not create an empty commit.

---

### Task 10: Final Human Product Review gate

**Files:**
- No implementation file is modified by this task.
- Evidence may be recorded in the controlling PR/checklist only after the exact head from Task 9 is fixed.

**Interfaces:**
- Produces: one human decision `PASS | REWORK | REJECT` on the exact qualified head.
- Consumes: browser evidence and the approved spec; no new product requirement is introduced during review.

- [ ] **Step 1: Review the exact head through the served Beta only after automated qualification**

Walk the approved scenarios in browser, on mobile and desktop where specified.

- [ ] **Step 2: Judge the seven product questions from the spec**

The reviewer must determine whether:
1. the teacher understands what to do without learning internal module names;
2. Oggi remains sparse;
3. Orario remains as convenient as before;
4. Classe feels like continuity, not a dashboard;
5. Lezione behaves as one coherent workspace;
6. Altro is complete without becoming noisy;
7. no important professional capability disappeared.

- [ ] **Step 3: Stop at the decision boundary**

`PASS` means the implementation is human-qualified for a separate merge/promotion decision. `REWORK` returns only the observed defects to the owning tasks. `REJECT` stops the branch. This plan does **not** authorize merge, Beta promotion, or production deploy.

---

## Self-Review Result

### 1. Spec coverage

All normative sections map to implementation tasks:
- primary backbone/Home removal → Task 1;
- Oggi + PlannerTask separation → Task 2;
- Orario preservation/direct entry → Task 3;
- Classi/Classe/Diario hierarchy → Task 4;
- Lezione state resolution/contextual capabilities → Task 5;
- Altro grouping → Task 6;
- Materiali di domani stable/contextual home → Task 7;
- soft route retirement/capability anti-regression → Task 8;
- automated/browser/responsive qualification → Task 9;
- Human Review → Task 10.

No spec requirement requires a database migration or domain-authority rewrite.

### 2. Step scan

Each implementation task has an explicit failing contract, a RED check, a minimal owning change, a GREEN/regression check, and a commit boundary. Qualification and Human Review are deliberately separate from feature implementation.

### 3. Type/interface consistency

The new interfaces are intentionally limited to three presentation-layer contracts:
- `buildTodayIAProjection(...) -> TodayIAProjection`;
- `resolveTimetableLessonEntrypoint(...) -> resolved | ambiguous | null`;
- `resolveLessonWorkspaceState(...) -> PREPARATION | TEACHING | CLOSURE | CONTINUITY | AMBIGUOUS`.

Canonical lesson URLs no longer encode a teacher-selected phase; legacy mode parameters remain compatibility input only.

### 4. Review Focus coverage

All five high-risk conditions are pinned in Tasks 2, 3, 5, 7, and 8 and re-exercised in Task 9.

### 5. Proportion and scope

The plan intentionally reuses existing repositories, loaders, planner actions, timetable UI, lesson clients, and material logic. It does not prescribe rewrites of stable internals or introduce a new persistence abstraction. The reset remains an IA/presentation migration with explicit anti-regression gates.