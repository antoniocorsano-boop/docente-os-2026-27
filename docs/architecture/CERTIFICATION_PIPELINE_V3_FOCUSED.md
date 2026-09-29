# Browser Certification V3 — Focused-by-impact

Status: PROPOSED / IMPLEMENTATION PILOT

## Problem

Browser Certification V2 selects which heavy gates are applicable, but HVA remains monolithic. When HVA is required it runs the complete Human + Visual Acceptance suite on both mobile and desktop. Shared browser helpers also historically forced every browser gate, even when only one acceptance family consumed the helper.

This makes small, well-bounded changes pay the cost of a broad regression cycle and lengthens the ordinary development loop.

## Decision

V3 keeps exact-head, fail-closed certification but introduces a second level of selectivity.

1. Gate selection remains exact-head and receipt-driven.
2. HVA gains three modes:
   - `NONE`: HVA is not required.
   - `FOCUSED`: run only the HVA specs mapped to the changed surface/support dependency.
   - `FULL`: run the complete mobile + desktop HVA suite.
3. Known E2E support helpers declare the browser gates that actually consume them.
4. Any unknown runtime UI surface, unknown browser support helper, central certification change, or conservative impact receipt falls back to FULL.
5. Gate skipping never authorizes merge by itself and does not change human-review authority.

## Full-HVA triggers

FULL remains mandatory for changes that can affect broad interaction or visual behavior, including:
- root layout / global styles;
- app shell;
- design contracts;
- HVA Playwright configuration;
- governed browser authentication;
- unknown user-facing runtime paths;
- conservative/fail-closed impact classification.

## Focused examples

- Knowledge / Share Target changes: Knowledge/contextual HVA specs.
- Class workspace changes: classroom cockpit, contextual capabilities, lesson register.
- Timetable / Calendar / Planner surface-only changes: relevant surface acceptance spec.
- Classroom fixture changes: only classroom HVA family.
- Direct AAL2 Supabase fixture helper: HVA plus X4, not WCAG/P6 by default.

## Safety properties

- Unknown mappings fall back to broader certification, never narrower certification.
- Exact base/head SHA binding remains unchanged.
- ASVS, TRAMA-PW, Product CI, Design Policy and other independent gates are unchanged.
- MFA/RLS are not bypassed.
- FULL remains available for release/regression qualification.

## Expected effect

The main improvement is latency, not coverage reduction. A bounded PR no longer needs to execute unrelated HVA journeys. Full-suite cost is paid when the changed surface can plausibly affect the whole product, or during periodic full regression.

Initial target:
- focused browser qualification: materially below current full-suite latency;
- full qualification: unchanged assurance level;
- no increase in escaped regressions attributable to scope selection.

## Follow-up after pilot

After several PRs, measure:
- median and p95 Browser Certification duration by mode;
- ratio FOCUSED/FULL;
- rerun rate;
- false-negative/false-positive scope decisions;
- escaped browser regressions.

Only then consider further optimizations such as safe parallelization or reduced retry policy for deterministic focused runs.
