# DOCENTE OS — K3B Semantic Retrieval Decision

Data: 2026-09-15  
Stato: **COMPLETE / PROVIDER_NOT_ACTIVATED**  
Issue: #423 — CLOSED/COMPLETED  
Implementazione: PR #424 + hardening PR #425

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
- `knowledge_units`: **1.094** complessive al momento della decisione;
- asset `INDEXED`: **119**;
- RLS su asset/documenti/unità: attiva e basata su membership del workspace;
- current generation: già modellata e usata da K3A.

Dopo l'implementazione K3B è stato verificato inoltre che:

- pgvector **0.8.2** è installato nello schema `extensions`;
- `knowledge_embedding_profiles` e `knowledge_unit_embeddings` hanno RLS attiva;
- la tabella dei vettori non concede accesso diretto ad `anon` o `authenticated`;
- esiste una policy deny-all esplicita per `authenticated` sulla tabella dei vettori;
- gli indici FK `generation_id` e `profile_id` richiesti dagli advisor sono presenti;
- le RPC semantiche sono accessibili solo ad utenti autenticati, verificano membership workspace e non restituiscono vettori memorizzati;
- profili `ACTIVE`: **0**;
- embedding persistiti al momento della chiusura K3B: **0**.

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

La selezione dei candidati provider/modello è ora governata da K3C e documentata in `COPILOT_KERNEL_K3C_EVAL_DECISION.md`. Nessun candidato diventa una dipendenza o un profilo `ACTIVE` per sola preferenza architetturale o benchmark pubblico.

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

Le due RPC semantiche restano intenzionalmente `SECURITY DEFINER`: questo evita di concedere accesso diretto ai raw embeddings al ruolo autenticato. La scelta è documentata nello schema ed è subordinata ai controlli `auth.uid()` + membership workspace.

## 8. Semantic availability

L'esistenza di pgvector o di alcuni embedding non equivale a `semanticAvailable=true`.

Per attivare il canale semantico in K3C sono obbligatori tutti i gate seguenti:

- esiste un profilo `ACTIVE`;
- query provider configurato per esattamente quel profilo/revisione/dimensione;
- provider-policy approvata per la classificazione privacy corrente;
- copertura del corpus corrente = **100% delle unità eleggibili** per il workspace;
- stale-generation leakage = 0;
- workspace leakage = 0;
- filter violations = 0;
- benchmark italiano hybrid supera le soglie versionate di K3C;
- performance p95 entro la baseline.

Una copertura parziale può essere osservata e dichiarata come `PARTIAL`, ma non autorizza il profilo come pienamente disponibile.

## 9. Eval K3C obbligatorie

Il contratto K3C richiede prima del primo profilo `ACTIVE`:

- almeno 30 query curate in italiano e human-verified;
- lo stesso `evaluationSetId` per baseline e candidato;
- oracle umano con unità rilevanti attese;
- confronto `FULL_TEXT` vs `SEMANTIC` vs `HYBRID`;
- metriche minime: Recall@5, MRR@10, nDCG@10;
- sottoinsieme `VERIFIED` misurato separatamente;
- test avversari per workspace, generazioni obsolete e filtri professionali;
- p50/p95 latency e costo/compute tracciati senza loggare contenuto grezzo;
- privacy gate separato dalla qualità del ranking.

L'hybrid diventa canonico soltanto se supera le soglie di K3C senza violare alcun hard gate di isolamento o privacy.

Decisione K3C: `COPILOT_KERNEL_K3C_EVAL_DECISION.md`.

## 10. Stato dopo K3B

K3A: full-text governato e RRF provider-neutral — **COMPLETE**.  
K3B: semantic storage/search foundation — **COMPLETE**, issue #423 chiusa; PR #424 + #425; evidence runtime acquisita.  
K3C: provider selection + corpus eval + hybrid activation — **IN PROGRESS**, issue #426; contratto eval/privacy integrato con PR #427.  
Provider `ACTIVE` — **NONE**.
