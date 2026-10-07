# DOC-04 Final Report Authoring, Finalization & Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the certified read-only final-report evidence bundle into a versioned, human-reviewed, finalizable and exportable institutional Relazione finale using the active canonical template.

**Architecture:** Compose the first draft deterministically from the evidence bundle + active template, persist semantic sections and source manifest alongside the immutable authored-document version, and keep validation/finalization as separate human decisions. Export renders the saved version through the institutional template and runs an output-purity gate before print/PDF.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Supabase/Postgres/RLS/RPC, existing X5 authored-document engine, DOC-TPL-01 renderer primitives, Node `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-07-documentazione-relazione-finale-design.md`

## Global Constraints

- Depends on successful DOC-TPL-01, DOC-01 generalized authoring, and DOC-04 evidence/readiness plans.
- First draft must be possible with AI disabled.
- Each save creates a new immutable version; no in-place mutation of saved versions.
- Source manifest/provenance is internal only and is never printed/exported.
- Validation and finalization are explicit human actions; assistant/copilot code paths cannot trigger them implicitly.
- A finalized version is immutable; later edits create a new version and later finalization creates a new current final while preserving historical finals.
- Export uses a saved version and exact template version.
- Professional output contains no CAN/Bxx, UUIDs, DB/entity names, workflow states, provider/model names, Drive paths, hashes, provenance or “generated automatically” wording.
- Programma svolto and Programmazione annuale remain separate documents.
- No new bottom-navigation slot.
- Native DOCX export is not part of this plan; print/PDF is the qualified pilot output. DOCX gets a later dedicated tranche.
- Reserve migration number `0062`; rebase and verify number availability before execution.

## Review Focus

- A source update after draft creation must not silently alter the saved version.
- A user who opens an old version must see/export that exact version, not current content.
- Finalizing v2 after v1 was final must preserve v1 as a historical final.
- A conflict save must preserve local edits and return the existing “reload before saving” class of error.
- Any technical token introduced by content, template data or assistance must block export until removed.

---

### Task 1: Persist semantic sections, source manifest and human decisions

**Files:**
- Create: `product/supabase/migrations/0062_authored_document_structure_and_decisions.sql`
- Create: `product/src/core/infrastructure/supabase/authored-document-structure-migration-contract.test.ts`
- Modify after generation if required: `product/src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces tables:
  - `authored_document_version_sections`
  - `authored_document_version_sources`
  - `authored_document_decisions`
- Produces RPCs:
  - `save_structured_authored_document_version(...) -> integer`
  - `authored_document_structured_snapshot(target_document_id uuid) -> jsonb`
  - `record_authored_document_decision(target_document_id uuid, target_version_no integer, decision text, note text) -> void`

- [ ] **Step 1: Write failing migration contract test**

Assert migration contains:

```ts
assert.match(sql, /authored_document_version_sections/)
assert.match(sql, /authored_document_version_sources/)
assert.match(sql, /authored_document_decisions/)
assert.match(sql, /VALIDATED/)
assert.match(sql, /FINALIZED/)
assert.match(sql, /save_structured_authored_document_version/)
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/infrastructure/supabase/authored-document-structure-migration-contract.test.ts`

- [ ] **Step 3: Implement migration**

Required rules:

- section rows reference an immutable version id and carry `section_key`, ordinal, title, content_markdown, classification;
- source rows reference exact version + optional section key + source kind/ref/version/fingerprint/minimal snapshot;
- decisions reference exact document version and actor/time;
- allowed decisions are `VALIDATED` and `FINALIZED`;
- direct authenticated writes revoked;
- RPC validates workspace membership and expected current version;
- `FINALIZED` decision does not mutate version content;
- latest FINALIZED decision determines current final; older finalized versions remain queryable;
- no decision RPC is called by generic assistant write boundaries.

- [ ] **Step 4: Run contract test and regenerate types**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/supabase/migrations/0062_authored_document_structure_and_decisions.sql product/src/core/infrastructure/supabase/authored-document-structure-migration-contract.test.ts product/src/lib/supabase/database.types.ts
git commit -m "feat: persist structured document versions and decisions"
```

---

### Task 2: Extend authored-document domain/repository for structured versions

**Files:**
- Modify: `product/src/core/domain/authored-document.ts`
- Modify: `product/src/core/domain/authored-document.test.ts`
- Modify: `product/src/core/infrastructure/supabase/supabase-authored-document-repository.ts`
- Modify: `product/src/core/infrastructure/supabase/supabase-authored-document-repository.test.ts`

**Interfaces:**
- Add domain types:

```ts
AuthoredDocumentSection
AuthoredDocumentSourceManifestEntry
AuthoredDocumentDecision
StructuredAuthoredDocumentSnapshot
```

- Add repository methods:

```ts
getStructured(documentId: string): Promise<StructuredAuthoredDocumentSnapshot | null>
saveStructured(input: {
  documentId: string
  expectedCurrentVersion: number
  title: string
  bodyMarkdown: string
  sections: AuthoredDocumentSectionDraft[]
  sources: AuthoredDocumentSourceManifestDraft[]
}): Promise<number>
recordDecision(input: {
  documentId: string
  versionNo: number
  decision: 'VALIDATED' | 'FINALIZED'
  note?: string | null
}): Promise<void>
```

- [ ] **Step 1: Write failing domain/repository tests**

Pin mapping, historical finals, section order, section-scoped source entries, and decision history.

- [ ] **Step 2: Run focused tests and verify RED**

- [ ] **Step 3: Implement domain/repository changes**

Keep existing `get()` and `save()` methods for UDA compatibility; structured methods are additive.

- [ ] **Step 4: Run tests + typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/domain/authored-document.ts product/src/core/domain/authored-document.test.ts product/src/core/infrastructure/supabase/supabase-authored-document-repository.ts product/src/core/infrastructure/supabase/supabase-authored-document-repository.test.ts
git commit -m "feat: support structured authored document versions"
```

---

### Task 3: Build deterministic Relazione finale draft composition

**Files:**
- Create: `product/src/core/application/compose-final-report-draft.ts`
- Create: `product/src/core/application/compose-final-report-draft.test.ts`

**Interfaces:**
- Consumes `FinalReportEvidenceBundle` and active `DocumentTemplateVersionDraft`.
- Produces:

```ts
export type FinalReportDraft = {
  title: string
  bodyMarkdown: string
  sections: AuthoredDocumentSectionDraft[]
  sources: AuthoredDocumentSourceManifestDraft[]
  missingTeacherInputs: string[]
}

export function composeFinalReportDraft(input: {
  bundle: FinalReportEvidenceBundle
  template: DocumentTemplateVersionDraft
}): FinalReportDraft
```

- [ ] **Step 1: Write failing composition tests**

Assert:

- identity fields populate from context;
- executed-path table is composed from documented current execution only;
- superseded sessions do not appear;
- unallocated activities can be represented in professional language without Bxx;
- `OUTCOMES`, `FINAL_REFLECTION`, and other human-required sections contain explicit neutral prompts/placeholders, not invented conclusions;
- source manifest contains internal refs while `bodyMarkdown` contains none;
- `assertInstitutionalOutputPurity(bodyMarkdown)` passes.

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/application/compose-final-report-draft.test.ts`

- [ ] **Step 3: Implement deterministic composer**

Do not call AI. Human-required missing content should be represented in the editor model as missing inputs; avoid printing technical placeholder tokens in the professional preview.

- [ ] **Step 4: Run test and verify GREEN**

- [ ] **Step 5: Commit**

```bash
git add product/src/core/application/compose-final-report-draft.ts product/src/core/application/compose-final-report-draft.test.ts
git commit -m "feat: compose deterministic final report drafts"
```

---

### Task 4: Wire `Crea bozza` to open and persist the first FINAL_REPORT version

**Files:**
- Create: `product/src/app/documentazione/relazioni-finali/[sectionId]/actions.ts`
- Create: `product/src/app/documentazione/relazioni-finali/[sectionId]/actions.test.ts`
- Modify: `product/src/app/documentazione/relazioni-finali/[sectionId]/FinalReportReadiness.tsx`

**Interfaces:**
- Produces server action/helper:

```ts
createFinalReportDraft(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  teachingDisciplineId: string
}): Promise<{ documentId: string; versionNo: number }>
```

- [ ] **Step 1: Write failing action tests with fakes**

Assert order:

1. load evidence;
2. require readiness `PRONTA_PER_BOZZA` or `RICHIEDE_INTEGRAZIONI` with sufficient factual base;
3. select active template;
4. compose deterministic draft;
5. `openFinalReport`;
6. persist structured version/manifest;
7. return document id/version.

Assert no source-domain writes occur.

- [ ] **Step 2: Run focused test and verify RED**

- [ ] **Step 3: Implement action and connect button**

After success navigate to `/documentazione/documenti/<documentId>`.

- [ ] **Step 4: Run tests + typecheck**

- [ ] **Step 5: Commit**

```bash
git add product/src/app/documentazione/relazioni-finali/[sectionId]
git commit -m "feat: create versioned final report draft"
```

---

### Task 5: Build the Relazione finale editor and version history

**Files:**
- Create: `product/src/app/documentazione/documenti/[documentId]/page.tsx`
- Create: `product/src/app/documentazione/documenti/[documentId]/FinalReportEditor.tsx`
- Create: `product/src/app/documentazione/documenti/[documentId]/final-report-editor-model.ts`
- Create: `product/src/app/documentazione/documenti/[documentId]/final-report-editor-model.test.ts`
- Create: `product/src/app/documentazione/documenti/[documentId]/final-report-editor.css`
- Create: `product/src/app/documentazione/documenti/[documentId]/actions.ts`
- Create: `product/src/app/documentazione/documenti/[documentId]/actions.test.ts`

**Interfaces:**
- Editor model exposes canonical section labels and content, version history, unsaved-change state, missing human inputs, and internal-only “Da dove viene?” drawer data.
- Save action:

```ts
saveFinalReportVersion(input: {
  documentId: string
  expectedCurrentVersion: number
  title: string
  sections: Array<{ sectionKey: string; contentMarkdown: string }>
}): Promise<{ versionNo: number }>
```

- [ ] **Step 1: Write failing editor-model tests**

Assert:

- section order follows stored template/version structure;
- technical field keys are not primary labels;
- source/provenance drawer is never included in printable model;
- saving with stale expected version returns conflict state and preserves local content;
- every successful save increments version.

- [ ] **Step 2: Run focused tests and verify RED**

- [ ] **Step 3: Implement editor + save action**

Use structured sections rather than one monolithic textarea. Plain text/Markdown per semantic section is sufficient; do not build a freeform block editor.

- [ ] **Step 4: Run tests, typecheck, build**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/app/documentazione/documenti/[documentId]
git commit -m "feat: edit and version final reports"
```

---

### Task 6: Add human validation and finalization

**Files:**
- Create: `product/src/app/documentazione/documenti/[documentId]/final-report-decision-model.ts`
- Create: `product/src/app/documentazione/documenti/[documentId]/final-report-decision-model.test.ts`
- Modify: `product/src/app/documentazione/documenti/[documentId]/FinalReportEditor.tsx`
- Modify: `product/src/app/documentazione/documenti/[documentId]/actions.ts`
- Modify: `product/src/app/documentazione/documenti/[documentId]/actions.test.ts`

**Interfaces:**
- Produces actions:

```ts
validateFinalReport(documentId: string, versionNo: number): Promise<void>
finalizeFinalReport(documentId: string, versionNo: number): Promise<void>
```

- [ ] **Step 1: Write failing decision tests**

Assert:

- incomplete required human inputs block validation;
- validation does not equal finalization;
- finalization requires explicit confirmation payload;
- finalizing v2 after v1 preserves both decision records and makes v2 current final;
- assistant/copilot write contract has no path to invoke these decisions.

- [ ] **Step 2: Run focused tests and verify RED**

- [ ] **Step 3: Implement decision model/actions/UI confirmation**

User-facing labels: `Valida la relazione`, `Finalizza`, and confirmation copy `Questa versione diventerà la versione finale corrente.`

- [ ] **Step 4: Run tests + typecheck**

- [ ] **Step 5: Commit**

```bash
git add product/src/app/documentazione/documenti/[documentId]
git commit -m "feat: add human final report decisions"
```

---

### Task 7: Render and export a clean institutional PDF/print view

**Files:**
- Create: `product/src/app/documentazione/documenti/[documentId]/export/page.tsx`
- Create: `product/src/app/documentazione/documenti/[documentId]/export/final-report-export-model.ts`
- Create: `product/src/app/documentazione/documenti/[documentId]/export/final-report-export-model.test.ts`
- Create: `product/src/app/documentazione/documenti/[documentId]/export/final-report-export.css`
- Reuse without breaking: `product/src/app/progetta/documenti/[documentId]/export/export-model.ts`
- Reuse: `product/src/core/presentation/institutional-document-preview.ts`

**Interfaces:**
- Produces:

```ts
buildFinalReportExportModel(snapshot: StructuredAuthoredDocumentSnapshot, requestedVersion?: string | null): FinalReportExportModel | null
```

- [ ] **Step 1: Write failing export tests**

Assert:

- requested historical version exports exactly that version;
- default export uses current saved version, not unsaved editor state;
- source manifest and internal classifications are absent;
- output-purity scan rejects Bxx/CAN/UUID/software entity/provider/path/hash/autogenerated wording;
- institutional heading, class, discipline, teacher, date/signature render with human labels.

- [ ] **Step 2: Run focused test and verify RED**

- [ ] **Step 3: Implement export model/page/styles**

Reuse A4/print patterns from X5B; generalize styling rather than copying UDA-specific copy.

- [ ] **Step 4: Run focused tests + build**

- [ ] **Step 5: Commit**

```bash
git add product/src/app/documentazione/documenti/[documentId]/export
git commit -m "feat: export clean institutional final reports"
```

---

### Task 8: Add contextual entry points without expanding mobile bottom navigation

**Files:**
- Modify: `product/src/app/classi/[sectionId]/page.tsx`
- Modify: `product/src/app/piano-annuale/page.tsx` or the current annual-plan section component that owns section actions
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/src/components/app-shell/navigation.test.ts`
- Create: `product/src/app/documentazione/documentation-entry-model.test.ts`

**Interfaces:**
- Context links:
  - Class workspace → `Relazione finale` when section/year/discipline context is valid.
  - Annual Plan → `Relazione finale` contextual link; no document duplication.
  - Full navigation → `Documentazione`.
- Mobile bottom navigation unchanged.

- [ ] **Step 1: Write failing entry-point tests**

Assert links preserve section/discipline context and no sixth mobile nav key appears.

- [ ] **Step 2: Run focused tests and verify RED**

- [ ] **Step 3: Implement contextual links**

Do not add seasonal auto-prompts to Home in this tranche unless the existing task model already exposes a stable hook; keep Home integration for a later UX pass if needed.

- [ ] **Step 4: Run tests + typecheck**

- [ ] **Step 5: Commit**

```bash
git add product/src/app/classi/[sectionId] product/src/app/piano-annuale product/src/components/app-shell/navigation.ts product/src/components/app-shell/navigation.test.ts product/src/app/documentazione/documentation-entry-model.test.ts
git commit -m "feat: add contextual documentation entry points"
```

---

### Task 9: End-to-end certification and Human Review package

**Files:**
- Create: `product/e2e/documentazione-final-report.spec.ts`
- Create: `docs/reviews/2026-10-07-doc-04-final-report-human-review.md`
- Modify: `product/package.json` only if explicit unit-test enumeration requires it.

**Interfaces:**
- E2E journey:

```text
Documentazione
→ Relazioni finali
→ sezione/disciplina
→ readiness
→ Crea bozza
→ completa sezioni umane
→ salva nuova versione
→ Da dove viene? (internal only)
→ Valida
→ Finalizza
→ export PDF/print
→ riapri versione storica e finale corrente
```

- [ ] **Step 1: Add E2E fixture with all required pilot conditions**

Fixture includes plan progress, current + superseded session, allocated + unallocated session, class/group observation, Knowledge reference, and no student names.

- [ ] **Step 2: Add E2E assertions**

Pin:

- correct readiness;
- no technical tokens in visible document/export;
- immutable version history;
- old final preserved after new finalization;
- print view contains only institutional/professional content;
- mobile journey has one primary action and no bottom-nav expansion.

- [ ] **Step 3: Run full verification**

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
# run repository-standard Playwright command for product/e2e/documentazione-final-report.spec.ts
```

Expected: all PASS.

- [ ] **Step 4: Perform Human Visual Acceptance on desktop + mobile + print preview**

Record PASS/REWORK with screenshots/evidence according to existing product review practice.

- [ ] **Step 5: Request independent whole-branch review**

No merge automatically. Resolve findings, rerun exact-head gates, then return to Human Review.

- [ ] **Step 6: Commit review evidence**

```bash
git add product/e2e/documentazione-final-report.spec.ts docs/reviews/2026-10-07-doc-04-final-report-human-review.md product/package.json
git commit -m "test: certify final report vertical"
```

## Self-Review

- Spec coverage: deterministic draft, structured versions, manifest, human validation/finalization, historical finals, clean export, contextual entry points, responsive/HVA and independent review all have tasks.
- Type consistency: structured repository methods consume Task 1 DB model; composer produces exactly the section/source drafts saved by Task 2; export reads the same snapshot.
- Review Focus coverage: source drift → Tasks 1/2/9; historical export → Task 7/9; multiple finals → Task 6/9; stale save → Task 5; technical leakage → Tasks 3/7/9.
