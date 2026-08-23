# HUMAN TASK — PLAN_GUIDED_UDA PROJECTION RECIPE

**Stato:** CANONICAL / APPROVED FOR B16–B19  
**Data:** 23 agosto 2026

## 1. Problema risolto

Il Content Engine dispone già di tre percorsi:

- `DIRECT`: una guida operativa del CAN-PACK coincide con il blocco del Piano;
- `UDA_ONLY`: il CAN-PACK non offre una guida dedicata e una fase UDA coincide esattamente con il blocco;
- `PACK_COMPOSED`: il Piano richiede una composizione controllata di più porzioni/pacchetti operativi.

B17–B18 espongono un quarto caso reale ma non un quarto tipo di documento:

- CAN-UDA-1-03 definisce **Fase 5 — Figure geometriche piane — 4 ore**;
- CAN-PLAN-1 divide quella stessa fase in due blocchi da 2 ore:
  - B17 — `Figure piane I` — attività: `triangoli e quadrilateri selezionati`;
  - B18 — `Figure piane II` — attività: `poligoni regolari selezionati, procedure e controllo`;
- CAN-PACK-1B non contiene una guida docente equivalente per questa seconda parte della UDA.

Mostrare la stessa fase da quattro ore in entrambi i blocchi sarebbe ambiguo. Dividere arbitrariamente la fase UDA sarebbe invece contenuto inventato.

`PLAN_GUIDED_UDA` usa quindi il Piano canonico per disambiguare il blocco e l’UDA per mantenere obiettivi, fase e criteri osservativi.

## 2. Regola canonica

`PLAN_GUIDED_UDA` è ammesso soltanto quando tutte le condizioni seguenti sono vere:

1. il blocco esiste nel Piano canonico corrente;
2. UDA, PACK, periodo, titolo e support PACK coincidono con il `planBinding` approvato;
3. il Recipe è legato alla generazione canonica esplicita del CAN-PLAN;
4. una fase UDA estraibile è indicata esplicitamente;
5. il Recipe dichiara tutti i blocchi che coprono quella fase;
6. tali blocchi sono contigui nel Piano;
7. la somma delle loro durate coincide esattamente con la durata della fase UDA;
8. il Piano fornisce l’evidenza del blocco;
9. la sequenza viene presa o dall’attività del Piano o, quando questa non è ripetuta, dal contenuto della fase UDA;
10. nessun tempo interno viene dedotto se la fonte non lo dichiara.

Il Recipe resta soggetto a **human approval** prima della materializzazione runtime.

## 3. Candidate ID e generazione del Piano

I candidateId B07–B15 sono già congelati sulle generazioni UDA/PACK. Inserire retroattivamente la generazione del Piano nel fingerprint globale obbligherebbe a migrare approvazioni valide senza beneficio operativo.

Per questo `PLAN_GUIDED_UDA` mantiene il candidateId corrente UDA/PACK e valida separatamente:

- `planSource.code`;
- `planSource.generationId`;
- `planBinding` del blocco.

Se la generazione canonica del Piano cambia, il Recipe diventa **INVALID** finché non viene rivalidato. Non viene promosso per inerzia.

## 4. Phase coverage

Ogni Recipe dichiara `phaseCoverageBlockIds`.

Il gate verifica:

- insieme non vuoto;
- nessun duplicato;
- presenza del blocco corrente;
- esistenza di tutti i blocchi nel Piano;
- contiguità;
- stesso raccordo UDA/PACK;
- durata complessiva uguale alla fase UDA.

### Caso B17–B18

- Fase UDA: `Fase 5 — Figure geometriche piane — 4 ore`;
- copertura: `[B17, B18]`;
- durata Piano: `120 + 120 = 240 min`;
- durata UDA: `240 min`;
- esito: **coerente**.

Nessun Recipe assegna, per esempio, “60 minuti ai triangoli” o “40 minuti ai poligoni”: la fonte non lo dichiara.

## 5. Origine dei contenuti

### `stepSource = UDA_PHASE`

Usato quando il Piano identifica il blocco/evidenza ma non ripete una riga `Attività` sufficiente.

Il passaggio operativo deriva dal contenuto della fase UDA selezionata.

### `stepSource = PLAN_ACTIVITY`

Usato quando il Piano rende esplicito il sotto-compito del blocco dentro una fase UDA più ampia.

Il passaggio operativo coincide con l’attività canonica del Piano. Non vengono aggiunti esempi, costruzioni, strumenti o sotto-passaggi non presenti nella fonte.

### Evidenza

In `PLAN_GUIDED_UDA` l’evidenza mostrata al docente è quella del blocco nel Piano canonico.

Obiettivi e indicatori di osservazione continuano a derivare dalla UDA selezionata.

## 6. PACK strutturale vs sorgente didattica

Il `packCode` del blocco resta parte del binding runtime e deve continuare a coincidere con il Piano.

Tuttavia un PACK che non ha fornito attività, risorse o evidenze alla vista **non viene esposto come sorgente didattica**.

Per B16–B19 le fonti operative mostrate sono quindi:

- CAN-PLAN-1;
- CAN-UDA-1-03.

CAN-PACK-1B resta il pacchetto canonico del segmento, ma non viene presentato come se avesse generato una guida che non contiene.

## 7. Approvazione B16–B19

Generazioni verificate nella KB il 23 agosto 2026:

- CAN-PLAN-1: `d327355b-76a9-496f-99cb-dc942fd950e4` — INDEXED;
- CAN-UDA-1-03: `296a7f07-95f3-4dd6-b1b5-3cd40a2ef37c` — INDEXED;
- CAN-PACK-1B: `1902bdd3-c65f-46c0-b419-99bcd45131ad` — INDEXED.

### B16

- Fase UDA: 4 — Segmenti, angoli, assi e bisettrici — 2 ore;
- copertura fase: B16;
- sequenza: UDA phase;
- evidenza Piano: `Tavola procedurale`;
- proiezione: `HTC-PRIMA-B16-PLAN-v1`.

### B17

- Fase UDA: 5 — Figure geometriche piane — 4 ore;
- copertura fase: B17+B18;
- attività Piano: `Triangoli e quadrilateri selezionati`;
- evidenza Piano: `Tavola grafica controllata`;
- proiezione: `HTC-PRIMA-B17-PLAN-v1`.

### B18

- Fase UDA: 5 — Figure geometriche piane — 4 ore;
- copertura fase: B17+B18;
- attività Piano: `Poligoni regolari selezionati, procedure e controllo`;
- evidenza Piano: `Tavola grafica`;
- proiezione: `HTC-PRIMA-B18-PLAN-v1`.

### B19

- Fase UDA: 6 — Tavola di sintesi e verifica — 2 ore;
- copertura fase: B19;
- attività Piano: `Elaborato individuale con più costruzioni e autovalutazione`;
- evidenza Piano: `Tavola VAL + breve prova`;
- proiezione: `HTC-PRIMA-B19-PLAN-v1`.

## 8. Fail-closed obbligatori

La proiezione non è approvabile se:

- candidateId UDA/PACK non coincide;
- planBinding non coincide;
- code/generation del Piano non coincidono con il modello canonico;
- la fase UDA non esiste;
- la copertura della fase è incompleta o non contigua;
- durata dei blocchi e durata della fase non coincidono;
- manca l’attività richiesta dal Piano;
- manca l’evidenza del Piano;
- mancano le sezioni/voce UDA richieste;
- un campo editoriale obbligatorio è vuoto.

## 9. Non obiettivi

`PLAN_GUIDED_UDA` non deve:

- ricostruire liberamente una lezione da conoscenze generiche;
- dividere una fase UDA con percentuali o minuti inventati;
- usare un PACK non pertinente solo perché associato al segmento;
- cambiare la contabilizzazione delle ore;
- introdurre una nuova tabella DB;
- modificare la semantica della registrazione `SVOLTO / RIMODULATO / RECUPERATO`;
- sostituire la validazione umana del Recipe.

## 10. Implicazione per la scalabilità

Dopo B16–B19 il Content Engine dispone di quattro raccordi espliciti e verificabili:

1. `DIRECT`;
2. `UDA_ONLY`;
3. `PACK_COMPOSED`;
4. `PLAN_GUIDED_UDA`.

La generalizzazione futura deve prima tentare questi quattro percorsi. Un nuovo Recipe è giustificato solo se una fonte canonica presenta una struttura realmente non esprimibile da essi.
