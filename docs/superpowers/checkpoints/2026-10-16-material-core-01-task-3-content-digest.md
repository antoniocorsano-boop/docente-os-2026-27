# MATERIAL-CORE-01 — Task 3 exact material content digest checkpoint

Date: 2026-10-16
PR: #712
Base: `develop@4e04e5eb0712089ccb13f5f72eef43c44679ac77`
Qualified implementation head: `0893d2ed6033bf44b9163957310c9ee2d16a5dfe`

Status: `TASK_3_COMPLETE / EXACT_CONTENT_DIGEST_GREEN / READ_ONLY`

## Why generation identity is insufficient

The current Knowledge model permits in-place updates of content-bearing state under an existing asset/generation identity:

- `knowledge_documents` contains mutable normalized text / Markdown / summary / extracted data;
- `knowledge_units` contains mutable unit content and structured data;
- `knowledge_assets` also carries original source text / source SHA metadata.

Therefore an accepted material cannot rely on `assetId` or `generationId` alone. Exact accepted content requires a digest over the canonical content state.

## Canonicalization v1

Implemented `docente-os.material-content.v1` in:

- `product/src/core/application/material-content-digest.ts`
- `product/src/core/application/material-content-digest.test.ts`

The canonical snapshot includes content-bearing fields only:

- asset source content: `originalText`, `mimeType`, `sourceSha256`;
- document content: title, document type, language, normalized text, normalized Markdown, summary, extracted data;
- ordered units: ordinal, type, title, content, structured data, source page and offsets;
- referenced binary content: stable ref, MIME type and exact bytes.

The canonicalization deliberately excludes runtime identity / bookkeeping fields such as:

- asset ID;
- generation ID;
- workspace ID;
- created / updated timestamps.

Rules:

- CRLF/CR text line endings normalize to LF;
- object keys sort deterministically;
- unit ordering is deterministic;
- referenced binary entries sort deterministically;
- duplicate unit ordinals fail closed;
- duplicate binary refs fail closed;
- unsupported / cyclic JSON values fail closed;
- invalid source SHA fails closed;
- binary bytes participate directly in the digest identity.

Digest contract:

- algorithm: `SHA-256`;
- canonicalization: `docente-os.material-content.v1`;
- 64-character lowercase hexadecimal value.

A document, unit or referenced-binary content mutation changes the digest even if external asset/generation identity is unchanged.

## TDD evidence

Initial RED head: `f30cf43bfc7a168cc7057816fe202159af9d0034`.

Product CI run `38895392597` failed as expected because `./material-content-digest` did not exist.

Before implementation, the deterministic-order fixture was corrected so its reordered unit retained semantically identical structured data; the RED condition remained the missing implementation.

Initial implementation head: `f8f63be978fe95a8435a144f8c632571512a003b`.

At that head, TRAMA Perceptible Write reported a false mutation candidate because Node crypto uses `.update(...)` as part of the pure in-memory hashing API. The gate explicitly supports `@trama-readonly`; the digest module was marked read-only rather than inventing a write surface.

Next head: `c015a2017e9327c59866f1d4a48d6d1b77ff4989`.

Perceptible Write became PASS, but Product CI exposed a real TypeScript comparator mismatch because canonicalized `structuredData` is `unknown` while the sort comparator had been typed against the full source-unit shape.

The comparator was narrowed to the four fields it actually consumes (`ordinal`, `unitType`, `title`, `content`) without changing digest semantics.

Final qualified implementation head: `0893d2ed6033bf44b9163957310c9ee2d16a5dfe`.

Product CI run `38896177078`: PASS, including:

- typecheck;
- product tests;
- lint;
- build;
- runtime release preflight.

Same-head governance checks PASS:

- Certification Impact `38896177301`;
- Governed MFA Queue Hygiene `38896177067`;
- TRAMA Perceptible Write `38896177096`;
- Human Interaction Model `38896177080`;
- TERM-01 Curricolo Vocabulary `38896176984`.

DOS-CRM QL-1 is skipped as expected.

## Constraints preserved

- no DB/schema/data mutation;
- no material acceptance write;
- no provider runtime;
- no second material store;
- no DOS-A1 activation;
- no Beta promotion/deploy;
- no merge.

## Next canonical step

Task 4: resolve a canonical material ref into exact content-bearing Knowledge resources, materialize `MaterialContentSnapshotV1`, recompute the digest and fail closed on missing, incomplete, mutable-only or stale content before any acceptance write exists.
