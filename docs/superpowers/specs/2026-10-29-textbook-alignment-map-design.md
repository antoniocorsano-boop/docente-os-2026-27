# Textbook Alignment Map — Design

Status: DESIGN CANDIDATE / DOCUMENTATION ONLY
Date: 2026-10-29
Repository baseline: `main@c1301f1f2910cba1ac9fc315cf5461af0fbad1db`

## Problem

DOCENTE OS already owns a canonical annual teaching structure for Tecnologia 2026/2027:

`CAN-PRG → CAN-UDA → CAN-PACK → CAN-PLAN → section execution record`

The adopted textbook is already used in real teaching, but its contribution is not represented as a first-class, traceable source in the canonical UDA/planning graph. This creates two risks:

1. a UDA can be pedagogically coherent but unable to explain where the adopted textbook supports it;
2. the product can accidentally treat the textbook as the curriculum, or conversely ignore useful textbook sequencing/materials.

## Decision

Introduce a **Textbook Alignment Map** between canonical UDA and adopted textbook resources. It is a support/provenance layer, not a new source of curriculum authority.

Authority remains:

1. Curriculum authority: Arena/Atlas curriculum reference;
2. Didactic planning authority: DOCENTE OS canonical programming/UDA;
3. Textbook: supporting instructional source;
4. Class/section execution: actual lessons, evidence, deviations and adaptations.

Target relation:

`CurriculumReference + TextbookAlignment → CAN-UDA → CAN-PACK → CAN-PLAN → section execution`

No textbook mapping may silently rewrite curriculum, UDA, hours or annual sequence.

## Adopted textbook baseline

Adopted configuration:

- Title: *Tecnologia.verde*, seconda edizione;
- Authors: Giampietro Paci, Riccardo Paci, Lucia Bernardini;
- Publisher: Zanichelli;
- Configuration: Tecnologia + Disegno;
- ISBN: `9788808950758`.

Publisher evidence describes five autonomous Tecnologia sections:

- A — Dalla materia prima ai rifiuti;
- B — Produrre e consumare cibo;
- C — Dalla sedia alla città;
- D — Produrre e consumare energia;
- E — La globalizzazione.

It also explicitly identifies:

- chapter 2: `Sostenibilità: 2030 e oltre`;
- chapter C1: ergonomia e design;
- a separate Disegno volume supporting constructions, orthogonal projections, perspective, patterns and physical models;
- end-of-chapter digital competences and end-of-section orientation activities;
- teacher-edition suggestions and solutions for each paragraph.

The adopted ISBN does **not** include the separate Informatica volume. Digital/coding activities present inside Tecnologia are therefore support evidence, not proof of full Informatica coverage.

## Alignment record

A future machine-readable alignment should expose at least:

```ts
type TextbookAlignment = {
  udaCode: string
  textbookId: 'TECNOLOGIA_VERDE_2E_9788808950758'
  volume: 'TECNOLOGIA' | 'DISEGNO'
  section?: string
  chapter?: string
  paragraph?: string
  pageRange?: { from: number; to: number }
  resourceRef?: string
  relation: 'DIRECT' | 'COMPOSED' | 'SUPPORT'
  coverage: 'FULL' | 'PARTIAL'
  evidenceLevel: 'VERIFIED_PAGE' | 'VERIFIED_SECTION' | 'VERIFIED_FEATURE' | 'TO_VERIFY'
  note?: string
  verifiedByTeacherAt?: string
}
```

This design does not require that all fields are populated immediately. Unknown chapter/page bindings must remain absent or `TO_VERIFY`; they must never be inferred and persisted as facts.

## Classification rules

### DIRECT_CANDIDATE

The canonical UDA and a publisher-verified textbook section/chapter have substantially the same instructional nucleus. `DIRECT_CANDIDATE` becomes `DIRECT` only after chapter/page verification.

### COMPOSED_CANDIDATE

The UDA intentionally combines more than one textbook section, or textbook content plus canonical/operational sources. A 1:1 chapter binding would be misleading.

### PARTIAL_GAP

The adopted textbook supports part of the UDA, but an additional source is needed to satisfy the canonical UDA.

### STRUCTURAL_GAP

The adopted configuration does not contain a volume/domain sufficient to support the UDA. The UDA remains valid if grounded in curriculum and other approved sources.

## Evidence levels

- `VERIFIED_PAGE`: exact page range is supported by a source already used in teaching and traceable to the adopted book.
- `VERIFIED_SECTION`: publisher evidence confirms the section/domain, but exact chapter/pages still require audit.
- `VERIFIED_FEATURE`: publisher evidence confirms a cross-cutting feature (orientation, digital competences, sustainability, teacher guide).
- `TO_VERIFY`: semantic correspondence is plausible but not yet source-verified at the required granularity.

## Canonical invariants

1. Arena/Atlas curriculum remains authoritative for curricular applicability.
2. DOCENTE OS remains authoritative for annual programming and canonical UDA identity.
3. The textbook is never promoted to curriculum authority.
4. A textbook link may support but cannot silently change UDA hours, title, sequence or assessment.
5. Section adaptations remain derived from the canonical UDA and never mutate it implicitly.
6. Exact pages/chapters are not invented.
7. The separate Informatica volume must not be assumed present under ISBN `9788808950758`.
8. Textbook mappings must preserve source identity and verification state.
9. A future Registro Docente projection should consume the canonical UDA identity plus approved textbook alignment, not create a second independent UDA.

## Initial scope

This branch is documentation-only:

- define the contract;
- freeze a 25-UDA v0.1 alignment matrix;
- identify verified mappings and gaps;
- define the future implementation plan.

Out of scope:

- changing any UDA content;
- changing CAN-PLAN sequencing or hours;
- changing Human Task projections;
- importing copyrighted textbook text;
- storing scans/pages of the textbook;
- runtime or database migrations;
- merge/deploy.

## Acceptance boundary

The design is ready for implementation planning when:

- all 25 canonical UDA are represented exactly once;
- every mapping carries a classification and evidence level;
- exact page claims are limited to already evidenced page ranges;
- Informatica gaps are explicit;
- no UDA or annual-plan mutation is included in the change.
