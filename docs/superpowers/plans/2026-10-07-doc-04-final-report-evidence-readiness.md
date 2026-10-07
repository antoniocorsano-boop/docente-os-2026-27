# DOC-04 Final Report Evidence & Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only final-report evidence bundle and readiness model that proves DOCENTE OS can reconstruct the planned-vs-actual teaching path for one section/discipline without creating or mutating a document.

**Architecture:** Reuse existing Annual Plan and TeachingSession repositories, add a read-only evidence reader for class/group observations and evidence references, then compose a pure `FinalReportEvidenceBundle`. Readiness is deterministic and explanatory: it returns named missing items and consistency findings, never a cosmetic percentage.

**Tech Stack:** TypeScript, Supabase read models/RLS, existing annual-plan/teaching-session domain, Next.js 16 server components, Node `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-07-documentazione-relazione-finale-design.md`

## Global Constraints

- This tranche is read-only: no authored document is opened or saved.
- Planned state and recorded TeachingSession state remain separate authorities.
- Only current TeachingSessions count; superseded sessions must never be double-counted.
- Sessions may be valid without Bxx allocation and must remain visible as unallocated activity.
- Only `CLASS` and `ANONYMOUS_GROUP` observations are allowed; no student names or individual student records.
- Observation states are supporting signals, not grades or automatic learning outcomes.
- Readiness states are: `DATI_INSUFFICIENTI`, `PRONTA_PER_BOZZA`, `RICHIEDE_INTEGRAZIONI`, `PRONTA_PER_REVISIONE` for this read-only tranche; `VALIDATA`/`FINALE` belong to later authoring.
- No percentages unless a later approved professional metric defines them.
- Technical codes may exist internally but the user-facing model must expose school-professional labels.
- No bottom-navigation slot is added.

## Review Focus

- A superseded session with evidence must contribute neither minutes nor evidence after replacement.
- A current unallocated session must remain visible rather than being dropped or force-mapped to a block.
- A block marked `SVOLTO` without a corresponding session must become a consistency finding, not an invented session.
- A session allocated to a still-`PIANIFICATO` block must become a consistency finding, not an automatic plan update.
- Empty evidence/observations must not prevent a factual draft when minimum planning/execution data exists, but must be reported as a missing professional input where required by the template.

---

### Task 1: Define the pure FinalReportEvidenceBundle domain

**Files:**
- Create: `product/src/core/domain/final-report-evidence.ts`
- Create: `product/src/core/domain/final-report-evidence.test.ts`

**Interfaces:**
- Produces:

```ts
export type FinalReportReadiness =
  | 'DATI_INSUFFICIENTI'
  | 'PRONTA_PER_BOZZA'
  | 'RICHIEDE_INTEGRAZIONI'
  | 'PRONTA_PER_REVISIONE'

export type FinalReportConsistencyCode =
  | 'PLAN_BLOCK_WITHOUT_SESSION'
  | 'SESSION_ON_PLANNED_BLOCK'
  | 'UNALLOCATED_SESSION'
  | 'REMAPPED_BLOCK'
  | 'RECOVERED_BLOCK'
  | 'CANCELLED_BLOCK'
  | 'MISSING_ACTIVE_TEMPLATE'
  | 'MISSING_DISCIPLINE_CONTEXT'

export type FinalReportEvidenceBundle = { /* exact fields pinned by tests */ }

export function composeFinalReportEvidenceBundle(input: FinalReportEvidenceInput): FinalReportEvidenceBundle
export function deriveFinalReportReadiness(bundle: FinalReportEvidenceBundle): {
  state: FinalReportReadiness
  missing: string[]
  findings: FinalReportConsistencyFinding[]
}
```

- [ ] **Step 1: Write failing tests for authority separation and supersession**

Fixtures must include:

- one current session and one superseded predecessor;
- one allocated and one unallocated current session;
- one `SVOLTO` Bxx with no session;
- one allocation pointing at a `PIANIFICATO` Bxx;
- class observation and anonymous-group observation.

Assertions:

```ts
assert.equal(bundle.executed.totalActualMinutes, 120)
assert.equal(bundle.executed.supersededSessionCount, 1)
assert.equal(bundle.executed.unallocatedSessions.length, 1)
assert.ok(readiness.findings.some((f) => f.code === 'PLAN_BLOCK_WITHOUT_SESSION'))
assert.ok(readiness.findings.some((f) => f.code === 'SESSION_ON_PLANNED_BLOCK'))
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/domain/final-report-evidence.test.ts`

- [ ] **Step 3: Implement the pure composition functions**

Reuse `currentTeachingSessions(snapshot)` from `teaching-session.ts`; do not duplicate supersession logic.

The bundle must expose separate groups:

```text
context
planned
executed
observed
institutionalSources
humanRequired
missingInformation
internalProvenance
```

- [ ] **Step 4: Run test and verify GREEN**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/domain/final-report-evidence.ts product/src/core/domain/final-report-evidence.test.ts
git commit -m "feat: compose final report evidence bundle"
```

---

### Task 2: Add a read-only teaching evidence repository

**Files:**
- Create: `product/src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.ts`
- Create: `product/src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.test.ts`

**Interfaces:**
- Produces:

```ts
class SupabaseTeachingEvidenceReadRepository {
  listBySessionIds(sessionIds: string[]): Promise<{
    observations: TeachingObservation[]
    evidenceReferences: TeachingEvidenceReference[]
  }>
}
```

- [ ] **Step 1: Write failing mapping tests**

Cover:

- empty `sessionIds` → empty arrays and no DB query;
- only `CLASS` / `ANONYMOUS_GROUP` rows map successfully;
- observation/evidence rows outside requested session ids never appear;
- evidence references preserve `knowledgeAssetId` and `observationIds` as references only.

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.test.ts`

- [ ] **Step 3: Implement read-only repository**

Read existing `teaching_observations`, `teaching_evidence_references`, and link data created by the teaching-evidence migrations. Do not add writes or new canonical tables.

- [ ] **Step 4: Run test + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.ts product/src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.test.ts
git commit -m "feat: read teaching evidence for documentation"
```

---

### Task 3: Add the server-side evidence loader

**Files:**
- Create: `product/src/core/application/load-final-report-evidence.ts`
- Create: `product/src/core/application/load-final-report-evidence.test.ts`

**Interfaces:**
- Consumes:
  - `SupabaseAnnualPlanExecutionRepository.list(workspaceId, academicYearId)`.
  - `SupabaseTeachingSessionRepository.listBySection(workspaceId, academicYearId, sectionId)`.
  - `SupabaseTeachingEvidenceReadRepository.listBySessionIds(sessionIds)`.
  - `SupabaseDocumentTemplateRepository.listActive(workspaceId, 'FINAL_REPORT')` from DOC-TPL-01.
- Produces:

```ts
loadFinalReportEvidence(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  teachingDisciplineId: string
}): Promise<FinalReportEvidenceBundle>
```

- [ ] **Step 1: Write failing orchestration tests using repository fakes**

Assert:

- section is resolved from Annual Plan snapshot and must match active year/workspace;
- sessions are filtered to the requested discipline when `disciplineId` is present;
- superseded sessions are retained only as internal provenance counts, not current execution;
- active FINAL_REPORT template is required in `institutionalSources`;
- no write method is called.

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/application/load-final-report-evidence.test.ts`

- [ ] **Step 3: Implement loader with dependency-injection-friendly helper**

Expose a pure-ish orchestration function accepting repositories as dependencies for tests; export a production wrapper that instantiates Supabase repositories.

- [ ] **Step 4: Run test + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/application/load-final-report-evidence.ts product/src/core/application/load-final-report-evidence.test.ts
git commit -m "feat: load final report evidence read model"
```

---

### Task 4: Build the user-facing readiness view model

**Files:**
- Create: `product/src/app/documentazione/relazioni-finali/final-report-readiness-model.ts`
- Create: `product/src/app/documentazione/relazioni-finali/final-report-readiness-model.test.ts`

**Interfaces:**
- Produces:

```ts
buildFinalReportReadinessViewModel(bundle: FinalReportEvidenceBundle): {
  heading: string
  stateLabel: string
  knownItems: Array<{ label: string; value: string }>
  missingItems: string[]
  warnings: string[]
  primaryAction: { label: string; enabled: boolean }
}
```

- [ ] **Step 1: Write failing language/behavior tests**

Assert:

- no `B03`, UUID, `TeachingSession`, `FINAL_REPORT`, `DERIVED`, etc. appears in serialized view model;
- no percent field exists;
- `PRONTA_PER_BOZZA` maps to primary label `Crea bozza`;
- insufficient data maps to `Controlla ciò che manca` and disabled draft creation;
- consistency findings are translated into human messages such as `Una parte dichiarata svolta non ha ancora una lezione associata.`

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/app/documentazione/relazioni-finali/final-report-readiness-model.test.ts`

- [ ] **Step 3: Implement view model**

Keep all technical codes inside mapping tables; output only professional Italian.

- [ ] **Step 4: Run test and verify GREEN**

- [ ] **Step 5: Commit**

```bash
git add product/src/app/documentazione/relazioni-finali/final-report-readiness-model.ts product/src/app/documentazione/relazioni-finali/final-report-readiness-model.test.ts
git commit -m "feat: add final report readiness model"
```

---

### Task 5: Add read-only Documentazione and Relazioni finali routes

**Files:**
- Create: `product/src/app/documentazione/page.tsx`
- Create: `product/src/app/documentazione/documentazione.css`
- Create: `product/src/app/documentazione/relazioni-finali/page.tsx`
- Create: `product/src/app/documentazione/relazioni-finali/[sectionId]/page.tsx`
- Create: `product/src/app/documentazione/relazioni-finali/[sectionId]/FinalReportReadiness.tsx`
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/src/components/app-shell/navigation.test.ts`

**Interfaces:**
- `/documentazione` → document-family hub.
- `/documentazione/relazioni-finali` → section/discipline list.
- `/documentazione/relazioni-finali/[sectionId]?discipline=<id>` → readiness detail.

- [ ] **Step 1: Extend navigation test first**

Assert `documentation` is present in full/secondary navigation and absent from `MOBILE_NAVIGATION_KEYS`.

- [ ] **Step 2: Add page-model tests or server-component contract tests**

Pin:

- heading format `Relazione finale · Tecnologia · 2C · 2026/27`;
- order: context → known → missing → warnings → primary action;
- no write action is called in this tranche.

- [ ] **Step 3: Run focused tests and verify RED**

- [ ] **Step 4: Implement routes/components**

The detail page may show `Crea bozza` disabled or as a non-mutating next-step affordance until DOC-01/DOC-04 authoring plan lands. Do not open a document from this tranche.

- [ ] **Step 5: Run focused tests, typecheck and build**

```bash
cd product
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add product/src/app/documentazione product/src/components/app-shell/navigation.ts product/src/components/app-shell/navigation.test.ts
git commit -m "feat: add read-only final report readiness surface"
```

---

### Task 6: Certify the read-only vertical

**Files:**
- Modify: `product/package.json` if explicit test enumeration requires it.
- Create: `docs/architecture/FINAL_REPORT_EVIDENCE_READINESS_CANONICAL.md`

**Interfaces:**
- Produces a frozen read-only contract consumed by the authoring plan.

- [ ] **Step 1: Add all new tests to canonical test script if required**

- [ ] **Step 2: Run full product verification**

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 3: Browser-certify a fixture with all Review Focus cases**

Verify current/superseded, allocated/unallocated, plan/session mismatches, empty evidence, and clean human language.

- [ ] **Step 4: Confirm no DB mutation occurs during the complete journey**

Use logs/network or repository spies in the fixture harness; opening readiness must be read-only.

- [ ] **Step 5: Commit**

```bash
git add product/package.json docs/architecture/FINAL_REPORT_EVIDENCE_READINESS_CANONICAL.md
git commit -m "docs: certify final report evidence readiness"
```

## Self-Review

- Spec coverage: planned/executed separation, supersession, unallocated sessions, aggregate evidence, deterministic readiness, no percentages, clean language and read-only behavior are all owned.
- Review Focus coverage: every listed failure mode is pinned in Task 1/3/4 tests and Task 6 browser fixture.
- Type consistency: loader output is exactly `FinalReportEvidenceBundle`; view model consumes only that type.
