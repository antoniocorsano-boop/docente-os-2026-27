# DOC-TPL-01 Institutional Template Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable institutional-template foundation that can turn existing school documents or a blank institutional need into an approved canonical template, with structured fields, quality review, privacy rules, clean preview, and no technical references in the exported document surface.

**Architecture:** Keep source evidence and canonical templates separate. Store versioned semantic template schemas in Supabase, evaluate them with deterministic quality/purity rules, and expose a first Template Builder surface under Documentazione. The builder must work without AI and must not modify the original Drive/Knowledge source.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Supabase/Postgres/RLS, Node `tsx --test`, existing DOCENTE OS app shell.

**Spec:** `docs/superpowers/specs/2026-10-07-institutional-document-template-engine-design.md`

## Global Constraints

- Existing Drive/DOCX models are sources of practice, not layout contracts to copy literally.
- Preserve source evidence separately from the improved canonical template.
- `ACTIVE` template versions require explicit Human Review.
- The engine must work with AI disabled.
- Tables/checklists/text are chosen by document function, not by legacy layout.
- Historical sensitive fields are not retained by inertia; privacy/minimization must be explicit.
- No CAN/Bxx codes, UUIDs, DB/entity names, provider names, hashes, internal states, Drive paths, provenance, or “generated automatically” wording may appear in the professional preview/output.
- No new mobile-bottom-navigation destination.
- Use RLS deny-by-default and RPC/application boundaries for writes.
- Reserve migration number `0060` for this tranche; before execution, rebase on latest `develop` and verify `0060` is still free. If not, renumber this plan mechanically before coding.

## Review Focus

- A legacy source with duplicate/ambiguous sections must be improvable without mutating the source file.
- A template containing a technically named field internally must still render only human institutional labels externally.
- A source containing sensitive aggregate fields must not make them auto-populated or required by default.
- A template without a source document must still be creatable from purpose + sections + fields.
- A preview containing any forbidden technical token must fail closed before activation/export.

---

### Task 1: Define the canonical template domain and deterministic validation

**Files:**
- Create: `product/src/core/domain/document-template.ts`
- Create: `product/src/core/domain/document-template.test.ts`
- Create: `product/src/core/application/document-template-quality.ts`
- Create: `product/src/core/application/document-template-quality.test.ts`

**Interfaces:**
- Produces `DocumentTemplateKind`, `DocumentTemplateStatus`, `TemplateRenderRole`, `TemplateFieldType`, `TemplateValuePolicy`, `TemplatePrivacyClass`, `TemplateSection`, `TemplateField`, `DocumentTemplateVersionDraft`, `TemplateQualityFinding`, `TemplateQualityReview`.
- Produces `validateDocumentTemplate(draft: DocumentTemplateVersionDraft): { valid: boolean; codes: string[] }`.
- Produces `reviewDocumentTemplate(draft: DocumentTemplateVersionDraft): TemplateQualityReview`.
- Produces `findForbiddenTechnicalReferences(text: string): string[]`.

- [ ] **Step 1: Write failing domain tests**

Add tests asserting:

```ts
assert.equal(validateDocumentTemplate(validDraft).valid, true)
assert.deepEqual(validateDocumentTemplate(duplicateFieldDraft).codes, ['DUPLICATE_FIELD_KEY'])
assert.equal(reviewDocumentTemplate(requiredSensitiveDraft).result, 'REVIEW_REQUIRED')
assert.deepEqual(findForbiddenTechnicalReferences('Classe 2C · B03 · uuid 123e4567-e89b-12d3-a456-426614174000'), ['BXX_CODE', 'UUID'])
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `cd product && npx tsx --test src/core/domain/document-template.test.ts src/core/application/document-template-quality.test.ts`

Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Implement the domain types and validators**

Implement the files above. Pin initial public document kinds to:

```ts
'FINAL_REPORT' | 'PROGRAM_CARRIED_OUT' | 'ANNUAL_PROGRAMMING' | 'UDA_INSTITUTIONAL'
```

Pin render roles to:

```ts
'HEADING' | 'PARAGRAPH' | 'KEY_VALUE' | 'TABLE' | 'CHECKLIST' | 'CALLOUT' | 'SIGNATURE_BLOCK'
```

Pin technical-reference scanner categories to at least:

```ts
'CAN_CODE' | 'BXX_CODE' | 'UUID' | 'SOFTWARE_ENTITY' | 'INTERNAL_STATE' | 'HASH' | 'DRIVE_PATH' | 'AI_PROVIDER' | 'AUTO_GENERATED_WORDING'
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/domain/document-template.ts product/src/core/domain/document-template.test.ts product/src/core/application/document-template-quality.ts product/src/core/application/document-template-quality.test.ts
git commit -m "feat: define institutional template domain"
```

---

### Task 2: Add versioned template persistence with RLS and human activation

**Files:**
- Create: `product/supabase/migrations/0060_document_template_registry.sql`
- Modify after generation if required: `product/src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces tables: `document_template_sources`, `document_templates`, `document_template_versions`, `document_template_quality_reviews`.
- Produces RPCs:
  - `register_document_template_source(...) -> uuid`
  - `create_document_template(...) -> uuid`
  - `save_document_template_version(...) -> integer`
  - `record_document_template_quality_review(...) -> uuid`
  - `activate_document_template_version(...) -> void`
  - `document_template_snapshot(target_template_id uuid) -> jsonb`

- [ ] **Step 1: Write migration contract assertions before SQL implementation**

Create `product/src/core/infrastructure/supabase/document-template-migration-contract.test.ts` that reads `0060_document_template_registry.sql` and asserts:

```ts
assert.match(sql, /enable row level security/)
assert.match(sql, /revoke insert, update, delete/)
assert.match(sql, /activate_document_template_version/)
assert.match(sql, /Human Review|quality_review/i)
assert.match(sql, /document_template_versions/)
```

- [ ] **Step 2: Run contract test and verify RED**

Run: `cd product && npx tsx --test src/core/infrastructure/supabase/document-template-migration-contract.test.ts`

Expected: FAIL because migration is missing.

- [ ] **Step 3: Implement `0060_document_template_registry.sql`**

Required DB rules:

- sources and template versions are immutable historical rows;
- direct authenticated writes are revoked;
- SELECT is workspace-member scoped;
- write RPCs validate workspace membership and authenticated actor;
- `activate_document_template_version` requires a persisted quality review with result `PASS` or `PASS_WITH_NOTES` and an explicit actor;
- a new source revision never mutates the active canonical template version;
- template schema is stored as validated `jsonb` payload, not as rendered HTML/DOCX coordinates;
- `source_asset_id` is nullable to support documents designed from scratch.

- [ ] **Step 4: Run migration contract test**

Expected: PASS.

- [ ] **Step 5: Regenerate or update Supabase types using the repository's existing process**

Verify TypeScript sees the new tables/RPCs. Do not hand-edit unrelated generated types.

- [ ] **Step 6: Commit**

```bash
git add product/supabase/migrations/0060_document_template_registry.sql product/src/core/infrastructure/supabase/document-template-migration-contract.test.ts product/src/lib/supabase/database.types.ts
git commit -m "feat: add institutional template registry"
```

---

### Task 3: Add the Supabase template repository

**Files:**
- Create: `product/src/core/infrastructure/supabase/supabase-document-template-repository.ts`
- Create: `product/src/core/infrastructure/supabase/supabase-document-template-repository.test.ts`

**Interfaces:**
- Produces class `SupabaseDocumentTemplateRepository` with:

```ts
registerSource(input: RegisterTemplateSourceInput): Promise<string>
createTemplate(input: CreateTemplateInput): Promise<string>
saveVersion(input: SaveTemplateVersionInput): Promise<number>
recordQualityReview(input: RecordTemplateQualityReviewInput): Promise<string>
activate(input: ActivateTemplateVersionInput): Promise<void>
get(templateId: string): Promise<DocumentTemplateSnapshot | null>
listActive(workspaceId: string, kind?: DocumentTemplateKind): Promise<DocumentTemplateSummary[]>
```

- [ ] **Step 1: Write failing adapter tests**

Test raw snake_case → domain mapping, null source support, active-version selection, and propagation of RPC errors.

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/infrastructure/supabase/supabase-document-template-repository.test.ts`

- [ ] **Step 3: Implement the repository**

Follow the existing explicit RPC typing pattern used by `supabase-authored-document-repository.ts`; do not add a new ORM.

- [ ] **Step 4: Run test and typecheck**

Run:

```bash
cd product
npx tsx --test src/core/infrastructure/supabase/supabase-document-template-repository.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/infrastructure/supabase/supabase-document-template-repository.ts product/src/core/infrastructure/supabase/supabase-document-template-repository.test.ts
git commit -m "feat: add template repository"
```

---

### Task 4: Encode the improved Relazione finale pilot as the first canonical template draft

**Files:**
- Create: `product/src/core/presentation/final-report-canonical-template.ts`
- Create: `product/src/core/presentation/final-report-canonical-template.test.ts`

**Interfaces:**
- Produces `FINAL_REPORT_CANONICAL_TEMPLATE_V1: DocumentTemplateVersionDraft`.
- Produces `finalReportCanonicalTemplate(): DocumentTemplateVersionDraft` returning a defensive copy.

- [ ] **Step 1: Write failing tests for the approved document structure**

Assert section order exactly:

```ts
[
  'IDENTITY',
  'CLASS_PROFILE',
  'EXECUTED_PATH',
  'OUTCOMES',
  'METHODS_TOOLS_INCLUSION',
  'ASSESSMENT',
  'CIVIC_TRANSVERSAL',
  'FINAL_REFLECTION',
  'SIGNATURE',
]
```

Assert `EXECUTED_PATH.renderRole === 'TABLE'`, `OUTCOMES.renderRole === 'PARAGRAPH'`, `CIVIC_TRANSVERSAL` is conditional, and no field label contains a technical term.

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/presentation/final-report-canonical-template.test.ts`

- [ ] **Step 3: Implement the canonical template draft**

Use only school-professional labels. Do not include BES/foreign-student counts in the default canonical template. Keep optional sensitive aggregate capability in the engine, not in this pilot template.

- [ ] **Step 4: Run template + quality tests**

Expected: PASS with `reviewDocumentTemplate(FINAL_REPORT_CANONICAL_TEMPLATE_V1).result === 'PASS'` or `PASS_WITH_NOTES` only for explicitly documented non-blocking notes.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/presentation/final-report-canonical-template.ts product/src/core/presentation/final-report-canonical-template.test.ts
git commit -m "feat: add improved final report template"
```

---

### Task 5: Build the first Template Builder read/review surface

**Files:**
- Create: `product/src/app/documentazione/modelli/template-builder-model.ts`
- Create: `product/src/app/documentazione/modelli/template-builder-model.test.ts`
- Create: `product/src/app/documentazione/modelli/page.tsx`
- Create: `product/src/app/documentazione/modelli/TemplateBuilder.tsx`
- Create: `product/src/app/documentazione/modelli/template-builder.css`
- Modify: `product/src/components/app-shell/navigation.ts`
- Modify: `product/src/components/app-shell/navigation.test.ts`

**Interfaces:**
- Produces `buildTemplateBuilderViewModel(snapshot, review): TemplateBuilderViewModel`.
- Adds navigation key `documentation` with href `/documentazione` to secondary/full navigation only.
- `MOBILE_NAVIGATION_KEYS` remains exactly `['home', 'today', 'classes', 'timetable']`.

- [ ] **Step 1: Write failing view-model and navigation tests**

Assert the builder exposes human labels only, groups sections in semantic order, shows review findings, and does not render internal field keys as primary labels.

Also assert mobile navigation membership is unchanged.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
cd product
npx tsx --test src/app/documentazione/modelli/template-builder-model.test.ts src/components/app-shell/navigation.test.ts
```

- [ ] **Step 3: Implement the builder model, route and navigation entry**

The first builder supports:

- source summary or “Nuovo modello”;
- section reorder/remove/merge decisions represented in the view model;
- render-role choice per section;
- value/privacy policy display in an advanced/internal panel;
- quality-review result;
- clean preview;
- explicit “Approva modello” action only when review allows activation.

Do not implement freeform WYSIWYG editing.

- [ ] **Step 4: Run focused tests, typecheck and build**

Run:

```bash
cd product
npx tsx --test src/app/documentazione/modelli/template-builder-model.test.ts src/components/app-shell/navigation.test.ts
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/app/documentazione/modelli product/src/components/app-shell/navigation.ts product/src/components/app-shell/navigation.test.ts
git commit -m "feat: add document template builder surface"
```

---

### Task 6: Enforce clean institutional preview/output

**Files:**
- Create: `product/src/core/presentation/institutional-document-preview.ts`
- Create: `product/src/core/presentation/institutional-document-preview.test.ts`

**Interfaces:**
- Produces:

```ts
renderInstitutionalPreview(input: {
  template: DocumentTemplateVersionDraft
  values: Record<string, unknown>
}): InstitutionalPreview

assertInstitutionalOutputPurity(text: string): void
```

- [ ] **Step 1: Write failing purity tests**

Assert normal school text passes and each forbidden family fails independently: `B03`, `CAN-PRG-2`, UUID, `TeachingSession`, `AUTO_DOCUMENTED`, Drive path, provider/model name, hash-like fingerprint, “generato automaticamente”.

- [ ] **Step 2: Run focused test and verify RED**

Run: `cd product && npx tsx --test src/core/presentation/institutional-document-preview.test.ts`

- [ ] **Step 3: Implement semantic preview rendering and purity guard**

Rendering rules:

- `TABLE` creates semantic rows/cells from field values;
- `PARAGRAPH` renders professional prose only;
- `CHECKLIST` renders human option labels only;
- internal keys/policies/provenance are never emitted.

- [ ] **Step 4: Run focused tests and full typecheck**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add product/src/core/presentation/institutional-document-preview.ts product/src/core/presentation/institutional-document-preview.test.ts
git commit -m "feat: enforce clean institutional document preview"
```

---

### Task 7: Certify DOC-TPL-01 without touching document authoring

**Files:**
- Modify: `product/package.json` only if the new focused tests must be added to the canonical `test` script.
- Create: `docs/architecture/DOCUMENT_TEMPLATE_ENGINE_CANONICAL.md`

**Interfaces:**
- Produces a concise architecture contract for later DOC-01/DOC-04 plans.

- [ ] **Step 1: Add the new tests to the canonical test command if repository policy requires explicit enumeration**

Do not remove or reorder unrelated tests.

- [ ] **Step 2: Run the full verification suite**

Run:

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all PASS.

- [ ] **Step 3: Verify output-purity fixtures manually**

Render the pilot template with sample values and confirm that no internal technical label appears in the preview.

- [ ] **Step 4: Write the canonical architecture note**

Document only stable ownership/boundary decisions; keep implementation internals out of user-facing terminology.

- [ ] **Step 5: Commit**

```bash
git add product/package.json docs/architecture/DOCUMENT_TEMPLATE_ENGINE_CANONICAL.md
git commit -m "docs: certify document template engine contract"
```

## Self-Review

- Spec coverage: source/canonical separation, improvement of old models, missing-model creation, quality review, privacy, renderer roles, builder, human activation, output purity all have owning tasks.
- Type consistency: all later tasks consume `DocumentTemplateVersionDraft` and `TemplateQualityReview` from Task 1.
- Review Focus coverage: duplicate/ambiguous legacy source → Tasks 1/5; technical field names → Tasks 1/6; sensitive legacy fields → Tasks 1/4; no-source template → Tasks 2/5; technical leak → Task 6.
- Proportion: implementation bodies are intentionally omitted; tests pin decisions and interfaces.
