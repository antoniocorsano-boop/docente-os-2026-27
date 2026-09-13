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
DOPO: sintesi, confronto, provenance, proposta
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

## Stati mostrati all'utente

Etichette umane consigliate:

- **Non osservato**
- **Da sostenere**
- **In sviluppo**
- **Consolidato**

Le etichette non mostrano numeri, percentuali o equivalenze con voti.

## Registra

La chiusura della lezione deve separare:

1. **esito della lezione** — svolta / rimodulata / recupero;
2. **osservazioni già raccolte** — richiamate, non ricopiate;
3. **evidenza o nota finale** — facoltativa;
4. **decisione immediata** — soltanto se il docente vuole registrarla.

Il salvataggio non deve essere bloccato dall'assenza di osservazioni strutturate.

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

DOCENTE OS può proporre una sintesi della giornata o della classe basata sulle TeachingSession registrate.

La sintesi:

- è modificabile;
- distingue fatti e interpretazioni;
- non inventa osservazioni mancanti;
- può includere una decisione didattica soltanto dopo conferma del docente.

## Progetta

Un insight non modifica automaticamente UDA, blocco o materiali.

Quando esiste una proposta pertinente, Progetta può mostrare:

- **Segnale osservato**;
- **Evidenze che lo sostengono**;
- **Proposta per la prossima attività**;
- azioni: `Accetta`, `Modifica`, `Ignora`.

Solo `Accetta` o `Modifica` può autorizzare una successiva mutazione della progettazione tramite il normale boundary umano.

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
- duplicazione del Diario.

## Criterio di maturità UX

L'esperienza è accettabile quando, durante una lezione reale, il docente può effettuare una micro-rilevazione significativa in pochi secondi e, giorni dopo, ricostruire **che cosa ha osservato, perché il sistema evidenzia un pattern e quale decisione professionale ne è derivata** senza consultare archivi paralleli.
