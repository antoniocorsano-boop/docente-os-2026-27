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
- Existing Class receipt/query semantics (`recorded`, `session`, `replanning`) are preserved. IUI never passes their raw query values through the registry: the page first validates them against current canonical block/progress or current TeachingSession state, then exposes a typed receipt context to composition.
- No automatic merge. Exact-head certification and Human Review are required before integration.

## Review Focus

- The composition layer must not become a second domain model.
- Entry parameters are continuity hints only; authoritative current state always wins.
- FOCUSED mode exposes exactly one primary action and at most two peer support actions.
- Completed Class state may render a non-FOCUSED REVIEW composition without inventing a task.
- Full-view access must actually expose broader content.
- Home → Classe origin continuity must be explicit, safe, UI-only, and survive the transition to the Class full-view surface.
- Validated Class feedback receipts must also survive that same-surface full-view transition without copying unvalidated query input.
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

- [ ] RED tests proving HOME/CLASS compositions reuse canonical Human Task types, expose the exact closed `RegisteredActionId` union, and contain no JSX/HTML/CSS/executable-code field.
- [ ] Run focused contract test and record RED.
- [ ] Implement only Task 1 types/constants.
- [ ] Run focused test + full `npm run typecheck` to GREEN before any Task 3 file exists.
- [ ] Commit.

---

### Task 2: IUI-03A — Closed Home → Classe continuity token

**Files:**
- Modify: `product/src/core/presentation/task-continuity.ts`
- Modify: `product/src/core/presentation/task-continuity.test.ts`

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

- `returnOrigin: 'HOME'` emits `origin=home`, not a raw return URL.
- only exact token `home` maps to `HOME`; all others map to `null`.
- API/auth/`/_next`/arbitrary same-origin/external/encoded values never become a return origin.
- only `prepare | teach | record` and canonical blocks `B01`…`B33` are accepted.
- continuity is a hint, never authority.

- [ ] RED prepare/teach/record, encoding, invalid block, HOME origin, unknown/API/auth/technical/external origins and deterministic round-trip.
- [ ] Verify RED.
- [ ] Implement minimum closed-token helpers; preserve existing Knowledge continuity.
- [ ] Run continuity + Human Task tests to GREEN.
- [ ] Commit.

---

### Task 3: IUI-02B — Closed block/action registry and policy validator

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-registry.ts`
- Create: `product/src/core/presentation/intelligent-ui-registry.test.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.test.ts`
- Reuse `RegisteredActionId` from Task 1 and Task 2 continuity types.

The initial block catalogue contains only `TASK_FOCUS` for HOME and `LESSON_FOCUS` for CLASS.

Define a validated receipt context owned by the Class adapter/registry boundary, not by raw query strings:

```ts
export type ClassReceiptContext =
  | { kind: 'RECORDED_BLOCK'; blockId: string }
  | { kind: 'SESSION'; sessionId: string; replanning: boolean }
```

A `ClassReceiptContext` may be created only after the existing page logic has validated:

- `recorded` against a canonical block with current completed progress; or
- `session` against `currentTeachingSessions`; `replanning` is reduced to its current boolean presentation semantic.

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
  | { id: 'CLASS_SHOW_ALL'; label: string; sectionId: string; returnOrigin?: ClassReturnOrigin | null; receipt?: ClassReceiptContext | null }
```

`resolveRegisteredAction()` is the only href factory.

- `CLASS_RETURN_TO_ORIGIN` has no href/raw path; `HOME` resolves to `/`.
- `CLASS_SHOW_ALL` resolves the same Class route with `view=all`, optionally preserves `origin=home`, and optionally re-emits **only validated receipt data**:
  - `RECORDED_BLOCK` → `recorded=<validated blockId>`;
  - `SESSION` → `session=<validated current sessionId>` and, if `replanning`, a fixed presentation marker such as `replanning=1` (not the raw inbound value).
- `CLASS_SHOW_ALL` never accepts a generic query object/string.
- unknown receipt kinds/invalid block/session contexts fail before descriptor construction.
- no descriptor carries API/auth/technical/arbitrary/external destinations.
- `HOME_SHOW_ALL` resolves to `/?view=all#home-full-view`.

**Validator invariants:** canonical mode, registered surface/block/action, FOCUSED budgets, required narrowing metadata, non-mutating full-view action, no API/handler/external destination.

- [ ] RED registry tests for membership, fixed Home return, no raw href/query input, technical-route rejection and full-view URL preservation for: origin only, recorded receipt, session receipt, session+replanning, origin+each receipt.
- [ ] RED test that invalid/unvalidated receipt input cannot construct a `CLASS_SHOW_ALL` action.
- [ ] RED policy tests for mode/budget/narrowing/wrong-surface failures and deterministic valid fixtures.
- [ ] Verify RED.
- [ ] Implement smallest closed registry/policy.
- [ ] Run focused tests + typecheck + lint.
- [ ] Commit.

---

### Task 4: IUI-02C — Deterministic composition boundary and fallback

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-composer.ts`
- Create: `product/src/core/presentation/intelligent-ui-composer.test.ts`

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

Resolve descriptors, construct/validate composition, use explicit same-surface fallback on invalid input, never guess domain state.

- [ ] RED stability/order/unknown-action/budget/fallback tests.
- [ ] RED source-boundary test forbidding infrastructure/Supabase/server-action/provider imports.
- [ ] Implement pure composer/fallback.
- [ ] Run IUI core tests + typecheck.
- [ ] Commit.

---

### Task 5: IUI-03B — Home composition adapter

**Files:**
- Create: `product/src/app/home-intelligent-ui.ts`
- Create: `product/src/app/home-intelligent-ui.test.ts`
- Modify: `product/src/app/page.tsx`
- Modify styles only if existing affordance requires it.

`resolveHomeDailyContext()` and current priority ordering remain authority.

- current lesson→TEACH;
- pending registration→RECORD;
- upcoming→PREPARE;
- urgent planner→ACT_NOW;
- ambiguous timetable→safe REVIEW/GUIDED;
- no operational task→EXPLORE/REVIEW.

Routing preserves direct modeled lesson paths. Legitimate class targets use `returnOrigin: 'HOME'`. `HOME_SHOW_ALL` uses `/?view=all#home-full-view`, and validated `view=all` renders the existing disclosure open.

- [ ] RED Home adapter tests including HOME origin and direct-route preservation.
- [ ] Source-boundary RED: no repository/server action/arbitrary href output.
- [ ] Implement minimum adapter/view integration and stable `home-full-view` open behavior.
- [ ] Run Home/Human Task tests + typecheck + lint.
- [ ] Commit.

---

### Task 6: IUI-03C — Classe adapter and authoritative-state reconciliation

**Files:**
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.ts`
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.test.ts`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify existing Class state tests only for integration/source assertions.

The page keeps its existing receipt parsing/validation first:

- `recorded` is uppercased, resolved to a canonical block and accepted only when matching current completed progress;
- `session` is accepted only when it resolves to a current TeachingSession;
- `replanning` is used only with a valid session receipt and reduced to the existing boolean presentation state.

Only after those checks does the page construct optional `ClassReceiptContext` for composition. Raw receipt query values never enter registry descriptors.

**Query contract:** preserve existing `recorded`, `session`, `replanning`; extend additively with `mode`, `block`, `origin`, `view`.

**Continuity:** only `origin=home` → HOME; stale mode/block ignored; current Class state wins; HOME origin may add return action; full-view action preserves both HOME token and validated receipt context; no raw return URL.

**Action mapping:** modeled task→MODELED_LESSON; recorder→INLINE_RECORDER; completion→COMPLETION; planning→typed PLANNING; HOME origin→RETURN_TO_ORIGIN; broad view→SHOW_ALL with optional HOME + validated receipt context.

- [ ] RED every ClassTaskState/current-state precedence.
- [ ] RED API/auth/technical/external origin rejection.
- [ ] RED existing receipt validation behavior unchanged.
- [ ] RED full-view preservation for validated recorded receipt.
- [ ] RED full-view preservation for validated session receipt with/without replanning.
- [ ] RED origin + receipt → full view → receipt remains visible and Home return remains available.
- [ ] RED forged `recorded`, unknown `session`, or standalone raw `replanning` are not preserved as receipt context.
- [ ] Source assertions keep `resolveClassTaskDecision()` authority and no new write path.
- [ ] Implement pure adapter/page integration without changing server-action semantics.
- [ ] Run Class/continuity/receipt tests + typecheck + lint.
- [ ] Commit.

---

### Task 7: IUI-03D — Product CI inclusion and exact-head certification

**Files:**
- Modify: `product/package.json` — append all new tests; remove none.
- Create: `docs/superpowers/evidence/2026-10-08-iui-02-03-closeout.md`
- Modify existing browser/certification tests only as needed.

**Automated verification:** all IUI tests, continuity, Home/Class adapter + existing Class receipt/state tests, full `npm test`, typecheck, lint, build, Human Interaction, Design Policy, Browser, WCAG, no-implicit-write, HVA.

**Browser/Human Review scenarios:**

1. Current modeled lesson keeps direct route.
2. Pending registration opens Classe with HOME token; Class authority chooses state.
3. Ambiguous context guesses nothing.
4. Stale hints cannot override state.
5. Valid post-write `recorded` feedback remains visible after opening full view.
6. Valid current-session/replanning feedback remains visible after opening full view.
7. HOME origin survives opening Class full view and still offers fixed `/` return.
8. Forged/unknown receipt values are not propagated by full-view composition.
9. API/auth/technical/external origins create no return action or route-handler request.
10. Composition/rendering produces no mutation.

- [ ] Add every new test to canonical `product/package.json` suite.
- [ ] Run focused tests then full Product CI commands.
- [ ] Certify exact implementation SHA; inherit no earlier PASS.
- [ ] HVA includes full-view reveal, validated receipt preservation, HOME return and technical-origin rejection.
- [ ] Record exact baseline/head/run IDs with `MODEL_RUNTIME=DISABLED`, `IMPLICIT_WRITE=NONE`, `DOS-A1=RUNTIME_DEFERRED`.
- [ ] Defect → owning RED→GREEN task → new exact-head certification.
- [ ] Keep Draft until gates + Human Review pass.

## Definition of done

IUI-02/03 is complete only when:

- implementation starts from current governed `develop` in isolated branch/worktree;
- Task 1 typechecks independently;
- Home/Class use validated composition without replacing authority;
- direct modeled lesson journeys remain direct;
- return continuity uses only closed HOME token;
- no API/auth/technical/external path can become a return action;
- HOME origin survives full-view transition;
- validated Class receipts survive full-view transition while forged/unvalidated receipt query values do not;
- stale continuity cannot override Class state;
- broader-view actions actually reveal content;
- composition/rendering performs no writes;
- no runtime model/provider dependency exists;
- all tests are in canonical `npm test`;
- Product CI + required Browser/WCAG/HVA/no-implicit-write gates pass on exact implementation head;
- Human Review judges journey simpler/predictable;
- no automatic merge occurred.

## Explicitly deferred

Do not begin in this PR: IUI-04 Classe/Progetta/Conoscenza expansion; IUI-05 Piano annuale/Materiali/Documentazione composition; IUI-06 runtime model/provider adapter; IUI-07 broader adaptive rollout.
