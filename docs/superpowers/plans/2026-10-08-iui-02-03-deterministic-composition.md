# IUI-02/03 — Deterministic Intelligent UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the deterministic intelligent-composition core and qualify the first teacher journey, Home → Classe → prossima lezione, without introducing a runtime model dependency or changing domain authority.

**Architecture:** Reuse the canonical Human Task Model as the only intent/mode taxonomy. Add a small presentation-layer contract, closed action registry, closed Home→Classe continuity token, fail-closed policy validator and pure deterministic composer. Home and Classe remain adapters over already-authoritative state. Navigation actions own only typed application routes; broader-view actions are **local disclosure actions**, not URL reconstruction. Rendering stays application-owned. No generic page DSL, arbitrary JSX/HTML/CSS, arbitrary route pass-through, new persistence or new write path.

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
- **Return continuity is a closed UI-surface token, not a URL.** For this pilot the only allowed return origin is `HOME`; no arbitrary `returnTo` string is carried into a registered action.
- `/api/**`, authentication/handler routes, `/_next/**`, asset paths, technical routes, external URLs and all non-registered destinations are ineligible as Class return origins by construction.
- Existing Class receipt/query semantics (`recorded`, `session`, `replanning`) are preserved exactly by the existing page logic; IUI never parses, copies, serializes or re-emits those values through its action registry.
- Full-view access is a local, non-mutating UI action that opens an existing `<details>` disclosure. It does not navigate, reconstruct the current URL or introduce a `view` query parameter.
- Because full-view activation does not navigate, the current path/query stays untouched by construction: valid receipt feedback and `origin=home` continuity remain available without becoming IUI authority.
- No automatic merge. Exact-head certification and Human Review are required before integration.

## Review Focus

- The composition layer must not become a second domain model.
- Entry parameters are continuity hints only; authoritative current state always wins.
- FOCUSED mode exposes exactly one primary action and at most two peer support actions.
- Completed Class state may render a non-FOCUSED REVIEW composition without inventing a task.
- Full-view access must actually open and focus broader content, not merely point at a closed disclosure.
- Home → Classe origin continuity must be explicit, safe and UI-only.
- Existing Class feedback receipts must remain governed exclusively by the existing Class page/domain logic.
- No registered navigation action may accept arbitrary href input or point to a mutation/route-handler endpoint.
- Local disclosure actions cannot carry query strings, route params, receipt data or arbitrary DOM selectors.
- Existing Class recording/completion/receipt boundaries remain explicit and server-revalidated.
- Every new test must be included in the canonical `product/package.json` test command.

---

### Task 1: IUI-02A — Canonical composition contracts

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-contract.ts`
- Create: `product/src/core/presentation/intelligent-ui-contract.test.ts`
- Reuse without semantic change: `product/src/core/presentation/human-task-model.ts`

`RegisteredActionId` is defined in Task 1 so full typecheck succeeds before the Task 3 registry exists.

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

export type DisclosureActionId = 'HOME_SHOW_ALL' | 'CLASS_SHOW_ALL'
export type DisclosureTargetId = 'home-full-view' | 'class-full-view'

export type NavigationCompositionAction = {
  kind: 'NAVIGATE'
  id: Exclude<RegisteredActionId, DisclosureActionId>
  label: string
  href: string
}

export type DisclosureCompositionAction = {
  kind: 'OPEN_DISCLOSURE'
  id: DisclosureActionId
  label: string
  targetId: DisclosureTargetId
}

export type CompositionAction = NavigationCompositionAction | DisclosureCompositionAction

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
  fullViewAction: DisclosureCompositionAction
  source: 'DETERMINISTIC'
  fallbackReason?: string | null
}
```

- [ ] RED tests proving canonical Human Task type reuse, exact closed action-ID membership, discrimination of navigation vs disclosure actions, and absence of JSX/HTML/CSS/executable-code/query-payload fields from disclosure actions.
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

- `returnOrigin: 'HOME'` emits only `origin=home`, never a raw return URL.
- Only exact token `home` maps to `HOME`; every other origin becomes `null`.
- API/auth/`/_next`/arbitrary same-origin/external/encoded values never become a return origin.
- Only `prepare | teach | record` and canonical blocks `B01`…`B33` are accepted.
- Continuity hints never authorize or override Class state.
- Existing Knowledge continuity helpers keep their existing contract; this task does not broaden them.

- [ ] RED prepare/teach/record, encoding, invalid block, HOME origin, unknown/API/auth/technical/external origins and deterministic round-trip.
- [ ] Verify RED.
- [ ] Implement minimum closed-token helpers.
- [ ] Run continuity + Human Task tests to GREEN.
- [ ] Commit.

---

### Task 3: IUI-02B — Closed action registry and policy validator

**Files:**
- Create: `product/src/core/presentation/intelligent-ui-registry.ts`
- Create: `product/src/core/presentation/intelligent-ui-registry.test.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.ts`
- Create: `product/src/core/presentation/intelligent-ui-policy.test.ts`
- Reuse `RegisteredActionId` from Task 1 and Task 2 continuity types.

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
  | { id: 'CLASS_SHOW_ALL'; label: string }
```

`resolveRegisteredAction()` is the only action factory.

**Navigation ownership:**

- `HOME_OPEN_PLANNER`, `HOME_OPEN_TIMETABLE`, typed class/lesson/planning actions and `CLASS_RETURN_TO_ORIGIN` resolve only registered internal UI destinations.
- `CLASS_RETURN_TO_ORIGIN { origin: 'HOME' }` resolves exactly to `/`.
- No descriptor accepts arbitrary href/path/query input.
- No navigation descriptor can produce API/auth/technical/external destinations.

**Disclosure ownership:**

- `HOME_SHOW_ALL` resolves exactly to `{ kind: 'OPEN_DISCLOSURE', targetId: 'home-full-view' }`.
- `CLASS_SHOW_ALL` resolves exactly to `{ kind: 'OPEN_DISCLOSURE', targetId: 'class-full-view' }`.
- Disclosure descriptors accept no `sectionId`, `returnOrigin`, query object, receipt value, URL or arbitrary DOM target.
- The target IDs are closed constants owned by the registry.

**Validator invariants:** canonical mode, registered surface/block/action, FOCUSED budgets, required narrowing metadata, same-surface disclosure full-view action, no mutation/API/handler/external destination.

- [ ] RED exact action-set parity with `RegisteredActionId`.
- [ ] RED navigation tests for typed routes, fixed Home return and API/auth/technical/external rejection.
- [ ] RED disclosure tests proving exact target IDs and that TypeScript/runtime descriptor validation rejects any extra URL/query/receipt/arbitrary-target payload.
- [ ] RED policy tests for mode/budget/narrowing/wrong-surface failures and valid deterministic fixtures.
- [ ] Verify RED.
- [ ] Implement smallest closed registry/policy.
- [ ] Run focused tests + typecheck + lint to GREEN.
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
  fullViewAction: Extract<RegisteredActionDescriptor, { id: 'HOME_SHOW_ALL' | 'CLASS_SHOW_ALL' }>
  fallback: () => ValidDeterministicFallback
}): SurfaceComposition
```

Resolve descriptors, construct/validate composition, use explicit same-surface fallback on invalid input, never guess domain state.

- [ ] RED stability/order/unknown-action/budget/fallback tests.
- [ ] RED test proving `fullViewAction` resolves to a same-surface local disclosure action, never navigation.
- [ ] RED source-boundary test forbidding infrastructure/Supabase/server-action/provider imports.
- [ ] Implement pure composer/fallback.
- [ ] Run IUI core tests + typecheck.
- [ ] Commit.

---

### Task 5: IUI-03B — Home composition adapter + disclosure activation

**Files:**
- Create: `product/src/app/home-intelligent-ui.ts`
- Create: `product/src/app/home-intelligent-ui.test.ts`
- Create or reuse a minimal application-owned disclosure activator component for the two closed full-view action IDs.
- Modify: `product/src/app/page.tsx`
- Modify styles only if existing affordance/focus visibility requires it.

`resolveHomeDailyContext()` and current priority ordering remain authority.

- current lesson → `TEACH`;
- pending registration → `RECORD`;
- upcoming → `PREPARE`;
- urgent planner → `ACT_NOW`;
- ambiguous timetable → safe `REVIEW`/GUIDED;
- no operational task → `EXPLORE`/`REVIEW`.

Routing preserves direct modeled lesson paths. Legitimate class targets use `returnOrigin: 'HOME'`.

`HOME_SHOW_ALL` is rendered as a control that:

1. resolves only the closed `home-full-view` target;
2. sets the existing `<details id="home-full-view">` to `open=true`;
3. moves focus to its `<summary>` or first stable focus target using the repository’s accessibility conventions;
4. performs no navigation, server action or write.

- [ ] RED Home adapter tests including HOME origin and direct-route preservation.
- [ ] RED disclosure-activator tests proving the Home target opens and receives focus while `window.location.pathname/search` remain unchanged.
- [ ] Source-boundary RED: no repository/server action/arbitrary href output.
- [ ] Implement minimum adapter/view integration and stable `home-full-view` target.
- [ ] Run Home/Human Task/disclosure tests + typecheck + lint.
- [ ] Commit.

---

### Task 6: IUI-03C — Classe adapter and authoritative-state reconciliation

**Files:**
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.ts`
- Create: `product/src/app/classi/[sectionId]/class-intelligent-ui.test.ts`
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify existing Class state/receipt tests only for integration assertions.
- Reuse the closed disclosure activator from Task 5; do not create a second generic mechanism.

**Existing receipt contract remains authoritative and unchanged:**

- `recorded` is interpreted only by the existing Class page logic and accepted only when it resolves to the current canonical completed block according to the existing rules;
- `session` is interpreted only by the existing Class page logic and accepted only when it resolves to a current TeachingSession;
- `replanning` keeps its existing receipt/presentation semantics;
- IUI code does not re-parse, validate, type-brand, copy or serialize these values.

**IUI query contract is additive:** only `mode`, `block` and `origin` are added as continuity hints. No `view` parameter is introduced. Existing receipt parameters remain owned by their current code paths.

**Continuity reconciliation:**

- only `origin=home` maps to `returnOrigin='HOME'`;
- stale/mismatched mode/block is ignored and current Class state wins;
- valid HOME origin may add secondary `CLASS_RETURN_TO_ORIGIN`;
- unknown origin creates no return action;
- there is no raw return URL;
- continuity never changes occurrence selection, completion proposal, TeachingSession recording or annual-plan state.

**Full-view behavior:**

`CLASS_SHOW_ALL` is a local disclosure action. The application renderer:

1. opens only `<details id="class-full-view">`;
2. focuses the stable summary/target;
3. leaves `window.location.pathname` and `window.location.search` unchanged;
4. therefore preserves the already-existing receipt query and `origin=home` automatically, without reading or forwarding either one through the registry.

**Action mapping:** modeled task → MODELED_LESSON; recorder → INLINE_RECORDER; completion → COMPLETION; planning → typed PLANNING; HOME origin → RETURN_TO_ORIGIN; broad view → local SHOW_ALL.

- [ ] RED every ClassTaskState/current-state precedence.
- [ ] RED API/auth/technical/external origin rejection.
- [ ] RED existing `recorded/session/replanning` behavior unchanged with and without IUI continuity params.
- [ ] RED full-view activation on a URL containing a valid recorded receipt: disclosure opens, feedback remains visible, `location.search` is byte-for-byte unchanged.
- [ ] RED equivalent current-session/replanning case.
- [ ] RED `origin=home` + receipt case: disclosure opens, query remains unchanged, and `CLASS_RETURN_TO_ORIGIN` still resolves to `/`.
- [ ] RED forged/unknown receipts continue to be handled only by the pre-existing Class receipt rules; full-view action neither legitimizes nor propagates them.
- [ ] Source assertions keep `resolveClassTaskDecision()` authority and no new write path.
- [ ] Implement pure adapter/page integration without changing server-action semantics.
- [ ] Run Class/continuity/receipt/disclosure tests + typecheck + lint.
- [ ] Commit.

---

### Task 7: IUI-03D — Product CI inclusion and exact-head certification

**Files:**
- Modify: `product/package.json` — append all new tests; remove none.
- Create: `docs/superpowers/evidence/2026-10-08-iui-02-03-closeout.md`
- Modify existing browser/certification tests only as needed.

**Automated verification:** all IUI contract/continuity/registry/policy/composer tests, disclosure activator tests, Home/Class adapter + existing Class receipt/state tests, full `npm test`, typecheck, lint, build, Human Interaction, Design Policy, Browser, WCAG, no-implicit-write, HVA.

**Browser/Human Review scenarios:**

1. Current modeled lesson keeps direct Home → lesson route.
2. Pending registration opens Classe with closed HOME token; Class authority chooses state.
3. Upcoming modeled lesson remains direct/minimal.
4. Ambiguous context guesses no class/lesson.
5. Stale mode/block hints cannot override Class state.
6. PREPARE/TEACH/RECORD/AFTER_RECORD/COMPLETE stay within action budgets.
7. Home full-view control actually opens and focuses broader content without changing path/query.
8. Class full-view control actually opens and focuses broader content without changing path/query.
9. Existing `recorded` feedback remains visible after full-view activation and the exact query is unchanged.
10. Existing current-session/replanning feedback remains visible after full-view activation and the exact query is unchanged.
11. `origin=home` remains present because no navigation occurs; secondary return still resolves exactly to `/`.
12. API/auth/technical/external origin input creates no return action and triggers no route-handler request.
13. Composition/disclosure rendering produces no database mutation or annual-plan advancement.

- [ ] Add every new test to canonical `product/package.json` suite without dropping existing tests.
- [ ] Run focused tests then full Product CI commands.
- [ ] Certify the exact implementation SHA; inherit no PASS from the pre-remediation #697 head.
- [ ] HVA covers actual disclosure reveal/focus, unchanged query/receipts, fixed Home return, mobile/desktop keyboard flow and no horizontal overflow.
- [ ] Record exact governed `develop` baseline/head/run IDs with `MODEL_RUNTIME=DISABLED`, `IMPLICIT_WRITE=NONE`, `DOS-A1=RUNTIME_DEFERRED`.
- [ ] Defect → owning RED→GREEN task → new exact-head certification.
- [ ] Keep Draft until automated gates + Human Review pass. No automatic merge.

## Definition of done

IUI-02/03 is complete only when:

- implementation began from recorded current governed `develop` in a dedicated isolated branch/worktree;
- Task 1 contract typechecks before Task 3 exists;
- deterministic contract/continuity/registry/policy/composer layers are independently tested;
- Home and Classe consume validated composition without duplicating domain authority;
- direct modeled Home → lesson journeys are not lengthened;
- Home → Classe continuity uses the closed `HOME` origin token, never arbitrary `returnTo`;
- no API/auth/technical/external path can become `CLASS_RETURN_TO_ORIGIN`;
- broader-view actions are local closed disclosure actions carrying no URL/query/receipt payload;
- broader-view activation actually opens/focuses the intended disclosure;
- Class full-view activation leaves existing receipt and origin query state untouched by construction;
- existing `recorded` / `session` / `replanning` receipt flows remain operational and unchanged in authority;
- stale continuity cannot override current Class state;
- FOCUSED budgets and broader-view escape paths are enforced;
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
