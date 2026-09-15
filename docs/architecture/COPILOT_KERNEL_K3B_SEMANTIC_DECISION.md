# DOCENTE OS — K3B Semantic Retrieval Decision

Data: 2026-09-15  
Stato: **APPROVED_FOR_IMPLEMENTATION / PROVIDER_NOT_ACTIVATED**  
Issue: #423

## 1. Decisione

K3B introduce la **fondazione di storage e ricerca semantica** senza attivare un provider di embedding.

La scelta canonica è:

1. PostgreSQL + pgvector come storage vettoriale interno alla stessa boundary Supabase della Knowledge Base;
2. embedding separati dalle `knowledge_units`, versionati tramite `profile_id`;
3. **exact cosine search** come prima implementazione;
4. un solo profilo `ACTIVE` alla volta, con profili aggiuntivi ammessi in `EVALUATION` per benchmark e migrazioni controllate;
5. nessuna esposizione diretta dei vettori a client autenticati;
6. semantic retrieval fail-closed finché profilo, copertura, privacy policy e provider runtime non sono tutti verificati;
7. hybrid ranking tramite il contratto RRF già introdotto in K3A, non mediante una nuova autorità di ranking del provider.

## 2. Evidenza locale verificata

Sulla Beta Supabase di DOCENTE OS, al momento della decisione:

- PostgreSQL: 17;
- pgvector disponibile: 0.8.2;
- pgvector installato prima di K3B: **no**;
- `knowledge_units`: **1.094**;
- asset `INDEXED`: **119**;
- RLS su asset/documenti/unità: attiva e basata su membership del workspace;
- current generation: già modellata e usata da K3A.

Con questo volume, un indice ANN aggiungerebbe complessità senza un beneficio dimostrato. L'exact search mantiene recall perfetto e rende più semplice verificare workspace, generazione e filtri prima dell'ordinamento vettoriale.

## 3. Perché non HNSW ora

pgvector documenta che la ricerca esatta è il comportamento predefinito e fornisce perfect recall; HNSW e IVFFlat sono indici approssimati che scambiano recall con velocità. HNSW offre in genere un miglior trade-off speed/recall di IVFFlat, ma richiede più memoria e build più costose.

Inoltre, con filtri e multitenancy, l'ANN richiede particolare attenzione: il filtraggio può interagire con la quantità di candidati visitati e ridurre il numero di risultati utili. DOCENTE OS applica invece workspace, current generation e filtri professionali come vincoli di correttezza, non come ottimizzazioni opzionali.

Riferimento primario:

- https://github.com/pgvector/pgvector

### Gate per introdurre HNSW

HNSW potrà essere introdotto solo se un benchmark sul corpus Beta/Production dimostra contemporaneamente:

- p95 della ricerca exact sopra la soglia operativa definita dal Performance Baseline Gate;
- corpus sufficientemente cresciuto da rendere l'ANN materialmente vantaggioso;
- recall@K dell'indice ANN entro la soglia approvata rispetto all'exact search usata come oracle;
- nessuna regressione di workspace/current-generation/filter correctness;
- piano di indice coerente con la strategia multi-workspace.

Fino ad allora **nessun indice HNSW/IVFFlat è canonico**.

## 4. Perché gli embedding sono una tabella separata

Aggiungere una singola colonna `embedding` a `knowledge_units` accoppierebbe la KB a un modello e a una dimensionalità. La tabella `knowledge_unit_embeddings` permette invece:

- upgrade di modello senza alterare le unità canoniche;
- dual-run tra profili durante le eval;
- rigenerazione indipendente;
- verifica esplicita di `generation_id`;
- rimozione di profili obsoleti;
- mantenimento del testo e della provenienza come fonte autorevole.

Il vettore è quindi un **indice derivato**, non una fonte.

## 5. Profilo embedding canonico

`knowledge_embedding_profiles` registra almeno:

- provider;
- model;
- model revision;
- dimensions;
- distance metric;
- language scope;
- policy reference;
- status `EVALUATION | ACTIVE | RETIRED`.

Il profilo è immutabile nei campi che determinano la semantica del vettore. Solo lo stato può avanzare; un profilo `RETIRED` non può essere riattivato.

Sono accettati soltanto scope linguistici `ITALIAN` o `MULTILINGUAL`. Un modello documentato come English-only non può quindi diventare profilo canonico.

## 6. Provider: scelta rinviata deliberatamente

K3B **non sceglie automaticamente un provider esterno**.

La documentazione Supabase descrive il built-in `gte-small` come modello rivolto esclusivamente a testi inglesi e con troncamento dei testi lunghi. Per una Knowledge Base prevalentemente italiana non soddisfa il requisito linguistico canonico e viene escluso come default.

Riferimenti Supabase:

- https://supabase.com/docs/guides/ai/quickstarts/generate-text-embeddings
- https://supabase.com/docs/guides/ai/semantic-search
- https://supabase.com/docs/guides/database/extensions/pgvector

OpenAI `text-embedding-3-small` resta un candidato per K3C, non una dipendenza K3B. Prima dell'attivazione dovranno essere verificati almeno data policy, retention applicabile, eventuale Zero Data Retention, regione di trattamento e compatibilità con la classificazione privacy del payload.

Riferimenti OpenAI:

- https://platform.openai.com/docs/guides/embeddings
- https://platform.openai.com/docs/pricing
- https://platform.openai.com/docs/models/how-we-use-your-data
- https://platform.openai.com/docs/guides/your-data

Un modello locale/multilingue resta un'alternativa valida e dovrà competere sulle stesse eval, non per preferenza architetturale.

## 7. Boundary di sicurezza

La tabella dei vettori:

- ha RLS attiva;
- non concede accesso diretto ad `authenticated` o `anon`;
- è scrivibile dal solo processing boundary (`service_role`);
- calcola server-side l'hash del contenuto della unità;
- rifiuta mismatch tra workspace, generazione, unità, profilo e dimensione.

La ricerca passa da `search_knowledge_semantic_exact`:

- richiede utente autenticato e membership del workspace;
- accetta soltanto un profilo `ACTIVE`;
- richiede dimensionalità coerente;
- esclude unità `REJECTED`;
- richiede `asset.current_generation_id = document.generation_id`;
- applica anno/categoria/disciplina/classe/affidabilità **prima** del ranking;
- restituisce soltanto identificativi, generation e distanza/rank, mai il vettore.

## 8. Semantic availability

L'esistenza di pgvector o di alcuni embedding non equivale a `semanticAvailable=true`.

Per attivare il canale semantico in K3C saranno obbligatori tutti i gate seguenti:

- esiste un profilo `ACTIVE`;
- query provider configurato per esattamente quel profilo/revisione/dimensione;
- provider-policy approvata per la classificazione privacy corrente;
- copertura del corpus corrente = **100% delle unità eleggibili** per il workspace, oppure risposta esplicitamente `PARTIAL` e canale non dichiarato pienamente disponibile;
- stale-generation leakage = 0;
- workspace leakage = 0;
- benchmark italiano hybrid supera o eguaglia le soglie di qualità definite sotto;
- performance p95 entro la baseline.

## 9. Eval K3C obbligatorie

Prima del primo `ACTIVE` profile:

- almeno 30 query reali/curate in italiano, distribuite tra classi, didattica, circolari e documenti operativi;
- oracle umano con unità rilevanti attese;
- confronto `FULL_TEXT` vs `SEMANTIC` vs `HYBRID`;
- metriche minime: Recall@5, MRR@10, nDCG@10;
- regressioni exact-term separate dalle query concettuali;
- test avversari per workspace e generazioni obsolete;
- tracciamento del costo per 1.000 unità e per 100 query senza loggare contenuto grezzo.

L'hybrid diventa canonico solo se migliora la qualità complessiva senza peggiorare materialmente le query esatte.

## 10. Stato dopo K3B

K3A: full-text governato e RRF provider-neutral — **COMPLETE**.  
K3B: semantic storage/search foundation — **IN PROGRESS fino a migrazione ed evidence runtime**.  
K3C: provider selection + real corpus embeddings + hybrid eval — **NOT STARTED / NOT AUTHORIZED UNTIL K3B PASS**.
