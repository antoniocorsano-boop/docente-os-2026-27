# DOC-01 Generalized Authored Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the existing UDA-only X5 authoring engine so it can safely host `FINAL_REPORT` documents while preserving the current UDA workflow unchanged.

**Architecture:** Extend the existing `authored_documents` model additively instead of replacing it. Keep `open_uda_authoring` as a compatibility contract and generalize schema/domain support for `FINAL_REPORT`, but **do not create a standalone title/body-only FINAL_REPORT opening boundary**. The first FINAL_REPORT version is created only by DOC-04 `create_structured_final_report_draft`, which creates/reuses identity and persists the first structured version, provenance and renderer pins atomically. Source/context fields remain conditional by document kind, with immutable versioning plus optimistic concurrency preserved. Renderer base/template pins are version-level concerns owned by DOC-04 structured authoring, not document-identity fields in this tranche.

**Tech Stack:** TypeScript, Supabase/Postgres/RLS/RPC, Next.js server runtime, Node `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-07-documentazione-relazione-finale-design.md`

## Global Constraints

- UDA X5A/X5B behavior must remain unchanged.
- `AuthoredDocumentKind` becomes `'UDA' | 'FINAL_REPORT'` only in this tranche.
- UDA still requires `source_asset_id`.
- FINAL_REPORT identity requires workspace, academic year, section and teaching discipline. Exact eligible institutional-base + family-template pins are selected and persisted on the first immutable version by DOC-04, not on the document identity here.
- Document creation is explicit; navigation alone never creates a document. For `FINAL_REPORT`, no unstructured open/create path may expose a first version before DOC-04 structured atomic creation.
- Every permitted save creates a new immutable version. The legacy/generic X5 title/body `save` path remains UDA-only in this tranche; `FINAL_REPORT` must fail closed with a stable `STRUCTURED_SAVE_REQUIRED`-style error and use DOC-04 structured save.
- Optimistic concurrency stays mandatory.
- Direct authenticated table writes remain revoked.
- No finalization/semantic sections/provenance tables in this plan; those belong to DOC-04 authoring plan.
- Migration number is not pre-reserved; at execution rebase on governed current `develop`, inspect integrated migration lineage and use the next free contiguous version.

## Review Focus

- Existing UDA rows with non-null `source_asset_id` must remain valid after migration.
- A FINAL_REPORT cannot be created for a section/discipline outside the active workspace/year.
- DOC-01 does not select renderer versions; DOC-04 first-version creation must reject blocked/retired/ineligible base or family-template versions and persist exact version-level pins.
- Concurrent saves must still fail with the existing reload-before-saving behavior.
- A generic refactor must not silently change UDA title/body limits or source-category validation.

---

### Task 1: Generalize the TypeScript authored-document domain without changing UDA semantics

**Files:**
- Modify: `product/src/core/domain/authored-document.ts`
- Create: `product/src/core/domain/authored-document.test.ts`

**Interfaces:**
- `AuthoredDocumentKind = 'UDA' | 'FINAL_REPORT'`.
- `AuthoredDocument` adds nullable `sourceAssetId`, `sectionId`, `teachingDisciplineId`. Renderer pins are not document-identity fields in this tranche.
- Produces:

```ts
isUdaAuthoredDocument(document: AuthoredDocument): boolean
isFinalReportAuthoredDocument(document: AuthoredDocument): boolean
validateAuthoredDocumentContext(document: AuthoredDocument): string[]
```

- [ ] **Step 1: Write failing tests**

Assert:

```ts
assert.deepEqual(validateAuthoredDocumentContext(validUda), [])
assert.deepEqual(validateAuthoredDocumentContext(validFinalReport), [])
assert.ok(validateAuthoredDocumentContext(udaWithoutSource).includes('UDA_SOURCE_REQUIRED'))
```

- [ ] **Step 2: Run test and verify RED**

Run: `cd product && npx tsx --test src/core/domain/authored-document.test.ts`

- [ ] **Step 3: Implement the minimal domain generalization**

Do not introduce final-report workflow states here.

- [ ] **Step 4: Run test and typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/domain/authored-document.ts product/src/core/domain/authored-document.test.ts
git commit -m "refactor: generalize authored document domain"
```

---

### Task 2: Add a backward-compatible Supabase migration

**Files:**
- Create: next free migration `<NNNN>_generalized_authored_documents.sql` after refreshing the integrated lineage
- Create: `product/src/core/infrastructure/supabase/generalized-authoring-migration-contract.test.ts`
- Modify after generation if required: `product/src/lib/supabase/database.types.ts`

**Interfaces:**
- Alters `authored_documents` with nullable `source_asset_id` plus `section_id`, `teaching_discipline_id`. Renderer pins are persisted at immutable-version level by DOC-04, not as mutable/current document identity metadata.
- Adds `FINAL_REPORT` to document-kind constraint.
- Adds partial uniqueness:
  - UDA unique by `workspace_id + source_asset_id + document_kind`.
  - FINAL_REPORT unique by `workspace_id + academic_year_id + section_id + teaching_discipline_id + document_kind`.
- **Does not** introduce `open_final_report_authoring(...)`; DOC-04 owns the sole first-version boundary through `create_structured_final_report_draft(...)`.
- Preserves `open_uda_authoring(...)` signature and behavior.

- [ ] **Step 1: Write failing SQL contract test**

Assertions must pin:

```ts
assert.match(sql, /document_kind.*FINAL_REPORT/s)
assert.doesNotMatch(sql, /open_final_report_authoring/)
assert.match(sql, /open_uda_authoring/)
assert.match(sql, /document changed; reload before saving/)
```

- [ ] **Step 2: Run test and verify RED**

Run: `cd product && npx tsx --test src/core/infrastructure/supabase/generalized-authoring-migration-contract.test.ts`

- [ ] **Step 3: Implement migration**

This migration only generalizes the authored-document schema and constraints needed by `FINAL_REPORT`; it must **not** create a title/body-only FINAL_REPORT row/version. Workspace/year/section/discipline validation and base/template eligibility for first creation belong to DOC-04 `create_structured_final_report_draft(...)`, where identity, structured v1, source manifest and exact renderer pins are persisted in one transaction.

The generalized schema must still make those context fields representable and enforce the uniqueness needed for one current FINAL_REPORT identity per workspace + academic year + section + discipline.

- [ ] **Step 4: Run SQL contract test and regenerate types**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/supabase/migrations/<NNNN>_generalized_authored_documents.sql product/src/core/infrastructure/supabase/generalized-authoring-migration-contract.test.ts product/src/lib/supabase/database.types.ts
git commit -m "feat: generalize versioned document persistence"
```

---

### Task 3: Generalize the Supabase authored-document repository

**Files:**
- Modify: `product/src/core/infrastructure/supabase/supabase-authored-document-repository.ts`
- Create: `product/src/core/infrastructure/supabase/supabase-authored-document-repository.test.ts`

**Interfaces:**
- Preserve:

```ts
openUda(input: OpenUdaInput): Promise<string>
get(documentId: string): Promise<AuthoredDocumentSnapshot | null>
save(input: SaveAuthoredDocumentVersionInput): Promise<number> // UDA-compatible path; FINAL_REPORT rejected
```

- Do **not** add `openFinalReport(...)`. Repository generalization may read/map FINAL_REPORT identities, but the legacy/generic `save(...)` path must reject `FINAL_REPORT`; first creation and every later FINAL_REPORT version are delegated to DOC-04 structured repository boundaries.

- [ ] **Step 1: Write failing repository tests**

Cover raw mapping for UDA and FINAL_REPORT, null source on FINAL_REPORT, absence of any standalone FINAL_REPORT opening RPC, unchanged UDA RPC mapping, and fail-closed rejection when generic `save(...)` targets a FINAL_REPORT.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd product && npx tsx --test src/core/infrastructure/supabase/supabase-authored-document-repository.test.ts`

- [ ] **Step 3: Implement repository changes**

Keep explicit RPC typing; do not weaken the raw document-kind type to arbitrary `string`.

- [ ] **Step 4: Run focused test + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/infrastructure/supabase/supabase-authored-document-repository.ts product/src/core/infrastructure/supabase/supabase-authored-document-repository.test.ts
git commit -m "feat: open final reports in authored document engine"
```

---

### Task 4: Add explicit regression coverage for the existing UDA authoring/export path

**Files:**
- Create: `product/src/app/progetta/documenti/uda-authoring-regression.test.ts`
- Modify only if required by type changes: `product/src/app/progetta/documenti/[documentId]/page.tsx`
- Modify only if required by type changes: `product/src/app/progetta/documenti/[documentId]/UdaAuthoringEditor.tsx`
- Modify only if required by type changes: `product/src/app/progetta/documenti/[documentId]/export/export-model.ts`

**Interfaces:**
- No new production interface; this task pins compatibility.

- [ ] **Step 1: Write regression tests**

Assert:

- UDA snapshots with `documentKind: 'UDA'` still select/export versions exactly as before;
- `sourceAssetId` is present for UDA;
- export version selection remains current-by-default and exact-version when requested;
- no FINAL_REPORT-only field is required by UDA UI models.

- [ ] **Step 2: Run regression test and verify failures only if type assumptions need adjustment**

Run: `cd product && npx tsx --test src/app/progetta/documenti/uda-authoring-regression.test.ts`

- [ ] **Step 3: Make the minimum compatibility edits**

Do not redesign the UDA authoring UI.

- [ ] **Step 4: Run regression + existing export model tests if present + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -- product/src/app/progetta/documenti/uda-authoring-regression.test.ts ':(literal)product/src/app/progetta/documenti/[documentId]'
git commit -m "test: preserve UDA authoring compatibility"
```

---

### Task 5: Certify the generalized authoring boundary

**Files:**
- Modify: `product/package.json` only if focused tests must be added to the explicit canonical test list.
- Modify: `docs/architecture/CAPABILITY_OWNERSHIP_CANONICAL.md`

**Interfaces:**
- Ownership note must state X5 owns authored document identity/version history only; DOC-TPL-01 owns template structure; verticals own composition logic.

- [ ] **Step 1: Add new tests to the canonical test script if required**

- [ ] **Step 2: Run full verification**

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 3: Verify SQL migration is additive**

Inspect that no existing UDA table/column is dropped, UDA RPC signature remains callable, and direct writes remain revoked.

- [ ] **Step 4: Update ownership contract**

Document the new authored-document kind without leaking implementation language into user-facing product copy.

- [ ] **Step 5: Commit**

```bash
git add product/package.json docs/architecture/CAPABILITY_OWNERSHIP_CANONICAL.md
git commit -m "docs: certify generalized document ownership"
```

## Self-Review

- Spec coverage: UDA compatibility, FINAL_REPORT context/schema support, **single structured atomic first-version boundary owned by DOC-04**, structured-only later FINAL_REPORT saves, immutable versions, optimistic concurrency and writer boundaries all have tasks.
- Type consistency: repository raw mapping matches Task 1 domain nullable fields.
- Review Focus coverage: legacy UDA → Tasks 2/4; cross-workspace context → Task 2; retired template → Task 2; concurrent save → Task 2/3; title/body/source regression → Tasks 2/4.
