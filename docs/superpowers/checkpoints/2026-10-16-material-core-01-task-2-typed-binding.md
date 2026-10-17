# MATERIAL-CORE-01 — Task 2 typed material binding checkpoint

Date: 2026-10-16
PR: #712
Base: `develop@4e04e5eb0712089ccb13f5f72eef43c44679ac77`
Qualified implementation head: `e59e525bb21463f7a69393cc1fa3861ae0591c61`

Status: `TASK_2_COMPLETE / TYPED_BINDING_GREEN / NO_DB_MUTATION`

## Scope completed

Task 2 defines the extension-owned typed material binding without introducing a second material store or lifecycle.

Implemented:

- `LessonMaterialRole` with all six canonical roles;
- independent `LessonMaterialArtifactKind`;
- independent `LessonMaterialAudience`;
- mandatory `MaterialContentDigestV1` with `SHA-256` and canonicalization `docente-os.material-content.v1`;
- digest-bound `KNOWLEDGE_GENERATION` and `IMMUTABLE_REVISION` refs;
- structured `MaterialProposalProvenanceV1`;
- `LessonMaterialBindingV1` schema `docente-os.lesson-material-binding.v1`;
- fail-closed runtime parser/validator;
- explicit `LEGACY_EXTENSION` classification for payloads that do not contain the canonical material binding;
- canonical material binding stored under `LessonDesignExtension.payload.materialBinding`;
- `LessonDesignExtension.payload` now uses the typed extension payload boundary;
- `lessonMaterialBindingState()` exposes canonical vs legacy classification from the extension domain.

## TDD evidence

RED exact head: `600b5494ac5e39debf0718a90d967974053d33ae`.

Product CI run `38894605782` failed at `npm run typecheck` with the expected missing-module error:

`TS2307: Cannot find module './lesson-material-binding'`

GREEN exact head: `e59e525bb21463f7a69393cc1fa3861ae0591c61`.

Product CI run `38894831043`: PASS, including:

- typecheck;
- product tests;
- lint;
- build;
- runtime release preflight.

Same-head governance checks PASS:

- TERM-01 `38894830937`;
- Certification Impact `38894830928`;
- Governed MFA Queue Hygiene `38894831092`;
- Human Interaction Model `38894831034`;
- TRAMA Perceptible Write `38894830977`;
- CodeRabbit combined status: success.

## Validation behavior

The parser accepts all six roles and validates role / artifact kind / audience independently.

It rejects:

- `KNOWLEDGE_GENERATION` without mandatory content digest;
- `IMMUTABLE_REVISION` without mandatory content digest;
- unsupported digest algorithm;
- unsupported canonicalization;
- malformed SHA-256 digest value;
- asset-only refs;
- mutable URL-only refs;
- malformed provenance;
- malformed v1 payloads.

Payloads with no canonical `materialBinding` are preserved as `LEGACY_EXTENSION`; they are not silently converted into new canonical accepted material state.

## Constraints preserved

- no migration or schema change;
- no data mutation;
- no provider runtime;
- no new acceptance table/store;
- no DOS-A1 activation;
- no Beta promotion/deploy;
- no merge.

## Next canonical step

Task 3: inspect the actual Knowledge document/unit/blob representation and define deterministic `docente-os.material-content.v1` canonicalization + SHA-256 digest with RED→GREEN evidence.
