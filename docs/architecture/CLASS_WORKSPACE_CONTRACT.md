# DOCENTE OS — Class Workspace Contract

Status: COMPLETE / RUNTIME READY / INTERACTIVE ACCEPTANCE PENDING
Runtime baseline: `3dfe546e0322cf18ea2dd5a57f93e337d7a10e75`

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

The class workspace shows, in this order:

1. class identity and confirmation state;
2. teaching assignment(s), discipline and weekly load;
3. annual-plan progress summary;
4. primary actions into Annual Plan, Progetta, Knowledge and Timetable;
5. secondary technical/source details only on demand.

## Navigation contract

Canonical route: `/classi/<sectionId>`.

`sectionId` is validated against the current workspace and academic-year snapshot. Invalid or foreign ids fail closed.

From `Orario`:
- canonical lesson -> `Apri classe` (primary), `Piano annuale` and `Modifica orario` (secondary);
- manual class presence -> no canonical class deep-link unless a future explicit human resolution is implemented.

From `Progetta`:
- grade context may be passed and used to narrow planning content;
- common content remains visible;
- section context does not duplicate the common didactic nucleus per section.

## Runtime implementation

Merged slices:

- PR #49 — canonical Classi registry + `/classi/<sectionId>` workspace + grade-aware Progetta;
- PR #50 — Orario opens the canonical class workspace as the primary lesson action.

Verified gates:

- tests: PASS;
- TypeScript: PASS;
- lint: PASS;
- Next.js build: PASS;
- Netlify develop preview: READY on `3dfe546e…`.

## Acceptance criteria

- `Classi` renders canonical sections even when no Knowledge assets are linked. **IMPLEMENTED**
- Knowledge tags cannot create phantom classes. **IMPLEMENTED**
- Every canonical section card opens `/classi/<sectionId>`. **IMPLEMENTED**
- A class workspace can be opened from an Orario lesson bound to its teaching assignment. **IMPLEMENTED**
- Manual class presence remains isolated from the canonical section registry. **IMPLEMENTED**
- Progetta can preserve grade context without duplicating planning per section. **IMPLEMENTED**
- No database migration is required for this slice. **VERIFIED**

## Interactive acceptance still required

1. Open `Classi` with real workspace data and confirm all configured sections appear even without linked documents.
2. Open one section and verify Cattedra and annual-plan progress correspond to the same canonical section.
3. From Orario, tap a lesson and choose `Apri classe`; verify the correct section opens.
4. From the class workspace open `Piano annuale`; verify the correct section remains selected.
5. Open `Progetta`; verify the correct grade context is shown while common materials remain available.
6. Verify a manual presence such as `3B · Supplenza` does not expose `Apri classe`.
