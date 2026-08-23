# HUMAN TASK — PROCESSO PROGETTUALE B23–B27

**Stato:** CANONICAL / APPROVED RUNTIME SLICE  
**Data:** 23 agosto 2026  
**Ambito:** Classe prima · UDA 1-05 · B23–B27

## 1. Decisione

B23–B27 vengono modellati con il Recipe esistente `PLAN_GUIDED_UDA`.

Non viene introdotto un quinto Recipe.

La ragione è strutturale: CAN-UDA-1-05 contiene cinque fasi consecutive da 2 ore e CAN-PLAN-1 contiene cinque blocchi consecutivi da 2 ore che coincidono semanticamente e temporalmente con quelle fasi.

La corrispondenza è quindi:

| Blocco | Fase UDA | Durata | Evidenza Piano |
| --- | --- | ---: | --- |
| B23 · Dal bisogno al problema | Fase 1 · Dal bisogno al problema | 120 min | Brief progettuale |
| B24 · Informazioni e alternative | Fase 2 · Cercare informazioni e generare idee | 120 min | Dossier alternative |
| B25 · Confrontare e scegliere | Fase 3 · Confrontare e scegliere | 120 min | Matrice di scelta motivata |
| B26 · Rappresentare e pianificare | Fase 4 · Rappresentare e pianificare | 120 min | Tavola progettuale + piano di lavoro |
| B27 · Realizzare, verificare, migliorare | Fase 5 · Realizzare, verificare, migliorare | 120 min | Dossier completo + presentazione |

Ogni proiezione runtime conserva `durationMinutes = 120`, ma i passaggi interni restano `minutes: null`: le fonti non dichiarano una suddivisione interna affidabile dei 120 minuti.

## 2. Ruolo di CAN-PACK-1C

CAN-PLAN-1 associa formalmente `CAN-PACK-1C` al segmento UDA 1-05.

CAN-PACK-1C nasce però come repertorio operativo del micro-progetto Open Day e dichiara un monte ore orientativo di 8 ore, mentre UDA 1-05 formalizza un processo progettuale di 10 ore.

Per evitare una falsa equivalenza:

1. `CAN-PACK-1C` resta nel `planBinding` e nel candidate fingerprint;
2. un cambio della generazione PACK invalida il Recipe e richiede nuova validazione;
3. il monte ore del PACK non viene usato per temporizzare B23–B27;
4. il PACK non appare tra le sorgenti didattiche runtime finché non contribuisce con una risorsa effettivamente estratta e approvata;
5. Piano e UDA restano le sorgenti operative visibili per B23–B27.

**Regola derivata:** un documento può essere necessario al binding canonico senza essere automaticamente una sorgente operativa della vista Human Task.

## 3. Perché le schede numerate del PACK non sono ancora esposte

CAN-PACK-1C contiene risorse utili come `Scheda 1 — IL PROBLEMA`, `Scheda 2 — REQUISITI`, `Scheda 3 — DUE SOLUZIONI POSSIBILI`, `Scheda 4 — MATRICE DI SCELTA`, tavola progettuale, piano di lavoro, prova e revisione.

Queste risorse sono già utilizzate in modo controllato nei precedenti Recipe `PACK_COMPOSED`, dove il raccordo è dichiarato esplicitamente per heading/range.

Il parser generale della Knowledge Base, invece, non dispone ancora di un contratto specifico per trasformare in modo fail-closed tutte le schede numerate di questo formato in risorse autonome.

Per B23–B27 si evita quindi di:

- mostrare l'intero CAN-PACK come documento da leggere;
- interpretare genericamente ogni riga numerata come una scheda;
- duplicare i passaggi UDA usando il vecchio repertorio Open Day;
- comprimere 8 ore orientative dentro 10 ore formali o viceversa.

L'eventuale esposizione futura delle schede richiede una tranche separata di estrazione tipizzata, con test sul formato reale e collegamento task-specifico.

## 4. Provenienza runtime

Per B23–B27 le sorgenti mostrate al docente sono:

- `CAN-PLAN-1` — Piano annuale operativo;
- `CAN-UDA-1-05` — Dal problema al progetto.

`CAN-PACK-1C` resta verificato nel candidate fingerprint ma non viene presentato come se avesse generato il passaggio corrente.

Questo applica la regola già maturata con B16–B22: **la provenance visuale include soltanto le fonti che contribuiscono realmente al contenuto operativo mostrato.**

## 5. Mappa Human Task

### B23 — Dal bisogno al problema

Obiettivo operativo: passare da un bisogno osservabile a un problema progettuale definito con requisiti e vincoli.

Evidenze osservate:

- comprensione/formulazione del problema;
- requisiti e vincoli pertinenti.

### B24 — Informazioni e alternative

Obiettivo operativo: raccogliere informazioni pertinenti e produrre almeno due ipotesi rappresentate da schizzi preliminari.

Evidenza principale: dossier alternative.

### B25 — Confrontare e scegliere

Obiettivo operativo: confrontare alternative mediante criteri espliciti e motivare la decisione.

La vista non inventa pesi, punteggi o formule per la matrice.

### B26 — Rappresentare e pianificare

Obiettivo operativo: rendere la soluzione abbastanza chiara da poter essere realizzata attraverso rappresentazione, misure, materiali, strumenti e sequenza.

Evidenze: tavola progettuale e piano di lavoro.

### B27 — Realizzare, verificare, migliorare

Obiettivo operativo: realizzare o simulare, provare rispetto ai requisiti, individuare difetti/correzioni e comunicare il percorso.

La chiusura della UDA non coincide con il semplice completamento di un prototipo.

La verifica e il miglioramento sono parti obbligatorie del processo. Un primo prototipo che richiede correzioni non viene automaticamente trattato come prestazione inferiore: la capacità di riconoscere e motivare il miglioramento costituisce evidenza progettuale.

## 6. Fail-closed

B23–B27 non devono essere risolti se cambia senza rivalidazione uno dei seguenti elementi:

- UDA del blocco;
- PACK canonico del blocco;
- titolo del blocco;
- segmento del Piano;
- generazione CAN-PLAN;
- generazione CAN-UDA-1-05;
- generazione CAN-PACK-1C;
- fase UDA selezionata;
- durata della fase rispetto alla copertura del blocco;
- sezioni/indicatori UDA richiesti dal Recipe.

## 7. Generazioni congelate

Verificate nella Knowledge Base il 23 agosto 2026:

- CAN-PLAN-1: `d327355b-76a9-496f-99cb-dc942fd950e4`;
- CAN-UDA-1-05: `9c70abfe-9d45-4977-9551-6b745778f248`;
- CAN-PACK-1C: `2f1da16d-45b4-42aa-841a-09d283d5d96a`.

Tutte risultano `INDEXED` al momento della validazione.

## 8. Non obiettivi

Questa tranche non:

- modifica il Piano annuale;
- modifica la contabilizzazione delle 66 ore;
- aggiunge tabelle DB o migrazioni;
- cambia il modello di registrazione delle lezioni;
- converte automaticamente le schede PACK in attività;
- assegna tempi interni non dichiarati;
- produce voti automatici;
- crea un nuovo Recipe.

## 9. Implicazione successiva

Dopo B27 il runtime Human Task della classe prima copre il processo annuale fino alla chiusura di UDA 1-05.

Il blocco successivo, B28, appartiene a UDA 1-06 — dati, informazioni e sistemi digitali — e deve essere riesaminato dalle fonti senza assumere che la struttura del processo progettuale si ripeta.
