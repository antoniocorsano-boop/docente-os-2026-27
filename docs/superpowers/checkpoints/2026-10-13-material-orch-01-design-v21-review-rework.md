# MATERIAL-ORCH-01 — Design v2.1 Fresh-Review Rework

**Date:** 2026-10-13  
**PR:** #703  
**First fresh-review exact head:** `7b8404169f4d6c364c74270a04e57e2a7eaf9ee8`  
**Status after review:** `REWORK_REQUIRED / IMPLEMENTATION_HOLD`

## 1. What the first fresh review established

The first post-rewrite independent Codex review completed on exact head `7b840416...`. The five original findings had been corrected and their old threads were resolved/outdated, but the new exact-head review identified three additional P1 architecture gaps in MATERIAL-CORE.

These findings were verified against the current `develop` runtime/code before changing the design.

## 2. P1 — legacy metadata-only confirmation remains a parallel acceptance path

Verified evidence:

- `docs/architecture/CLASS_PREPARED_MATERIALS_CONTRACT.md` defines `knowledge_assets.source_metadata.approvalState = PENDING_HUMAN | APPROVED`;
- `product/src/app/classi/class-workspace-model.ts::selectPreparedClassMaterials()` maps metadata `APPROVED` directly to UI `Confermato`;
- this path does not require a `LessonDesignExtension` or `LessonPreparationManifest.materialSlots` representation.

### Design correction

MATERIAL-ORCH v2.1 now makes reconciliation mandatory inside MATERIAL-CORE-01:

- inventory all `CLASS_LESSON_MATERIAL` rows/consumers;
- preserve `approvalState` as historical/import evidence;
- `PENDING_HUMAN` remains prepared/discovery state;
- legacy `APPROVED` is legacy confirmation evidence, not permanent canonical acceptance authority;
- automatically reconcile only when exact lesson context, immutable material revision and sufficient acceptance evidence exist;
- otherwise require explicit bounded revalidation/re-association;
- migrate `selectPreparedClassMaterials()` and equivalent consumers so canonical `Confermato`/READY state derives from accepted typed lesson composition;
- `PRE_CANONICAL_DIAGNOSTIC` without an actual lesson association remains supporting/prepared material and is not fabricated into a canonical block.

## 3. P1 — accepted role/kind/audience would be lost after transient proposal disposal

Verified evidence:

- `LessonPreparationManifest` defines six canonical `LessonMaterialRole` values;
- current `roleForExtension()` derives only:
  - `TEACHER_RESOURCE -> TEACHER_BRIEF`;
  - `STUDENT_RESOURCE -> STUDENT_HANDOUT`;
- `LessonDesignExtension` already owns a `payload: Record<string, unknown>` that can host typed extension-owned material state without creating a second store.

### Design correction

MATERIAL-ORCH v2.1 defines `LessonMaterialBindingV1` containing distinct typed:

- `role`;
- `artifactKind`;
- `audience`;
- immutable canonical `materialRef`;
- provenance.

MATERIAL-CORE-01 must persist this as extension-owned state (default: validated extension payload or equivalent existing extension representation), and the manifest must reconstruct all six roles from it. Extension `kind` may remain only an explicitly classified historical fallback; it is not sufficient authority for new material acceptance.

## 4. P1 — accepted material reference could float with an asset

Verified issue:

The prior `CanonicalMaterialRefV1` allowed `assetId` with optional generation/digest. This could not prove which content revision the teacher actually accepted after reprocessing or provider-side mutation.

### Design correction

Every accepted material now requires an immutable revision reference:

```text
KNOWLEDGE_GENERATION(assetId + generationId)
OR
IMMUTABLE_REVISION(assetId + revisionRef + integrityDigest)
```

`REUSE_EXISTING` does not bypass this invariant. A mutable provider URL/current pointer may be discovered/previewed, but cannot become canonical READY material until an immutable canonical revision/snapshot is available.

## 5. New implementation-plan coverage

Added:

`docs/superpowers/plans/2026-10-13-material-core-01-canonical-material-acceptance.md`

The plan explicitly owns:

1. read-only legacy inventory;
2. typed extension-owned material binding;
3. immutable revision resolution/materialization;
4. canonical local acceptance boundary;
5. complete six-role manifest mapping;
6. legacy `CLASS_LESSON_MATERIAL` reconciliation and consumer migration;
7. deletion/reference safety;
8. exact-head qualification and independent review.

No implementation is authorized by creating this plan.

## 6. Boundaries unchanged

The rework does **not** change these decisions:

- canonical lesson composition remains `LessonPreparationManifest.materialSlots`;
- `LessonDesignExtension` remains the acceptance lifecycle;
- no second material store/lifecycle;
- Knowledge remains the durable material source pipeline;
- OR-07 remains proposal-only when/if future shared runtime is governed;
- Officina materials remains the general provider-neutral production boundary;
- Studio Atlas does not become a universal materials engine;
- CPRI remains provider-neutral and must be completed before dependent canonical lesson writes;
- `DOS-A1` remains `RUNTIME_DEFERRED`;
- PR #692 remains frozen reference only;
- #703 remains docs-only; no schema/runtime/deploy/data mutation.

## 7. Next gate

After these document changes:

1. reply to and resolve the three verified P1 review threads;
2. freeze a new exact head;
3. require all documentation workflows PASS on that exact head;
4. request a second fresh independent review;
5. accept `ARCHITECTURE_READY` only if no relevant unresolved finding remains;
6. stop at the applicable Human Review/process gate; do not begin CPRI/MATERIAL-CORE implementation from this documentation PR.

Current canonical state:

`MATERIAL-ORCH-01 = DESIGN_V2_1 / SECOND_FRESH_REVIEW_REQUIRED / IMPLEMENTATION_HOLD`
