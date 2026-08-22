# DOCENTE OS — Timetable Guidance Map Contract v1

Status: CANONICAL

## 1. Product role

`Orario` is the teacher's recurring weekly guidance map.

It answers: **where am I, with which class, and what kind of presence do I have in this hour?**

It is not a separate daily dashboard and it is not the Calendar.

The weekly grid is the primary surface. The Day view is a projection of the same recurring timetable, not a dated calendar view.

## 2. Domain independence

Orario is autonomous from Calendar.

- Orario owns recurring weekday/time patterns and timetable versions.
- Calendar owns real dates, school-day status and dated events.
- A later temporal projection may read both, but neither domain owns or mutates the other.

## 3. Slot meanings

### 3.1 Lesson of my teaching assignment — `LESSON`

A normal lesson is linked to one canonical `teaching_assignment`.

It contributes to weekly teaching-load coverage.

### 3.2 Presence in another class — `CLASS_PRESENCE`

The teacher may have a recurring presence in a class that is not part of their canonical Classes/Cattedra.

The user records:

- manual class label, e.g. `3B`;
- presence kind: substitution, co-teaching, supervision/assistance, project/activity, other;
- optional room;
- optional note.

A manual class label:

- does **not** create an `annual_plan_section`;
- does **not** create or change a `teaching_assignment`;
- does **not** contribute to Cattedra weekly-load coverage;
- exists only as contextual information on the recurring timetable slot.

### 3.3 Other recurring commitments

`DISPOSITION`, `RECEPTION`, and `OTHER` remain class-independent commitments.

## 4. Human interaction

Selecting an empty cell asks first:

**Che cosa fai in quest’ora?**

Then the UI progressively reveals only the fields required by the selected meaning.

- Lesson → choose from Cattedra.
- Presence in another class → type the class label manually and choose presence kind.
- Other commitments → no class field.

The grid must display enough information to orient the teacher at a glance. It must not force the user into Settings for temporary/non-owned classes.

## 5. Coverage rule

Cattedra coverage is computed only from `LESSON` slots linked to `teaching_assignments`.

`CLASS_PRESENCE`, Disposition, Reception and Other never consume or satisfy the canonical weekly minutes of a teaching assignment.

## 6. Stability rules

- Existing LESSON and special slots remain valid.
- No overlap is allowed inside one timetable version.
- Only DRAFT timetable versions are editable.
- Manual class labels are normalized to uppercase without spaces.
- Class-presence data remains under the same timetable RLS boundary.
- No AI tool may write timetable slots without the same application/domain validation and explicit human action.
