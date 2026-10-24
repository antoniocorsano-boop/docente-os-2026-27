# Docente OS — HVA 2.0 + Android Reality Gate Design

**Date:** 2026-10-24  
**Status:** PROPOSED — HUMAN APPROVAL REQUIRED BEFORE IMPLEMENTATION  
**Baseline:** `aa83f86163bba14001e3dee83b977dcfa6414a22`  
**Triggering evidence:** Human Visual / Design Review of PR #747 on a real Android device established that the Contextual Copilot FAB could not be dragged and could overlap the delayed `Lezione di riferimento / Apri materiali` bar even though automated HVA was GREEN.

## Intent

Replace screenshot-by-screenshot manual UX discovery with a governed, repeatable, zero-cost-first verification system that exercises Docente OS as a teacher actually uses it on mobile.

The system has two complementary layers:

1. **HVA 2.0** — fast Playwright browser qualification on every relevant PR, strengthened for dynamic layout changes, touch semantics, keyboard/viewport behavior, protected regions, scrolling and automatic evidence.
2. **Android Reality Gate (ARG)** — Android Emulator + Chrome Android in GitHub Actions, driven through ADB/Playwright Android support against the same exact candidate SHA.

The teacher should inspect surfaced findings, not manually explore every screen and capture screenshots. Final PASS / REWORK / REJECT product authority remains human.

## Problem established by PR #747

The current mobile Playwright project sets `isMobile: true` and `hasTouch: true`, but the FAB drag test uses `page.mouse`. That proves geometry inside a mobile viewport, not the real Android touch path.

The current positioning adapter also attaches `ResizeObserver` only to protected regions present when its effect runs. A protected region mounted later can therefore escape observation. The real-device review exposed that failure when the delayed reference/material bar appeared and the FAB overlapped its primary action.

Automated qualification must therefore cover both:

- **input reality** — Android Chrome touch/pointer behavior;
- **layout reality** — elements that mount, unmount, resize or become sticky after hydration, data arrival or interaction.

## Goals

- Detect mobile interaction failures without teacher reproduction.
- Detect overlap, clipping, hidden actions and sticky/fixed-region conflicts after delayed DOM changes.
- Bind all evidence to the exact candidate SHA.
- Produce screenshots, video/trace where available, geometry snapshots and machine-readable receipts automatically.
- Keep normal HVA fast while adding Android reality coverage only when relevant.
- Reuse governed AAL2 HVA identity and baseline-integrity controls.
- Stay on public-repository standard GitHub-hosted runners and free/open tooling.
- Preserve human product authority.

## Non-goals

No commercial device farm, production telemetry, recording of real teachers, student data, MFA weakening, autonomous product decision, or full Android matrix on documentation-only changes.

## Approaches considered

### A. Strengthen Playwright HVA only

Fast and inexpensive, but still desktop Chromium under mobile emulation. Insufficient by itself.

### B. HVA 2.0 + Android Reality Gate

Keep A as the rapid gate and add an Android Emulator + Chrome Android gate. This exercises a materially more realistic mobile stack while remaining zero-cost-first. **Chosen.**

### C. Record real-device teacher sessions

Highest realism but creates privacy, persistence and user-effort costs. Deferred as a possible residual validation mechanism, not the primary gate.

## Cost and infrastructure boundary

The repository is public. Standard GitHub-hosted runners for public repositories are currently free and unlimited. Current GitHub-hosted Linux runners expose Android SDK hardware acceleration when KVM permissions are enabled.

Initial infrastructure:

- `ubuntu-latest` standard runner;
- KVM enablement;
- `reactivecircus/android-emulator-runner@v2`, pinned to a reviewed immutable commit in implementation;
- stable Google APIs x86_64 Android image compatible with Chrome automation;
- Node 22;
- Playwright Android API over ADB;
- existing governed HVA credentials.

No paid larger runner is required. If standard-runner Android automation is not reliable enough, result is `INFRA_BLOCKED`; the workflow must not silently fall back to emulated Chromium and claim Android qualification.

## Phase 0 — toolchain feasibility proof

Playwright Android support is experimental, so product implementation must not begin by assuming the toolchain works. The first implementation step is a narrow infrastructure proof that:

1. boots the chosen Android emulator on `ubuntu-latest`;
2. proves ADB connectivity and records device/API identity;
3. launches or connects to Chrome Android through Playwright;
4. makes the exact local Docente OS runtime reachable from Android;
5. loads a harmless public route and captures one screenshot;
6. exits with a classified `INFRA_BLOCKED` result if any prerequisite fails.

**Host reachability call:** prefer `adb reverse tcp:3000 tcp:3000`, allowing Android Chrome to reach the exact candidate at `http://127.0.0.1:3000` without changing application URLs. If reverse port forwarding proves unreliable, use the emulator host bridge (`10.0.2.2`) only through an explicit test-target configuration; never mutate production routing to serve the gate.

This feasibility proof is infrastructure-only and cannot qualify product behavior.

## Gate 1 — HVA 2.0 / `hva/application`

Existing HVA remains the fast PR gate and gains:

- Oggi, Orario, Classi and Altro journey coverage;
- deterministic delayed-region mutation scenarios;
- generic protected-region overlap scanning;
- sticky header/footer obstruction checks during scroll;
- visual-viewport/keyboard-like geometry tests;
- governed screenshots at critical checkpoints;
- retained trace/video on failure;
- machine-readable geometry evidence.

A test that claims touch behavior must not use `page.mouse` as its proof mechanism.

## Gate 2 — Android Reality / `hva/android-reality`

Runs only when impact classification says mobile interaction or presentation may have changed, or by manual dispatch.

The gate must:

1. checkout `github.event.pull_request.head.sha`;
2. build/start that exact candidate or verify exact identity of an explicit preview;
3. boot Android and prove ADB/Chrome identity;
4. authenticate with the governed HVA identity;
5. execute Android journeys with product retries set to zero;
6. collect screenshots, geometry, logs and screen recording when reliable;
7. publish a receipt and commit status against the exact SHA;
8. fail closed on product failure, target-integrity mismatch or unqualified infrastructure.

## Initial Android journeys

### AR-01 — Oggi late context + FAB safety

Open Oggi, capture geometry before delayed context, wait for `Lezione di riferimento / Apri materiali`, then verify FAB, CTA, bottom navigation and protected reading regions do not intersect. A late-mounted protected region must trigger re-resolution without reload.

### AR-02 — real touch drag + snap + persistence

Drag with Android/touch-native automation, verify threshold, snap, semantic `edge + yRatio` persistence, reload restoration and protected-region precedence.

### AR-03 — Copilot + software keyboard

Open Copilot, focus composer, make Android keyboard visible, verify essential controls remain usable and panel scrolling works, then verify stable restoration after keyboard/panel closure.

### AR-04 — long-page scroll + sticky regions

Exercise at least one long Classi surface and one Altro/Calendario surface at top/middle/bottom checkpoints; verify sticky header, bottom navigation and contextual bars do not make actionable content unreachable.

## Dynamic protected-region contract

The positioning system must not assume static DOM. HVA 2.0 requires deterministic tests for protected-region insertion, removal and resize after FAB readiness.

Implementation may use `MutationObserver`, a centralized protected-region registry or another deterministic mechanism, but behavior must guarantee:

- newly mounted protected regions become active without remounting the FAB;
- removed regions stop constraining layout;
- resized regions trigger re-resolution;
- current placement remains when still valid to avoid jitter;
- no polling loop.

## Generic overlap evidence

At governed checkpoints record rectangles for FAB, bottom navigation, sticky header, contextual bars, `[data-copilot-protected]` regions and configured primary actions.

Classify intersections as:

- `BLOCKING` — essential action/content materially covered;
- `WARNING` — near collision or non-essential overlap;
- `CLEAR` — no governed intersection.

Only deterministic `BLOCKING` findings fail automatically. Warnings remain human-review evidence.

## Evidence package

Each Android run publishes an artifact containing:

- `receipt/android-reality.json`;
- device/API/Chrome metadata;
- exact tested SHA and target identity;
- journey results;
- screenshots;
- screen recording when reliable;
- relevant ADB/Chrome diagnostics;
- geometry/intersection report;
- infrastructure classification.

No credential, TOTP secret, cookie, access token, student data or real-user content may enter artifacts.

## Receipt semantics

- `PASS` — governed Android journeys passed on exact candidate;
- `FAIL_PRODUCT` — deterministic product/interaction/layout defect established;
- `INFRA_BLOCKED` — emulator/ADB/Chrome/tooling/target integrity prevented product judgment;
- `NOT_APPLICABLE` — impact classifier proves gate unnecessary.

`INFRA_BLOCKED` is never PASS.

## Authentication and data safety

Reuse the existing governed AAL2 HVA account; never auto-create a parallel identity or weaken MFA. Use only synthetic HVA fixtures. Preserve baseline preflight/postflight where a journey can mutate controlled state. Prefer read-only Android journeys in the first slice.

## Reliability policy

- Product journey retries: **zero**.
- Bounded emulator-boot retry is allowed and classified as infrastructure.
- An initial deterministic product failure cannot be hidden by a later retry.
- Every failure must be classified as product, target-integrity or infrastructure.
- Uncertain classification remains blocked.

## Rollout

### Phase 1 — close the discovered gap

- Phase 0 feasibility proof;
- Android workflow + minimal harness;
- AR-01 and AR-02;
- delayed protected-region HVA regression;
- exact-SHA receipt/status;
- demonstrate RED on the pre-fix PR #747 candidate, then GREEN only after the minimal product fix.

### Phase 2 — keyboard and scroll reality

Add AR-03, AR-04 and richer evidence packaging.

### Phase 3 — reusable TRAMA contract

Extract generic Android runner and geometry receipt so Registro Docente and other TRAMA products can adopt the same gate without cloning Docente OS domain logic.

## Acceptance criteria

Implementation is accepted only when:

1. the pre-fix PR #747 candidate is causally RED under new HVA2/Android coverage;
2. the same tests become GREEN only after minimal fix;
3. Android drag uses Android/touch-native automation, not `page.mouse`;
4. late protected-region insertion causes re-resolution;
5. FAB and `Apri materiali` cannot overlap at governed Oggi checkpoint;
6. exact SHA is present in Android receipt and commit status;
7. product journey retries are zero;
8. failure artifacts are sufficient for diagnosis without teacher screenshots;
9. Product CI, HVA, MFA and baseline integrity remain intact;
10. no paid service, telemetry or student data is introduced;
11. normal human review becomes inspection of surfaced findings rather than manual exhaustive exploration.

## Human authority

Automation discovers and documents; it does not decide pedagogical or professional acceptability. `HVA PASS + ANDROID PASS` may still receive Human Visual / Design `REWORK`. An automated `FAIL_PRODUCT` cannot become technical PASS without a fix or an explicitly human-approved contract change.
