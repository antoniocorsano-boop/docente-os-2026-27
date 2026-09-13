# DOCENTE OS — Teaching Evidence Canonical Spec

Data: 2026-09-13  
Stato: FOUNDATION / STRUCTURED OBSERVATION RUNTIME NOT YET AUTHORIZED

## 1. Decisione

DOCENTE OS introduce una capability canonica denominata **Osservazioni ed evidenze**.

Non è una nuova applicazione, non è una griglia valutativa e non è un sistema di profiling degli alunni. È un'estensione del dominio di esperienza didattica già esistente, destinata a collegare poche rilevazioni professionali alla memoria della lezione e alle decisioni successive del docente.

La capability estende il ciclo già presente:

```text
Prepara → In classe → Osserva → Registra
```

senza creare una seconda rappresentazione della lezione:

```text
ProjectedOccurrence / MANUAL
            ↓
TeachingSession ESISTENTE
      ├── TeachingSessionAllocation[] → B01-B33 opzionali
      ├── TeachingSessionReflection ESISTENTE → Diario / Drive
      ├── Observation[] NUOVE
      └── EvidenceReference[] NUOVE
                    ↓
          Reflection / Synthesis
                    ↓
             TeachingProposal
                    ↓
              HumanDecision
```

## 2. Baseline autorevole già presente

`TeachingSession` **esiste già** nel runtime e nel database ed è la fonte autorevole di ciò che il docente registra come realmente accaduto.

Sono già canonici:

- `product/src/core/domain/teaching-session.ts`;
- `public.teaching_sessions`;
- `public.teaching_session_allocations`;
- `public.record_teaching_session(...)`;
- la provenienza da `PROJECTED_OCCURRENCE | MANUAL`;
- la catena di correzione tramite `supersedes_session_id`;
- l'allocazione opzionale dei minuti ai blocchi B01-B33;
- la regola che una sessione diagnostica, di accoglienza, recupero o trasversale può esistere senza inventare un binding al Piano annuale;
- la regola che la registrazione della sessione **non completa automaticamente** un blocco del Piano annuale.

Questa capability **non crea una nuova tabella TeachingSession e non ridefinisce il suo schema**.

Il collegamento a Bxx deriva da `TeachingSessionAllocation`; non vengono introdotti `block_id`, `uda_id` o `pack_id` duplicati nella sessione.

## 3. Reflection e Diario già presenti

Esiste già `TeachingSessionReflection` con:

```text
activityDone
observations
difficulties
ideas
udaChangeProposal
nextActivity
```

ed esiste già la proiezione verso il Diario Drive mediante il contratto `DOCENTE_OS_LESSON_REPORT_V1`.

Le nuove osservazioni strutturate:

- **non sostituiscono** `TeachingSessionReflection`;
- non duplicano il Diario;
- possono alimentare una bozza di riflessione ex post;
- non riscrivono automaticamente la riflessione salvata dal docente;
- preservano la distinzione fra micro-rilevazione, sintesi e decisione professionale.

## 4. Obiettivo professionale

Ridurre il carico di registrazione durante la lezione e aumentare la qualità della lettura ex post.

Il docente deve poter registrare poche osservazioni significative in pochi tocchi. DOCENTE OS deve poi rendere leggibili:

- ciò che è stato osservato;
- su quale evidenza si basa;
- se il segnale è episodico, ricorrente o in evoluzione;
- a quale sessione e, quando presente, a quale allocazione didattica si riferisce;
- quale possibile azione didattica merita valutazione.

Il sistema non deve chiedere di compilare una griglia completa per ogni lezione.

## 5. Confine corrente

Il perimetro resta:

`SINGLE_OWNER_TIER_1_PROFESSIONAL_NON_PERSONAL`

Sono ammessi:

- osservazioni riferite alla **classe intera**;
- osservazioni riferite a **gruppi anonimi e temporanei** definiti nel contesto della singola lezione;
- riferimenti a evidenze didattiche prive di dati personali di alunni/terzi;
- sintesi professionali del docente.

Non sono ammessi in questa fase:

- profili persistenti individuali degli alunni;
- identificatori personali degli alunni;
- correlazione longitudinale di gruppi anonimi fra sessioni;
- inferenze psicologiche o comportamentali individuali;
- scoring individuale automatico;
- dati sensibili o categorie particolari;
- qualunque estensione Tier 2 non autorizzata da un gate separato.

## 6. Observation

`Observation` è un fatto professionale registrato dal docente e ancorato a una **TeachingSession esistente**.

Campi concettuali minimi:

```text
id
teaching_session_id
scope: CLASS | ANONYMOUS_GROUP
anonymous_group_key?
dimension_key
state: NOT_OBSERVED | NEEDS_SUPPORT | DEVELOPING | CONSOLIDATED
note?
source: TEACHER_QUICK_MARK | TEACHER_NOTE | EVIDENCE_REVIEW
recorded_by
created_at
```

Regole:

1. `teaching_session_id` è obbligatorio e punta a `public.teaching_sessions.id`;
2. workspace, anno scolastico, sezione, disciplina e provenienza temporale si ereditano dalla sessione e non vengono duplicati;
3. il legame a Bxx, quando esiste, è letto dalle allocazioni della sessione;
4. `NOT_OBSERVED` non è un esito negativo;
5. nessuna osservazione modifica `AnnualPlanBlockProgress`;
6. una correzione della lezione segue il modello di supersessione già canonico;
7. `recorded_by` è parte della provenienza professionale e non può essere omesso nel record canonico;
8. `anonymous_group_key` ha significato esclusivamente dentro la TeachingSession di origine e non crea identità di gruppo persistenti.

### Draft durante `Osserva`

Prima di `Registra` non esiste ancora necessariamente l'id canonico della TeachingSession. Le micro-rilevazioni restano quindi `TeachingObservationDraft` effimere con un `draftKey` locale usato soltanto per correlare input nella stessa interazione.

`draftKey`:

- non è un identificatore canonico;
- non viene usato per analisi longitudinali;
- non autorizza autosalvataggio persistente;
- viene risolto nel record `Observation.id` soltanto nel boundary di registrazione autorevole.

### Semantica di supersessione

Le osservazioni di una sessione superseded restano evidenza storica. Le letture correnti e longitudinali usano per default soltanto le sessioni correnti secondo `currentTeachingSessions(...)`. La storia resta ispezionabile per audit e provenienza.

## 7. EvidenceReference

`EvidenceReference` collega una `TeachingSession` a ciò che sostiene una o più osservazioni senza duplicare il contenuto documentale.

```text
id
teaching_session_id
observation_ids[]
kind: WORK_PRODUCT | QUICK_CHECK | ORAL_RESPONSE | CLASS_ACTIVITY | DOCUMENT_REFERENCE | OTHER
description
knowledge_asset_id?
external_reference?
recorded_by
created_at
```

Regole:

- l'evidenza non crea classi, UDA o blocchi;
- un asset già presente in Conoscenza/Drive viene referenziato, non ricopiato;
- nel Tier 1 corrente il riferimento non introduce dati personali degli alunni;
- l'assenza dell'evidenza non viene colmata con inferenze;
- `evidence_note` della TeachingSession resta compatibile e non viene reinterpretato come tabella di osservazioni strutturate;
- la copertura di una Observation è riconosciuta soltanto tramite un collegamento esplicito in `observation_ids[]`, non perché l'evidenza appartiene genericamente alla stessa TeachingSession;
- un riferimento di evidenza può restare a livello di sessione con `observation_ids[]` vuoto, ma in quel caso non viene contato come supporto di una specifica Observation.

Durante `Osserva`, un `TeachingEvidenceReferenceDraft` usa `observationDraftKeys[]`; il boundary di registrazione risolve tali chiavi negli `observation_ids[]` canonici nella stessa receipt coerente della lezione.

## 8. Dimensioni osservative

Le dimensioni non costituiscono una rubrica valutativa universale. Sono chiavi professionali riusabili e contestualizzabili.

Baseline iniziale:

```text
UNDERSTANDING_INSTRUCTION   comprensione della consegna
AUTONOMY                    autonomia
WORK_METHOD                 metodo di lavoro
TECHNICAL_LANGUAGE          lessico tecnico
DISCIPLINARY_APPLICATION    applicazione disciplinare
EVIDENCE_QUALITY            qualità dell'evidenza prodotta
TIME_MANAGEMENT             gestione del tempo
```

Una lezione espone soltanto il sottoinsieme pertinente. Nessuna dimensione è obbligatoria.

Le dimensioni specifiche della `HumanTaskLessonProjection` possono essere mappate su chiavi canoniche oppure restare descrittori contestuali; non generano automaticamente nuove tassonomie permanenti.

## 9. Semantica degli stati

```text
NOT_OBSERVED
NEEDS_SUPPORT
DEVELOPING
CONSOLIDATED
```

Invarianti:

1. nessuno stato equivale a voto;
2. nessuno stato possiede un valore numerico implicito;
3. gli stati non vengono mediati aritmeticamente;
4. contesti non comparabili non producono automaticamente progressione/regressione;
5. `NOT_OBSERVED` è sempre ammesso;
6. una TeachingSession può essere registrata con zero osservazioni strutturate.

## 10. Reflection / Synthesis

La reflection canonica già esistente resta la superficie professionale della singola sessione.

La nuova sintesi assistita può derivare da una o più TeachingSession, ma deve distinguere:

- `OBSERVED_FACT` — dati registrati dal docente;
- `INTERPRETATION` — lettura professionale o assistita;
- `TREND` — confronto longitudinale;
- `UNCERTAINTY` — insufficienza o non comparabilità dei dati.

Una sintesi non modifica osservazioni, evidenze o reflection originarie.

## 11. Analisi longitudinale

Le categorie canoniche sono:

```text
SINGLE_EPISODE
RECURRING_SIGNAL
IMPROVING_SIGNAL
WORSENING_SIGNAL
INSUFFICIENT_EVIDENCE
CONTEXT_CHANGED
```

Non è ammesso produrre un trend da una singola TeachingSession osservata.

Nel Tier 1 corrente l'analisi longitudinale è **solo a livello CLASS**. Le osservazioni `ANONYMOUS_GROUP` sono session-local e non vengono correlate fra lezioni, anche se una stessa etichetta di gruppo viene riutilizzata.

La comparabilità deve considerare almeno:

- stessa sezione;
- stessa dimensione;
- `scope = CLASS` nel Tier 1 corrente;
- sessioni correnti, non superseded;
- contesto didattico sufficientemente compatibile;
- provenienza disponibile.

Percorso obbligatorio:

```text
Insight → Perché? → TeachingSession → Observation / EvidenceReference originarie
```

## 12. TeachingProposal

Una proposta didattica conseguente alle evidenze usa gli stati:

```text
PROPOSED → ACCEPTED | MODIFIED | DISMISSED
```

Una proposta contiene almeno rationale, azione proposta e riferimenti alle evidenze.

`PROPOSED` non modifica UDA, Piano annuale, materiali, Reflection o stato di avanzamento. Solo una decisione umana esplicita può autorizzare una successiva azione tramite i boundary canonici già esistenti.

## 13. Assistenza intelligente e agenti cooperativi

DOCENTE OS mantiene **una sola esperienza utente**. I ruoli cooperativi sono interni:

- **Context Agent** — risolve TeachingSession, sezione, allocazioni, Bxx/UDA quando presenti, materiali e provenienza;
- **Observation Agent** — normalizza soltanto micro-rilevazioni realmente effettuate dal docente;
- **Evidence Agent** — collega riferimenti esistenti senza inventare evidenze;
- **Pattern Agent** — confronta TeachingSession correnti e comparabili, esclusivamente a livello classe nel Tier 1;
- **Planning Agent** — produce una proposta motivata, non una mutazione;
- **Governance Agent** — applica Tier 1, provenance, human validation e divieti di scoring/profiling.

Nessun agente acquisisce autorità di scrittura implicita su Piano annuale, Progetta, Diario o altri domini canonici.

## 14. Integrazione nelle superfici esistenti

### Orario / Oggi
Risolvono la lezione reale o il percorso manuale già supportato.

### Classe
Mostra segnali recenti, aspetti stabili, aspetti da osservare, evidenze recenti e accesso `Perché?`. Non diventa una tabella permanente di livelli.

### Lezione
Resta la superficie primaria:

```text
Prepara → In classe → Osserva → Registra
```

`Osserva` evolve dalla checklist effimera verso una micro-rilevazione facoltativa.

### Registra
Continua a creare/correggere la TeachingSession autorevole. Le osservazioni non devono essere ricopiate nella nota finale.

### Diario
Continua a usare `TeachingSessionReflection` e la proiezione Drive esistenti. Le osservazioni strutturate possono preparare una bozza, mai sovrascrivere silenziosamente la reflection.

### Progetta
Riceve soltanto proposte esplicitamente accettate/modificate dal docente attraverso i normali boundary umani.

### Conoscenza / Drive
Conservano gli asset e le proiezioni documentali; `EvidenceReference` mantiene il collegamento e la provenienza.

## 15. Invarianti architetturali

1. `TeachingSession` esistente resta l'autorità dell'esecuzione reale.
2. Nessuna seconda tabella o tipo canonico parallelo di TeachingSession.
3. `TeachingSessionAllocation` resta l'unico binding dell'esecuzione ai B01-B33.
4. `Observation` non modifica `AnnualPlanBlockProgress`.
5. `EvidenceReference` non crea o duplica asset canonici e supporta una specifica Observation solo tramite binding esplicito.
6. `TeachingSessionReflection` resta distinta dalle micro-osservazioni.
7. Le correzioni rispettano `supersedes_session_id` e preservano la storia.
8. Le sintesi sono derivate e devono mantenere i riferimenti alle fonti.
9. Nessun dato individuale degli alunni entra nel modello Tier 1.
10. Nessuna tassonomia locale introdotta dalla UI.
11. Nessuna proposta viene applicata senza decisione umana.
12. La capability usa i componenti/token canonici e resta soggetta ai gate WCAG, Design Policy e Human Interaction Model.
13. I draft pre-sessione sono effimeri: nessuna Observation persistente può esistere senza TeachingSession autorevole.
14. Un gruppo anonimo non acquisisce identità longitudinale nel Tier 1.

## 16. Incrementi autorizzabili

### TE-0 — Foundation
- contratto canonico;
- tipi dell'estensione Observation/Evidence/Proposal;
- tipi draft effimeri per la fase `Osserva`;
- binding esplicito EvidenceReference → Observation;
- invarianti e test puri;
- riuso esplicito di TeachingSession e TeachingSessionReflection;
- nessuna migrazione;
- nessuna nuova UI.

### TE-1 — Observation persistence readiness + additive storage
- chiudere prima la convergenza semantica di `Registra la lezione`;
- definire il boundary di scrittura delle osservazioni ancorate a `teaching_sessions.id`;
- migrazione **additive-only**, senza modificare l'identità della TeachingSession;
- RLS/AAL2 coerenti col runtime corrente;
- comportamento esplicito su sessioni superseded;
- receipt coerente che risolva `draftKey` / `observationDraftKeys` nei rispettivi id canonici;
- nessuna nuova persistenza della lezione.

### TE-2 — Structured observation UX
- evoluzione della fase `Osserva`;
- 0–4 micro-rilevazioni tipiche;
- classe/gruppo anonimo;
- mobile-first e facoltativa.

### TE-3 — Evidence binding
- `EvidenceReference` verso evidenze documentali ammesse;
- provenance verificabile e binding esplicito alle Observation sostenute;
- nessun dato personale degli alunni.

### TE-4 — Reflection enrichment
- bozza di `TeachingSessionReflection` derivata dalle osservazioni;
- fatto e interpretazione separati;
- nessuna sovrascrittura automatica del Diario.

### TE-5 — Longitudinal insight
- confronto multi-sessione corrente a livello classe;
- segnali ricorrenti/evolutivi;
- `Perché?` con drill-down completo.

### TE-6 — Teaching proposal
- proposta per la prossima lezione/UDA;
- `PROPOSED → ACCEPTED | MODIFIED | DISMISSED`;
- nessuna mutazione autonoma della progettazione.

## 17. Gate prima di TE-1

Verificare:

- convergenza di ogni comando «Registra la lezione» sulla TeachingSession autorevole;
- contratto `TeachingSession` e catena di supersessione;
- `TeachingSessionReflection` / Diario Drive;
- `TEMPORAL_COMPOSITION_CANONICAL_SPEC`;
- `CLASS_WORKSPACE_CONTRACT`;
- separazione da `AnnualPlanBlockProgress`;
- privacy Tier 1;
- RLS/AAL2 e audit/provenance;
- comportamento di EvidenceReference su asset non più disponibili;
- WCAG/mobile/Human Interaction Model;
- assenza di nuova tassonomia o dominio parallelo.

Solo dopo questi gate è autorizzata la persistenza delle **osservazioni**, non una nuova persistenza della sessione.

## 18. Criterio di successo

La capability è matura quando il docente può:

1. entrare nella lezione dal contesto corretto;
2. registrare 0–4 micro-osservazioni senza interrompere il flusso didattico;
3. registrare/correggere la TeachingSession senza ricopiare le osservazioni;
4. ritrovare ex post cosa è accaduto e su quali evidenze, con legami espliciti;
5. distinguere episodio e tendenza fra sessioni correnti comparabili a livello classe;
6. comprendere perché DOCENTE OS propone un intervento;
7. accettare, modificare o rifiutare tale proposta;
8. mantenere sempre il controllo professionale sulla progettazione e sul Diario.
