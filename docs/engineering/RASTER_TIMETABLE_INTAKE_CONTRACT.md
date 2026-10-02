# Raster Timetable Intake Contract

Status: ACTIVE implementation contract  
Scope: closure lane `Orario mobile + PWA + Share Target`  
Source of truth: repository + issue #649  
Supersedes: implicit assumption that a timetable PDF always exposes a usable text layer

## 1. Problem statement

The real 28-09-2026 timetable used in Android acceptance is a one-page raster/image PDF with no usable native text layer. The current main path in `TimetableSharedIntake` relies on PDF text anchors from `getTextContent()`; when no teacher anchor is found it falls directly to manual selection.

That behavior is not acceptable as the normal path for a mature teacher-first product.

## 2. Product completion criterion

The timetable lane is not complete until the real rasterized 28-09-2026 document supports:

`share/upload PDF -> enter teacher label -> automatic extraction -> 14 correct lessons -> review -> confirm`

without drawing manual rectangles.

Manual selection is a last-resort correction path only.

## 3. Required routing

Each page MUST be classified deterministically after local rendering as one of:

- `TEXT_BEARING`
- `RASTER`
- `MIXED`

The classification MUST be based on observable local evidence such as usable text items/text coverage. It MUST NOT require user input.

### TEXT_BEARING

Use the existing local path:

`native text -> anchors -> findTeacherTextAnchors() -> inferTeacherTimetableCells() -> candidate`

### RASTER

Do not present manual fallback immediately.

Route to a visual timetable extraction strategy capable of producing structured rows:

- weekday
- ordinal
- classLabel
- sourceTeacherLabel
- confidence/evidence

The repository already contains `OpenAiTimetableDocumentExtractor`, which can process PDF/image input and returns this structured shape. It is an available strategy, not proof that unrestricted full-document transmission is acceptable.

### MIXED

Prefer native text where sufficient; use visual extraction only for unresolved pages/regions.

## 4. Privacy and minimization

Raster support MUST preserve the existing privacy-first direction.

A raster fallback MUST NOT silently upload the complete source merely because `getTextContent()` is empty.

Implementation must explicitly choose and document one of these governed strategies:

1. local OCR/local localization before remote processing; or
2. remote visual extraction under an explicit governed transfer contract.

For any remote strategy:
- minimize bytes/regions where technically feasible;
- avoid persistence of the original source;
- preserve staging cleanup semantics;
- record processor/provenance;
- keep teacher confirmation authoritative.

## 5. Deterministic validation

Visual extraction output MUST be validated locally before it can become a timetable candidate.

Minimum checks:
- requested teacher label must match the visible/source teacher label under the governed normalizer;
- weekday must be valid;
- ordinal must be valid;
- class label must be non-empty and normalized where possible;
- duplicate day/hour/class rows must be removed;
- impossible or contradictory rows must not be auto-accepted;
- confidence alone MUST NOT be treated as proof.

The model/extractor proposes rows. The deterministic layer decides whether each row is:
- `ACCEPTABLE`
- `NEEDS_REVIEW`
- `REJECTED`

## 6. UX contract

The primary experience must remain teacher-first.

Expected states:

1. `Sto leggendo l’orario…`
2. `Ho trovato N lezioni. Controlla.`
3. only ambiguous rows are surfaced for correction
4. teacher confirms
5. current active timetable remains unchanged until governed activation

The UI MUST NOT expose implementation jargon such as OCR, text layer, raster, parser, or fallback in the primary path.

Manual selection may exist under an advanced/recovery path only after automatic strategies fail.

## 7. Regression evidence

The existing text-bearing 14/14 regression remains required.

Add a separate raster regression that:
- contains no usable text layer;
- preserves the structural shape of the real 28-09-2026 timetable without committing personal names other than the minimum synthetic teacher label;
- requires exactly 14 lessons with expected day/hour/class;
- runs in focused Browser Certification for timetable/share-target changes.

A defect reproduced on the real raster path is not closed until this regression prevents recurrence, unless technical impossibility is documented.

## 8. Explicit non-goals for this closure lane

Do NOT expand this work into:
- generic document-understanding platform;
- school-template learning;
- circulation/circulars ingestion;
- cross-document knowledge extraction;
- new unrelated AI features.

Those may reuse this capability later, but they do not block closure of the timetable lane.

## 9. Implementation order

1. page-level `TEXT_BEARING / RASTER / MIXED` detection;
2. routing abstraction for extraction strategy;
3. raster extraction path;
4. deterministic row validation;
5. ambiguity-only correction UX;
6. raster 14/14 regression;
7. real Android acceptance with the original 28-09-2026 PDF;
8. close #649 lane C only after real-device PASS.

## 10. Closure rule

The authoritative acceptance threshold is:

> Real 28-09-2026 raster PDF -> teacher label -> 14 correct weekly lessons -> review -> confirm, with no manual rectangle selection.

Until that passes on Android, lane C remains IN VERIFICA.
