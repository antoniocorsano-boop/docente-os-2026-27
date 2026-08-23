# DOCENTE OS — X3 Refined UX Acceptance

Data: 2026-08-23  
Stato: HUMAN_ACCEPTANCE_REQUIRED  
Runtime di riferimento: Render beta

## Perché serve questo gate

X3 è tecnicamente completa, ma X4 può introdurre la prima `WRITE_REVERSIBLE` soltanto dopo che l'assistente raffinato risulta umanamente utilizzabile nel prodotto reale.

Il controllo non riguarda la qualità di un modello LLM commerciale: X3 è ancora provider-neutral e deterministica. Il gate riguarda **presenza, comprensibilità, ingombro, contesto e fiducia operativa**.

## Superficie da provare

Aprire un documento reale in **Conoscenza** sul runtime beta Render e usare il trigger dell'assistente contestuale.

Non occorre modificare dati.

## Tre richieste

### 1. Comprensione

Chiedere:

`Cosa contiene questo documento?`

Esito atteso:

- risposta riferita al documento aperto;
- distingue fonte/stato/contesto disponibile;
- non produce una risposta da chatbot generico;
- nessuna modifica ai dati.

### 2. Prossimo passo

Chiedere:

`Qual è il prossimo passo utile?`

Esito atteso:

- propone un passo coerente con stato e lacune reali;
- distingue proposta da fatto;
- esplicita l'effetto;
- non esegue azioni.

### 3. Richiesta di scrittura

Chiedere:

`Crea un'attività nel Planner da questo documento.`

Esito X3 atteso:

- riconosce che la richiesta implica una modifica;
- **non crea** l'attività;
- indica il percorso manuale controllato;
- non modifica Piano annuale, Calendario, Orario o documento.

Questo terzo caso dimostra che il confine X3/X4 è visibile all'utente, non soltanto presente nel codice.

## Controllo visivo e di usabilità

Durante le tre richieste verificare che:

- il trigger dell'assistente sia riconoscibile ma non dominante;
- il pannello non copra il contenuto necessario per leggere il documento;
- apertura e chiusura siano immediate e comprensibili;
- su mobile non costringa a ricostruire il contesto dopo ogni risposta;
- il linguaggio resti scolastico/operativo e non tecnico;
- sia chiaro quando l'assistente sta leggendo, proponendo o rifiutando una write.

## Decisione richiesta

### APPROVE

X3 è sufficientemente maturo per aprire la prima slice X4 limitata a `PLANNER_CREATE_TASK` con preview, conferma e reversibilità.

L'approvazione **non** autorizza:

- e-mail;
- Google Drive write;
- Calendar esterno;
- pubblicazioni;
- attivazione Orario;
- decisioni istituzionali;
- altre capability di scrittura.

### REQUEST_CHANGES

Indicare soltanto ciò che crea attrito reale nell'uso: ingombro, tono, perdita di contesto, poca chiarezza del confine proposta/azione o altro problema osservabile.

## Conseguenza dell'approvazione

Se il gate viene approvato, la prima slice X4 potrà:

1. abilitare `PLANNER_CREATE_TASK` **solo** nella superficie autorizzata;
2. mostrare preview strutturata dell'effetto;
3. legare la conferma a `proposalId` e fingerprint del payload;
4. rieseguire autorizzazione e validazione lato server;
5. creare la task attraverso application layer/repository esistenti;
6. registrare proposta, fonte e utente confermante;
7. offrire reversibilità/undo;
8. mantenere tutte le write esterne e istituzionali vietate.
