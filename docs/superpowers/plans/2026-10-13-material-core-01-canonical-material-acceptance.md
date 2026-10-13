# MATERIAL-CORE-01 — Canonical Material Acceptance Implementation Plan

> **For agentic workers:** use superpowers:test-driven-development for every behavioral change and superpowers:verification-before-completion before claiming a task complete. Execute on an isolated branch/worktree from the then-current `develop` head. No provider runtime is part of this plan.

**Goal:** converge all teacher-confirmed lesson materials onto one canonical acceptance path: immutable Knowledge/canonical material revision → typed `LessonDesignExtension` state → `LessonPreparationManifest.materialSlots`, while preserving legacy evidence and eliminating metadata-only `APPROVED` as a parallel current acceptance authority.

**Prerequisite:** CPRI-01 qualified for the lesson contexts that require canonical annual-plan generation resolution. MATERIAL-CORE must not reintroduce static CAN-PLAN authority or provider-specific runtime.

**Design:** `docs/superpowers/specs/2026-10-13-material-orchestration-design.md`

## Global constraints

- Re-freeze execution baseline from current `develop`; do not reuse the design PR SHA as implementation authority.
- No new material acceptance table/store unless a later approved design proves the existing extension-owned representation incapable; default is typed state inside the existing `LessonDesignExtension` domain/payload.
- Reuse `LessonDesignExtension` status lifecycle: `PROPOSED | MODIFIED | ACCEPTED | DISMISSED`.
- `LessonPreparationManifest.materialSlots` remains the readiness composition.
- Every accepted material pins an immutable generation/revision; `assetId` alone or mutable URL alone cannot be `READY`.
- `LessonMaterialRole`, `artifactKind`, and `audience` remain distinct typed fields after acceptance.
- All six roles must be reconstructable from accepted state: `TEACHER_BRIEF`, `LIM_VIEW`, `STUDENT_HANDOUT`, `MINI_DECK`, `VISUAL_AID`, `ASSESSMENT`.
- Existing `knowledge_assets.source_metadata.approvalState` is preserved as historical/import evidence, but after reconciliation it cannot independently establish canonical acceptance/readiness.
- Never fabricate missing lesson/block/projection/CPRI/revision/actor evidence while reconciling legacy material.
- `PRE_CANONICAL_DIAGNOSTIC` material without an actual lesson/block association remains supporting/prepared material until explicit teacher association.
- No external provider invocation, Studio Atlas callback, OR-07 runtime, or DOS-A1 activation in this tranche.
- No student accounts, profiles, or tracking.
- Every write boundary authorizes and derives context server-side; UI state is not authority.
- Schema changes, if truly required, use the next free migration version on the execution exact head and preserve runtime-schema provenance/containment.
- Historical rows/evidence are preserved; no deletion/rewrite to make the new model look clean.

---

## Task 1 — Inventory legacy prepared/confirmed material and all consumers

**Primary files:**
- Read: `docs/architecture/CLASS_PREPARED_MATERIALS_CONTRACT.md`
- Read: `product/src/app/classi/class-workspace-model.ts`
- Search: repository-wide for `CLASS_LESSON_MATERIAL`, `approvalState`, `PENDING_HUMAN`, `APPROVED`, `Confermato`, `Predisposto`.
- Create: `product/scripts/experience/material-core-legacy-inventory.mjs`
- Create: `product/scripts/experience/material-core-legacy-inventory.test.mjs`

**Output:** deterministic, read-only classification of legacy data and code consumers.

- [ ] Write RED fixture tests for classification:

```text
PENDING_HUMAN + no canonical extension -> PREPARED_ONLY
APPROVED + exact immutable revision + exact lesson context + acceptance evidence -> RECONCILABLE
APPROVED + mutable URL only -> REVALIDATION_REQUIRED
APPROVED + no block/projection -> REVALIDATION_REQUIRED
PRE_CANONICAL_DIAGNOSTIC with no lesson block -> PREPARED_ONLY
unknown/invalid metadata -> BLOCKED_FOR_AUTOMATIC_RECONCILIATION
```

- [ ] Run RED and confirm failure because classifier does not exist.
- [ ] Implement pure classifier plus read-only environment inventory.
- [ ] Inventory every runtime consumer of metadata-only approval; no manually curated subset is sufficient.
- [ ] Record counts and identifiers without student data or secrets.
- [ ] Run GREEN.

**Stop condition:** no mutation until the actual environment inventory has been classified `READY_FOR_RECONCILIATION | REVALIDATION_REQUIRED | BLOCKED` by row and consumer category.

---

## Task 2 — Define and validate extension-owned typed material binding

**Primary files:**
- Modify: `product/src/core/domain/lesson-design-extension.ts`
- Create: `product/src/core/domain/lesson-material-binding.ts`
- Create: `product/src/core/domain/lesson-material-binding.test.ts`

**Target semantic types:**

```ts
type LessonMaterialRole =
  | 'TEACHER_BRIEF'
  | 'LIM_VIEW'
  | 'STUDENT_HANDOUT'
  | 'MINI_DECK'
  | 'VISUAL_AID'
  | 'ASSESSMENT'

type LessonMaterialArtifactKind =
  | 'PRESENTATION'
  | 'WORKSHEET'
  | 'GUIDE'
  | 'RUBRIC'
  | 'VISUAL'
  | 'ASSESSMENT'
  | 'OTHER'

type LessonMaterialAudience = 'TEACHER' | 'STUDENT' | 'MIXED'

type CanonicalMaterialRefV1 =
  | {
      kind: 'KNOWLEDGE_GENERATION'
      assetId: string
      generationId: string
      integrityDigest?: string
    }
  | {
      kind: 'IMMUTABLE_REVISION'
      assetId: string
      revisionRef: string
      integrityDigest: string
    }

interface LessonMaterialBindingV1 {
  schema: 'docente-os.lesson-material-binding.v1'
  role: LessonMaterialRole
  artifactKind: LessonMaterialArtifactKind
  audience: LessonMaterialAudience
  materialRef: CanonicalMaterialRefV1
  provenance: MaterialProposalProvenanceV1
}
```

- [ ] Write RED validator tests covering all six roles, all audiences, invalid schema, missing immutable revision, asset-only reference rejection, and malformed provenance.
- [ ] Add a typed parser/validator for `LessonDesignExtension.payload` (or equivalent extension-owned representation).
- [ ] Ensure new material acceptance cannot rely on `LessonDesignExtension.kind` alone.
- [ ] Preserve backward compatibility for historical extensions through explicit `LEGACY_EXTENSION` classification, not through new writes.
- [ ] Run focused domain tests + typecheck GREEN.

**Invariant:** transient candidate data may be discarded only after all canonical role/kind/audience/material/provenance state needed for later reconstruction is persisted in extension-owned accepted state.

---

## Task 3 — Resolve/materialize immutable accepted material revisions

**Primary files:**
- Inspect/modify the canonical Knowledge repository/service selected on the execution baseline.
- Create a focused application/domain boundary such as `resolveCanonicalAcceptedMaterialRevision(...)` only after repository inspection.
- Create focused tests next to that boundary.

**Input intent:** existing asset/revision or proposed/generated artifact.

**Output:** `CanonicalMaterialRefV1` that proves the exact reviewed content.

- [ ] Write RED tests:

```text
existing Knowledge generation explicitly selected -> immutable ref
assetId only -> rejected for acceptance
mutable provider URL only -> previewable, not acceptable/READY
external resource with canonical immutable snapshot/revision -> immutable ref
current generation advances after acceptance -> accepted ref still points to reviewed revision
rights/provenance mismatch -> fail closed
```

- [ ] Implement reuse path without duplicating the source archive.
- [ ] For mutable external/provider-backed resources, materialize or record an immutable canonical revision/snapshot before acceptance readiness.
- [ ] Preserve provider URL/object id as provenance only.
- [ ] Verify accepted revision remains stable when asset current pointer advances.
- [ ] Run focused tests + typecheck GREEN.

---

## Task 4 — Implement the canonical local acceptance boundary

**Primary files:**
- Modify/create the authoritative lesson-design application/repository boundary found on the execution baseline.
- Modify: `product/src/core/domain/lesson-design-extension.ts` as needed.
- Add focused application tests.
- Add a DB migration only if required after inspecting current persistence constraints.

**Conceptual command (not an RPC signature freeze):**

```ts
acceptLessonMaterialProposal({
  sectionId,
  blockId,
  candidateOrExistingAsset,
  resolvedRole,
  idempotencyKey,
})
```

**Server-derived/verified authority:** actor, workspace membership, section workspace/year, logical CAN-PLAN, CPRI source where required, block/projection context, immutable material revision, role/kind/audience, dedupe scope.

- [ ] RED: unauthenticated/unauthorized actor fails closed.
- [ ] RED: cross-workspace/year/context mismatch fails closed.
- [ ] RED: asset-only/mutable material reference fails closed.
- [ ] RED: conflicting retry under same idempotency key fails closed.
- [ ] RED: identical retry returns prior semantic result without duplicate acceptance.
- [ ] Implement one coherent acceptance operation that creates/updates the extension-owned typed material binding and applies existing `ACCEPTED` lifecycle semantics.
- [ ] Ensure no provider callback can invoke a privileged shortcut.
- [ ] Run focused application/DB tests GREEN.

**Invariant:** the local acceptance write does not create `AVAILABLE_FOR_LESSON`; readiness is derived after read-back through the canonical manifest.

---

## Task 5 — Make `materialSlots` reconstruct all six roles from accepted typed state

**Primary files:**
- Modify: `product/src/core/presentation/lesson-preparation-manifest.ts`
- Create: `product/src/core/presentation/lesson-preparation-materials.test.ts` if no existing focused test owns this behavior.

- [ ] RED: one accepted extension for each of the six roles yields the matching `READY` slot.
- [ ] RED: role/kind/audience remain distinct after serialization/deserialization through extension payload.
- [ ] RED: malformed/new extension without typed material binding cannot be treated as canonical ready material merely from `kind`.
- [ ] RED: historical TEACHER_RESOURCE/STUDENT_RESOURCE fallback remains explicitly classified and does not authorize new writes.
- [ ] Replace/augment `roleForExtension()` so canonical new material uses the typed material binding.
- [ ] Ensure `resourceRefs`/provenance resolve to the accepted immutable material revision through the extension reference chain.
- [ ] Run focused manifest tests + typecheck GREEN.

**Invariant:** after transient proposal data disappears, `LessonPreparationManifest` can still reconstruct every accepted material role and exact revision.

---

## Task 6 — Reconcile legacy `CLASS_LESSON_MATERIAL` confirmation and migrate class consumers

**Primary files:**
- Modify: `docs/architecture/CLASS_PREPARED_MATERIALS_CONTRACT.md`
- Modify: `product/src/app/classi/class-workspace-model.ts`
- Modify/create focused class-workspace material tests discovered on the execution baseline.
- Add a controlled reconciliation script/command only if Task 1 environment inventory proves automatic rows are safe.

- [ ] RED: `approvalState=APPROVED` alone no longer yields canonical `Confermato`/READY after the migration boundary.
- [ ] RED: `PENDING_HUMAN` remains discoverable as `Predisposto` and is not accepted.
- [ ] RED: reconciled typed accepted extension yields canonical `Confermato`.
- [ ] RED: legacy APPROVED lacking immutable revision or lesson context yields `REVALIDATION_REQUIRED`, not silent confirmation.
- [ ] RED: PRE_CANONICAL_DIAGNOSTIC without actual lesson association remains supporting/prepared and is not fabricated into a block-bound extension.
- [ ] Implement consumer migration so accepted state comes from canonical lesson composition/typed extension, not metadata approval alone.
- [ ] Preserve original `approvalState` metadata as historical/import provenance.
- [ ] For rows classified `RECONCILABLE`, use only the governed local reconciliation path and preserve audit evidence.
- [ ] For insufficient rows, surface bounded teacher re-association/revalidation; do not invent missing facts.
- [ ] Run focused tests GREEN.

**Completion gate:** no runtime consumer may treat metadata-only `APPROVED` as the current canonical acceptance authority.

---

## Task 7 — Enforce deletion/reference safety for accepted immutable revisions

**Primary files:**
- Inspect/modify current Knowledge deletion boundary and SQL function/policies on the execution baseline.
- Add focused domain/SQL tests.
- Add migration only if required.

- [ ] RED: deleting an asset/revision referenced by accepted typed lesson material fails closed.
- [ ] RED: changing asset `current_generation_id` does not invalidate or retarget accepted immutable reference.
- [ ] RED: explicit detach/replace can remove dependency only after canonical lesson state is updated and revalidated.
- [ ] Implement the smallest reference-safety mechanism consistent with current Knowledge ownership.
- [ ] Preserve historical provenance after detach/replace where policy requires it.
- [ ] Run SQL/domain tests GREEN.

---

## Task 8 — Exact-head qualification and canonical documentation

**Primary files:**
- Update: `docs/architecture/CLASS_PREPARED_MATERIALS_CONTRACT.md`
- Update: `docs/superpowers/specs/2026-10-13-material-orchestration-design.md` only for implementation-proven deltas that do not enlarge authority.
- Update/add certification wiring only if focused guards are not already in Product CI.

- [ ] Re-run repository-wide search for legacy acceptance authority:

```text
CLASS_LESSON_MATERIAL
approvalState
APPROVED
Confermato
roleForExtension
TEACHER_RESOURCE
STUDENT_RESOURCE
```

Classify every current-runtime occurrence.

- [ ] Verify terminal invariants:

```text
metadata-only current acceptance authorities = 0
accepted assetId-only refs = 0
new accepted mutable URL-only refs = 0
untyped accepted material extensions = 0
canonical roles not reconstructable = 0
provider-specific write authority = 0
historical evidence silently rewritten/deleted = 0
```

- [ ] Run full product verification on one exact head:

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

Run canonical SQL migration/replay/security/runtime-release contracts if any DB boundary changed.

- [ ] Request fresh independent review on that exact head.
- [ ] Resolve only technically verified findings.
- [ ] Classify Human Review impact; if required, it must reference the same exact head.
- [ ] No auto-merge or Beta promotion.

## Architecture completion criteria

MATERIAL-CORE-01 is complete only when:

1. the only current acceptance lifecycle is the existing `LessonDesignExtension` lifecycle with typed material binding;
2. every accepted lesson material pins an immutable canonical revision;
3. all six canonical roles survive acceptance as typed state and reconstruct correctly in `materialSlots`;
4. role, artifact kind, and audience remain distinct;
5. metadata-only `APPROVED` is historical provenance, not current canonical acceptance;
6. `selectPreparedClassMaterials()` and equivalent consumers derive canonical confirmation from lesson composition;
7. legacy confirmation is reconciled without inventing missing context or deleting evidence;
8. accepted material dependencies are deletion-safe;
9. no external provider runtime or DOS-A1 authority has been introduced;
10. exact-head verification, independent review, and applicable Human Review are clean.
