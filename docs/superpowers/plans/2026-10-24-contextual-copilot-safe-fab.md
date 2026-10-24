# Contextual Copilot Safe FAB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flaky mobile Copilot trigger geometry with a reusable AUTO + manual-drag safe-positioning adapter that never covers protected content and can fall back to normal flow.

**Architecture:** Keep the Contextual Copilot domain/AI contract unchanged. Add a pure geometry resolver plus a client positioning hook owned by the presentation layer; persist only a semantic UI preference locally. Move closed-FAB positioning to one CSS owner, then prove behavior with deterministic unit contracts and real Playwright/HVA evidence.

**Tech Stack:** TypeScript 5.9, React 19, Next.js 16.3, Pointer Events, `visualViewport` when available, localStorage UI preference, Node/tsx tests, Playwright HVA. No new dependency.

**Spec:** `docs/superpowers/specs/2026-10-24-contextual-copilot-safe-fab-design.md`

## Global Constraints

- Base for the follow-up work is exact `845a62e8f01be22e7f9689df7a24ecd494582bd6`; PR #745 itself remains frozen.
- No Supabase/tenant mutation for FAB position.
- No student, lesson, workspace, prompt or conversation data in local persistence.
- No change to AI authority, capability or write policy.
- Closed trigger target remains at least 44×44 px.
- No new package dependency.
- Manual preference is semantic (`edge` + normalized `yRatio`), never absolute persisted pixels.
- Safety outranks manual preference; lack of safe floating placement means `DOCKED_SAFE`.
- One CSS/module owner for closed-FAB geometry; contradictory `static`/`fixed` declarations are not allowed.
- Full HVA must finish without a flaky `Progetta → UDA` retry before Human Visual / Design PASS can be reconsidered.

## Review Focus

- Scroll through long content: the FAB must stay where valid, move only on collision, and never jitter continuously. Covered in Task 4 browser tests.
- Software keyboard / reduced visual viewport: the FAB must leave the occluded area or dock. Covered in Task 1 resolver tests and Task 4 browser geometry checks where supported.
- Corrupt/old local preference: fail closed to AUTO without throwing or blocking the assistant. Covered in Task 1 persistence tests.
- Pointer cancel / tap-vs-drag ambiguity: a tap opens the assistant; cancelled drag restores prior placement and does not persist garbage. Covered in Task 2 integration behavior and Task 4 browser tests.
- No floating slot on a content-dense 320 px viewport: deterministic `DOCKED_SAFE`, not overlap. Covered in Task 1 and Task 4.

---

### Task 1: Pure safe-positioning and preference contract

**Files:**
- Create: `product/src/components/assistant/contextual-fab-positioning.ts`
- Create: `product/src/components/assistant/contextual-fab-positioning.test.ts`
- Modify: `product/package.json` test script to include the new test file

**Interfaces:**
- Produces: `ContextualFabPreference`, `FabRect`, `FabPlacement`, `resolveContextualFabPlacement(input)`, `snapContextualFabPreference(input)`, `parseContextualFabPreference(raw)`.
- Consumes: no React, DOM, application-domain or provider types.

- [ ] **Step 1: Write the failing resolver tests**

Cover exact cases:

```text
AUTO returns a valid right-edge floating placement when one exists
manual right preference resolves near its normalized yRatio
manual drag near left snaps to left
collision selects nearest valid safe slot without deleting preference
no safe slot returns { layout: 'docked' }
bottom-nav and visual-viewport occlusion are excluded
320×800 dense protected region docks safely
corrupt/version-mismatched persisted JSON parses as AUTO
```

- [ ] **Step 2: Run only the new test and verify RED**

Run from `product/`:

```bash
npx tsx --test src/components/assistant/contextual-fab-positioning.test.ts
```

Expected: FAIL because the positioning module does not yet exist.

- [ ] **Step 3: Implement the pure resolver**

Use these public types/signatures:

```ts
export type ContextualFabPreference =
  | { version: 1; mode: 'auto' }
  | { version: 1; mode: 'manual'; edge: 'left' | 'right'; yRatio: number }

export type FabRect = { left: number; top: number; right: number; bottom: number }

export type FabPlacement =
  | { layout: 'floating'; left: number; top: number; edge: 'left' | 'right'; displaced: boolean }
  | { layout: 'docked'; displaced: boolean }

export function resolveContextualFabPlacement(input: ResolveContextualFabPlacementInput): FabPlacement
export function snapContextualFabPreference(input: SnapContextualFabPreferenceInput): ContextualFabPreference
export function parseContextualFabPreference(raw: string | null): ContextualFabPreference
```

Resolver priority is exact: geometry bounds → protected rects → manual preference → AUTO default. Keep the current placement when still valid to avoid jitter.

- [ ] **Step 4: Run the new test and verify GREEN**

Run the same command. Expected: all new resolver tests PASS.

- [ ] **Step 5: Add the test to `npm test` and run the full product test command**

Run:

```bash
npm test
```

Expected: PASS with the new test included; no unrelated test removed.

- [ ] **Step 6: Commit**

```bash
git add src/components/assistant/contextual-fab-positioning.ts src/components/assistant/contextual-fab-positioning.test.ts package.json
git commit -m "feat: add safe contextual FAB positioning contract"
```

### Task 2: Client hook, local preference, drag/snap and reset AUTO

**Files:**
- Create: `product/src/components/assistant/use-contextual-fab-position.ts`
- Modify: `product/src/components/assistant/contextual-assistant-panel.tsx`

**Interfaces:**
- Consumes: Task 1 resolver and preference types.
- Produces: `useContextualFabPosition(options)` returning trigger ref/bindings, resolved placement state, pointer handlers, and `resetToAuto()`.

- [ ] **Step 1: Write a behavioral RED in Playwright before implementing the hook**

In Task 4's new spec file, first add only the test `manual drag snaps and persists semantic preference`, targeting the current branch. It must fail because the current trigger has no drag state/data attributes or persistence.

- [ ] **Step 2: Run that one Playwright test and certify the failure is causal**

Expected failure must be one of: missing `data-fab-*` contract, drag does not move/snap, or preference is absent after reload. Do not proceed on auth/fixture/infrastructure failure.

- [ ] **Step 3: Implement `useContextualFabPosition`**

Required behavior:

```text
safe SSR/pre-hydration state = docked
read DOCENTE_OS_CONTEXTUAL_FAB_PLACEMENT_V1 after mount
measure trigger + registered protected regions
use visualViewport when available
re-resolve on material resize/scroll via requestAnimationFrame
pointer movement threshold distinguishes tap from drag
pointercancel restores prior state
pointerup snaps and persists only a valid manual preference
resetToAuto removes manual preference and re-resolves AUTO
```

Do not store domain identifiers or send data remotely.

- [ ] **Step 4: Integrate the hook into the closed floating branch of `ContextualAssistantPanel`**

Expose:

```text
data-fab-mode="auto|manual"
data-fab-layout="floating|docked"
data-fab-ready="true|false"
data-fab-displaced="true|false"
```

Preserve the existing accessible name and normal click-to-open behavior. A drag must not open the assistant.

- [ ] **Step 5: Add keyboard-accessible `Ripristina posizione automatica` when a manual preference exists**

Place the control inside the expanded floating assistant surface; do not make the expanded panel draggable.

- [ ] **Step 6: Re-run the targeted Playwright test**

Expected: manual drag snaps, reload restores the semantic side/ratio, and reset returns to AUTO.

- [ ] **Step 7: Commit**

```bash
git add src/components/assistant/use-contextual-fab-position.ts src/components/assistant/contextual-assistant-panel.tsx e2e/experience/contextual-copilot-fab.spec.mjs
git commit -m "feat: add adaptive contextual Copilot FAB"
```

### Task 3: Make geometry ownership single and deterministic

**Files:**
- Modify: `product/src/app/assistant.css`
- Modify: `product/src/app/assistant-safe-area.css`
- Verify only: `product/src/app/layout.tsx`

**Interfaces:**
- Consumes: `data-fab-layout` and inline/CSS variables emitted by Task 2.
- Produces: one authoritative CSS path for closed-trigger geometry.

- [ ] **Step 1: Add a RED contract for duplicate geometry ownership**

Extend `product/src/components/assistant/contextual-fab-positioning.test.ts` with a source/CSS contract that reads both stylesheets and fails while the same mobile trigger state contains contradictory `position: static` and `position: fixed` declarations.

- [ ] **Step 2: Run the contract and verify RED on the inherited baseline**

Expected: FAIL showing both current declarations are present.

- [ ] **Step 3: Consolidate geometry**

Keep visual styling in `assistant.css`. Make `assistant-safe-area.css` the only mobile closed-trigger geometry owner, keyed by deterministic layout state:

```css
[data-fab-layout='docked'] { position: static; ... }
[data-fab-layout='floating'] { position: fixed; ... }
```

Remove unconditional conflicting mobile `position` declarations. Preserve the bottom-nav safe inset and 44 px minimum target. Use `prefers-reduced-motion` for reposition transitions.

- [ ] **Step 4: Run resolver/CSS contract tests and typecheck**

```bash
npx tsx --test src/components/assistant/contextual-fab-positioning.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/assistant.css src/app/assistant-safe-area.css src/components/assistant/contextual-fab-positioning.test.ts
git commit -m "fix: give contextual FAB one geometry owner"
```

### Task 4: Browser contract for no-overlap, drag, persistence and fallback

**Files:**
- Create: `product/e2e/experience/contextual-copilot-fab.spec.mjs`
- Modify: `product/e2e/experience/critical-journeys.spec.mjs`

**Interfaces:**
- Consumes: `data-fab-*` attributes from Task 2.
- Produces: HVA evidence for DPG-09 / DPG-18 and regression protection for the original UDA finding.

- [ ] **Step 1: Replace the obsolete `position === 'static'` acceptance rule**

`assertMobileAssistantDoesNotCoverTask` must now accept either:

```text
floating AND no intersection with protected task/nav/viewport
OR
docked AND positioned after the protected task with required spacing
```

It must no longer require a specific CSS positioning primitive.

- [ ] **Step 2: Add deterministic first-render UDA test**

At 412×915, open `Progetta → UDA`; wait for `data-fab-ready="true"`; assert no intersection before any retry or user movement. Capture screenshot evidence.

- [ ] **Step 3: Add manual drag + reload + reset test**

Drag the closed trigger across to the opposite safe edge, release, verify snapped mode, reload, verify semantic preference restored, open assistant, choose `Ripristina posizione automatica`, close/reload and verify AUTO.

- [ ] **Step 4: Add viewport matrix and dense fallback**

Exercise 320×800, 390×844 and 412×915. On a deliberately dense/protected geometry, expect `data-fab-layout="docked"`, never overlap.

- [ ] **Step 5: Add scroll stability assertion**

Scroll the UDA in multiple increments. If placement remains valid, its state/edge must remain stable. If collision forces displacement, `data-fab-displaced="true"` is allowed but no overlap is allowed at any sampled point.

- [ ] **Step 6: Run focused browser tests until zero flaky**

Run:

```bash
npx playwright test e2e/experience/contextual-copilot-fab.spec.mjs e2e/experience/critical-journeys.spec.mjs --config=playwright.experience.config.mjs --project=mobile-412x915
```

Expected: PASS with zero flaky tests. A retry-pass is not sufficient.

- [ ] **Step 7: Commit**

```bash
git add e2e/experience/contextual-copilot-fab.spec.mjs e2e/experience/critical-journeys.spec.mjs
git commit -m "test: qualify safe contextual Copilot FAB on mobile"
```

### Task 5: Exact-SHA qualification and Human Visual / Design closure

**Files:**
- No product file changes unless a new causal RED is found.
- Evidence comes from Product CI and Human + Visual Acceptance on one exact SHA.

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: engineering qualification plus evidence for the human DPG decision.

- [ ] **Step 1: Freeze the candidate SHA and inspect the full diff**

Confirm scope is limited to FAB presentation/geometry/tests/docs. No AI policy, auth, domain, tenant or unrelated UX change.

- [ ] **Step 2: Require Product CI PASS on the exact candidate**

Typecheck, product tests, lint and build must all pass.

- [ ] **Step 3: Require full HVA PASS on the same exact candidate**

Requirements:

```text
baseline pre/post fingerprint unchanged
browser/journeys/layout/mobileTargets PASS
Progetta → UDA mobile passes first attempt
zero flaky tests attributable to FAB geometry
no new console/network findings
```

- [ ] **Step 4: Perform Human Visual / Design Review**

Review screenshots/video at minimum for 320×800, 390×844, 412×915 and desktop. Promote only if DPG-09 and DPG-18 are PASS and no new blocker appears under DPG-05, DPG-07 or DPG-17.

- [ ] **Step 5: Stop at human merge decision**

Do not merge or deploy automatically. Record exact SHA, CI/HVA runs, visual decision and any watch items in the PR.