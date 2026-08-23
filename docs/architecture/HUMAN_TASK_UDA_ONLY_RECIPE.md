# DOCENTE OS — Human Task UDA-only Projection Recipe

Status: CANONICAL / APPROVAL RECORD P4  
Date: 2026-08-22

## Decisione

DOCENTE OS ammette un secondo percorso di costruzione delle proiezioni Human Task quando il Piano annuale assegna un blocco a una UDA ma il CAN-PACK associato non contiene una guida docente direttamente allineata.

Il percorso è denominato **`COMPOSED / UDA_ONLY`**.

Non è un fallback automatico e non è un permesso di scrivere una lezione a partire da indicazioni generiche.

> Una fase canonica di UDA può diventare sorgente operativa soltanto quando è già sufficientemente orientata all'azione e temporalmente compatibile con il blocco canonico. L'assenza di una guida CAN-PACK non autorizza a inventarne una.

## Due modalità mature

### DIRECT

Usare quando esiste una guida operativa nel CAN-PACK direttamente riconducibile al blocco.

Catena:

**Piano → UDA → guida PACK → risorse PACK → Draft → approvazione → runtime**

La guida PACK alimenta la sequenza operativa; UDA e Piano forniscono contesto, obiettivi, evidenze e struttura.

### COMPOSED / UDA_ONLY

Usare soltanto quando il CAN-PACK non contiene la guida necessaria ma una singola fase della UDA contiene già una descrizione operativa utilizzabile senza aggiunte.

Catena:

**Piano → singola fase UDA → evidenze UDA → Draft UDA-only → approvazione separata → runtime**

Il PACK resta parte del binding strutturale del Piano, ma non viene dichiarato come sorgente del contenuto operativo se non ha effettivamente contribuito alla vista.

## Gate obbligatori UDA-only

Un Recipe `UDA_ONLY` è ammissibile soltanto se:

1. il Candidate ha superato il gate strutturale della pipeline;
2. il Recipe è legato alle generazioni correnti delle fonti tramite `candidateId`;
3. Piano, segmento, UDA, pack strutturale, support pack e titolo coincidono con il `planBinding` approvato;
4. `sourceAlignment.level = COMPOSED`;
5. il Recipe contiene una nota non vuota che spiega il gap PACK e il raccordo adottato;
6. è selezionata **una fase UDA esplicita**;
7. la durata della fase UDA coincide esattamente con la durata del blocco;
8. il testo della fase contiene azioni operative estraibili senza aggiungere attività;
9. obiettivi, evidenza e indicatori vengono selezionati da sezioni esistenti della stessa UDA;
10. nessun materiale, risorsa, tempo interno o prodotto viene dedotto se non compare nelle fonti utilizzate;
11. il Draft raggiunge al massimo `READY_FOR_HUMAN_APPROVAL`;
12. la promozione al runtime richiede una decisione umana esplicita.

Il mancato rispetto di uno solo dei gate bloccanti produce `INVALID` / `BLOCKED`.

## Regole di trasformazione

La proiezione UDA-only può:

- segmentare in passaggi frasi operative già presenti nella fase;
- abbreviare un titolo per renderlo leggibile senza modificarne il significato;
- selezionare gli obiettivi pertinenti già presenti;
- selezionare evidenze e indicatori già presenti;
- aggiungere micro-copy editoriale che spiega il senso della fase, purché non introduca nuove attività o criteri.

Non può:

- creare una scheda alunno che la fonte non contiene;
- aggiungere materiali “ovvi” o consigliati;
- attribuire minuti ai singoli passaggi se la fonte non li attribuisce;
- sostituire una fase di durata diversa con una redistribuzione arbitraria;
- usare contenuti di altre fasi senza dichiarare un altro Recipe e un altro raccordo;
- presentare il CAN-PACK come sorgente della lezione se non ha fornito contenuto operativo;
- trasformare evidenze formative in voti automatici.

## Caso di riferimento — B10

Blocco canonico:

**Dalla risorsa al prodotto — 2 ore — UDA 1-02**

Il Piano associa strutturalmente `CAN-PACK-1B`, ma quel pacchetto passa dalla lezione sulla scelta dei materiali direttamente all'avvio del disegno tecnico. Non contiene quindi una guida docente per B10.

`CAN-UDA-1-02`, invece, contiene:

**Fase 4 — Dalla risorsa al prodotto — 2 ore**

con due azioni documentate:

1. ricostruzione di una o più filiere esemplificative;
2. uso di diagrammi lineari o di flusso.

La durata coincide esattamente con il blocco. Sono inoltre presenti nella stessa UDA:

- l'obiettivo di ricostruire le principali fasi di una filiera;
- l'evidenza «ricostruisce una semplice filiera»;
- indicatori sul lessico e sulla documentazione del lavoro.

B10 può quindi essere promossa come **`HTC-PRIMA-B10-UDA-v1`** dopo approvazione umana.

### Contenuto approvato

La vista operativa contiene soltanto:

- **Ricostruisci una filiera** — usando gli esempi già presenti nella UDA;
- **Rappresentala con un diagramma** — lineare o di flusso.

Non contiene:

- schede alunno inventate;
- lista di materiali dedotta;
- scansione minuto-per-minuto;
- attività aggiuntive di ricerca, verifica o laboratorio.

La sezione **Prepara** omette la lista materiali quando non esiste una preparazione specifica sostenuta dalla fonte, invece di mostrare un artificiale `0/0` o suggerire materiali.

## Provenienza

Per B10 il runtime espone come fonti di contenuto:

- `CAN-PLAN-1` — struttura del blocco;
- `CAN-UDA-1-02` — fase operativa, obiettivi ed evidenze.

`CAN-PACK-1B` resta nel `planBinding` perché è il pacchetto strutturalmente associato al segmento, ma non compare tra le fonti della vista B10 perché non ha fornito la sequenza operativa.

Generazioni del Recipe di riferimento:

- UDA 1-02: `5e0d5ae7-9f43-4d55-b470-533f2ac806fe`;
- PACK 1B, solo per binding/candidate: `1902bdd3-c65f-46c0-b419-99bcd45131ad`.

## Invalidation

B10 deve tornare in revisione o fallire chiusa se cambia uno dei seguenti elementi:

- generazione UDA o PACK inclusa nel Candidate;
- struttura del Piano;
- UDA o pack assegnato al blocco;
- titolo o segmento del blocco;
- numero della fase selezionata;
- durata della fase;
- presenza delle voci UDA usate per obiettivi/evidenze/osservazione;
- contenuto della fase in modo tale da non fornire più una sequenza operativa sufficiente.

## Prestazioni

Il Recipe e la pipeline sono strumenti di preparazione/revisione. Dopo l'approvazione, la proiezione viene materializzata nel registro runtime.

Nessuna lettura KB viene introdotta nel percorso quotidiano:

**Orario → Classe → Lezione**.

## Criterio di successo

Il percorso UDA-only è valido se permette di coprire un gap documentale senza trasformarlo in un gap di affidabilità.

La domanda di controllo resta:

> Ogni cosa che il docente vede e usa durante questa lezione può essere ricondotta a una fonte canonica identificabile oppure a micro-copy editoriale che non modifica il contenuto didattico?

Se la risposta è no, la proiezione non deve essere promossa.
