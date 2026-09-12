# DOS-S1 — Knowledge Base Consolidation Audit

Date: 2026-08-29
Status: PASS_WITH_FOLLOW_UPS
Baseline audited: `develop@ebdb2aa77ad68f1d65264671b4f61185b0ba2205`

## Scope

Verify that `Conoscenza` is the single professional knowledge pipeline in Docente OS and that no parallel source-of-truth has emerged before future external-framework ingestion.

## Findings

### 1. Canonical Knowledge pipeline — PASS

The reviewed core has one coherent chain:

`KnowledgeAsset -> KnowledgeProcessingGeneration -> KnowledgeDocument -> KnowledgeUnit -> operational links/use`

The implementation is concentrated in the existing knowledge domain, provider-neutral ports, ingestion service, file transformers and Supabase knowledge repository. No second professional source store was found in the reviewed core.

### 2. Original-source identity and generation safety — PASS

The Knowledge domain retains source identity, processing generations, current-generation pointers, validation/context status and reliability. The existing ingestion tests cover native text, OCR fallback, mixed PDFs, source identity and failed-generation preservation.

### 3. Authored documents are not a second source archive — PASS

`authored_documents` is a versioned authoring layer for UDA. Persistence requires `source_asset_id` referencing `knowledge_assets(id)` with `ON DELETE RESTRICT`; opening UDA authoring also checks that the source asset belongs to the same workspace and is classified `UDA`.

Therefore:

`knowledge_assets = source identity`

`authored_documents = editable/versioned derivative bound to that source`

This distinction MUST remain invariant for future document types.

### 4. Conoscenza UI uses the canonical repository — PASS

The `/knowledge` surface reads recent/search results through `SupabaseKnowledgeRepository`, describes itself as the professional archive, states that processing does not replace the source, and exposes provenance/human-confirmation principles. Capture is explicit and user-triggered.

### 5. Future framework ingestion — BLOCKED BY STABILIZATION POLICY

AILit or another external reference framework must enter through the same Knowledge pipeline; no dedicated AILit store, alternate ingestion path or parallel source identity is authorized during stabilization.

## Follow-ups

1. Keep all future captured professional sources routed through `KnowledgeAsset`.
2. Keep authored/generated outputs linked to exact source assets/units/generations rather than copying source identity.
3. Treat migration-number duplication/hygiene separately from Knowledge authority; do not conflate naming cleanup with a source-of-truth migration.
4. During DOS-S2, verify that Piano annuale, Progetta/UDA and Classi link to canonical KB references rather than creating operational copies presented as sources.

## Gate

`DOS-S1 = PASS_WITH_FOLLOW_UPS`

The Knowledge Base is sufficiently consolidated to support DOS-S2 after DOS-S0 revalidation regression is green on the active candidate SHA.
