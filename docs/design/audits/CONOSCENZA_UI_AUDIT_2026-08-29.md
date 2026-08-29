# DOCENTE OS — Audit UI Engineering: Conoscenza

Data: 2026-08-29  
Baseline: `develop@6dde1fd3aae5411a2474f896b461c7c077e6961c`  
Tipo: `AUDIT`  
Stato: `STATIC_AUDIT_COMPLETE / LIVE_BROWSER_AND_HVA_PENDING`

## 1. Perimetro

Superficie canonica esaminata:

- `product/src/app/knowledge/page.tsx`;
- `product/src/app/knowledge/knowledge.css`;
- `product/src/app/globals.css`;
- struttura dei moduli `product/src/app/knowledge/`.

Questo audit non modifica la UI e non promuove alcun gate. La verifica live in browser e HVA restano separati.

## 2. Human Task

**Compito principale:** ritrovare rapidamente contenuti professionali già acquisiti nella Conoscenza.

**Azione primaria:** cercare nella Conoscenza.

**Azione secondaria:** aggiungere un nuovo contenuto, esposta tramite divulgazione progressiva.

**Condizioni rilevanti:**

- i contenuti appartengono allo spazio docente corrente;
- l'originale deve restare preservato;
- risultati elaborati e candidati operativi non acquisiscono autorità senza conferma umana;
- errori di caricamento devono dichiarare ciò che resta sicuro e l'azione successiva possibile.

## 3. Esito sintetico

| Criterio | Esito | Evidenza sintetica |
|---|---|---|
| Task clarity | PASS | Ricerca resa dominante; acquisizione secondaria in `details` |
| Visual hierarchy | PASS | Intestazione, ricerca, acquisizione e recenti hanno gerarchia leggibile |
| Canonical reuse | PARTIAL | Uso consistente dei token principali, ma resta CSS locale con valori cromatici e misure ad hoc |
| Interaction states | PARTIAL | Focus globale presente; hover e feedback presenti; copertura sistematica loading/disabled/authority non esplicitata per tutti i controlli |
| Mobile behavior | PASS_STATIC | Breakpoint dedicato, ricerca a colonna singola, righe recenti adattate; verifica live ancora necessaria |
| Accessibility | PARTIAL | `focus-visible` globale e diversi `aria-label`; campo di ricerca principale affidato al placeholder; alcuni target locali sotto 44 px |
| Authority legibility | PASS | La pagina dichiara esplicitamente la conferma umana e preserva la distinzione tra fonte e azione operativa |
| Error/empty quality | PASS | Errori di caricamento descrivono fallimento, stato preservato e possibilità di riprovare; empty state non è trattato come errore |
| Visual debt | PARTIAL | Più fogli CSS locali per una stessa superficie; colori letterali e componenti locali ancora presenti |
| Intervention scope | LOCAL_REPAIR | Non emerge necessità di redesign della superficie |

## 4. Evidenze e rilievi

### 4.1 Task e gerarchia — PASS

La superficie mette `Cerca nella Conoscenza` prima di `Aggiungi un contenuto`. L'acquisizione è contenuta in un `details` e si apre automaticamente quando la libreria è vuota o quando deve essere mostrato un messaggio relativo al caricamento.

Questa organizzazione è coerente con il compito umano: consultare prima, acquisire quando necessario.

**Nessun redesign strutturale raccomandato.**

### 4.2 Linguaggio e sicurezza — PASS

Sono presenti tre rassicurazioni leggibili:

- originale preservato;
- provenienza leggibile;
- conferma umana per rendere operative azioni e scadenze.

I messaggi di errore principali sono già formulati in modo recuperabile. Esempio: un caricamento fallito dichiara che nessun contenuto è stato sostituito e invita a riprovare.

### 4.3 Accessibilità — PARTIAL

Aspetti conformi:

- `button`, `input` e `a` ricevono un `focus-visible` globale;
- i filtri hanno `aria-label` espliciti;
- l'acquisizione usa `details/summary`, quindi conserva una semantica nativa;
- è presente gestione `prefers-reduced-motion` globale.

Debito rilevato:

1. il campo principale `q` usa il placeholder come unica etichetta visibile/accessibile nel markup locale;
2. `.knowledgeCaptureForm button`, `.knowledgeSearch button` e `.knowledgeUploadForm>button` hanno `min-height:42px`;
3. `.primaryCandidateAction` e `.secondaryCandidateAction` hanno `min-height:38px`;
4. il contratto UI Engineering adotta 44 px come minimo tattile canonico.

**Intervento raccomandato:** correzione locale dei target e aggiunta di un'etichetta accessibile esplicita alla ricerca senza modificare l'anatomia della pagina.

### 4.4 Coerenza del sistema grafico — PARTIAL

La superficie usa correttamente molti token condivisi (`--surface`, `--line`, `--brand`, `--success`, `--danger`, raggi canonici), ma conserva valori letterali come:

- `#f0d9a8`;
- `#fff8e8`;
- `#76521a`;
- `#eef2f7`;
- `#8ab4ff`;
- `#f7faff`;
- `#fbfcfe`.

Non sono necessariamente difetti visivi, ma rappresentano **debito di convergenza**: un futuro intervento deve prima verificare se tali ruoli sono già coperti da token semantici canonici.

Non è autorizzata una sostituzione massiva dei colori in questa tranche.

### 4.5 Stati d'interazione — PARTIAL

Sono osservabili:

- `DEFAULT`;
- `HOVER` per più elementi;
- `FOCUS_VISIBLE` globale;
- `ERROR` tramite messaggistica e pillole;
- `SUCCESS` tramite token e stati elaborativi;
- `EMPTY` con messaggi dedicati;
- stati di elaborazione tramite `knowledgeProcessingStatus`.

Da verificare in una tranche runtime:

- `LOADING/IN_PROGRESS` durante ricerca, upload e rielaborazione;
- comportamento dei controlli durante submit multipli;
- rappresentazione di eventuali `DISABLED`;
- distinzione visuale e testuale di stati bloccati per autorità, se applicabili alle azioni della pagina di dettaglio.

Questi punti non autorizzano modifiche alla semantica delle azioni.

### 4.6 Mobile — PASS_STATIC

Il CSS prevede esplicitamente:

- passaggio della griglia principale a una colonna;
- ricerca con pulsante a larghezza piena;
- righe dei contenuti recenti ricomposte su due colonne logiche;
- metadati spostati su riga secondaria;
- riduzione controllata di padding e altezza dei contenuti;
- area inferiore compatibile con la navigazione mobile.

L'esito resta `PASS_STATIC`, non `PASS_LIVE`, finché la Beta non viene verificata in browser reale a viewport mobile.

## 5. Classificazione Human Interaction State Matrix

| Elemento | Visual | Task | Authority | Data | Esito |
|---|---|---|---|---|---|
| Ricerca | DEFAULT / FOCUS | AVAILABLE | ALLOWED | AVAILABLE | PASS |
| Nessun risultato | DEFAULT | AVAILABLE | ALLOWED | EMPTY | PASS |
| Aggiungi contenuto | DEFAULT / OPEN | AVAILABLE | ALLOWED | EMPTY/AVAILABLE | PASS |
| Feedback upload fallito | ERROR | RECOVERABLE_ERROR | ALLOWED | FAILED | PASS |
| Elaborazione asset | stato tramite pillola | IN_PROGRESS/COMPLETED | n/a | PROCESSING/VERIFIED-like | PARTIAL — verificare runtime |
| Azioni candidate nel dettaglio | variabile | REQUIRES_CONFIRMATION | ALLOWED_WITH_CONFIRMATION | PROVISIONAL | PARTIAL — audit dettaglio separato necessario |

## 6. Decisione di audit

**Classificazione:** `LOCAL_REPAIR`.

Non risultano elementi sufficienti per dichiarare `SURFACE_REDESIGN_CANDIDATE`.

Interventi ammessi nella tranche successiva:

1. portare i target interattivi locali rilevanti ad almeno 44 px;
2. aggiungere un'etichetta accessibile esplicita alla ricerca principale;
3. verificare la copertura loading/submit tramite test e browser;
4. registrare i valori cromatici locali candidati alla futura convergenza dei token, senza refactoring indiscriminato.

## 7. Gate ancora aperti

- `LIVE_BROWSER_DESKTOP`: NOT_RUN;
- `LIVE_BROWSER_MOBILE`: NOT_RUN;
- `INTERACTION_STATE_RUNTIME`: NOT_RUN;
- `HVA`: NOT_RUN.

Nessuno di questi gate può essere promosso dal presente audit statico.
