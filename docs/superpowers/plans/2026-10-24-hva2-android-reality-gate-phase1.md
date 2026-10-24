# HVA 2.0 + Android Reality Gate — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the exact PR #747 defect class automatically reproducible and diagnosable without teacher-supplied screenshots, then turn the known RED into GREEN with the smallest product correction.

**Architecture:** Keep `hva/application` as the fast Playwright gate and add a separate fail-closed Android Chrome gate driven through ADB + Playwright Android. Phase 1 covers only infrastructure feasibility, AR-01 late-context overlap safety, AR-02 real touch drag/persistence, exact-SHA receipts, and the two causal product fixes exposed by those tests. Keyboard/long-scroll journeys and TRAMA extraction remain Phase 2/3 work.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, Node 22, `@playwright/test@1.55.0` installed no-save in CI, Playwright Android `_android`, Android Emulator Google APIs x86_64, ADB, GitHub Actions, `reactivecircus/android-emulator-runner` pinned to an immutable reviewed commit corresponding to v2.38.0.

**Spec:** `docs/superpowers/specs/2026-10-24-hva2-android-reality-gate-design.md`

## Global Constraints

- Baseline candidate for causal RED: `aa83f86163bba14001e3dee83b977dcfa6414a22`.
- PR #747 remains untouched while Phase 1 infrastructure and tests are built on a dedicated implementation branch from the approved docs branch.
- Product journey retries are exactly `0`; bounded emulator boot retry may exist only as infrastructure handling.
- Android qualification may return only `PASS`, `FAIL_PRODUCT`, `INFRA_BLOCKED`, or `NOT_APPLICABLE`; `INFRA_BLOCKED` is never PASS.
- Android product journeys must use Android/touch-native automation; `page.mouse` cannot qualify touch behavior.
- Use existing governed AAL2 HVA credentials only; no account creation, MFA weakening, telemetry, real-user recording, or student data.
- Local exact candidate is reached through `adb reverse tcp:3000 tcp:3000`; fallback to `10.0.2.2` is allowed only as an explicit test target and never as application routing.
- Preserve existing HVA baseline preflight/postflight and current Product CI behavior.
- No paid runner, commercial device farm, or paid external service.
- Phase 1 stops after AR-01 + AR-02 GREEN and evidence/status qualification. AR-03, AR-04 and cross-TRAMA extraction require separate plans.

## Review Focus

- A protected region mounted after FAB readiness must immediately constrain placement; test in Task 3.
- A protected region removed after readiness must stop constraining placement without a reload; test in Task 3.
- Chrome Android may convert a drag into page scrolling/pointer cancellation unless the trigger owns the gesture; test in Task 5.
- The delayed `Lezione di riferimento / Apri materiali` action must never be covered by the FAB; test in Tasks 4 and 5.
- Emulator/ADB/Chrome/toolchain failures must be classified as infrastructure rather than product defects or false PASS; test in Tasks 1 and 2.

---

### Task 1: Android toolchain feasibility gate

**Files:**
- Create: `.github/workflows/android-reality.yml`
- Create: `product/e2e/android/android-smoke.mjs`
- Create: `product/e2e/android/android-runtime.mjs`

**Interfaces:**
- Consumes: `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_TOTP_SECRET`; local runtime at `127.0.0.1:3000`.
- Produces: `connectAndroidRuntime(): Promise<{ device, context, page, metadata }>` and infrastructure JSON under `product/test-results/android-reality/infrastructure.json`.

- [ ] **Step 1: Add the infrastructure-only smoke script**

`android-smoke.mjs` must call Playwright `_android.devices()`, require exactly one usable emulator, record model/serial/API/Chrome metadata, execute `adb reverse tcp:3000 tcp:3000`, call `device.launchBrowser({ baseURL: 'http://127.0.0.1:3000', locale: 'it-IT', timezoneId: 'Europe/Rome' })`, open `/login`, and save `test-results/android-reality/screenshots/smoke-login.png`.

- [ ] **Step 2: Add fail-closed infrastructure classification**

`android-runtime.mjs` exposes `classifyInfrastructureError(error): 'INFRA_BLOCKED'` and writes a sanitized infrastructure receipt. It must never serialize environment variables, cookies, headers, TOTP values or browser storage.

- [ ] **Step 3: Add the GitHub Actions workflow**

Use `ubuntu-latest`, Node 22, KVM enablement, Google APIs x86_64 emulator, and an immutable commit pin for the reviewed `reactivecircus/android-emulator-runner` v2.38.0 release. Checkout must use `${{ github.event.pull_request.head.sha }}` for PRs. Build/start the exact local product before booting journeys.

- [ ] **Step 4: Run the feasibility workflow without product journeys**

Expected result: either screenshot + metadata with infrastructure PASS, or classified `INFRA_BLOCKED`. No product PASS status is allowed from this task.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/android-reality.yml product/e2e/android/android-smoke.mjs product/e2e/android/android-runtime.mjs
git commit -m "test: prove Android Reality infrastructure"
```

### Task 2: Exact-SHA Android receipt and geometry evidence

**Files:**
- Create: `product/e2e/android/android-geometry.mjs`
- Create: `product/scripts/experience/android-reality-report.mjs`
- Create: `product/scripts/experience/android-reality-report.test.mjs`
- Modify: `.github/workflows/android-reality.yml`

**Interfaces:**
- Produces: `rectFor(locator)`, `intersection(a,b)`, `classifyIntersection(...)`, and `receipt/android-reality.json` with `testedSha`, `outcome`, device metadata, journey results and geometry findings.

- [ ] **Step 1: Write failing report tests**

Tests assert that missing tested SHA, uncertain failure classification, or infrastructure failure cannot serialize as `PASS`; `FAIL_PRODUCT` retains the first deterministic failure; secrets/cookies are absent from JSON output.

- [ ] **Step 2: Run report tests and verify RED**

Run: `node --test product/scripts/experience/android-reality-report.test.mjs`

Expected: FAIL because report module does not exist.

- [ ] **Step 3: Implement receipt + geometry helpers**

`classifyIntersection` returns `BLOCKING | WARNING | CLEAR`; any positive-area intersection between FAB and configured essential action/protected region is `BLOCKING` in Phase 1. Receipt top-level outcome is one of the four spec values only.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test product/scripts/experience/android-reality-report.test.mjs`

Expected: PASS.

- [ ] **Step 5: Upload evidence and publish `hva/android-reality` status**

Workflow artifact includes receipt, screenshots, geometry JSON, sanitized Android/ADB logs and runtime log. Commit status targets the exact tested SHA.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/android-reality.yml product/e2e/android/android-geometry.mjs product/scripts/experience/android-reality-report.mjs product/scripts/experience/android-reality-report.test.mjs
git commit -m "test: add Android Reality receipt and geometry evidence"
```

### Task 3: HVA 2.0 delayed protected-region RED → GREEN

**Files:**
- Modify: `product/e2e/experience/contextual-copilot-fab.spec.mjs`
- Modify: `product/src/components/assistant/use-contextual-fab-position.ts`

**Interfaces:**
- Existing `useContextualFabPosition()` remains unchanged externally.
- Internal observer contract: current `[data-copilot-protected]` regions and `.dosBottomNav` are re-synchronized after subtree mutations, then placement is remeasured through the existing animation-frame scheduler.

- [ ] **Step 1: Add the causal delayed-mount HVA test**

After `data-fab-ready="true"`, insert a fixed `data-copilot-protected` element into `document.body` at the current FAB rectangle and assert, without resize/scroll/reload, that the FAB moves or docks and no longer intersects it.

- [ ] **Step 2: Add removal and resize assertions**

Remove the region and assert it stops constraining placement; reinsert and change its dimensions and assert re-resolution. Current placement must remain unchanged when still valid.

- [ ] **Step 3: Run only the mobile FAB spec on baseline and capture RED**

Run: `npx playwright test e2e/experience/contextual-copilot-fab.spec.mjs --config=playwright.experience.config.mjs --project=mobile-412x915 --retries=0`

Expected on `aa83f861…`: FAIL specifically because late-mounted protected DOM is not observed.

- [ ] **Step 4: Implement dynamic protected-region observation**

In `use-contextual-fab-position.ts`, add one `MutationObserver` on `document.body` with `{ childList: true, subtree: true }`. On mutation, synchronize the `ResizeObserver` targets for all current `[data-copilot-protected]` nodes plus `.dosBottomNav`, then call existing `remeasure`. Disconnect both observers on cleanup. Do not poll.

- [ ] **Step 5: Re-run the focused spec and verify GREEN**

Expected: insertion, removal and resize scenarios PASS with zero retries.

- [ ] **Step 6: Commit**

```bash
git add product/e2e/experience/contextual-copilot-fab.spec.mjs product/src/components/assistant/use-contextual-fab-position.ts
git commit -m "fix: observe late copilot protected regions"
```

### Task 4: AR-01 — Oggi late context + `Apri materiali` overlap RED → GREEN

**Files:**
- Create: `product/e2e/android/ar-01-oggi-late-context.mjs`
- Modify: `product/e2e/android/android-smoke.mjs` or replace with `product/e2e/android/run-android-reality.mjs`
- Modify: `product/src/components/app-shell/lesson-materials-quick-action.tsx`
- Modify: `.github/workflows/android-reality.yml`

**Interfaces:**
- `LessonMaterialsQuickAction` exposes its fixed root as `data-copilot-protected` when rendered.
- AR-01 records FAB, quick-action CTA and bottom-nav rectangles before/after delayed assistant/material context.

- [ ] **Step 1: Write AR-01 against baseline behavior**

Authenticate with `loginE2E(page)`, open `/planner`, wait for FAB readiness and then for `[data-testid="lesson-materials-entrypoint"]`. Record screenshots and geometry before/after late mount. Assert no FAB intersection with the entrypoint root, its `Apri materiali` link, or `.dosBottomNav`.

- [ ] **Step 2: Run AR-01 on the pre-fix candidate and preserve RED**

Expected on `aa83f861…`: `FAIL_PRODUCT` with a `BLOCKING` intersection matching the real-device finding.

- [ ] **Step 3: Mark the contextual quick action as a protected region**

Add `data-copilot-protected` to the `<aside>` root in `lesson-materials-quick-action.tsx`. No layout redesign or new persistence.

- [ ] **Step 4: Re-run AR-01 and verify GREEN**

Expected: late mount triggers Task 3 observer re-resolution; FAB either relocates or docks; `Apri materiali` remains unobstructed.

- [ ] **Step 5: Commit**

```bash
git add product/e2e/android product/src/components/app-shell/lesson-materials-quick-action.tsx .github/workflows/android-reality.yml
git commit -m "fix: protect late lesson materials action from copilot FAB"
```

### Task 5: AR-02 — real Android touch drag + persistence RED → GREEN

**Files:**
- Create: `product/e2e/android/ar-02-fab-touch-drag.mjs`
- Modify: `product/src/app/assistant-safe-area.css`
- Modify: `product/e2e/experience/contextual-copilot-fab.spec.mjs`
- Modify: `.github/workflows/android-reality.yml`

**Interfaces:**
- Android gesture uses OS/touch-native input through Playwright Android/ADB; no `page.mouse` is permitted in AR-02.
- Closed mobile `.dosAssistantFloatingTrigger` owns the drag gesture with `touch-action: none` while preserving normal tap-to-open behavior through the existing 6px drag threshold.

- [ ] **Step 1: Add AR-02 touch drag**

Open a governed surface with the FAB, obtain trigger center coordinates from the page, perform a native Android swipe/drag across the 6px threshold toward the opposite safe edge, and assert `data-fab-mode="manual"`, valid `data-fab-edge`, semantic localStorage payload and no accidental assistant opening.

- [ ] **Step 2: Verify persistence and protected-region precedence**

Reload and assert mode/edge restoration. Then navigate to Oggi with the late materials action and assert the manual preference may be displaced but cannot overlap the protected action.

- [ ] **Step 3: Run AR-02 on baseline and preserve causal RED**

Expected on `aa83f861…`: native drag does not complete reliably and/or is cancelled by browser gesture handling; result `FAIL_PRODUCT`, zero product retries.

- [ ] **Step 4: Implement the minimal touch ownership fix**

In the mobile `.dosAssistantFloatingTrigger` rule in `assistant-safe-area.css`, add `touch-action: none;`. Do not alter the 6px threshold, semantic persistence, pointer handlers, button semantics or visual styling.

- [ ] **Step 5: Replace the misleading browser mouse proof**

Keep the existing HVA geometry/persistence coverage, but rename/reframe its mouse-driven test so it no longer claims touch qualification. Android Reality becomes the authoritative touch proof.

- [ ] **Step 6: Re-run AR-02 and focused HVA**

Expected: native Android drag PASS; tap still opens assistant; reload restores semantic preference; HVA geometry contract remains GREEN.

- [ ] **Step 7: Commit**

```bash
git add product/e2e/android/ar-02-fab-touch-drag.mjs product/src/app/assistant-safe-area.css product/e2e/experience/contextual-copilot-fab.spec.mjs .github/workflows/android-reality.yml
git commit -m "fix: make contextual FAB draggable on Android touch"
```

### Task 6: Phase 1 qualification and evidence closure

**Files:**
- Modify: `.github/workflows/android-reality.yml`
- Modify: `.github/workflows/experience-acceptance.yml` only if required to include the new Phase 1 HVA file paths/status dependency; do not merge the two workflows.
- Update: `docs/superpowers/specs/2026-10-24-hva2-android-reality-gate-design.md` implementation status after qualification.

**Interfaces:**
- Produces exact-SHA statuses `hva/application` and `hva/android-reality`, plus artifact `android-reality-<run-id>-<sha>`.

- [ ] **Step 1: Run Product CI-equivalent local verification**

Run at minimum: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` from `product/`.

Expected: all exit 0.

- [ ] **Step 2: Run focused HVA 2.0 with retries disabled for the new defect-class tests**

Expected: delayed region insertion/removal/resize GREEN and existing FAB geometry/persistence GREEN.

- [ ] **Step 3: Run Android Reality Phase 1 on the exact candidate**

Expected: infrastructure PASS, AR-01 PASS, AR-02 PASS, product retries `0`, exact SHA in receipt, no `BLOCKING` intersections.

- [ ] **Step 4: Verify evidence sufficiency**

Artifact must contain failure-capable screenshots, geometry JSON, device/API/Chrome identity, sanitized logs and receipt. Confirm no credentials/cookies/tokens/user data are present.

- [ ] **Step 5: Verify legacy gates**

Existing `hva/application`, baseline integrity, MFA and Product CI remain GREEN; no old PASS is reused from a different SHA.

- [ ] **Step 6: Update design status and commit qualification metadata only after fresh evidence**

Record Phase 1 exact SHA, HVA run, Android run, receipt/artifact identifiers and the causal RED→GREEN lineage. Do not mark Human Visual / Design PASS automatically.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/android-reality.yml .github/workflows/experience-acceptance.yml docs/superpowers/specs/2026-10-24-hva2-android-reality-gate-design.md
git commit -m "docs: record HVA 2.0 Android Reality phase 1 qualification"
```

## Self-review result

- **Spec coverage:** Phase 0 and Phase 1 are fully mapped. AR-03, AR-04 and TRAMA extraction are intentionally excluded and require subsequent plans.
- **Type/interface consistency:** Android runtime, geometry and receipt interfaces are owned by Tasks 1–2 and consumed by Tasks 4–6.
- **Causal TDD:** both observed real-device defects must be demonstrated RED on `aa83f861…` before their product fixes are accepted.
- **Human authority:** automated gates can qualify engineering evidence but cannot issue final Human Visual / Design PASS.
