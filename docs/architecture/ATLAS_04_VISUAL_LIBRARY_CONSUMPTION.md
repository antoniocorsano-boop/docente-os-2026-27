# ATLAS-04 — Visual Library consumption contract

Status: proposed  
Tracking: #541  
First fixture: `TEC-MAT-001`

## Purpose

Docente OS consumes Learning Objects published by Curriculum Atlas / Visual Library without becoming a second canonical store.

The current Progetta surface already provides the correct product seam: it resolves planning context, surfaces relevant materials and keeps the grade-level core separate from section-specific adaptation. ATLAS-04 plugs into that seam as a read-only canonical resource reference.

## Authority model

| Concern | Canonical owner |
| --- | --- |
| Curriculum node, provenance | CurManLight / Curriculum Atlas |
| Learning Object identity and lifecycle | Curriculum Atlas Visual Library |
| Canonical material files | Visual Library / Drive |
| Lesson context, section adaptation, actual use | Docente OS |
| Human classroom validation | Teacher, recorded against the LO |

Docente OS MUST NOT silently copy an Atlas Learning Object into a new canonical record.

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
  assets: Array<{
    role: 'LIM' | 'MAP' | 'STUDENT' | 'TEACHER' | 'ASSESSMENT' | 'RECEIPT'
    label: string
    url: string
    format: string
    version: string
  }>
}
```

This is a reference contract, not a persistence decision. The implementation may map it onto the existing knowledge model if provenance and version remain explicit.

## First fixture

`TEC-MAT-001 — Materiali: proprietà, scelta e impiego`

Expected available assets:
- LIM;
- standalone concept map;
- student worksheet;
- teacher guide;
- assessment rubric;
- validation receipt.

Current Atlas lifecycle: `GENERATED`.

## Product behavior

### Progetta

When a Learning Object is relevant to the selected grade/focus:
- show it in the operational materials group;
- show the Atlas lifecycle and version;
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
- source/manifest link when available.

A locally generated print/projection copy is derivative and disposable.

## Integration constraints

This slice MUST NOT add:
- bidirectional Drive synchronization;
- automated Atlas state changes;
- content rewriting of canonical files;
- a second Learning Object authoring system;
- hidden duplication of source files into Knowledge.

## Acceptance criteria

1. `TEC-MAT-001` can be represented by the reference shape.
2. Progetta can distinguish the LO from an ordinary uploaded document.
3. Version and lifecycle are visible before use.
4. A user can open LIM, student, teacher and assessment variants from the current task context.
5. Navigation returns to the originating planning/class context.
6. No canonical material is duplicated as part of normal consumption.
7. `GENERATED` is visibly non-canonical.
8. Existing Knowledge provenance and reliability behavior is not weakened.
9. Automated tests cover lifecycle gating and task-continuity links.
10. Human validation remains a separate process.

## Suggested implementation sequence

1. Add a typed Atlas reference model at the presentation/domain boundary.
2. Add a fixture adapter for `TEC-MAT-001`.
3. Render the reference in Progetta using the existing guided-resource pattern.
4. Add asset actions in the resource detail / class context.
5. Add lifecycle gating tests.
6. Only after the fixture passes, decide whether references are ingested into Knowledge or resolved from a dedicated read-only provider.

## Evidence

The first Visual Library object is already stored and versioned in Drive with a manifest, artifact registry and classroom validation sheet. Its state remains `GENERATED` until a real lesson is documented.
