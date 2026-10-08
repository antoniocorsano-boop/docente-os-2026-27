# IUI-02/03 — Deterministic Intelligent UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the deterministic intelligent-composition core and qualify the first teacher journey, Home → Classe → prossima lezione, without introducing a runtime model dependency or changing domain authority.

**Architecture:** Reuse the canonical Human Task Model as the only intent/mode taxonomy. Add a small presentation-layer contract, a closed semantic block/action registry and a fail-closed policy validator. Home and Classe remain domain-aware adapters: they translate already-authoritative state into a validated `SurfaceComposition`; they do not infer new didactic state. Rendering stays application-owned and reuses the existing `humanTaskFocus` / `classLessonFocus` layouts. No generic page DSL, no arbitrary JSX/HTML/CSS, no new write path.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript 5.9.2, Node 22, existing `node:test`/`tsx` test stack, existing Product CI, Browser Certification, Human Interaction Model, Design Policy, no-implicit-write and HVA gates.

**Spec:** `docs/superpowers/specs/2026-10-08-intelligent-ui-composition-design.md`

## Global Constraints

- Execution starts from the approved specification/plan head on an isolated implementation branch, proposed name `feat/iui-02-03-deterministic-composition`; do not modify `main` directly.
- Rebase/refresh against the then-current `develop` before implementation if `develop` has moved; record the exact implementation baseline in the PR.
- Scope is **only IUI-02 + IUI-03**. Do not implement IUI-04+, Studio Atlas changes, Documentazione changes, or any model/provider adapter.
- `HumanIntent`, `ContextSpecificity`, `ExperienceMode`, `resolveExperienceMode()` and `interactionBudget()` remain canonical; do not introduce parallel taxonomies.
- `resolveHomeDailyContext()` remains authoritative for temporal Home context; `resolveClassTaskDecision()` remains authoritative for Class task state.
- Preserve existing direct Home → modeled Lesson Workspace navigation when it is already the shortest valid path. Do **not** insert Classe as an artificial intermediate screen merely to demonstrate this feature.
- No implicit writes: composing, validating or rendering a surface cannot mutate data, create sessions, advance the annual plan or mark preparation/completion.
- No new persistence, migration, database table, API key, provider call, telemetry or student-personal-data flow.
- Stable navigation, Settings, authentication/security and current Arena/Atlas/Studio Atlas/Docente OS authority boundaries remain unchanged.
- Deterministic output must be stable for equivalent input; unknown components/actions and incoherent task continuity fail closed.
- No automatic merge. Final integration requires exact-head certification and Human Review.

## Review Focus

- The new layer must reduce duplication of presentation decisions without becoming a second domain model.
- Incoming task parameters are advisory continuity context only; current authoritative application state always wins.
- FOCUSED mode exposes exactly one primary action and at most two peer support actions; broader access stays secondary.
- Full-view access remains understandable but does not compete visually with the primary action.
- Existing Class recording/completion boundaries remain explicit and server-revalidated.
- New tests must be added to the repository's explicit `product/package.json` test list so Product CI actually executes them.

---

### Task 1: IUI-02A — Canonical composition contracts

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-contract.ts`
- Create: `product/src/core/presentation/intelligent-ui-contract.test.ts`
- Read/reuse without semantic change: `product/src/core/presentation/human-task-model.ts`

**Interfaces:**

`intelligent-ui-contract.ts` defines only the transport/presentation contract:

```ts
export const INTELLIGENT_UI_VERSION = 'iui.v1' as const
export type IntelligentSurface = 'HOME' | 'CLASS'
export type SemanticBlockId = 'TASK_FOCUS' | 'LESSON_FOCUS'

export type UIContext = {
  surface: IntelligentSurface
  task: HumanTaskContext
  mode: ExperienceMode
  contextSummary: string
  reason: string
  sectionId?: string | null
  blockId?: string | null
}

export type CompositionBlock = {
  id: SemanticBlockId
  eyebrow: string
  title: string
  description: string
  secondaryDescription?: string | null
  meta: readonly string[]
}

export type CompositionAction = {
  id: RegisteredActionId
  label: string
  href: string
}

export type SurfaceComposition = {
  version: typeof INTELLIGENT_UI_VERSION
  surface: IntelligentSurface
  intent: HumanIntent
  mode: ExperienceMode
  contextSummary: string
  reason: string
  primaryBlock: CompositionBlock
  supportBlocks: readonly CompositionBlock[]
  primaryAction: CompositionAction | null
  supportActions: readonly CompositionAction[]
  fullViewAction: CompositionAction
  source: 'DETERMINISTIC'
  fallbackReason?: string | null
}
```

`HumanTaskContext`, `HumanIntent` and `ExperienceMode` are imported from the existing canonical module, never redeclared.

- [ ] Write RED tests proving that the new contract reuses canonical Human Task types and that `UIContext.mode` must correspond to the existing `resolveExperienceMode(task)` policy through the later validator contract.
- [ ] Add compile/runtime fixture tests for HOME/CLASS contexts and serializable `SurfaceComposition` data; explicitly prove there is no field capable of carrying JSX, HTML, CSS or executable code.
- [ ] Run `cd product && npx tsx --test src/core/presentation/intelligent-ui-contract.test.ts` and record the expected RED because the contract does not exist yet.
- [ ] Implement the minimal types/constants only; no route builders, repository imports or product behavior.
- [ ] Run the focused test to GREEN and `npm run typecheck`.
- [ ] Commit the contract slice independently.

### Task 2: IUI-02B — Closed block/action registry and policy validator

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-registry.ts`
- Create: `product/src/core/presentation/intelligent-ui-registry.test.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.test.ts`
- Reuse: `product/src/core/presentation/human-task-model.ts`
- Reuse: `product/src/core/presentation/human-task-content.ts` / exported `buildLessonWorkspaceHref`
- Reuse: `product/src/core/presentation/task-continuity.ts`

**Interfaces:**

The first catalogue is intentionally small: only `TASK_FOCUS` on HOME and `LESSON_FOCUS` on CLASS. Do not pre-create future Materiali/Conoscenza/Documentazione blocks.

Define `RegisteredActionId` only for actions needed by this tranche:

- `HOME_OPEN_PLANNER`
- `HOME_OPEN_TIMETABLE`
- `HOME_OPEN_CLASS`
- `HOME_OPEN_LESSON`
- `HOME_SHOW_ALL`
- `CLASS_OPEN_MODELED_LESSON`
- `CLASS_OPEN_INLINE_RECORDER`
- `CLASS_OPEN_COMPLETION`
- `CLASS_OPEN_PLANNING`
- `CLASS_SHOW_ALL`

Use typed action descriptors rather than accepting arbitrary `href` input. A factory such as `resolveRegisteredAction(descriptor)` owns route creation and returns `CompositionAction`; descriptors carry only known parameters (`sectionId`, `blockId`, allowed lesson/class mode, label). Static actions own their canonical hrefs. The registry must never accept an external URL.

`validateUIContext(context)` and `validateSurfaceComposition(composition)` return an inspectable result (`ok`, errors) rather than silently normalizing invalid data.

Validator requirements:

- `mode === resolveExperienceMode(task)`;
- block exists and is allowed on the requested surface/mode;
- every action ID is registered and its resolved href matches registry policy;
- FOCUSED: one non-null primary action, ≤2 peer support actions;
- automatic narrowing requires non-empty `reason`, `contextSummary` and full-view action;
- `fullViewAction` belongs to the same surface and never mutates;
- unknown block/action fails closed;
- no action registry entry maps to a mutation endpoint, external URL, server action or database operation.

- [ ] Write RED registry tests for exact membership, valid internal routes, encoded section/block IDs, rejection of external/arbitrary targets and absence of mutation-capable actions.
- [ ] Write RED policy tests for FOCUSED budgets, missing reason/context/full-view path, wrong mode, unknown block/action and deterministic valid fixtures.
- [ ] Run both focused test files and record RED.
- [ ] Implement the smallest closed registry and pure validator; do not import infrastructure/repositories.
- [ ] Run focused tests to GREEN plus `npm run typecheck` and `npm run lint`.
- [ ] Commit the registry/policy slice.

### Task 3: IUI-02C — Deterministic composition boundary and fallback

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-composer.ts`
- Create: `product/src/core/presentation/intelligent-ui-composer.test.ts`
- Reuse: Task 1/2 contract, registry and validator.

**Interfaces:**

Expose a pure entry point similar to:

```ts
composeDeterministicSurface(input: {
  context: UIContext
  primaryBlock: CompositionBlock
  supportBlocks?: readonly CompositionBlock[]
  primaryAction: RegisteredActionDescriptor | null
  supportActions?: readonly RegisteredActionDescriptor[]
  fullViewAction: RegisteredActionDescriptor
}): SurfaceComposition
```

The function resolves registered actions, constructs `SurfaceComposition`, validates it and either returns it or invokes an explicit deterministic safe fallback supplied by the surface adapter. It never guesses missing domain state.

Fallback semantics:

- invalid SPECIFIC input does not produce a partially rendered focused composition;
- fallback records a machine-readable diagnostic reason such as `INVALID_CONTEXT`, `UNKNOWN_ACTION`, `STALE_CONTINUITY` without exposing technical noise to the teacher;
- fallback remains on the same surface and uses only registered read/navigation actions.

- [ ] Write table-driven RED tests for equivalent-input stability, action ordering, fail-closed unknown action, invalid FOCUSED budgets and explicit fallback reason.
- [ ] Add a source-boundary test proving this core module does not import `core/infrastructure`, Supabase repositories, app server actions or provider clients.
- [ ] Run the focused test and record RED.
- [ ] Implement the pure composer and safe fallback hook with no side effects.
- [ ] Run focused tests to GREEN, then Tasks 1–3 tests together and `npm run typecheck`.
- [ ] Commit IUI-02 core complete.

### Task 4: IUI-03A — Safe task continuity from Home to Classe

**Files:**
- Modify: `product/src/core/presentation/task-continuity.ts`
- Modify: `product/src/core/presentation/task-continuity.test.ts`

**Interfaces:**

Extend the existing continuity module, do not create a parallel URL utility:

```ts
export type ClassTaskEntryMode = 'prepare' | 'teach' | 'record'

export function buildTaskAwareClassHref(
  sectionId: string,
  input: { mode: ClassTaskEntryMode; blockId?: string | null; returnTo: string },
): string

export function parseClassTaskEntry(
  input: { mode?: string | null; block?: string | null; returnTo?: string | null },
  fallbackReturnTo: string,
): { mode: ClassTaskEntryMode | null; blockId: string | null; returnTo: string }
```

Requirements:

- encode `sectionId` and `block` safely;
- accept only canonical class modes;
- accept only canonical block syntax used by the current plan (`B01`…`B33`); malformed blocks become `null`;
- reuse `sanitizeInternalReturnTo()`; external or protocol-relative return targets fail to the supplied internal fallback;
- these parameters are continuity hints, not authorization or state.

- [ ] Add RED tests for valid prepare/teach/record links, encoding, malformed mode/block, external `returnTo`, and deterministic parse/build round-trip.
- [ ] Run `npx tsx --test src/core/presentation/task-continuity.test.ts` and record RED.
- [ ] Implement only the continuity helpers above; preserve existing Knowledge continuity behavior.
- [ ] Run the focused test to GREEN plus existing Human Task tests.
- [ ] Commit the continuity slice.

### Task 5: IUI-03B — Home composition adapter

**Files:**
- Create: `product/src/app/home-intelligent-ui.ts`
- Create: `product/src/app/home-intelligent-ui.test.ts`
- Modify: `product/src/app/page.tsx`
- Modify only if required for an anchor/id, not for redesign: existing Home styles in `product/src/app/globals.css` or owning stylesheet.

**Interfaces and boundaries:**

Create a pure Home adapter that receives the already-resolved Home primary view model and returns a validated `SurfaceComposition`. Keep temporal authority in `resolveHomeDailyContext()` and keep current priority ordering unless a focused test proves an inconsistency.

Map lesson state to canonical Human Task intent:

- current lesson → `TEACH`;
- pending registration → `RECORD`;
- upcoming/next lesson → `PREPARE`;
- urgent planner task → `ACT_NOW`;
- ambiguous timetable context → safe `REVIEW`/GUIDED route to Orario;
- no operational task → `EXPLORE` or contextual `REVIEW`, never invented urgency.

Home action rules:

- preserve existing direct modeled Lesson Workspace href for current/upcoming lessons when already available;
- enrich only legitimate Home → Classe routes with `buildTaskAwareClassHref()` so Classe can understand why it was opened;
- never force a modeled direct lesson through Classe;
- full view maps to the existing `Esplora tutto lo spazio docente` details element, given a stable `id="home-full-view"` if needed;
- the existing secondary Planner/Orario link remains at most one peer support action.

Rendering remains application-owned: `page.tsx` consumes only a **validated** composition and renders the existing `humanTaskFocus` markup; do not add a general-purpose renderer or second design system in this slice.

- [ ] Write RED pure-adapter tests for CURRENT/UPCOMING/PENDING/AMBIGUOUS/PLANNER/FALLBACK cases, exact intent/mode, one primary action, support-action budget, reason, full-view path and direct-lesson preservation.
- [ ] Add a RED source contract proving Home cannot render a composition that failed policy validation and that no composition helper imports repositories or performs writes.
- [ ] Run focused Home test and record RED.
- [ ] Implement the adapter; minimally refactor the current inline Home primary shape only as needed to feed it.
- [ ] Replace direct rendering fields with the validated composition while preserving current visual hierarchy and labels unless the adapter contract requires a clearer human reason.
- [ ] Add/retain `id="home-full-view"` on the existing secondary details surface and ensure the full-view route remains visible but subordinate.
- [ ] Run focused tests to GREEN, then Home/Human Task tests, typecheck and lint.
- [ ] Commit the Home pilot slice.

### Task 6: IUI-03C — Classe composition adapter, authoritative-state reconciliation

**Files:**
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.ts`
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.test.ts`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify: `product/src/app/classi/[sectionId]/class-task-state.test.ts` only for new integration/source assertions; do not rewrite its state machine.

**Interfaces and boundaries:**

The Class adapter receives:

- current `ClassTaskDecision` from `resolveClassTaskDecision()`;
- current presentation from `presentClassTaskState()`;
- section human label;
- current/next canonical block and title/context when present;
- current task hrefs already derived from authoritative state;
- optional parsed Home entry continuity.

Canonical intent mapping:

- `PREPARE` → `PREPARE`;
- `TEACH` → `TEACH`;
- `RECORD` / `CATCH_UP` → `RECORD`;
- `AFTER_RECORD` with completion decision → `REVIEW`;
- `AFTER_RECORD` preparing next meeting → `PREPARE`;
- `COMPLETE` → `REVIEW` with no fabricated operational task.

Continuity reconciliation:

- extend page `searchParams` with `mode`, `block`, `returnTo`;
- parse/sanitize through Task 4 helpers;
- if the requested block/mode is coherent with current Class state, record it as the reason/continuity context;
- if it is stale or incoherent, ignore it and compose from current authoritative Class state, recording `STALE_CONTINUITY` diagnostically;
- incoming continuity must never change `taskDecision`, occurrence selection, completion proposal, TeachingSession recording, or annual-plan state.

Rendering remains in the existing `classLessonFocus` structure. The page maps only validated `LESSON_FOCUS` data/actions to the current application-owned markup. Preserve `Prima della lezione` only when it is valid and keep total peer support actions within the Human Task budget. Give the existing `Contesto della classe e altri percorsi` secondary details element a stable `id="class-full-view"` and use that as the full-view path.

- [ ] Write RED adapter tests covering every `ClassTaskState`, intent mapping, SPECIFIC/FOCUSED composition, COMPLETE behavior, support-action budget and current-state precedence over stale query context.
- [ ] Write RED tests proving a mismatched block or mode cannot redirect the task to another lesson and an external `returnTo` is discarded.
- [ ] Extend `class-task-state.test.ts` with source/boundary assertions that the new adapter does not replace `resolveClassTaskDecision()` and that render/composition still has no write path.
- [ ] Run focused tests and record RED.
- [ ] Implement the pure adapter and page integration without changing the existing class state machine or server actions.
- [ ] Render the validated composition through existing `classLessonFocus` markup; add `id="class-full-view"` to the existing secondary full-context details element.
- [ ] Run Class adapter/state/continuity tests to GREEN, then typecheck/lint.
- [ ] Commit the Class pilot slice.

### Task 7: IUI-03D — Product CI inclusion, regression and exact-head certification

**Files:**
- Modify: `product/package.json` — append all new tests to the existing explicit `test` script; do not remove existing entries.
- Create: `docs/superpowers/evidence/2026-10-08-iui-02-03-closeout.md`
- Modify existing browser/certification test files only if a missing Home/Class assertion is required; do not create a parallel certification framework.

**Required automated verification:**

- new contract/registry/policy/composer tests;
- task continuity tests;
- Home adapter tests;
- Class adapter + existing Class state tests;
- complete `npm test`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`;
- existing Human Interaction Model gate;
- Design Policy gate;
- Browser Certification on changed Home/Class routes;
- WCAG 2.2 AA coverage for changed surfaces;
- no-implicit-write/X3-equivalent gate;
- Human Visual Acceptance on smartphone and desktop.

**Browser/Human Review scenarios:**

1. Home with current modeled lesson: direct lesson path remains direct and focused.
2. Home with pending registration: opens Classe with safe continuity; Classe shows RECORD/CATCH_UP from authoritative state.
3. Home with upcoming modeled lesson: preparation path remains minimal; no artificial detour.
4. Ambiguous/incomplete context: no class or lesson is guessed.
5. Stale Home continuity arriving at Classe: current Class state wins, no stale task is executed.
6. Classe PREPARE / TEACH / RECORD / AFTER_RECORD / COMPLETE: location, task, state, next action, reason and broader-view path remain understandable.
7. Rendering/composition alone produces no database mutation or annual-plan advancement.

- [ ] Add each new `.test.ts` file to `product/package.json` and run `npm test`; expected first RED if any file was omitted from the script, then correct the list only.
- [ ] Run the focused tranche tests, then full Product CI commands locally/connected environment as available.
- [ ] Push exact implementation head and run repository CI/certification on that exact SHA; do not inherit PASS from earlier heads.
- [ ] Capture smartphone + desktop evidence for Home and Classe in the existing HVA path, including full-view escape and focus/keyboard behavior.
- [ ] Record in the closeout evidence: baseline SHA, exact head SHA, test/run identifiers, PASS/FAIL per gate, and explicit statements `MODEL_RUNTIME=DISABLED`, `IMPLICIT_WRITE=NONE`, `DOS-A1=RUNTIME_DEFERRED`.
- [ ] If any product defect is found, return to the owning RED/GREEN task and recertify the new exact head. Distinguish CI/infrastructure failure from product failure.
- [ ] Keep implementation PR Draft until exact-head automated gates and Human Review pass. No automatic merge.

## Definition of done for IUI-02/03

IUI-02/03 is complete only when:

- the closed deterministic composition contract/registry/policy exists and is independently tested;
- Home and Classe consume validated `SurfaceComposition` without duplicating domain authority;
- direct modeled Home → lesson journeys are not lengthened;
- legitimate Home → Classe transitions preserve sanitized task context;
- stale/incoherent continuity cannot override current Class state;
- FOCUSED action budgets and full-view escape paths are enforced;
- composition/rendering performs no writes;
- no runtime GPT/model/provider dependency exists;
- all new tests are part of the canonical `npm test` command;
- Product CI, typecheck, lint, build, Human Interaction, Design Policy, Browser/WCAG/no-implicit-write and HVA pass on the exact implementation head;
- Human Review judges the journey simpler and predictable;
- no automatic merge has occurred.

## Explicitly deferred after this plan

Do **not** begin these in the same implementation PR:

- IUI-04 Classe / Progetta / Conoscenza continuity expansion;
- IUI-05 Piano annuale / Materiali / Documentazione composition;
- IUI-06 any GPT/model runtime adapter, structured-output provider integration, quota/fallback provider orchestration or API cost work;
- IUI-07 broader adaptive-surface rollout.

Each later tranche starts only from evidence produced by this deterministic pilot and receives its own scoped design/plan when it changes interfaces or authority boundaries.
