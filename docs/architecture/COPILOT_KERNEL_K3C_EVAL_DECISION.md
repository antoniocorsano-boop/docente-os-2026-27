# DOCENTE OS — K3C Provider & Evaluation Decision

Data: 2026-09-15  
Stato: **AUTHORIZED_FOR_EVALUATION / NO_PROVIDER_ACTIVE**  
Issue: #426

## 1. Decisione

K3C non sceglie un provider sulla base di benchmark pubblici o di una scheda tecnica. Introduce prima un **contratto di valutazione riproducibile** e rende l'attivazione di un profilo embedding subordinata a qualità, privacy, copertura, latenza e isolamento.

La decisione operativa è:

1. mantenere `EXACT_COSINE` come oracle mentre il corpus resta piccolo;
2. confrontare `FULL_TEXT`, `SEMANTIC` e `HYBRID` sulle stesse query e sullo stesso gold set;
3. richiedere almeno 30 query human-verified in italiano;
4. vietare l'uso di contenuti reali con provider esterni finché non esiste un `provider-policy PASS` e una specifica approvazione al trasferimento del corpus reale;
5. usare un corpus sanitizzato/non personale per confrontare provider API prima del privacy gate;
6. non creare alcun profilo `ACTIVE` in questa slice di fondazione eval.

## 2. Evidenza locale verificata

La Beta corrente contiene:

- 119 asset `INDEXED`;
- 564 unità della generazione corrente non `REJECTED`;
- categorie correnti: UDA, programmazioni, risorse didattiche e assessment;
- 2 discipline e 7 etichette di classe;
- pgvector 0.8.2 installato;
- zero profili embedding `ACTIVE`;
- zero embedding persistiti al momento della fondazione K3B.

Il volume non giustifica ANN. La priorità è quindi verificare **retrieval quality e governance**, non ottimizzare prematuramente l'indice.

## 3. Candidati ammessi

### A. Local baseline — `intfloat/multilingual-e5-small`

Riferimento primario:

- https://huggingface.co/intfloat/multilingual-e5-small

Caratteristiche documentate utili a K3C:

- licenza MIT;
- 94 lingue;
- 384 dimensioni;
- encoder XLM-R;
- massimo posizionale 512 token;
- pesi safetensors circa 471 MB.

Ruolo: **privacy-first baseline**. Il vantaggio è evitare il trasferimento del testo a un provider esterno; lo svantaggio da verificare è la sostenibilità CPU/RAM/latency nell'infrastruttura reale di DOCENTE OS.

### B. OpenAI — `text-embedding-3-large`

Riferimenti primari:

- https://developers.openai.com/api/docs/models/text-embedding-3-large
- https://openai.com/business-data/
- https://platform.openai.com/docs/models/default-usage-policies-by-endpoint

Caratteristiche rilevanti:

- modello dichiarato per task inglesi e non inglesi;
- fino a 3072 dimensioni;
- prezzo documentato: 0,13 USD / 1M token;
- dati API non usati per training per impostazione predefinita;
- retention ordinaria dei dati API fino a 30 giorni, con Zero Data Retention disponibile solo per casi/account idonei.

Ruolo: candidato API di qualità. **Non è autorizzato sul corpus reale** fino alla verifica della configurazione privacy applicabile a questo progetto.

### C. Voyage — `voyage-4`

Riferimenti primari:

- https://docs.voyageai.com/docs/embeddings
- https://docs.voyageai.com/docs/pricing
- https://docs.voyageai.com/docs/faq

Caratteristiche rilevanti:

- general-purpose e multilingual retrieval;
- contesto fino a 32k token;
- 1024 dimensioni di default, con dimensioni alternative;
- prezzo documentato: 0,06 USD / 1M token;
- opt-out documentato per gli endpoint hosted con zero-day retention dei dati.

Ruolo: candidato API orientato al retrieval. Prima del corpus reale vanno comunque verificati contratto, DPA/subprocessor e idoneità per dati scolastici.

### D. Cohere — `embed-v4.0`

Riferimenti primari:

- https://docs.cohere.com/docs/embeddings
- https://cohere.com/enterprise-data-commitments

Caratteristiche rilevanti:

- oltre 100 lingue;
- dimensione configurabile;
- SaaS enterprise: retention ordinaria di prompt/generazioni pari a 30 giorni;
- ZDR disponibile previa approvazione;
- DPA raccomandato dal provider quando vengono trattati dati personali.

Ruolo: candidato di confronto. Non viene assunto come default.

## 4. Perché non scegliamo subito il provider con il benchmark pubblico migliore

I benchmark pubblici non rappresentano necessariamente:

- lessico e struttura dei documenti scolastici italiani;
- query brevi del docente;
- differenza tra fonte `VERIFIED` e `AUTO`;
- filtri per classe/disciplina/anno;
- costo di rigenerazione delle current generations;
- privacy e retention del payload;
- latenza reale dalla regione dell'applicazione.

Il provider vincente deve quindi essere quello che supera **le eval DOCENTE OS**, non quello con il punteggio marketing più alto.

## 5. Gold set

Il gold set canonico deve:

- contenere almeno 30 query italiane;
- essere human-verified;
- coprire query lessicali esatte e concettuali;
- essere stratificato per categoria, disciplina, classe e affidabilità;
- avere una lista esplicita di `relevantUnitIds`;
- non includere dati personali nel repository;
- poter essere eseguito identicamente contro FULL_TEXT, SEMANTIC e HYBRID.

Il repository può contenere fixture sanificate e identificativi tecnici. Il contenuto reale del corpus non diventa una fixture pubblica.

## 6. Metriche canoniche

K3C misura almeno:

- Recall@5;
- MRR@10;
- nDCG@10;
- Recall@5 sul sottoinsieme `VERIFIED`;
- p50 e p95 latency;
- workspace leakage count;
- stale-generation leakage count;
- filter violation count.

Le metriche di qualità non possono compensare una violazione di isolamento: un solo leakage rende il gate FAIL.

## 7. Soglia di attivazione iniziale

Un candidato HYBRID può essere proposto per `ACTIVE` soltanto se:

- provider-policy = `PASS`;
- current-generation coverage = 100%;
- almeno 30/30 query sono human-verified;
- Recall@5 migliora di almeno **+0,05 assoluto** rispetto al baseline FULL_TEXT;
- nDCG@10 migliora di almeno **+0,03 assoluto**;
- Recall@5 sul sottoinsieme VERIFIED non regredisce oltre **0,02 assoluto**;
- p95 retrieval server-side <= **500 ms**, esclusa la generazione della risposta;
- workspace leakage = 0;
- stale-generation leakage = 0;
- filter violations = 0.

Le soglie sono versionate e potranno essere cambiate solo con nuova evidence, non per far passare retroattivamente un provider.

## 8. Privacy gate

Per l'invio a un provider esterno valgono due livelli distinti:

### Benchmark sanitizzato

Consentito solo se:

- data class = `SANITIZED_NON_PERSONAL`;
- provider-policy = `PASS`.

### Corpus reale

Consentito solo se:

- provider-policy = `PASS`;
- esiste approvazione esplicita `realCorpusTransferApproved`;
- retention/DPA/subprocessor/regione sono stati verificati per il caso d'uso;
- la decisione è registrata nel `policyRef` del profilo.

In assenza di queste condizioni il sistema deve fallire chiuso.

## 9. ANN resta fuori perimetro

K3C non introduce HNSW/IVFFlat. Exact search resta oracle finché:

- p95 exact non supera la baseline operativa sul corpus reale, oppure
- un benchmark di crescita >=10x dimostra un vantaggio materiale dell'ANN,

sempre con recall misurata contro exact search e nessuna regressione di filtri/isolamento.

## 10. Stato dopo questa decisione

K3A — COMPLETE.  
K3B — COMPLETE.  
K3C — **IN PROGRESS: evaluation contract + gold set + provider benchmark**.  
Provider ACTIVE — **NONE**.
