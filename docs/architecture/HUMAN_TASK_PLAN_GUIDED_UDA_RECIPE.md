# HUMAN TASK — PLAN_GUIDED_UDA PROJECTION RECIPE

**Stato:** CANONICAL / APPROVED FOR B16–B22  
**Data:** 23 agosto 2026

## 1. Problema risolto

Il Content Engine dispone di quattro raccordi canonici:

- `DIRECT`: una guida operativa del CAN-PACK coincide con il blocco del Piano;
- `UDA_ONLY`: il CAN-PACK non offre una guida dedicata e una fase UDA coincide esattamente con il blocco;
- `PACK_COMPOSED`: il Piano richiede una composizione controllata di più porzioni/pacchetti operativi;
- `PLAN_GUIDED_UDA`: il Piano rende più precisa la granularità della UDA o ne specifica l’evidenza senza disporre di una guida PACK equivalente.

B16–B19 hanno introdotto il quarto raccordo. B20–B22 ne dimostrano la generalizzazione senza introdurre una quinta modalità:

- CAN-UDA-1-04 contiene sei fasi da un’ora;
- CAN-PLAN-1 contiene tre blocchi da due ore;
- la corrispondenza è esplicita e completa:
  - B20 = Fasi 1 + 2;
  - B21 = Fasi 3 + 4;
  - B22 = Fasi 5 + 6;
- CAN-PACK-1E aggiunge una scheda operativa utile a B22, ma non dichiara la scansione temporale dei passaggi.

`PLAN_GUIDED_UDA` deve quindi poter esprimere sia una fase UDA condivisa fra più blocchi, sia più fasi UDA consecutive che coprono esattamente un blocco.

## 2. Regola canonica

`PLAN_GUIDED_UDA` è ammesso soltanto quando tutte le condizioni seguenti sono vere:

1. il blocco esiste nel Piano canonico corrente;
2. UDA, PACK, periodo, titolo e support PACK coincidono con il `planBinding` approvato;
3. il Recipe è legato alla generazione canonica esplicita del CAN-PLAN;
4. una o più fasi UDA estraibili sono indicate esplicitamente;
5. se le fasi sono multiple, sono consecutive e non duplicate;
6. il Recipe dichiara tutti i blocchi coperti dalle fasi selezionate;
7. tali blocchi sono contigui nel Piano;
8. la somma delle durate dei blocchi coincide esattamente con la somma delle durate delle fasi UDA selezionate;
9. il Piano fornisce l’evidenza del blocco;
10. la sequenza viene presa dall’attività del Piano oppure dal contenuto delle fasi UDA selezionate;
11. un PACK può fornire risorse operative esplicite, ma non può definire implicitamente tempi o copertura;
12. nessun tempo interno viene dedotto se la fonte non lo dichiara.

Il Recipe resta soggetto a **human approval** prima della materializzazione runtime.

## 3. Candidate ID e generazione del Piano

I candidateId già congelati rimangono basati sulle generazioni UDA/PACK. La generazione del Piano viene validata separatamente da `PLAN_GUIDED_UDA` per evitare migrazioni retroattive inutili delle approvazioni esistenti.

Il gate verifica:

- `planSource.code`;
- `planSource.generationId`;
- `planBinding` del blocco.

Se la generazione canonica del Piano cambia, il Recipe diventa **INVALID** finché non viene rivalidato. Non viene promosso per inerzia.

## 4. Phase coverage

Ogni Recipe dichiara `phaseCoverageBlockIds` e una o più fasi tramite `operationalPhaseOrdinal` o `operationalPhaseOrdinals`.

Il gate verifica:

- almeno una fase;
- nessun duplicato;
- fasi multiple consecutive;
- copertura blocchi non vuota;
- nessun blocco duplicato;
- presenza del blocco corrente;
- esistenza di tutti i blocchi nel Piano;
- contiguità dei blocchi;
- stesso raccordo UDA/PACK;
- durata complessiva dei blocchi uguale alla durata complessiva delle fasi selezionate.

### Caso B17–B18 — una fase condivisa da più blocchi

- Fase UDA: `Fase 5 — Figure geometriche piane — 4 ore`;
- copertura: `[B17, B18]`;
- durata Piano: `120 + 120 = 240 min`;
- durata UDA: `240 min`;
- esito: **coerente**.

Il Piano disambigua i due sotto-compiti; nessun Recipe inventa una ripartizione temporale interna della Fase 5.

### Caso B20 — più fasi dentro un blocco

- fasi UDA: `Fase 1 — 1 ora` + `Fase 2 — 1 ora`;
- copertura: `[B20]`;
- durata Piano: `120 min`;
- durata UDA selezionata: `60 + 60 = 120 min`;
- esito: **coerente**.

Lo stesso schema vale per B21 (Fasi 3+4) e B22 (Fasi 5+6).

## 5. Origine dei contenuti

### `stepSource = UDA_PHASE`

Usato quando le fasi UDA contengono già azioni operative sufficienti.

- con una fase selezionata viene prodotto un passaggio non temporizzato;
- con più fasi selezionate viene prodotto un passaggio per fase;
- i minuti delle fasi servono esclusivamente al gate di copertura e non vengono trasformati automaticamente in timer di interfaccia.

### `stepSource = PLAN_ACTIVITY`

Usato quando il Piano rende esplicito il sotto-compito del blocco dentro una fase UDA più ampia.

Il passaggio operativo coincide con l’attività canonica del Piano. Non vengono aggiunti esempi, costruzioni, strumenti o sotto-passaggi non presenti nella fonte.

### Evidenza

In `PLAN_GUIDED_UDA` l’evidenza mostrata al docente è quella del blocco nel Piano canonico.

Obiettivi e indicatori di osservazione continuano a derivare dalla UDA selezionata.

## 6. Risorse PACK opzionali

`PLAN_GUIDED_UDA` può dichiarare risorse PACK tipizzate, per esempio una scheda alunno.

Una risorsa PACK è ammessa solo se:

- il PACK coincide con quello principale o con un support PACK previsto dal Piano;
- la sezione è realmente estraibile dalla generazione corrente;
- l’eventuale `attachToSteps` punta a passaggi esistenti;
- il PACK viene aggiunto alla provenance soltanto se ha realmente fornito una risorsa alla vista.

La presenza di una risorsa PACK **non autorizza** a usare il PACK come origine dei tempi o della copertura delle fasi.

### Caso B22

CAN-PACK-1E fornisce la scheda `Dallo scarto alla nuova risorsa` con campi su:

- oggetto/imballaggio;
- funzione;
- materiali prevalenti;
- condizione di fine vita;
- modalità di raccolta o conferimento **verificata**;
- possibile riuso;
- recupero/riciclo ipotizzato;
- percorso circolare;
- azione di prevenzione/riduzione;
- motivazione.

La scheda è collegata sia al laboratorio di analisi sia al compito significativo/verifica. I tempi restano invece derivati dalle Fasi 5+6 della UDA e dal blocco B22.

## 7. Parser PACK: `Percorso operativo`

CAN-PACK-1E ha introdotto un formato reale non coperto dalla grammatica precedente:

- titolo `Percorso operativo`;
- sezioni numerate in linguaggio naturale (`1. Oggetto, materiale e fine vita`, ecc.);
- scheda nominata tra virgolette (`Scheda «Dallo scarto alla nuova risorsa»`).

Il parser canonico ora:

1. riconosce titoli numerati misti maiuscolo/minuscolo **solo dentro** un blocco `Percorso operativo`;
2. richiede progressione numerica attesa, evitando di trattare globalmente ogni elenco numerato come sezione;
3. riconosce le schede nominate tra virgolette come `STUDENT_SHEET`;
4. continua a lasciare domande e punti numerati interni alle schede come contenuto, non come sezioni di primo livello.

Questa estensione è richiesta dal documento reale, non da una fixture artificiale.

## 8. Provenienza runtime

Il `packCode` del blocco resta parte del binding runtime e deve continuare a coincidere con il Piano.

Un PACK che non ha fornito attività o risorse alla vista **non viene esposto come sorgente didattica**.

Per B20–B22:

- B20 → CAN-PLAN-1 + CAN-UDA-1-04;
- B21 → CAN-PLAN-1 + CAN-UDA-1-04;
- B22 → CAN-PLAN-1 + CAN-UDA-1-04 + CAN-PACK-1E, perché la scheda operativa proviene realmente dal PACK.

## 9. Approvazione B16–B19

Generazioni verificate nella KB il 23 agosto 2026:

- CAN-PLAN-1: `d327355b-76a9-496f-99cb-dc942fd950e4` — INDEXED;
- CAN-UDA-1-03: `296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c` — INDEXED;
- CAN-PACK-1B: `1902bdd3-c65f-46c0-b419-99bcd45131ad` — INDEXED.

### B16
- Fase UDA 4 — 2 ore;
- copertura: B16;
- sequenza: UDA phase;
- evidenza: `Tavola procedurale`;
- proiezione: `HTC-PRIMA-B16-PLAN-v1`.

### B17
- Fase UDA 5 — 4 ore;
- copertura: B17+B18;
- attività Piano: `Triangoli e quadrilateri selezionati`;
- evidenza: `Tavola grafica controllata`;
- proiezione: `HTC-PRIMA-B17-PLAN-v1`.

### B18
- Fase UDA 5 — 4 ore;
- copertura: B17+B18;
- attività Piano: `Poligoni regolari selezionati, procedure e controllo`;
- evidenza: `Tavola grafica`;
- proiezione: `HTC-PRIMA-B18-PLAN-v1`.

### B19
- Fase UDA 6 — 2 ore;
- copertura: B19;
- attività Piano: `Elaborato individuale con più costruzioni e autovalutazione`;
- evidenza: `Tavola VAL + breve prova`;
- proiezione: `HTC-PRIMA-B19-PLAN-v1`.

## 10. Approvazione B20–B22

Generazioni verificate nella KB il 23 agosto 2026:

- CAN-PLAN-1: `d327355b-76a9-496f-99cb-dc942fd950e4` — INDEXED;
- CAN-UDA-1-04: `da460375-d194-42ca-843b-078e73b5b814` — INDEXED;
- CAN-PACK-1E: `04127af9-0d75-41c1-a190-1fdbf480b1da` — INDEXED.

### B20 — Dal prodotto al rifiuto
- fasi: 1+2;
- copertura: B20;
- evidenza Piano: `Classificazione e schema iniziale`;
- risorse PACK: nessuna necessaria alla vista;
- proiezione: `HTC-PRIMA-B20-PLAN-v1`.

### B21 — Filiera di recupero ed economia circolare
- fasi: 3+4;
- copertura: B21;
- evidenza Piano: `Diagramma circolare + dati essenziali`;
- risorse PACK: nessuna necessaria alla vista;
- proiezione: `HTC-PRIMA-B21-PLAN-v1`.

### B22 — Dallo scarto alla nuova risorsa
- fasi: 5+6;
- copertura: B22;
- evidenza Piano: `Scheda/dossier + breve verifica`;
- risorsa PACK: `Scheda «Dallo scarto alla nuova risorsa»`;
- vincolo di contenuto: le modalità territoriali di conferimento non sono considerate stabili senza verifica su fonte istituzionale aggiornata;
- proiezione: `HTC-PRIMA-B22-PLAN-v1`.

## 11. Fail-closed obbligatori

La proiezione non è approvabile se:

- candidateId UDA/PACK non coincide;
- planBinding non coincide;
- code/generation del Piano non coincidono con il modello canonico;
- una fase UDA selezionata non esiste;
- fasi multiple non sono consecutive o contengono duplicati;
- la copertura dei blocchi è incompleta o non contigua;
- durata dei blocchi e durata complessiva delle fasi non coincidono;
- manca l’attività richiesta dal Piano;
- manca l’evidenza del Piano;
- manca una risorsa PACK esplicitamente richiesta dal Recipe;
- una risorsa punta a un passaggio inesistente;
- mancano le sezioni/voce UDA richieste;
- un campo editoriale obbligatorio è vuoto.

## 12. Non obiettivi

`PLAN_GUIDED_UDA` non deve:

- ricostruire liberamente una lezione da conoscenze generiche;
- dividere una fase UDA con percentuali o minuti inventati;
- sommare fasi non consecutive per far tornare artificialmente la durata;
- usare un PACK non pertinente solo perché associato al segmento;
- trasferire automaticamente nel runtime informazioni territoriali mutevoli senza verifica;
- cambiare la contabilizzazione delle ore;
- introdurre una nuova tabella DB;
- modificare la semantica della registrazione `SVOLTO / RIMODULATO / RECUPERATO`;
- sostituire la validazione umana del Recipe.

## 13. Implicazione per la scalabilità

Dopo B20–B22 il Content Engine continua a disporre di **quattro**, non cinque, raccordi:

1. `DIRECT`;
2. `UDA_ONLY`;
3. `PACK_COMPOSED`;
4. `PLAN_GUIDED_UDA`.

B20–B22 dimostrano che `PLAN_GUIDED_UDA` può coprire sia **1 fase → più blocchi**, sia **più fasi → 1 blocco**, preservando la somma esatta delle durate e la provenienza delle risorse.

La generalizzazione futura deve prima tentare questi quattro percorsi. Un nuovo Recipe è giustificato solo se una fonte canonica presenta una struttura realmente non esprimibile da essi.
