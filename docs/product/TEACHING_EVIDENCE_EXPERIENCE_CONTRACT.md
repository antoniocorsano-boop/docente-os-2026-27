# DOCENTE OS — Osservazioni ed evidenze — Experience Contract

Data: 2026-09-13  
Stato: FOUNDATION / UI NOT YET AUTHORIZED

## Intento

L'esperienza deve consentire al docente di **osservare senza smettere di insegnare** e di comprendere ex post ciò che è accaduto senza compilare una seconda burocrazia.

La capability non introduce una nuova destinazione primaria nella navigazione. Vive nelle superfici già esistenti: **Classe, Lezione, Diario, Progetta**.

## Regola principale

Durante la lezione l'interazione deve essere più leggera della lettura ex post.

```text
IN AULA: pochi tocchi, nessun obbligo, nessuna analisi
REGISTRA: un solo commit professionale della lezione reale
DOPO: sintesi, confronto, provenienza, proposta
```

## In aula

La fase `Osserva` deve:

- mostrare soltanto dimensioni pertinenti alla lezione corrente;
- permettere 0–4 micro-rilevazioni tipiche senza richiedere il completamento della lista;
- usare target touch conformi al sistema visuale canonico;
- mantenere `Non osservato` come stato neutro;
- consentire una nota breve facoltativa;
- evitare matrici, tabelle dense e rubriche complete;
- non chiedere di scegliere alunni individuali;
- non interrompere la sequenza `In classe → Osserva → Registra`.

### Lifecycle durante l'ora

Finché il docente non sceglie **Registra la lezione**, le micro-rilevazioni sono **draft effimeri della superficie**. Non devono creare una seconda “sessione in corso” persistente né Observation prive di TeachingSession autorevole.

Questo significa:

- navigare fra i passaggi della lezione non produce write canonici;
- le selezioni possono essere modificate liberamente prima della chiusura;
- `Registra` invia sessione + micro-osservazioni allo stesso boundary applicativo;
- il server rivalida tutto prima della persistenza;
- una futura funzione di autosalvataggio richiede un contratto `LessonDraft` separato e non è implicita in questa capability.

## Stati mostrati all'utente

Etichette umane consigliate:

- **Non osservato**
- **Da sostenere**
- **In sviluppo**
- **Consolidato**

Le etichette non mostrano numeri, percentuali o equivalenze con voti.

## Registra

**Registra la lezione deve avere un solo significato in tutto Docente OS:** creare/correggere la `TeachingSession` che rappresenta ciò che è realmente accaduto.

La chiusura deve separare:

1. **lezione reale** — durata, contesto e provenienza;
2. **allocazione al Piano** — solo quando pertinente, senza completamento automatico del Bxx;
3. **osservazioni già raccolte** — richiamate, non ricopiate;
4. **evidenze/riferimenti** — facoltativi;
5. **riflessione professionale** — facoltativa e modificabile;
6. **decisione sul Piano** — separata dalla semplice registrazione della lezione.

Il salvataggio non deve essere bloccato dall'assenza di osservazioni strutturate.

Il workspace `/lezioni/<Bxx>` e il cockpit `/in-classe/<assetId>` non devono avere semantiche diverse di “Registra”: entrambi devono convergere sulla TeachingSession autorevole. Il Bxx noto può precompilare/proporre un'allocazione, non sostituire la sessione con un aggiornamento diretto dello stato del Piano.

## Classe — lettura ex post

La Classe non deve diventare una tabella permanente di livelli.

La superficie deve privilegiare:

- **Segnali recenti**;
- **Cosa sembra stabile**;
- **Cosa merita ancora osservazione**;
- **Evidenze recenti**;
- **Prossima occasione utile**;
- accesso `Perché?` alla provenienza.

Una sintesi deve distinguere chiaramente:

- singolo episodio;
- ricorrenza;
- possibile evoluzione;
- evidenza insufficiente;
- cambiamento di contesto.

Le letture correnti usano per default le TeachingSession non superseded; la storia delle correzioni resta ispezionabile.

## Perché?

Ogni insight assistito deve offrire un percorso breve:

```text
Insight
  ↓
Perché lo vedo?
  ↓
Lezioni coinvolte
  ↓
Osservazioni + evidenze originarie
```

L'utente non deve dover aprire documenti tecnici per comprendere l'origine della sintesi.

## Diario

DOCENTE OS possiede già `TeachingSessionReflection` e la proiezione documentale su Drive. La capability non introduce un secondo Diario.

Le micro-osservazioni possono preparare una **bozza di riflessione**, ma la sintesi:

- è modificabile;
- distingue fatti e interpretazioni;
- non inventa osservazioni mancanti;
- non sovrascrive silenziosamente una reflection già salvata;
- può includere una decisione didattica soltanto dopo conferma del docente.

## Progetta

Un insight non modifica automaticamente UDA, blocco o materiali.

Quando esiste una proposta pertinente, Progetta può mostrare:

- **Segnale osservato**;
- **Evidenze che lo sostengono**;
- **Proposta per la prossima attività**;
- azioni: `Accetta`, `Modifica`, `Ignora`.

Solo `Accetta` o `Modifica` può autorizzare una successiva mutazione della progettazione tramite il normale boundary umano.

## Assistenza intelligente

I ruoli cooperativi non vengono mostrati come agenti separati. Usano l'`AiOrchestratorPort` già canonico e mantengono una sola esperienza Docente OS.

- riconoscere ricorrenze = lettura assistita;
- proporre una prossima azione = `PROPOSE`;
- applicare una modifica = solo attraverso il boundary umano previsto;
- assenza del provider AI = nessun blocco di Osserva, Registra, Diario o consultazione delle evidenze.

## Mobile

La superficie in aula è mobile-first:

- una mano;
- nessuna tabella orizzontale;
- nessun testo lungo obbligatorio;
- stato selezionabile senza precisione fine;
- feedback immediato ma non invasivo;
- nessun salvataggio ambiguo;
- nessuna dipendenza da hover.

## Accessibilità

- gli stati non dipendono soltanto dal colore;
- i controlli hanno nome accessibile esplicito;
- la sequenza resta navigabile da tastiera;
- il focus segue la grammatica globale;
- le informazioni di trend hanno equivalente testuale;
- `Perché?` è raggiungibile senza gesti complessi.

## Cose da non costruire

- pagina autonoma `Valutazione classe`;
- heatmap opaca dei livelli;
- media numerica delle osservazioni;
- semaforo globale della classe;
- ranking di classi o gruppi;
- profili permanenti individuali;
- compilazione obbligatoria a fine ora;
- chatbot separato per l'analisi didattica;
- duplicazione del Diario;
- una seconda persistenza della TeachingSession;
- Observation persistenti prima che esista la sessione canonica, salvo futura capability LessonDraft esplicita.

## Criterio di maturità UX

L'esperienza è accettabile quando, durante una lezione reale, il docente può effettuare una micro-rilevazione significativa in pochi secondi, chiudere la lezione con **un solo gesto semantico di registrazione**, e giorni dopo ricostruire **che cosa ha osservato, perché il sistema evidenzia un pattern e quale decisione professionale ne è derivata** senza consultare archivi paralleli.
