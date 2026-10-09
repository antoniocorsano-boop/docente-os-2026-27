# IUI-02/03 — Deterministic Intelligent UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the deterministic intelligent-composition core and qualify the first teacher journey, Home → Classe → prossima lezione, without introducing a runtime model dependency or changing domain authority.

**Architecture:** Reuse the canonical Human Task Model as the only intent/mode taxonomy. Add a small presentation-layer contract, safe task-continuity helpers, a closed semantic block/action registry, a fail-closed policy validator and a pure deterministic composer. Home and Classe remain domain-aware adapters: they translate already-authoritative state into a validated `SurfaceComposition`; they do not infer new didactic state. Rendering stays application-owned and reuses the existing `humanTaskFocus` / `classLessonFocus` layouts. No generic page DSL, no arbitrary JSX/HTML/CSS, no new write path.

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
- A full-view action must reveal the broader content, not merely scroll to a closed disclosure.
- A sanitized valid `returnTo` must remain available as an explicit secondary return path when Classe was entered from another surface; it never changes authoritative Class state.
- No automatic merge. Final integration requires exact-head certification and Human Review.

## Review Focus

- The new layer must reduce duplication of presentation decisions without becoming a second domain model.
- Incoming task parameters are advisory continuity context only; current authoritative application state always wins.
- FOCUSED mode exposes exactly one primary action and at most two peer support actions; broader access stays secondary.
- A completed Class path may use a non-FOCUSED REVIEW composition with no fabricated operational action.
- Full-view access remains understandable, actually reveals the broader content, and does not compete visually with the primary action.
- A valid sanitized origin remains explicitly reachable from Classe without becoming state authority.
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

`HumanTaskContext`, `HumanIntent` and `ExperienceMode` are imported from the existing canonical module, never redeclared. `RegisteredActionId` is imported from the registry once Task 3 is implemented; until then the RED fixture may use a temporary type-only stub inside the test, not product code.

- [ ] Write RED tests proving the new contract reuses canonical Human Task types and produces serializable HOME/CLASS fixtures without any field capable of carrying JSX, HTML, CSS or executable code.
- [ ] Run `cd product && npx tsx --test src/core/presentation/intelligent-ui-contract.test.ts` and record the expected RED because the contract does not exist yet.
- [ ] Implement only the types/constants above; no route builders, repositories or product behavior.
- [ ] Run the focused test to GREEN and `npm run typecheck`.
- [ ] Commit the contract slice independently.

### Task 2: IUI-03A — Safe task continuity from Home to Classe

**Files:**
- Modify: `product/src/core/presentation/task-continuity.ts`
- Modify: `product/src/core/presentation/task-continuity.test.ts`

**Interfaces:**

Extend the existing continuity module; do not create a parallel URL utility:

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
- accept only `prepare | teach | record`;
- accept only canonical current-plan block syntax `B01`…`B33`; malformed/out-of-range blocks become `null`;
- reuse `sanitizeInternalReturnTo()`; external, protocol-relative or malformed return targets fail to the supplied internal fallback;
- return the sanitized `returnTo` so downstream Classe composition can expose it as an explicit secondary return action;
- parameters are continuity hints only, never authorization or domain state.

- [ ] Add RED tests for prepare/teach/record links, encoding, invalid/out-of-range block, external `returnTo`, preserved internal `returnTo`, and deterministic parse/build round-trip.
- [ ] Run `npx tsx --test src/core/presentation/task-continuity.test.ts` and record RED.
- [ ] Implement only the continuity helpers above; preserve existing Knowledge continuity behavior.
- [ ] Run the focused test to GREEN plus existing Human Task tests.
- [ ] Commit the continuity slice.

### Task 3: IUI-02B — Closed block/action registry and policy validator

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-registry.ts`
- Create: `product/src/core/presentation/intelligent-ui-registry.test.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.test.ts`
- Reuse: `product/src/core/presentation/human-task-model.ts`
- Reuse: exported `buildLessonWorkspaceHref` from Human Task runtime/content
- Reuse: Task 2 `buildTaskAwareClassHref()` and `sanitizeInternalReturnTo()`

**Interfaces:**

The first block catalogue is intentionally small: only `TASK_FOCUS` on HOME and `LESSON_FOCUS` on CLASS. Do not pre-create future Materiali/Conoscenza/Documentazione blocks.

Define only these action IDs:

- `HOME_OPEN_PLANNER`
- `HOME_OPEN_TIMETABLE`
- `HOME_OPEN_CLASS`
- `HOME_OPEN_LESSON`
- `HOME_SHOW_ALL`
- `CLASS_OPEN_MODELED_LESSON`
- `CLASS_OPEN_INLINE_RECORDER`
- `CLASS_OPEN_COMPLETION`
- `CLASS_OPEN_PLANNING`
- `CLASS_RETURN_TO_ORIGIN`
- `CLASS_SHOW_ALL`

Use a discriminated `RegisteredActionDescriptor` union rather than arbitrary href input. The union must be equivalent to:

```ts
type RegisteredActionDescriptor =
  | { id: 'HOME_OPEN_PLANNER'; label: string }
  | { id: 'HOME_OPEN_TIMETABLE'; label: string }
  | { id: 'HOME_OPEN_CLASS'; label: string; sectionId: string; mode: ClassTaskEntryMode; blockId?: string | null; returnTo: string }
  | { id: 'HOME_OPEN_LESSON'; label: string; sectionId: string; blockId: string; mode: 'prepare' | 'teach' | 'observe' | 'record' }
  | { id: 'HOME_SHOW_ALL'; label: string }
  | { id: 'CLASS_OPEN_MODELED_LESSON'; label: string; sectionId: string; blockId: string; mode: 'prepare' | 'teach' | 'record' }
  | { id: 'CLASS_OPEN_INLINE_RECORDER'; label: string }
  | { id: 'CLASS_OPEN_COMPLETION'; label: string }
  | { id: 'CLASS_OPEN_PLANNING'; label: string; gradeQuery: 'prima' | 'seconda' | 'terza'; sectionId: string; blockId?: string | null; uda?: string | null; pack?: string | null }
  | { id: 'CLASS_RETURN_TO_ORIGIN'; label: string; sectionId: string; returnTo: string }
  | { id: 'CLASS_SHOW_ALL'; label: string; sectionId: string }
```

`resolveRegisteredAction(descriptor)` owns all href generation. Static actions own exact internal paths/anchors. Class and lesson routes use the existing builders. `CLASS_OPEN_PLANNING` constructs only the existing `/progetta` route from canonical grade/section/block/UDA/pack inputs. `CLASS_RETURN_TO_ORIGIN` re-sanitizes `returnTo` with the current class route as fallback before emitting the href; it never treats the incoming value as authority. `HOME_SHOW_ALL` resolves to `/?view=all#home-full-view`; `CLASS_SHOW_ALL` resolves to `/classi/<section>?view=all#class-full-view`, so the destination can render the disclosure open. The registry never passes through an unsanitized arbitrary href and never emits an external URL.

`validateUIContext(context)` and `validateSurfaceComposition(composition)` return inspectable validation results rather than silently normalizing invalid data.

Validator requirements:

- `context.mode === resolveExperienceMode(context.task)`;
- block exists and is allowed on the requested surface/mode;
- every action is a resolved registered action;
- FOCUSED: one non-null primary action and ≤2 peer support actions;
- automatic narrowing requires non-empty `reason`, `contextSummary` and full-view action;
- `fullViewAction` belongs to the same surface and is non-mutating;
- unknown block/action fails closed;
- no registry entry maps to a mutation endpoint, external URL, server action or database operation.

- [ ] Write RED registry tests for exact membership, route generation/encoding, Home → Classe reuse of Task 2, Progetta canonical query generation, `CLASS_RETURN_TO_ORIGIN` re-sanitization/fallback, full-view `view=all` routes, rejection of unknown descriptors and absence of mutation/external actions.
- [ ] Write RED policy tests for wrong mode, FOCUSED budgets, missing reason/context/full-view path, wrong-surface block/action and deterministic valid fixtures.
- [ ] Run the focused registry/policy tests and record RED.
- [ ] Implement the smallest registry and pure validator; no infrastructure/repository imports.
- [ ] Run focused tests to GREEN plus `npm run typecheck` and `npm run lint`.
- [ ] Commit the registry/policy slice.

### Task 4: IUI-02C — Deterministic composition boundary and fallback

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-composer.ts`
- Create: `product/src/core/presentation/intelligent-ui-composer.test.ts`
- Reuse: Tasks 1–3 contract, continuity, registry and validator.

**Interfaces:**

Expose a pure entry point:

```ts
composeDeterministicSurface(input: {
  context: UIContext
  primaryBlock: CompositionBlock
  supportBlocks?: readonly CompositionBlock[]
  primaryAction: RegisteredActionDescriptor | null
  supportActions?: readonly RegisteredActionDescriptor[]
  fullViewAction: RegisteredActionDescriptor
  fallback: () => ValidDeterministicFallback
}): SurfaceComposition
```

The function resolves descriptors through the registry, constructs the composition and validates it. Invalid focused input never leaks partially to rendering; the explicit same-surface fallback is used instead. It never guesses domain state.

Fallback diagnostics are machine-readable (`INVALID_CONTEXT`, `UNKNOWN_ACTION`, `STALE_CONTINUITY`, or narrower enum values) and stored only in `fallbackReason`; teacher-facing text remains human.

- [ ] Write table-driven RED tests for equivalent-input stability, action ordering, fail-closed unknown action, invalid FOCUSED budgets and explicit same-surface fallback.
- [ ] Add a source-boundary test proving the core composer does not import `core/infrastructure`, Supabase repositories, app server actions or provider clients.
- [ ] Run the focused test and record RED.
- [ ] Implement the pure composer/fallback with no side effects.
- [ ] Run focused tests to GREEN, then all IUI core tests together and `npm run typecheck`.
- [ ] Commit IUI-02 core complete.

### Task 5: IUI-03B — Home composition adapter

**Files:**
- Create: `product/src/app/home-intelligent-ui.ts`
- Create: `product/src/app/home-intelligent-ui.test.ts`
- Modify: `product/src/app/page.tsx`
- Modify styles only if an anchor/focus affordance requires it; no redesign.

**Interfaces and boundaries:**

Create a pure Home adapter receiving the already-authoritative Home primary view model. Keep `resolveHomeDailyContext()` and the current priority ordering authoritative.

Map state to canonical intent:

- current lesson → `TEACH`;
- pending registration → `RECORD`;
- upcoming/next lesson → `PREPARE`;
- urgent planner task → `ACT_NOW`;
- ambiguous timetable context → safe `REVIEW`/GUIDED path to Orario;
- no operational task → `EXPLORE` or contextual `REVIEW`, never invented urgency.

Refactor the local Home primary view model so its target is a `RegisteredActionDescriptor`, not an arbitrary href. Existing helpers such as `resolveDailyPrimary()` / `resolveNextMomentPrimary()` may keep their prioritization/text responsibilities but must produce canonical route parameters for the descriptor.

Home routing rules:

- preserve existing direct modeled Lesson Workspace navigation for current/upcoming lessons when already available;
- only legitimate class targets use `HOME_OPEN_CLASS` + Task 2 continuity;
- never force a modeled lesson through Classe;
- `HOME_SHOW_ALL` resolves to `/?view=all#home-full-view`;
- Home reads the validated `view=all` query and renders the existing `Esplora tutto lo spazio docente` `<details id="home-full-view">` with `open` when requested, so activating the full-view action actually reveals its content;
- existing Planner/Orario secondary action remains at most one peer support action.

`page.tsx` consumes only a validated composition and renders it through the existing `humanTaskFocus` application-owned markup; do not create a general page renderer or second design system.

- [ ] Write RED adapter tests for CURRENT/UPCOMING/PENDING/AMBIGUOUS/PLANNER/FALLBACK cases, exact intent/mode, action budget, human reason, full-view route, task-aware class descriptor and direct-lesson preservation.
- [ ] Add a RED source-boundary assertion that the adapter imports no repositories/server actions and cannot return unvalidated arbitrary hrefs.
- [ ] Run focused Home tests and record RED.
- [ ] Implement the adapter and the smallest Home primary-view-model refactor needed to supply registered descriptors.
- [ ] Render composition fields/actions through existing Home focus markup; add `id="home-full-view"`, parse `view`, and render the existing secondary `<details>` open when `view=all`.
- [ ] Run focused tests to GREEN, then existing Home/Human Task tests, typecheck and lint.
- [ ] Commit the Home pilot slice.

### Task 6: IUI-03C — Classe composition adapter and authoritative-state reconciliation

**Files:**
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.ts`
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.test.ts`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify: `product/src/app/classi/[sectionId]/class-task-state.test.ts` only for integration/source assertions; do not rewrite its state machine.

**Interfaces and boundaries:**

The Class adapter receives:

- `ClassTaskDecision` from `resolveClassTaskDecision()`;
- `presentClassTaskState()` result;
- human section label;
- current/next canonical block/title/context;
- canonical route parameters needed by the action descriptor: section, lesson mode, grade query, block/UDA/pack;
- optional parsed Home continuity, including the already-sanitized `returnTo`.

It must **not** receive or pass an arbitrary `taskHref`; the registered-action factory owns href generation.

Intent mapping:

- `PREPARE` → `PREPARE`;
- `TEACH` → `TEACH`;
- `RECORD` / `CATCH_UP` → `RECORD`;
- `AFTER_RECORD` + completion decision → `REVIEW`;
- `AFTER_RECORD` preparing next meeting → `PREPARE`;
- `COMPLETE` → `REVIEW`, `ContextSpecificity='CONTEXTUAL'`, non-FOCUSED composition, no invented task.

Continuity reconciliation:

- extend page search params with `mode`, `block`, `returnTo`, `view`;
- parse/sanitize using Task 2 helpers;
- coherent entry context may explain why Classe opened but never changes authoritative state;
- stale/mismatched block or mode is ignored; current Class state is composed and `STALE_CONTINUITY` is diagnostic only;
- a valid sanitized `returnTo` is preserved as a registered secondary `CLASS_RETURN_TO_ORIGIN` action; external/invalid values collapse to the current-class fallback and do not create an external or arbitrary route;
- the return action is navigation only and never changes occurrence selection, completion proposal, TeachingSession recording or annual-plan state;
- continuity never changes occurrence selection, completion proposal, TeachingSession recording or annual-plan state.

Action mapping:

- modeled current task → `CLASS_OPEN_MODELED_LESSON`;
- recorder fallback → `CLASS_OPEN_INLINE_RECORDER`;
- completion decision → `CLASS_OPEN_COMPLETION`;
- planning fallback → `CLASS_OPEN_PLANNING` built from canonical grade/section/block/UDA/pack;
- valid origin → optional peer `CLASS_RETURN_TO_ORIGIN`;
- broad view → `CLASS_SHOW_ALL` mapped to `/classi/<section>?view=all#class-full-view`.

Rendering remains the existing `classLessonFocus` application-owned structure. Preserve `Prima della lezione` only when valid and keep peer support actions within the canonical budget. Add stable `id="class-full-view"` to the existing `Contesto della classe e altri percorsi` details element and render it open when `view=all`.

- [ ] Write RED tests for every `ClassTaskState`, intent/specificity mapping, FOCUSED budgets, COMPLETE non-focused behavior and current-state precedence over incoming continuity.
- [ ] Add RED cases proving mismatched block/mode cannot redirect to another lesson, a valid internal `returnTo` becomes a registered secondary return action, and external return targets cannot escape the current-class fallback.
- [ ] Add RED cases proving `CLASS_SHOW_ALL` produces the same-section `view=all` route and the page opens the full-view disclosure when requested.
- [ ] Extend `class-task-state.test.ts` with source assertions that the new adapter does not replace `resolveClassTaskDecision()` and introduces no render-time write path.
- [ ] Run focused tests and record RED.
- [ ] Implement the pure adapter and page integration without changing the existing state machine/server actions.
- [ ] Render validated `LESSON_FOCUS` content/actions through existing markup; add `id="class-full-view"`, preserve the return action, and open the secondary details surface only for validated `view=all`.
- [ ] Run Class adapter/state/continuity tests to GREEN, then typecheck/lint.
- [ ] Commit the Class pilot slice.

### Task 7: IUI-03D — Product CI inclusion, regression and exact-head certification

**Files:**
- Modify: `product/package.json` — append all new tests to the explicit `test` script; remove none.
- Create: `docs/superpowers/evidence/2026-10-08-iui-02-03-closeout.md`
- Modify existing browser/certification tests only when a missing Home/Class assertion requires it; do not create a parallel certification system.

**Automated verification:**

- all new IUI contract/registry/policy/composer tests;
- task continuity tests;
- Home adapter tests;
- Class adapter + existing Class state tests;
- complete `npm test`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`;
- Human Interaction Model;
- Design Policy;
- Browser Certification for Home/Class;
- WCAG 2.2 AA coverage for changed surfaces;
- no-implicit-write/X3-equivalent gate;
- Human Visual Acceptance on smartphone and desktop.

**Browser/Human Review scenarios:**

1. Home current modeled lesson: direct lesson path remains direct and focused.
2. Home pending registration: safe continuity opens Classe; authoritative Class state selects RECORD/CATCH_UP.
3. Home upcoming modeled lesson: preparation path remains minimal; no artificial detour.
4. Ambiguous/incomplete context: no class/lesson is guessed.
5. Stale Home continuity arriving at Classe: current Class state wins.
6. Classe PREPARE / TEACH / RECORD / AFTER_RECORD / COMPLETE: location, task, state, next action, reason and broader-view path remain understandable.
7. Home and Classe full-view actions visibly open/reveal the existing broader-content disclosure; a fragment landing on a closed `<details>` is not accepted as PASS.
8. Valid Home → Classe continuity exposes an explicit sanitized return-to-origin action; external/malformed origins do not become navigable destinations.
9. Composition/rendering alone produces no database mutation or annual-plan advancement.

- [ ] Add every new `.test.ts` file to `product/package.json` and verify the canonical test script executes each one.
- [ ] Run focused tranche tests, then full Product CI commands.
- [ ] Push exact implementation head and run repository CI/certification on that exact SHA; inherit no PASS from earlier heads.
- [ ] Capture smartphone + desktop evidence for Home and Classe through the existing HVA path, including actual full-view disclosure reveal, return-to-origin continuity, keyboard/focus and no unintended horizontal overflow.
- [ ] Record baseline SHA, exact head SHA, run identifiers and PASS/FAIL per gate in the closeout evidence, with explicit `MODEL_RUNTIME=DISABLED`, `IMPLICIT_WRITE=NONE`, `DOS-A1=RUNTIME_DEFERRED`.
- [ ] If a product defect appears, return to the owning RED/GREEN task and recertify the new exact head. Distinguish infrastructure/CI failures from product failures.
- [ ] Keep implementation PR Draft until exact-head automated gates and Human Review pass. No automatic merge.

## Definition of done for IUI-02/03

IUI-02/03 is complete only when:

- closed deterministic contract/continuity/registry/policy/composer layers exist and are independently tested;
- Home and Classe consume validated `SurfaceComposition` without duplicating domain authority;
- direct modeled Home → lesson journeys are not lengthened;
- legitimate Home → Classe transitions preserve sanitized task context;
- valid sanitized origins remain explicitly reachable from Classe as secondary navigation without affecting authoritative state;
- stale/incoherent continuity cannot override current Class state;
- FOCUSED action budgets and broader-view escape paths are enforced;
- broader-view escape actually reveals the broader content on Home and Classe;
- composition/rendering performs no writes;
- no runtime GPT/model/provider dependency exists;
- every new test is part of canonical `npm test`;
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
