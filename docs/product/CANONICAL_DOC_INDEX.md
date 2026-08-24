# DOCENTE OS — Canonical Documentation Index

Data: 2026-08-24  
Stato: CANONICAL

## Ordine di autorità

Quando due documenti sembrano divergere, applicare questo ordine:

1. **Security / RLS / domain invariants**
2. **ADR accettate**
3. **Product Experience Masterplan**
4. **Specifiche canoniche di prodotto e di composizione dominio**
5. **Contratti di esperienza verticali**
6. **Design System V2**
7. **Specifiche verticali di modulo**
8. documenti storici / implementation notes

Per il solo **stato operativo corrente** (runtime attivo, capability complete/aperta, gate correnti e residui), la fonte sintetica autorevole è `docs/product/PROJECT_STATUS_CURRENT.md`. I file `PROJECT_STATUS_YYYY-MM-DD.md` sono checkpoint storici e non prevalgono sullo stato CURRENT.

## Core architecture

- `docs/architecture/ADR-001-product-stack.md` — stack e confini fondamentali.
- `docs/architecture/ADR-002-experience-platform.md` — component platform, assistant layer, hosting operativo.
- `docs/architecture/STRUCTURE.md` — struttura generale repository/prodotto.
- `docs/architecture/P1_PERSISTENCE_IDENTITY.md` — persistenza/identità.
- `docs/architecture/P2_PLANNER.md` — Attività/Oggi e `PlannerTask`.
- `docs/architecture/KB_INGESTION.md` — ingestione Conoscenza.
- `docs/architecture/SETTINGS_CANONICAL_SPEC.md` — master data e invarianti delle Impostazioni.
- `docs/architecture/TIMETABLE_CANONICAL_SPEC.md` — Orario e sue entità verticali.
- `docs/architecture/WORK_TIME_MENTAL_MODEL.md` — distinzione utente tra Attività, Piano annuale, Orario, Calendario e Oggi.
- `docs/architecture/TEMPORAL_COMPOSITION_CANONICAL_SPEC.md` — **Orario e Calendario indipendenti; Temporal Projection come unico livello di composizione autorizzato**.
- `docs/architecture/AI_COLLABORATION_CANONICAL_SPEC.md` — collaborazione AI e human-in-the-loop.

### Regola temporale di autorità

Per ogni lavoro T3/T4:

1. `WORK_TIME_MENTAL_MODEL.md` governa il significato per l'utente;
2. `TEMPORAL_COMPOSITION_CANONICAL_SPEC.md` governa le dipendenze tra Orario e Calendario;
3. `TIMETABLE_CANONICAL_SPEC.md` governa le entità interne dell'Orario e va interpretato senza introdurre dipendenze dal dominio Calendario.

Sono vietati import/repository dependency `Timetable -> Calendar` e `Calendar -> Timetable`; la composizione resta confinata al servizio di Temporal Projection.

## Product

- `docs/product/PROJECT_STATUS_CURRENT.md` — **stato sintetico corrente: runtime, capability, gate, maturità e residui**.
- `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md` — north star e programma X0–X6.
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` — tono, microcopy e grammatica collaborativa.
- `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md` — **contratto vincolante per configurazione guidata e gestione del contesto docente**.
- `docs/product/SETTINGS_CONTEXT_DISCLOSURE_NOTE.md` — **regola canonica “contesto completo, esposizione minima” per le Impostazioni**.
- `docs/product/PROJECT_STATUS_2026-08-22.md` — checkpoint storico del 22 agosto; non descrive più da solo il runtime/capability correnti.

### Regola Impostazioni

Per ogni lavoro su `/impostazioni`:

1. `SETTINGS_CANONICAL_SPEC.md` governa persistenza, sorgenti dati e invarianti;
2. `SETTINGS_EXPERIENCE_CONTRACT.md` governa ordine, stati, feedback e dipendenze percepite;
3. `SETTINGS_CONTEXT_DISCLOSURE_NOTE.md` governa **quanto contesto mostrare per default** e impone progressive disclosure;
4. `DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` governa tono e microcopy trasversali.

È vietato introdurre una seconda Cattedra: Impostazioni e Orario devono usare gli stessi `teaching_assignments`.

## Human + Visual Acceptance

- `product/design/HUMAN-EXPERIENCE-CONTRACT.md` — contratto Human.
- `product/design/VISUAL-ACCEPTANCE.md` — procedura di accettazione visuale.
- `product/design/MOBILE-RULES.md` — regole mobile.
- `product/design/ACCESSIBILITY-RULES.md` — regole di accessibilità.
- `product/design/reviews/` — decisioni visuali datate e closure evidence.

Le review datate sono append-only come evidenza storica: una review successiva può chiudere un WATCH precedente senza riscrivere il documento storico. Lo stato sintetico corrente dei finding chiusi/aperti deve essere riportato in `PROJECT_STATUS_CURRENT.md`.

## Design

- `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md` — design system attuale per ogni nuovo lavoro.
- `docs/design/DESIGN_SYSTEM_V1.md` — riferimento storico; non governa nuove implementazioni quando confligge con V2.

## Regola di aggiornamento

Ogni slice che modifica una decisione canonica deve:

1. aggiornare prima o insieme il documento pertinente;
2. dichiarare se la modifica è `COMPATIBLE`, `SUPERSEDING` o `BREAKING`;
3. non lasciare nel repository istruzioni operative incompatibili;
4. aggiornare `PROJECT_STATUS_CURRENT.md` quando cambia una macro-capability, il runtime canonico, un gate maggiore o un rischio di maturità rilevante.

I checkpoint datati non devono essere continuamente riscritti: preservano la storia del progetto.

## Regola per agenti di sviluppo

Prima di implementare una slice, leggere almeno:

1. `PROJECT_STATUS_CURRENT.md`;
2. ADR-001;
3. ADR-002;
4. Product Experience Masterplan;
5. Language & Collaboration System;
6. Design System V2;
7. la specifica verticale della slice;
8. il relativo contratto di esperienza, se presente;
9. per T3/T4, sempre anche Work/Time Mental Model e Temporal Composition Canonical Spec.

Nessun agente deve inferire una nuova architettura da un singolo file runtime quando esiste una decisione canonica esplicita; nessun agente deve inferire lo stato corrente da un checkpoint datato quando esiste `PROJECT_STATUS_CURRENT.md`.
