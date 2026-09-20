# ECO-01/S3 — teacher-first multi-case validation I/II/III

Status: **NON_OPERATIONAL_VALIDATION / RUNTIME_DEFERRED**  
Date: 2026-09-20  
Depends on: ECO-01/S1 CLOSED, ECO-01/S2 CLOSED

## Goal

Validate that one teacher-first lesson-preparation shape is sufficient for three real Technology cases across grades I, II and III.

The validation is not about making the three lessons identical. It is about preserving the same information architecture while allowing legitimate differences in:

- curriculum regime;
- duration;
- sequence granularity;
- material readiness;
- presence/absence of Atlas resources;
- local section binding.

## Canonical cases

### Grade I — baseline

- title: **Bisogni, risorse e sistemi**
- source: ECO-01/S2 validated card;
- regime: Indicazioni 2025 / first application;
- duration: 60 minutes;
- Atlas: optional visual resource already represented through the canonical material path.

### Grade II — transition case

- title: **Agricoltura come sistema tecnologico**
- source: `ACT-B01-2` + `CAN-PACK-2A`;
- regime: Indicazioni 2012 / transition;
- duration: 2 hours;
- state: `PREPARED_NOT_SECTION_BOUND`;
- section/date/time: intentionally unbound.

### Grade III — final transition case

- title: **Forme e trasformazioni dell’energia**
- source: `ACT-B01-3` + `CAN-PACK-3A`;
- regime: Indicazioni 2012 / final transition year;
- duration: 2 hours;
- state: `PREPARED_NOT_SECTION_BOUND`;
- section/date/time: intentionally unbound.

## Shared teacher-first shape

Every case uses the same top-level information order:

1. lesson identity;
2. “in questa lezione”;
3. lesson objective;
4. curriculum connection;
5. teaching sequence;
6. materials for teacher;
7. materials for students;
8. optional/remaining material decisions;
9. before-class summary;
10. technical traceability;
11. non-operational notice.

No grade-specific top-level field is allowed.

## Shared material roles

The multi-case registry uses the same canonical roles:

- `TEACHER_BRIEF`;
- `STUDENT_HANDOUT`;
- `VISUAL_AID`.

A case may legitimately differ in slot status:

- Grade I: teacher/student ready, optional Atlas visual proposed;
- Grade II: teacher/student ready, agricultural visual examples still to select;
- Grade III: teacher/student ready, energy examples/visuals still to select.

This is model variation, not model branching.

## Curriculum authority

The current Arena Technology source is:

`src/features/curriculum/data/departmentCurriculumV31.section-09.json`

Rules:

- Grade I remains bound to the 2025 first-application regime.
- Grades II and III remain bound to the 2012 transition regime.
- CAN-PRG, CAN-UDA, ACT and CAN-PACK material are teaching design, not curriculum authority.
- No 2025 retrofitting is allowed for grades II/III.

## Snapshot traceability

S3 does not fabricate missing handoff fingerprints.

- Grade I reuses the fingerprint already materialized in S1/S2.
- Grade II/III use `NOT_MATERIALIZED_IN_S3_STATIC_CASE` until a future governed snapshot exists.
- Their cards may be evaluated for readability but cannot imply downstream adoption/persistence.

## Section binding

Grade II/III source documents explicitly state `PREPARED_NOT_SECTION_BOUND`.

Therefore S3 MUST NOT invent:

- section;
- date;
- timetable;
- actual duration;
- student-specific adaptations.

Teacher-facing wording: **Pronta da adattare alla sezione reale**.

## Acceptance matrix

| Check | Grade I | Grade II | Grade III |
| --- | --- | --- | --- |
| Same teacher-first shape | required | required | required |
| Correct regime visible | 2025 | 2012 transition | 2012 final transition |
| Arena curriculum source | required | required | required |
| Teaching design distinguished | required | required | required |
| Teacher material | canonical slot | canonical slot | canonical slot |
| Student material | canonical slot | canonical slot | canonical slot |
| Visual material | Atlas optional | local selection pending | local selection pending |
| Section/date inference | forbidden | forbidden | forbidden |
| DOS-A1 | deferred | deferred | deferred |

## Human review question

S3 should close only if the human reviewer confirms:

> “Posso usare questa stessa struttura per prima, seconda e terza senza che il modello mi costringa a ragionare in termini tecnici o perda le differenze didattiche e curricolari reali fra le tre annualità?”
