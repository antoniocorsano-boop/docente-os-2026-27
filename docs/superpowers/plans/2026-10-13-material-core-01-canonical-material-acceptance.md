# MATERIAL-CORE-01 — Canonical Material Acceptance Implementation Plan v2

> **For agentic workers:** use superpowers:test-driven-development for every behavioral change and superpowers:verification-before-completion before claiming a task complete. Execute on an isolated branch/worktree from the then-current `develop` head. No provider runtime is part of this plan.

**Goal:** converge all teacher-confirmed lesson materials onto one canonical acceptance path: exact digest-bound Knowledge/canonical content → typed `LessonDesignExtension` state → `LessonPreparationManifest.materialSlots`, while preserving legacy evidence and eliminating metadata-only `APPROVED` as a parallel current acceptance authority.

**Prerequisite:** CPRI-01 qualified for lesson contexts requiring canonical annual-plan generation resolution. MATERIAL-CORE must not reintroduce static CAN-PLAN authority or provider-specific runtime.

**Design:** `docs/superpowers/specs/2026-10-13-material-orchestration-design.md`

## Global constraints

- Re-freeze execution baseline from current `develop`; do not reuse this design PR SHA as implementation authority.
- No new material acceptance table/store unless a later approved design proves the existing extension-owned representation incapable; default is typed state inside existing `LessonDesignExtension` persistence.
- Reuse `LessonDesignExtension` lifecycle: `PROPOSED | MODIFIED | ACCEPTED | DISMISSED`.
- `LessonPreparationManifest.materialSlots` remains the readiness composition.
- Every accepted material must carry a **mandatory verified content digest** in addition to the canonical asset/revision/generation reference.
- `assetId`, `generationId`, provider URL, or provider object ID alone can never establish accepted content identity.
- Current Knowledge `generationId` is not sufficient proof of immutability because `knowledge_documents` and `knowledge_units` can be updated in place. Until a separately reviewed DB versioning/immutability design supersedes this, the digest is mandatory and must be reverified before READY.
- Digest mismatch/unavailability after acceptance yields `STALE | NEEDS_REVIEW`, never silent retargeting.
- `LessonMaterialRole`, `artifactKind`, and `audience` remain distinct after acceptance; all six roles must reconstruct from accepted state.
- Existing `knowledge_assets.source_metadata.approvalState` is historical/import evidence after reconciliation, not current acceptance authority.
- Never fabricate missing lesson/block/projection/CPRI/content/actor evidence during legacy reconciliation.
- `PRE_CANONICAL_DIAGNOSTIC` without actual lesson association remains supporting/prepared material.
- No external provider invocation, Studio Atlas callback, OR-07 runtime, or DOS-A1 activation in this tranche.
- Every write boundary authorizes and derives context server-side; UI state is not authority.
- Any schema change uses the next free migration on the execution exact head and preserves runtime-schema provenance/containment.
- Historical evidence is preserved; no cleanup by deletion/rewrite.
- TDD RED → GREEN is required for every behavioral change.

## Canonical types to implement/validate

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

interface MaterialContentDigestV1 {
  algorithm: 'SHA-256'
  canonicalization: 'docente-os.material-content.v1'
  value: string
}

type CanonicalMaterialRefV1 =
  | {
      kind: 'KNOWLEDGE_GENERATION'
      assetId: string
      generationId: string
      contentDigest: MaterialContentDigestV1
    }
  | {
      kind: 'IMMUTABLE_REVISION'
      assetId: string
      revisionRef: string
      contentDigest: MaterialContentDigestV1
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

`MaterialContentDigestV1` must be calculated over deterministic canonical **content**, not merely IDs/metadata. The v1 canonicalization must include every teacher-visible/content-bearing component used by the accepted artifact, including applicable document/unit fields and referenced binary/object content, in deterministic order.

---

## Task 1 — Inventory legacy prepared/confirmed material and all consumers

**Primary files:**
- Read: `docs/architecture/CLASS_PREPARED_MATERIALS_CONTRACT.md`
- Read: `product/src/app/classi/class-workspace-model.ts`
- Search repository-wide for `CLASS_LESSON_MATERIAL`, `approvalState`, `PENDING_HUMAN`, `APPROVED`, `Confermato`, `Predisposto`.
- Create: `product/scripts/experience/material-core-legacy-inventory.mjs`
- Create: `product/scripts/experience/material-core-legacy-inventory.test.mjs`

- [ ] Write RED fixture tests:

```text
PENDING_HUMAN + no canonical extension -> PREPARED_ONLY
APPROVED + exact digest-bound content + exact lesson context + sufficient acceptance evidence -> RECONCILABLE
APPROVED + generation/asset id but no digest -> REVALIDATION_REQUIRED
APPROVED + mutable provider URL only -> REVALIDATION_REQUIRED
APPROVED + no block/projection -> REVALIDATION_REQUIRED
PRE_CANONICAL_DIAGNOSTIC with no lesson block -> PREPARED_ONLY
invalid/unknown metadata -> BLOCKED_FOR_AUTOMATIC_RECONCILIATION
```

- [ ] Run RED and observe expected missing-classifier failure.
- [ ] Implement pure classifier + read-only environment inventory.
- [ ] Inventory every runtime consumer of metadata-only approval; do not rely on a hand-curated subset.
- [ ] Record only non-sensitive counts/identifiers/evidence required for reconciliation.
- [ ] Run GREEN.

**Stop condition:** no mutation until actual environment rows/consumers are classified `READY_FOR_RECONCILIATION | REVALIDATION_REQUIRED | BLOCKED`.

---

## Task 2 — Define extension-owned typed material binding

**Primary files:**
- Modify: `product/src/core/domain/lesson-design-extension.ts`
- Create: `product/src/core/domain/lesson-material-binding.ts`
- Create: `product/src/core/domain/lesson-material-binding.test.ts`

- [ ] RED: all six roles accepted by validator.
- [ ] RED: role/kind/audience remain independently validated.
- [ ] RED: `KNOWLEDGE_GENERATION` without `contentDigest` is rejected.
- [ ] RED: `IMMUTABLE_REVISION` without `contentDigest` is rejected.
- [ ] RED: unsupported digest algorithm/canonicalization is rejected.
- [ ] RED: asset-only, mutable-URL-only and malformed provenance are rejected for acceptance.
- [ ] Implement typed parser/validator for `LessonDesignExtension.payload` or equivalent extension-owned state.
- [ ] Preserve old extension compatibility through explicit `LEGACY_EXTENSION` classification, not new writes.
- [ ] Run focused tests + typecheck GREEN.

**Invariant:** transient proposal data can be discarded only after all canonical role/kind/audience/exact-content/provenance state is persisted in extension-owned accepted state.

---

## Task 3 — Canonicalize, hash and verify exact accepted content

**Primary files:**
- Inspect actual Knowledge document/unit/blob representation on execution baseline.
- Create a focused content canonicalizer/digest boundary, e.g. `product/src/core/application/material-content-digest.ts` only after inspection.
- Create corresponding focused tests.

**Output:** deterministic `MaterialContentDigestV1` over teacher-visible/content-bearing material state.

- [ ] RED: same semantic material content in deterministic ordering produces the same SHA-256 digest.
- [ ] RED: changing a teacher-visible `knowledge_documents` content field changes the digest while `generationId` remains unchanged.
- [ ] RED: changing a `knowledge_units` content field in-place changes the digest while document/generation identity remains unchanged.
- [ ] RED: referenced binary/object content mutation changes the digest where that content participates in the material.
- [ ] RED: metadata/ID-only hashing cannot satisfy the canonicalizer fixture.
- [ ] Implement deterministic v1 normalization/order/serialization and SHA-256 hashing.
- [ ] Freeze canonicalization identifier as `docente-os.material-content.v1`.
- [ ] Document exactly which fields/components are included/excluded so independent implementations cannot disagree.
- [ ] Run focused digest tests GREEN.

**Invariant:** a Knowledge generation is only a locator/context component; exact accepted content identity is generation/revision **plus mandatory digest**.

---

## Task 4 — Resolve/materialize digest-bound canonical material refs

**Primary files:**
- Inspect/modify canonical Knowledge repository/service chosen on the execution baseline.
- Create a focused application boundary such as `resolveCanonicalAcceptedMaterialRef(...)` only after repository inspection.
- Add focused tests.

- [ ] RED: selected Knowledge generation returns `assetId + generationId + mandatory digest`.
- [ ] RED: asset/current pointer without exact digest-bound content cannot be accepted.
- [ ] RED: mutable provider URL remains previewable but not acceptable/READY.
- [ ] RED: external resource with canonical snapshot/revision + digest is acceptable.
- [ ] RED: advancing `current_generation_id` does not retarget the accepted ref.
- [ ] RED: **in-place mutation under the same generationId** causes recomputed digest mismatch and canonical state becomes `STALE/NEEDS_REVIEW`.
- [ ] RED: missing/unavailable content required for digest verification fails closed.
- [ ] Implement reuse without duplicating the source archive.
- [ ] For mutable external/provider resources, materialize or record exact canonical content before acceptance.
- [ ] Keep provider URLs/object IDs as provenance only.
- [ ] Run focused tests + typecheck GREEN.

---

## Task 5 — Implement canonical local acceptance boundary

**Primary files:**
- Inspect/modify authoritative lesson-design application/repository boundary.
- Modify `product/src/core/domain/lesson-design-extension.ts` as needed.
- Add focused application tests.
- Add DB migration only if proven necessary after persistence inspection.

**Conceptual command, not RPC freeze:**

```ts
acceptLessonMaterialProposal({
  sectionId,
  blockId,
  candidateOrExistingAsset,
  resolvedRole,
  idempotencyKey,
})
```

Server-derived/verified authority: authenticated actor, workspace membership, section workspace/year, logical CAN-PLAN, CPRI source where required, block/projection context, exact digest-bound material ref, role/kind/audience, dedupe scope.

- [ ] RED: unauthenticated/unauthorized actor fails closed.
- [ ] RED: cross-workspace/year/context mismatch fails closed.
- [ ] RED: material ref without mandatory digest fails closed.
- [ ] RED: acceptance recomputes digest and rejects mismatch before write.
- [ ] RED: conflicting retry under same idempotency key fails closed.
- [ ] RED: identical semantic retry returns prior result without duplicate acceptance.
- [ ] Implement one atomic/fail-closed operation using existing extension acceptance semantics.
- [ ] No provider callback gets a privileged shortcut.
- [ ] Run focused application/DB tests GREEN.

**Invariant:** acceptance does not persist `AVAILABLE_FOR_LESSON`; readiness is derived from canonical read-back.

---

## Task 6 — Reconstruct all six material slots and detect post-acceptance mutation

**Primary files:**
- Modify: `product/src/core/presentation/lesson-preparation-manifest.ts`
- Create: `product/src/core/presentation/lesson-preparation-materials.test.ts` if no focused existing test owns this behavior.

- [ ] RED: accepted typed binding for each of six roles yields matching canonical slot.
- [ ] RED: role/kind/audience survive serialization/deserialization distinctly.
- [ ] RED: new extension lacking typed material binding is not READY merely from `kind`.
- [ ] RED: legacy TEACHER_RESOURCE/STUDENT_RESOURCE fallback remains explicitly historical-only.
- [ ] RED: stored digest match permits readiness subject to other gates.
- [ ] RED: same `generationId` with in-place changed document/unit content produces digest mismatch and `NEEDS_REVIEW/STALE`, not READY.
- [ ] RED: digest verification unavailable fails closed from READY.
- [ ] Replace/augment `roleForExtension()` so new canonical material uses typed binding.
- [ ] Integrate exact-content verification into readiness/fingerprint semantics at the appropriate canonical boundary.
- [ ] Run focused manifest tests + typecheck GREEN.

---

## Task 7 — Reconcile legacy class-material confirmation and migrate consumers

**Primary files:**
- Modify: `docs/architecture/CLASS_PREPARED_MATERIALS_CONTRACT.md`
- Modify: `product/src/app/classi/class-workspace-model.ts`
- Modify/create focused class-material tests found on execution baseline.
- Add controlled reconciliation command only if Task 1 proves rows safe.

- [ ] RED: metadata `APPROVED` alone no longer yields canonical `Confermato`/READY after migration boundary.
- [ ] RED: `PENDING_HUMAN` remains discoverable as `Predisposto`, not accepted.
- [ ] RED: reconciled typed accepted extension with digest-bound ref yields canonical `Confermato`.
- [ ] RED: legacy APPROVED with generation but no trusted accepted-content digest requires revalidation.
- [ ] RED: legacy APPROVED lacking lesson context requires revalidation.
- [ ] RED: PRE_CANONICAL_DIAGNOSTIC without lesson association stays supporting/prepared.
- [ ] Implement consumer migration so canonical confirmation comes from accepted typed extension + lesson composition.
- [ ] Preserve original approval metadata as historical/import provenance.
- [ ] Automatically reconcile only rows with sufficient exact content/context/evidence; never backfill a digest from changed present-day content and pretend it represents the historical teacher-reviewed content unless provenance proves equivalence.
- [ ] Surface bounded teacher re-association/revalidation for insufficient rows.
- [ ] Run focused tests GREEN.

**Completion gate:** zero runtime consumers treat metadata-only `APPROVED` as current canonical acceptance authority.

---

## Task 8 — Deletion/reference safety and exact-head qualification

**Primary files:**
- Inspect/modify current Knowledge deletion boundary and relevant SQL/policies.
- Add focused domain/SQL tests.
- Update canonical docs/certification wiring only as implementation evidence requires.

- [ ] RED: deleting an asset/revision referenced by accepted material fails closed or requires explicit detach/replace.
- [ ] RED: current-generation advancement does not retarget accepted content.
- [ ] RED: in-place document/unit mutation cannot remain READY because digest verification fails.
- [ ] RED: explicit detach/replace updates canonical lesson state before destructive removal.
- [ ] Implement smallest reference-safety mechanism consistent with Knowledge ownership.
- [ ] Preserve historical provenance after detach/replace where required.

Re-run repository-wide searches:

```text
CLASS_LESSON_MATERIAL
approvalState
APPROVED
Confermato
roleForExtension
TEACHER_RESOURCE
STUDENT_RESOURCE
contentDigest
generationId
```

Terminal invariants:

```text
metadata-only current acceptance authorities = 0
accepted refs without mandatory content digest = 0
accepted mutable URL-only refs = 0
accepted generation-only refs = 0
in-place content mutations that remain READY = 0
untyped accepted material extensions = 0
canonical roles not reconstructable = 0
provider-specific write authority = 0
historical evidence silently rewritten/deleted = 0
```

Run full product verification on one exact head:

```bash
cd product
npm test
npm run typecheck
npm run lint
npm run build
```

If DB behavior changed, also run canonical SQL migration replay/security/runtime-release contracts.

Then:

- [ ] request fresh independent review on that exact head;
- [ ] resolve only technically verified findings;
- [ ] classify Human Review impact on the same head;
- [ ] no auto-merge or Beta promotion.

## Completion criteria

MATERIAL-CORE-01 is complete only when:

1. one current acceptance lifecycle exists: `LessonDesignExtension` with typed material binding;
2. every accepted material includes canonical ref + mandatory verified content digest;
3. same-generation in-place Knowledge content mutation is detectable and invalidates READY;
4. all six roles survive acceptance and reconstruct in `materialSlots`;
5. role/kind/audience remain distinct;
6. metadata-only `APPROVED` is provenance, not current acceptance;
7. class-material consumers derive confirmation from canonical lesson composition;
8. legacy confirmation is reconciled without inventing historical content/context/evidence;
9. accepted dependencies are deletion-safe;
10. no external provider runtime or DOS-A1 authority is introduced;
11. exact-head verification, independent review, and applicable Human Review are clean.
