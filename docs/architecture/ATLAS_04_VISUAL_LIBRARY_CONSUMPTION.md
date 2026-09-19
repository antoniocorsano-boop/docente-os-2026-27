# ATLAS-04 — Visual Library consumption contract

Status: proposed  
Tracking: #541  
Fixture set: `TEC-MAT-001`, `TEC-SYS-001`, `TEC-DES-001`

## Purpose

Docente OS consumes Learning Objects published by Curriculum Atlas / Visual Library without becoming a second canonical store.

The current Progetta surface already provides the correct product seam: it resolves planning context, surfaces relevant materials and keeps the grade-level core separate from section-specific adaptation. ATLAS-04 plugs into that seam as a read-only canonical resource reference.

## Authority model

| Concern | Canonical owner |
| --- | --- |
| Curriculum node, provenance | CurManLight / Curriculum Atlas |
| Learning Object identity and lifecycle | Curriculum Atlas Visual Library |
| Visual pattern identity and lifecycle | Curriculum Atlas Pattern Library |
| Pattern × Learning Object application | Curriculum Atlas ATLAS-04C |
| Canonical material files | Visual Library / Drive |
| Lesson context, section adaptation, actual use | Docente OS |
| Human classroom validation | Teacher, recorded against the LO |

Docente OS MUST NOT silently copy an Atlas Learning Object into a new canonical record.

## Identity chain

ATLAS-04C makes the identity chain explicit:

`LO_ID → PAT_ID → APP_ID → ART_ID`

- `LO_ID` identifies the didactic content.
- `PAT_ID` identifies the reusable visual-semantic pattern.
- `APP_ID` identifies one application of a pattern to a Learning Object.
- `ART_ID` identifies one generated artifact.

A pattern can organize a Learning Object, but it never replaces the curriculum content or provenance of the LO.

## Minimal reference shape

```ts
type AtlasLearningObjectRef = {
  loId: string
  title: string
  discipline: string
  grade: 'prima' | 'seconda' | 'terza'
  version: string
  lifecycle: 'DRAFT' | 'GENERATED' | 'REVIEWED' | 'CANONICAL' | 'RETIRED'
  canonicalUrl: string
  manifestUrl?: string
  patternApplication?: {
    appId: string
    primaryPatternId: string
    secondaryPatternIds?: string[]
  }
  assets: Array<{
    artId?: string
    role: 'LIM' | 'MAP' | 'STUDENT' | 'TEACHER' | 'ASSESSMENT' | 'RECEIPT'
    label: string
    url: string
    format: string
    version: string
  }>
}
```

This is a reference contract, not a persistence decision. The implementation may map it onto the existing knowledge model if provenance, version and the identity chain remain explicit.

## Fixture set

### TEC-MAT-001 — Materiali: proprietà, scelta e impiego

- Lifecycle: `GENERATED`
- Primary pattern: `PAT-SYS-001`
- Secondary pattern: `PAT-DES-001`
- Application: `APP-TEC-MAT-001`
- Assets: LIM, standalone map, student worksheet, teacher guide, assessment rubric, validation receipt.

### TEC-SYS-001 — Bisogni, risorse e sistemi

- Lifecycle: `GENERATED`
- Primary pattern: `PAT-SYS-001`
- Application: `APP-TEC-SYS-001`
- Curriculum source: CAN-UDA-1-01 / first-grade curriculum documentation.
- Assets generated: LIM, student worksheet, teacher guide, manifest, validation sheet.

### TEC-DES-001 — Micro-progetto sostenibile

- Lifecycle: `GENERATED`
- Primary pattern: `PAT-DES-001`
- Secondary pattern: `PAT-PBL-001`
- Application: `APP-TEC-DES-001`
- Curriculum source: CAN-ORCH-1 — Classe Prima Open Day.
- Assets generated: LIM, student worksheet, teacher guide, manifest, validation sheet.

## Product behavior

### Progetta

When a Learning Object is relevant to the selected grade/focus:
- show it in the operational materials group;
- show the Atlas lifecycle and version;
- retain `LO_ID` and `APP_ID`;
- expose the primary pattern only as provenance/structure metadata, not as a competing content object;
- open the canonical asset;
- preserve the current grade/section/block return path.

No UDA or material clone is required for a section unless a genuine adaptation is created.

### Class / lesson

A referenced LO may expose direct actions:
- Proietta;
- Scheda studente;
- Guida docente;
- Valutazione.

These actions open canonical resources or temporary delivery derivatives. They do not create a new source of truth.

### Lifecycle guard

- `CANONICAL`: may be surfaced automatically when contextually relevant.
- `REVIEWED`: may be surfaced with a visible review-state indication.
- `GENERATED`: may be used for explicit teacher testing but MUST be labeled as not yet validated.
- `DRAFT` and `RETIRED`: MUST NOT be auto-suggested.

Docente OS MUST NOT promote Atlas lifecycle state.

## Provenance requirements

The UI or resource detail must retain:
- `loId`;
- Atlas version;
- lifecycle;
- canonical URL;
- source/manifest link when available;
- `appId` and primary `patternId` when the material was rendered through ATLAS-04C.

A locally generated print/projection copy is derivative and disposable.

## Integration constraints

This slice MUST NOT add:
- bidirectional Drive synchronization;
- automated Atlas state changes;
- content rewriting of canonical files;
- a second Learning Object authoring system;
- hidden duplication of source files into Knowledge;
- pattern-driven rewriting of curriculum meaning.

## Acceptance criteria

1. The three fixture Learning Objects can be represented by the reference shape.
2. Progetta can distinguish an Atlas LO from an ordinary uploaded document.
3. Version and lifecycle are visible before use.
4. `APP_ID` and pattern provenance survive the read-only handoff.
5. A user can open available LIM, student, teacher and assessment variants from the current task context.
6. Navigation returns to the originating planning/class context.
7. No canonical material is duplicated as part of normal consumption.
8. `GENERATED` is visibly non-canonical.
9. Existing Knowledge provenance and reliability behavior is not weakened.
10. Automated tests cover lifecycle gating and task-continuity links.
11. Human validation remains a separate process.

## Suggested implementation sequence

1. Add a typed Atlas reference model at the presentation/domain boundary.
2. Add fixture adapters for `TEC-MAT-001`, `TEC-SYS-001` and `TEC-DES-001`.
3. Render the references in Progetta using the existing guided-resource pattern.
4. Add asset actions in the resource detail / class context.
5. Preserve `loId`, `appId`, primary `patternId`, version and lifecycle.
6. Add lifecycle gating and task-continuity tests.
7. Only after the fixtures pass, decide whether references are ingested into Knowledge or resolved from a dedicated read-only provider.

## Evidence

ATLAS-04C now stores a dedicated Pattern × Learning Object register and a selection gate. The first three applications are registered and the new SYS/DES fixture packages are materialized in Drive. Their state remains `GENERATED` until a real classroom use is documented.
