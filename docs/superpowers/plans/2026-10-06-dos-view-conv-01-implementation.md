# DOS-VIEW-CONV-01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge Docente OS user-facing views into the approved teacher-first interaction model before resuming DOS-M4 L3→L4 qualification.

**Architecture:** Preserve existing domain, persistence and authority boundaries. Implement convergence in seven dependency-ordered slices: mobile shell, Settings model, Settings mobile UI, proven shared primitives, dense views, secondary views, then certification. Behavioral changes use RED → GREEN and existing repository gates; no automatic merge or release promotion.

**Tech Stack:** Next.js 16.3, React, TypeScript, existing AppShell/navigation registry, Radix/cmdk/Lucide, existing Browser Certification/HVA/Design/Human Interaction gates.

**Spec:** `docs/superpowers/specs/2026-10-05-docente-os-view-convergence-design.md`

## Global Constraints

- Start from `develop@09a3a3600b81992f3675be82d1d2f188f1643909` on isolated branch `feat/dos-view-conv-01`.
- No new major teacher capability, backend/data-model refactor, timetable-domain change or browser-install replacement.
- Preserve Arena/Atlas/Docente OS authority boundaries and `DOS-A1=RUNTIME_DEFERRED`.
- No automatic merge; final integration remains Human Review.
- Reuse existing certification infrastructure; do not create a parallel gate system.
- Minimum coarse-pointer target 44×44 CSS px; preserve focus, safe-area, reduced motion, logical reading order and no unintended horizontal overflow.

## Review Focus

- Small mobile widths: five destinations must fit without an empty slot, clipping or loss of 44×44 targets.
- Secondary navigation: `Naviga` must expose exactly the approved grouped destinations without duplicating the five primary destinations.
- Settings readiness: optional/device configuration must never affect essential readiness or force GUIDED mode.
- Existing timetable/PWA/share flows must remain behaviorally unchanged except for shared navigation/presentation chrome.
- Dense views must gain a usable mobile representation without hiding evidence/provenance required for support/governance.

---

### Task 1: DOS-VIEW-CONV-01A — Mobile shell

**Files:**
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/src/components/app-shell/app-shell.tsx`
- Modify only if required by current implementation: AppShell stylesheet(s)
- Test: existing AppShell/navigation test location; add a focused navigation contract test if none exists.

**Interfaces:**
- Produces primary mobile membership: `home`, `today`, `classes`, `timetable`, plus the `Naviga` trigger.
- Produces approved `SECONDARY_NAVIGATION_GROUPS`: Prepara e insegna, Organizza, Trova, Configura.

- [ ] Write failing tests asserting exact five mobile destinations, Home/Oggi distinction, no duplicated primary destinations in Naviga, correct active semantics, and layout derived from rendered item count.
- [ ] Run focused tests and record RED caused by current three-item `WORK_NAVIGATION_KEYS` plus residual `Altro` behavior.
- [ ] Implement the minimal navigation registry/AppShell changes; rename teacher-facing `Altro` hub to `Naviga` without changing domain-specific uses of “Altro”.
- [ ] Run focused tests to GREEN.
- [ ] Run relevant AppShell/browser/design tests and commit the independently reviewable slice.

### Task 2: DOS-VIEW-CONV-01B — Settings IA and readiness model

**Files:**
- Modify: Settings page/model files under `product/src/app/impostazioni/`.
- Modify only the presentation/readiness helpers actually used by Settings.
- Test: existing Settings model tests; add focused readiness tests beside the owning module if absent.

**Interfaces:**
- Essential set: Tu e la scuola; Discipline; Classi assegnate; Cattedra; Settimana scolastica.
- Optional set: Libri di testo; App e dispositivo; Accessi rapidi Home.
- `GUIDED` depends only on essential readiness/review state.

- [ ] Write failing tests for 5/5 essential calculation, optional exclusion, GUIDED→MAINTENANCE transition, approved labels and account/security linked destination.
- [ ] Run focused tests and record RED.
- [ ] Implement minimal readiness/grouping model and terminology changes.
- [ ] Run focused tests to GREEN.
- [ ] Run Settings/product tests and commit.

### Task 3: DOS-VIEW-CONV-01C — Settings mobile presentation

**Files:**
- Modify: Settings page/components under `product/src/app/impostazioni/`.
- Create only if repeated structure warrants it: focused Settings index/group presentation components.
- Test: existing browser/HVA Settings coverage plus focused component/source contract tests.

- [ ] Write failing tests proving vertical grouped mobile index, next-essential-action priority, `App e dispositivo` discoverability and absence of horizontal category-carousel dependency.
- [ ] Run RED.
- [ ] Implement vertical grouped index and responsive behavior using the Task 2 model.
- [ ] Run GREEN and mobile viewport checks.
- [ ] Run accessibility/design gates for Settings and commit.

### Task 4: DOS-VIEW-CONV-01D — Shared primitives

**Files:**
- Create/modify only primitives with at least two demonstrated consumers among A–C.
- Candidate names from spec: `PageHeader`, `TaskFocus`, `SectionDisclosure`, `StatusFeedback`, `EmptyState`, `SettingsIndexItem`, `SettingsGroup`, `MobileBottomNavigation`.

- [ ] Inventory duplication created or exposed by Tasks 1–3; reject abstractions with fewer than two real consumers.
- [ ] For each behavioral primitive, write failing tests before extraction.
- [ ] Extract minimally without changing behavior.
- [ ] Run focused and qualifying suites to GREEN.
- [ ] Commit separately from dense-view changes.

### Task 5: DOS-VIEW-CONV-01E — Dense views

**Files:**
- Modify only current route/components for `Piano annuale`, `Calendario`, `Conoscenza`, `Progetta`.
- Test: route-specific tests plus existing Browser Certification/HVA coverage.

- [ ] For Piano annuale, write RED coverage for a genuine mobile representation and preservation of support/governance provenance on demand; implement and GREEN.
- [ ] For Calendario, write RED coverage for next-event/agenda/add-event priority and demotion of structural/history data; implement and GREEN.
- [ ] For Conoscenza, write RED coverage for preserved entry context and one intent-led visual priority; implement and GREEN.
- [ ] For Progetta, write RED coverage making contextual/guided authoring primary when context exists while preserving general/archive access; implement and GREEN.
- [ ] Run each route's focused suite before moving to the next; then run combined dense-view gates and commit reviewable slices.

### Task 6: DOS-VIEW-CONV-01F — Secondary-view convergence

**Files:**
- Touch only audited material/diary/authoring/account/auth routes that still violate the canonical grammar.
- Add a short no-change record for audited routes that already conform.

- [ ] Audit remaining user-facing routes against Context → attention now → one primary action → feedback/state → details on demand.
- [ ] For each real defect, write RED evidence before changing presentation behavior.
- [ ] Apply presentation/mobile/terminology corrections only; stop if domain/authority changes would be required.
- [ ] Run focused tests and commit by coherent route group.

### Task 7: DOS-VIEW-CONV-01G — View certification and closeout

**Files:**
- Update/create only the repository's canonical evidence/delta artifact for this tranche.
- Do not update maturity registry/snapshot as if DOS-M4 were complete; that remains a later canary step.

- [ ] Build the route/state/viewport evidence matrix: desktop, smartphone, normal, empty where applicable, mutation feedback where applicable, keyboard/focus, overflow; add pending/error/destructive/reduced-motion/device evidence where relevant.
- [ ] Run Product CI, Browser Certification, Design Policy, Experience Acceptance/HVA and Human Interaction Model on the exact implementation head.
- [ ] Record exact head SHA and distinguish product failures from external CI delays.
- [ ] Verify timetable/PWA/share application-scope regression remains closed and `DOS-A1=RUNTIME_DEFERRED`.
- [ ] Prepare final delta report with Human Review still pending; no automatic merge.

## Post-convergence handoff

Only after DOS-VIEW-CONV-01 passes Task 7 and is integrated through Human Review:

1. deploy the resulting `develop` exact SHA to the canonical Beta;
2. verify `/api/build-info`/runtime binding to that SHA;
3. rebaseline TRAMA DOS-M4-01 from the old `09a3a360...` candidate to the integrated convergence SHA;
4. execute the real timetable `RUNTIME_CANARY` on Beta;
5. only with canary evidence, update maturity registry/snapshot and prepare Docente OS L3→L4 formal closure.