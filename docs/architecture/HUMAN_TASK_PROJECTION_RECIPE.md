# DOCENTE OS — Human Task Projection Recipe

Status: IMPLEMENTATION CONTRACT / P2
Date: 2026-08-22

## Scopo

Il **Projection Recipe** è il passaggio tra il candidato prodotto dalla pipeline semantica e una futura proiezione Human Task approvata per il runtime.

Catena:

**Piano canonico → KB normalizzata → Candidate → Projection Recipe → Draft → approvazione umana → proiezione runtime**

P2 si arresta a `READY_FOR_HUMAN_APPROVAL`.

Non esiste promozione automatica.

## 1. Incoerenza scoperta durante P2

La verifica di B07 ha mostrato una divergenza tra:

- la struttura aggregata allora presente in `product/src/app/piano-annuale/model.ts`;
- la rappresentazione sintetica di `CAN-PLAN-1` salvata nella KB;
- il documento canonico completo `CAN-PLAN-1` su Google Drive.

La revisione Drive corrente verificata è:

`AIroW36pbUMbMlUcOeMxi9OCzPfdnUEUcdx2qF4yPJDZZ6ChzDjwtP-kCQPdkXadhwPRoLyU3X3cT2R4mHJCyWcslKA0uY8qPRGcj83FIU4`

Il documento completo stabilisce per B07–B15:

- B07–B10 → UDA 1-02;
- B11–B12 → UDA 1-03;
- B13–B14 → UDA 1-02, con CAN-PACK-1C come supporto al micro-progetto;
- B15 → UDA 1-03, con CAN-PACK-1C e CAN-PACK-1D come supporti/regia.

Il runtime è stato riallineato a questa sequenza.

## 2. Regola di autorità

Per l'esecuzione annuale:

- il **documento CAN-PLAN completo verificato** determina ordine e appartenenza dei blocchi;
- `model.ts` è la sua proiezione strutturale runtime;
- la KB conserva provenienza, generazioni e contenuti normalizzati, ma una normalizzazione sintetica non può essere usata per ricostruire dettagli che non contiene;
- un conflitto tra struttura runtime e fonte canonica è bloccante per la generazione di nuove proiezioni.

La normalizzazione KB di CAN-PLAN-1 attualmente conserva la stessa revisione Drive nelle metadata, ma contiene una sintesi per intervalli. Questo è un problema di rappresentazione/snapshot da correggere nella pipeline di acquisizione, non un motivo per degradare il modello annuale.

## 3. Modello del blocco

La proiezione annuale di classe prima conserva ora per ogni blocco:

- `id` Bxx;
- UDA;
- pacchetto principale;
- eventuali `supportPacks`;
- periodo;
- focus;
- titolo umano del blocco;
- `segmentKey` strutturale.

I pacchetti di supporto non sostituiscono il pacchetto principale e non generano ore aggiuntive.

## 4. Binding del Recipe

Ogni `HumanTaskProjectionRecipe` è vincolato a due livelli.

### Generazioni contenuto

`candidateId` include le generazioni correnti di UDA e pacchetti. Se una fonte viene rigenerata, il Recipe precedente non viene riusato silenziosamente.

### Struttura Piano

`planBinding` conserva:

- `planSourceCode`;
- `segmentKey`;
- `udaCode`;
- `packCode`;
- `supportPackCodes`;
- titolo del blocco.

Se uno di questi elementi cambia, il Draft diventa `INVALID` con `PLAN_BINDING_MISMATCH`.

## 5. Cosa seleziona un Recipe

Il Recipe dichiara esplicitamente:

- guida docente da usare;
- eventuali fasi UDA che forniscono contesto;
- risultati attesi selezionati da una sezione UDA;
- indicatori di osservazione selezionati;
- risorse e relativo punto d'uso;
- superfici `PREPARE` / `OBSERVE`;
- allineamento `DIRECT` / `COMPOSED`;
- quattro brevi testi editoriali Human Task: perché, obiettivo, nota valutativa, continuazione.

I testi editoriali non possono introdurre attività, tempi, materiali, risultati o criteri non sostenuti dalle fonti.

## 6. Regole di validazione

Il Draft fallisce chiuso se:

- Candidate non reviewable;
- generazioni sorgente cambiate;
- blocco o plan binding cambiati;
- guida o risorsa non esistenti;
- tipo risorsa incompatibile;
- indice UDA inesistente;
- risorsa collegata a un passaggio inesistente;
- allineamento COMPOSED senza motivazione;
- guida DIRECT con durata esplicita diversa dal blocco;
- campi editoriali obbligatori vuoti.

Un mismatch di durata in un raccordo COMPOSED resta visibile come issue da review e non viene risolto inventando minuti.

## 7. Supporto a formati documentali diversi

P2 dimostra che il parser non deve imporre un'unica grammatica ai documenti.

Sono supportati almeno:

- UDA articolate come `Ora N`;
- UDA articolate come `Fase N — ... — N ore`;
- CAN-PACK con `SCHEDA DOCENTE`;
- CAN-PACK con `LEZIONE N — ... (2 h)`;
- risorse incorporate come `SCHEDA E`, `TAVOLA H`, rubriche, checklist e indicazioni inclusive.

La diversa granularità genera review, non falsa precisione.

## 8. Caso di prova B07

B07 è il primo Recipe P2:

**Riconoscere e classificare i materiali**

Fonti esatte:

- UDA `CAN-UDA-1-02`, generazione `5e0d5ae7-9f43-4d55-b470-533f2ac806fe`;
- PACK `CAN-PACK-1B`, generazione `1902bdd3-c65f-46c0-b419-99bcd45131ad`;
- Piano `CAN-PLAN-1`, B07, segmento `Prima:3`.

Il Recipe seleziona:

- guida `LEZIONE 5 — RICONOSCERE E CLASSIFICARE I MATERIALI`;
- Fasi UDA 1–2 come contesto, senza attribuire artificialmente quattro ore a B07;
- Scheda E nel passaggio di classificazione;
- tre obiettivi e tre evidenze osservabili presenti nella UDA.

Il Draft può raggiungere solo:

`READY_FOR_HUMAN_APPROVAL`

Non è ancora una proiezione runtime approvata.

## 9. Prestazioni

Candidate, Recipe e Draft appartengono al ciclo di preparazione/revisione.

Non devono introdurre letture KB nel percorso quotidiano:

**Orario → Classe → Lezione**.

Il runtime continua a usare soltanto proiezioni già promosse.

## 10. Acceptance P2

P2 è accettato quando:

1. la sequenza B07–B15 coincide con CAN-PLAN-1 completo;
2. B13–B15 conservano i pacchetti di supporto senza sostituire quello principale;
3. UDA 1-02 viene estratta correttamente come UDA a fasi;
4. CAN-PACK-1B riconosce lezioni e schede senza convenzioni hard-coded su B07;
5. il B07 Recipe genera una bozza tracciabile;
6. variazione di generazione sorgente invalida il Recipe;
7. variazione della struttura del Piano invalida il Recipe;
8. nessun Draft viene promosso automaticamente;
9. nessuna nuova dipendenza KB entra nel rendering quotidiano.
