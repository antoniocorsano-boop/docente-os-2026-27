# DOC-04 Final Report Authoring, Finalization & Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the certified read-only final-report evidence bundle into a versioned, human-reviewed, finalizable and exportable institutional Relazione finale using pinned `InstitutionalBaseVersion` + `DocumentTemplateVersion`.

**Architecture:** Create the first structured document version atomically from evidence + template, persist semantic sections and source manifest against the same immutable version, and treat `VALIDATED` and `FINALIZED` as trusted human decisions on an exact version. A version can become `FINALIZED` only after that **same immutable version** has a valid persisted `VALIDATED` decision. Export renders a saved version through its pinned base/template versions and runs output-purity checks.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Supabase/Postgres/RLS/RPC, X5 authored-document engine, DOC-TPL-01 renderer primitives, Node `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-07-documentazione-relazione-finale-design.md`

## Global Constraints

- Depends on reviewed/integrated DOC-TPL-01, DOC-01 generalized authoring and DOC-04 evidence/readiness work.
- First draft works with AI disabled.
- **No provenance-less v1:** document identity, first immutable version, structured sections and source manifest are created/completed atomically in one trusted transaction.
- Never implement `openFinalReport → unstructured v1 → saveStructured → v2` for initial creation.
- Each later save creates a new immutable version; no in-place mutation.
- Source manifest/provenance is internal only and never printed/exported.
- Validation and finalization are explicit human actions; assistant/copilot code paths cannot invoke them implicitly.
- Validation is version-specific and allowed only when mandatory teacher inputs are complete.
- Finalization is version-specific and is rejected unless the exact same immutable version already has a valid persisted `VALIDATED` decision.
- Saving a newer version does not transfer validation/finalization from the previous version.
- A finalized version remains immutable and historical; later edits create a new version that must be validated/finalized independently.
- Export uses a saved document version plus the exact pinned `InstitutionalBaseVersion` and `DocumentTemplateVersion`.
- Professional output contains no CAN/Bxx, UUID, DB/entity names, internal workflow states, provider/model names, Drive paths, hashes, provenance or “generato automaticamente”.
- Programma svolto and Programmazione annuale remain separate documents.
- No new bottom-navigation slot.
- Native DOCX is deferred; print/PDF is the pilot output.
- Migration number is **not pre-reserved**. At execution, rebase on current `develop`, inspect the runtime migration lineage and use the next free contiguous version.

## Review Focus

- Source changes after draft creation never silently alter a saved version.
- Historical export resolves the exact requested document/base/template versions.
- A direct `FINALIZED` attempt without same-version `VALIDATED` must fail at the trusted boundary.
- `VALIDATED(v1)` cannot authorize `FINALIZED(v2)`.
- Saving v2 after finalized v1 preserves v1 and resets decision requirements for v2.
- Initial creation yields exactly one structured v1, not a blank/unstructured historical v1 plus v2.
- Stale optimistic-concurrency save preserves local edits and returns reload/conflict semantics.
- Any technical token in professional output blocks export.

---

### Task 1: Trusted structured-version and decision persistence

**Files:**
- Create: next free migration `<NNNN>_authored_document_structure_and_decisions.sql`
- Create: migration contract test
- Modify generated database types if required.

**Tables/read models:**

- `authored_document_version_sections`
- `authored_document_version_sources`
- `authored_document_decisions`

Decisions:

```text
VALIDATED
FINALIZED
```

**Trusted RPC boundaries:**

```text
create_structured_final_report_draft(...) -> { document_id, version_no }
save_structured_authored_document_version(...) -> integer
authored_document_structured_snapshot(target_document_id) -> jsonb
record_authored_document_validation(target_document_id, target_version_no, ...) -> void
finalize_authored_document_version(target_document_id, target_version_no, ...) -> void
```

`create_structured_final_report_draft(...)` MUST execute in one transaction and either:

1. create/reuse the FINAL_REPORT document identity as appropriate;
2. create the first/current immutable version;
3. persist body/title;
4. persist semantic section rows;
5. persist source manifest/provenance;
6. persist pinned institutional-base version + family-template version;
7. return that exact `version_no`;

or roll back everything. No externally observable incomplete v1 is allowed.

**Decision invariants:**

- direct authenticated table writes are revoked;
- membership/workspace/document-kind/version checks occur in the trusted boundary;
- validation targets an existing immutable version and fails when mandatory professional inputs are incomplete;
- finalization targets the current exact immutable version and requires explicit human confirmation;
- finalization queries persisted decisions and fails unless `VALIDATED` exists for `target_document_id + target_version_no`;
- a `VALIDATED` decision on another version never satisfies the precondition;
- finalization never mutates version content;
- older finalized versions remain queryable.

- [ ] RED migration contract tests for tables/RPCs, atomic create, version/base/template pins and same-version validation→finalization invariant.
- [ ] RED test: `FINALIZED` without any validation is rejected.
- [ ] RED test: `VALIDATED(v1)` then `FINALIZED(v2)` is rejected.
- [ ] RED test: incomplete required inputs cannot record `VALIDATED`, therefore cannot finalize.
- [ ] Implement migration/RPCs minimally.
- [ ] Replay migrations + focused contract tests to GREEN; regenerate types.
- [ ] Commit.

---

### Task 2: Structured authored-document domain/repository

**Files:**
- Modify authored-document domain + tests.
- Modify Supabase authored-document repository + tests.

**Types:**

```ts
AuthoredDocumentSection
AuthoredDocumentSourceManifestEntry
AuthoredDocumentDecision
StructuredAuthoredDocumentSnapshot
```

Snapshot must include:

- document identity/current version;
- immutable versions;
- structured sections/sources;
- decision history by exact version;
- pinned `institutionalBaseVersionId`;
- pinned `templateVersionId`.

**Repository methods:**

```ts
createStructuredFinalReportDraft(input: ...): Promise<{ documentId: string; versionNo: number }>
getStructured(documentId: string): Promise<StructuredAuthoredDocumentSnapshot | null>
saveStructured(input: ...): Promise<number>
validateVersion(input: { documentId: string; versionNo: number; note?: string | null }): Promise<void>
finalizeVersion(input: { documentId: string; versionNo: number; confirmed: true; note?: string | null }): Promise<void>
```

- [ ] RED repository tests for atomic v1 mapping, section order, provenance, base/template pins and decision history.
- [ ] RED repository test: no API path can bypass same-version validation requirement.
- [ ] Preserve existing UDA compatibility additively.
- [ ] Implement and run focused tests + typecheck.
- [ ] Commit.

---

### Task 3: Deterministic Relazione finale draft composition

**Files:**
- Create `compose-final-report-draft.ts` + tests.

**Input:** reviewed `FinalReportEvidenceBundle` + pinned active canonical family template/base selection.

**Output:**

```ts
export type FinalReportDraft = {
  title: string
  bodyMarkdown: string
  sections: AuthoredDocumentSectionDraft[]
  sources: AuthoredDocumentSourceManifestDraft[]
  missingTeacherInputs: string[]
}
```

**Rules:**

- documented identity/execution facts may be prefilled;
- superseded sessions excluded;
- materials are described as actually used only when the evidence bundle contains explicit session-linked use evidence; `LessonDesignExtension.status=ACCEPTED` alone is insufficient;
- professional outcomes/reflection remain teacher inputs, never invented;
- source manifest is internal;
- body/preview passes institutional output purity.

- [ ] RED composition tests for all rules above.
- [ ] Implement without AI.
- [ ] Run focused test to GREEN.
- [ ] Commit.

---

### Task 4: `Crea bozza` creates the first structured version atomically

**Files:**
- Create actions/tests under `documentazione/relazioni-finali/[sectionId]/`.
- Modify readiness UI button only.

**Server action:**

```ts
createFinalReportDraft(input: {
  workspaceId: string
  academicYearId: string
  sectionId: string
  teachingDisciplineId: string
}): Promise<{ documentId: string; versionNo: number }>
```

**Required order:**

1. load evidence/readiness;
2. require adequate factual readiness;
3. resolve exact institutional-base version + FINAL_REPORT template version;
4. compose deterministic structured draft;
5. call **one atomic repository/RPC boundary** that creates/reuses document identity and persists the first structured immutable version + sections + sources + both pins;
6. return that exact document/version.

There is no preceding `openFinalReport` call that exposes a blank/unstructured v1.

- [ ] RED action test proves exactly one version is produced on first creation and it already has sections/sources/base/template pins.
- [ ] RED rollback test proves a source/section failure leaves no partial document/version.
- [ ] Assert no source-domain writes.
- [ ] Implement action and button, navigate to document editor.
- [ ] Run tests + typecheck.
- [ ] Commit.

---

### Task 5: Relazione finale editor and immutable history

**Files:**
- Create document page/editor/model/tests/actions/styles under `documentazione/documenti/[documentId]/`.

**Save:**

```ts
saveFinalReportVersion(input: {
  documentId: string
  expectedCurrentVersion: number
  title: string
  sections: Array<{ sectionKey: string; contentMarkdown: string }>
}): Promise<{ versionNo: number }>
```

Rules:

- structured semantic sections, not one monolithic editor;
- technical field keys/provenance are not ordinary labels;
- stale save returns conflict without destroying local content;
- every successful save creates a new immutable version;
- new version has no inherited `VALIDATED`/`FINALIZED` status even if previous version was final;
- exact base/template pins are retained or explicitly reselected through a governed new-version operation; never silently replaced by today’s active versions.

- [ ] RED editor/save/history tests.
- [ ] Implement.
- [ ] Run tests + typecheck + build.
- [ ] Commit.

---

### Task 6: Human validation and same-version finalization

**Files:**
- Create decision model/tests.
- Modify editor/actions/tests.

**Actions:**

```ts
validateFinalReport(documentId: string, versionNo: number): Promise<void>
finalizeFinalReport(documentId: string, versionNo: number, confirmed: true): Promise<void>
```

**Rules:**

- validation checks persisted required sections/teacher inputs for that exact immutable version;
- validation creates a persisted `VALIDATED` decision for that exact version;
- finalization requires explicit UI confirmation **and** trusted-boundary verification of same-version `VALIDATED`;
- `VALIDATED(v1)` cannot authorize `FINALIZED(v2)`;
- if v1 was final and v2 is saved, v1 remains historical final while v2 returns to unvalidated draft state;
- assistant/copilot has no decision path.

- [ ] RED: incomplete version cannot validate.
- [ ] RED: direct finalization without validation fails.
- [ ] RED: stale/cross-version validation fails finalization.
- [ ] RED: v1 final + save v2 preserves v1 but requires fresh v2 validation before v2 finalization.
- [ ] Implement decision UI/actions/RPC usage.
- [ ] Run tests + typecheck.
- [ ] Commit.

---

### Task 7: Clean institutional print/PDF export

**Files:**
- Create export route/model/tests/styles.
- Reuse institutional renderer and X5B print patterns.

`buildFinalReportExportModel(snapshot, requestedVersion)` must:

- export the exact requested saved document version;
- resolve its exact pinned institutional-base + family-template versions;
- default to current saved version, never unsaved editor state;
- omit source manifest/internal classifications;
- fail output-purity scan on technical tokens;
- render professional institution/class/discipline/teacher/date/signature labels.

- [ ] RED historical-version/base/template pin tests.
- [ ] RED purity tests.
- [ ] Implement and build.
- [ ] Commit.

---

### Task 8: Contextual entry points without bottom-nav expansion

**Files:**
- Modify Class workspace / Annual Plan contextual links.
- Modify navigation only for full `Documentazione` destination semantics; no sixth bottom-nav item.
- Add entry-model tests.

- [ ] RED tests for valid context links and unchanged mobile nav membership.
- [ ] Implement contextual links only.
- [ ] Run tests + typecheck.
- [ ] Commit.

---

### Task 9: End-to-end certification and Human Review

**Files:**
- Create final-report E2E scenario.
- Create Human Review evidence doc.
- Add tests to canonical suite if required.

**E2E journey:**

```text
Documentazione
→ Relazioni finali
→ readiness
→ Crea bozza (atomic structured v1)
→ completa input umani
→ salva versioni
→ Valida exact version
→ Finalizza same exact version
→ print/PDF
→ riapri versioni/finali storici
```

**Mandatory E2E negatives:**

- first creation never exposes blank/unstructured v1;
- direct FINALIZED without VALIDATED fails;
- VALIDATED on another version does not authorize finalization;
- source updates do not mutate saved versions;
- accepted-but-not-session-used material is not described as used;
- technical tokens absent from UI/export;
- bottom nav unchanged.

- [ ] Run full `npm test`, typecheck, lint, build.
- [ ] Run repository Browser/HVA/WCAG/security/governance gates selected by classifier on the exact head.
- [ ] Human Visual Acceptance desktop/mobile/print.
- [ ] Independent whole-branch review.
- [ ] Resolve findings and recertify new exact head.
- [ ] No automatic merge.

## Self-Review

- **Atomicity:** initial draft creation creates exactly one structured v1 with provenance and both renderer pins.
- **Decision integrity:** finalization is impossible without persisted same-version validation; decisions never carry across immutable versions.
- **History:** old finals remain queryable; new edits become new unvalidated versions.
- **Authority:** evidence supplies facts; teacher supplies professional judgement; assistant cannot validate/finalize.
- **Rendering:** historical document rendering uses saved base/template pins, never current defaults.
- **Scope:** print/PDF only; DOCX and broader automation remain deferred.
