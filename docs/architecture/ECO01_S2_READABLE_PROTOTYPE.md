# ECO-01/S2 — readable unified lesson-preparation prototype

Status: **NON_OPERATIONAL PROTOTYPE / RUNTIME_DEFERRED**  
Date: 2026-09-20  
Program: ECO-01  
Depends on: ECO-01/S1 CLOSED

## Goal

Convert the S1 contracts and fixture semantics into a single teacher-readable lesson-preparation card without changing runtime types or introducing cross-product integration.

## Canonical model binding

The prototype represents one view assembled from the already-governed concepts:

- `NextLessonPreparation`;
- `LessonPreparationManifest`;
- `LessonPreparationManifest.materialSlots`;
- Arena `CurriculumSnapshot v1` provenance.

No parallel model is created.

## Teacher-first presentation rule

The primary surface must use teacher language first.

Technical contract terms such as `fingerprint`, `materialSlots`, lifecycle, assurance, contract ids and source refs must not dominate the lesson card. They belong in a secondary **Dettagli e tracciabilità** area.

Primary wording should answer, in this order:
- cosa devo fare;
- cosa è già pronto;
- cosa devo decidere;
- cosa useranno gli studenti;
- cosa proietterò o mostrerò;
- da dove arriva il curricolo.

The teacher should be able to use the card without knowing ECO-01, Atlas contract names or internal read-model terminology.

## Information hierarchy

The readable card is intentionally organized in this order:

1. **What lesson is this?** — discipline, grade, duration, title.
2. **Why this lesson?** — Arena curriculum source, target and objective.
3. **What will happen?** — canonical sequence.
4. **What do I need?** — materialSlots with teacher/student/optional Atlas resources.
5. **What still needs a decision?** — readiness/review state.
6. **Where did this information come from?** — provenance, version and fingerprint.
7. **What is not active?** — explicit non-operational / DOS-A1 deferred notice.

This ordering is for human readability only. It does not change authority or persistence.

## Readable status semantics

- Arena curriculum: **approvato / autorevole** only when S1 decision evidence exists.
- Teacher brief: **pronto** when the canonical slot is `READY`.
- Student handout: **pronto** when the canonical slot is `READY`.
- Atlas resource: **opzionale / da scegliere per questa lezione** when the slot is `PROPOSED`, even if the Atlas source itself is reviewed.
- Missing required material: **preparazione incompleta** corresponding to canonical manifest `DRAFT`.
- Revalidation/fingerprint conflict: **rivalidazione richiesta**.

## Curriculum approval vs Docente OS intake

The prototype keeps two states distinct:

- **Arena curriculum authority / approval** — supplied by the governed Arena snapshot;
- **Docente OS intake/revalidation state** — supplied by the downstream acceptance model.

For S2, because no runtime intake occurs, the prototype uses the explicit non-operational downstream state:

`AWAITING_TEACHER_DECISION`

Teacher-facing wording: **Da confermare nel contesto Docente OS**.

This means the curriculum can be previewed for lesson preparation, but the card must not imply that Docente OS has already persisted or adopted the handoff.

## Atlas provenance rule

The readable prototype must keep visible, without turning them into lesson authority:

- LO id/version;
- asset id/version;
- lifecycle;
- assurance;
- source ref;
- lesson-slot status.

The source lifecycle/assurance and the local lesson-slot decision are distinct.

## Files

- teacher-readable Markdown prototype: `docs/prototypes/ECO01_S2_UNIFIED_LESSON_PREPARATION.md`;
- standalone static HTML prototype: `docs/prototypes/eco01-s2-unified-lesson-preparation.html`.

Neither file is referenced by a product route or build entry point.

## Human review questions

The reviewer should verify:

1. In under a minute, can a teacher understand what to teach and what materials are ready?
2. Is Arena clearly the curriculum source?
3. Is Atlas clearly only an optional material source?
4. Are teacher and student materials visible in one place?
5. Are version/fingerprint/provenance available without overwhelming the main lesson view?
6. Is any unresolved decision clearly surfaced?
7. Is it obvious that this is a non-operational prototype and that `DOS-A1` is deferred?
