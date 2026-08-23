# DOCENTE OS — Human Task Projection Recipe

Status: IMPLEMENTATION CONTRACT / P2–P4  
Date: 2026-08-22

## Scopo

Il **Projection Recipe** è il passaggio tra il candidato prodotto dalla pipeline semantica e una futura proiezione Human Task approvata per il runtime.

Catena:

**Piano canonico → KB normalizzata → Candidate → Projection Recipe → Draft → approvazione umana → proiezione runtime**

Candidate e Draft non autorizzano mai da soli la promozione. Il massimo stato automatico resta `READY_FOR_HUMAN_APPROVAL`.

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

Ogni Recipe è vincolato a due livelli.

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

## 5. Cosa seleziona un Recipe DIRECT

Il Recipe DIRECT dichiara esplicitamente:

- guida docente da usare;
- eventuali fasi UDA che forniscono contesto;
- risultati attesi selezionati da una sezione UDA;
- indicatori di osservazione selezionati;
- risorse e relativo punto d'uso;
- superfici `PREPARE` / `OBSERVE`;
- allineamento `DIRECT` o, dove la guida esiste ma richiede raccordo, `COMPOSED`;
- quattro brevi testi editoriali Human Task: perché, obiettivo, nota valutativa, continuazione.

I testi editoriali non possono introdurre attività, tempi, materiali, risultati o criteri non sostenuti dalle fonti.

## 6. Regole di validazione DIRECT

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

Un mismatch di durata in un raccordo COMPOSED con guida resta visibile come issue da review e non viene risolto inventando minuti.

## 7. Supporto a formati documentali diversi

Il parser non impone un'unica grammatica ai documenti.

Sono supportati almeno:

- UDA articolate come `Ora N`;
- UDA articolate come `Fase N — ... — N ore`;
- CAN-PACK con `SCHEDA DOCENTE`;
- CAN-PACK con `LEZIONE N — ... (2 h)`;
- risorse incorporate come `SCHEDA E`, `TAVOLA H`, rubriche, checklist e indicazioni inclusive.

La diversa granularità genera review, non falsa precisione.

## 8. Primo caso DIRECT — B07

B07 è stato il primo Recipe P2:

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

B07 è stata successivamente approvata e materializzata nel runtime. Lo stesso percorso DIRECT è stato poi applicato a B08 e B09.

## 9. Batch review

La revisione di più blocchi non usa il principio “o tutto o niente”.

Ogni blocco può risultare:

- `READY_FOR_HUMAN_APPROVAL` se Candidate e Recipe producono un Draft valido;
- `BLOCKED` se il Draft è invalido o esiste un gap esplicito;
- senza Recipe, che equivale a nessuna autorizzazione a derivare liberamente contenuto.

Questa regola ha permesso di approvare B08 e B09 lasciando inizialmente B10 bloccata per assenza di guida PACK direttamente allineata.

## 10. Seconda modalità canonica — COMPOSED / UDA_ONLY

P4 introduce una seconda modalità matura per i casi in cui il Piano assegna un blocco a una UDA ma il CAN-PACK non contiene una guida operativa pertinente.

Il contratto completo è definito in:

`docs/architecture/HUMAN_TASK_UDA_ONLY_RECIPE.md`

La modalità `UDA_ONLY` non riutilizza il builder DIRECT con eccezioni. Ha un builder e gate dedicati.

Condizioni essenziali:

- una singola fase UDA viene selezionata come sorgente operativa;
- la durata della fase deve coincidere **esattamente** con quella del blocco;
- il testo della fase deve essere già orientato all'azione;
- passaggi, obiettivi, evidenze e osservazione provengono dalla UDA;
- materiali e risorse restano vuoti se la fase non li specifica;
- il PACK può restare nel `planBinding`, ma non viene dichiarato come fonte del contenuto operativo se non ha contribuito;
- ogni passo resta senza minuti interni se la fonte non li attribuisce;
- una nota `COMPOSED` esplicita è obbligatoria;
- il Draft richiede comunque approvazione umana separata.

Il primo caso di riferimento è **B10 — Dalla risorsa al prodotto**, costruito esclusivamente dalla Fase 4 di `CAN-UDA-1-02` da 2 ore e dalle evidenze della stessa UDA.

## 11. Limite dell'approvazione umana

L'approvazione non è una fase di authoring libero.

Può:

- rendere un titolo più leggibile;
- trasformare una frase sorgente in micro-copy equivalente;
- rendere umano il nome di una risorsa;
- selezionare fra evidenze già presenti.

Non può:

- aggiungere attività;
- inventare materiali o risorse;
- assegnare tempi assenti;
- aggiungere criteri valutativi;
- colmare un gap documentale con conoscenza implicita non tracciata.

## 12. Prestazioni

Candidate, Recipe e Draft appartengono al ciclo di preparazione/revisione.

Non devono introdurre letture KB nel percorso quotidiano:

**Orario → Classe → Lezione**.

Il runtime continua a usare soltanto proiezioni già promosse e materializzate.

## 13. Acceptance corrente

Il sistema Projection Recipe è accettato quando:

1. la sequenza dei blocchi coincide con il CAN-PLAN completo;
2. i pacchetti di supporto restano distinti dal pacchetto principale;
3. UDA e PACK vengono estratti senza imporre un formato unico;
4. ogni Recipe è vincolato alle generazioni e alla struttura del Piano;
5. il batch review produce esiti indipendenti per blocco;
6. DIRECT richiede una guida operativa PACK identificabile;
7. UDA_ONLY richiede una fase UDA temporalmente coincidente e sufficientemente operativa;
8. variazione della generazione o del Piano invalida la proiezione;
9. nessun Draft viene promosso automaticamente;
10. nessuna nuova dipendenza KB entra nel rendering quotidiano;
11. il runtime espone soltanto fonti che hanno realmente contribuito al contenuto mostrato.
