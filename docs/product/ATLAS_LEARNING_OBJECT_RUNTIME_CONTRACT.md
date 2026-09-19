# DOS-A1 — Atlas Learning Object runtime experience contract

Status: PRODUCT_CONTRACT_DRAFT  
Date: 2026-09-19  
Supersedes: ATLAS-04 contract PR #542 after consolidation  
Cross-product program: ECO-00

## Goal

A teacher can consume Curriculum Atlas Learning Objects from the current Docente OS task without creating a second source of truth.

**Arena governs → Atlas makes the curriculum intelligible/navigable → Docente OS makes it operational.**

## Authority

| Concern | Canonical owner |
| --- | --- |
| Curriculum baseline, applicability, institutional decision | CurManLight Arena |
| Curriculum semantic projection and public navigation | Curriculum Atlas |
| Learning Object identity/lifecycle | Curriculum Atlas Visual Library |
| Visual pattern identity/application | Curriculum Atlas Pattern Library / ATLAS-04C |
| Canonical material files | Atlas Visual Library / declared Drive source |
| Lesson context, class adaptation and actual use | Docente OS |
| Classroom validation evidence | Teacher via Docente OS, exported only as minimized TeachingUseReceipt |

Docente OS MUST NOT silently copy an Atlas Learning Object into a new canonical record and MUST NOT promote Atlas lifecycle state.

## Identity chain

`curriculum_node_id → LO_ID → PAT_ID → APP_ID → ART_ID`

- `LO_ID`: didactic content identity.
- `PAT_ID`: reusable visual-semantic pattern.
- `APP_ID`: application of a pattern to one LO.
- `ART_ID`: generated/delivered artifact.

Pattern metadata never replaces curriculum meaning or LO provenance.

## Runtime reference shape

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
  curriculumNodeIds?: string[]
  sourceRefs?: string[]
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

This is a reference contract, not a persistence decision.

## Entry points

- Progetta
- Classe
- Lesson Workspace
- Copilota contextual suggestion

## Primary UI

Show human labels first:
- material title;
- class/grade;
- duration where known;
- lifecycle/version;
- relevant actions.

Do not lead with LO/PAT/APP/ART technical ids.

## Material actions

- Proietta
- Scheda studente
- Guida docente
- Valutazione

Each action opens the declared canonical asset or a clearly marked disposable delivery derivative.

## Lifecycle behavior

### CANONICAL
May be auto-suggested when contextually relevant.

### REVIEWED
May be suggested with review state visible.

### GENERATED
Available only with a clear **da validare** state.

### DRAFT / RETIRED
Must not be auto-suggested.

Docente OS cannot promote lifecycle.

## Fixture set

### TEC-MAT-001 — Materiali: proprietà, scelta e impiego
- version: 0.2;
- lifecycle: GENERATED;
- primary pattern: PAT-SYS-001;
- secondary pattern: PAT-DES-001;
- application: APP-TEC-MAT-001;
- asset families: LIM, student, teacher, assessment/validation where available.

### TEC-SYS-001 — Bisogni, risorse e sistemi
- version: 0.2;
- lifecycle: GENERATED;
- primary pattern: PAT-SYS-001;
- application: APP-TEC-SYS-001;
- source: CAN-UDA-1-01 / first-grade curriculum documentation;
- asset families: LIM, student, teacher, validation.

### TEC-DES-001 — Micro-progetto sostenibile
- version: 0.2;
- lifecycle: GENERATED;
- primary pattern: PAT-DES-001;
- secondary pattern: PAT-PBL-001;
- application: APP-TEC-DES-001;
- source: CAN-ORCH-1 — Classe Prima Open Day;
- asset families: LIM, student, teacher, validation.

All three remain non-canonical until real classroom evidence authorizes a later lifecycle decision.

## Progetta behavior

When an Atlas LO is relevant to the selected grade/focus:
- show it in the operational materials group;
- show lifecycle and version;
- retain `LO_ID` and `APP_ID`;
- expose primary pattern as provenance/structure metadata, not competing content;
- open the canonical asset;
- preserve grade/section/block/UDA return context.

No UDA or material clone is required unless a genuine local adaptation is created.

## Class / lesson behavior

A referenced LO may expose direct actions:
- Proietta;
- Scheda studente;
- Guida docente;
- Valutazione.

These actions do not create a new source of truth.

## Provenance

Resource detail retains:
- LO id;
- version;
- lifecycle;
- Atlas canonical/source URL;
- curriculum relation/source refs;
- app/pattern reference when applicable;
- asset role/version.

Locally generated print/projection copies are derivative and disposable.

## Return context

Moving to Atlas or an asset must preserve:
- class;
- lesson/block;
- UDA;
- originating task.

The destination revalidates its own authority and private workspace context.

## Classroom validation and TeachingUseReceipt

After the lesson the teacher sees a very small validation prompt.

Detailed context remains private in Docente OS.

A minimized `TeachingUseReceipt` may later contain:
- LO id/version;
- material version(s);
- actual duration;
- validation outcome;
- usability findings;
- non-personal context only where necessary.

The receipt is evidence. It never promotes Atlas lifecycle automatically.

## Privacy

No student name or unnecessary student personal data is exported to Atlas by default.

Before any outbound receipt:
classification → minimization → personal-data filter → explicit contract.

## Integration constraints

DOS-A1 MUST NOT add:
- bidirectional Drive synchronization;
- automated Atlas state changes;
- content rewriting of canonical files;
- a second LO authoring system;
- hidden duplication into Knowledge;
- pattern-driven rewriting of curriculum meaning;
- direct writes into Arena.

## Acceptance criteria

1. The three fixture LOs are representable by the reference shape.
2. Progetta distinguishes an Atlas LO from an ordinary uploaded document.
3. Version and lifecycle are visible before use.
4. `APP_ID` and pattern provenance survive the handoff.
5. A user can open LIM, student, teacher and assessment variants where available.
6. Navigation returns to the originating planning/class context.
7. No canonical material is duplicated during normal consumption.
8. GENERATED is visibly non-canonical.
9. Existing Knowledge provenance/reliability behavior is not weakened.
10. Automated tests cover lifecycle gating and task-continuity links.
11. Human classroom validation remains a separate process.
12. A future TeachingUseReceipt is minimized and cannot mutate upstream authority.

## Implementation sequence

1. Add typed Atlas reference model at presentation/domain boundary.
2. Add fixture adapter for TEC-MAT-001, TEC-SYS-001 and TEC-DES-001.
3. Render references in Progetta using the existing guided-resource pattern.
4. Add asset actions in resource detail / class context.
5. Preserve LO/app/pattern/version/lifecycle.
6. Add lifecycle gating and return-context tests.
7. Add minimized TeachingUseReceipt contract.
8. Only after fixture evidence, decide whether resolution belongs in Knowledge or a dedicated read-only provider.

## Acceptance journey

`Oggi/Classi → Lezione → Materiali → Proietta → torna alla lezione → validazione breve`.

No manual Drive-folder navigation.

## References

ECO-00 Masterplan:
https://docs.google.com/document/d/1DFiwpEXcZqPp2Aqvo5Q13sd4wkp22CnzhRrrkJMSWiM/edit

ATLAS-P1:
https://github.com/antoniocorsano-boop/Curriculum-Atlas/issues/3

Original ATLAS-04 detail:
PR #542, consolidated here.
