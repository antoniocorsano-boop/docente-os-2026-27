# DOCENTE OS — Class Workspace Contract

Status: COMPLETE / RUNTIME READY / INTERACTIVE ACCEPTANCE PENDING
Runtime baseline: `c2175ed3741daadbceb6d08219bd589eb477abb9`

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
9. **Cognitive scope follows user intent:** generic planning context may expose the broader Progetta catalogue; a specific class/block/UDA/pack context must collapse to a short guided task surface and must not append the general planning catalogue below it.
10. A specific guided focus is valid only when the requested `Bxx` exists in the canonical grade plan and its UDA/pacchetto are coherent with that block. Incoherent combinations fail closed to the generic planning context.

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

The section is resolved again against the canonical current-year registry. The focus is then resolved against the canonical grade plan; `block`, `uda` and `pack` must describe the same canonical block.

### Focused Progetta

When a valid specific focus exists, Progetta renders a short action surface only:

1. current section/grade and canonical block;
2. human-readable phase title, UDA, pack and period;
3. **Adesso**: up to four explicitly pertinent common-grade resources, with UDA prioritized before operational materials;
4. **Solo se serve**: section-specific adaptations, kept separate from the common nucleus;
5. secondary exits to Class, Annual Plan and full grade planning.

The general workflow strip, content counts, catalogue groups and governance note are **not rendered below a focused task**. Full planning remains available through an explicit secondary action.

### Generic Progetta

When no valid specific focus exists:
- grade context may narrow the common planning catalogue;
- common assets remain available;
- if a section context is valid, adaptations belonging to other sections are excluded;
- the broader planning workflow/catalogue may be shown because the user is exploring rather than executing one specific task.

## Runtime implementation

Merged slices:

- PR #49 — canonical Classi registry + `/classi/<sectionId>` workspace + grade-aware Progetta;
- PR #50 — Orario opens the canonical class workspace as the primary lesson action;
- PR #51 — operational lesson focus + pertinent materials + exact Class → Progetta deep-link + common-nucleus/section-adaptation separation;
- PR #52 — cognitive-scope rule + canonical focus resolution + short guided Progetta task surface.

Verified gates for PR #52:

- tests: **45/45 PASS**;
- TypeScript: **PASS**;
- lint: **PASS** (one pre-existing warning outside this slice);
- Next.js build: **PASS**;
- automated review: **PASS**;
- Netlify develop preview: **READY** on `c2175ed3…`.

Vercel failures observed on the same development line are quota/build-rate-limit failures and are not product validation failures.

## Acceptance criteria

- `Classi` renders canonical sections even when no Knowledge assets are linked. **IMPLEMENTED**
- Knowledge tags cannot create phantom classes. **IMPLEMENTED**
- Every canonical section card opens `/classi/<sectionId>`. **IMPLEMENTED**
- A class workspace can be opened from an Orario lesson bound to its teaching assignment. **IMPLEMENTED**
- Manual class presence remains isolated from the canonical section registry. **IMPLEMENTED**
- The class workspace projects the next canonical Annual Plan block without inventing a preparation state. **IMPLEMENTED**
- `Prepara questa fase` carries grade, canonical section, block, UDA and pack into Progetta. **IMPLEMENTED**
- Progetta validates the section before applying section context. **IMPLEMENTED**
- Focused Progetta validates Bxx/UDA/pacchetto against the canonical grade plan. **IMPLEMENTED**
- Focused Progetta does not append the general long planning catalogue below the specific task. **IMPLEMENTED**
- Progetta keeps the common grade nucleus separate from section-specific adaptations. **IMPLEMENTED**
- Adaptations of other sections are excluded from the current section context. **IMPLEMENTED**
- No section-specific adaptation is required to use the common nucleus. **IMPLEMENTED**
- No database migration or new write capability is required for this slice. **VERIFIED**

## Interactive acceptance still required

1. From Orario, tap a canonical lesson and choose `Apri classe`; verify the correct section opens.
2. In the class workspace verify that **Prossimo nel piano** corresponds to the first actual non-completed B01–B33 block for that section.
3. Choose **Prepara questa fase** and verify the short guided Progetta surface opens on the expected canonical block/UDA/CAN-PACK.
4. On mobile, verify the guided surface shows the phase and **Adesso** resources without exposing the former long catalogue below it.
5. Verify UDA resources appear before operational materials when both are available.
6. Verify **Adattamento <sezione>** remains visibly secondary and does not create a copy when no adaptation exists.
7. Use **Esplora tutta la progettazione** and verify the broad grade catalogue is still reachable intentionally.
8. Verify a manual presence such as `3B · Supplenza` does not expose `Apri classe`.
