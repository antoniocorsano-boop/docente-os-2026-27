# DOCENTE OS — Human Interaction State Matrix

Data: 2026-08-29  
Stato: PROPOSED CANONICAL EXTENSION

## 1. Scopo

Questa matrice estende il Design System V2 per impedire che uno stato visuale venga confuso con uno stato di compito, autorità o dato.

Regola fondamentale:

> **Visual state ≠ task state ≠ authority state ≠ data state.**

La stessa resa grafica non può essere usata per significati diversi senza un'etichetta o un messaggio comprensibile.

## 2. Dimensioni

### A. Visual state

Descrive come il controllo appare e reagisce.

- `DEFAULT`
- `HOVER`
- `ACTIVE`
- `FOCUS_VISIBLE`
- `DISABLED`
- `LOADING`
- `ERROR`
- `SUCCESS`

### B. Task state

Descrive la situazione del compito umano.

- `NOT_STARTED`
- `AVAILABLE`
- `IN_PROGRESS`
- `REQUIRES_CONFIRMATION`
- `COMPLETED`
- `RECOVERABLE_ERROR`
- `BLOCKED`
- `NOT_YET_AVAILABLE`
- `READ_ONLY`

### C. Authority state

Descrive se l'utente corrente può eseguire o confermare l'azione.

- `ALLOWED`
- `ALLOWED_WITH_CONFIRMATION`
- `READ_ONLY_BY_AUTHORITY`
- `BLOCKED_BY_AUTHORITY`
- `REQUIRES_OTHER_HUMAN`

Questa dimensione deve derivare dai contratti di autorità; la UI non la inventa.

### D. Data state

Descrive lo stato delle informazioni su cui il compito opera.

- `EMPTY`
- `AVAILABLE`
- `STALE`
- `PROCESSING`
- `PARTIAL`
- `FAILED`
- `VERIFIED`
- `PROVISIONAL`

Le verticali possono aggiungere stati di dominio, purché la UI continui a esporli con linguaggio umano conforme al Design System V2.

## 3. Regole di composizione

1. `DISABLED` non spiega da solo perché un'azione non è disponibile.
2. `BLOCKED_BY_AUTHORITY` richiede una spiegazione umana e non deve sembrare un guasto tecnico.
3. `REQUIRES_CONFIRMATION` deve mantenere visibile la decisione che l'utente sta per assumere.
4. `LOADING` non deve rimuovere il contesto necessario a comprendere che cosa è in corso.
5. `RECOVERABLE_ERROR` deve preservare e dichiarare lo stato sicuro precedente.
6. `READ_ONLY` deve distinguersi da `NOT_YET_AVAILABLE`: il primo è consultabile ma non modificabile, il secondo non è ancora pronto per il compito.
7. `EMPTY` non equivale a errore.
8. `PROVISIONAL` e `VERIFIED` non possono essere distinti soltanto dal colore.
9. Un'azione autorevole o distruttiva non può essere resa più facile eliminando una conferma prevista dal contratto umano.
10. Uno stato prodotto dall'AI non acquisisce autorità mediante stile, posizione o enfasi visiva.

## 4. Esempio canonico

### Rielaborazione di un contenuto in Conoscenza

Prima dell'azione:

```text
visual     = DEFAULT
task       = AVAILABLE
authority  = ALLOWED
data        = AVAILABLE
```

Durante l'elaborazione:

```text
visual     = LOADING
task       = IN_PROGRESS
authority  = ALLOWED
data        = PROCESSING
```

Errore recuperabile:

```text
visual     = ERROR
task       = RECOVERABLE_ERROR
authority  = ALLOWED
data        = FAILED
```

La UI deve spiegare che la nuova elaborazione non è riuscita, che la versione precedente resta disponibile e quale azione è possibile compiere.

## 5. Copertura minima per componenti interattivi

Per ciascun componente verificare, quando applicabile:

| Stato | Obbligo |
|---|---|
| Default | sempre |
| Hover | desktop/puntatore |
| Active/pressed | controlli attivabili |
| Focus visible | sempre per controlli da tastiera |
| Disabled | se previsto |
| Loading | se l'azione è asincrona |
| Empty/not available | se dipende da dati o prerequisiti |
| Error | se può fallire |
| Success | se serve conferma dell'esito |
| Blocked by authority | se esistono limiti di ruolo/autorità |
| Requires confirmation | per azioni governate da conferma |
| Read-only | se l'oggetto resta consultabile senza scrittura |

## 6. Audit

Una verifica della matrice deve produrre almeno:

- elemento o transizione osservata;
- dimensioni applicabili;
- stato rappresentato;
- evidenza UI/test;
- eventuale ambiguità;
- intervento richiesto.

Classificazione: `PASS`, `PARTIAL`, `FAIL`, `NOT_APPLICABLE`.

## 7. Relazione con il Design System V2

Questo documento non sostituisce `DESIGN_SYSTEM_V2_CANONICAL.md`.

Il Design System definisce principi, componenti, anatomia, token, accessibilità e stati umani. Questa matrice aggiunge un contratto di composizione per impedire che la resa visiva alteri o nasconda il significato operativo.
