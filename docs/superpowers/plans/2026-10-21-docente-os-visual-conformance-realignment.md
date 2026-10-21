# DOCENTE OS — Visual Conformance Realignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realign the current Docente OS Beta presentation to the frozen task-centric visual contract without changing routes, domain authorities, persistence, curricolo semantics, TeachingSession write authority, Atlas governance or Production.

**Architecture:** Recompose existing presentation surfaces in place. Preserve all current server actions, domain models, routes and receipts; change only first-level composition, progressive disclosure, focused-mode shell treatment and visual hierarchy. Each vertical slice starts with an executable RED browser/source contract, applies the smallest presentational change, then returns to GREEN before the next slice.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript 5.9.2, existing CSS/token system, Node 22, Node test runner + `tsx`, Playwright 1.55 governed HVA, existing Product CI/CV2 gates.

**Spec:** `docs/superpowers/specs/2026-10-21-docente-os-visual-conformance-realignment-design.md`

## Global Constraints

- Frozen visual authority remains the canonical raster from `docs/superpowers/evidence/2026-10-18-docente-os-task-centric-p0-visual-review.md`, then Figma board `4:3`, then mobile board `10:2`.
- Preserve the graph `OGGI → PREPARA → MATERIALI → VISUALIZZA MATERIALE → CONDUCI → OSSERVA → REGISTRA → CONTINUA`; `CLASSE` remains voluntary; `ESPLORA` remains outside the primary flow.
- One dominant professional object and one primary CTA per focused state; at most two secondary actions at the same visual level.
- No technical identifiers at first visual level.
- Class, discipline, lesson title and professional phase remain visible throughout the lesson cycle.
- Material source remains provenance, not navigation.
- Broader product navigation remains available but perceptually subordinate in focused lesson work.
- Touch targets remain at least 44 px; 320 px must have no horizontal scrolling.
- Atlas appears only when a qualified Atlas suggestion already exists; no new Atlas or Studio Atlas runtime integration.
- Preparation approval/revalidation, TeachingSession receipt, idempotency, no-implicit-write and curricolo boundaries remain unchanged.
- No schema, migration, new store, new domain model, new authority, Production action or unrelated feature work.
- No merge without explicit human authorization. A later authorized merge into `develop` includes only the governed automatic Beta deploy, followed by mandatory runtime reconciliation.

## Review Focus

1. **Healthy approved PREPARA vs blocked/revalidation PREPARA:** healthy state must stay compact, but required curricolo/approval blockers must remain unmistakable and must never be hidden inside disclosure.
2. **Materiali with no qualified Atlas resource:** the surface must remain complete and truthful with Knowledge/other sources; no empty/synthetic Atlas affordance may appear.
3. **REGISTRA when required factual values cannot be derived:** fast path must not invent date/minutes or bypass validation; mandatory unresolved facts stay visible.
4. **Partial/remodelled/recovered lesson outcomes:** CONTINUA must not blindly advance the annual plan; the existing receipt semantics continue to decide the next block.
5. **Long Italian copy at 320 px:** phase identity, CTA hierarchy, focus ring and predictable exits must remain usable without overflow or truncating the professional decision.

---

## File Structure / Responsibility Map

- `product/e2e/experience/task-centric-teacher-flow.spec.mjs` — executable visual hierarchy contract and focused browser journey; extend rather than create a second fixture authority.
- `product/src/components/app-shell/app-shell.tsx` — existing global shell; add only presentation-only focused-mode behavior if necessary.
- `product/src/components/app-shell/navigation.ts` and `navigation.test.ts` — keep global IA intact; test only any frozen mobile hierarchy adjustment that is genuinely required.
- `product/src/app/globals.css` — shared shell/work-surface presentation rules.
- `product/src/app/planner/page.tsx`, `today-teaching-focus-card.tsx`, `today-home.css` — OGGI composition and secondary-work demotion.
- `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx` — pass presentation-only focus state to the existing AppShell; no loader/domain change.
- `lesson-shell.tsx`, `lesson-shell.module.css` — persistent class/lesson/phase identity.
- `lesson-prepare-client.tsx`, `lesson-materials.tsx`, `lesson-design-tools.css`, `lesson-workspace.css`, `lesson-live.module.css` — PREPARA/MATERIALI and focused lesson hierarchy.
- `product/src/app/knowledge/[assetId]/page.tsx`, `product/src/app/knowledge/knowledge.css`, `knowledge-context.css` — focused material viewer only; generic Knowledge mode stays unchanged.
- `lesson-live-client.tsx`, `lesson-observe-client.tsx` — CONDUCI/OSSERVA hierarchy only.
- `lesson-close-client.tsx`, `lesson-continue.tsx` — REGISTRA fast path and CONTINUA; reuse existing `recordLessonExecution` and current receipt.
- `product/src/app/classi/[sectionId]/page.tsx`, `product/src/app/classi/classi.css`, `class-workspace-operational.css` — CLASSE first-level longitudinal overview with advanced controls demoted.
- Existing source-contract tests such as `lesson-material-task-ux-contract.test.ts`, `lesson-close-*.test.ts`, `navigation.test.ts` — pin deterministic non-browser contracts where they add value.

---

### Task 1: Freeze visual conformance as an executable RED contract

**Files:**
- Modify: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`
- Modify only if needed for deterministic non-browser assertions: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts`
- Test: the same files

**Interfaces:**
- Consumes: existing authenticated AAL2 fixture, `data-lesson-shell`, current task-centric routes and tenant-local fixtures.
- Produces: one executable contract that later tasks must satisfy; no product behavior.

- [ ] **Step 1: Add RED assertions for first-level hierarchy**

Extend the existing journey so the rendered focused state asserts:
- exactly one first-level primary CTA for OGGI/PREPARA/VIEWER/CONDUCI/REGISTRA/CONTINUA;
- no first-level `CAN-PACK`, `CAN-PLAN`, UUID-like ids or `Bxx` technical ids;
- advanced controls are absent from the default first level when the spec says they must be disclosed;
- Lesson Shell identity persists from PREPARA through REGISTRA.

Use stable semantic locators/data attributes already present; add new test-only-friendly attributes only where the UI has no stable semantic boundary.

- [ ] **Step 2: Add RED assertions for the known divergences**

Pin these failures on the baseline:
- OGGI quick actions/timeline do not compete above the main teaching task;
- MATERIALI cards expose compact decision content rather than version/provenance-management detail;
- OSSERVA professional observation editor is not first-level in the healthy state;
- REGISTRA exposes `Esito effettivo`, factual note/what-done, `Prossima attività` and `Registra lezione` without requiring navigation through the three-step wizard;
- CLASSE first level shows continuity/next lesson/progress/recent work before advanced recorder/support/technical detail.

- [ ] **Step 3: Add responsive assertions**

For mobile project, explicitly set 390×844 and 320×800 after the canonical 412×915 run and call the existing no-horizontal-overflow/touch-target helpers for each focused state.

- [ ] **Step 4: Run the focused browser spec and record clean RED**

Run from `product/` with governed E2E env available:

```bash
npx playwright test e2e/experience/task-centric-teacher-flow.spec.mjs --config=playwright.experience.config.mjs --project=mobile-412x915
```

Expected: FAIL only on visual-conformance assertions representing the documented baseline gaps; authentication, fixture setup and existing task-continuity assertions must PASS.

Then run desktop:

```bash
npx playwright test e2e/experience/task-centric-teacher-flow.spec.mjs --config=playwright.experience.config.mjs --project=desktop-1440x1000
```

Expected: same semantic RED class, no unrelated fixture/runtime failure.

- [ ] **Step 5: Commit test-only RED**

```bash
git add product/e2e/experience/task-centric-teacher-flow.spec.mjs product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts
git commit -m "test(dos): pin frozen visual conformance contract"
```

Do not touch product implementation before the RED is classified cleanly.

---

### Task 2: Recompose OGGI and add presentation-only focused AppShell behavior

**Files:**
- Modify: `product/src/app/planner/page.tsx`
- Modify: `product/src/app/planner/today-teaching-focus-card.tsx`
- Modify: `product/src/app/planner/today-home.css`
- Modify: `product/src/components/app-shell/app-shell.tsx`
- Modify only if frozen mobile hierarchy requires it: `product/src/components/app-shell/navigation.ts`
- Test: `product/src/components/app-shell/navigation.test.ts`
- Test: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`

**Interfaces:**
- Consumes: existing `TodayTeachingFocus`, AppShell `active`, current mobile/desktop navigation.
- Produces: optional presentation-only `focusMode?: boolean` (if needed) and OGGI composition where the teaching task is visually dominant; no new route or navigation authority.

- [ ] **Step 1: Write/confirm failing navigation and OGGI hierarchy assertions**

If `focusMode` is needed, pin that focused mode keeps Oggi/broader-navigation escape reachable while removing global navigation from first visual competition. Outside focused mode, existing AppShell navigation must remain unchanged.

- [ ] **Step 2: Run scoped tests and confirm RED**

```bash
npm test -- --test-name-pattern="navigation"
```

If the repository script cannot forward the pattern reliably, run the exact file:

```bash
npx tsx --test src/components/app-shell/navigation.test.ts
```

Then run the mobile Playwright journey from Task 1.

- [ ] **Step 3: Implement the minimal AppShell presentation API**

If required, extend:

```ts
export type AppShellProps = {
  ...
  focusMode?: boolean
}
```

`focusMode` may add classes/aria-safe presentation changes only. It must not create a second navigation list, remove the command/secondary menu, or change href authority.

- [ ] **Step 4: Recompose OGGI**

Keep `TodayTeachingFocusCard` and continuity authoritative. Remove `TodayQuickActions` from first-level competition when a teaching focus exists; collapse timeline/planner statistics into compact secondary disclosure. Preserve truthful non-teaching fallback behavior.

- [ ] **Step 5: Run GREEN checks**

Run navigation test, typecheck, and focused Playwright mobile + desktop. Expected: OGGI/focused-shell assertions PASS; remaining later-state visual REDs may still fail and must be the only failures.

- [ ] **Step 6: Commit**

```bash
git add product/src/app/planner product/src/components/app-shell product/src/app/globals.css product/e2e/experience/task-centric-teacher-flow.spec.mjs
git commit -m "fix(dos): restore focused today hierarchy"
```

---

### Task 3: Recompose PREPARA and MATERIALI to the frozen hierarchy

**Files:**
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/page.tsx`
- Modify: `lesson-shell.tsx`
- Modify: `lesson-shell.module.css`
- Modify: `lesson-prepare-client.tsx`
- Modify: `lesson-materials.tsx`
- Modify: `lesson-design-tools.css`
- Modify: `lesson-live.module.css`
- Test: `lesson-material-task-ux-contract.test.ts`
- Test: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`

**Interfaces:**
- Consumes: existing preparation approval snapshot, `LessonKnowledgeSuggestion[]`, `LessonAtlasSuggestion[]`, `LessonDesignExtension[]`, `runLessonDesignWrite`.
- Produces: compact PREPARA first level and focused MATERIALI subtask; no new material writes/store.

- [ ] **Step 1: Add failing deterministic material-card tests**

Update the existing component/source contract to assert:
- `Riutilizza | Adatta | Crea nuovo` remains first level;
- reuse card has one preview/control action and one primary use action;
- version strings and long technical provenance are not first-level decision copy;
- no-Atlas state remains truthful and contains no synthetic Atlas placeholder;
- accepted-resource management remains available but subordinate.

- [ ] **Step 2: Run RED**

```bash
node --import tsx 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-material-task-ux-contract.test.ts'
```

Expected: FAIL specifically on compact hierarchy assertions.

- [ ] **Step 3: Recompose PREPARA**

Keep first level to Lesson Shell, objective, readiness summary, one Materiali entry, blocking approval state/CTA and `Vedi progettazione completa`. Move full checklist, broad `LessonDesignTools`, outcomes and non-blocking authority explanation inside existing progressive disclosure. Required stale/curricolo blockers remain visible outside disclosure when they block progression.

- [ ] **Step 4: Recompose MATERIALI**

Keep existing `LessonMaterials` and action wiring, but make it visually a focused subtask. Shorten first-level card content to title/type, concise relevance, provenance, preview and use. Put long reason/version/tip and accepted-resource management under disclosure or secondary styling.

- [ ] **Step 5: Tighten Lesson Shell without changing navigation semantics**

Preserve `← Oggi`, class, discipline, lesson title and phase rail. Reduce container weight so the current task, not shell chrome, remains dominant. Pass AppShell focused presentation from the existing lesson workspace page only.

- [ ] **Step 6: Run GREEN checks**

Run material contract test, `npm run typecheck`, then focused Playwright mobile and desktop. Expected: PREPARA/MATERIALI assertions PASS; later Viewer/Observe/Register/Class assertions may remain RED.

- [ ] **Step 7: Commit**

```bash
git add product/src/app/classi/[sectionId]/lezioni/[blockId] product/e2e/experience/task-centric-teacher-flow.spec.mjs
git commit -m "fix(dos): align prepare and materials with frozen mockup"
```

---

### Task 4: Make VISUALIZZA material content-first while preserving Knowledge continuity

**Files:**
- Modify: `product/src/app/knowledge/[assetId]/page.tsx`
- Modify: `product/src/app/knowledge/knowledge.css`
- Modify: `product/src/app/knowledge/knowledge-context.css`
- Test: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`
- Test existing task-continuity unit contract if required: `product/src/core/presentation/task-continuity.test.ts`

**Interfaces:**
- Consumes: existing `mode=prepare`, `section`, `block`, `returnTo`, `runLessonDesignWrite`, `LessonShell`.
- Produces: focused viewer with content/material canvas first, `Usa nella lezione` as sole primary CTA and predictable `Torna ai materiali`.

- [ ] **Step 1: Add/confirm RED viewer assertions**

Assert focused viewer has Lesson Shell + material identity + preview + one primary `Usa nella lezione`; processing/version management is absent from first level; `Approfondisci la risorsa` remains secondary; generic Knowledge detail mode remains unchanged when `mode=prepare` is absent.

- [ ] **Step 2: Run focused RED**

Run the `Oggi → Prepara → Materiali` browser journey and confirm only Viewer visual hierarchy remains failing in this slice.

- [ ] **Step 3: Recompose only the focused branch**

Keep current server-side attach action and redirects. Use a content-first preview container: existing readable text is styled as reading content, not monospace/system chrome; available original-source action remains secondary. Do not alter generic Knowledge page behavior.

- [ ] **Step 4: Run GREEN checks**

Run task-continuity unit test if touched, `npm run typecheck`, and focused Playwright mobile/desktop.

- [ ] **Step 5: Commit**

```bash
git add product/src/app/knowledge product/e2e/experience/task-centric-teacher-flow.spec.mjs
git commit -m "fix(dos): make lesson material preview content first"
```

---

### Task 5: Tighten CONDUCI and collapse OSSERVA advanced capture

**Files:**
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx`
- Modify: `lesson-observe-client.tsx`
- Modify: `lesson-live.module.css`
- Test: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`
- Test existing observation model: `product/src/app/classi/[sectionId]/lezioni/lesson-observation-model.test.ts`

**Interfaces:**
- Consumes: current lesson sequence/resources, `LessonShell`, existing sessionStorage observation draft.
- Produces: current-step runbook and quick observation surface; no observation persistence change.

- [ ] **Step 1: Add RED hierarchy assertions**

CONDUCI: current step/timing/instruction and relevant material dominate; sequence/attached catalogue/exit links are secondary. OSSERVA: expected evidence + checklist are first level; professional observation fields are inside one optional disclosure by default; primary move is toward REGISTRA and return to lesson remains predictable.

- [ ] **Step 2: Run RED**

```bash
npx tsx --test 'src/app/classi/[sectionId]/lezioni/lesson-observation-model.test.ts'
```

Then run the `Conduci → Osserva` Playwright journey. The unit model must remain PASS; browser hierarchy must be RED on the visual gap only.

- [ ] **Step 3: Implement minimal CONDUCI noise reduction**

Do not change sequence composition. Keep current step and footer controls; keep sequence and attached materials in disclosure; reduce first-level exit links to the spec’s secondary level.

- [ ] **Step 4: Move professional observation editor under optional disclosure**

Do not change state/storage functions. The disclosure contains dimension/state/note exactly as today; privacy language remains visible where required. Checklist remains first level.

- [ ] **Step 5: Run GREEN checks**

Observation model PASS, typecheck PASS, Playwright mobile 412/390/320 and desktop PASS for CONDUCI/OSSERVA slice.

- [ ] **Step 6: Commit**

```bash
git add product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live-client.tsx product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css product/e2e/experience/task-centric-teacher-flow.spec.mjs
git commit -m "fix(dos): tighten conduct and observe visual hierarchy"
```

---

### Task 6: Restore REGISTRA fast path and preserve CONTINUA receipt semantics

**Files:**
- Modify: `product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx`
- Modify: `lesson-continue.tsx`
- Modify: `lesson-live.module.css`
- Test: `lesson-close-feedback.test.ts`
- Test: `lesson-close-error-contract.test.ts`
- Test: `product/src/app/classi/[sectionId]/lezioni/lesson-registration-runtime-contract.test.ts`
- Test: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`

**Interfaces:**
- Consumes: existing `recordLessonExecution(formData)`, current observation draft transport, registration key, default local date, projection duration, outcome enum and TeachingSession receipt.
- Produces: one-screen default fast path plus optional advanced disclosure; current receipt remains the only write authority.

- [ ] **Step 1: Add RED fast-path browser assertions**

On the default REGISTRA state, assert the teacher can see and operate in one view:
- `Esito effettivo`;
- factual `Cosa abbiamo fatto` / evidence note;
- `Prossima attività`;
- one primary `Registra lezione` CTA.

Assert the teacher is not forced through `Dati essenziali → Riflessione → Conferma` to submit a healthy default record.

- [ ] **Step 2: Pin safety cases before implementation**

Existing unit/runtime contracts must still prove:
- registration failure preserves entered data/error semantics;
- current `registrationKey` idempotency path remains untouched;
- observation draft transport remains optional;
- no implicit annual-plan write is introduced.

Run:

```bash
npx tsx --test 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-feedback.test.ts' 'src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-error-contract.test.ts' 'src/app/classi/[sectionId]/lezioni/lesson-registration-runtime-contract.test.ts'
```

Expected: existing safety tests PASS while new browser fast-path assertion is RED.

- [ ] **Step 3: Replace wizard navigation with one default form surface**

Keep the same state variables and `submitLesson`. Remove `CloseStep` as a mandatory navigation model. First level renders outcome, factual note, next activity and submit. Date/minutes remain visible on first level only when the current values cannot be safely accepted; otherwise place them in `Dettagli della registrazione` disclosure without changing submitted fields.

- [ ] **Step 4: Move richer capability under disclosure**

Place optional professional observation review, reflection note helpers, Copilot organization, voice capture and UDA change proposal under explicit optional disclosure(s). They continue writing into the same form/state and must not create a second submit authority.

- [ ] **Step 5: Preserve CONTINUA**

Keep `LessonContinue` derived only from the returned receipt. Ensure non-`SVOLTO` outcomes continue preparing the same block rather than advancing. Only visual noise may be reduced.

- [ ] **Step 6: Run GREEN checks**

Run safety tests, typecheck, and REGISTRA→CONTINUA browser journey mobile/desktop. Verify all four outcomes remain selectable and the primary submit reaches the same receipt behavior.

- [ ] **Step 7: Commit**

```bash
git add product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-continue.tsx product/src/app/classi/[sectionId]/lezioni/[blockId]/lesson-live.module.css product/e2e/experience/task-centric-teacher-flow.spec.mjs
git commit -m "fix(dos): restore register fast path"
```

---

### Task 7: Recompose CLASSE as the voluntary longitudinal overview

**Files:**
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify: `product/src/app/classi/classi.css`
- Modify: `product/src/app/classi/class-workspace-operational.css`
- Test existing model: `product/src/app/classi/class-workspace-model.test.ts`
- Test: `product/e2e/experience/classroom-cockpit.spec.mjs`
- Test: `product/e2e/experience/task-centric-teacher-flow.spec.mjs` if class continuity is asserted there

**Interfaces:**
- Consumes: existing `buildClassWorkspaceSummary`, `buildClassWorkspaceLearningFocus`, TeachingSession-derived `lastActualWork`, `nextActivity`, `recentContext`, current task decision.
- Produces: compact first-level next lesson/action + progress + recent history/continuity; all advanced controls still available under disclosure.

- [ ] **Step 1: Add RED first-level class assertions**

Pin the canonical board hierarchy: next lesson/action first, progress, recent lessons/last work and next activity visible before advanced recording, supports, alternate product paths and technical details.

- [ ] **Step 2: Run model + browser RED**

```bash
npx tsx --test src/app/classi/class-workspace-model.test.ts
npx playwright test e2e/experience/classroom-cockpit.spec.mjs --config=playwright.experience.config.mjs --project=mobile-412x915
```

Model must PASS; visual hierarchy assertion must be the RED.

- [ ] **Step 3: Reorder existing markup without changing calculations**

Use current computed `taskPresentation`, `lastActualWork`, `nextActivity`, `learningFocus.completedBlocks` and recent session data. Keep advanced recorder/completion/support/alternate paths/technical details under existing `<details>` blocks after the compact overview.

- [ ] **Step 4: Match responsive compactness**

At 412/390/320 px, first-level cards must remain single-column, readable and touch-safe. Desktop may use compact grid but must preserve the same priority order.

- [ ] **Step 5: Run GREEN checks**

Class model PASS, classroom cockpit mobile + desktop PASS, no horizontal overflow at 320.

- [ ] **Step 6: Commit**

```bash
git add product/src/app/classi/[sectionId]/page.tsx product/src/app/classi/classi.css product/src/app/classi/class-workspace-operational.css product/e2e/experience
git commit -m "fix(dos): align class continuity overview"
```

---

### Task 8: Generate canonical visual evidence and close implementation-level deltas

**Files:**
- Modify: `product/e2e/experience/task-centric-teacher-flow.spec.mjs`
- Create: `docs/superpowers/evidence/2026-10-21-docente-os-visual-conformance-candidate.md`
- No product changes unless a screenshot demonstrates a direct spec violation.

**Interfaces:**
- Consumes: all previous GREEN slices and canonical Figma/raster authority.
- Produces: exact-head candidate evidence with nine-state classification.

- [ ] **Step 1: Capture fresh screenshots for all canonical states**

Use Playwright `page.screenshot` or existing screenshot helper with stable names for OGGI, PREPARA, MATERIALI, VIEWER, CONDUCI, OSSERVA, REGISTRA, CONTINUA and CLASSE on `mobile-412x915` and desktop. For responsive assurance, also capture 390×844 and 320×800 for the focused journey where practical.

- [ ] **Step 2: Run the full HVA suite locally/through the governed workflow**

Canonical command:

```bash
npx playwright test --config=playwright.experience.config.mjs
```

Expected: 0 failed tests; general HVA excludes WCAG’s duplicate Axe pass by configuration.

- [ ] **Step 3: Compare against the frozen board**

For each of the nine states record one verdict in the evidence file:
- `CONFORMANT`;
- `ACCEPTABLE_IMPLEMENTATION_DELTA` with concrete accessibility/responsive/runtime reason;
- `REWORK` with one demonstrated blocker.

No pixel-diff threshold may convert a human/product divergence into PASS.

- [ ] **Step 4: Stop on any REWORK**

If any state is `REWORK`, return only to the task owning that state, add a new specific RED assertion, apply the minimal correction and repeat its GREEN/evidence. Do not open unrelated cleanup.

- [ ] **Step 5: Commit evidence when all states are conformant/acceptable**

```bash
git add product/e2e/experience/task-centric-teacher-flow.spec.mjs docs/superpowers/evidence/2026-10-21-docente-os-visual-conformance-candidate.md
git commit -m "test(dos): record visual conformance candidate evidence"
```

---

### Task 9: Exact-head qualification and handoff to merge decision

**Files:**
- No implementation file changes expected.
- Update only the candidate evidence document if qualification receipts need exact run ids/SHAs.

**Interfaces:**
- Consumes: candidate exact head from Task 8.
- Produces: engineering-qualified candidate; no merge/deploy authorization.

- [ ] **Step 1: Run full Product CI on the exact head**

Require typecheck, product tests, lint, build and applicable runtime/replay contracts to PASS. A selective skip is acceptable only when the repository’s impact classifier declares it not applicable.

- [ ] **Step 2: Run CV2 Candidate Qualification on the same exact head**

Require all selected applicable gates to PASS, including HVA, WCAG 2.2 AA, P6 and X3/X4/X5 as selected by current governance. Do not substitute a previous SHA’s result.

- [ ] **Step 3: Verify branch diff scope**

Compare implementation branch against the approved baseline lineage and confirm no schema/migration/domain/authority file entered the diff accidentally. Any such file is a stop condition requiring explicit review.

- [ ] **Step 4: Update evidence with exact qualification receipts**

Record exact head, Product CI run, CV2 run, visual evidence classification and `mergeAuthorized=false`.

- [ ] **Step 5: Present the human merge decision**

State only:
- exact qualified SHA;
- visual conformance verdict for all nine states;
- applicable gate results;
- remaining known limitations, if any;
- explicit note that Production is untouched.

Do not merge until the human explicitly authorizes it.

---

## Post-merge sequence (only after separate explicit authorization)

This section is operational handoff, not pre-authorization.

1. Merge the qualified exact branch into governed `develop` only after explicit human authorization.
2. Allow the existing automatic Beta deployment to occur; do not manually trigger a duplicate deploy unless a separately diagnosed governance exception is authorized.
3. Reconcile the served Beta commit with the merge SHA.
4. Require runtime schema contract/lineage/containment/provenance and all governed runtime statuses to PASS on the served SHA.
5. Perform the real Beta Human Product Review against canonical raster/Figma for the nine states.
6. `PASS` → freeze Docente OS visual conformance; `REWORK` → only demonstrated blockers may reopen the owning slice; `REJECT` → reopen the visual contract explicitly.
7. Production remains a separate exact-SHA human decision and is out of scope for this plan.
