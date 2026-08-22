# DOCENTE OS — Canonical Documentation Index

Data: 2026-08-22  
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

In particolare sono vietati import/repository dependency `Timetable -> Calendar` e `Calendar -> Timetable`.

## Product

- `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md` — north star e programma X0–X6.
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` — tono, microcopy e grammatica collaborativa.
- `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md` — **contratto vincolante per configurazione guidata e gestione del contesto docente**.
- `docs/product/PROJECT_STATUS_2026-08-22.md` — checkpoint generale corrente.

### Regola Impostazioni

Per ogni lavoro su `/impostazioni`:

1. `SETTINGS_CANONICAL_SPEC.md` governa persistenza, sorgenti dati e invarianti;
2. `SETTINGS_EXPERIENCE_CONTRACT.md` governa ordine, stati, spiegazioni, feedback e dipendenze percepite;
3. `DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` governa tono e microcopy trasversali.

È vietato introdurre una seconda Cattedra: Impostazioni e Orario devono usare gli stessi `teaching_assignments`.

## Design

- `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md` — design system attuale per ogni nuovo lavoro.
- `docs/design/DESIGN_SYSTEM_V1.md` — riferimento storico; non governa nuove implementazioni quando confligge con V2.

## Regola di aggiornamento

Ogni slice che modifica una decisione canonica deve:

1. aggiornare prima o insieme il documento pertinente;
2. dichiarare se la modifica è `COMPATIBLE`, `SUPERSEDING` o `BREAKING`;
3. non lasciare nel repository istruzioni operative incompatibili;
4. aggiornare il checkpoint generale quando cambia una capability o un gate maggiore.

## Regola per agenti di sviluppo

Prima di implementare una slice, leggere almeno:

1. ADR-001;
2. ADR-002;
3. Product Experience Masterplan;
4. Language & Collaboration System;
5. Design System V2;
6. la specifica verticale della slice;
7. il relativo contratto di esperienza, se presente;
8. per T3/T4, sempre anche Work/Time Mental Model e Temporal Composition Canonical Spec.

Nessun agente deve inferire una nuova architettura da un singolo file runtime quando esiste una decisione canonica esplicita.
