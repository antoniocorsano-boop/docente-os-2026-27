# DOCENTE OS — Human Task Content Pipeline

Status: IMPLEMENTATION CONTRACT / P1
Date: 2026-08-22

## Scopo

La pipeline Human Task Content serve a portare il modello da poche lezioni curate manualmente a un sistema scalabile, senza trasformare l'estrazione automatica in una nuova fonte canonica.

Catena target:

**Piano annuale canonico → documenti KB normalizzati → estrazione semantica → candidato Human Task → revisione umana → proiezione runtime approvata**

La pipeline non pubblica direttamente contenuti didattici nel runtime.

## 1. Autorità delle fonti

### Struttura del Piano annuale

L'autorità per:

- ordine dei blocchi;
- identificatore Bxx;
- UDA assegnata;
- pacchetto assegnato;
- periodo;
- durata del blocco;

è il modello runtime canonico `product/src/app/piano-annuale/model.ts`.

Motivazione: il documento `CAN-PLAN-1` presente nella KB è correttamente indicizzato, ma la sua rappresentazione normalizzata corrente è una sintesi per intervalli (es. B03-B06) e non contiene tutti i dettagli del documento Drive B01-B33. La pipeline non deve ricostruire dettagli assenti dalla copia normalizzata.

### Contenuto didattico

UDA e CAN-PACK correnti vengono letti dalla Knowledge Base usando:

- `knowledge_assets.current_generation_id`;
- solo asset `INDEXED`;
- `knowledge_documents.normalized_text` della generazione corrente;
- codice canonico ricavato dal nome sorgente.

Una sorgente assente, ambigua, non indicizzata o senza testo normalizzato non viene sostituita da ipotesi.

## 2. Source discovery fail-closed

`SupabaseHumanTaskContentSourceRepository` cerca una sola sorgente corrente per codice canonico, ad esempio:

- `CAN-UDA-1-01`;
- `CAN-PACK-1A`.

Se non esiste una sorgente esatta, restituisce `null`.

Se più asset correnti corrispondono allo stesso codice, la lettura fallisce come ambigua invece di scegliere silenziosamente il più recente.

## 3. Estrazione semantica

### UDA

La pipeline estrae in modo deterministico:

- codice e titolo;
- durata prevista quando esplicita;
- articolazione `Ora N — titolo`;
- contenuto associato a ciascuna ora.

Non deduce tempi o sotto-attività non scritti nella fonte.

### CAN-PACK

Il pacchetto viene segmentato secondo le sezioni reali e tipizzato in:

- `TEACHER_GUIDE`;
- `STUDENT_SHEET`;
- `OBSERVATION_TOOL`;
- `TASK_BRIEF`;
- `RUBRIC`;
- `CHECKLIST`;
- `ADAPTATION_GUIDANCE`;
- `OTHER`.

Quando disponibili vengono estratti durata, obiettivo e liste operative.

## 4. Candidato per blocco

Per un blocco Bxx la pipeline produce un `HumanTaskContentCandidate` che contiene:

- metadati canonici del blocco dal Piano annuale runtime;
- generazioni esatte di UDA e pacchetto usate;
- UDA estratta;
- sezioni del pacchetto estratte;
- eventuale finestra di ore UDA associabile meccanicamente;
- ranking indicativo delle sezioni del pacchetto semanticamente più vicine;
- issue e gate.

Il ranking non è una decisione didattica: serve a ridurre il lavoro di revisione.

## 5. Regola sulla finestra UDA

Una finestra oraria viene assegnata automaticamente solo quando:

1. il blocco appartiene a un segmento contiguo del Piano;
2. la durata della UDA coincide esattamente con le ore del segmento;
3. la UDA contiene una voce `Ora N` per ogni ora dichiarata.

In tal caso la pipeline può proporre, per esempio su UDA 1-01:

- B03 → ore 1-2;
- B04 → ore 3-4;
- B05 → ore 5-6;
- B06 → ore 7-8.

Questa assegnazione resta una proposta meccanica. Le precedenti analisi hanno mostrato che una composizione semanticamente migliore può raccordare sezioni non consecutive. Per questo motivo il candidato richiede comunque revisione umana.

Se le condizioni non sono soddisfatte, viene emesso `UDA_HOUR_WINDOW_AMBIGUOUS` e nessuna finestra viene inventata.

## 6. Gate

Stati ammessi:

### `BLOCKED`

Almeno una condizione strutturale manca:

- blocco inesistente;
- UDA assente o con codice errato;
- pacchetto assente o con codice errato;
- UDA non estraibile;
- pacchetto non estraibile.

### `READY_FOR_HUMAN_REVIEW`

Le evidenze minime sono disponibili per preparare una proposta.

Anche in questo stato:

`promotion = HUMAN_REVIEW_REQUIRED`

Non esiste in P1 uno stato `AUTO_APPROVED`.

## 7. Vincolo Human Task

L'automazione deve ridurre lavoro meccanico, non sostituire decisioni professionali invisibilmente.

Un agente futuro può:

1. leggere il candidato;
2. proporre una ricomposizione;
3. indicare esattamente quali evidenze usa;
4. produrre una diff rispetto alla proiezione precedente.

La promozione al runtime deve passare un gate umano o un artefatto di approvazione esplicito.

## 8. Prestazioni

La pipeline non viene eseguita durante ogni apertura di una lezione.

Le viste in classe devono continuare a leggere proiezioni già approvate e leggere, evitando 2-3 round trip KB aggiuntivi nel percorso ad alta frequenza `Orario → Classe → Lezione`.

La compilazione è un'attività di preparazione/ingestion/revisione, non una dipendenza del rendering quotidiano.

## 9. Stato P1 verificato

Nel database corrente risultano indicizzate e con generazione attiva:

- `CAN-PLAN-1`;
- `CAN-UDA-1-01`;
- `CAN-PACK-1A`.

UDA 1-01 e CAN-PACK-1A conservano testo normalizzato completo utile all'estrazione. `CAN-PLAN-1` è una sintesi per intervalli; per questo il Piano runtime resta l'autorità strutturale.

## 10. Passo successivo

P2 dovrà aggiungere il **Projection Recipe**:

- selezione esplicita di ore UDA e sezioni PACK;
- mapping risorsa → superficie (`PREPARE`, step specifico, `OBSERVE`);
- motivazione `DIRECT/COMPOSED`;
- validazione contro le evidenze del candidato;
- generazione di una proiezione pronta per review;
- nessuna promozione automatica.
