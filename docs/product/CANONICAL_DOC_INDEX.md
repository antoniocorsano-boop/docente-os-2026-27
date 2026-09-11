# DOCENTE OS — Canonical Documentation Index

Data: 2026-09-11  
Stato: CANONICAL

## Ordine di autorità

Quando due documenti sembrano divergere, applicare questo ordine:

1. **Security / RLS / domain invariants**
2. **ADR accettate**
3. **Product Experience Masterplan**
4. **Specifiche canoniche di prodotto e di composizione dominio**
5. **Contratti di esperienza verticali**
6. **Design System V2 + Brand Identity Canonical + Design Governance Canonical**
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
- `docs/product/X4A_CERTIFICATION_2026-08-24.md` — **ricevuta canonica di certificazione Beta della prima write assistita `PLANNER_CREATE_TASK`, inclusi gate, exact commit, undo e igiene fixture**.
- `docs/product/DOCENTE_OS_PRODUCT_EXPERIENCE_MASTERPLAN.md` — north star e programma X0–X6.
- `docs/product/DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` — tono, microcopy e grammatica collaborativa.
- `docs/product/HOME_DAILY_COCKPIT_CANONICAL_SPEC.md` — **Home come cabina di regia giornaliera: composizione del contesto, Next Best Action, timeline, stati umani, Diario, materiali e protocollo di miglioramento basato su evidenza**.
- `docs/product/SETTINGS_EXPERIENCE_CONTRACT.md` — **contratto vincolante per configurazione guidata e gestione del contesto docente**.
- `docs/product/SETTINGS_CONTEXT_DISCLOSURE_NOTE.md` — **regola canonica “contesto completo, esposizione minima” per le Impostazioni**.
- `docs/product/PROJECT_STATUS_2026-08-22.md` — checkpoint storico del 22 agosto; non descrive più da solo il runtime/capability correnti.

### Regola Home giornaliera

Per ogni lavoro sulla Home `/`:

1. `HOME_DAILY_COCKPIT_CANONICAL_SPEC.md` governa responsabilità della Home, composizione del contesto, priorità operativa, stati umani e protocollo di evoluzione;
2. `WORK_TIME_MENTAL_MODEL.md` governa il significato di Oggi, Orario, Calendario, Piano annuale e Attività;
3. `TEMPORAL_COMPOSITION_CANONICAL_SPEC.md` governa la composizione temporale e vieta dipendenze dirette tra Orario e Calendario;
4. `DESIGN_SYSTEM_V2_CANONICAL.md` governa anatomia, progressive disclosure, responsive behavior e accessibilità;
5. `BRAND_IDENTITY_CANONICAL.md` governa identità visiva, promessa, simbolo, palette e loading;
6. `DESIGN_GOVERNANCE_CANONICAL.md` governa le regole visuali trasversali non derogabili e distingue invarianti da parametri migliorabili;
7. `DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` governa tono e microcopy.

La Home **non introduce una nuova fonte di verità** e non deve persistere un proprio stato parallelo a TeachingSession, Planner, Orario, UDA o materiali. Gli invarianti della Home sono canonici; soglie, densità, ordinamenti secondari e preview sono parametri migliorabili con evidenza HVA/pilot secondo la classificazione `COMPATIBLE` / `SUPERSEDING` / `BREAKING`.

### Regola Impostazioni

Per ogni lavoro su `/impostazioni`:

1. `SETTINGS_CANONICAL_SPEC.md` governa persistenza, sorgenti dati e invarianti;
2. `SETTINGS_EXPERIENCE_CONTRACT.md` governa ordine, stati, feedback e dipendenze percepite;
3. `SETTINGS_CONTEXT_DISCLOSURE_NOTE.md` governa **quanto contesto mostrare per default** e impone progressive disclosure;
4. `DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` governa tono e microcopy trasversali.

È vietato introdurre una seconda Cattedra: Impostazioni e Orario devono usare gli stessi `teaching_assignments`.

## Human + Visual Acceptance

- `product/design/HUMAN-EXPERIENCE-CONTRACT.md` — contratto Human.
- `product/design/VISUAL-ACCEPTANCE.md` — procedura di accettazione visuale, inclusa la checklist Design Governance obbligatoria.
- `product/design/MOBILE-RULES.md` — regole mobile.
- `product/design/ACCESSIBILITY-RULES.md` — regole di accessibilità.
- `product/design/reviews/` — decisioni visuali datate e closure evidence.

Le review datate sono append-only come evidenza storica: una review successiva può chiudere un WATCH precedente senza riscrivere il documento storico. Lo stato sintetico corrente dei finding chiusi/aperti deve essere riportato in `PROJECT_STATUS_CURRENT.md`.

## Design

- `docs/design/DESIGN_SYSTEM_V2_CANONICAL.md` — design system attuale per ogni nuovo lavoro.
- `docs/design/BRAND_IDENTITY_CANONICAL.md` — **identità canonica: “Mantieni il filo.”, significati, simbolo, palette, tipografia, loading, motion e protocollo di evoluzione**.
- `docs/design/DESIGN_GOVERNANCE_CANONICAL.md` — **20 regole vincolanti di design trasversale; fissa invarianti, mobile-first, una sola azione primaria, accessibilità, coerenza cross-surface e fedeltà del simbolo al riferimento approvato**.
- `docs/design/DESIGN_POLICY_GATE_DPG1.md` — **gate sul diff: impedisce nuove violazioni deterministiche e definisce la ripartizione con HVA**.
- `docs/design/DESIGN_CONFORMANCE_DPG2.md` — **ratchet full-runtime: misura il debito visuale storico e impedisce l'aumento di colori raw, token locali, brand legacy, effetti decorativi, raggi e ombre locali**.
- `product/design/DESIGN_DEBT_BASELINE.json` — **baseline macchina DPG-2; è un tetto monotono decrescente e non può essere rialzata per normalizzare regressioni**.
- `docs/design/DESIGN_SYSTEM_V1.md` — riferimento storico; non governa nuove implementazioni quando confligge con V2.

### Regola Brand e Design

Per ogni lavoro che modifica logo, palette globale, loading, shell, navigazione, metadata, tipografia globale o primitive visuali condivise:

1. `DESIGN_SYSTEM_V2_CANONICAL.md` governa semantica dei token, anatomia, accessibilità e responsive behavior;
2. `BRAND_IDENTITY_CANONICAL.md` governa significato, identità, promessa, simbolo e applicazione del brand;
3. `DESIGN_GOVERNANCE_CANONICAL.md` governa le 20 regole trasversali e stabilisce cosa è invariante e cosa può essere migliorato con evidenza;
4. `DESIGN_POLICY_GATE_DPG1.md` governa l'enforcement automatico sul diff;
5. `DESIGN_CONFORMANCE_DPG2.md` governa il ratchet sull'intero runtime e la riduzione del debito storico;
6. `DOCENTE_OS_LANGUAGE_COLLABORATION_SYSTEM.md` governa il linguaggio.

Il brand non può cambiare il significato professionale di uno stato, nascondere provenienza o attenuare il controllo umano.

**La geometria del simbolo rispetto al riferimento visuale approvato il 2026-09-11 è un invariante canonico.** Non può essere modificata o reinterpretata da una singola feature. Un cambiamento del segno richiede revisione `SUPERSEDING` o `BREAKING` e nuova accettazione visuale esplicita.

Una PR visuale deve dichiarare `COMPATIBLE`, `SUPERSEDING` o `BREAKING`, deve superare DPG-1 e DPG-2 per le regole deterministiche e, quando tocca una superficie utente, deve essere valutata dalla checklist Design Governance della HVA.

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
7. Brand Identity Canonical per ogni lavoro visuale o trasversale;
8. Design Governance Canonical per ogni UI, nuovo componente o modifica cross-surface;
9. Design Policy Gate DPG-1 per ogni lavoro visuale;
10. Design Conformance DPG-2 quando si modifica CSS, token, primitive o componenti visuali esistenti;
11. la specifica verticale della slice;
12. il relativo contratto di esperienza, se presente;
13. per T3/T4, sempre anche Work/Time Mental Model e Temporal Composition Canonical Spec.

Nessun agente deve inferire una nuova architettura da un singolo file runtime quando esiste una decisione canonica esplicita; nessun agente deve inferire lo stato corrente da un checkpoint datato quando esiste `PROJECT_STATUS_CURRENT.md`.

Nessun agente può introdurre una nuova variante locale del logo, una palette parallela o una nuova gerarchia di CTA soltanto perché una singola pagina la rende conveniente: deve rispettare la governance canonica o proporre formalmente una revisione. La baseline DPG-2 non è un budget da spendere: è debito da ridurre.
