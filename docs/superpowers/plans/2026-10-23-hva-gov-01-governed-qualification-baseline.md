# HVA-GOV-01 Governed Qualification Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere HVA deterministica e governata tramite una baseline persistente che esponga in `Oggi` una lezione conclusa non registrata, una lezione corrente e un impegno Calendario, senza mutare la baseline durante le run.

**Architecture:** L'attuale workspace HVA resta l'unico tenant di qualificazione. Il codice introduce un contratto semantico read-only con fingerprint, preflight e postflight; la baseline viene predisposta una sola volta sulla DRAFT e attivata dal `2026-10-27`, mentre la giornata HVA canonica diventa `2026-11-02T08:30:00+01:00`. Il vecchio ACTIVE resta valido fino al 26 ottobre, così la TeachingSession legacy del 26 conserva la propria provenienza storica e non viene migrata. La baseline temporale è obbligatoria esclusivamente per `hva/application` locale, dove server e browser condividono il clock controllato; i gate Beta/preview remoti non simulano il tempo e non dichiarano copertura del journey `today-teacher-first`.

**Tech Stack:** Node.js 22, JavaScript ESM/CJS, TypeScript 5.9, Next.js 16.3.1, Supabase JS 2.57 con sessione AAL2, Playwright 1.55, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-23-hva-gov-01-governed-qualification-baseline-design.md` + `docs/superpowers/specs/2026-10-23-hva-gov-01-temporal-boundary-amendment.md`

## Global Constraints

- Baseline applicativa di partenza: PR #726 exact head `89afa81fe1db7fae52f33c9adb0d2defb2546743`.
- Implementazione su branch separato derivato da `docs/hva-gov-01-governed-baseline`; non modificare direttamente `feat/dos-ia-product-reset`.
- Nessun merge, deploy o promozione Beta durante HVA-GOV-01.
- Nessuna scrittura diretta nell'ACTIVE esistente.
- Nessun service-role, SQL ad hoc in CI o bypass RLS/AAL2.
- Nessun self-healing del tenant durante preflight, browser test o postflight.
- Nuova DRAFT `effective_from = 2026-10-27`; vecchia ACTIVE deve restare valida fino al `2026-10-26`.
- Giornata HVA canonica: `2026-11-02`; clock: `2026-11-02T08:30:00+01:00`; timezone: `Europe/Rome`.
- Assignment canonico: 2A / Tecnologia / `CONFIRMED` / `weekly_minutes = 120` / marker `HVA · Oggi · Cattedra canonica`.
- Baseline lunedì: `07:00–08:00` non registrata + `08:00–09:00` corrente.
- Evento canonico: `2026-11-02 10:30–11:00`, `MEETING`, marker `HVA-GOV-01/v1`.
- La TeachingSession legacy `2026-10-26 · B01` non viene duplicata, superseded, cancellata o riscritta da HVA-GOV-01.
- Il clock governato e il journey `today-teacher-first` sono requisiti di `EXPERIENCE_TARGET=local`; un target remoto `beta`/`preview` non deve alterare o simulare l'orologio server.
- I gate remoti devono riportare la baseline temporale come `NOT_APPLICABLE`, non come PASS fittizio.
- Tutti i gate di integrità applicabili devono essere fail-closed e produrre diagnostica leggibile.

## Review Focus

- **Cambio ora legale:** il 2 novembre usa `+01:00`, non `+02:00`; testare che server e browser locali condividano esattamente lo stesso istante canonico.
- **Storia del 26 ottobre:** dopo l'attivazione, la vecchia ACTIVE deve coprire ancora il 26/10 e la TeachingSession B01 deve restare valida rispetto alla propria source version/slot.
- **Drift della baseline:** lezione/evento mancanti o duplicati devono produrre `FAIL_BASELINE_DRIFT`, mai autoriparazione o `NOT_APPLICABLE` nel gate locale.
- **TOCTOU tra dry-run e apply:** qualsiasi variazione di ACTIVE, DRAFT o dipendenze dopo il dry-run deve bloccare l'apply prima della prima scrittura.
- **Separazione local/remoto:** Beta/preview non devono eseguire la giornata congelata del 2 novembre né richiedere receipt baseline locali.

---

## File Structure

**Create**
- `product/e2e/support/hva-governed-baseline-config.cjs` — unica sorgente dei valori temporali/semantici v1 condivisa tra CJS ed ESM.
- `product/e2e/support/hva-governed-baseline-contract.mjs` — proiezione, validazione e fingerprint puro.
- `product/e2e/support/hva-governed-baseline-contract.test.mjs` — test del contratto e del drift.
- `product/e2e/support/hva-governed-baseline-runtime.mjs` — lettura AAL2 read-only del tenant e receipt runtime locale.
- `product/e2e/support/hva-recorded-lesson-fixture.test.mjs` — validità storica della fixture B01.
- `product/scripts/experience/hva-baseline-integrity.mjs` — CLI preflight/postflight read-only.
- `product/scripts/experience/hva-baseline-integrity.test.mjs` — confronto receipt e failure classification.
- `product/scripts/experience/hva-baseline-provision.mjs` — comando esplicito `--dry-run` / `--apply` per il provisioning una tantum.
- `product/scripts/experience/hva-baseline-provision.test.mjs` — precondizioni, plan fingerprint e rollback pre-activation.

**Modify**
- `product/e2e/support/hva-fixed-clock.cjs` — usa config v1, senza duplicare la data.
- `product/scripts/start-production.mjs` — usa lo stesso clock v1 solo nel target locale HVA già previsto.
- `product/e2e/support/e2e-auth.mjs` — continua ad allineare il browser soltanto per `EXPERIENCE_TARGET=local`.
- `product/e2e/support/hva-today-fixture.mjs` — delega al contratto v1 e usa `2026-11-02`.
- `product/e2e/support/hva-today-coexistence-fixture.mjs` — diventa esclusivamente read-only; rimuove insert/delete Calendario.
- `product/e2e/support/hva-today-fixture.test.mjs` — nuovi valori, source guards e failure cases.
- `product/e2e/support/hva-recorded-lesson-fixture.mjs` — aggiunge assert read-only della coerenza source version/slot.
- `product/e2e/experience/global-setup.mjs` — non provisiona più fixture persistenti; consuma solo assert read-only nel target locale.
- `product/e2e/experience/today-teacher-first.spec.mjs` — nessun `create/restore`; viene eseguito soltanto nel target locale governato.
- `.github/scripts/certification/hva-receipt-scope.mjs` — scope journey dipendente dal target.
- `.github/scripts/certification/hva-receipt-scope.test.mjs` — prova local vs beta/preview.
- `product/scripts/experience/acceptance-report.mjs` — integra baseline integrity soltanto quando applicabile.
- `.github/workflows/experience-acceptance.yml` — preflight/postflight solo nel job `hva-application`; nessun clock baseline nel job runtime remoto.
- `product/package.json` — aggiunge i nuovi test Node alla suite canonica.

---

### Task 1: Centralizzare il contratto temporale HVA-GOV-01/v1

**Files:**
- Create: `product/e2e/support/hva-governed-baseline-config.cjs`
- Modify: `product/e2e/support/hva-fixed-clock.cjs`
- Modify: `product/scripts/start-production.mjs`
- Modify: `product/e2e/support/hva-today-fixture.mjs`
- Test: `product/e2e/support/hva-governed-baseline-contract.test.mjs`

**Interfaces:**
- Produces: `HVA_BASELINE_ID`, `HVA_EFFECTIVE_FROM`, `HVA_LOCAL_DATE`, `HVA_CANONICAL_NOW`, `HVA_WEEKDAY`, `HVA_MINUTE_OF_DAY`, `HVA_CALENDAR_SOURCE_REF` exported from `hva-governed-baseline-config.cjs`.
- Consumes: nessuna interfaccia nuova.

- [ ] **Step 1: Write the failing clock/config tests**

Assert exactly:
```js
assert.equal(config.HVA_BASELINE_ID, 'HVA-GOV-01/v1')
assert.equal(config.HVA_EFFECTIVE_FROM, '2026-10-27')
assert.equal(config.HVA_LOCAL_DATE, '2026-11-02')
assert.equal(config.HVA_CANONICAL_NOW, '2026-11-02T08:30:00+01:00')
assert.equal(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'long' }).format(new Date(config.HVA_CANONICAL_NOW)), 'Monday')
```
Also assert source files no longer contain a second hard-coded canonical date.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `cd product && node --test e2e/support/hva-governed-baseline-contract.test.mjs`

Expected: FAIL because config does not exist / old `2026-10-19` values remain.

- [ ] **Step 3: Create the shared config and wire all local clock consumers**

`hva-fixed-clock.cjs` must require the config and keep only Date-preload behavior. `start-production.mjs` must read the same exported `HVA_CANONICAL_NOW`; `hva-today-fixture.mjs` must import the same config rather than declaring its own date. Do not add any fixed-clock behavior to beta/preview runtime.

- [ ] **Step 4: Run focused test and existing fixed-clock consumers**

Run: `cd product && node --test e2e/support/hva-governed-baseline-contract.test.mjs e2e/support/hva-today-fixture.test.mjs`

Expected: PASS for clock/config assertions; existing Today fixture may still fail only where it expects the old baseline shape.

- [ ] **Step 5: Commit**

```bash
git add product/e2e/support/hva-governed-baseline-config.cjs product/e2e/support/hva-governed-baseline-contract.test.mjs product/e2e/support/hva-fixed-clock.cjs product/scripts/start-production.mjs product/e2e/support/hva-today-fixture.mjs
git commit -m "test(hva): centralize governed baseline clock"
```

---

### Task 2: Implementare snapshot semantico e fingerprint fail-closed

**Files:**
- Create: `product/e2e/support/hva-governed-baseline-contract.mjs`
- Modify: `product/e2e/support/hva-governed-baseline-contract.test.mjs`
- Modify: `product/e2e/support/hva-today-fixture.mjs`
- Modify: `product/e2e/support/hva-today-coexistence-fixture.mjs`

**Interfaces:**
- Consumes: config Task 1.
- Produces:
  - `projectHvaBaselineSnapshot(input) -> snapshot`
  - `validateHvaBaselineSnapshot(snapshot) -> string[]`
  - `fingerprintHvaBaselineSnapshot(snapshot) -> string`
  - `HVA_EXPECTED_BASELINE_SNAPSHOT`.

- [ ] **Step 1: Write failing semantic contract tests**

Cover: exact happy path; missing 07:00 lesson; duplicate 07:00 lesson; wrong current lesson; wrong class/discipline; assignment not CONFIRMED; `weekly_minutes !== 120`; existing TeachingSession for the 07:00 occurrence; missing/duplicate calendar event; wrong `effective_from`; deterministic fingerprint despite input ordering.

- [ ] **Step 2: Verify RED**

Run: `cd product && node --test e2e/support/hva-governed-baseline-contract.test.mjs`

Expected: FAIL because projection/validation/fingerprint functions are absent.

- [ ] **Step 3: Implement the pure contract**

Fingerprint algorithm: canonical JSON serialization of the projected semantic object followed by `sha256`. Runtime UUIDs may be returned as diagnostics but must not enter the semantic hash.

- [ ] **Step 4: Delegate old Today validators to the new contract where semantics overlap**

Keep compatibility exports needed by existing tests; do not duplicate baseline rules in three files.

- [ ] **Step 5: Verify GREEN**

Run: `cd product && node --test e2e/support/hva-governed-baseline-contract.test.mjs e2e/support/hva-today-fixture.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add product/e2e/support/hva-governed-baseline-contract.mjs product/e2e/support/hva-governed-baseline-contract.test.mjs product/e2e/support/hva-today-fixture.mjs product/e2e/support/hva-today-coexistence-fixture.mjs
git commit -m "feat(hva): add governed baseline semantic contract"
```

---

### Task 3: Rendere verificabile la fixture storica del 26 ottobre senza migrarla

**Files:**
- Create: `product/e2e/support/hva-recorded-lesson-fixture.test.mjs`
- Modify: `product/e2e/support/hva-recorded-lesson-fixture.mjs`
- Modify: `product/e2e/experience/global-setup.mjs`

**Interfaces:**
- Produces: `assertHvaRecordedLessonFixture() -> Promise<fixture>` read-only.
- Preserves: `readHvaRecordedLessonFixture()` for journey consumers.

- [ ] **Step 1: Write failing fixture-validity tests**

Test that a source timetable version is valid when `effective_from <= 2026-10-26 <= effective_to`, including `status = ARCHIVED`; reject source version ending before 26/10; reject missing source slot; reject slot not matching 08:00–09:00; reject multiple independent current fixture records.

- [ ] **Step 2: Verify RED**

Run: `cd product && node --test e2e/support/hva-recorded-lesson-fixture.test.mjs`

Expected: FAIL because the current reader only checks marker/allocation/source IDs, not temporal coverage.

- [ ] **Step 3: Harden the reader and add read-only assert**

The assert must query the source version and source slot and prove that the version covers the TeachingSession `local_date`. It must accept the old version after it becomes ARCHIVED with `effective_to = 2026-10-26`.

- [ ] **Step 4: Remove persistent provisioning from normal local global setup**

Replace `ensureHvaRecordedLessonFixture()` with `assertHvaRecordedLessonFixture()` for the governed local HVA. Normal HVA must not create or repair the B01 session.

- [ ] **Step 5: Verify GREEN**

Run: `cd product && node --test e2e/support/hva-recorded-lesson-fixture.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add product/e2e/support/hva-recorded-lesson-fixture.mjs product/e2e/support/hva-recorded-lesson-fixture.test.mjs product/e2e/experience/global-setup.mjs
git commit -m "test(hva): preserve recorded lesson provenance across timetable versions"
```

---

### Task 4: Implementare scanner runtime read-only e receipt preflight/postflight locale

**Files:**
- Create: `product/e2e/support/hva-governed-baseline-runtime.mjs`
- Create: `product/scripts/experience/hva-baseline-integrity.mjs`
- Create: `product/scripts/experience/hva-baseline-integrity.test.mjs`
- Modify: `product/package.json`

**Interfaces:**
- Consumes: Task 2 contract, Task 3 fixture assert, `authenticatedAal2Supabase`.
- Produces:
  - `readHvaGovernedBaselineRuntime() -> { snapshot, fingerprint, runtimeIds, persistentFixtureIntegrity }`
  - CLI `node scripts/experience/hva-baseline-integrity.mjs preflight|postflight` per target locale.

- [ ] **Step 1: Write failing integrity tests**

Cover classification `PASS`, `FAIL_BASELINE_DRIFT`, `FAIL_FIXTURE_DRIFT`, `ERROR`; preflight/postflight fingerprint mismatch; missing preflight receipt; change in ACTIVE version between phases; source guard proving scanner contains no `.insert(`, `.update(`, `.delete(` or activation RPC.

- [ ] **Step 2: Verify RED**

Run: `cd product && node --test scripts/experience/hva-baseline-integrity.test.mjs`

Expected: FAIL because runtime/CLI do not exist.

- [ ] **Step 3: Implement read-only runtime queries**

Read context, active timetable, Monday slots, canonical assignment/discipline, 2-Nov TeachingSessions, canonical calendar event and legacy B01 source provenance. Return human-readable diagnostics plus runtime IDs outside the fingerprint.

- [ ] **Step 4: Implement CLI receipts**

Write `test-results/experience/baseline/preflight.json` and `postflight.json`. `postflight` must compare its live fingerprint and ACTIVE runtime identity with preflight and exit non-zero on any mismatch.

- [ ] **Step 5: Add tests to the canonical product test script**

Append new Node tests without removing existing suites.

- [ ] **Step 6: Verify GREEN**

Run: `cd product && node --test scripts/experience/hva-baseline-integrity.test.mjs && npm test`

Expected: PASS for unit suites. Do not expect live preflight PASS yet; the tenant is intentionally still baseline v0.

- [ ] **Step 7: Commit**

```bash
git add product/e2e/support/hva-governed-baseline-runtime.mjs product/scripts/experience/hva-baseline-integrity.mjs product/scripts/experience/hva-baseline-integrity.test.mjs product/package.json
git commit -m "feat(hva): add read-only baseline integrity gate"
```

---

### Task 5: Rendere `today-teacher-first` totalmente read-only e locale

**Files:**
- Modify: `product/e2e/support/hva-today-coexistence-fixture.mjs`
- Modify: `product/e2e/support/hva-today-fixture.test.mjs`
- Modify: `product/e2e/experience/today-teacher-first.spec.mjs`
- Modify: `product/e2e/experience/global-setup.mjs`

**Interfaces:**
- Produces: `assertHvaTodayCoexistenceRuntime() -> Promise<void>` read-only.
- Removes from normal HVA: `createHvaTodayCoexistenceFixture({ suffix })` and `restore()` semantics.

- [ ] **Step 1: Write failing source-guard and behavior tests**

Assert `hva-today-coexistence-fixture.mjs` performs no writes to `calendar_events`, `timetable_versions`, `timetable_slots`, `teaching_sessions`; assert missing canonical calendar event is drift rather than dynamically provisioned state; assert the browser spec skips for `EXPERIENCE_TARGET=beta|preview` and runs for `local`.

- [ ] **Step 2: Verify RED**

Run: `cd product && node --test e2e/support/hva-today-fixture.test.mjs`

Expected: FAIL because current code inserts/deletes a run-scoped calendar event and has no remote-target boundary.

- [ ] **Step 3: Remove Calendar setup/cleanup and make coexistence assertion read-only**

The local browser journey must only login, assert/read the governed baseline, render `/planner`, capture evidence and navigate to the lesson.

- [ ] **Step 4: Remove `try/finally fixture.restore()` and add target guard**

`today-teacher-first` must execute only when `EXPERIENCE_TARGET === 'local'`. A remote skip is a scope decision, not a PASS for the journey.

- [ ] **Step 5: Verify GREEN**

Run: `cd product && node --test e2e/support/hva-today-fixture.test.mjs`

Expected: PASS and source guards prove no baseline mutation path.

- [ ] **Step 6: Commit**

```bash
git add product/e2e/support/hva-today-coexistence-fixture.mjs product/e2e/support/hva-today-fixture.test.mjs product/e2e/experience/today-teacher-first.spec.mjs product/e2e/experience/global-setup.mjs
git commit -m "test(hva): make Today governed journey read only"
```

---

### Task 6: Rendere receipt e scope consapevoli del target

**Files:**
- Modify: `.github/scripts/certification/hva-receipt-scope.mjs`
- Modify: `.github/scripts/certification/hva-receipt-scope.test.mjs`
- Modify: `product/scripts/experience/acceptance-report.mjs`
- Modify: `.github/workflows/experience-acceptance.yml`
- Test: `product/scripts/experience/hva-baseline-integrity.test.mjs`

**Interfaces:**
- Consumes: preflight/postflight receipts Task 4.
- Produces local receipt fields: `baselineId`, `preflightFingerprint`, `postflightFingerprint`, `baselineIntegrity`, `persistentFixtureIntegrity`.
- Produces remote receipt state: baseline fields `NOT_APPLICABLE`; `today-teacher-first` excluded from expected journey coverage.

- [ ] **Step 1: Add failing target-scope tests**

Assert full `local` scope includes mandatory `today-teacher-first`; full `beta` and `preview` scopes exclude it. Focused local Today keeps two expected journey receipts (mobile+desktop). Remote scope must never convert the omitted journey into PASS.

- [ ] **Step 2: Add failing receipt tests**

For local: missing receipt, drift, or fixture invalidity forces a FAIL gate. For beta/preview: baseline receipt is not required and baseline gates render `NOT_APPLICABLE`.

- [ ] **Step 3: Verify RED**

Run:
```bash
node --test .github/scripts/certification/hva-receipt-scope.test.mjs
cd product && node --test scripts/experience/hva-baseline-integrity.test.mjs
```

Expected: FAIL until target is part of the scope/evaluation contract.

- [ ] **Step 4: Extend scope resolver with target**

`resolveHvaReceiptScope` must receive the target. `local` includes Today; remote targets do not.

- [ ] **Step 5: Update acceptance report**

Local only: add gates `baselineIntegrity` and `persistentFixtureIntegrity` and findings `HVA-BASELINE-DRIFT` / `HVA-PERSISTENT-FIXTURE-DRIFT`. Remote: both are `NOT_APPLICABLE` with no claim that the governed day was exercised.

- [ ] **Step 6: Add workflow preflight/postflight only to `hva-application`**

Run preflight after dependencies are installed and before build/browser; run postflight after browser and before receipt. Do **not** run fixed-date baseline preflight/postflight in `hva-runtime`; do not inject `HVA_FIXED_NOW` into a deployed Beta/preview target.

- [ ] **Step 7: Verify workflow and product tests**

Run:
```bash
node --test .github/scripts/certification/hva-receipt-scope.test.mjs
cd product
npm test
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add .github/scripts/certification/hva-receipt-scope.mjs .github/scripts/certification/hva-receipt-scope.test.mjs product/scripts/experience/acceptance-report.mjs product/scripts/experience/hva-baseline-integrity.test.mjs .github/workflows/experience-acceptance.yml
git commit -m "ci(hva): scope governed baseline to local acceptance"
```

---

### Task 7: Implementare il provisioning amministrativo dry-run/apply con lease semantica

**Files:**
- Create: `product/scripts/experience/hva-baseline-provision.mjs`
- Create: `product/scripts/experience/hva-baseline-provision.test.mjs`
- Modify: `product/package.json`

**Interfaces:**
- Consumes: config/contract/runtime Tasks 1–4, AAL2 Supabase client.
- Produces:
  - `--dry-run` → `test-results/experience/baseline/provision-plan.json` with `preconditionFingerprint`, ACTIVE/DRAFT IDs, planned mutations and SHA-256 of the plan.
  - `--apply --plan-file <path> --confirm HVA-GOV-01/v1` → explicit one-time execution only if live preconditions exactly match the plan.

- [ ] **Step 1: Write failing provisioning tests**

Cover: dry-run cannot call mutation methods; apply rejects missing confirmation; apply rejects stale plan fingerprint; DRAFT must be unique and status DRAFT; 07:00 slot must be free; assignment must match 2A/Tecnologia/120/CONFIRMED; interval 27-Oct→8-Nov must still contain no incompatible persistent state; rollback is invoked if failure occurs before activation; no automatic rollback is attempted after activation succeeds.

- [ ] **Step 2: Verify RED**

Run: `cd product && node --test scripts/experience/hva-baseline-provision.test.mjs`

Expected: FAIL because provisioner does not exist.

- [ ] **Step 3: Implement dry-run**

No writes. Inventory the exact current ACTIVE, DRAFT, legacy B01 provenance, future interval, assignment, Monday DRAFT slots and existing baseline calendar marker. Emit a deterministic plan and hash.

- [ ] **Step 4: Implement guarded apply using only AAL2/RLS and the canonical lifecycle RPC**

Before any write, re-read state and compare `preconditionFingerprint`. Reversible stage only:
1. update only the unique DRAFT `effective_from` to `2026-10-27`;
2. add 07:00–08:00 Monday lesson only to that DRAFT using the canonical assignment;
3. create exactly one 2-Nov baseline Calendar event.

Re-read and validate the prepared DRAFT. Only then call `activate_timetable_version` for that exact DRAFT. Never update the old ACTIVE directly. If a failure occurs before activation, remove only rows created by this command and restore the previous DRAFT date, then verify rollback. If activation succeeds, never self-repair the ACTIVE; run post-activation verification and emit a failing receipt if anything is unexpected.

- [ ] **Step 5: Add no-CI invocation guard test**

Assert `.github/workflows/experience-acceptance.yml` contains no invocation of `hva-baseline-provision.mjs`.

- [ ] **Step 6: Verify GREEN**

Run: `cd product && node --test scripts/experience/hva-baseline-provision.test.mjs && npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add product/scripts/experience/hva-baseline-provision.mjs product/scripts/experience/hva-baseline-provision.test.mjs product/package.json
git commit -m "feat(hva): add guarded governed-baseline provisioner"
```

---

### Task 8: Ottenere il RED reale prima di modificare il tenant

**Files:**
- Evidence only: `product/test-results/experience/baseline/preflight.json` (artifact, non commit).

**Interfaces:**
- Consumes: Tasks 1–7 code.
- Produces: evidence that current tenant is baseline v0 and fails for the intended missing-state reasons.

- [ ] **Step 1: Run static/product qualification first**

Run:
```bash
cd product
npm test
npm run typecheck
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Run live read-only preflight against the untouched tenant**

Run with `EXPERIENCE_TARGET=local`: `node scripts/experience/hva-baseline-integrity.mjs preflight`

Expected: **FAIL_BASELINE_DRIFT**, specifically because v1 is not yet in force and the governed 07:00 lesson / 2-Nov calendar event are absent. No row count or timestamp in the tenant may change.

- [ ] **Step 3: Run provisioning dry-run only**

Run: `node scripts/experience/hva-baseline-provision.mjs --dry-run`

Expected: plan is generated; zero mutations; it reports old ACTIVE covering 26-Oct, one target DRAFT, free 07:00 slot, canonical assignment, empty future interval and exact intended operations.

- [ ] **Step 4: Review dry-run receipt against spec**

Reject execution if any ID/state differs from the receipt or if new persistent data appeared in 27-Oct→8-Nov.

- [ ] **Step 5: Stop at the data-mutation boundary**

No database mutation belongs to this task. Task 9 starts only after the plan itself has been approved for execution.

---

### Task 9: Provisionare Baseline v1 una sola volta e verificare la storia

**Files:**
- Runtime data only; no schema migration.
- Evidence: `provision-plan.json`, `provision-result.json`, baseline preflight receipt.

**Interfaces:**
- Consumes: approved dry-run from Task 8.
- Produces: governed HVA-GOV-01/v1 runtime baseline.

- [ ] **Step 1: Re-run dry-run immediately before apply**

Expected: same semantic precondition fingerprint or a new plan must be reviewed; never reuse a stale plan.

- [ ] **Step 2: Execute explicit apply**

Run:
```bash
node scripts/experience/hva-baseline-provision.mjs \
  --apply \
  --plan-file test-results/experience/baseline/provision-plan.json \
  --confirm HVA-GOV-01/v1
```

Expected: DRAFT prepared, calendar event created, lifecycle activation succeeds, receipt status `PASS`.

- [ ] **Step 3: Verify temporal boundary**

Read-only assertions must prove previous ACTIVE is ARCHIVED and valid through `2026-10-26`; new ACTIVE starts `2026-10-27`.

- [ ] **Step 4: Verify legacy B01 unchanged**

Same TeachingSession ID as before provisioning; same source timetable version/slot; source version now ARCHIVED but covers `2026-10-26`; no superseding TeachingSession created by HVA-GOV-01.

- [ ] **Step 5: Run canonical local preflight**

Run: `cd product && EXPERIENCE_TARGET=local node scripts/experience/hva-baseline-integrity.mjs preflight`

Expected: `PASS`, baseline `HVA-GOV-01/v1` and stable fingerprint.

---

### Task 10: Qualificare browser locale focused, full HVA e postflight

**Files:**
- Evidence only; no product mutations.

**Interfaces:**
- Consumes: Baseline v1 PASS from Task 9.
- Produces: final local browser evidence for unblocking Task 9 of PR #726.

- [ ] **Step 1: Run focused Today HVA nel production build locale**

Run:
```bash
EXPERIENCE_TARGET=local \
EXPERIENCE_SCOPE_MODE=FOCUSED \
EXPERIENCE_SCOPE_SPECS=e2e/experience/today-teacher-first.spec.mjs \
npx playwright test e2e/experience/today-teacher-first.spec.mjs --config=playwright.experience.config.mjs
```

Expected on both mobile and desktop: exactly two lesson cards, one `LEZIONE DA REGISTRARE`, one `PROSSIMA LEZIONE`, canonical Calendar commitment visible, canonical lesson opens without phase URL.

- [ ] **Step 2: Run postflight immediately after focused HVA**

Run: `EXPERIENCE_TARGET=local node scripts/experience/hva-baseline-integrity.mjs postflight`

Expected: same fingerprint and ACTIVE runtime identity as focused preflight.

- [ ] **Step 3: Run full local HVA**

Run: `EXPERIENCE_TARGET=local npx playwright test --config=playwright.experience.config.mjs`

Expected: no regressions in legacy Registra/Teach, timetable, class, knowledge, calendar, visual/runtime guards; Today mandatory journey PASS mobile+desktop.

- [ ] **Step 4: Run final postflight and acceptance report**

Expected: `baselineIntegrity = PASS`, `persistentFixtureIntegrity = PASS`, preflight fingerprint equals postflight fingerprint; automated local gates contain no FAIL.

- [ ] **Step 5: Verify remote-scope contract without faking time**

Run unit scope tests proving `beta`/`preview` do not expect `today-teacher-first` and do not require baseline receipts. Do not claim remote evidence for the governed day.

- [ ] **Step 6: Re-run product qualification**

Run:
```bash
npm test
npm run typecheck
npm run build
```

Expected: PASS.

---

### Task 11: Publish isolated review candidate without touching PR #726

**Files:**
- No additional product changes unless review finds defects.

**Interfaces:**
- Produces: isolated HVA-GOV-01 review candidate, no merge.

- [ ] **Step 1: Verify branch base and exact head**

The implementation branch must descend from PR #726 exact head plus approved HVA-GOV documentation only; `feat/dos-ia-product-reset` remains unchanged.

- [ ] **Step 2: Perform whole-branch review**

Review focus: no hidden mutation in HVA workflow; no service-role; no self-heal; correct CET offset; historical B01 remains intact; local pre/post integrity cannot be bypassed by a browser PASS; remote HVA makes no fixed-date claim.

- [ ] **Step 3: Open a Draft PR targeting `feat/dos-ia-product-reset`**

Title suggestion: `HVA-GOV-01 — governed qualification baseline`.

Body must state: separate qualification infrastructure; no merge/deploy authorized; runtime baseline provisioned once and evidenced; PR #726 exact head not modified by opening this PR.

- [ ] **Step 4: Run CI and `hva/application` on the Draft PR and bind evidence to its exact head**

Expected: Product CI PASS, local HVA PASS with baseline integrity PASS, no unexpected governance gate regression.

- [ ] **Step 5: Stop at human decision**

Do not merge HVA-GOV-01 into the #726 branch and do not merge #726 into `develop` without a separate explicit decision.

---

## Final Self-Review Checklist

- Spec coverage: baseline, AAL2, no self-heal, read-only HVA, semantic fingerprint, pre/post equality, concurrency, calendar baseline, Today coexistence and historical B01 all map to explicit tasks.
- Temporal amendment coverage: `effective_from 2026-10-27`, canonical Monday `2026-11-02`, CET `+01:00`, no B01 migration.
- Target separation: fixed clock/baseline required only for `hva/application` local; Beta/preview do not simulate time and do not claim Today baseline coverage.
- TDD: Tasks 1–7 each start from a failing focused test and end with a commit.
- Mutation boundary: Tasks 1–8 do not alter canonical runtime data; Task 9 is the only baseline mutation task and requires a fresh dry-run plan plus explicit confirmation argument.
- Rollback: only reversible pre-activation writes are rolled back automatically; ACTIVE is never auto-repaired after activation.
- Review Focus tests are assigned to Tasks 1, 3, 4, 5, 6, 7 and 9.
- No merge/deploy is included in the plan.
