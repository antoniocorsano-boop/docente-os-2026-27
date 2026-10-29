# T4 — Textbook / Curriculum Alignment Design

Status: DESIGN BASELINE
Date: 2026-10-29
Base: `develop@87e3c3b3b4be5abf0dacdf8513cc2f320dec0b34`

## Goal

Collegare il libro di testo effettivamente adottato ai requisiti curricolari e alle UDA/piano annuale senza trasformare il libro in fonte curricolare né creare una seconda identità del libro.

## Existing authority reused

T4 riusa i confini già presenti in DOCENTE OS:

- `TextbookAdoption` / `Textbook`: identità e decisione di adozione;
- MIM T1/T2: proposta ufficiale e conferma docente;
- `PublisherResourcePointer` / `TextbookTeachingKit`: risorse editore e materiali docente;
- `CurriculumContextForClassV1` / `CurriculumRequirementV1`: requisiti curricolari applicabili;
- `CurriculumCoverageEvaluation`: copertura curricolare del piano annuale.

T4 non introduce un nuovo `Textbook` né un nuovo flusso di adozione.

## Authority rule

`Arena/CML curriculum > annual plan/UDA > textbook support`.

Un allineamento al libro può spiegare, supportare e rendere reperibili contenuti; non può soddisfare da solo un requisito curricolare, alterare una UDA o cambiare il piano annuale.

## Alignment record

`TextbookCurriculumAlignmentV1` è una relazione derivata e verificabile. Deve contenere:

- `alignmentId`;
- `textbookAdoptionId`;
- `textbookId`;
- `teachingAssignmentId`;
- `curriculumContextId`;
- `requirementId`;
- opzionale `udaCode`;
- `relation`: `DIRECT | COMPOSED | SUPPORT`;
- `coverage`: `FULL | PARTIAL`;
- `evidenceLevel`: `VERIFIED_PAGE | VERIFIED_SECTION | VERIFIED_FEATURE | TO_VERIFY`;
- opzionali `sectionLabel`, `chapterLabel`, `pageRange`, `resourceRef`, `note`;
- `source`: `TEACHER_VERIFIED | PUBLISHER_PUBLIC | PUBLISHER_ACCOUNT`;
- opzionale `verifiedByTeacherAt`.

## Preconditions

Fail closed unless:

1. adoption status is `CONFIRMED`;
2. `alignment.textbookAdoptionId`, `textbookId` and `teachingAssignmentId` match that confirmed adoption;
3. the curricular context is valid;
4. `requirementId` exists in that exact curricular context;
5. exact pages are admitted only with `VERIFIED_PAGE`;
6. `TO_VERIFY` cannot expose exact pages as authoritative;
7. page ranges are positive, ordered integers;
8. a teacher-verified source requires `verifiedByTeacherAt`.

## Adopted textbook evidence for the pilot

For `Tecnologia.verde`, seconda edizione, configuration `Tecnologia + Disegno`, ISBN `9788808950758`, the only exact page ranges currently verified in project evidence are:

- pp. 16–18;
- pp. 19–23;
- pp. 24–27;
- pp. 28–31;

They support the sustainability area associated with first-year work. No other exact page number is promoted by T4 until verified.

The adopted configuration does not include the separate Informatica volume. Digital/informatics UDA coverage must therefore remain partial or structurally complemented; T4 must not fabricate textbook coverage.

## 25-UDA map

The prior gap analysis is retained as evidence, not as authority:

- 13 `DIRECT_CANDIDATE`;
- 9 `COMPOSED_CANDIDATE`;
- 2 `PARTIAL_GAP`: `CAN-UDA-1-06`, `CAN-UDA-2-08`;
- 1 `STRUCTURAL_GAP`: `CAN-UDA-3-07`.

Candidate classifications become runtime alignment only after the corresponding curriculum requirement and confirmed adoption are bound.

## Product behavior

Progetta may expose a secondary disclosure “Supporto dal libro adottato” only after the curriculum/UDA context is known. Human Task projections may expose the same information as secondary provenance. Neither surface may reorder or mutate canonical PLAN/UDA/PACK/curriculum sources.

## Out of scope

- no autonomous UDA rewrite;
- no autonomous annual-plan rewrite;
- no new textbook adoption flow;
- no DRM/auth bypass;
- no copying protected textbook content;
- no page inference from semantic similarity;
- no Registro bilateral synchronization in this tranche;
- no merge/deploy by this design alone.

## Qualification

T4 requires RED→GREEN Product CI on exact SHA. Any UI change additionally requires browser/HVA qualification at desktop and 390×844 before promotion.
