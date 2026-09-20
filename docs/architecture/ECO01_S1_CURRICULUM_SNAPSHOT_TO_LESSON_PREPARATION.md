# ECO-01/S1 — CurriculumSnapshot v1 → lesson preparation mapping

Status: **NON-OPERATIONAL PROTOTYPE / RUNTIME_DEFERRED**  
Date: 2026-09-20  
Program: ECO-01  
Governed memory: `CML-DOS-INTEGRATED-GOVERNANCE-V1`

## Purpose

Define how the authoritative Arena curriculum snapshot can be represented in the existing Docente OS lesson-preparation model without activating runtime interoperability.

No API, DB, storage, route, background job or automatic import is introduced by S1.

## Existing canonical Docente OS models

Current read models already present in `develop`:

- `NextLessonPreparation`
- `LessonPreparationManifest`
- `LessonPreparationManifest.materialSlots`

Relevant current files:

- `product/src/core/presentation/next-lesson-preparation.ts`
- `product/src/core/presentation/lesson-preparation-manifest.ts`

ECO-01 does not create a second lesson-preparation store.

## Arena curriculum source

External ECO-01 contract name:

`CurriculumSnapshot v1`

Arena producer profile:

`CML_CURRICULUM_RELEASE_CONTRACT_V1`

The direct Arena → Docente OS curriculum intake/revalidation boundary remains canonical.

Atlas is not used to determine curriculum authority.

## Proposed non-runtime curriculum projection

For the prototype only, the unified lesson card uses this conceptual projection:

```ts
type Eco01CurriculumContextProjection = {
  snapshotRef: string
  curriculumVersionRef: string
  structuralAuthorityFingerprint: string
  authorityState: 'APPROVED' | 'PROVISIONAL_COMPLETE'
  disciplineId: string
  gradeRef: string
  achievementTargets: string[]
  learningObjectives: string[]
  curriculumNodeRefs: string[]
  provenanceRefs: string[]
  acquiredAt: string
  humanValidation: 'REVIEW_REQUIRED' | 'HUMAN_REVIEWED'
}
```

This projection is **not added to runtime types by S1**.

A future authorized implementation may attach an equivalent typed projection to `NextLessonPreparation` or its governed successor.

## Field mapping

| CurriculumSnapshot v1 | Docente OS S1 target | Rule |
| --- | --- | --- |
| curriculumVersionRef | prototype curriculum projection + provenance | never replaces teacher lesson identity |
| structuralFingerprint | prototype curriculum projection + revalidation reason | change at same nominal version requires revalidation |
| authorityState | review gate | never inferred from Atlas |
| applicabilityContext.disciplineRef | `NextLessonPreparation.lesson.disciplineId` consistency check | mismatch → BLOCKED |
| applicabilityContext.gradeRef | section/class binding check | mismatch → BLOCKED |
| planningSemantics.requirements | achievement/objective projection | only explicit referenced requirements |
| planningSemantics.nodeRefs | provenance + curriculum refs | retain Arena identity |
| provenanceRefs | `NextLessonPreparation.provenance` / manifest provenance | must remain visible |
| issuedAt | acquiredAt/source metadata | informational, not authority |
| downstreamPolicy | runtime effect guard | must remain PREVIEW_ONLY / automaticWriteAllowed=false |

## Mapping into NextLessonPreparation

Existing fields reused in the non-operational prototype:

- `lesson.disciplineId` — discipline binding;
- `lesson.sectionId` — local teacher/class context, never supplied by Atlas;
- `canonicalLesson.objective` — lesson objective already owned by Docente OS;
- `missingInformation` — stale/missing/revalidation findings;
- `provenance` — Arena snapshot identity, fingerprint and source refs.

Important: the Arena snapshot does not overwrite an already-reviewed teacher lesson objective. A mismatch is represented as a review requirement, not a silent mutation.

## Mapping into LessonPreparationManifest

The manifest remains the canonical lesson composition.

Curriculum source contributes to:

- `objective` consistency/review;
- `provenance`;
- `missingInformation`;
- `readiness` through fail-closed/review-required rules.

It does not create a second curriculum store.

## Atlas resources → materialSlots

Atlas resources are subordinate material sources only.

A future authorized adapter must convert `LearningObjectManifest v1` / `MaterialAssetManifest v1` into the existing material slots:

| Atlas/material role | Canonical slot |
| --- | --- |
| teacher guide | `TEACHER_BRIEF` |
| projection/LIM | `LIM_VIEW` |
| student worksheet | `STUDENT_HANDOUT` |
| mini deck | `MINI_DECK` |
| infographic/diagram | `VISUAL_AID` |
| assessment/check | `ASSESSMENT` |

State mapping:

- accepted/reviewed usable asset → `READY`;
- generated/unreviewed asset → `PROPOSED` or `NEEDS_REVIEW`;
- required but unavailable → `MISSING`.

Every Atlas-backed slot must keep, through canonical slot provenance and resource refs:

- LO id/version;
- asset id/version;
- source URL/ref;
- lifecycle state;
- assurance state;
- provenance.

The slot status (`READY | PROPOSED | NEEDS_REVIEW | MISSING`) is not a replacement for Atlas lifecycle or assurance; those remain separately represented in provenance.

There is no Atlas-only materials list outside the canonical manifest.

## Fail-closed rules

### BLOCKED

- unsupported snapshot contract/major;
- missing or invalid structural fingerprint;
- unresolved lesson section/class binding;
- discipline/grade mismatch;
- invalid or absent Arena authority state;
- snapshot source cannot be distinguished from Atlas;
- an Atlas resource attempts to supply curriculum authority.

### DRAFT

- at least one required material slot is `MISSING`;
- required lesson preparation information is absent.

This matches the current canonical `LessonPreparationManifest` builder, which treats missing required material as incomplete rather than merely awaiting review.

### PARTIAL / REVIEW_REQUIRED

- fingerprint changed at same curriculum version;
- provisional curriculum is usable for planning but requires revalidation;
- Atlas resource exists but is not human-reviewed/accepted;
- existing teacher objective differs from incoming authoritative requirement and needs explicit reconciliation.

### READY

Only when:

- the local lesson binding is valid;
- the Arena snapshot is accepted/revalidated for this lesson context;
- no unresolved authority/fingerprint issue remains;
- required `materialSlots` are covered;
- proposed Atlas assets are not presented as canonical.

## Demonstration fixture

`docs/fixtures/eco01-technology-grade1-lesson-preparation-demo-v1.json`

Demonstrates:

- Technology, first grade, 2026/27;
- Arena snapshot fingerprint `616de781`;
- lesson “Bisogni, risorse e sistemi”;
- teacher brief;
- student handout;
- optional Atlas visual resource in `VISUAL_AID`;
- all resources inside `materialSlots`;
- no runtime effect;
- DOS-A1 remains RUNTIME_DEFERRED.

## Acceptance for S1

- mapping is complete and unambiguous;
- no field makes Atlas curriculum-authoritative;
- no parallel materials path exists;
- same-version fingerprint change has a defined review behavior;
- current Docente OS models remain unchanged in runtime;
- fixture is understandable to a teacher and traceable to Arena.
