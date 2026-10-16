# MATERIAL-CORE-01 — Task 4 digest-bound material resolution checkpoint

Date: 2026-10-16
PR: #712
Base: `develop@4e04e5eb0712089ccb13f5f72eef43c44679ac77`
Qualified implementation head: `db11f05d5d87bffbdd5356e0619c827756a9263a`

Status: `TASK_4_COMPLETE / EXACT_GENERATION_RESOLUTION_GREEN / READ_ONLY`

## Canonical resolution boundary

Task 4 adds an application-level exact-content resolver and a read-only Supabase Knowledge adapter:

- `product/src/core/application/material-content-resolution.ts`
- `product/src/core/application/material-content-resolution.test.ts`
- `product/src/core/infrastructure/supabase/supabase-material-content-read-port.ts`
- `product/src/core/infrastructure/supabase/supabase-material-content-read-port.test.ts`

The resolver accepts a typed `CanonicalMaterialRefV1` and never retargets a `KNOWLEDGE_GENERATION` reference through `knowledge_assets.current_generation_id`.

For `KNOWLEDGE_GENERATION`, the read port loads the exact requested `assetId + generationId`, the document bound to that generation, its ordered units, and locally captured source bytes when the governed `storage:knowledge-assets/...` locator exists. It then materializes the `MaterialContentSnapshotV1` used by `docente-os.material-content.v1`.

## Fail-closed outcomes

The resolver returns only explicit states:

- `READY` when exact content is materializable and the recomputed digest matches;
- `STALE / CONTENT_DIGEST_MISMATCH` when the same generation identity now resolves to changed content;
- `MISSING` when the exact Knowledge generation is absent;
- `INCOMPLETE` for reference/context mismatch, non-succeeded generation, unavailable snapshot, mutable-source-only content, or source SHA mismatch;
- `UNSUPPORTED_REFERENCE` for `IMMUTABLE_REVISION` until a reviewed immutable revision store exists.

A historical generation can remain `READY` even after `current_generation_id` advances, provided the exact historical content is still materializable and its digest matches.

Provider/external URLs remain provenance only. A mutable URL with no captured exact content cannot become `READY`.

## TDD evidence

### Application resolver

RED head: `4211e2d8...`

Product CI run `38896915502` failed as expected with `TS2307` because the focused material-content resolver did not yet exist.

Implementation head: `c913b45c51344a37ba585a4c3a3a899064d6c532`.

Product CI run `38897238819`: PASS, with the governance checks on the same head also PASS.

### Supabase exact-generation read adapter

RED head: `4f2ba95fd1a1eb522afebf165df09ca2a1fda281`.

Product CI run `38897493580` failed as expected with `TS2307` because the Supabase material read adapter did not yet exist.

Initial implementation head: `fb3d9904d5d045413988449ced00d7f36f1b3ccd`.

Product CI run `38897819745` reached typecheck and exposed fixture-only TypeScript errors: the test helper widened `generation.status` to `string` and several partial asset spreads no longer satisfied the exact `AssetRow` contract. The runtime adapter itself was not the failing boundary.

The fixture helper was narrowed to `MaterializeKnowledgeGenerationInputV1`, preserving the implementation semantics.

Final qualified head: `db11f05d5d87bffbdd5356e0619c827756a9263a`.

Product CI run `38898754200`: PASS, including:

- typecheck;
- product tests;
- lint;
- build;
- complete migration replay on ephemeral Supabase;
- runtime release preflight.

Same-head governance checks PASS:

- TERM-01 Curricolo Vocabulary `38898754152`;
- TRAMA Perceptible Write `38898754523`;
- Certification Impact Classifier `38898754248`;
- Governed MFA Queue Hygiene `38898754311`;
- Human Interaction Model `38898754297`.

DOS-CRM QL-1 `38898754219` is skipped as expected.

## Constraints preserved

- read-only Knowledge access only;
- no Beta database/schema/data mutation;
- no new material store;
- no provider runtime or privileged callback;
- no DOS-A1 activation;
- no Beta promotion/deploy;
- no merge.

## Next canonical step

Task 5: implement the canonical local acceptance boundary on the existing `LessonDesignExtension` lifecycle. The boundary must derive/verify actor and lesson context server-side, recompute the exact content digest immediately before the write, enforce idempotency fail-closed, and persist accepted typed material state without introducing a second acceptance authority.
