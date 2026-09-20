# DOS-A1 — Atlas Learning Object runtime experience contract

Status: PRODUCT_CONTRACT_DRAFT  
Date: 2026-09-20  
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
| Learning Object identity/lifecycle | Curriculum Atlas |
| LearningObjectManifest v1 + asset references | Curriculum Atlas |
| Visual pattern identity/application | Curriculum Atlas Pattern Library / ATLAS-04C |
| Canonical material bytes | Source declared by the Atlas manifest, including Drive when declared |
| Temporary print/projection derivative | Docente OS, disposable |
| Stable teacher adaptation | Docente OS local data; not a new Atlas source |
| Lesson context, class adaptation and actual use | Docente OS |
| Classroom validation evidence | Teacher via Docente OS; future export only as minimized TeachingUseReceipt v1 |

Docente OS MUST NOT silently copy an Atlas Learning Object into a new canonical record and MUST NOT promote Atlas lifecycle state.

## Identity chain

`curriculum_node_id → LO_ID → PAT_ID → APP_ID → ART_ID`

- `LO_ID`: didactic content identity.
- `PAT_ID`: reusable visual-semantic pattern.
- `APP_ID`: application of a pattern to one LO.
- `ART_ID`: generated/delivered artifact.

Pattern metadata never replaces curriculum meaning or LO provenance.

## Canonical contract and local projection

Cross-product contract: `LearningObjectManifest v1`.

`AtlasLearningObjectRef` is the Docente OS presentation/domain DTO projected from `LearningObjectManifest v1`. It is not a separate cross-product contract and does not redefine Atlas lifecycle or authority.

`MaterialAssetManifest v1` is the subordinate asset contract referenced by the LO manifest.

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

## State model

Keep these dimensions separate:

- `loLifecycle`: DRAFT | GENERATED | REVIEWED | CANONICAL | RETIRED;
- `assuranceState`: UNVERIFIED | AUTOMATED_PASS | HUMAN_REVIEWED;
- `curriculumDecisionState`: PROPOSED | APPROVED | REJECTED | SUPERSEDED, where applicable;
- display badges are derived projections only.

`REVIEWED` lifecycle does not imply `HUMAN_REVIEWED` assurance or institutional approval. Docente OS must never infer one dimension from another.

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

Moving to public Atlas or a public asset must preserve user continuity **without exporting private class context**.

Public handoff may contain only necessary publishable identifiers such as:
- LO id/version;
- curriculum node id;
- asset id/version;
- opaque return token when needed.

Class, section, lesson/block, UDA and originating task remain in Docente OS local/private state and are restored locally on return.

The destination revalidates its own authority. Atlas must not receive unnecessary class or workspace data.

## Classroom validation and future TeachingUseReceipt v1

After the lesson the teacher sees a very small validation prompt.

Detailed context remains private in Docente OS.

TeachingUseReceipt runtime emission is **out of scope for DOS-A1**. DOS-A1 preserves only the identifiers/versions needed for a future governed implementation.

A future minimized `TeachingUseReceipt v1` may contain:
- LO id/version;
- material version(s);
- actual duration;
- validation outcome;
- structured usability outcome/findings;
- non-personal context only where necessary.

The v1 contract must additionally define receiptId, contractVersion, issuer/recipient, correction/revocation behavior and incompatible-version handling. Free text is excluded from the public boundary by default.

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
12. DOS-A1 preserves the prerequisites for a future TeachingUseReceipt v1; no receipt is emitted by this slice and no upstream authority can be mutated.

## Implementation sequence

1. Add typed Atlas reference model at presentation/domain boundary.
2. Add fixture adapter for TEC-MAT-001, TEC-SYS-001 and TEC-DES-001.
3. Render references in Progetta using the existing guided-resource pattern.
4. Add asset actions in resource detail / class context.
5. Preserve LO/app/pattern/version/lifecycle.
6. Add lifecycle gating and return-context tests.
7. Preserve the identifiers/version data required by future TeachingUseReceipt v1 without implementing receipt emission.
8. Only after fixture evidence, decide whether resolution belongs in Knowledge or a dedicated read-only provider.

## Acceptance journey

`Oggi/Classi → Lezione → Materiali → Proietta → torna alla lezione → validazione breve`.

No manual Drive-folder navigation.

## Compatibility and rollback

Compatibility target:
- producer: Curriculum Atlas `LearningObjectManifest v1`;
- consumer: Docente OS DOS-A1;
- assets: `MaterialAssetManifest v1`;
- local projection: `AtlasLearningObjectRef`.

Compatible minor changes require fixture + validator + consumer tests. Breaking changes require a new major and explicit migration/parallel-support plan.

Rollback for DOS-A1 removes/disables the read-only Atlas integration and returns to existing local Docente OS material behavior. No Atlas or Arena state is mutated, so rollback does not require upstream data repair.

Known limitations:
- asset availability depends on the source declared by Atlas;
- DOS-A1 does not emit TeachingUseReceipt v1;
- no bidirectional synchronization is introduced.

Closure evidence:
- exact PR head;
- fixture/consumer compatibility evidence;
- privacy return-context test;
- lifecycle/assurance separation test;
- human cross-product review;
- pinned Drive revisions.

## Canonical Drive pin

- ECO-00 Masterplan **v0.2**, Drive revision **4**, verified 2026-09-20.
- ECO-00 Product & Assurance Process **v0.2**, Drive revision **4**, verified 2026-09-20.
- On semantic divergence, the pinned Drive canonical documents prevail until an explicit coordinated revision.

## References

ECO-00 Masterplan:
https://docs.google.com/document/d/1DFiwpEXcZqPp2Aqvo5Q13sd4wkp22CnzhRrrkJMSWiM/edit

ATLAS-P1:
https://github.com/antoniocorsano-boop/Curriculum-Atlas/issues/3

Original ATLAS-04 detail:
PR #542, consolidated here.
