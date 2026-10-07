# DOC-01 Generalized Authored Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the existing UDA-only X5 authoring engine so it can safely host `FINAL_REPORT` documents while preserving the current UDA workflow unchanged.

**Architecture:** Extend the existing `authored_documents` model additively instead of replacing it. Keep `open_uda_authoring` as a compatibility contract, add a final-report-specific opening boundary, make source/template/context fields conditional by document kind, and retain immutable versioning plus optimistic concurrency.

**Tech Stack:** TypeScript, Supabase/Postgres/RLS/RPC, Next.js server runtime, Node `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-07-documentazione-relazione-finale-design.md`

## Global Constraints

- UDA X5A/X5B behavior must remain unchanged.
- `AuthoredDocumentKind` becomes `'UDA' | 'FINAL_REPORT'` only in this tranche.
- UDA still requires `source_asset_id`.
- FINAL_REPORT requires workspace, academic year, section, teaching discipline, and active template version.
- Document opening is explicit; navigation alone never creates a document.
- Every save creates a new immutable version.
- Optimistic concurrency stays mandatory.
- Direct authenticated table writes remain revoked.
- No finalization/semantic sections/provenance tables in this plan; those belong to DOC-04 authoring plan.
- Reserve migration number `0061`; rebase and verify number availability before execution.

## Review Focus

- Existing UDA rows with non-null `source_asset_id` must remain valid after migration.
- A FINAL_REPORT cannot be opened for a section/discipline outside the active workspace/year.
- A FINAL_REPORT cannot use a retired/non-active template version.
- Concurrent saves must still fail with the existing reload-before-saving behavior.
- A generic refactor must not silently change UDA title/body limits or source-category validation.

---

### Task 1: Generalize the TypeScript authored-document domain without changing UDA semantics

**Files:**
- Modify: `product/src/core/domain/authored-document.ts`
- Create: `product/src/core/domain/authored-document.test.ts`

**Interfaces:**
- `AuthoredDocumentKind = 'UDA' | 'FINAL_REPORT'`.
- `AuthoredDocument` adds nullable `sourceAssetId`, `sectionId`, `teachingDisciplineId`, `templateVersionId`.
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
assert.ok(validateAuthoredDocumentContext(finalReportWithoutTemplate).includes('FINAL_REPORT_TEMPLATE_REQUIRED'))
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
- Create: `product/supabase/migrations/0061_generalized_authored_documents.sql`
- Create: `product/src/core/infrastructure/supabase/generalized-authoring-migration-contract.test.ts`
- Modify after generation if required: `product/src/lib/supabase/database.types.ts`

**Interfaces:**
- Alters `authored_documents` with nullable `source_asset_id` plus `section_id`, `teaching_discipline_id`, `template_version_id`.
- Adds `FINAL_REPORT` to document-kind constraint.
- Adds partial uniqueness:
  - UDA unique by `workspace_id + source_asset_id + document_kind`.
  - FINAL_REPORT unique by `workspace_id + academic_year_id + section_id + teaching_discipline_id + document_kind`.
- Produces `open_final_report_authoring(...) -> uuid`.
- Preserves `open_uda_authoring(...)` signature and behavior.

- [ ] **Step 1: Write failing SQL contract test**

Assertions must pin:

```ts
assert.match(sql, /document_kind.*FINAL_REPORT/s)
assert.match(sql, /open_final_report_authoring/)
assert.match(sql, /open_uda_authoring/)
assert.match(sql, /document changed; reload before saving/)
assert.match(sql, /template_version_id/)
```

- [ ] **Step 2: Run test and verify RED**

Run: `cd product && npx tsx --test src/core/infrastructure/supabase/generalized-authoring-migration-contract.test.ts`

- [ ] **Step 3: Implement migration**

`open_final_report_authoring` arguments:

```text
target_workspace_id uuid
target_academic_year_id uuid
target_section_id uuid
target_teaching_discipline_id uuid
target_template_version_id uuid
initial_title text
initial_body_markdown text
```

Server-side checks:

- authenticated workspace member;
- academic year belongs to workspace;
- section belongs to workspace/year;
- teaching discipline belongs to workspace/year and is valid for the section context according to existing assignment data;
- template version is `ACTIVE`, belongs to the workspace/institution scope and kind `FINAL_REPORT`;
- same existing 300-char title and 250000-char body limits;
- existing FINAL_REPORT is returned rather than duplicated.

- [ ] **Step 4: Run SQL contract test and regenerate types**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/supabase/migrations/0061_generalized_authored_documents.sql product/src/core/infrastructure/supabase/generalized-authoring-migration-contract.test.ts product/src/lib/supabase/database.types.ts
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
save(input: SaveAuthoredDocumentVersionInput): Promise<number>
```

- Add:

```ts
openFinalReport(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  teachingDisciplineId: string
  templateVersionId: string
  initialTitle: string
  initialBodyMarkdown: string
}): Promise<string>
```

- [ ] **Step 1: Write failing repository tests**

Cover raw mapping for UDA and FINAL_REPORT, null source on FINAL_REPORT, final-report RPC argument mapping, and unchanged UDA RPC mapping.

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
git add product/src/app/progetta/documenti/uda-authoring-regression.test.ts product/src/app/progetta/documenti/[documentId]
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

- Spec coverage: UDA compatibility, FINAL_REPORT context, active template dependency, immutable versions, optimistic concurrency and writer boundaries all have tasks.
- Type consistency: repository raw mapping matches Task 1 domain nullable fields.
- Review Focus coverage: legacy UDA → Tasks 2/4; cross-workspace context → Task 2; retired template → Task 2; concurrent save → Task 2/3; title/body/source regression → Tasks 2/4.
