# IUI-02/03 — Deterministic Intelligent UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the deterministic intelligent-composition core and qualify the first teacher journey, Home → Classe → prossima lezione, without introducing a runtime model dependency or changing domain authority.

**Architecture:** Reuse the canonical Human Task Model as the only intent/mode taxonomy. Add a small presentation-layer contract, closed navigation/action registry, safe task-continuity token, fail-closed policy validator and pure deterministic composer. Home and Classe remain domain-aware adapters over already-authoritative state. Rendering stays application-owned and reuses existing Home/Class focus layouts. No generic page DSL, arbitrary JSX/HTML/CSS, arbitrary route pass-through, new persistence or new write path.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript 5.9.2, Node 22, existing `node:test`/`tsx` stack, Product CI, Browser Certification, Human Interaction Model, Design Policy, no-implicit-write and HVA gates.

**Spec:** `docs/superpowers/specs/2026-10-08-intelligent-ui-composition-design.md`

## Global Constraints

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
- **Return continuity is a closed UI-surface token, not a URL.** For this pilot the only allowed return origin is `HOME`; no arbitrary `returnTo` string is carried into the registered action.
- `/api/**`, authentication/handler routes, `/_next/**`, asset paths, technical routes, external URLs and all non-registered destinations are ineligible as Class return origins by construction.
- No automatic merge. Exact-head certification and Human Review are required before integration.

## Review Focus

- The composition layer must not become a second domain model.
- Entry parameters are continuity hints only; authoritative current state always wins.
- FOCUSED mode exposes exactly one primary action and at most two peer support actions.
- Completed Class state may render a non-FOCUSED REVIEW composition without inventing a task.
- Full-view access must actually expose broader content.
- Home → Classe origin continuity must be explicit, safe and UI-only.
- No registered action may accept arbitrary href input or point to a mutation/route-handler endpoint.
- Existing Class recording/completion boundaries remain explicit and server-revalidated.
- Every new test must be included in the canonical `product/package.json` test command.

---

### Task 1: IUI-02A — Canonical composition contracts

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-contract.ts`
- Create: `product/src/core/presentation/intelligent-ui-contract.test.ts`
- Reuse without semantic change: `product/src/core/presentation/human-task-model.ts`

**Interfaces:**

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

`HumanTaskContext`, `HumanIntent` and `ExperienceMode` are imported from the canonical Human Task module and never redeclared.

- [ ] Write RED tests proving HOME/CLASS compositions reuse canonical Human Task types and are serializable without JSX, HTML, CSS or executable-code fields.
- [ ] Run the focused contract test and record RED.
- [ ] Implement only the transport/presentation types and version constant.
- [ ] Run focused test + `npm run typecheck` to GREEN.
- [ ] Commit independently.

---

### Task 2: IUI-03A — Closed Home → Classe continuity token

**Files:**
- Modify: `product/src/core/presentation/task-continuity.ts`
- Modify: `product/src/core/presentation/task-continuity.test.ts`

**Interfaces:**

Do not create a parallel generic URL utility. Keep existing Knowledge continuity helpers intact, but define Class continuity through a closed origin token:

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

- `buildTaskAwareClassHref(..., { returnOrigin: 'HOME' })` emits a compact closed token such as `origin=home`; it does not encode `/` as an arbitrary return URL.
- `parseClassTaskEntry()` accepts only the exact registered token `home`; every other value becomes `null`.
- A value such as `/api/google/drive/connect`, `/login`, `/_next/static/...`, `/knowledge`, `//evil.example`, `https://evil.example` or any percent-encoded equivalent does **not** become a return origin.
- `sectionId` and `block` remain safely encoded; only `prepare | teach | record` and canonical block IDs `B01`…`B33` are accepted.
- These values are hints, never authorization or state authority.

- [ ] RED tests: prepare/teach/record, encoding, invalid/out-of-range block, `origin=home`, unknown origin, `/api/google/drive/connect`, auth/technical paths, protocol-relative/external values and deterministic round-trip.
- [ ] Verify RED.
- [ ] Implement the minimum closed-token helpers; preserve existing Knowledge continuity behavior.
- [ ] Run continuity + Human Task tests to GREEN.
- [ ] Commit independently.

---

### Task 3: IUI-02B — Closed block/action registry and policy validator

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-registry.ts`
- Create: `product/src/core/presentation/intelligent-ui-registry.test.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.test.ts`
- Reuse: Human Task model, existing lesson-route builders, Task 2 continuity helpers.

The initial block catalogue contains only `TASK_FOCUS` for HOME and `LESSON_FOCUS` for CLASS.

**Registered action IDs:**

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
  | { id: 'CLASS_SHOW_ALL'; label: string; sectionId: string }
```

`resolveRegisteredAction()` is the only href factory for composed actions.

- `CLASS_RETURN_TO_ORIGIN` contains **no href and no raw path**. For `origin: 'HOME'`, the registry emits the fixed UI route `/`.
- No descriptor can carry `/api/**`, `/login`, `/_next/**`, asset/technical paths or arbitrary same-origin URLs.
- `HOME_SHOW_ALL` resolves to `/?view=all#home-full-view`.
- `CLASS_SHOW_ALL` resolves to `/classi/<section>?view=all#class-full-view`.
- `CLASS_OPEN_PLANNING` constructs only the canonical existing `/progetta` route from typed parameters.
- Unknown descriptors/origins fail closed.

`validateUIContext()` and `validateSurfaceComposition()` return inspectable validation results.

**Validator invariants:**

- `context.mode === resolveExperienceMode(context.task)`;
- block is registered and allowed for surface/mode;
- every action is a resolved registered action;
- FOCUSED has one non-null primary action and ≤2 peer support actions;
- narrowed surfaces have non-empty `reason`, `contextSummary` and same-surface full-view action;
- full-view action is non-mutating;
- registry contains no external route, API/handler route, server action or database operation.

- [ ] RED registry tests for exact membership, route generation/encoding, `CLASS_RETURN_TO_ORIGIN` fixed `/` resolution, impossibility of raw href input, rejection of unknown origin/descriptor, full-view routes and absence of API/mutation/external destinations.
- [ ] RED policy tests for wrong mode, FOCUSED budgets, missing reason/context/full view, wrong-surface block/action and deterministic valid fixtures.
- [ ] Verify RED.
- [ ] Implement smallest closed registry and pure validators.
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

The function resolves registered descriptors, constructs the composition, validates it and uses an explicit same-surface fallback on invalid input. It never guesses domain state.

Fallback diagnostics are machine-readable (`INVALID_CONTEXT`, `UNKNOWN_ACTION`, `STALE_CONTINUITY`, or narrower values) and live only in `fallbackReason`.

- [ ] Table-driven RED tests: equivalent-input stability, ordering, unknown action, invalid FOCUSED budgets and explicit fallback.
- [ ] Source-boundary RED test: no infrastructure/Supabase/server-action/provider imports.
- [ ] Verify RED.
- [ ] Implement pure composer/fallback.
- [ ] Run all IUI core tests + typecheck to GREEN.
- [ ] Commit.

---

### Task 5: IUI-03B — Home composition adapter

**Files:**
- Create: `product/src/app/home-intelligent-ui.ts`
- Create: `product/src/app/home-intelligent-ui.test.ts`
- Modify: `product/src/app/page.tsx`
- Modify styles only if an existing focus/anchor affordance requires it; no redesign.

Home adapter consumes the already-authoritative Home primary view model. `resolveHomeDailyContext()` and current priority ordering remain authoritative.

**Intent mapping:**
- current lesson → `TEACH`;
- pending registration → `RECORD`;
- upcoming/next lesson → `PREPARE`;
- urgent planner task → `ACT_NOW`;
- ambiguous timetable context → safe `REVIEW`/GUIDED path to Orario;
- no operational task → `EXPLORE` or contextual `REVIEW`.

**Routing:**
- preserve direct modeled lesson routes;
- legitimate class targets use `HOME_OPEN_CLASS` with `returnOrigin: 'HOME'`;
- never force a modeled lesson through Classe;
- `HOME_SHOW_ALL` uses `/?view=all#home-full-view`;
- Home parses only its own `view=all` presentation flag and renders the existing `Esplora tutto lo spazio docente` disclosure `open` when requested;
- Planner/Orario support remains within the canonical action budget.

- [ ] RED adapter tests for CURRENT/UPCOMING/PENDING/AMBIGUOUS/PLANNER/FALLBACK, intent/mode, action budget, human reason, full-view route, `returnOrigin: 'HOME'` and direct-lesson preservation.
- [ ] Source-boundary RED assertion: no repositories/server actions/arbitrary href outputs.
- [ ] Verify RED.
- [ ] Implement adapter and smallest Home view-model integration.
- [ ] Add stable `id="home-full-view"` and `open` behavior for validated `view=all`.
- [ ] Run Home/Human Task tests + typecheck + lint to GREEN.
- [ ] Commit.

---

### Task 6: IUI-03C — Classe adapter and authoritative-state reconciliation

**Files:**
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.ts`
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.test.ts`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify: `product/src/app/classi/[sectionId]/class-task-state.test.ts` only for integration/source assertions.

The adapter receives `ClassTaskDecision`, presented task state, human section label, canonical block/title context, typed route parameters and optional parsed `returnOrigin` token. It does **not** receive arbitrary `taskHref` or `returnTo` URLs.

**Intent mapping:**
- `PREPARE` → `PREPARE`;
- `TEACH` → `TEACH`;
- `RECORD` / `CATCH_UP` → `RECORD`;
- `AFTER_RECORD` + completion decision → `REVIEW`;
- `AFTER_RECORD` preparing next meeting → `PREPARE`;
- `COMPLETE` → non-FOCUSED contextual `REVIEW` with no invented operational task.

**Continuity reconciliation:**
- page accepts `mode`, `block`, `origin`, `view` only;
- Task 2 parser converts only `origin=home` to `returnOrigin='HOME'`;
- stale/mismatched block or mode is ignored and current Class state wins;
- valid `HOME` origin may become secondary `CLASS_RETURN_TO_ORIGIN`;
- unknown origin creates no return action;
- there is no raw return URL to sanitize/pass through;
- continuity never changes occurrence selection, completion proposal, TeachingSession recording or annual-plan state.

**Action mapping:**
- modeled task → `CLASS_OPEN_MODELED_LESSON`;
- recorder fallback → `CLASS_OPEN_INLINE_RECORDER`;
- completion decision → `CLASS_OPEN_COMPLETION`;
- planning fallback → typed `CLASS_OPEN_PLANNING`;
- valid Home origin → optional `CLASS_RETURN_TO_ORIGIN { origin: 'HOME' }`;
- broad view → `CLASS_SHOW_ALL`.

Existing `classLessonFocus` markup remains application-owned. Add `id="class-full-view"` to the existing broader-context disclosure and render it open only for validated `view=all`.

- [ ] RED tests for every ClassTaskState, intent/specificity, budgets, COMPLETE behavior and current-state precedence.
- [ ] RED cases: `origin=home` produces fixed Home return; `/api/google/drive/connect`, `/login`, `/_next/...`, arbitrary same-origin paths, external/protocol-relative/encoded variants produce no return action.
- [ ] RED `CLASS_SHOW_ALL` route + disclosure-open behavior.
- [ ] Source assertions that `resolveClassTaskDecision()` remains authority and rendering adds no write path.
- [ ] Verify RED.
- [ ] Implement pure adapter/page integration without changing state machine/server actions.
- [ ] Run Class/continuity tests + typecheck + lint to GREEN.
- [ ] Commit.

---

### Task 7: IUI-03D — Product CI inclusion and exact-head certification

**Files:**
- Modify: `product/package.json` — append all new tests; remove none.
- Create: `docs/superpowers/evidence/2026-10-08-iui-02-03-closeout.md`
- Modify existing browser/certification tests only when needed for Home/Class assertions; do not create a parallel certification system.

**Automated verification:**
- all IUI contract/continuity/registry/policy/composer tests;
- Home adapter tests;
- Class adapter + existing Class state tests;
- complete `npm test`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`;
- Human Interaction Model;
- Design Policy;
- Browser Certification Home/Class;
- WCAG 2.2 AA;
- no-implicit-write/X3-equivalent gate;
- HVA smartphone + desktop.

**Browser/Human Review scenarios:**
1. Current modeled lesson keeps direct Home → lesson navigation.
2. Pending registration opens Classe with closed `origin=home` continuity; authoritative Class state selects RECORD/CATCH_UP.
3. Upcoming modeled lesson remains direct/minimal.
4. Ambiguous/incomplete context guesses no class/lesson.
5. Stale mode/block hints cannot override Class state.
6. PREPARE/TEACH/RECORD/AFTER_RECORD/COMPLETE remain understandable and within action budgets.
7. Home/Class full-view actions visibly open the broader disclosure.
8. Valid `origin=home` exposes a secondary return action whose resolved href is exactly `/`.
9. Injected origins such as `/api/google/drive/connect`, `/login`, `/_next/static/...`, `/knowledge`, encoded technical paths or external URLs create **no** return action and trigger no route-handler request.
10. Composition/rendering alone produces no database mutation or annual-plan advancement.

- [ ] Add every new `.test.ts` file to canonical `product/package.json` test script.
- [ ] Run focused tranche tests then full Product CI commands.
- [ ] Push exact implementation head and run repository certification on that exact SHA; inherit no PASS from earlier heads.
- [ ] Capture HVA evidence including actual disclosure reveal, fixed Home return, rejection of technical/API origins, keyboard/focus and no horizontal overflow.
- [ ] Record baseline SHA, exact head, run IDs and PASS/FAIL per gate with `MODEL_RUNTIME=DISABLED`, `IMPLICIT_WRITE=NONE`, `DOS-A1=RUNTIME_DEFERRED`.
- [ ] Any product defect returns to the owning RED→GREEN task and forces recertification of the new head.
- [ ] Keep PR Draft until automated gates and Human Review pass. No automatic merge.

## Definition of done

IUI-02/03 is complete only when:

- deterministic contract/continuity/registry/policy/composer layers are independently tested;
- Home and Classe consume validated composition without duplicating domain authority;
- direct modeled Home → lesson journeys are not lengthened;
- Home → Classe continuity uses the closed `HOME` origin token, not an arbitrary URL;
- no API/auth/technical/external path can become `CLASS_RETURN_TO_ORIGIN`;
- stale continuity cannot override current Class state;
- FOCUSED budgets and broader-view escape paths are enforced;
- broader-view escape actually reveals the broader content;
- composition/rendering performs no writes;
- no runtime GPT/model/provider dependency exists;
- every new test is in canonical `npm test`;
- Product CI, typecheck, lint, build, Human Interaction, Design Policy, Browser/WCAG/no-implicit-write and HVA pass on the exact implementation head;
- Human Review judges the journey simpler and predictable;
- no automatic merge occurred.

## Explicitly deferred

Do not begin in this implementation PR:

- IUI-04 Classe / Progetta / Conoscenza continuity expansion;
- IUI-05 Piano annuale / Materiali / Documentazione composition;
- IUI-06 any GPT/model runtime adapter or provider orchestration;
- IUI-07 broader adaptive-surface rollout.

Each later tranche starts only from evidence produced by this deterministic pilot and receives its own scoped design/plan when interfaces or authority boundaries change.
