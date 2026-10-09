# DOC-TPL-01 Institutional Template Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable institutional-template foundation that can turn existing school documents or a blank institutional need into an approved canonical document system, with a separately versioned institutional base, separately versioned family templates, deterministic quality/privacy rules, clean preview, exact historical reconstruction and no technical references in professional output.

**Architecture:** Keep three concerns distinct. Source evidence is immutable input. `InstitutionalBaseVersion` owns shared institutional rendering (identity, header/footer, typography, page geometry, common tables, signatures and accessibility). `DocumentTemplateVersion` owns only family semantics (sections, fields, render roles, value/privacy/source policies). Supabase persists and reviews both version streams independently. Every preview/render operation receives an explicit base version and family-template version; no renderer silently substitutes the current active version for either pin.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Supabase/Postgres/RLS, Node `tsx --test`, existing DOCENTE OS app shell.

**Spec:** `docs/superpowers/specs/2026-10-07-institutional-document-template-engine-design.md`

## Global Constraints

- Existing Drive/DOCX models are sources of practice, not layout contracts to copy literally.
- Preserve source evidence separately from both the institutional base and the family template.
- `InstitutionalBaseVersion` and `DocumentTemplateVersion` are independent immutable version streams.
- `ACTIVE` base versions and `ACTIVE` family-template versions require deterministic Quality Review plus explicit Human Review.
- Lifecycle transitions are trusted, auditable operations; direct status writes are forbidden.
- `RETIRED` is terminal for the same registry identity in v1: historical versions remain resolvable, but activation rejects a retired base/template.
- `BLOCKED` stops use for new documents. It can return only to a reviewable state through an explicit trusted `clearBlock` decision; it cannot jump directly back to `ACTIVE`.
- A new source revision never mutates an active base or family template.
- A new institutional-base version never changes the rendering of an already saved/finalized document version.
- A new family-template version never changes the semantics/rendering of an already saved/finalized document version.
- Preview/render/export boundaries accept explicit base + family-template versions; they never resolve “latest/current” silently during historical rendering.
- Downstream authored-document versions must be able to pin exactly:

```text
institutional_base_id
institutional_base_version_no
family_template_id
family_template_version_no
```

- The engine must work with AI disabled.
- Tables/checklists/text are chosen by document function, not by legacy layout.
- Historical sensitive fields are not retained by inertia; privacy/minimization must be explicit.
- No CAN/Bxx codes, UUIDs, DB/entity names, provider names, hashes, internal states, Drive paths, provenance, or “generato automaticamente” wording may appear in the professional preview/output.
- No new mobile-bottom-navigation destination.
- Use RLS deny-by-default and RPC/application boundaries for writes.
- At execution time, refresh from the governed current `develop`, record the exact baseline SHA, determine the next free migration number from the integrated lineage and use it consistently in migration/contracts/tests. Do not rely on the historical `0060` placeholder.

## Review Focus

- Institutional styling must be updateable once as a new base version without copying it into every family template.
- Historical output must resolve the exact pinned institutional-base version even after a newer base becomes active.
- Retirement/blocking must never destroy historical resolution and must never be bypassed by a later activation call.
- Family-template changes must not carry or duplicate logo/header/typography/page-geometry definitions.
- A legacy source with duplicate/ambiguous sections must be improvable without mutating the source file.
- A template containing a technically named field internally must still render only human institutional labels externally.
- A source containing sensitive aggregate fields must not make them auto-populated or required by default.
- A template without a source document must still be creatable from purpose + sections + fields.
- A preview containing any forbidden technical token must fail closed before activation/export.

---

### Task 1: Define the institutional-base and family-template domains

**Files:**
- Create/Modify: `product/src/core/domain/document-template.ts`
- Create/Modify: `product/src/core/domain/document-template.test.ts`
- Create/Modify: `product/src/core/application/document-template-quality.ts`
- Create/Modify: `product/src/core/application/document-template-quality.test.ts`

**Interfaces:**

Keep family semantics in the existing template domain and add a first-class shared-base contract. The exact public types must be equivalent to:

```ts
export type InstitutionalBaseStatus =
  | 'DRAFT'
  | 'QUALITY_REVIEWED'
  | 'REVIEW_REQUIRED'
  | 'ACTIVE'
  | 'RETIRED'
  | 'BLOCKED'

export type InstitutionalBaseVersionDraft = {
  name: string
  version: number
  identityProfile: InstitutionalIdentityProfile
  headerProfile: InstitutionalHeaderProfile
  footerProfile: InstitutionalFooterProfile
  typographyProfile: InstitutionalTypographyProfile
  pageGeometryProfile: InstitutionalPageGeometryProfile
  commonTableProfile: InstitutionalCommonTableProfile
  signatureProfile: InstitutionalSignatureProfile
  accessibilityProfile: InstitutionalAccessibilityProfile
  sourceRevisionRefs: string[]
}

export type InstitutionalRenderPin = {
  institutionalBaseId: string
  institutionalBaseVersionNo: number
  familyTemplateId: string
  familyTemplateVersionNo: number
}

export type RegistryLifecycleDecision =
  | 'BLOCKED'
  | 'BLOCK_CLEARED'
  | 'RETIRED'
```

The profile types are deterministic serializable data only: no JSX, HTML, executable code, arbitrary CSS text, provider/model data or source provenance intended for professional output.

The family-template side continues to produce `DocumentTemplateKind`, `DocumentTemplateStatus`, `TemplateRenderRole`, `TemplateFieldType`, `TemplateValuePolicy`, `TemplatePrivacyClass`, `TemplateSection`, `TemplateField`, `DocumentTemplateVersionDraft`, `TemplateQualityFinding`, `TemplateQualityReview`.

Validation boundaries:

```ts
validateInstitutionalBase(draft: InstitutionalBaseVersionDraft): { valid: boolean; codes: string[] }
validateDocumentTemplate(draft: DocumentTemplateVersionDraft): { valid: boolean; codes: string[] }
reviewInstitutionalBase(draft: InstitutionalBaseVersionDraft): TemplateQualityReview
reviewDocumentTemplate(draft: DocumentTemplateVersionDraft): TemplateQualityReview
findForbiddenTechnicalReferences(text: string): string[]
```

- [ ] **Step 1: Write failing domain tests**

Pin at least:

```ts
assert.equal(validateInstitutionalBase(validBase).valid, true)
assert.equal(validateInstitutionalBase(baseWithArbitraryCssOrHtml).valid, false)
assert.equal(validateDocumentTemplate(validDraft).valid, true)
assert.deepEqual(validateDocumentTemplate(duplicateFieldDraft).codes, ['DUPLICATE_FIELD_KEY'])
assert.equal(reviewDocumentTemplate(requiredSensitiveDraft).result, 'REVIEW_REQUIRED')
assert.deepEqual(findForbiddenTechnicalReferences('Classe 2C · B03 · uuid 123e4567-e89b-12d3-a456-426614174000'), ['BXX_CODE', 'UUID'])
```

Also assert that `DocumentTemplateVersionDraft` contains no institutional-logo/header/footer/typography/page-geometry copy and that `InstitutionalRenderPin` requires both version streams.

- [ ] **Step 2: Run focused tests and verify RED**
- [ ] **Step 3: Implement the minimum domain types and validators.**
- [ ] **Step 4: Run focused tests and full typecheck to GREEN.**
- [ ] **Step 5: Commit only the Task 1 slice.**

Initial family kinds remain:

```ts
'FINAL_REPORT' | 'PROGRAM_CARRIED_OUT' | 'ANNUAL_PROGRAMMING' | 'UDA_INSTITUTIONAL'
```

Render roles remain:

```ts
'HEADING' | 'PARAGRAPH' | 'KEY_VALUE' | 'TABLE' | 'CHECKLIST' | 'CALLOUT' | 'SIGNATURE_BLOCK'
```

Technical-reference scanner categories include at least:

```ts
'CAN_CODE' | 'BXX_CODE' | 'UUID' | 'SOFTWARE_ENTITY' | 'INTERNAL_STATE' | 'HASH' | 'DRIVE_PATH' | 'AI_PROVIDER' | 'AUTO_GENERATED_WORDING'
```

---

### Task 2: Add two independently versioned registries with trusted lifecycle transitions

**Files:**
- Create/Modify: the next free migration, conceptually `<NNNN>_document_template_registry.sql`
- Create/Modify: `product/src/core/infrastructure/supabase/document-template-migration-contract.test.ts`
- Modify generated Supabase types only through the repository-standard process when required.

**Persistence contract:**

Shared source evidence:

```text
document_template_sources
```

Institutional-base registry:

```text
institutional_bases
institutional_base_versions
institutional_base_quality_reviews
institutional_base_lifecycle_decisions
```

Family-template registry:

```text
document_templates
document_template_versions
document_template_quality_reviews
document_template_lifecycle_decisions
```

Each lifecycle-decision row stores at least registry identity, decision, actor, timestamp, optional exact version reference where relevant, and a human-readable internal note/reason. It is audit evidence and is never emitted in professional output.

The base registry produces RPCs equivalent to:

```text
create_institutional_base(...) -> uuid
save_institutional_base_version(...) -> integer
record_institutional_base_quality_review(...) -> uuid
activate_institutional_base_version(...) -> void
block_institutional_base(target_base_id uuid, note text) -> void
clear_institutional_base_block(target_base_id uuid, note text) -> void
retire_institutional_base(target_base_id uuid, note text) -> void
institutional_base_snapshot(target_base_id uuid) -> jsonb
institutional_base_version_snapshot(target_base_id uuid, target_version_no integer) -> jsonb
```

The family-template registry produces:

```text
register_document_template_source(...) -> uuid
create_document_template(...) -> uuid
save_document_template_version(...) -> integer
record_document_template_quality_review(...) -> uuid
activate_document_template_version(...) -> void
block_document_template(target_template_id uuid, note text) -> void
clear_document_template_block(target_template_id uuid, note text) -> void
retire_document_template(target_template_id uuid, note text) -> void
document_template_snapshot(target_template_id uuid) -> jsonb
document_template_version_snapshot(target_template_id uuid, target_version_no integer) -> jsonb
```

**Trusted-boundary rules:**

- institutional-base versions and family-template versions are immutable historical rows;
- direct authenticated insert/update/delete is revoked for all registry/version/review/lifecycle-decision tables;
- SELECT is workspace-member scoped;
- every write RPC revalidates workspace membership and authenticated actor;
- activation of either stream requires a persisted trusted Quality Review result `PASS` or `PASS_WITH_NOTES` for that exact version plus explicit Human Review confirmation;
- activation rejects registry identities currently `RETIRED` or `BLOCKED`;
- `retire_*` is explicit, records `RETIRED`, clears the active pointer for future selection, preserves all historical versions/snapshots, and is terminal for the same registry identity in v1;
- `block_*` records `BLOCKED`, prevents selection/activation for new documents and preserves historical pin resolution;
- `clear_*_block` is the only path out of `BLOCKED`; it records `BLOCK_CLEARED` and moves the identity only to `REVIEW_REQUIRED` (or equivalent non-active review state). A separate successful review + Human Review + activation is still required;
- calling `activate_*` directly after `BLOCKED`, or on `RETIRED`, fails closed;
- saving a new version while blocked does not silently clear the block;
- activating a new version changes only the active pointer/status of its own stream and never rewrites the other stream;
- a new source revision does not mutate active versions;
- source IDs referenced by either stream must belong to the same workspace;
- snapshot-by-version RPCs resolve historical versions by explicit identity/version even after the identity is blocked/retired and never fall back to active/current versions;
- schema/profile payloads are validated JSON data, never rendered HTML/DOCX coordinates or executable styling.

- [ ] **Step 1: Write RED migration-contract assertions** for both base and family registry tables/RPCs, RLS/revokes, trusted activation, `block/clearBlock/retire`, lifecycle-decision evidence and explicit version snapshots.
- [ ] **Step 2: Add RED behavior cases** proving direct reactivation from `BLOCKED` fails, `clearBlock` does not activate, `RETIRED` cannot reactivate, and historical version snapshot resolution still works after block/retirement.
- [ ] **Step 3: Run the migration contract and verify RED.**
- [ ] **Step 4: Implement the migration minimally.** Do not duplicate institutional-base profile data inside `document_template_versions`.
- [ ] **Step 5: Replay the full Supabase migration chain and run the migration/behavior contracts to GREEN.**
- [ ] **Step 6: Regenerate/update Supabase types using the existing process.**
- [ ] **Step 7: Commit the persistence slice.**

---

### Task 3: Add separate repository boundaries for base and family versions

**Files:**
- Create/Modify: `product/src/core/infrastructure/supabase/supabase-institutional-base-repository.ts`
- Create/Modify: `product/src/core/infrastructure/supabase/supabase-institutional-base-repository.test.ts`
- Create/Modify: `product/src/core/infrastructure/supabase/supabase-document-template-repository.ts`
- Create/Modify: `product/src/core/infrastructure/supabase/supabase-document-template-repository.test.ts`

**Institutional-base repository contract:**

```ts
createBase(input: CreateInstitutionalBaseInput): Promise<string>
saveVersion(input: SaveInstitutionalBaseVersionInput): Promise<number>
recordQualityReview(input: RecordInstitutionalBaseQualityReviewInput): Promise<string>
activate(input: ActivateInstitutionalBaseVersionInput): Promise<void>
block(input: BlockInstitutionalBaseInput): Promise<void>
clearBlock(input: ClearInstitutionalBaseBlockInput): Promise<void>
retire(input: RetireInstitutionalBaseInput): Promise<void>
get(baseId: string): Promise<InstitutionalBaseSnapshot | null>
getVersion(baseId: string, versionNo: number): Promise<InstitutionalBaseVersion | null>
listActive(workspaceId: string): Promise<InstitutionalBaseSummary[]>
```

**Family-template repository contract:**

```ts
registerSource(input: RegisterTemplateSourceInput): Promise<string>
createTemplate(input: CreateTemplateInput): Promise<string>
saveVersion(input: SaveTemplateVersionInput): Promise<number>
recordQualityReview(input: RecordTemplateQualityReviewInput): Promise<string>
activate(input: ActivateTemplateVersionInput): Promise<void>
block(input: BlockDocumentTemplateInput): Promise<void>
clearBlock(input: ClearDocumentTemplateBlockInput): Promise<void>
retire(input: RetireDocumentTemplateInput): Promise<void>
get(templateId: string): Promise<DocumentTemplateSnapshot | null>
getVersion(templateId: string, versionNo: number): Promise<DocumentTemplateVersion | null>
listActive(workspaceId: string, kind?: DocumentTemplateKind): Promise<DocumentTemplateSummary[]>
```

Repository tests must prove:

- snake_case → domain mapping independently for both streams;
- current/active version pointers remain independent;
- explicit historical `getVersion()` resolves the requested version, not the current active version;
- RPC errors propagate;
- `block`, `clearBlock`, `retire` call only the matching trusted RPC and expose no generic status setter;
- listActive excludes BLOCKED/RETIRED identities;
- retired historical versions remain fetchable by exact identity/version;
- a family-template repository never synthesizes or embeds the base profile;
- an institutional-base repository never owns family sections/fields.

- [ ] **Step 1: Write RED repository tests.**
- [ ] **Step 2: Implement separate adapters following the existing explicit RPC typing pattern; no new ORM.**
- [ ] **Step 3: Run focused tests + full typecheck to GREEN.**
- [ ] **Step 4: Commit the repository slice.**

---

### Task 4: Encode the improved Relazione finale as a family template only

**Files:**
- Create/Modify: `product/src/core/presentation/final-report-canonical-template.ts`
- Create/Modify: `product/src/core/presentation/final-report-canonical-template.test.ts`

**Interfaces:**

```ts
FINAL_REPORT_CANONICAL_TEMPLATE_V1: DocumentTemplateVersionDraft
finalReportCanonicalTemplate(): DocumentTemplateVersionDraft
```

The family template owns semantic sections only. It must not embed logo, institution header/footer, typography, A4 geometry, common table styling or signature styling; those come from the separately resolved `InstitutionalBaseVersion`.

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

- [ ] **Step 1: Write RED tests** for section order, render roles, professional labels, sensitive defaults and absence of institutional-base duplication.
- [ ] **Step 2: Implement the canonical family draft.**
- [ ] **Step 3: Run family-template + quality tests to GREEN.**
- [ ] **Step 4: Commit.**

---

### Task 5: Build the first Template Builder / institutional-base review surface

**Files:**
- Create/Modify: `product/src/app/documentazione/modelli/template-builder-model.ts`
- Create/Modify: `product/src/app/documentazione/modelli/template-builder-model.test.ts`
- Create/Modify: `product/src/app/documentazione/modelli/page.tsx`
- Create/Modify: `product/src/app/documentazione/modelli/TemplateBuilder.tsx`
- Modify styles only inside the existing Documentazione/Modelli surface.
- Modify secondary/full navigation only as already approved; mobile bottom navigation membership remains unchanged.

**View-model boundary:**

The ordinary UI distinguishes two professional concepts without exposing technical IDs:

1. **Veste istituzionale** — shared base identity/format review, active/review/blocked/retired state and controlled lifecycle actions;
2. **Modello del documento** — family sections/fields/quality review and controlled lifecycle actions.

The builder/review surface may show internal version/provenance/lifecycle-decision details in an advanced control panel, but ordinary creation chooses the document type and uses only eligible active versions without asking the teacher for technical version IDs.

UI rules:

- `Blocca` and `Ritira` are explicit Human Review/control actions with confirmation and reason/note;
- a BLOCKED/RETIRED identity is never shown as selectable for a new document;
- `Rimuovi blocco` returns only to review-required state; it does not silently activate;
- historical preview by exact pin remains available to authorized control surfaces.

- [ ] **Step 1: RED view-model/navigation tests** proving the two streams remain distinct, human labels only, mobile navigation unchanged, and lifecycle actions/statuses follow the trusted contract.
- [ ] **Step 2: Implement the smallest review surface.** Do not build a WYSIWYG editor.
- [ ] **Step 3: Run focused tests, typecheck and build.**
- [ ] **Step 4: Commit.**

---

### Task 6: Render clean institutional output from explicit base + family versions

**Files:**
- Create/Modify: `product/src/core/presentation/institutional-document-preview.ts`
- Create/Modify: `product/src/core/presentation/institutional-document-preview.test.ts`

**Interfaces:**

The renderer must not accept a family template alone. It receives the exact resolved versions selected by the caller:

```ts
renderInstitutionalPreview(input: {
  institutionalBase: InstitutionalBaseVersion
  template: DocumentTemplateVersion
  values: Record<string, unknown>
}): InstitutionalPreview

renderPinnedInstitutionalPreview(input: {
  pin: InstitutionalRenderPin
  institutionalBase: InstitutionalBaseVersion
  template: DocumentTemplateVersion
  values: Record<string, unknown>
}): InstitutionalPreview

assertInstitutionalOutputPurity(text: string): void
```

`renderPinnedInstitutionalPreview` fails closed unless:

```text
pin.institutional_base_id/version_no == institutionalBase identity/version
pin.family_template_id/version_no == template identity/version
```

It must never resolve a current active base/template internally as a fallback. Historical rendering from an exact pin remains valid after the owning registry identity is BLOCKED or RETIRED.

**Rendering ownership:**

- institutional base owns logo/identity/header/footer/typography/page geometry/common table treatment/signature/accessibility;
- family template owns semantic order, field labels, visibility, render roles and value/source/privacy semantics;
- internal keys/policies/source refs/provenance/lifecycle decisions are never emitted.

- [ ] **Step 1: Write RED tests** for normal professional rendering, each forbidden technical-token family, and explicit base+template input.
- [ ] **Step 2: Add historical-pin tests:** render base v1 + template v1, activate/create v2 versions, then prove rendering the old pin still uses v1/v1 and fails if a v2 object is supplied against a v1 pin.
- [ ] **Step 3: Add lifecycle-history tests:** block/retire current registry identity, then prove exact historical pin rendering remains resolvable while new-document selection rejects the identity.
- [ ] **Step 4: Add separation tests:** changing only base version changes shared presentation without changing family schema; changing only family version changes semantics without silently changing base.
- [ ] **Step 5: Implement semantic preview + purity guard without DB lookups or implicit current-version resolution.**
- [ ] **Step 6: Run focused tests + full typecheck to GREEN.**
- [ ] **Step 7: Commit.**

---

### Task 7: Certify DOC-TPL-01 and publish the canonical architecture contract

**Files:**
- Modify `product/package.json` only when repository policy requires explicit test enumeration; preserve the union of all existing tests.
- Create/Modify: `docs/architecture/DOCUMENT_TEMPLATE_ENGINE_CANONICAL.md`

**Required verification:**

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

Repository certification must additionally prove on the same exact head:

- full Supabase migration replay;
- base-registry and family-registry migration contracts;
- institutional-base repository + family-template repository tests;
- trusted Quality Review/Human Review activation boundaries for both streams;
- trusted `block/clearBlock/retire` behavior and persisted lifecycle evidence for both streams;
- direct activation from BLOCKED fails; RETIRED cannot reactivate; clearBlock returns only to review-required state;
- explicit historical snapshot resolution for base and family versions after block/retirement;
- renderer pin mismatch fails closed;
- output purity;
- Template Builder/HVA/browser/accessibility gates selected by the repository classifier.

The architecture note records the stable ownership rule:

```text
InstitutionalBaseVersion = shared institutional presentation authority
DocumentTemplateVersion = family semantic authority
AuthoredDocumentVersion = content/version authority + exact pins to both
Registry lifecycle = trusted review/activation/block/clear/retire decisions with evidence
Renderer = pure composition of the exact pinned versions; no silent current-version lookup
```

- [ ] **Step 1: Add/repair test enumeration without deleting existing suites.**
- [ ] **Step 2: Run full local/CI verification and capture exact-head evidence.**
- [ ] **Step 3: Manually inspect pilot preview for professional purity and base/template separation.**
- [ ] **Step 4: Write/update the canonical architecture note.**
- [ ] **Step 5: Request independent review on the exact certified head.**
- [ ] **Step 6: Human Review remains final; no automatic merge.**

## Self-Review

- **First-class base:** Tasks 1–3 define, persist, activate, block, clear-block, retire and resolve `InstitutionalBaseVersion` independently from family templates.
- **Lifecycle completeness:** trusted transitions exist for both streams; `RETIRED` is terminal, BLOCKED cannot self-reactivate, and decision evidence is immutable/auditable.
- **Historical reconstruction:** Tasks 2/3/6 require explicit version snapshots and reject current-version fallback even after retirement/blocking.
- **Family separation:** Tasks 1/4 keep document semantics out of the institutional base and shared visual policy out of family schemas.
- **Renderer contract:** Task 6 consumes explicit base + family versions and verifies all four pin coordinates before rendering.
- **Source/canonical separation:** source evidence remains immutable and shared only as provenance input.
- **Quality/privacy/purity:** deterministic validation, trusted activation/lifecycle controls and output-purity gates apply before integration.
- **Scope:** no authored-document workflow or final-report content composition is implemented here; DOC-01/DOC-04 own compiled document versions and persist the four render pins downstream.
