# DOCENTE OS — Human Task PACK_COMPOSED Recipe

Status: IMPLEMENTATION CONTRACT + APPROVAL RECORD / P4
Date: 2026-08-22

## Scopo

`PACK_COMPOSED` è il terzo percorso canonico del Human Task Content Engine.

Si usa quando il Piano annuale assegna un blocco a una UDA e a un pacchetto principale, ma il contenuto operativo necessario alla singola lezione è distribuito tra il pacchetto principale e uno o più pacchetti di supporto.

Non è un fallback libero e non autorizza a sintetizzare una lezione arbitraria da documenti correlati.

Catena:

**CAN-PLAN → Candidate con tutte le generazioni richieste → PACK_COMPOSED Recipe → Draft → approvazione umana → proiezione runtime**

## Tre modalità ormai distinte

### DIRECT

Una guida docente nel CAN-PACK è direttamente allineata al blocco.

### UDA_ONLY

Manca una guida PACK direttamente allineata, ma una singola fase UDA possiede già durata e sequenza operative sufficienti.

### PACK_COMPOSED

Il Piano autorizza esplicitamente uno o più pacchetti di supporto e il Recipe seleziona da essi passaggi o risorse precise.

Le tre modalità producono lo stesso `HumanTaskLessonProjection`; cambiano solo le regole con cui si dimostra la provenienza.

## Principio di autorità

Il Piano annuale continua a determinare:

- blocco Bxx;
- UDA a cui contabilizzare le ore;
- durata del blocco;
- pacchetto principale;
- pacchetti di supporto ammessi;
- titolo e posizione del blocco.

Un support PACK non può:

- cambiare UDA;
- creare ore aggiuntive;
- cambiare durata del blocco;
- trasformarsi implicitamente in pacchetto principale;
- introdurre obiettivi di un’altra UDA come se fossero già formalmente svolti.

## Candidate e generazioni

Il `candidateId` contiene le generazioni correnti di:

1. UDA;
2. pacchetto principale;
3. tutti i support PACK dichiarati dal Piano, nell’ordine canonico.

Questo significa che anche un supporto esclusivamente logistico resta una dipendenza strutturale se il Piano lo dichiara.

Una generazione mancante o diversa rende il Recipe non riutilizzabile senza revisione.

## Provenienza del contenuto

La dipendenza strutturale e la provenienza didattica non coincidono necessariamente.

La `provenance.packs` del Draft e la lista `sources` mostrata al docente devono contenere **soltanto i pacchetti dai quali la vista ha realmente derivato passaggi, risorse o evidenze**.

Un pacchetto presente nel `planBinding` ma non selezionato dal Recipe:

- resta vincolo del Candidate;
- non compare come fonte didattica della vista;
- non può essere usato per dedurre obiettivi o attività.

Questa regola è essenziale per B15, dove `CAN-PACK-1D` è dichiarato dal Piano come **sola regia logistica**.

## Selezione dei passaggi

Un passaggio `PACK_COMPOSED` deve essere legato a un pacchetto ammesso dal `planBinding` e a una porzione sorgente deterministica.

Il builder supporta tre forme:

- `HEADING`: il titolo della fase è già un’azione sufficiente e viene mantenuto senza aggiungere procedura;
- `BODY`: viene usato il corpo testuale compreso tra due heading espliciti;
- `ACTIVITY_CLAUSE`: viene selezionata una clausola numerata/semicolata dal campo `Attività` di una guida PACK già strutturata.

Nessuna di queste modalità assegna minuti interni se la fonte non li assegna al singolo passaggio.

## Risorse

Le risorse possono essere estratte da intervalli raw delimitati da heading espliciti, utile per documenti come `CAN-PACK-1C` che usa una grammatica `FASE N / Scheda N` diversa dalle guide `LEZIONE N` di `CAN-PACK-1B`.

Ogni risorsa dichiara:

- id runtime;
- pacchetto sorgente;
- heading iniziale e finale;
- tipo Human Task;
- superficie PREPARE/OBSERVE;
- eventuale passaggio a cui è collegata.

Il parser generale della KB non viene forzato a fingere che documenti con grammatiche diverse siano identici.

## Evidenza

L’evidenza può essere costruita soltanto da:

- titoli di risorse effettivamente selezionate; oppure
- campi `Prodotto` / `Evidenza` di una sezione PACK selezionata e parsata.

Non è consentita una frase di evidenza libera priva di binding sorgente nel Recipe.

## UDA

Obiettivi e indicatori di osservazione continuano a essere selezionati da sezioni UDA esplicite per indice.

Il support PACK può fornire la forma operativa del compito, ma non sostituisce l’autorità curricolare della UDA su risultati ed evidenze formative.

## Gate fail-closed

Il Draft è `INVALID` se almeno una delle seguenti condizioni è vera:

- Candidate non reviewable;
- candidateId diverso;
- blocco o planBinding diversi;
- nota COMPOSED assente;
- nessun passaggio;
- pacchetto selezionato non ammesso dal Piano;
- heading o clausola non trovati;
- risorsa non trovata;
- risorsa collegata a un passaggio inesistente;
- sezione o item UDA non trovati;
- evidenza selezionata non disponibile;
- campo editoriale obbligatorio vuoto.

## Tranche B11–B15

### B11 — Entrare nel disegno tecnico

Modalità: `DIRECT`.

Fonti didattiche runtime:

- CAN-PLAN-1;
- CAN-UDA-1-03;
- CAN-PACK-1B, Lezione 8 + Tavola H.

### B12 — Costruzioni fondamentali e controllo dell’errore

Modalità: `DIRECT`.

Fonti didattiche runtime:

- CAN-PLAN-1;
- CAN-UDA-1-03;
- CAN-PACK-1B, Lezione 9.

L’avvio trasversale del micro-progetto non attribuisce ore alle UDA progettuali successive.

### B13 — Materiali, requisiti e micro-progetto trasversale

Modalità: `PACK_COMPOSED`.

Contabilizzazione: **UDA 1-02**.

Passaggi selezionati da CAN-PACK-1C:

1. individuare il problema;
2. definire requisiti e vincoli;
3. produrre due idee.

Risorse:

- Scheda 1 — Il problema;
- Scheda 2 — Requisiti;
- Scheda 3 — Due soluzioni possibili.

Fonti didattiche runtime: PLAN + UDA 1-02 + PACK 1C.

`CAN-PACK-1B` resta pacchetto principale del Piano ma non viene mostrato come fonte del contenuto di questa specifica vista perché non ha generato i passaggi visualizzati.

### B14 — Confronto, scelta e prova del micro-progetto

Modalità: `PACK_COMPOSED`.

Contabilizzazione: **UDA 1-02**.

Passaggi selezionati da CAN-PACK-1C:

1. scegliere con criteri;
2. realizzare un prototipo semplice/simulazione con i limiti di sicurezza documentati;
3. provare.

Risorse:

- Scheda 4 — Matrice di scelta;
- Scheda 7 — La prova.

Nessuna fase riceve una quota artificiale dei 120 minuti.

### B15 — Composizione geometrica e restituzione Open Day

Modalità: `PACK_COMPOSED`.

Contabilizzazione: **UDA 1-03**.

Contenuto didattico:

- CAN-PACK-1B, Lezione 10: composizione geometrica vincolata + prima riflessione su requisiti/vincoli;
- CAN-PACK-1C, Fase 11: Pitch Open Day.

`CAN-PACK-1D`:

- è presente nel `planBinding`;
- è presente nel fingerprint del Candidate;
- è obbligatorio come supporto previsto dal Piano;
- **non è presente in `provenance.packs`;**
- **non è presente nelle fonti didattiche mostrate nel Lesson Workspace;**
- **non genera passaggi, obiettivi, evidenze o minuti.**

## Generazioni congelate

Per questa approvazione:

- `CAN-UDA-1-02`: `5e0d5ae7-9f43-4d55-b470-533f2ac806fe`;
- `CAN-UDA-1-03`: `296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c`;
- `CAN-PACK-1B`: `1902bdd3-c65f-46c0-b419-99bcd45131ad`;
- `CAN-PACK-1C`: `2f1da16d-45b4-42aa-841a-09d283d5d96a`;
- `CAN-PACK-1D`: `1d150f77-6a7f-4f8b-8e85-2fa370956e29`.

Documenti Drive verificati:

- CAN-PLAN-1: `1rNF-MsPXnDuCsBQ_9h31rT1mqjHj4SXD8s3j2lVJ-C4`;
- CAN-UDA-1-02: `1MziCI5IjvYjhHjU-rpe25ASMl48HlCQeh2FDIoJRROo`;
- CAN-UDA-1-03: `1E_IDcyTa43MYlyZE7wdowakF3royRfe69IGQR4xMx68`;
- CAN-PACK-1B: `1QnrzAD1rHWwp97r-KPUuCC8XdFNXUFqMk5hi33GxuxQ`;
- CAN-PACK-1C: `1WEzXGyizTuGQEqQT06MzJYvKTkPlD3nkN9aYKYbpl_4`;
- CAN-PACK-1D: `1vCgBmugg-NlH9CEA7jw1BT4CconZFDKxC9rXjjZvHqU`.

## Esito di approvazione

| Blocco | Modalità | Esito |
| --- | --- | --- |
| B11 | DIRECT | APPROVATO |
| B12 | DIRECT | APPROVATO |
| B13 | PACK_COMPOSED | APPROVATO |
| B14 | PACK_COMPOSED | APPROVATO |
| B15 | PACK_COMPOSED | APPROVATO |

## Prestazioni

`PACK_COMPOSED` appartiene al ciclo di preparazione/revisione e non introduce nuove letture KB nel percorso quotidiano.

Il Lesson Workspace continua a leggere una proiezione runtime materializzata:

**Orario → Classe → Lezione**.

## Acceptance P4

1. B11–B15 producono Draft validi sulle generazioni congelate;
2. B13–B14 mantengono UDA 1-02 e non generano ore aggiuntive;
3. B15 mantiene UDA 1-03;
4. nessun passaggio PACK_COMPOSED riceve minuti non documentati;
5. modifica della generazione di un support PACK invalida il Recipe;
6. support PACK mancante blocca il Candidate;
7. B15 richiede strutturalmente CAN-PACK-1D ma non lo espone come fonte didattica;
8. B16 resta fuori dal runtime in questa tranche;
9. nessuna modifica a schema DB, RLS, Piano annuale o modello di registrazione delle lezioni.
