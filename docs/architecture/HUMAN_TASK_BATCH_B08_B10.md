# DOCENTE OS — Human Task batch B08–B10

Status: APPROVAL RECORD / P3
Date: 2026-08-22

## Scopo

Verificare che la catena:

**Candidate → Recipe → Draft → human approval → runtime**

sia applicabile a più blocchi in una sola tranche senza trasformare l’approvazione umana in una formalità.

## Esito

| Blocco | Esito | Motivo |
| --- | --- | --- |
| B08 — Proprietà e prove comparative | APPROVATO | Guida CAN-PACK-1B Lezione 6 da 2h direttamente allineata; Scheda F disponibile; obiettivi/evidenze presenti in CAN-UDA-1-02. |
| B09 — Scegliere un materiale per una funzione | APPROVATO | Guida CAN-PACK-1B Lezione 7 da 2h direttamente allineata; Scheda G disponibile; obiettivi/evidenze presenti in CAN-UDA-1-02. |
| B10 — Dalla risorsa al prodotto | BLOCCATO | CAN-UDA-1-02 contiene una fase da 2h, ma CAN-PACK-1B passa dalla Lezione 7 sui materiali alla Lezione 8 di disegno tecnico. Manca una guida docente 2h direttamente allineata a B10. |

## Regola di batch review

Il batch review non usa il principio “o tutto o niente”. Ogni blocco riceve un esito indipendente:

- `READY_FOR_HUMAN_APPROVAL` se Candidate e Recipe producono un Draft valido;
- `BLOCKED` se il Draft è invalido oppure esiste un gap di contenuto dichiarato;
- assenza di Recipe non equivale a permesso di derivare liberamente una lezione.

Questo permette di promuovere B08 e B09 lasciando B10 correttamente fuori dal runtime.

## Fonti congelate

Generazioni correnti usate nel batch:

- `CAN-UDA-1-02`: `5e0d5ae7-9f43-4d55-b470-533f2ac806fe`;
- `CAN-PACK-1B`: `1902bdd3-c65f-46c0-b419-99bcd45131ad`;
- Piano: struttura B08–B10 di `CAN-PLAN-1`, segmento `Prima:3`.

Documenti Drive:

- CAN-UDA-1-02: `1MziCI5IjvYjhHjU-rpe25ASMl48HlCQeh2FDIoJRROo`;
- CAN-PACK-1B: `1QnrzAD1rHWwp97r-KPUuCC8XdFNXUFqMk5hi33GxuxQ`.

## B08 approvata

La guida sorgente dichiara una lezione complessiva di 2 ore ma non assegna minuti interni. Il runtime conserva quindi:

- durata blocco: 120 min;
- timing passaggi: `UNSPECIFIED`;
- nessuna suddivisione artificiale dei 120 minuti;
- Scheda F collegata all’attività di prova comparativa;
- regola metodologica “una variabile alla volta, osservazione, confronto, registrazione” usata come cue contestuale perché è presente esplicitamente nella fonte.

## B09 approvata

La guida sorgente contiene due clausole operative separate da punto e virgola:

1. confronto tra tre materiali per un semplice oggetto;
2. applicazione dei criteri di scelta.

Il runtime conserva due passaggi e collega la Scheda G al secondo. Anche qui non vengono inventati minuti interni.

## Limite delle modifiche in approvazione

L’approvazione può:

- rendere leggibile il titolo di un passaggio;
- trasformare una frase sorgente in micro-copy equivalente senza aggiungere contenuto;
- usare come cue una nota metodologica esplicitamente presente nella stessa guida;
- rendere umano il nome di una risorsa.

L’approvazione non può:

- aggiungere attività;
- dividere o fondere attività in modo da cambiarne il significato;
- aggiungere materiali non sostenuti dalle fonti;
- attribuire tempi non presenti;
- aggiungere esiti o criteri di valutazione;
- promuovere un blocco con gap non risolto.

## B10: criterio di sblocco

B10 potrà essere promossa solo con una delle seguenti condizioni:

1. acquisizione/creazione di una guida operativa canonica specifica per “Dalla risorsa al prodotto”; oppure
2. decisione esplicita di adottare un Recipe `COMPOSED` UDA-only, con regole dedicate che garantiscano una sequenza operativa sostenuta integralmente dalla UDA e una revisione umana separata.

La seconda opzione non viene introdotta implicitamente in questo batch.

## Prestazioni

Le proiezioni approvate sono materializzate nel registro runtime. Nessuna nuova lettura KB viene aggiunta al percorso:

**Orario → Classe → Lezione**.
