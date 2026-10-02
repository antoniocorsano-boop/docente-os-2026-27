# Local Document Understanding Contract

Status: CANONICAL / ACTIVE
Scope: reusable local-first document understanding capability for Docente OS
First production consumer: Orario mobile
Authority: this contract governs extraction strategy, not institutional decisions

## 1. Goal

Docente OS must understand common teacher documents without depending on a fixed layout or on a paid cloud AI provider.

The capability is reusable across suitable document flows, but every consumer keeps its own domain validation and human-decision boundary.

## 2. Canonical pipeline

The default strategy order is:

1. **NATIVE_TEXT** — use an existing usable text layer.
2. **LOCAL_OCR** — render locally and extract text + geometry on-device.
3. **STRUCTURAL_RECONSTRUCTION** — reconstruct rows/cells from semantic labels and relative geometry.
4. **BROWSER_AI** — optional progressive enhancement for ambiguous structure when a supported on-device browser model is available.
5. **REMOTE_ASSIST** — optional governed fallback only when explicitly enabled for that capability.
6. **MANUAL_REVIEW** — targeted correction of unresolved evidence.

No later stage may bypass the deterministic validation of the consuming domain.

## 3. Layout tolerance

Consumers MUST NOT depend on absolute pixel positions or one institutional template.

Extraction should rely on semantic and relative evidence such as:
- labels and normalized text;
- bounding boxes/polygons;
- row/column alignment;
- proximity;
- repeated structural patterns;
- known domain vocabulary.

Changes in font, spacing, column width, order, scaling, or minor table structure should not require code changes.

A material change in the conceptual representation may reduce confidence and route to a later strategy.

## 4. Local OCR boundary

A local OCR adapter returns evidence only:

```ts
type LocalDocumentTextItem = {
  text: string
  confidence: number | null
  polygon: readonly { x: number; y: number }[]
  page: number
}
```

It does not decide:
- which timetable rows are true;
- which class/assignment is authoritative;
- whether a document is institutional;
- whether a write may be applied.

Those decisions stay in domain-specific deterministic code.

## 5. Browser AI boundary

Browser AI is a **progressive enhancement**, never a mandatory dependency.

It may:
- interpret ambiguous headings;
- suggest a structural grouping;
- normalize fragmented OCR evidence;
- rank alternative structural hypotheses.

It MUST NOT:
- be the only way to complete a core flow;
- perform institutional writes;
- override deterministic contradictions;
- silently upload source content to a cloud fallback.

If unavailable, the flow continues through deterministic/local strategies and targeted manual review.

## 6. Privacy

Default rule: source bytes and locally rendered pages stay on-device.

Remote assistance is opt-in at the capability/configuration level and must:
- send the minimum derivative required;
- declare processor/provenance;
- never become the hidden default;
- preserve local source identity and cleanup semantics.

## 7. Resource policy

Local inference must be bounded:
- page count and image dimensions capped;
- workers preferred for heavy OCR;
- user-visible progress;
- cancellation supported where practical;
- model/runtime initialized lazily;
- no repeated model initialization per page;
- low-memory fallback available.

## 8. Technology qualification

The preferred OCR implementation candidate is the official PaddleOCR.js browser SDK with PP-OCRv5, because it returns recognized text with geometry and can run in-browser.

It is not promoted to production merely by this contract. Runtime adoption requires:
- dependency/supply-chain review;
- bundle/model-loading assessment;
- Android memory/performance proof;
- Italian/Latin-script fixture accuracy;
- offline/cache behavior decision.

Tesseract.js remains a possible fallback adapter if the preferred implementation fails these criteria.

## 9. Consumer contract

Each consumer provides:
- page classification;
- domain vocabulary;
- deterministic structural resolver;
- contradiction rules;
- minimum acceptance evidence;
- review UI.

The shared layer provides extraction evidence and capability availability only.

## 10. Orario application

For Orario the target sequence becomes:

`PDF -> native text if usable -> local OCR if raster -> timetable geometry resolver -> optional browser AI for ambiguity -> review -> teacher confirmation`

Remote OpenAI visual extraction becomes optional fallback, not a completion dependency.

The current Android acceptance threshold remains:

> real 28-09-2026 raster PDF -> teacher label -> 14 correct weekly lessons -> review -> confirm, without manual rectangle selection.

## 11. Reuse rule

Use this capability when the task is primarily:
- extracting visible printed text and layout;
- reconstructing tables/forms;
- understanding bounded document structure.

Do not use it when deterministic parsers already provide complete, cheaper, more reliable data.

## 12. Evidence and closure

A consumer is complete only when:
- a sanitized regression covers the real failure shape;
- deterministic validation is green;
- real-device acceptance passes where device behavior matters;
- provider absence does not break the primary path.
