# Docente OS — HVA 2.0 + Android Reality Gate Design

**Date:** 2026-10-24  
**Status:** PROPOSED — HUMAN APPROVAL REQUIRED BEFORE IMPLEMENTATION  
**Baseline:** `aa83f86163bba14001e3dee83b977dcfa6414a22`  
**Triggering evidence:** Human Visual / Design Review of PR #747 on a real Android device established that the Contextual Copilot FAB could not be dragged and could overlap the delayed `Lezione di riferimento / Apri materiali` bar even though automated HVA was GREEN.

## Intent

Replace screenshot-by-screenshot manual UX discovery with a governed, repeatable, zero-cost-first verification system that exercises Docente OS as a teacher would actually use it on mobile.

The system has two complementary layers:

1. **HVA 2.0** — fast Playwright browser qualification on every relevant PR, strengthened to test dynamic layout changes, touch semantics, keyboard/viewport behavior, protected regions, scrolling and visual evidence generation.
2. **Android Reality Gate (ARG)** — an Android Emulator + Chrome Android gate in GitHub Actions that drives the actual mobile browser through ADB/Playwright Android support and verifies real touch-oriented behavior on the same exact candidate SHA.

The teacher must no longer be expected to capture and send screenshots as the normal qualification mechanism. Human review remains authoritative for product judgment, but automatic evidence collection does the repetitive exploration.

## Problem established by PR #747

The existing HVA mobile project sets `isMobile: true` and `hasTouch: true`, but the FAB drag test drives the gesture with `page.mouse`. This proved the geometry contract under a mobile viewport, not the real touch interaction path used on Android.

The current positioning adapter also observes the protected regions that exist when its effect runs. A protected region that mounts later can become visible without necessarily being added to the active `ResizeObserver` set. The real-device review exposed exactly that class of failure when the reference/material bar appeared after initial render and the FAB overlapped its primary action.

Therefore automated qualification must cover both:

- **input reality** — touch/pointer behavior on Android Chrome;
- **layout reality** — elements that appear, disappear, resize or become sticky after hydration, data arrival or user interaction.

## Goals

- Detect mobile interaction failures without requiring the teacher to reproduce them manually.
- Detect overlap, clipping, hidden actions, inaccessible content and sticky/fixed-region conflicts after delayed DOM changes.
- Bind all evidence to the exact candidate SHA.
- Produce inspectable screenshots, video/trace, geometry snapshots and a machine-readable receipt on failure.
- Keep the existing HVA gate fast enough for routine PR qualification.
- Add Android Chrome reality coverage for changes that affect mobile presentation or interaction.
- Preserve the governed AAL2 test identity and existing baseline-integrity contract.
- Stay within public-repository GitHub Actions standard runners and free/open tooling.
- Keep final PASS / REWORK / REJECT product authority human.

## Non-goals

- No commercial device-farm dependency.
- No telemetry or production session recording.
- No recording of real teachers or student data.
- No autonomous product decision.
- No weakening of current HVA, WCAG, baseline integrity, MFA or persistence safeguards.
- No requirement to run a full Android matrix on every documentation-only change.
- No replacement of occasional real-device human review for high-risk releases.

## Approaches considered

### A. Strengthen Playwright HVA only

Add touch-aware flows, DOM mutation detection, overlap scanning, visual viewport/keyboard scenarios and richer artifacts to the existing Chromium HVA.

**Advantages:** fastest, simplest, cheapest per run.  
**Limit:** still runs desktop Chromium with mobile emulation and cannot prove Android Chrome behavior.

### B. HVA 2.0 + Android Reality Gate

Keep A for rapid qualification and add a second gate using an Android Emulator with Chrome Android, ADB and Playwright Android automation.

**Advantages:** exercises a materially more realistic mobile stack, catches touch/browser/runtime issues, still uses public-repository GitHub-hosted infrastructure and open tooling.  
**Tradeoff:** slower and more operationally complex than normal HVA.

**Chosen approach.**

### C. Record real-device teacher sessions

Add a special review mode to capture interaction and geometry from a physical device.

**Advantages:** highest behavioral realism.  
**Rejected for the first implementation:** raises privacy, consent, persistence and support complexity and still places work on the teacher. It remains a possible later residual-validation tool, not the primary gate.

## Cost and infrastructure boundary

The repository is public. Standard GitHub-hosted runners for public repositories are free and unlimited under GitHub's current hosted-runner policy. Current GitHub-hosted Linux runners expose Android SDK hardware acceleration; KVM permissions must be enabled in the workflow.

The initial gate therefore uses:

- `ubuntu-latest` standard GitHub-hosted runner;
- KVM enablement;
- `reactivecircus/android-emulator-runner@v2` (current v2 line; pinning strategy defined in implementation plan);
- Android API level chosen from a stable Google APIs x86_64 system image compatible with Chrome automation;
- Node 22, matching Docente OS;
- Playwright Android API (`_android`) over ADB;
- existing governed HVA credentials and local/preview target.

No paid larger runner is a design requirement. If the standard runner cannot meet reliability limits, the gate fails closed as `INFRA_BLOCKED`; it must not silently downgrade to browser emulation and claim Android qualification.

## Gate topology

### Gate 1 — HVA 2.0 / `hva/application`

Runs on every relevant PR as today, but gains the following capabilities:

- route/journey exploration for Oggi, Orario, Classi and Altro;
- mobile touch-semantic tests that do not use `page.mouse` as proof of touch behavior;
- delayed-region mutation scenarios;
- generic protected-region overlap scanner;
- sticky header/footer obstruction checks during scroll;
- `visualViewport` resize tests for software-keyboard-like geometry changes;
- screenshots at governed checkpoints, not only on failure for high-risk UI journeys;
- retained video/trace on failure;
- machine-readable geometry evidence.

This remains the fast gate and catches deterministic product errors before Android boot cost is incurred.

### Gate 2 — Android Reality Gate / `hva/android-reality`

Runs only when impact classification says mobile interaction/presentation may have changed, or when manually dispatched for a candidate.

Initial triggers include changes under:

- `product/src/app/**` affecting rendered surfaces;
- `product/src/components/**` for navigation, assistant, overlays, sticky/fixed UI, forms or mobile interaction;
- `product/e2e/android/**`;
- Android Reality workflow/scripts;
- mobile CSS / presentation layers;
- package/config files required by the gate.

Pure docs-only changes are excluded.

The gate must:

1. checkout the exact PR head;
2. build/start the exact local candidate or explicitly target an exact preview;
3. boot Android emulator;
4. prove ADB connectivity and record device/API/Chrome identity;
5. connect Playwright to Android;
6. open Chrome and authenticate with the governed HVA identity;
7. execute governed mobile journeys;
8. collect screenshots, screen recording or equivalent video, console/browser diagnostics where available, DOM/geometry snapshots and a receipt;
9. publish `hva/android-reality` status against the tested SHA;
10. fail closed on product failure or unqualified infrastructure state.

## Initial Android journeys

The first implementation is deliberately narrow and causal. It targets the exact class of defect that escaped HVA before broadening coverage.

### AR-01 — Oggi late context + FAB safety

- Open Oggi from a clean session.
- Capture geometry before delayed contextual surfaces are available.
- Wait for `Lezione di riferimento / Apri materiali` when applicable.
- Assert the FAB does not intersect the reference bar, its CTA, bottom navigation or protected reading region.
- Verify a late-mounted protected region triggers re-resolution without page reload.

### AR-02 — Real touch drag + snap + persistence

- Drag the FAB using Android/touch-native automation, not `page.mouse`.
- Verify movement crosses the drag threshold.
- Verify snap to a safe edge.
- Verify semantic local preference (`edge`, `yRatio`) only.
- Reload and verify restoration.
- Verify the stored preference never outranks protected-region safety.

### AR-03 — Copilot open + software keyboard

- Open the Copilot.
- Focus the composer so Android software keyboard appears.
- Verify usable viewport shrinks and no essential control is hidden behind keyboard or bottom navigation.
- Verify internal panel scrolling remains possible.
- Close keyboard/panel and verify stable restoration.

### AR-04 — Long-page scroll + sticky regions

- Exercise at least one long Classi surface and one Altro/Calendario surface.
- Scroll through top, middle and bottom checkpoints.
- Verify sticky header does not make the current actionable heading/control unreachable.
- Verify bottom navigation and any contextual action bar do not cover primary actions.

## Dynamic protected-region contract

The positioning system must not assume the protected DOM is static.

HVA 2.0 must include a deterministic test where a protected region is inserted after FAB readiness and another where a protected region changes size. A valid implementation must re-resolve geometry after both operations.

Implementation may use `MutationObserver`, a centralized protected-region registry, or another deterministic mechanism, but the contract is behavioral:

- newly mounted protected regions become observable without remounting the FAB;
- removed regions stop constraining layout;
- resized regions trigger re-resolution;
- current placement is retained when still valid to avoid jitter;
- no continuous polling loop.

## Generic overlap evidence

For every governed checkpoint the test harness records rectangles for:

- FAB;
- bottom navigation;
- sticky header;
- contextual action/reference bars;
- elements carrying `[data-copilot-protected]`;
- configured primary actions.

The receipt records intersections in CSS pixels and classifies them:

- `BLOCKING`: essential action/content materially covered;
- `WARNING`: near collision or non-essential overlap;
- `CLEAR`: no governed intersection.

The automatic gate fails only on deterministic `BLOCKING` findings. Warnings are retained for human review.

## Evidence package

Each Android Reality run publishes one artifact named from run ID and exact SHA containing:

- `receipt/android-reality.json`;
- device and Chrome metadata;
- tested SHA and target URL;
- journey result table;
- screenshots at key checkpoints;
- Android screen recording when supported reliably by the emulator;
- ADB log excerpt relevant to Chrome/runtime failures;
- geometry snapshots/intersection report;
- test logs;
- infrastructure classification when the journey could not start.

No artifact may contain credentials, TOTP secrets, session cookies, access tokens, student data or real-user content outside the governed synthetic HVA fixture.

## Receipt semantics

The Android gate has four top-level outcomes:

- `PASS` — all governed Android journeys passed on the exact candidate;
- `FAIL_PRODUCT` — deterministic product/interaction/layout defect established;
- `INFRA_BLOCKED` — emulator/ADB/Chrome/tooling failed before product judgment;
- `NOT_APPLICABLE` — impact classifier proves Android gate not required for this change.

`INFRA_BLOCKED` is never equivalent to PASS.

The final human product decision remains separate:

- automated HVA qualification;
- Android Reality qualification;
- Human Visual / Design decision.

## Exact-SHA and target integrity

For PR execution the Android gate must use `github.event.pull_request.head.sha`, not a mutable branch head discovered later.

If the test targets a public preview rather than the local runtime, the preview must expose or otherwise prove the served release identity before Android journeys begin. A mismatch is `INFRA_BLOCKED` / target-integrity failure, not a product test result.

## Authentication and data safety

- Reuse the existing governed AAL2 HVA credentials.
- Never create a parallel test account automatically.
- Never weaken MFA for Android testing.
- Use only the HVA synthetic workspace/fixtures.
- Preserve preflight/postflight baseline integrity where the Android journey can mutate controlled fixture state.
- Prefer read-only journeys in the first Android slice; any write journey requires explicit fixture reset and receipt evidence.

## Reliability policy

- No automatic retry may turn an initial deterministic product failure into PASS without preserving the first failure as evidence.
- Emulator boot may have bounded infrastructure retry because it is not product behavior.
- Product journey retry default: zero for Android Reality.
- Every failure is classified as product, target-integrity or infrastructure.
- A failure whose classification is uncertain remains blocked and does not qualify the SHA.

## Rollout

### Phase 1 — Close the discovered gap

- Add Android Reality workflow and minimal harness.
- Implement AR-01 and AR-02.
- Add delayed protected-region HVA regression.
- Add exact-SHA receipt/status.
- Run against the PR #747 lineage and prove the known real-device failures are caught automatically.

### Phase 2 — Keyboard and scroll reality

- Add AR-03 and AR-04.
- Add automatic geometry checkpoint pack.
- Add richer video/screenshot evidence.

### Phase 3 — Reusable TRAMA mobile reality contract

Extract the generic Android Reality runner and geometry evidence format so Registro Docente and other TRAMA products can consume the same gate without cloning Docente OS-specific domain logic.

## Acceptance criteria

The design is implemented successfully only when:

1. the pre-fix PR #747 candidate is demonstrated RED by at least one new causal Android/HVA2 regression covering the observed defect class;
2. the same tests become GREEN only after the minimal product fix;
3. Android touch drag is exercised through Android/touch-native automation, not `page.mouse`;
4. a protected region inserted after FAB readiness causes geometry re-resolution;
5. FAB and `Apri materiali` cannot overlap at the governed Oggi checkpoint;
6. exact SHA is present in the Android receipt and commit status;
7. Android product journey retries are zero;
8. failure evidence is automatically uploaded and sufficient for diagnosis without teacher-supplied screenshots;
9. existing Product CI, HVA, MFA and baseline-integrity contracts remain intact;
10. no paid service, production telemetry or student data is introduced;
11. the teacher's normal review burden becomes inspecting surfaced findings rather than manually exploring and documenting every screen.

## Human authority

Automation discovers and documents. It does not decide whether a product experience is pedagogically or professionally acceptable.

A candidate may be `HVA PASS + ANDROID PASS` and still receive Human Visual / Design `REWORK`. Conversely, an automated `FAIL_PRODUCT` cannot be overridden to technical PASS without either fixing the defect or explicitly changing the governed contract through a human-approved design decision.
