# DOCENTE OS — Class Workspace Contract

Status: COMPLETE / RUNTIME READY / INTERACTIVE ACCEPTANCE PENDING
Runtime baseline: `037f35770a38d82a798f4eb2895df3347549768d`

## Purpose

`Classi` is the canonical operational entry point for a teacher's sections. A class exists because it is present in the canonical section registry, not because a document happens to carry a class label.

The class workspace is also the bridge between the recurring timetable and the teacher's next didactic action: it may project the next non-completed Annual Plan block and use that projection to open the corresponding planning nucleus without creating new canonical data.

## Canonical rules

1. The section registry is the source of truth for which classes/sections exist in the teacher context.
2. Teaching assignments enrich a section with discipline and weekly load; they do not create the section.
3. Knowledge assets may be linked to a section, grade, UDA or pack, but they never determine whether the section exists.
4. `Orario` may open the canonical class workspace only for lessons bound to a real teaching assignment.
5. A manual `CLASS_PRESENCE` label (for example `3B`) never creates or resolves a canonical class workspace automatically.
6. The class workspace is read/orient-first: it summarizes context and links to existing work surfaces. It does not duplicate Annual Plan, Progetta, Knowledge or Timetable data.
7. The next didactic phase is derived only from the canonical Annual Plan sequence and recorded progress. DOCENTE OS must not claim that a phase is being prepared unless such a state exists explicitly.
8. Section-specific planning adaptations remain separate from the common grade nucleus. Opening a section never creates a copy of the common UDA.

## Human model

- **Classe** = con chi lavoro.
- **Cattedra** = cosa insegno in quella classe e per quante ore.
- **Orario** = quando la incontro nella settimana tipo.
- **Piano annuale** = cosa devo insegnare e quanto ho svolto.
- **Progetta** = cosa preparo nel nucleo comune del grado e, solo quando serve, come lo adatto alla sezione.
- **Conoscenza** = fonti e materiali collegati.

## Class workspace primary surface

The class workspace shows, in this order:

1. class identity and confirmation state;
2. **next Annual Plan phase**, derived from the first active block not completed or cancelled;
3. explicit status of that phase (`Pianificato` or `Da preparare`), without inferred preparation state;
4. action **Prepara questa fase** into the exact Progetta context;
5. explicitly pertinent Knowledge materials for current pack/section/grade;
6. teaching assignment(s), discipline and weekly load;
7. links into Annual Plan, Progetta, Knowledge and Timetable;
8. secondary technical/source details only on demand.

## Navigation contract

Canonical route: `/classi/<sectionId>`.

`sectionId` is validated against the current workspace and academic-year snapshot. Invalid or foreign ids fail closed.

From `Orario`:
- canonical lesson -> `Apri classe` (primary), `Piano annuale` and `Modifica orario` (secondary);
- manual class presence -> no canonical class deep-link unless a future explicit human resolution is implemented.

From `Classe` to focused `Progetta`:

`/progetta?grade=<grade>&section=<sectionId>&block=<Bxx>&uda=<x-xx>&pack=<CAN-PACK-xY>#focus-operativo`

The focus parameters are syntax-validated. `sectionId` is resolved again against the canonical current-year section registry before section context is applied.

From `Progetta`:
- grade context narrows the common planning nucleus while common assets remain available;
- when a valid section context is present, adaptations belonging to other sections are excluded;
- focused assets matching block/UDA/pack are shown first;
- focused assets are separated into **Nucleo comune del grado** and **Adattamento della sezione**;
- if no section adaptation exists, the common nucleus remains the operative source and no copy is created;
- focused assets are not repeated in the general planning groups below.

## Runtime implementation

Merged slices:

- PR #49 — canonical Classi registry + `/classi/<sectionId>` workspace + grade-aware Progetta;
- PR #50 — Orario opens the canonical class workspace as the primary lesson action;
- PR #51 — operational lesson focus + pertinent materials + exact Class → Progetta deep-link + common-nucleus/section-adaptation separation.

Verified gates for PR #51:

- tests: **44/44 PASS**;
- TypeScript: **PASS**;
- lint: **PASS**;
- Next.js build: **PASS**;
- automated review: **PASS**;
- Netlify develop preview: **READY** on `037f3577…`.

Vercel failures observed on the same commit are quota/build-rate-limit failures and are not product validation failures.

## Acceptance criteria

- `Classi` renders canonical sections even when no Knowledge assets are linked. **IMPLEMENTED**
- Knowledge tags cannot create phantom classes. **IMPLEMENTED**
- Every canonical section card opens `/classi/<sectionId>`. **IMPLEMENTED**
- A class workspace can be opened from an Orario lesson bound to its teaching assignment. **IMPLEMENTED**
- Manual class presence remains isolated from the canonical section registry. **IMPLEMENTED**
- The class workspace projects the next canonical Annual Plan block without inventing a preparation state. **IMPLEMENTED**
- `Prepara questa fase` carries grade, canonical section, block, UDA and pack into Progetta. **IMPLEMENTED**
- Progetta validates the section before applying section context. **IMPLEMENTED**
- Progetta keeps the common grade nucleus separate from section-specific adaptations. **IMPLEMENTED**
- Adaptations of other sections are excluded from the current section context. **IMPLEMENTED**
- No section-specific adaptation is required to use the common nucleus. **IMPLEMENTED**
- No database migration or new write capability is required for this slice. **VERIFIED**

## Interactive acceptance still required

1. Open `Classi` with real workspace data and confirm all configured sections appear even without linked documents.
2. From Orario, tap a canonical lesson and choose `Apri classe`; verify the correct section opens.
3. In the class workspace verify that **Prossimo nel piano** corresponds to the first actual non-completed B01–B33 block for that section.
4. Verify the material list contains only items explicitly pertinent to current pack, section or grade.
5. Choose **Prepara questa fase** and verify Progetta opens directly on the expected block/UDA/CAN-PACK focus.
6. In focused Progetta verify that **Nucleo comune del grado** and **Adattamento della sezione** are visually and semantically distinct.
7. Verify another section's adaptation is not visible in the current section context.
8. If no adaptation exists for the section, verify the common UDA remains usable without duplication.
9. From the class workspace open `Piano annuale`; verify the correct section remains selected.
10. Verify a manual presence such as `3B · Supplenza` does not expose `Apri classe`.
