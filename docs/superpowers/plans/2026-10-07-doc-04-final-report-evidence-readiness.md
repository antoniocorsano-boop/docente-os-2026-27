# DOC-04 Final Report Evidence & Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only final-report evidence bundle and readiness model that proves DOCENTE OS can reconstruct the planned-vs-actual teaching path for one section/discipline without creating or mutating a document.

**Architecture:** Reuse existing Annual Plan and TeachingSession repositories, add read-only readers for class/group observations/evidence references **and for the authoritative `MaterialUsageReceipt` stream owned by DOC-MAT-INT-01**, resolve eligible DOC-TPL institutional-base and FINAL_REPORT family-template sources, then compose a pure `FinalReportEvidenceBundle`. Readiness is deterministic and explanatory: it returns named missing items and consistency findings, never a cosmetic percentage.

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
- The read-only bundle carries an **internal compare-only freshness descriptor** derived from the authoritative plan/session/evidence/**material-usage-receipt** state used to compose it. It is never user-facing and never treated as document provenance text.
- Readiness must fail closed when no eligible active institutional base or no eligible active FINAL_REPORT family template is available; it must not offer `Crea bozza` for a configuration that first-version creation would necessarily reject.

## Review Focus

- A superseded session with evidence must contribute neither minutes nor evidence after replacement.
- A current unallocated session must remain visible rather than being dropped or force-mapped to a block.
- A block marked `SVOLTO` without a corresponding session must become a consistency finding, not an invented session.
- A session allocated to a still-`PIANIFICATO` block must become a consistency finding, not an automatic plan update.
- Empty evidence/observations must not prevent a factual draft when minimum planning/execution data exists, but must be reported as a missing professional input where required by the template.
- A material-use receipt committed after bundle load must change the authoritative receipt frontier and make the prior bundle stale before first-version creation.
- Missing eligible institutional base must be a readiness blocker, not a late create-time surprise.

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
  | 'MISSING_ACTIVE_INSTITUTIONAL_BASE'
  | 'MISSING_ACTIVE_TEMPLATE'
  | 'MISSING_DISCIPLINE_CONTEXT'

export type FinalReportEvidenceBundle = { /* exact fields pinned by tests, including internal evidenceFreshness */ }

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
- class observation and anonymous-group observation;
- a separate institutional-source fixture with an active FINAL_REPORT family template but **no eligible active institutional base**.

Assertions:

```ts
assert.equal(bundle.executed.totalActualMinutes, 120)
assert.equal(bundle.executed.supersededSessionCount, 1)
assert.equal(bundle.executed.unallocatedSessions.length, 1)
assert.ok(readiness.findings.some((f) => f.code === 'PLAN_BLOCK_WITHOUT_SESSION'))
assert.ok(readiness.findings.some((f) => f.code === 'SESSION_ON_PLANNED_BLOCK'))
assert.ok(missingBaseReadiness.findings.some((f) => f.code === 'MISSING_ACTIVE_INSTITUTIONAL_BASE'))
assert.notEqual(missingBaseReadiness.state, 'PRONTA_PER_BOZZA')
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
evidenceFreshness
```

- [ ] **Step 4: Run test and verify GREEN**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/domain/final-report-evidence.ts product/src/core/domain/final-report-evidence.test.ts
git commit -m "feat: compose final report evidence bundle"
```

---

### Task 2: Add read-only teaching-evidence and material-usage receipt readers

**Files:**
- Create: `product/src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.ts`
- Create: `product/src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.test.ts`
- Create: `product/src/core/infrastructure/supabase/supabase-material-usage-receipt-read-repository.ts`
- Create: `product/src/core/infrastructure/supabase/supabase-material-usage-receipt-read-repository.test.ts`

The receipt adapter is **read-only** and consumes the authoritative `teaching_session_material_usage_receipts` storage introduced/owned by DOC-MAT-INT-01. This tranche must not create a parallel receipt table, writer, lifecycle or authority model; if the authoritative receipt contract is not integrated yet, this reader remains an explicit implementation dependency rather than degrading to transient/caller-supplied objects.

**Interfaces:**
- Produces:

```ts
class SupabaseTeachingEvidenceReadRepository {
  listBySessionIds(sessionIds: string[]): Promise<{
    observations: TeachingObservation[]
    evidenceReferences: TeachingEvidenceReference[]
  }>
}

class SupabaseMaterialUsageReceiptReadRepository {
  listBySessionIds(sessionIds: string[]): Promise<MaterialUsageReceipt[]>
}
```

- [ ] **Step 1: Write failing mapping tests**

Cover:

- empty `sessionIds` → empty arrays and no DB query;
- only `CLASS` / `ANONYMOUS_GROUP` rows map successfully;
- observation/evidence rows outside requested session ids never appear;
- evidence references preserve `knowledgeAssetId` and `observationIds` as references only;
- material receipt reads are restricted to the requested session ids and map `acceptedRevision` plus the immutable `acceptedMaterialSnapshot` from authoritative persisted rows;
- no accepted extension without a persisted receipt is synthesized as used material;
- empty receipt session ids return an empty array without a DB query.

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.test.ts src/core/infrastructure/supabase/supabase-material-usage-receipt-read-repository.test.ts`

- [ ] **Step 3: Implement read-only repository**

Read existing `teaching_observations`, `teaching_evidence_references`, and link data created by the teaching-evidence migrations. Read material-use receipts only from the authoritative DOC-MAT-INT-01 storage. Do not add writes, duplicate receipt persistence, or new canonical tables in this tranche.

- [ ] **Step 4: Run test + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.ts product/src/core/infrastructure/supabase/supabase-teaching-evidence-read-repository.test.ts product/src/core/infrastructure/supabase/supabase-material-usage-receipt-read-repository.ts product/src/core/infrastructure/supabase/supabase-material-usage-receipt-read-repository.test.ts
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
  - `SupabaseTeachingEvidenceReadRepository.listBySessionIds(currentSessionIds)`.
  - `SupabaseMaterialUsageReceiptReadRepository.listBySessionIds(currentSessionIds)` over the authoritative DOC-MAT-INT-01 receipt store.
  - `SupabaseInstitutionalBaseRepository.listActive(workspaceId)` from DOC-TPL-01.
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
- `evidenceFreshness` deterministically captures the authoritative plan/session/evidence/**material-usage-receipt** frontier needed to detect source drift between readiness and first-version creation (for example exact plan/source refs, current-session/supersession frontier, and the sorted authoritative receipt identity/session/extension/accepted-revision set or an equivalent server-verifiable token);
- persisted receipts for current sessions are included in the bundle as the only authority for material use; `ACCEPTED` without a receipt remains available/planned;
- a receipt committed after bundle load changes the receipt frontier and therefore makes the previous freshness descriptor stale;
- at least one eligible active institutional base is required in `institutionalSources`; zero eligible bases yields `MISSING_ACTIVE_INSTITUTIONAL_BASE` and draft creation is not offered;
- active FINAL_REPORT template is required in `institutionalSources`;
- `listActive()` results are treated as identity-local eligible candidates, not as a global singleton and never selected by an implicit `[0]` assumption; exact renderer pins remain the responsibility of the authoring/create boundary;
- no write method is called;
- a supersession/source/receipt-state change produces a different freshness descriptor, while identical authoritative state reproduces the same descriptor.

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
- missing eligible institutional base maps to a professional message such as `Manca la veste istituzionale attiva per questa relazione.` and keeps `Crea bozza` disabled; the technical code `MISSING_ACTIVE_INSTITUTIONAL_BASE` never appears in serialized UI output;
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

Verify current/superseded, allocated/unallocated, plan/session mismatches, empty evidence, persisted-vs-absent material receipts, receipt-frontier staleness, missing institutional base/template blockers, and clean human language.

- [ ] **Step 4: Confirm no DB mutation occurs during the complete journey**

Use logs/network or repository spies in the fixture harness; opening readiness must be read-only.

- [ ] **Step 5: Commit**

```bash
git add product/package.json docs/architecture/FINAL_REPORT_EVIDENCE_READINESS_CANONICAL.md
git commit -m "docs: certify final report evidence readiness"
```

## Self-Review

- Spec coverage: planned/executed separation, supersession, unallocated sessions, aggregate evidence, deterministic readiness, no percentages, clean language and read-only behavior are all owned.
- Review Focus coverage: every listed failure mode is pinned in Task 1/3/4 tests and Task 6 browser fixture, including receipt-frontier freshness and institutional-base readiness.
- Type consistency: loader output is exactly `FinalReportEvidenceBundle`; view model consumes only that type.
