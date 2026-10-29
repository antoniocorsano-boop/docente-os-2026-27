# Textbook Alignment Map — Tecnologia 2026/2027

Status: **V0.1 / GAP ANALYSIS / HUMAN VERIFICATION REQUIRED**
Date: 2026-10-29

This document adds a traceable support layer between the canonical DOCENTE OS UDA and the adopted textbook. It does **not** change the authority, title, hours, sequence or content of any canonical UDA.

Design contract: `docs/superpowers/specs/2026-10-29-textbook-alignment-map-design.md`

## 1. Sources frozen for v0.1

### DOCENTE OS canonical sources

- `docs/architecture/UDA_CANONICAL_COVERAGE.md`
- `docs/architecture/ANNUAL_EXECUTION_PLAN.md`
- `docs/research/UDA_1_01_HUMAN_TASK_SOURCE_ALIGNMENT.md`
- approved Human Task projections/manifests used only to resolve exact UDA titles where needed.

### Adopted textbook

- *Tecnologia.verde*, seconda edizione — Giampietro Paci, Riccardo Paci, Lucia Bernardini — Zanichelli.
- Adopted configuration: **Tecnologia + Disegno**.
- ISBN: `9788808950758`.

Publisher adoption evidence confirms:

- Tecnologia section A — **Dalla materia prima ai rifiuti**;
- Tecnologia section B — **Produrre e consumare cibo**;
- Tecnologia section C — **Dalla sedia alla città**;
- Tecnologia section D — **Produrre e consumare energia**;
- Tecnologia section E — **La globalizzazione**;
- introductory chapter 2 — **Sostenibilità: 2030 e oltre**;
- chapter C1 — ergonomia e design;
- a Disegno volume with geometric constructions, orthogonal projections, perspective, patterns and physical/model-building activities;
- cross-cutting digital competences at the end of chapters;
- orientation activities at the end of every Tecnologia section;
- teacher-edition didactic suggestions and exercise solutions for each paragraph.

The ISBN adopted by the teacher is **not** the separate `Tecnologia + Informatica + Disegno` configuration. Therefore Informatica coverage must not be assumed.

### Local page evidence already used in teaching

For class Prima, the study guide derived from the adopted textbook has already fixed these page ranges for chapter **Sostenibilità: 2030 e oltre**:

- pp. 16–18 — Agenda 2030, sostenibilità, impronta ecologica;
- pp. 19–23 — suolo, acqua, impronta idrica;
- pp. 24–27 — aria, effetto serra, cambiamento climatico;
- pp. 28–31 — systemic synthesis from needs/resources to impacts and better choices.

These page ranges are the only exact textbook pages promoted to `VERIFIED_PAGE` in v0.1. All other page/chapter details remain to verify.

## 2. Classification legend

- `DIRECT_CANDIDATE` — strong one-domain correspondence; exact chapter/page audit still required before final `DIRECT`.
- `COMPOSED_CANDIDATE` — the UDA correctly combines multiple textbook areas and/or textbook plus other canonical sources.
- `PARTIAL_GAP` — textbook supports only part of the UDA; another approved source is required.
- `STRUCTURAL_GAP` — the adopted configuration does not contain the required domain/volume sufficiently.

Evidence:

- `VERIFIED_PAGE` — exact pages supported by current evidence.
- `VERIFIED_SECTION` — publisher confirms the textbook section/domain.
- `VERIFIED_FEATURE` — publisher confirms a cross-cutting feature/resource.
- `TO_VERIFY` — exact chapter/paragraph/page still requires human audit.

## 3. Alignment matrix — 25 canonical UDA

| UDA | Canonical title | Hours | Textbook support | Classification | Evidence | v0.1 decision |
|---|---|---:|---|---|---|---|
| `CAN-UDA-1-00` | Entrare nel laboratorio della Tecnologia | 4 | Introductory Tecnologia content + operational/safety sources outside the textbook | `COMPOSED_CANDIDATE` | `VERIFIED_FEATURE` + `TO_VERIFY` | Keep UDA unchanged. Textbook may support the concept of technology; school/lab safety remains canonical operational content. |
| `CAN-UDA-1-01` | Tecnologia, bisogni, risorse e sistemi | 8 | Introductory Tecnologia + chapter 2 `Sostenibilità: 2030 e oltre`; verified subset pp. 16–31 | `COMPOSED_CANDIDATE` | `VERIFIED_PAGE` for sustainability subset; other parts `TO_VERIFY` | Add page binding only to the sustainability nuclei. Do not pretend pp. 16–31 cover the whole UDA. |
| `CAN-UDA-1-02` | Materiali: dalla risorsa al prodotto | 12 | Tecnologia section A — materials lifecycle from raw material to disposal/recycling | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` | Chapter/page audit needed; no UDA rewrite indicated. |
| `CAN-UDA-1-03` | Disegnare per comprendere e comunicare | 14 | Disegno volume — geometric constructions and technical drawing progression | `DIRECT_CANDIDATE` | `VERIFIED_FEATURE` | Map exact drawing chapters/tables before final `DIRECT`. |
| `CAN-UDA-1-04` | Rifiuti, recupero ed economia circolare | 6 | Tecnologia section A explicitly spans raw material → waste/recycling | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` | Strong fit; audit exact chapter/pages and digital resources. |
| `CAN-UDA-1-05` | Dal problema al progetto | 10 | C1 ergonomia/design + Disegno projects/model-building activities | `COMPOSED_CANDIDATE` | `VERIFIED_FEATURE` | Preserve UDA process authority; textbook is scaffolding, not process authority. |
| `CAN-UDA-1-06` | Informazioni, dati e sistemi digitali | 6 | End-of-chapter digital competences/coding exist, but adopted configuration has no Informatica volume | `PARTIAL_GAP` | `VERIFIED_FEATURE` | Add approved complementary digital source; do not infer full textbook coverage. |
| `CAN-UDA-1-07` | Progetto tecnologico sostenibile | 6 | C1 design + chapter 2/cross-cutting sustainability + end-of-section projects/orientation | `COMPOSED_CANDIDATE` | `VERIFIED_FEATURE` | Multi-source alignment is expected; no 1:1 textbook chapter should be forced. |
| `CAN-UDA-2-01` | Agricoltura, suolo e produzioni sostenibili | 8 | Tecnologia section B — agriculture and food production/consumption | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` | Audit exact agriculture chapter/pages; retain sustainability links. |
| `CAN-UDA-2-02` | Alimenti, trasformazione e conservazione | 8 | Tecnologia section B — food | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` | Audit exact chapters/pages and multimedia. |
| `CAN-UDA-2-03` | Territorio, città e pianificazione | 8 | Tecnologia section C — from object/design to house/city | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` | Audit city/planning subsections; no structural change indicated. |
| `CAN-UDA-2-04` | Edificio, strutture e materiali da costruzione | 10 | Section C (house/building) + section A (materials) | `COMPOSED_CANDIDATE` | `VERIFIED_SECTION` | Intentionally composed across two textbook domains; preserve one UDA. |
| `CAN-UDA-2-05` | Abitazione, impianti, sicurezza ed efficienza | 8 | Tecnologia section C — house/city domain | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` | Verify exact house/plant/efficiency chapter coverage before final `DIRECT`. |
| `CAN-UDA-2-06` | Rilievo, scale e proiezioni ortogonali | 14 | Disegno volume; publisher explicitly documents multiple methods for orthogonal projections | `DIRECT_CANDIDATE` | `VERIFIED_FEATURE` | Strong evidence for P.O.; audit exact scale/survey pages separately. |
| `CAN-UDA-2-07` | Progettare uno spazio o un semplice oggetto | 6 | C1 ergonomia/design + Disegno projects | `COMPOSED_CANDIDATE` | `VERIFIED_FEATURE` | Combine Tecnologia design reasoning and Disegno representation. |
| `CAN-UDA-2-08` | Dati, rappresentazione digitale e modellazione introduttiva | 4 | Digital competences exist, but no adopted Informatica volume; Disegno supports representation, not sufficient digital modelling coverage | `PARTIAL_GAP` | `VERIFIED_FEATURE` | Requires approved complementary digital/modelling source. |
| `CAN-UDA-3-01` | Energia: forme, trasformazioni e fabbisogni | 8 | Tecnologia section D — energy | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` | Audit chapter/pages; use publisher multimedia only as support. |
| `CAN-UDA-3-02` | Fonti rinnovabili e non rinnovabili | 8 | Tecnologia section D — energy sources | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` | Audit exact chapters/pages. |
| `CAN-UDA-3-03` | Produzione, distribuzione e uso dell’energia elettrica | 8 | Tecnologia section D; publisher explicitly cites multimedia on thermal power plants/turbines | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` + `VERIFIED_FEATURE` | Strong domain fit; exact chapter/page audit required. |
| `CAN-UDA-3-04` | Elettricità, circuiti e sicurezza | 8 | Tecnologia section D covers energy/machines; exact electricity chapter/page binding not yet frozen in this map | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` + `TO_VERIFY` | Do not persist a chapter/page number until verified against the adopted volume. |
| `CAN-UDA-3-05` | Macchine, meccanismi e sistemi tecnologici | 8 | Tecnologia section D — energy and machines; publisher multimedia includes machines/turbines | `DIRECT_CANDIDATE` | `VERIFIED_SECTION` + `VERIFIED_FEATURE` | Audit exact machine/mechanism chapters/pages. |
| `CAN-UDA-3-06` | Assonometria, sezioni e rappresentazione tridimensionale | 12 | Disegno volume clearly supports technical representation, perspective and geometric/model activities; exact axonometry/section coverage still to verify | `COMPOSED_CANDIDATE` | `VERIFIED_FEATURE` + `TO_VERIFY` | Keep UDA; perform detailed Disegno index audit before claiming direct coverage. |
| `CAN-UDA-3-07` | Informatica, algoritmi, reti e automazione | 6 | Adopted ISBN lacks the separate Informatica volume. Technology volume has only cross-cutting digital competences | `STRUCTURAL_GAP` | `VERIFIED_FEATURE` | UDA remains curriculum-valid but requires an approved non-textbook/complementary Informatica source. |
| `CAN-UDA-3-08` | Tecnologia, sostenibilità e scelte responsabili | 4 | Sustainability is publisher-declared as cross-cutting throughout Tecnologia + chapter 2 | `COMPOSED_CANDIDATE` | `VERIFIED_FEATURE` | Treat as transversal synthesis; do not bind to one chapter only. |
| `CAN-UDA-3-09` | Progetto conclusivo e orientamento | 4 | End-of-section orientation activities and projects/professions across Tecnologia | `COMPOSED_CANDIDATE` | `VERIFIED_FEATURE` | Aggregate selected activities; canonical UDA remains the project/orientation authority. |

## 4. Conservative count

V0.1 intentionally uses a stricter threshold than the initial conversational estimate:

- `DIRECT_CANDIDATE`: **13**
- `COMPOSED_CANDIDATE`: **9**
- `PARTIAL_GAP`: **2**
- `STRUCTURAL_GAP`: **1**
- Total: **25**

This is not a quality score. It expresses how safely the current evidence supports a textbook relation.

## 5. Findings

### F1 — The canonical UDA set is not invalidated

The current evidence does not justify replacing the 25 UDA. Most UDA have a strong section-level correspondence with the adopted book.

### F2 — The main defect is missing provenance

DOCENTE OS currently explains many Human Task projections through `CAN-PLAN + CAN-UDA + CAN-PACK`. The textbook is not yet a first-class source binding, even where it is already used in real teaching.

### F3 — Informatica must stay explicit

`CAN-UDA-1-06`, `CAN-UDA-2-08` and especially `CAN-UDA-3-07` must not claim full textbook support under ISBN `9788808950758`.

### F4 — Disegno needs its own audit pass

The adopted configuration includes Disegno and publisher evidence confirms orthogonal projections and other technical drawing activities. Exact mappings for scales, axonometry, sections and individual tables still require a volume-index/page audit.

### F5 — Prima already has a useful page anchor

The verified pp. 16–31 sustainability sequence can immediately become the first exact textbook binding, but only for the matching nuclei of `CAN-UDA-1-01` and as support for later sustainability/project UDA.

## 6. Next verification pass

Order:

1. **Prima** — complete exact chapter/page map for UDA 1-00…1-07, using the physical/ebook index and teacher guide where available;
2. **Seconda** — section B/C + Disegno exact chapter/page audit;
3. **Terza** — section D/E + Disegno exact chapter/page audit;
4. identify complementary approved sources for the three digital gaps;
5. only after teacher verification, materialize a machine-readable `TextbookAlignment` projection.

## 7. What this document does not authorize

This map does not authorize:

- UDA rewrites;
- annual-hour changes;
- automatic textbook-driven sequencing;
- automatic adoption of textbook exercises as assessment;
- importing copyrighted textbook text into the repository;
- runtime changes;
- database migrations;
- merge or deployment.
