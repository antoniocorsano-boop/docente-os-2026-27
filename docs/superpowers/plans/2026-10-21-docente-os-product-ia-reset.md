# Docente OS Product IA Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Docente OS information-architecture reset around **Oggi · Orario · Classi · Altro**, with **Lezione** as the single contextual operational workspace, while preserving every professional capability and governance boundary.

**Architecture:** Keep domain authority, Supabase persistence/RLS, timetable lifecycle, TeachingSession/Diario, curricolo gates, material provenance/revalidation, Drive synchronization, authentication and MFA unchanged. Implement the reset in presentation and routing through small pure projection/resolution models, then recompose the existing App Router surfaces. Legacy URLs remain compatible until behavioral parity is executable and proven.

**Tech Stack:** Node 22.x, Next.js 16.3.1 App Router, React 19.2.8, TypeScript 5.9.2, Supabase repositories/RLS, Node `node:test` through `tsx`, Playwright 1.55.0 in CI.

**Spec:** `docs/superpowers/specs/2026-10-21-docente-os-product-ia-reset-design.md` at exact approved spec commit `aa1ba597d2d8c55b92ae440e25fde465d75e184c` — human-approved 2026-10-21.

**Planning baseline:** product baseline `develop@1c50c1bc620cdd0b7bafcff0dc5c613367df3298`. At execution time create an isolated worktree/branch from a commit that contains the approved spec and this plan; do not merge or deploy without separate authorization.

## Global Constraints

- Primary teacher-facing IA is exactly **Oggi · Orario · Classi · Altro**. Lezione is contextual, never a global destination.
- `/planner` remains the technical route for Oggi during this migration; `/` and `/workspace` resolve to Oggi rather than rendering another teacher dashboard.
- Oggi exposes at most two lesson objects: one ended/unregistered lesson plus the first useful current/upcoming lesson. Calendar commitments are compact. Generic PlannerTask lists do not appear there.
- PlannerTask remains complete and persistent under **Altro → Attività**.
- Orario daily/weekly consultation UI is preserved. The governed `Modifica → Data di decorrenza → Controlla / attiva` flow is preserved and interaction cannot be confused with opening a lesson.
- Orario and Calendario remain separate domains. Piano annuale remains separate from both.
- Classi is primarily a selector. Classe exposes continuity, one dominant contextual CTA, visible Diario and one **Altro della classe** disclosure.
- Lezione resolves future/current/ended-unregistered/registered state from reliable context. Ambiguity is explicit and fail-closed.
- `Inizia la lezione` and `Concludi la lezione` are action intents inside the same Lezione workspace; they do not reintroduce teacher-selected phases and cannot bypass approval/governance.
- `Osserva`, assistant/Copilot, voice, curricolo details and revalidation remain contextual capabilities.
- `Materiali di domani` has one stable home under **Altro → Materiali e fonti** and may be entered contextually from Orario when viewing literal tomorrow. It remains distinct from materials of the current Lezione.
- Curricolo, approval, authority, material provenance/version/revalidation, Atlas fail-closed behavior, TeachingSession persistence and Drive synchronization are not weakened.
- Legacy routes follow: relocate capability → prove parity/governance → stop generating old URL → redirect/retire only when deterministic and safe.
- The first migration does **not** force a redirect for `/giornata/resoconto`; it becomes unlinked from the new IA and remains reachable until a later deterministic retirement decision.
- Touch targets remain at least 44 px. No horizontal overflow at 320 px. Desktop must not restore a navigation-first hierarchy.
- Reuse the existing `playwright.experience.config.mjs`; do not create a parallel test configuration. 320/390 responsive checks are exercised explicitly inside the IA reset browser spec.
- No new dependency unless an executable failing test proves an existing dependency cannot satisfy the requirement.
- No database migration, new student auth/tracking, unrelated technical front, merge, Beta promotion or production deploy is authorized by this plan.

## Review Focus

1. **Pending registration + upcoming lesson + Calendar:** Oggi must show both lesson objects and compact Calendar items without PlannerTask buckets or a full timeline. Pin in Task 3.
2. **Ambiguous lesson context:** overlapping/unresolved slots must lead to explicit disambiguation in Orario/Classe; no class, lesson or phase is guessed. Pin in Tasks 1, 3 and 4.
3. **Action-driven lesson transitions:** starting early or closing before the scheduled boundary must remain inside one Lezione and must not bypass curricolo/preparation approval. Pin in Tasks 1 and 6.
4. **Known lesson with missing/uncertain preparation/material:** remain in Lezione context, preserve blocker/provenance and expose the next legitimate action. Pin in Task 6.
5. **Legacy deep links:** old phase/material/day-review links must remain safe until capability parity is demonstrated; new UI must stop generating them before retirement. Pin in Tasks 7 and 8.

---

## File Structure and Responsibility Map

### Shared IA primitives

- `product/src/core/presentation/lesson-workspace-state.ts` — canonical lesson state resolution and action-driven transition semantics.
- `product/src/core/presentation/lesson-workspace-state.test.ts` — state, ambiguity and intent contract.
- `product/src/core/presentation/human-task-content.ts` — preserve legacy phase href builder and add canonical phase-free lesson href builder.
- `product/src/core/presentation/human-task-content.test.ts` — canonical + legacy route contract.
- `product/src/core/presentation/today-ia-projection.ts` — pure Oggi selection model.
- `product/src/core/presentation/today-ia-projection.test.ts` — Oggi content-limit and ambiguity contract.

### Global shell and tools

- `product/src/components/app-shell/navigation.ts` — four primary entries, Altro children and search destinations.
- `product/src/components/app-shell/navigation.test.ts` — executable IA contract.
- `product/src/components/app-shell/app-shell.tsx` — render four primary entries; child tools highlight Altro.
- `product/src/app/altro/page.tsx` + `altro.css` — one scannable grouped tool surface.
- `product/src/app/attivita/page.tsx` + `planner-task-board.tsx` + `attivita.css` — PlannerTask workspace.
- `product/src/app/attivita/actions.ts` — moved Planner actions, revalidating `/attivita`.

### Oggi

- `product/src/app/planner/page.tsx` — sparse approved Oggi only.
- `product/src/app/api/assistant/today-context-loader.ts` — authoritative timetable/calendar/session inputs; planner tasks remain available to assistant context where already required, not rendered in Oggi.
- `product/src/app/api/assistant/next-lesson-preparation-loader.ts` — reuse multi-lesson loader to resolve selected lesson metadata.
- `product/src/app/planner/today-home.css` — sparse visual hierarchy.

### Orario

- `product/src/app/orario/timetable-lesson-entrypoint.ts` + `.test.ts` — safe section/block/occurrence → lesson entrypoint mapping.
- `product/src/app/orario/TimetableExperience.tsx` — compute entrypoints while preserving view/update/manage flows.
- `product/src/app/orario/TimetableGrid.tsx` — read-only lesson activation; edit cells remain editor-only.

### Classi / Classe

- `product/src/app/classi/page.tsx` — selector.
- `product/src/app/classi/[sectionId]/page.tsx` — continuity-first Classe.
- `product/src/app/classi/[sectionId]/class-task-state.ts` + `.test.ts` — professional state decision; canonical lesson intent rather than visible phase navigation.
- `product/src/app/classi/[sectionId]/class-secondary-tools.tsx` — one `Altro della classe` disclosure.
- `product/src/app/classi/[sectionId]/class-ia-contract.test.ts` — first-level hierarchy contract.

### Lezione

- `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx` — canonical state resolution from occurrence/registration/intent, retaining governance gates.
- `lesson-shell.tsx` + `lesson-shell.module.css` — context/status header without four phase links.
- Existing prepare/live/observe/close clients — capability implementations reused, transitions changed to canonical intents/subtasks.
- `lesson-ia-contract.test.ts` — no phase nav/new-UI `mode=` generation.

### Materials and compatibility

- `product/src/app/knowledge/page.tsx` — teacher-facing Materiali e fonti stable home; tomorrow overview entry.
- `product/src/app/materiali/domani/page.tsx` — legacy-compatible route; no duplicate loader.
- `product/src/app/materiali/prossima/page.tsx` — legacy-compatible route.
- `product/src/app/page.tsx` — redirect root to Oggi.
- `product/src/app/workspace/page.tsx` — preserve existing redirect to Oggi.
- `product/src/app/giornata/resoconto/page.tsx` — keep reachable but unlinked in this rollout.
- `product/src/app/route-compatibility-contract.test.ts` — soft-retirement contract.

### Browser qualification

- `product/e2e/experience/information-architecture.spec.mjs` — four-entry shell + Altro groups.
- `product/e2e/experience/product-ia-reset.spec.mjs` — end-to-end IA reset journeys and explicit 320/390 responsive checks.
- Existing `product/playwright.experience.config.mjs` and `.github/workflows/experience-acceptance.yml` — reused unchanged unless a real discovery defect is demonstrated.

New `.test.ts` files must be added to the explicit `product/package.json` `test` script in the task that creates them.

---

### Task 1: Canonical lesson href and workspace-state primitives

**Files:**
- Create: `product/src/core/presentation/lesson-workspace-state.ts`
- Create: `product/src/core/presentation/lesson-workspace-state.test.ts`
- Modify: `product/src/core/presentation/human-task-content.ts`
- Modify: `product/src/core/presentation/human-task-content.test.ts`
- Modify: `product/package.json`

**Interfaces:**
- Produces `type LessonWorkspaceResolvedState = 'PREPARATION' | 'TEACHING' | 'REGISTRATION' | 'CONTINUITY' | 'AMBIGUOUS'`.
- Produces `type LessonWorkspaceIntent = 'start' | 'close' | null`.
- Produces `resolveLessonWorkspaceState(input: { localDate: string; minuteOfDay: number; occurrence: { localDate: string; startAt: string | null; endAt: string | null } | null; occurrenceAmbiguous: boolean; registered: boolean; intent: LessonWorkspaceIntent }): LessonWorkspaceResolvedState`.
- Produces `buildCanonicalLessonWorkspaceHref(sectionId: string, blockId: string, context?: { localDate?: string | null; occurrenceLogicalId?: string | null; intent?: 'start' | 'close' | null; subtask?: 'observe' | 'materials' | null }): string`.
- Preserves existing `buildLessonWorkspaceHref(sectionId, blockId, mode)` for legacy callers until Task 8.

- [ ] **Step 1: Write the failing state tests**

Pin future → PREPARATION, current → TEACHING, ended/unregistered → REGISTRATION, registered → CONTINUITY, ambiguous/timeless context → AMBIGUOUS, `intent=start` → TEACHING, and `intent=close` → REGISTRATION.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/core/presentation/lesson-workspace-state.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement state precedence**

Exact precedence: registered → CONTINUITY; ambiguous or explicit occurrence with unusable timing → AMBIGUOUS; `intent=close` → REGISTRATION; `intent=start` → TEACHING for a non-registered lesson; future → PREPARATION; current interval → TEACHING; ended → REGISTRATION; no occurrence → PREPARATION.

The resolver is presentation state only; approval/curricolo authority is enforced later by the lesson page and may prevent the requested state from becoming actionable.

- [ ] **Step 4: Write canonical-route tests**

Require phase-free canonical URL, encoded occurrence context, deterministic query ordering `date`, `occurrence`, `intent`, `subtask`, and unchanged legacy `?mode=` output from the existing helper.

- [ ] **Step 5: Implement the canonical builder and register the new test in `package.json`**

Do not change legacy builder behavior in this task.

- [ ] **Step 6: Run GREEN**

Run: `cd product && npx tsx --test src/core/presentation/lesson-workspace-state.test.ts src/core/presentation/human-task-content.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add product/src/core/presentation/lesson-workspace-state.ts product/src/core/presentation/lesson-workspace-state.test.ts product/src/core/presentation/human-task-content.ts product/src/core/presentation/human-task-content.test.ts product/package.json
git commit -m "feat(dos-ia): add canonical lesson workspace state"
```

---

### Task 2: Establish the four-entry shell and move generic Attività

**Files:**
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/src/components/app-shell/navigation.test.ts`
- Modify: `product/src/components/app-shell/app-shell.tsx`
- Create: `product/src/app/altro/page.tsx`
- Create: `product/src/app/altro/altro.css`
- Create: `product/src/app/attivita/page.tsx`
- Create: `product/src/app/attivita/planner-task-board.tsx`
- Create: `product/src/app/attivita/attivita.css`
- Move: `product/src/app/planner/actions.ts` → `product/src/app/attivita/actions.ts`
- Create: `product/src/app/attivita/attivita-ia-contract.test.ts`
- Modify: `product/package.json`

**Interfaces:**
- Primary rendered keys/labels are exactly `today/Oggi`, `timetable/Orario`, `classes/Classi`, `more/Altro`.
- Altro groups are exactly:
  - `Lavoro`: Attività, Progetta, Piano annuale
  - `Risorse e organizzazione`: Materiali e fonti, Calendario, Documentazione
  - `Sistema`: Impostazioni, Account e sicurezza
- Altro grouping adds no nested route layer.
- Child tool pages remain direct routes; AppShell marks `Altro` active when the current active key belongs to an Altro child.
- Planner server actions keep persistence semantics but revalidate `/attivita`.

- [ ] **Step 1: Rewrite navigation tests first**

Assert the exact four primary entries, exact three Altro groups/order, no primary Home, and no duplication of the four primary items inside Altro.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/components/app-shell/navigation.test.ts`

Expected: FAIL against current Home/Naviga model.

- [ ] **Step 3: Implement navigation constants and AppShell rendering**

Replace Home/Naviga primary behavior with the approved four-entry model. Keep command search capable of finding all tool destinations.

- [ ] **Step 4: Create `/altro` as one grouped page**

Render the three groups directly; do not introduce category pages or nested menu steps.

- [ ] **Step 5: Move PlannerTask UI/actions to `/attivita`**

Reuse current create/complete/move/wait/reopen behavior. Update server actions to revalidate `/attivita`. Do not change PlannerTask domain/repository types.

- [ ] **Step 6: Add relocation contract and register it in `npm test`**

Assert `/attivita` owns Planner controls and `planner/page.tsx` no longer imports Planner actions after Task 3 completes. Until Task 3, the test may pin only that `/attivita` has the complete behavior, then tighten in Task 3.

- [ ] **Step 7: Run GREEN**

Run: `cd product && npx tsx --test src/components/app-shell/navigation.test.ts src/app/attivita/attivita-ia-contract.test.ts && npm run typecheck`

- [ ] **Step 8: Commit**

```bash
git add product/src/components/app-shell product/src/app/altro product/src/app/attivita product/package.json
git commit -m "feat(dos-ia): establish four-entry shell and activities home"
```

---

### Task 3: Make Oggi sparse and direct-to-lesson

**Files:**
- Create: `product/src/core/presentation/today-ia-projection.ts`
- Create: `product/src/core/presentation/today-ia-projection.test.ts`
- Modify: `product/src/app/planner/page.tsx`
- Modify: `product/src/app/planner/today-home.css`
- Modify: `product/src/app/api/assistant/today-context-loader.ts` only if additional Calendar projection fields are required.
- Reuse: `product/src/app/api/assistant/next-lesson-preparation-loader.ts`
- Modify: `product/package.json`

**Interfaces:**
- Produces `TodayIAProjection` with `pendingLesson`, `nextLesson`, `calendarCommitments`, and safe ambiguity fallback.
- Consumes `HomeDailyContext`, projected Calendar occurrences and canonical lesson bundles for only the selected lessons.
- PlannerTask is not an input to the render projection.

- [ ] **Step 1: Write failing Oggi projection tests**

Pin: pending + upcoming coexist; most recent pending is selected when several exist; first current/upcoming is selected; Calendar commitments are compact records; ambiguity returns Orario fallback; no PlannerTask field exists; canonical lesson links never require Classe as an intermediate step.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/core/presentation/today-ia-projection.test.ts`

- [ ] **Step 3: Implement the pure projection**

Selection policy lives in the pure module. Resolve canonical metadata only for selected lessons using existing `loadLessonPreparationBundlesForLessons(...)`. Build canonical lesson hrefs with date + occurrence context.

- [ ] **Step 4: Recompose `planner/page.tsx`**

Render only, in order: optional `Lezione da registrare`; optional current/next lesson; compact Calendar commitments. Remove generic PlannerTask UI, quick links, full timeline, day-review CTA, tomorrow-material CTA, and generic summary dashboard.

If canonical lesson resolution fails, keep human-readable context and route to the safest known Orario/Classe surface; do not fabricate a block.

- [ ] **Step 5: Tighten Attività relocation contract**

Update Task 2 contract to assert `planner/page.tsx` no longer imports create/complete/move/wait/reopen Planner actions.

- [ ] **Step 6: Run GREEN**

Run: `cd product && npx tsx --test src/core/presentation/today-ia-projection.test.ts src/app/attivita/attivita-ia-contract.test.ts src/app/api/assistant/today-context-loader-contract.test.ts && npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add product/src/core/presentation/today-ia-projection.ts product/src/core/presentation/today-ia-projection.test.ts product/src/app/planner product/src/app/attivita/attivita-ia-contract.test.ts product/src/app/api/assistant/today-context-loader.ts product/package.json
git commit -m "feat(dos-ia): reduce Oggi to immediate teaching work"
```

---

### Task 4: Preserve Orario and add consultation-only direct Lezione entry

**Files:**
- Create: `product/src/app/orario/timetable-lesson-entrypoint.ts`
- Create: `product/src/app/orario/timetable-lesson-entrypoint.test.ts`
- Modify: `product/src/app/orario/TimetableExperience.tsx`
- Modify: `product/src/app/orario/TimetableGrid.tsx`
- Modify only if needed: `product/src/app/orario/timetable.css`, `product/src/app/orario/orario-guidance.css`
- Modify: `product/package.json`

**Interfaces:**
- Produces `resolveTimetableLessonEntrypoint(input: { mode: 'view' | 'update' | 'manage'; sectionId: string | null; blockId: string | null; localDate: string | null; occurrenceLogicalId: string | null; ambiguous: boolean }): { kind: 'LESSON' | 'CLASS'; href: string } | { kind: 'AMBIGUOUS' } | null`.
- In view mode, resolved modeled lesson → canonical Lezione href with date/occurrence context; known class but unresolved block → Classe href; ambiguity → safe no-guess state.
- In update/manage mode, no lesson navigation is produced.

- [ ] **Step 1: Write RED entrypoint tests**

Assert direct Lezione, Classe fallback, ambiguity, and update/manage no-navigation behavior.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/app/orario/timetable-lesson-entrypoint.test.ts`

- [ ] **Step 3: Build the view-mode entrypoint map**

Reuse annual snapshot/canonical source/projection logic already present in class planning. Do not mutate timetable data. Pass lesson entrypoints to `TimetableGrid` only in view mode.

- [ ] **Step 4: Change read-only cell/focus behavior only**

Resolved lesson: primary action `Apri la lezione`. Unresolved modeled context: `Apri la classe`. Edit mode keeps `openOccupiedCell`; no click ambiguity.

- [ ] **Step 5: Add literal-tomorrow contextual materials affordance**

When day view is showing the actual next local date, expose secondary `Materiali di domani` pointing to the stable Materiali e fonti tomorrow context introduced in Task 7. Until Task 7 lands, use a helper/placeholder interface in code only if the route is already stable; otherwise defer wiring but keep the test specification here.

- [ ] **Step 6: Run GREEN + timetable regressions**

Run:

```bash
cd product && npx tsx --test \
  src/app/orario/timetable-lesson-entrypoint.test.ts \
  src/app/orario/timetable-grid-model.test.ts \
  src/app/orario/timetable-operational-model.test.ts \
  src/app/orario/timetable-import-feedback.test.ts \
  src/app/orario/timetable-action-feedback.test.ts
```

Then `npm run typecheck`.

- [ ] **Step 7: Commit**

```bash
git add product/src/app/orario product/package.json
git commit -m "feat(dos-ia): open resolved lessons from timetable view"
```

---

### Task 5: Recompose Classi / Classe as selector + continuity

**Files:**
- Modify: `product/src/app/classi/page.tsx`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify: `product/src/app/classi/[sectionId]/class-task-state.ts`
- Modify: `product/src/app/classi/[sectionId]/class-task-state.test.ts`
- Create: `product/src/app/classi/[sectionId]/class-secondary-tools.tsx`
- Create: `product/src/app/classi/[sectionId]/class-ia-contract.test.ts`
- Modify: `product/src/app/classi/class-workspace-operational.css`
- Modify: `product/package.json`

**Interfaces:**
- Class task states remain professionally equivalent to current behavior but new modeled-lesson CTAs use canonical phase-free Lezione hrefs.
- `ClassSecondaryTools` receives already-computed data/URLs and renders exactly one disclosure labeled `Altro della classe`.
- Diario remains outside that disclosure and always visible.

- [ ] **Step 1: Write failing Class IA contract**

Assert selector role for Classi and, for Classe: one dominant work focus/CTA, latest actual work, next activity, essential progress/context, visible Diario, exactly one `Altro della classe`, and absence of separate first-level Supporti/Altri percorsi/Dettagli tecnici disclosures.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test 'src/app/classi/[sectionId]/class-ia-contract.test.ts'`

- [ ] **Step 3: Switch modeled CTA to canonical lesson href**

Keep `resolveClassTaskDecision` professional state semantics. Supply occurrence date/logical-id when known. Unmodeled inline-recorder capability remains available under `Altro della classe`; do not drop it.

- [ ] **Step 4: Extract secondary capabilities**

Move materials, Piano annuale, Progetta, Knowledge, Curricolo Arena, advanced registration/completion, cattedra and technical/provenance details into `ClassSecondaryTools`. Preserve all underlying server actions/data.

- [ ] **Step 5: Keep Diario as the only named always-visible secondary action**

Place `Apri Diario` directly after continuity/CTA.

- [ ] **Step 6: Run GREEN + class regressions**

Run:

```bash
cd product && npx tsx --test \
  'src/app/classi/[sectionId]/class-ia-contract.test.ts' \
  'src/app/classi/[sectionId]/class-task-state.test.ts' \
  src/app/classi/class-workspace-model.test.ts \
  src/app/classi/class-counts.test.ts
```

Then `npm run typecheck`.

- [ ] **Step 7: Commit**

```bash
git add product/src/app/classi product/package.json
git commit -m "feat(dos-ia): make Classe a continuity surface"
```

---

### Task 6: Turn Lezione into one automatically resolved workspace

**Files:**
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.module.css`
- Modify: `lesson-prepare-client.tsx`
- Modify: `lesson-live-client.tsx`
- Modify: `lesson-observe-client.tsx`
- Modify: `lesson-close-client.tsx`
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-ia-contract.test.ts`
- Modify: `product/package.json`
- Reuse: Task 1 state resolver and canonical href builder.

**Interfaces:**
- Canonical search params: `date`, `occurrence`, `intent`, `subtask`; legacy `mode` accepted only as compatibility input.
- New UI never emits `mode=prepare|teach|observe|record`.
- `LessonShell` becomes context/status header; it has no phase navigation.
- `intent=start` comes only from preparation CTA; `intent=close` only from teaching CTA.
- `subtask=observe` exposes observation contextually; `subtask=materials` exposes lesson materials contextually.

- [ ] **Step 1: Write RED shell/route contract**

Assert no `PHASES`, no `aria-label="Fasi della lezione"`, no four phase links, and no new-client `?mode=` generation.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-ia-contract.test.ts'`

- [ ] **Step 3: Resolve reliable occurrence context server-side**

When `date` + `occurrence` arrive from Oggi/Orario, verify the occurrence belongs to the requested section. Without explicit occurrence, use only a unique reliable current/nearest section occurrence; overlapping/unresolved timing is AMBIGUOUS.

- [ ] **Step 4: Resolve visible state and enforce governance**

Call Task 1 resolver. Completed registration/progress wins as CONTINUITY. `intent=start/close` requests a transition but does not bypass curricolo/preparation approval. If TEACHING/REGISTRATION would violate a gate, keep the Lezione context visible and render the blocker/preparation state in human language rather than redirecting to a visible phase URL.

- [ ] **Step 5: Remove phase navigation and convert transitions**

Preparation CTA → canonical route with `intent=start`; teaching final CTA → canonical route with `intent=close`; observation/materials → canonical `subtask`; registration completion → continuity/Oggi while preserving existing receipts and persistence.

- [ ] **Step 6: Run GREEN + lesson domain regressions**

Run:

```bash
cd product && npx tsx --test \
  'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-ia-contract.test.ts' \
  src/core/presentation/lesson-workspace-state.test.ts \
  'src/app/classi/[sectionId]/lezioni/register-boundary.test.ts' \
  'src/app/classi/[sectionId]/lezioni/voice-capture-boundary.test.ts' \
  'src/app/classi/[sectionId]/lezioni/lesson-registration-model.test.ts' \
  'src/app/classi/[sectionId]/lezioni/lesson-observation-model.test.ts' \
  'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-feedback.test.ts' \
  'src/app/classi/[sectionId]/lezioni/lesson-registration-runtime-contract.test.ts' \
  'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-error-contract.test.ts'
```

Then `npm run typecheck`.

- [ ] **Step 7: Commit**

```bash
git add 'product/src/app/classi/[sectionId]/lezioni' product/package.json
git commit -m "feat(dos-ia): unify lesson workspace state"
```

---

### Task 7: Give Materiali di domani one stable home and keep lesson materials contextual

**Files:**
- Modify: `product/src/app/knowledge/page.tsx`
- Modify: `product/src/components/app-shell/navigation.ts` for teacher-facing `Materiali e fonti` label.
- Modify: `product/src/app/orario/TimetableExperience.tsx` for tomorrow contextual entry.
- Modify: lesson clients only if any new UI still links `/materiali/prossima`.
- Create: `product/src/app/materiali/materials-ia-contract.test.ts`
- Modify: `product/package.json`

**Interfaces:**
- Stable teacher-facing home remains the existing `/knowledge` domain surface, labeled `Materiali e fonti`.
- `Materiali di domani` is exposed there through a stable focus/entry (recommended URL: `/knowledge?focus=domani`) reusing the existing tomorrow loader/rendering logic rather than duplicating it.
- Orario literal-tomorrow contextual link points to the same stable entry.
- Current-lesson materials use Lezione `subtask=materials`; new UI does not require `/materiali/prossima`.

- [ ] **Step 1: Write RED materials IA contract**

Assert label `Materiali e fonti`, stable tomorrow entry under `/knowledge`, no Oggi tomorrow-material link, no new lesson transition through `/materiali/prossima`, and continued existence of legacy material routes.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/app/materiali/materials-ia-contract.test.ts`

- [ ] **Step 3: Reuse existing tomorrow projection in Materiali e fonti**

Do not create a second loader. Preserve provenance, canonical linkage, role-view status and revalidation semantics.

- [ ] **Step 4: Wire Orario tomorrow contextual link**

Only show it when the selected day is the literal next Rome-local date and mode is view. Never show in timetable edit/manage mode.

- [ ] **Step 5: Run GREEN + material regressions**

Run:

```bash
cd product && npx tsx --test \
  src/app/materiali/materials-ia-contract.test.ts \
  src/app/materiali/prossima/lesson-materials-view-model.test.ts \
  src/core/presentation/lesson-material-renderer.test.ts \
  src/core/presentation/lesson-preparation-materials.test.ts \
  src/core/presentation/roleview-governance.test.ts
```

Then `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add product/src/app/knowledge product/src/app/materiali product/src/app/orario/TimetableExperience.tsx product/src/components/app-shell/navigation.ts product/src/app/classi/'[sectionId]'/lezioni product/package.json
git commit -m "feat(dos-ia): place materials in stable and contextual homes"
```

---

### Task 8: Apply soft route retirement without capability loss

**Files:**
- Modify: `product/src/app/page.tsx`
- Verify unchanged: `product/src/app/workspace/page.tsx`
- Verify/unlink: `product/src/app/giornata/resoconto/page.tsx`
- Keep compatible: `product/src/app/materiali/domani/page.tsx`
- Keep compatible: `product/src/app/materiali/prossima/page.tsx`
- Keep compatible until deterministic mapping exists: `product/src/app/classi/[sectionId]/in-classe/[assetId]/...`
- Create: `product/src/app/route-compatibility-contract.test.ts`
- Modify: `product/package.json`

**Interfaces:**
- `/` redirects to `/planner`.
- `/workspace` continues redirecting to `/planner`.
- `/giornata/resoconto` remains reachable but is no longer linked by the new primary UX in this rollout.
- Legacy `mode` lesson links remain accepted by Lezione compatibility logic but are not emitted by new UI.
- Legacy material routes remain reachable until a deterministic canonical redirect is proven.

- [ ] **Step 1: Write RED compatibility contract**

Assert root is redirect-only to Oggi, workspace remains Oggi, no new primary page links day review, and legacy route files remain present/non-deleted.

- [ ] **Step 2: Run RED**

Run: `cd product && npx tsx --test src/app/route-compatibility-contract.test.ts`

- [ ] **Step 3: Replace duplicate Home with redirect**

Remove the autonomous Home decision engine; do not recreate its quick links elsewhere.

- [ ] **Step 4: Stop generating legacy links before redirecting anything else**

Search new canonical UI for `/giornata/resoconto`, `/materiali/prossima`, direct `in-classe/...`, and `?mode=`. Remove only call sites whose capability already exists in canonical context. Keep legacy endpoints operational.

- [ ] **Step 5: Run GREEN**

Run: `cd product && npx tsx --test src/app/route-compatibility-contract.test.ts && npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add product/src/app/page.tsx product/src/app/workspace/page.tsx product/src/app/giornata/resoconto product/src/app/materiali product/src/app/classi product/src/app/route-compatibility-contract.test.ts product/package.json
git commit -m "refactor(dos-ia): retire duplicate home and preserve legacy routes"
```

---

### Task 9: Browser acceptance, exact-head qualification and Human Product Review

**Files:**
- Modify: `product/e2e/experience/information-architecture.spec.mjs`
- Create: `product/e2e/experience/product-ia-reset.spec.mjs`
- Reuse unchanged unless a real defect is demonstrated: `product/playwright.experience.config.mjs`, `.github/workflows/experience-acceptance.yml`

**Interfaces:**
- Existing HVA projects remain the governed browser gate.
- `product-ia-reset.spec.mjs` uses `page.setViewportSize(...)` inside dedicated responsive tests for 320×800 and 390×844 so no second Playwright configuration is introduced.
- Evidence uses existing screenshot/artifact conventions.

- [ ] **Step 1: Update shell browser contract**

Require primary labels exactly `Oggi`, `Orario`, `Classi`, `Altro`; open Altro and assert the three approved groups and eight tool labels; assert Home is absent as primary destination.

- [ ] **Step 2: Add end-to-end IA reset journeys**

Cover: Oggi pending/upcoming behavior; compact Calendar commitments without Planner controls; Orario day/week preservation; consultation direct Lezione vs edit-mode editor; Classi/Classe hierarchy; visible Diario + Altro della classe; all four Lezione states; contextual observation/materials; Altro → Materiali e fonti → Materiali di domani; `/` → Oggi; legacy `?mode=` and material routes still safe.

Authenticated browser evidence for pending registration + upcoming lesson + compact Calendar commitment is mandatory. If current governed runtime data cannot deterministically produce that coexistence, do not substitute the Task 3 pure-model test: record this browser qualification requirement as `UNVERIFIED` and keep Task 9 open until deterministic governed browser data can exercise the rendered state. Do not fabricate test data.

- [ ] **Step 3: Add explicit 320/390 responsive assertions**

In two focused tests, set viewport to 320×800 and 390×844 and assert: no horizontal overflow; primary touch targets >=44 px where measurable; no technical identifiers at first level; lesson global nav remains secondary. Keep desktop coverage through existing desktop HVA project.

- [ ] **Step 4: Run full product verification**

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 5: Run targeted local browser acceptance when governed credentials/runtime are available**

Run:

```bash
cd product
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test --config=playwright.experience.config.mjs \
  e2e/experience/information-architecture.spec.mjs \
  e2e/experience/product-ia-reset.spec.mjs
```

If governed credentials are unavailable, record local browser gate as not executed; never call it PASS.

- [ ] **Step 6: Observe PR Human + Visual Acceptance on exact head**

Confirm `hva/application` runs on the exact PR head and passes. Missing credentials are ERROR/not-executed, not PASS. Do not use Render Beta as proof of a PR head before promotion.

- [ ] **Step 7: Human Product Review**

On the exact candidate head, judge: teacher understands next action without module vocabulary; Oggi remains sparse; Orario is at least as convenient; Classe feels like continuity; Lezione is one coherent workspace; Altro is complete but calm; no professional capability disappeared. Record `PASS | REWORK | REJECT` separately from automated HVA.

- [ ] **Step 8: Independent whole-branch review**

Use a fresh reviewer after all automated gates pass. Require explicit review of spec coverage, fail-closed governance, route compatibility, capability preservation and responsive hierarchy. Any blocker gets a targeted RED/GREEN fix and rerun.

- [ ] **Step 9: Commit browser contract changes**

```bash
git add product/e2e/experience/information-architecture.spec.mjs product/e2e/experience/product-ia-reset.spec.mjs
git commit -m "test(dos-ia): qualify product IA reset"
```

- [ ] **Step 10: Stop at qualified PR head**

Report exact head, automated gates, HVA, Human Product Review and residual risks. Do not merge or deploy without separate authorization.

---

## Self-Review Result

### Spec coverage

- primary backbone/Home removal → Tasks 2 and 8;
- Oggi + PlannerTask separation → Tasks 2–3;
- Orario preservation/direct lesson entry → Task 4;
- Classi/Classe/Diario hierarchy → Task 5;
- one Lezione/state resolution/action intents/contextual capabilities → Tasks 1 and 6;
- Altro grouping → Task 2;
- Materiali di domani stable/contextual home → Tasks 4 and 7;
- soft legacy retirement/capability parity → Task 8;
- automated/browser/responsive/human qualification → Task 9.

No requirement needs a database migration or domain-authority rewrite.

### Step scan

Tasks 1–8 each have an executable RED contract, one owning implementation boundary, GREEN verification and commit boundary. Task 9 is qualification-only except for browser test code. No task asks the implementer to invent an unresolved product decision.

### Type consistency

Cross-task contracts are explicit and stable:

- `resolveLessonWorkspaceState(...) -> PREPARATION | TEACHING | REGISTRATION | CONTINUITY | AMBIGUOUS`;
- `buildCanonicalLessonWorkspaceHref(...)` carries optional `date`, `occurrence`, `intent`, `subtask` and no visible phase;
- `TodayIAProjection` exposes only pending/next lesson + compact Calendar commitments;
- `resolveTimetableLessonEntrypoint(...)` emits LESSON/CLASS/AMBIGUOUS/null and never activates lessons in edit/manage mode.

Legacy `buildLessonWorkspaceHref(..., mode)` remains compatibility-only until Task 8.

### Review Focus coverage

All five high-risk conditions are pinned by executable tests or browser journeys and rerun in Task 9. The Oggi pending-registration + upcoming-lesson + Calendar coexistence additionally requires authenticated human-visible browser evidence and remains `UNVERIFIED` until that rendered state is exercised; a pure-model test cannot substitute for it. Action-driven start/close semantics are explicitly covered, and Resoconto is not prematurely redirected.

### Proportion and scope

The plan reuses current repositories, loaders, Planner persistence, timetable UI, lesson clients, Diary and materials logic. It adds only focused presentation/routing models and browser contracts; no new subsystem or parallel test framework is introduced.
