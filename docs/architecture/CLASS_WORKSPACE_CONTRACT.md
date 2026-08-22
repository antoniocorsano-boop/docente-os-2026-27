# DOCENTE OS — Class Workspace Contract

Status: DRAFT FOR IMPLEMENTATION

## Purpose

`Classi` is the canonical operational entry point for a teacher's sections. A class exists because it is present in the canonical section registry, not because a document happens to carry a class label.

## Canonical rules

1. The section registry is the source of truth for which classes/sections exist in the teacher context.
2. Teaching assignments enrich a section with discipline and weekly load; they do not create the section.
3. Knowledge assets may be linked to a section, but they never determine whether the section exists.
4. `Orario` may open the canonical class workspace only for lessons bound to a real teaching assignment.
5. A manual `CLASS_PRESENCE` label (for example `3B`) never creates or resolves a canonical class workspace automatically.
6. The class workspace is read/orient-first: it summarizes context and links to existing work surfaces. It does not duplicate Annual Plan, Progetta, Knowledge or Timetable data.

## Human model

- **Classe** = con chi lavoro.
- **Cattedra** = cosa insegno in quella classe e per quante ore.
- **Orario** = quando la incontro nella settimana tipo.
- **Piano annuale** = cosa devo insegnare e quanto ho svolto.
- **Progetta** = cosa preparo per quel grado/classe.
- **Conoscenza** = fonti e materiali collegati.

## Class workspace primary surface

The class workspace must show, in this order:

1. class identity and confirmation state;
2. teaching assignment(s), discipline and weekly load;
3. annual-plan progress summary;
4. primary actions into Annual Plan, Progetta, Knowledge and Timetable;
5. secondary technical/source details only on demand.

## Navigation contract

Canonical route: `/classi/<sectionId>`.

`sectionId` must be validated against the current workspace and academic-year snapshot. Invalid or foreign ids fail closed.

From `Orario`:
- canonical lesson -> `Apri classe` (primary), `Piano annuale` and `Modifica orario` (secondary);
- manual class presence -> no canonical class deep-link unless a future explicit human resolution is implemented.

From `Progetta`:
- grade context may be passed and used to narrow planning content;
- section context may be displayed, but must not duplicate the common didactic nucleus per section.

## Acceptance criteria

- `Classi` renders canonical sections even when no Knowledge assets are linked.
- Knowledge tags cannot create phantom classes.
- Every canonical section card opens `/classi/<sectionId>`.
- A class workspace can be opened from an Orario lesson bound to its teaching assignment.
- Manual class presence remains isolated from the canonical section registry.
- No database migration is required for this slice.
