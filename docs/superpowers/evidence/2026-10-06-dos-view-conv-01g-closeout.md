# DOS-VIEW-CONV-01G — View certification and closeout

Date: 2026-10-06
Status: **TECHNICALLY_CERTIFIED — HUMAN_REVIEW_PENDING**
Parent tranche: `DOS-VIEW-CONV-01`
PR: #688
Target base: `develop@09a3a3600b81992f3675be82d1d2f188f1643909`
Certified implementation head: `20c669e796cea1c6208699a4b3da399c6eb22d90`

## Closeout decision

Slices 01A–01F are qualified and the full view-convergence implementation is technically certified on the exact implementation head above. No automatic merge, Beta promotion, DOS-M4 rebaseline, maturity-registry update or runtime-canary promotion is part of this closeout. Human Review remains the final integration gate.

`DOS-A1` remains `RUNTIME_DEFERRED`. No authority boundary, timetable-domain ownership, persistence authority or release-promotion rule is changed by this tranche.

## Exact-head certification receipt

All qualifying runs below executed against `20c669e796cea1c6208699a4b3da399c6eb22d90`:

| Gate | Result | Run |
| --- | --- | --- |
| Product CI | PASS | `37491587505` |
| Browser Certification Orchestrator | PASS | `37491587512` |
| Design Policy Gate | PASS | `37491587530` |
| Human Interaction Model | PASS | `37491587518` |
| TRAMA Perceptible Write | PASS | `37491587546` |
| ASVS 5.0 Assurance | PASS | `37491587531` |
| Certification Impact Classifier | PASS | `37491587720` |
| K1 Knowledge Upload Gate | PASS | `37491587589` |
| X5 UDA Versioned Authoring Gate | PASS | `37491587533` |
| X5B Professional UDA Export Gate | PASS | `37491587596` |
| MFA Browser AAL2 Gate | PASS | `37491587560` |
| P7 Anonymization Input Guard | PASS | `37491587477` |
| Dependency Security Gate | PASS | `37491587773` |
| Release Engineering Policy | PASS | `37491587591` |
| Governed MFA Queue Hygiene | PASS | `37491587588` |

Product CI completed product tests, typecheck, lint and production build successfully.

Browser Certification used FULL HVA on the exact implementation head. The run completed with 83 tests passed and one intentional desktop skip for the mobile-only direct-edit timetable case. HVA receipt generation and enforcement, WCAG 2.2 AA, P6 performance, X3 no-implicit-write and X4 Planner acceptance all passed. The acceptance receipt contains no automatic finding; visual/design-governance fields remain `REVIEW_REQUIRED` by design because they require Human Review rather than automatic promotion.

Browser evidence artifact: `browser-certification-37491587512` (artifact `11426298475`, digest `sha256:b0901b0b1729b1e60e7d2a8796d5548834b8fdc7c7ebb17502d19170968cb94d`).

## Route / state / viewport evidence matrix

Legend: `PASS` = exercised successfully on the certified implementation head; `RETAINED` = slice-specific evidence remains valid and the full certification found no regression; `N/A` = not a meaningful state for that surface.

| Surface | Normal / task state | Empty / fail-closed / error | Mutation feedback | Desktop 1440×1000 | Smartphone 412×915 | Keyboard / focus / WCAG | Overflow / layout | Special evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AppShell / primary navigation | PASS | N/A | N/A | PASS | PASS | PASS — AppShell first-Tab bypass/focus-to-main + WCAG | PASS | DOS-VIEW-CONV-01A IA exercised in FULL HVA; mobile target floor 44 px |
| Settings | PASS | RETAINED — essential/optional readiness contracts from 01B/01C | N/A | PASS | PASS | PASS | PASS | Optional/device/account configuration does not affect essential 5/5 readiness |
| Piano annuale | PASS | RETAINED — mobile representation/provenance contract from 01E | N/A | PASS | PASS | PASS | PASS | Dense desktop representation preserved; mobile representation qualified |
| Calendario | PASS — intentional controls | RETAINED from 01E | PASS — one registration mode at a time | PASS | PASS | PASS | PASS | Critical journey `Calendario → controlli intenzionali` passes in both viewports |
| Conoscenza | PASS — contextual entry/return | RETAINED; K1 covers upload/runtime boundary | Governed by existing knowledge flows | PASS | PASS | PASS | PASS | Contextual resource journey preserves section/return context; K1 PASS |
| Progetta | PASS — contextual/guided authoring | RETAINED — general/archive access from 01E | PASS — X3 preview/no implicit write; X4 confirm/reject/undo | PASS | PASS | PASS | PASS | X5 and X5B PASS; no automatic write |
| Materiali prossima lezione | PASS | PASS — explicit operational/fail-closed RoleView path | N/A | PASS | PASS | PASS | PASS | Standard pack, contextual access and surface evidence all PASS |
| Materiali domani | PASS | RETAINED — governed-package boundary | N/A | PASS | PASS | Covered by HVA journey | PASS | MDS-4 journey PASS |
| Diario / Registra lezione | PASS | RETAINED — existing empty-state behavior; no 01G product change | PASS — governed registration flow | PASS | PASS | Covered by HVA journey | PASS — explicit horizontal-overflow assertion retained | Stale HVA copy assertion was aligned to the intentional diary convergence; product behavior unchanged |
| Account / authentication surfaces | PASS | Governed auth failure boundaries retained | Governed security actions | PASS | PASS | PASS — account/account-MFA WCAG | PASS | Teacher-facing technical auth terminology contract PASS; auth authority unchanged |
| Orario | PASS | RETAINED — guided/fail-closed states | PASS — direct edit and guided decision path | PASS for timetable surface/guided hierarchy; mobile-only direct-edit spec intentionally skipped on desktop | PASS — real fixture, direct edit, guided steps 1–3 | PASS | PASS | No timetable-domain redesign; real sanitized fixture and guided hierarchy exercised on exact head |
| PWA / Share Target | PASS | Device-native install remains browser/device responsibility | PASS — task-first Share Target | PASS | PASS | Existing accessible settings route retained | PASS | Manifest/Share Target exposed; browser-native install path documented without replacing it; no floating install prompt |

### Cross-cutting evidence

- FULL HVA: browser, journeys, console, network, layout and mobile targets all PASS.
- WCAG 2.2 AA automated assurance: 30/30 PASS across mobile and desktop surfaces.
- Minimum coarse-pointer target remains 44 CSS px.
- No tranche-specific replacement of browser-native install UI was introduced.
- No new motion model was introduced by 01G; the approved reduced-motion constraint remains unchanged.
- No unintended horizontal-overflow finding was reported in the FULL HVA receipt.

## Timetable / PWA / share regression boundary

Application-scope regression remains closed on the certified implementation head:

- timetable surface HVA PASS on mobile and desktop;
- real sanitized timetable fixture PASS;
- mobile direct-edit end-to-end PASS;
- guided timetable hierarchy steps 1–3 PASS on mobile and desktop;
- PWA manifest and Share Target contract PASS;
- Settings continues to document the browser-native install path without replacing it;
- Share Target remains task-first and does not introduce a floating install prompt.

Device-native install behavior remains outside this application-scope qualification and is not re-opened by DOS-VIEW-CONV-01.

## Product failures vs CI / test-infrastructure findings during convergence

The final certified implementation head has no red qualifying gate. Earlier failures were classified and resolved rather than hidden:

1. **Product-language defect** — Product CI identified teacher-facing authentication copy containing internal technical terms. The copy was corrected while preserving authentication/security semantics.
2. **Stale HVA contract** — `lesson-register.spec.mjs` still required the retired copy `Una sola memoria didattica` after the intentional Diary follow-up convergence. The test was aligned to the canonical Diary copy; no production behavior changed.
3. **External GitHub Actions 5xx** — queue hygiene encountered transient GitHub `502` responses while cancelling obsolete runs. Queue cleanup was hardened with bounded retry for retryable 5xx responses; 409/422 race handling remained non-fatal.
4. **Governed queue coverage gap** — X5B/MFA browser paths were added to the governed queue-hygiene set so obsolete exact-head runs no longer block the current certification chain.

`DOS-DIAG-01` now makes Product CI failures inspectable through a preserved raw test log, exit code, failure index, GitHub Step Summary and failure artifact. It is diagnostic instrumentation, not a parallel certification gate.

## Authority and deferred work

- Arena / Atlas / Docente OS authority boundaries are unchanged.
- Domain and persistence authority are unchanged by view convergence.
- `DOS-A1=RUNTIME_DEFERRED` remains binding; no activation is included in this tranche.
- The maturity registry/snapshot is intentionally not updated as if DOS-M4 were complete.
- No canonical Beta deployment or real timetable `RUNTIME_CANARY` is claimed by this closeout.

## Slice ledger

- 01A — **QUALIFIED**
- 01B — **QUALIFIED**
- 01C — **QUALIFIED**
- 01D — **QUALIFIED_NO_EXTRACTION**
- 01E — **QUALIFIED / COMPLETE**
- 01F — **QUALIFIED** on implementation head `20c669e796cea1c6208699a4b3da399c6eb22d90`
- 01G — **TECHNICALLY_CERTIFIED — HUMAN_REVIEW_PENDING**

## Final boundary

DOS-VIEW-CONV-01 is ready for Human Review but is **not integrated**. PR #688 must remain unmerged until that review is completed.

Only after Human Review and integration into `develop` may the post-convergence sequence begin: canonical Beta deployment → `/api/build-info` exact-SHA verification → TRAMA DOS-M4-01 rebaseline → real timetable `RUNTIME_CANARY` → maturity registry/snapshot update and formal L3→L4 closure preparation.
