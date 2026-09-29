# DOCENTE OS — Canonical Document Ingestion

Status: PROPOSED_CANONICAL_V1 — P0/P1 materialized

## Decision

Docente OS ingests documents to produce canonical, structured knowledge. The source payload is an ingestion artifact whose retention is policy-driven; source identity, provenance, lineage and the semantic result remain traceable.

Target flow:

`SOURCE -> DOCUMENT INTAKE -> INGRESS ARTIFACT -> NORMALIZER -> CANONICAL DOCUMENT -> KNOWLEDGE UNITS -> RELATIONS -> OPERATIONAL USE -> DISPOSITION`

This document extends, rather than replaces, the current Knowledge Base architecture in `KB_INGESTION.md`.

## Why

The current KB already provides generation-safe processing, normalized documents, semantic units, relations and operational promotion. The remaining structural problem is at the intake boundary: direct uploads are currently treated primarily as permanently stored files before they become knowledge.

The target model separates:

1. **source identity and provenance** — immutable and always traceable;
2. **ingress payload** — local, temporary, externally referenced or archived according to policy;
3. **canonical knowledge** — the current successful semantic representation used by search and orchestration.

## P0/P1 contract

### IngressArtifact

`IngressArtifact` describes a document entering the system before a retention decision becomes permanent.

Required concepts:
- intake id;
- source provider;
- original name;
- declared and detected MIME;
- byte size and SHA-256 when available;
- source locator;
- payload reference mode;
- retention class.

Retention classes:
- `TRANSIENT`: payload may be deleted only after safe canonical publication;
- `EXTERNAL_REFERENCE`: authoritative original remains at Drive/Gmail/provider;
- `ARCHIVE_REQUIRED`: binary remains stored as evidence/material.

### Canonical document

P0/P1 does not introduce a new database schema. The canonical contract is versioned as:

`docenteos.canonical-document/1`

The fast-path adapter preserves the existing `NormalizedKnowledge` result and adds canonical source/quality metadata under `extractedData.canonical`.

This allows the current `KnowledgeDocument`, `KnowledgeUnit` and generation model to remain authoritative while the intake layer evolves.

### DocumentNormalizerPort

All document channels must eventually converge on a provider-neutral normalizer boundary. The P1 fast-path implementation adapts the current `AssetTransformerPort` implementations instead of replacing them.

This means:
- PDF continues to use the current native/visual transformer;
- DOCX continues to use Mammoth;
- image and text transformers remain valid;
- a future recovery engine can be inserted behind the same contract without changing the KB or UI contract.

## Hard invariants

1. **No successful canonicalization -> no disposal.**
2. A transient payload is disposable only when the target generation is `SUCCEEDED`, is the asset's current generation, and provenance/document/required units have been persisted.
3. `ARCHIVE_REQUIRED` is never disposed by the transient-payload rule.
4. Failed processing cannot replace the last valid current generation.
5. Source identity and lineage survive payload disposal.
6. Automated extraction remains distinct from human validation.
7. Consequential writes to Calendar, Planner, timetable application or other operational state keep their existing human-control boundaries.
8. P0/P1 does not authorize DOS-A1 or any runtime-deferred capability.

## Fast path and recovery path

### Fast path

Use existing, inexpensive processors first:
- `unpdf` / PDF.js for PDFs;
- Mammoth for DOCX;
- existing plain-text transformer;
- existing visual extraction path for supported images/pages.

### Recovery path — later phase

A recovery normalizer is intentionally **not** introduced in P0/P1.

The preferred next candidate is a pluggable, isolated document conversion worker (for example Docling) capable of returning structured JSON/Markdown when the native path cannot reliably open, extract or preserve document structure.

The recovery worker must:
- have no direct KB write credentials;
- receive only the payload required for the processing attempt;
- operate with size/page/time/resource limits;
- return a versioned canonical result;
- use short-lived storage/TTL when remote processing is required;
- never become the source of truth.

## Source-payload policy

### TRANSIENT

Typical examples:
- Share Target document received from Android;
- ordinary direct upload used only to extract knowledge;
- circular imported for semantic use.

The payload may be deleted only after the hard disposition gate passes.

### EXTERNAL_REFERENCE

Typical examples:
- Drive file;
- Gmail attachment/message;
- other provider with an authoritative stable source.

Docente OS stores provider locator/digest/provenance plus canonical knowledge, avoiding unnecessary binary duplication where possible.

### ARCHIVE_REQUIRED

Typical examples:
- a document that must be re-opened as evidence;
- a teaching resource whose original is itself the distributable material;
- an explicit retention requirement.

## Vertical expectations

### Circulars / communications

The canonical result should preserve enough structure to derive:
- title / subject;
- issuer / protocol where available;
- recipients;
- sections;
- dates;
- deadlines;
- actions;
- classes / disciplines / topics;
- references / attachments.

Operational promotion to Planner/Calendar remains separately controlled.

### Timetable

The canonical result should preserve:
- page/table provenance;
- grid/table structure;
- dates and validity hints;
- timetable candidate information.

Application to the active timetable remains governed by the existing timetable import contract and human decision.

### Teaching materials

The canonical result should support:
- title/topic;
- discipline/class context;
- sections/tables/figures where useful;
- links to lessons/classes/Atlas workflows.

The original is retained only if it is itself needed as a distributable asset.

## Open-source reuse strategy

P0/P1 reuses the current code. Future phases should prefer mature reusable components:
- PDF.js / unpdf — existing PDF fast path;
- Mammoth — existing DOCX fast path;
- `file-type` — candidate for byte-level type detection;
- Docling — candidate recovery normalizer;
- Tesseract.js — optional local OCR when justified;
- Apache Tika — architecture reference / possible future broad detector, not required for V1.

Avoid introducing a second permanent document system or duplicating the KB model.

## P0/P1 acceptance gates

1. The canonical schema identifier is stable and versioned.
2. Existing transformers can be adapted without changing their implementation.
3. Unsupported formats fail explicitly at the normalizer boundary.
4. A transient payload cannot be disposed while processing is RUNNING/FAILED.
5. A transient payload cannot be disposed when the successful generation is not current.
6. Missing provenance/document/unit persistence blocks disposition.
7. `ARCHIVE_REQUIRED` blocks transient disposal.
8. No database migration is required for P0/P1.
9. Existing runtime upload/share behavior remains unchanged.
10. Product CI includes contract tests for the new boundary.

## Next phase

P2 should wire upload and Share Target to the same intake orchestrator and add byte-level content detection. P3 should introduce the recovery adapter behind `DocumentNormalizerPort` and qualify it against the real problematic PDF class before changing retention behavior in production.
