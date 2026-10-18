# DOS-UX-01 Task-Centric Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the human-reviewed Docente OS teacher journey `OGGI → PREPARA → MATERIALI → VISUALIZZA → CONDUCI → OSSERVA → REGISTRA → CONTINUA`, while preserving existing domain authorities and keeping Classi/Progetta/Conoscenza/Piano/Atlas as subordinate capabilities rather than mandatory waypoints.

**Architecture:** Recompose existing presentation and routing around the already-existing lesson workspace, Today focus, material suggestions, TeachingSession receipt and continuity state. Introduce presentation-only shell/material/continue surfaces where needed; do not add a new lesson/material/continuity domain, schema, store or curriculum authority. Implement in reviewable vertical slices, each independently testable and preserving fail-closed behavior.

**Tech Stack:** Next.js / React / TypeScript, existing CSS modules/global design tokens, existing server actions and presentation models, Playwright experience tests, repository Product CI/CV2 gates.

**Spec:** `docs/superpowers/specs/2026-10-18-docente-os-task-centric-flow-architecture-design.md`

**Supporting analysis:** `docs/superpowers/specs/2026-10-18-docente-os-task-centric-gap-matrix.md`

**Visual source of truth:** canonical PNG recorded by `docs/superpowers/evidence/2026-10-18-docente-os-task-centric-p0-visual-review.md`; Figma is editable review support only.

## Global Constraints

- Preserve the primary professional cycle: `ORIENTA → PREPARA → CONDUCI → OSSERVA → REGISTRA → CONTINUA`.
- One dominant professional object and one primary CTA per focused view; at most two secondary actions at the same visual level.
- Preserve class, discipline, human lesson title and current professional phase throughout the lesson cycle.
- No technical codes (`B01`, `CAN-PACK-*`, UUIDs, generation IDs) at first visual level.
- Material source is provenance, not navigation.
- No Atlas affordance unless a qualified Atlas resource actually exists.
- Studio Atlas runtime handoff remains deferred; do not simulate it.
- No new schema, lesson domain, materials store, continuity store or curriculum authority.
- Existing Arena/curriculum, timetable/calendar, TeachingSession, Knowledge and Atlas authority boundaries remain unchanged.
- Existing preparation approval remains explicit and governed; visual simplification must not weaken approval/revalidation rules.
- Privacy-first: no student identity/auth/tracking is introduced.
- Mobile-first: touch targets at least 44 px; no horizontal scrolling at 320 px.
- The canonical visual flow Human Review is PASS; implementation must not reinterpret the approved flow without a new human design decision.
- No production deploy or merge is authorized by this plan.

## Review Focus

1. **Unresolved/ambiguous next lesson:** preserve known class/time/continuity and offer a task-language recovery action; never dump the teacher into `Classi → Progetta` to reconstruct context.
2. **No qualified Atlas resource:** Materiali remains complete and truthful with Knowledge/other sources; Atlas UI is absent rather than empty or synthetic.
3. **Task-aware Knowledge preview:** opening and returning from a resource preserves lesson identity and return target; generic Knowledge management chrome does not leak into focused mode.
4. **Partial/remodelled/recovered lesson:** registration records reality and CONTINUA derives the next step from the receipt/continuity state rather than blindly advancing the annual plan.
5. **Small mobile viewport / long Italian copy:** 320 px layout has no horizontal overflow, CTA hierarchy remains unambiguous and phase identity stays readable.

---

## File Structure / Responsibility Map

The implementation should reuse existing files and introduce only focused presentation units. Exact existing paths are confirmed on baseline `develop@692dcce6b2d75c45780d147118f6436a6704d7`.

- `product/src/app/planner/today-teaching-focus-card.tsx` — Oggi primary lesson card and continuity presentation.
- `product/src/core/presentation/today-teaching-focus.ts` — existing Today teaching decision model; extend only if a view state cannot be derived cleanly.
- `product/src/app/api/assistant/today-context-loader.ts` — existing daily authoritative loader; no second daily data source.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx` — PREPARA composition.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.tsx` — existing material intent/attach logic; split presentation from broader authoring rather than duplicating actions.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx` — CONDUCI; keep business behavior, integrate focused shell/material continuity.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx` — OSSERVA; keep behavior, integrate shell/noise budget.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx` — REGISTRA fast path and transition to CONTINUA while preserving canonical receipt.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css` — existing lesson visual system; extend rather than create a parallel visual language.
- `product/src/core/presentation/human-task-content.ts` — existing workspace href/projection authority; preserve as canonical lesson projection source.
- existing Knowledge task-continuity module/page — focused material preview/return contract; locate exact path at execution start and modify in place.
- **Create:** `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.tsx` — presentation-only persistent class/lesson/phase frame.
- **Create:** `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials.tsx` — focused material subtask extracted from existing `LessonDesignTools`; consumes existing actions/suggestions.
- **Create:** `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continue.tsx` — post-registration presentation derived from existing receipt/continuity data.
- `product/e2e/experience/` — extend existing teacher-first/browser certification coverage; prefer the current J1/HVA fixture discipline rather than creating a second fixture authority.

---

### Task 1: Freeze the approved flow as executable browser contract

**Files:**
- Create: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`
- Reuse fixture patterns from: `product/e2e/experience/today-teacher-first.spec.mjs`

**Interfaces:**
- Consumes: existing authenticated HVA/browser fixture and real authoritative lesson context.
- Produces: one fail-closed end-to-end contract for the approved flow and alternate-state assertions used by later tasks.

- [ ] **Step 1: Write the failing P0/P1 journey test**

Assert, on the existing governed fixture, that the user can traverse without mandatory domain detours:
`Oggi → Prepara → Materiali → preview → back to Prepara → Conduci → Osserva → Registra → Continua`.

The test must assert visible class/lesson identity at every focused state, one primary CTA, absence of `B01`/`CAN-PACK`/Knowledge product identity in focused views, and predictable return links.

- [ ] **Step 2: Add failure-mode assertions**

Cover the Review Focus cases that can be represented without mutating canonical authorities: no Atlas suggestion, task-aware Knowledge return, long-copy 320 px overflow, and partial/remodelled registration fixture where existing test data supports it. Fail closed rather than fabricating a lesson or Atlas resource.

- [ ] **Step 3: Run the new spec against the baseline and record RED**

Run the repository’s existing Playwright experience command scoped to `task-centric-teacher-flow.spec.mjs`.
Expected: FAIL specifically because the current UI still exposes the old composition/waypoints; authentication or fixture setup must PASS.

- [ ] **Step 4: Commit the RED contract**

Commit only the test/spec fixture changes. Preserve the RED evidence SHA for later qualification.

---

### Task 2: Make Oggi the single operational cockpit

**Files:**
- Modify: `product/src/app/planner/today-teaching-focus-card.tsx`
- Modify only if required by tests: `product/src/core/presentation/today-teaching-focus.ts`
- Modify only if required to converge existing decisions: `product/src/app/api/assistant/today-context-loader.ts`
- Modify the existing Home/mobile navigation files located during execution; do not create a second orchestration service.
- Test: existing Today presentation/unit tests + `task-centric-teacher-flow.spec.mjs`

**Interfaces:**
- Consumes: existing `TodayTeachingFocus` and authoritative Today loader.
- Produces: one operational daily entry with deterministic CTA labels and task-language ambiguity fallback.

- [ ] **Step 1: Add failing presentation tests**

Pin the approved states: `Prepara lezione`, `Continua la lezione`, `Registra la lezione`, `Riprendi`; assert known context is retained when canonical next phase is uncertain and no mandatory `Apri la classe` recovery is used when task-language recovery is possible.

- [ ] **Step 2: Run scoped tests and confirm RED**

Expected: failures describe duplicate/old entry hierarchy or old fallback semantics, not loader/auth errors.

- [ ] **Step 3: Implement the minimal Oggi recomposition**

Reuse current focus/continuity data. Demote the rest of day below the dominant task. Remove Home as a competing primary mobile entry using the smallest route/navigation change consistent with the approved visual contract; preserve reusable Home orchestration logic rather than deleting it.

- [ ] **Step 4: Verify unit + browser slice GREEN**

Run scoped Today tests and the Oggi→Prepara portion of the browser contract at 390 px and 320 px.

- [ ] **Step 5: Commit**

Commit only Oggi/navigation changes and their tests.

---

### Task 3: Introduce the persistent Lesson Shell

**Files:**
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.tsx`
- Modify: lesson workspace route/layout component that selects `prepare|teach|observe|record` (locate exact file on execution branch)
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`
- Test: focused shell component/presentation tests + browser contract

**Interfaces:**
- Consumes: section label, discipline, human lesson title, temporal label, active phase and existing workspace href builder.
- Produces: `LessonShell` presentation component shared by PREPARA/CONDUCI/OSSERVA/REGISTRA and material preview.

- [ ] **Step 1: Write failing shell tests**

Assert class + discipline + human title + active phase are present; technical block IDs are absent; only the active phase is emphasized; `← Oggi` is the predictable focused exit; global navigation is perceptually subordinate without becoming inaccessible.

- [ ] **Step 2: Run scoped tests and confirm RED**

- [ ] **Step 3: Implement `LessonShell` as presentation-only composition**

Do not add persisted state. Derive all fields from existing route/projection/time context. Preserve existing workspace URLs.

- [ ] **Step 4: Integrate shell into PREPARA/CONDUCI/OSSERVA/REGISTRA without changing their domain actions**

- [ ] **Step 5: Verify 320/390 px and desktop reference**

Assert no horizontal overflow, >=44 px actionable targets, and stable phase identity.

- [ ] **Step 6: Commit**

---

### Task 4: Recompose PREPARA and extract MATERIALI as a focused subtask

**Files:**
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx`
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-materials.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`
- Test: PREPARA/material intent tests + browser contract

**Interfaces:**
- Consumes: existing preparation approval, `LessonKnowledgeSuggestion[]`, `LessonAtlasSuggestion[]`, `LessonDesignExtension[]`, and existing `runLessonDesignWrite` actions.
- Produces: focused PREPARA hierarchy and Materiali subtask; no new material persistence.

- [ ] **Step 1: Write failing PREPARA hierarchy tests**

Assert above-the-fold objective, essentials/readiness, one approval/proceed CTA, `Materiali` and `Adatta` secondary actions; assert `LessonDesignTools` broad authoring is not required to reach materials.

- [ ] **Step 2: Write failing MATERIALI tests**

Assert first-level `Riutilizza | Adatta | Crea`, cards answer what/why/provenance/action, Atlas appears only when `atlasSuggestions.length > 0`, and existing attach/adapt/create actions remain explicit teacher decisions.

- [ ] **Step 3: Run scoped tests and confirm RED**

- [ ] **Step 4: Extract focused material presentation from `LessonDesignTools`**

Reuse its existing action wiring and suggestion types. Keep broader sequence tools/replanning behind `Vedi progettazione completa`; do not duplicate `runLessonDesignWrite` or create a new material library.

- [ ] **Step 5: Recompose PREPARA around the approved visual hierarchy**

Keep preparation approval/revalidation semantics unchanged. `Approva e procedi` must still validate the current projection/material acceptance state.

- [ ] **Step 6: Verify GREEN and commit**

Run unit/component tests plus Oggi→Prepara→Materiali browser slice at 320/390 px.

---

### Task 5: Make material preview task-aware instead of Knowledge-aware

**Files:**
- Modify: existing Knowledge task-continuity module/page located on execution branch.
- Modify: material suggestion links in `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.tsx` / `lesson-materials.tsx`.
- Test: Knowledge task-continuity tests + browser contract

**Interfaces:**
- Consumes: existing mode/returnTo/section/block task-continuity parameters and Knowledge asset data.
- Produces: focused material viewer preserving Lesson Shell and returning to Materiali/Prepara.

- [ ] **Step 1: Write failing task-aware viewer tests**

When opened from PREPARA, assert lesson identity and resource preview dominate; `Usa nella lezione` is primary where eligible; source/provenance is secondary; processing/generation/chunk/version management and generic `Conoscenza` product chrome are not first-level UI.

- [ ] **Step 2: Write return-path test**

Open material from Materiali, then return; assert same section/block/lesson context without reconstruction.

- [ ] **Step 3: Run tests and confirm RED**

- [ ] **Step 4: Implement focused branch using existing task-continuity contract**

Do not create a new Knowledge route or record type. Direct generic Knowledge entry remains EXPLORE and unchanged except for shared presentation fixes.

- [ ] **Step 5: Verify GREEN and commit**

---

### Task 6: Integrate CONDUCI and OSSERVA into the focused cycle

**Files:**
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx`
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`
- Test: existing live/observe tests + browser contract

**Interfaces:**
- Consumes: `LessonShell`, existing lesson projection steps/resources/evidence and accepted material links.
- Produces: classroom runbook and observation surface with uninterrupted lesson identity.

- [ ] **Step 1: Add failing CONDUCI tests**

Assert current step, timing, instruction and selected material dominate; authoring/full UDA/unused catalogue do not; material links preserve task context; one forward CTA dominates.

- [ ] **Step 2: Add failing OSSERVA tests**

Assert only current evidence/checklist first; full rubric/details are progressive; privacy-preserving reminders remain non-student-identifying; transition back/forward is predictable.

- [ ] **Step 3: Run scoped tests and confirm RED**

- [ ] **Step 4: Apply minimal shell/material-link recomposition**

Do not redesign the existing runbook or introduce a new assessment subsystem.

- [ ] **Step 5: Verify GREEN and commit**

---

### Task 7: Recompose REGISTRA and add CONTINUA presentation state

**Files:**
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx`
- Create: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continue.tsx`
- Modify the lesson workspace route/action return handling located during execution.
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css`
- Test: registration/TeachingSession tests + browser contract

**Interfaces:**
- Consumes: existing TeachingSession write/receipt, `nextActivity`, progress/outcome semantics and existing continuity/class task state.
- Produces: fast registration presentation plus post-save CONTINUA view; no new persistence.

- [ ] **Step 1: Write failing registration fast-path tests**

Assert factual outcome/status is first, optional detail is progressive, `nextActivity` remains optional, and canonical save still produces the existing TeachingSession receipt.

- [ ] **Step 2: Write failing CONTINUA tests**

After successful save, assert registration success, actual outcome, recorded next activity when present, next preparation action when determinable, and `Torna a Oggi`. For partial/remodelled/recovered outcomes, assert the view reflects recorded reality and does not auto-advance solely from annual-plan order.

- [ ] **Step 3: Run scoped tests and confirm RED**

- [ ] **Step 4: Implement minimal REGISTRA recomposition**

Preserve current governance, optional reflection/Copilot/voice capabilities behind progressive disclosure.

- [ ] **Step 5: Implement `LessonContinue` from existing receipt + continuity data**

No new store. If next lesson cannot be determined safely, show truthful known context and a task-language recovery action.

- [ ] **Step 6: Verify GREEN and commit**

---

### Task 8: Recompose Classe as voluntary longitudinal context

**Files:**
- Modify: existing `product/src/app/classi/[sectionId]/...` class workspace files located during execution.
- Test: class task-state/presentation tests + browser contract

**Interfaces:**
- Consumes: existing class task decision (`PREPARE / TEACH / RECORD / CATCH_UP / AFTER_RECORD`), sessions, progress, next block and materials.
- Produces: voluntary class overview with one context-sensitive primary CTA.

- [ ] **Step 1: Write failing class-view tests**

Assert next lesson, last actual work, next activity, progress and recent context are visible; Classi is not required by the primary journey; Progetta/Knowledge/Piano are secondary exploration.

- [ ] **Step 2: Run tests and confirm RED**

- [ ] **Step 3: Recompose presentation only**

Reuse the existing class state machine; do not create another continuity model.

- [ ] **Step 4: Verify GREEN and commit**

---

### Task 9: Alternate states, accessibility and responsive hardening

**Files:**
- Modify only files owned by Tasks 2–8 where failures are found.
- Extend: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`
- Extend existing accessibility/browser certification specs rather than creating a parallel certification system.

**Interfaces:**
- Consumes: completed task-centric flow.
- Produces: qualified behavior across ambiguity, missing Atlas, long copy, keyboard/touch and mobile widths.

- [ ] **Step 1: Pin ambiguous-context fallback**

Assert known class/time/last work remain visible; uncertainty is stated in teacher language; no fabricated lesson title/phase and no mandatory domain detour.

- [ ] **Step 2: Pin Atlas-unavailable state**

Assert no Atlas card/tab/empty promise is rendered when no qualified suggestion exists; Knowledge/other materials continue normally.

- [ ] **Step 3: Pin accessibility/noise budget**

Assert semantic headings/labels, keyboard reachability, visible focus, >=44 px actionable targets where measurable, one dominant primary action, and no technical identifiers at first level.

- [ ] **Step 4: Pin 320/390 px responsive behavior**

Assert no horizontal overflow and no clipped primary CTA for long Italian labels/content.

- [ ] **Step 5: Run full browser experience suite and fix only evidenced regressions**

- [ ] **Step 6: Commit**

---

### Task 10: Exact-head qualification and Human Review handoff

**Files:**
- Update: `docs/superpowers/evidence/2026-10-18-docente-os-task-centric-p0-visual-review.md` or create a separate implementation qualification receipt if clearer.
- No product change after qualification starts unless a failing gate requires a new exact head.

**Interfaces:**
- Consumes: completed implementation branch.
- Produces: exact-head engineering qualification and a Beta-ready Human Review candidate; does not itself authorize merge/deploy.

- [ ] **Step 1: Run Product CI on exact head**

Require typecheck/tests/lint/build and any governed DB/replay gates selected by repository policy.

- [ ] **Step 2: Run CV2/browser certification on the same exact head**

Require task-centric flow PASS at mobile and desktop, WCAG/accessibility gate PASS, and visual evidence artifacts.

- [ ] **Step 3: Compare implementation screenshots against the canonical PNG**

Judge hierarchy/flow fidelity, not literal photographic identity where runtime content differs. Any material divergence in CTA hierarchy, task identity or domain leakage is REWORK.

- [ ] **Step 4: Record exact SHA, runs, artifacts and residual risks**

Do not mark Human Review PASS automatically.

- [ ] **Step 5: Stop at the deployment boundary**

Request explicit authorization before integration/fast-forward/Beta promotion. No production deploy.

---

## Self-Review Result

- **Spec coverage:** all primary nodes (`OGGI`, `PREPARA`, `MATERIALI`, material viewer, `CONDUCI`, `OSSERVA`, `REGISTRA`, `CONTINUA`, voluntary `CLASSE`) are owned by a task; Explore/Progetta/Knowledge generic mode remain intentionally secondary rather than redesigned wholesale.
- **Authority coverage:** no task adds a competing timetable, lesson, material, continuity or curriculum authority; Atlas/Studio Atlas maturity constraints are preserved.
- **Failure-mode coverage:** ambiguity, no Atlas, task-aware Knowledge return, partial/remodelled continuity and 320 px/long-copy cases are pinned to Tasks 2, 5, 7 and 9.
- **Type/interface consistency:** new units are presentation-only (`LessonShell`, focused `lesson-materials`, `LessonContinue`) and consume existing domain types/actions rather than inventing persistence contracts.
- **Proportion:** the plan deliberately specifies boundaries, tests and file ownership; implementation details remain with the executor.

## Execution Gate

This plan is ready for human review. Approval of this plan authorizes implementation planning completion only; execution should begin only after the user explicitly approves the plan and chooses/retains an execution method.
