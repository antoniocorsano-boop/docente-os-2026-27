# IUI-02/03 — Deterministic Intelligent UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the deterministic intelligent-composition core and qualify the first teacher journey, Home → Classe → prossima lezione, without introducing a runtime model dependency or changing domain authority.

**Architecture:** Reuse the canonical Human Task Model as the only intent/mode taxonomy. Add a small presentation-layer contract, closed navigation/action registry, safe task-continuity token, fail-closed policy validator and pure deterministic composer. Home and Classe remain domain-aware adapters over already-authoritative state. Rendering stays application-owned and reuses existing Home/Class focus layouts. No generic page DSL, arbitrary JSX/HTML/CSS, arbitrary route pass-through, new persistence or new write path.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript 5.9.2, Node 22, existing `node:test`/`tsx` stack, Product CI, Browser Certification, Human Interaction Model, Design Policy, no-implicit-write and HVA gates.

**Spec:** `docs/superpowers/specs/2026-10-08-intelligent-ui-composition-design.md`

## Global Constraints

- Before Task 1, refresh from the then-current governed `develop` head and record its exact SHA as implementation baseline.
- Execute on a dedicated isolated branch/worktree; never implement this tranche directly on `main`/`develop`.
- Scope is **IUI-02 + IUI-03 only**. Do not implement IUI-04+, Documentazione changes, Studio Atlas changes or a runtime model/provider adapter.
- `HumanIntent`, `ContextSpecificity`, `ExperienceMode`, `resolveExperienceMode()` and `interactionBudget()` remain canonical.
- `resolveHomeDailyContext()` remains authoritative for Home temporal state.
- `resolveClassTaskDecision()` remains authoritative for Class task state.
- Preserve direct Home → modeled Lesson Workspace navigation when it is already the shortest valid path.
- Composition/rendering cannot mutate data, create TeachingSession records, advance the annual plan, mark preparation/completion or invoke a route handler for side effects.
- No new persistence, migration, table, API key, provider call, telemetry or student-personal-data flow.
- Stable navigation, Settings, authentication/security and Docente OS / Arena / Atlas / Studio Atlas authority boundaries remain unchanged.
- Equivalent deterministic input produces equivalent deterministic composition.
- Unknown component/action/origin fails closed.
- Full-view actions must reveal the broader content, not merely scroll to a closed `<details>` element.
- **Return continuity is a closed UI-surface token, not a URL.** For this pilot the only allowed return origin is `HOME`; no arbitrary `returnTo` string is carried into a registered action.
- `/api/**`, authentication/handler routes, `/_next/**`, asset paths, technical routes, external URLs and all non-registered destinations are ineligible as Class return origins by construction.
- Existing Class receipt/query semantics (`recorded`, `session`, `replanning`) are preserved; IUI only extends them with its own optional continuity/presentation parameters.
- No automatic merge. Exact-head certification and Human Review are required before integration.

## Review Focus

- The composition layer must not become a second domain model.
- Entry parameters are continuity hints only; authoritative current state always wins.
- FOCUSED mode exposes exactly one primary action and at most two peer support actions.
- Completed Class state may render a non-FOCUSED REVIEW composition without inventing a task.
- Full-view access must actually expose broader content.
- Home → Classe origin continuity must be explicit, safe, UI-only, and survive the transition to the Class full-view surface.
- No registered action may accept arbitrary href input or point to a mutation/route-handler endpoint.
- Existing Class recording/completion/receipt boundaries remain explicit and server-revalidated.
- Every new test must be included in the canonical `product/package.json` test command.

---

### Task 1: IUI-02A — Canonical composition contracts

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-contract.ts`
- Create: `product/src/core/presentation/intelligent-ui-contract.test.ts`
- Reuse without semantic change: `product/src/core/presentation/human-task-model.ts`

**Interfaces:**

`RegisteredActionId` is defined in Task 1 so the contract typechecks before the registry exists. Task 3 imports this type; it does not redeclare a competing ID union.

```ts
export const INTELLIGENT_UI_VERSION = 'iui.v1' as const
export type IntelligentSurface = 'HOME' | 'CLASS'
export type SemanticBlockId = 'TASK_FOCUS' | 'LESSON_FOCUS'

export type RegisteredActionId =
  | 'HOME_OPEN_PLANNER'
  | 'HOME_OPEN_TIMETABLE'
  | 'HOME_OPEN_CLASS'
  | 'HOME_OPEN_LESSON'
  | 'HOME_SHOW_ALL'
  | 'CLASS_OPEN_MODELED_LESSON'
  | 'CLASS_OPEN_INLINE_RECORDER'
  | 'CLASS_OPEN_COMPLETION'
  | 'CLASS_OPEN_PLANNING'
  | 'CLASS_RETURN_TO_ORIGIN'
  | 'CLASS_SHOW_ALL'

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

`HumanTaskContext`, `HumanIntent` and `ExperienceMode` are imported from the canonical Human Task module and never redeclared.

- [ ] Write RED tests proving HOME/CLASS compositions reuse canonical Human Task types, expose the exact closed `RegisteredActionId` union, and are serializable without JSX, HTML, CSS or executable-code fields.
- [ ] Run the focused contract test and record RED.
- [ ] Implement only the transport/presentation types and version constant.
- [ ] Run focused test + `npm run typecheck` to GREEN; Task 1 must compile without any Task 3 file existing.
- [ ] Commit independently.

---

### Task 2: IUI-03A — Closed Home → Classe continuity token

**Files:**
- Modify: `product/src/core/presentation/task-continuity.ts`
- Modify: `product/src/core/presentation/task-continuity.test.ts`

**Interfaces:**

Keep existing Knowledge continuity helpers intact, but define Class IUI continuity through a closed origin token:

```ts
export type ClassTaskEntryMode = 'prepare' | 'teach' | 'record'
export type ClassReturnOrigin = 'HOME'

export function buildTaskAwareClassHref(
  sectionId: string,
  input: {
    mode: ClassTaskEntryMode
    blockId?: string | null
    returnOrigin?: ClassReturnOrigin | null
  },
): string

export function parseClassTaskEntry(input: {
  mode?: string | null
  block?: string | null
  origin?: string | null
}): {
  mode: ClassTaskEntryMode | null
  blockId: string | null
  returnOrigin: ClassReturnOrigin | null
}
```

**Contract:**

- `returnOrigin: 'HOME'` emits a compact closed token such as `origin=home`; it does not encode `/` as an arbitrary return URL.
- parser accepts only exact registered token `home`; every other value becomes `null`.
- `/api/google/drive/connect`, `/login`, `/_next/static/...`, `/knowledge`, `//evil.example`, `https://evil.example` and encoded variants do not become a return origin.
- `sectionId` and `block` are safely encoded; only `prepare | teach | record` and `B01`…`B33` are accepted.
- these values are hints, never authorization or state authority.

- [ ] RED tests: prepare/teach/record, encoding, invalid block, `origin=home`, unknown origin, API/auth/technical/external values and deterministic round-trip.
- [ ] Verify RED.
- [ ] Implement minimum closed-token helpers; preserve existing Knowledge continuity behavior.
- [ ] Run continuity + Human Task tests to GREEN.
- [ ] Commit independently.

---

### Task 3: IUI-02B — Closed block/action registry and policy validator

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-registry.ts`
- Create: `product/src/core/presentation/intelligent-ui-registry.test.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.test.ts`
- Reuse: `RegisteredActionId` from Task 1, Human Task model, lesson-route builders and Task 2 continuity helpers.

The initial block catalogue contains only `TASK_FOCUS` for HOME and `LESSON_FOCUS` for CLASS.

**Descriptor contract:**

```ts
type RegisteredActionDescriptor =
  | { id: 'HOME_OPEN_PLANNER'; label: string }
  | { id: 'HOME_OPEN_TIMETABLE'; label: string }
  | { id: 'HOME_OPEN_CLASS'; label: string; sectionId: string; mode: ClassTaskEntryMode; blockId?: string | null; returnOrigin?: ClassReturnOrigin | null }
  | { id: 'HOME_OPEN_LESSON'; label: string; sectionId: string; blockId: string; mode: 'prepare' | 'teach' | 'observe' | 'record' }
  | { id: 'HOME_SHOW_ALL'; label: string }
  | { id: 'CLASS_OPEN_MODELED_LESSON'; label: string; sectionId: string; blockId: string; mode: 'prepare' | 'teach' | 'record' }
  | { id: 'CLASS_OPEN_INLINE_RECORDER'; label: string }
  | { id: 'CLASS_OPEN_COMPLETION'; label: string }
  | { id: 'CLASS_OPEN_PLANNING'; label: string; gradeQuery: 'prima' | 'seconda' | 'terza'; sectionId: string; blockId?: string | null; uda?: string | null; pack?: string | null }
  | { id: 'CLASS_RETURN_TO_ORIGIN'; label: string; origin: ClassReturnOrigin }
  | { id: 'CLASS_SHOW_ALL'; label: string; sectionId: string; returnOrigin?: ClassReturnOrigin | null }
```

`resolveRegisteredAction()` is the only href factory.

- `CLASS_RETURN_TO_ORIGIN` contains no href/raw path; `origin: 'HOME'` resolves to `/`.
- `CLASS_SHOW_ALL` resolves to `/classi/<section>?view=all#class-full-view` and, when `returnOrigin === 'HOME'`, preserves the closed token in the same URL (for example `?view=all&origin=home#class-full-view`).
- no descriptor carries `/api/**`, `/login`, `/_next/**`, technical paths or arbitrary same-origin/external URLs.
- `HOME_SHOW_ALL` resolves to `/?view=all#home-full-view`.
- `CLASS_OPEN_PLANNING` constructs only typed `/progetta` routes.
- unknown descriptors/origins fail closed.

**Validator invariants:**

- mode matches canonical `resolveExperienceMode()`;
- block/action belongs to the surface/mode registry;
- FOCUSED has one primary action and ≤2 peer support actions;
- narrowed surface has reason/context/full-view action;
- full-view action is non-mutating;
- no registry entry maps to API/handler, external destination, server action or DB operation.

- [ ] RED registry tests for membership, route generation, fixed Home return, impossibility of raw href input, API/technical rejection, full-view routes and `origin=home` preservation through `CLASS_SHOW_ALL`.
- [ ] RED policy tests for wrong mode, budgets, missing narrowing metadata, wrong-surface action and deterministic valid fixtures.
- [ ] Verify RED.
- [ ] Implement smallest closed registry/policy.
- [ ] Run focused tests + typecheck + lint to GREEN.
- [ ] Commit.

---

### Task 4: IUI-02C — Deterministic composition boundary and fallback

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-composer.ts`
- Create: `product/src/core/presentation/intelligent-ui-composer.test.ts`

**Interface:**

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

Resolve descriptors, construct/validate composition, and use explicit same-surface fallback on invalid input. Never guess domain state.

- [ ] RED stability/order/unknown-action/budget/fallback tests.
- [ ] RED source-boundary test forbidding infrastructure/Supabase/server-action/provider imports.
- [ ] Implement pure composer/fallback.
- [ ] Run all IUI core tests + typecheck to GREEN.
- [ ] Commit.

---

### Task 5: IUI-03B — Home composition adapter

**Files:**
- Create: `product/src/app/home-intelligent-ui.ts`
- Create: `product/src/app/home-intelligent-ui.test.ts`
- Modify: `product/src/app/page.tsx`
- Modify styles only if existing focus/anchor affordance requires it; no redesign.

`resolveHomeDailyContext()` and current Home priority ordering remain authority.

**Intent mapping:** current lesson→TEACH; pending registration→RECORD; upcoming→PREPARE; urgent planner→ACT_NOW; ambiguous timetable→safe REVIEW/GUIDED; no operational task→EXPLORE/REVIEW.

**Routing:**

- preserve direct modeled lesson routes;
- legitimate class targets use `HOME_OPEN_CLASS` with `returnOrigin: 'HOME'`;
- never force modeled lesson through Classe;
- `HOME_SHOW_ALL` uses `/?view=all#home-full-view`;
- validated `view=all` renders existing Home broader-content `<details>` open;
- support actions remain inside canonical budget.

- [ ] RED Home adapter tests including `returnOrigin: 'HOME'` and direct-route preservation.
- [ ] Source-boundary RED: no repositories/server actions/arbitrary href output.
- [ ] Implement smallest adapter/view-model integration.
- [ ] Add stable `home-full-view` + open behavior.
- [ ] Run Home/Human Task tests + typecheck + lint.
- [ ] Commit.

---

### Task 6: IUI-03C — Classe adapter and authoritative-state reconciliation

**Files:**
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.ts`
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.test.ts`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify existing Class state tests only for integration/source assertions.

The adapter consumes authoritative `ClassTaskDecision`, presented task state, canonical context and optional parsed `returnOrigin`; it does not consume arbitrary `taskHref` or `returnTo` URLs.

**Query contract:**

- Preserve the Class page’s existing receipt/feedback parameters, including `recorded`, `session`, and `replanning`, with their current semantics.
- Extend the existing query contract additively with optional IUI parameters `mode`, `block`, `origin`, `view`.
- IUI parsing must never drop or reinterpret the existing receipt parameters.

**Intent mapping:** PREPARE→PREPARE; TEACH→TEACH; RECORD/CATCH_UP→RECORD; AFTER_RECORD completion→REVIEW; AFTER_RECORD next meeting→PREPARE; COMPLETE→non-FOCUSED contextual REVIEW.

**Continuity reconciliation:**

- Task 2 parser converts only `origin=home` to `returnOrigin='HOME'`;
- stale/mismatched mode/block is ignored and authoritative Class state wins;
- valid HOME origin may add secondary `CLASS_RETURN_TO_ORIGIN`;
- unknown origin creates no return action;
- there is no raw return URL;
- entering full view through `CLASS_SHOW_ALL` preserves the closed HOME token so the return action remains available after the disclosure opens;
- receipt params `recorded/session/replanning` remain available throughout this journey;
- continuity never changes occurrence selection, completion proposal, TeachingSession recording or annual-plan state.

**Action mapping:** modeled task→MODELED_LESSON; recorder fallback→INLINE_RECORDER; completion→COMPLETION; planning→typed PLANNING; valid HOME origin→RETURN_TO_ORIGIN; broad view→SHOW_ALL with optional preserved return origin.

- [ ] RED every ClassTaskState + current-state precedence.
- [ ] RED `origin=home` fixed Home return and rejection of API/auth/technical/external values.
- [ ] RED receipt regression: existing `recorded/session/replanning` survive when IUI params are present.
- [ ] RED origin→`CLASS_SHOW_ALL`→open disclosure→`CLASS_RETURN_TO_ORIGIN` sequence.
- [ ] Source assertions keep `resolveClassTaskDecision()` authoritative and add no write path.
- [ ] Implement pure adapter/page integration without changing state machine/server actions.
- [ ] Run Class/continuity/receipt tests + typecheck + lint.
- [ ] Commit.

---

### Task 7: IUI-03D — Product CI inclusion and exact-head certification

**Files:**
- Modify: `product/package.json` — append all new tests; remove none.
- Create: `docs/superpowers/evidence/2026-10-08-iui-02-03-closeout.md`
- Modify existing browser/certification tests only as needed; no parallel certification system.

**Automated verification:** all IUI tests, continuity tests, Home/Class adapter + existing Class receipt/state tests, complete `npm test`, typecheck, lint, build, Human Interaction, Design Policy, Browser, WCAG, no-implicit-write and HVA.

**Browser/Human Review scenarios:**

1. Current modeled lesson keeps direct route.
2. Pending registration opens Classe with `origin=home`; Class authority chooses state.
3. Ambiguous context guesses nothing.
4. Stale hints cannot override Class state.
5. Existing post-write receipts still render with `recorded/session/replanning` when IUI params coexist.
6. Home/Class full-view actions actually reveal content.
7. `origin=home` → Class full view preserves origin → return action resolves exactly `/`.
8. `/api/google/drive/connect`, `/login`, `/_next/**`, arbitrary same-origin/external/encoded variants create no return action and trigger no route-handler request.
9. Composition/rendering produces no mutation.

- [ ] Add every new test to canonical `product/package.json` suite.
- [ ] Run focused tranche tests then full Product CI commands.
- [ ] Push exact head and certify that SHA; inherit no PASS from earlier heads.
- [ ] Capture HVA evidence including full-view reveal, receipt preservation, fixed Home return and technical/API origin rejection.
- [ ] Record baseline/head/run IDs with `MODEL_RUNTIME=DISABLED`, `IMPLICIT_WRITE=NONE`, `DOS-A1=RUNTIME_DEFERRED`.
- [ ] Any defect returns to owning RED→GREEN task and forces new exact-head certification.
- [ ] Keep PR Draft until automated gates + Human Review pass.

## Definition of done

IUI-02/03 is complete only when:

- implementation started from current governed `develop` on isolated branch/worktree;
- Task 1 typechecks independently with `RegisteredActionId` already defined;
- Home/Class consume validated composition without duplicating authority;
- direct modeled lesson journeys are not lengthened;
- Class return continuity uses only closed HOME token;
- no API/auth/technical/external path can become return action;
- Home origin survives Class full-view transition;
- existing Class receipt feedback parameters/flows remain intact;
- stale continuity cannot override current Class state;
- broader-view actions actually reveal content;
- composition/rendering performs no writes;
- no runtime model/provider dependency exists;
- all tests are in canonical `npm test`;
- Product CI + required Browser/WCAG/HVA/no-implicit-write gates pass on exact implementation head;
- Human Review judges the journey simpler/predictable;
- no automatic merge occurred.

## Explicitly deferred

Do not begin in this PR: IUI-04 Classe/Progetta/Conoscenza expansion; IUI-05 Piano annuale/Materiali/Documentazione composition; IUI-06 runtime model/provider adapter; IUI-07 broader adaptive rollout.
