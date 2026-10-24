# Contextual Copilot Safe FAB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flaky mobile Copilot trigger geometry with a reusable AUTO + manual-drag safe-positioning adapter that never covers protected content and can fall back to normal flow.

**Architecture:** Keep the Contextual Copilot domain/AI contract unchanged. Add a pure geometry resolver plus a client positioning hook owned by the presentation layer; persist only a semantic UI preference locally. Consumers register protected content explicitly through a generic presentation attribute, while the resolver receives rectangles only. Move closed-FAB positioning to one CSS owner and prove behavior with deterministic unit contracts plus real Playwright/HVA evidence.

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
- The pure resolver receives geometry only; vertical pages register protected regions through presentation metadata, not domain types.
- One CSS/module owner for closed-FAB geometry; contradictory `static`/`fixed` declarations are not allowed.
- Full HVA must finish without a flaky `Progetta → UDA` retry before Human Visual / Design PASS can be reconsidered.

## Review Focus

- Long-content scroll: stay still while valid, move only on collision, never jitter continuously. Task 4.
- Software keyboard / reduced visual viewport: leave the occluded area or dock. Tasks 1 and 4.
- Corrupt/old local preference: fail closed to AUTO without throwing or blocking the assistant. Task 1.
- Pointer cancel / tap-vs-drag ambiguity: tap opens; cancelled drag restores prior state and persists nothing. Tasks 2 and 4.
- No floating slot on a content-dense 320 px viewport: deterministic `DOCKED_SAFE`, not overlap. Tasks 1 and 4.

---

### Task 1: Pure safe-positioning and preference contract

**Files:**
- Create: `product/src/components/assistant/contextual-fab-positioning.ts`
- Create: `product/src/components/assistant/contextual-fab-positioning.test.ts`
- Modify: `product/package.json`

**Interfaces:**
- Produces: `ContextualFabPreference`, `FabRect`, `FabPlacement`, `resolveContextualFabPlacement(input)`, `snapContextualFabPreference(input)`, `parseContextualFabPreference(raw)`.
- Consumes: no React, DOM, application-domain or provider types.

- [ ] **Step 1: Write failing resolver tests**

Cover exactly: AUTO valid right-edge placement; manual preference by normalized ratio; left/right snap; collision temporary displacement without erasing preference; no slot → docked; bottom-nav/visual-viewport exclusion; dense 320×800 → docked; corrupt/version-mismatched persistence → AUTO.

- [ ] **Step 2: Run the new test and verify causal RED**

```bash
cd product
npx tsx --test src/components/assistant/contextual-fab-positioning.test.ts
```

Expected: FAIL because the positioning module does not exist.

- [ ] **Step 3: Implement the pure resolver**

Public contract:

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

Priority: geometry bounds → protected rects → manual preference → AUTO default. Keep the current placement when still valid.

- [ ] **Step 4: Verify GREEN and wire into full product tests**

```bash
npx tsx --test src/components/assistant/contextual-fab-positioning.test.ts
npm test
```

Expected: PASS; no unrelated test removed from `package.json`.

- [ ] **Step 5: Commit**

```bash
git add src/components/assistant/contextual-fab-positioning.ts src/components/assistant/contextual-fab-positioning.test.ts package.json
git commit -m "feat: add safe contextual FAB positioning contract"
```

### Task 2: Client hook, explicit protected regions, drag/snap and reset AUTO

**Files:**
- Create: `product/src/components/assistant/use-contextual-fab-position.ts`
- Create: `product/e2e/experience/contextual-copilot-fab.spec.mjs`
- Modify: `product/src/components/assistant/contextual-assistant-panel.tsx`
- Modify: `product/src/app/knowledge/[assetId]/page.tsx`

**Interfaces:**
- Consumes: Task 1 resolver and preference types.
- Produces: `useContextualFabPosition(options)` returning trigger ref/bindings, resolved placement state, pointer handlers and `resetToAuto()`.
- Protected-region convention: consumer elements opt in with `data-copilot-protected`; the hook converts their DOM rectangles to `FabRect[]` before calling the pure resolver.

- [ ] **Step 1: Write browser RED `manual drag snaps and persists semantic preference`**

Use `/planner` or another floating-capable governed surface. Require `data-fab-*`, drag to the opposite edge, reload, and assert restored manual side. Current baseline must fail because none of this contract exists.

- [ ] **Step 2: Certify RED is causal**

Accepted failures: missing `data-fab-*`, no drag movement/snap, or no restored preference. Stop on auth/fixture/infrastructure failure.

- [ ] **Step 3: Implement `useContextualFabPosition`**

Required behavior:

```text
safe pre-hydration state = docked
read DOCENTE_OS_CONTEXTUAL_FAB_PLACEMENT_V1 after mount
collect [data-copilot-protected] rects + bottom navigation + effective visual viewport
re-resolve on material resize/scroll through requestAnimationFrame
small movement threshold distinguishes tap from drag
pointercancel restores prior placement
pointerup snaps and persists only valid manual preference
resetToAuto clears manual preference and resolves AUTO
```

- [ ] **Step 4: Register the UDA reading/task surface explicitly**

On `product/src/app/knowledge/[assetId]/page.tsx`, mark the focused operational regions that must never be obscured with `data-copilot-protected`. Do not pass `Lesson`, UDA or asset objects into the resolver.

- [ ] **Step 5: Integrate the hook into `ContextualAssistantPanel`**

Expose:

```text
data-fab-mode="auto|manual"
data-fab-layout="floating|docked"
data-fab-ready="true|false"
data-fab-displaced="true|false"
```

Preserve the current accessible name and tap-to-open behavior. A drag must not open the assistant.

- [ ] **Step 6: Add keyboard-accessible `Ripristina posizione automatica`**

Expose it only when a manual preference exists, inside the expanded floating assistant. The expanded panel itself remains non-draggable.

- [ ] **Step 7: Run targeted Playwright and verify GREEN**

```bash
npx playwright test e2e/experience/contextual-copilot-fab.spec.mjs --config=playwright.experience.config.mjs --project=mobile-412x915
```

Expected: drag, snap, reload persistence and reset AUTO PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/assistant/use-contextual-fab-position.ts src/components/assistant/contextual-assistant-panel.tsx 'src/app/knowledge/[assetId]/page.tsx' e2e/experience/contextual-copilot-fab.spec.mjs
git commit -m "feat: add adaptive contextual Copilot FAB"
```

### Task 3: Give closed-FAB geometry one deterministic owner

**Files:**
- Modify: `product/src/app/assistant.css`
- Modify: `product/src/app/assistant-safe-area.css`
- Modify: `product/src/components/assistant/contextual-fab-positioning.test.ts`
- Verify only: `product/src/app/layout.tsx`

**Interfaces:**
- Consumes: `data-fab-layout` emitted by Task 2.
- Produces: one authoritative CSS path for closed-trigger geometry.

- [ ] **Step 1: Add a failing duplicate-ownership contract**

Read both stylesheets in the existing positioning test and prove the inherited baseline contains contradictory mobile `position: static` and `position: fixed` declarations for `.dosAssistantFloatingTrigger`.

- [ ] **Step 2: Run and verify RED**

```bash
npx tsx --test src/components/assistant/contextual-fab-positioning.test.ts
```

Expected: only the new ownership assertion fails.

- [ ] **Step 3: Consolidate geometry**

Keep appearance in `assistant.css`; make `assistant-safe-area.css` the only closed-trigger positioning owner. Key geometry by state:

```css
.dosAssistantFloatingTrigger[data-fab-layout='docked'] { position: static; }
.dosAssistantFloatingTrigger[data-fab-layout='floating'] { position: fixed; }
```

Remove unconditional conflicting mobile position rules. Preserve bottom-nav inset and ≥44 px target; reduced motion suppresses non-essential reposition transitions.

- [ ] **Step 4: Verify GREEN + typecheck**

```bash
npx tsx --test src/components/assistant/contextual-fab-positioning.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/app/assistant.css src/app/assistant-safe-area.css src/components/assistant/contextual-fab-positioning.test.ts
git commit -m "fix: give contextual FAB one geometry owner"
```

### Task 4: Browser no-overlap, viewport matrix, persistence and scroll stability

**Files:**
- Modify: `product/e2e/experience/contextual-copilot-fab.spec.mjs`
- Modify: `product/e2e/experience/critical-journeys.spec.mjs`

**Interfaces:**
- Consumes: `data-fab-*` contract from Task 2.
- Produces: HVA evidence for DPG-09 / DPG-18 and regression protection for the original UDA finding.

- [ ] **Step 1: Replace the obsolete `position === 'static'` rule**

`assertMobileAssistantDoesNotCoverTask` accepts either:

```text
floating AND no intersection with protected task/nav/effective viewport
OR
docked AND positioned after protected task with required spacing
```

It must test the user outcome, not a CSS primitive.

- [ ] **Step 2: Add first-render UDA regression**

At 412×915, open `Progetta → UDA`; wait for `data-fab-ready="true"`; assert no intersection before user movement. Capture screenshot.

- [ ] **Step 3: Complete manual drag + reload + reset coverage**

Verify semantic edge survives reload; reset AUTO removes it and remains AUTO after another reload.

- [ ] **Step 4: Add 320×800, 390×844 and 412×915 matrix**

At each viewport, assert either valid floating geometry or deterministic docked fallback. Dense protected geometry must dock rather than overlap.

- [ ] **Step 5: Add scroll stability**

Scroll a long UDA in several increments. If current placement remains valid, edge/layout stay stable. If collision forces displacement, `data-fab-displaced="true"` is allowed; overlap is never allowed.

- [ ] **Step 6: Add tap-vs-drag and pointer-cancel coverage**

Normal tap opens the assistant. Cancelled drag restores prior geometry and does not alter stored preference.

- [ ] **Step 7: Run focused browser tests until zero flaky**

```bash
npx playwright test e2e/experience/contextual-copilot-fab.spec.mjs e2e/experience/critical-journeys.spec.mjs --config=playwright.experience.config.mjs --project=mobile-412x915
```

Expected: PASS with zero flaky. Retry-pass is insufficient.

- [ ] **Step 8: Commit**

```bash
git add e2e/experience/contextual-copilot-fab.spec.mjs e2e/experience/critical-journeys.spec.mjs
git commit -m "test: qualify safe contextual Copilot FAB on mobile"
```

### Task 5: Exact-SHA qualification and Human Visual / Design closure

**Files:**
- No product file changes unless a new causal RED is found.

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: engineering qualification plus evidence for the human DPG decision.

- [ ] **Step 1: Freeze candidate SHA and inspect full diff**

Scope must remain FAB presentation/geometry/tests/docs. No AI policy, auth, domain, tenant or unrelated UX change.

- [ ] **Step 2: Require Product CI PASS on the exact candidate**

Typecheck, product tests, lint and build all PASS.

- [ ] **Step 3: Require full HVA PASS on the same SHA**

Require unchanged baseline pre/post fingerprint, browser/journeys/layout/mobileTargets PASS, `Progetta → UDA` first-attempt PASS, zero FAB-geometry flaky, and no new console/network findings.

- [ ] **Step 4: Perform Human Visual / Design Review**

Review 320×800, 390×844, 412×915 and desktop evidence. Promote only if DPG-09 and DPG-18 are PASS and no new blocker appears under DPG-05, DPG-07 or DPG-17.

- [ ] **Step 5: Stop at human merge decision**

Do not merge or deploy automatically. Record exact SHA, CI/HVA runs, visual decision and watch items in the PR.