# Docente OS — Contextual Copilot Safe FAB Design

**Date:** 2026-10-24  
**Status:** HUMAN-APPROVED DESIGN  
**Base:** `845a62e8f01be22e7f9689df7a24ecd494582bd6`  
**Parent TRAMA contract:** `trama-ecosistema/docs/superpowers/specs/2026-10-24-trama-contextual-copilot-fab-safe-positioning-design.md`  
**Triggering evidence:** HVA #1026 / run `40070079087` · `Progetta → UDA` mobile first attempt flaky because the closed Copilot trigger could be `position: fixed` over operational text.

## Intent

Close the Human Visual / Design REWORK without weakening the reusable Contextual Copilot architecture. The closed Copilot FAB becomes adaptive: automatic by default, manually draggable, snapped to safe zones, locally remembered, and always subordinate to layout safety.

## Current root cause to remove

At the base SHA, mobile geometry has two competing owners:

- `product/src/app/assistant.css` makes `.dosAssistantFloatingTrigger` `position: static` inside the mobile media query;
- `product/src/app/assistant-safe-area.css`, imported afterwards by `layout.tsx`, makes the same trigger `position: fixed`.

The HVA first attempt observed `fixed`; retry observed the acceptable state. A qualified solution cannot depend on stylesheet ordering, CSS chunk timing, hydration timing, or Playwright retry.

## Approved behavior

### Closed trigger

- Initial safe fallback before client geometry is ready: `DOCKED_SAFE` in normal flow.
- After hydration, AUTO may promote the trigger to floating only if a valid safe placement exists.
- Manual pointer/touch drag records a semantic preference: nearest edge + normalized vertical ratio.
- Release always snaps; no arbitrary pixel persistence.
- If the preferred placement collides with protected content, navigation, keyboard, or another reserved region, the FAB moves temporarily to the nearest valid safe slot.
- If no floating slot is valid, it returns to `DOCKED_SAFE`.
- Manual preference is not erased by temporary displacement.
- The user can select `Ripristina posizione automatica`.

### Expanded assistant

The expanded panel is not made draggable in this increment. Existing governed assistant behavior and write boundaries remain unchanged. A minimal reset-position control may be exposed in the expanded panel because it is keyboard-accessible and already belongs to the Copilot surface.

## Persistence

Use local UI-only persistence. No Supabase/tenant write.

Preferred stored shape:

```ts
export type ContextualFabPreference =
  | { version: 1; mode: 'auto' }
  | { version: 1; mode: 'manual'; edge: 'left' | 'right'; yRatio: number }
```

Suggested Docente OS key:

```text
DOCENTE_OS_CONTEXTUAL_FAB_PLACEMENT_V1
```

The payload must contain no workspace, class, lesson, student, prompt, conversation, or analytics data.

## Geometry ownership

One module owns positioning. `assistant.css` retains visual appearance; positioning declarations for the closed FAB move to the safe-positioning layer. No selector may simultaneously declare contradictory `static` and `fixed` states for the same layout mode.

The rendered trigger exposes deterministic state for tests and debugging:

```text
data-fab-mode="auto|manual"
data-fab-layout="floating|docked"
data-fab-ready="true|false"
data-fab-displaced="true|false"
```

These attributes expose UI geometry state only, not domain state.

## Protected regions

The positioning adapter works with rectangles, not domain selectors. Docente OS may collect geometry for:

- bottom navigation;
- sticky action bars;
- the current operational reading/task region;
- any open persistent panel;
- the effective visual viewport when software keyboard reduces usable height.

For the initial UDA closure, the document/task region used by the existing HVA journey must be protected. If floating cannot coexist safely with it, the correct answer is docked mode, not overlap.

## Recalculation

Re-resolve geometry on material layout changes:

- resize/orientation;
- `visualViewport` resize/scroll when available;
- scroll, throttled through `requestAnimationFrame`;
- protected-region resize;
- assistant expanded/closed transition where relevant.

If the current placement remains valid, keep it to prevent jitter.

## Drag semantics

- Drag starts only after a small movement threshold so a normal tap still opens the assistant.
- During drag, clamp to usable viewport.
- On release, snap to nearest left/right safe edge and compute `yRatio`.
- Persist only after a valid snapped preference is resolved.
- `pointercancel` restores the prior placement.

## Accessibility

- Trigger remains a standard button with at least 44×44 px target.
- Opening the Copilot never requires drag.
- AUTO mode alone must guarantee a usable interface for keyboard/non-pointer users.
- Reset AUTO is keyboard-accessible.
- Focus ring and accessible name remain intact.
- Reduced-motion preference suppresses non-essential movement animation.

## Approaches considered

### 1. Return to static-only mobile trigger

Safe for the immediate HVA case but discards the user's requested movable FAB and does not create a reusable positioning contract. Rejected.

### 2. Free drag with absolute persisted coordinates

Simple to implement but fragile across rotation, viewport size, keyboard and different consumers. Rejected.

### 3. AUTO + semantic manual preference + safe resolver + docked fallback

Chosen. It preserves the FAB affordance, gives the teacher manual control, remains portable across applications, and never lets preference outrank readability.

## Acceptance criteria

The implementation is acceptable only when all are true on one exact SHA:

1. the original UDA mobile scenario passes on first attempt without retry dependency;
2. no closed FAB intersects protected operational content or bottom navigation;
3. manual drag snaps and survives reload through local UI-only preference;
4. resize/rotation/keyboard can temporarily displace without erasing preference;
5. no safe floating slot produces deterministic docked mode;
6. reset AUTO clears the manual preference;
7. 320×800, 390×844 and 412×915 remain usable;
8. desktop behavior does not regress;
9. Product CI and full HVA pass;
10. Human Visual / Design Review promotes DPG-09 and DPG-18 from REWORK to PASS without new DPG-05/07/17 findings.

## Non-goals

No new AI capability, no autonomous action, no policy changes, no tenant persistence, no telemetry, no cross-device sync, no draggable expanded panel, no redesign of UDA or other product surfaces.