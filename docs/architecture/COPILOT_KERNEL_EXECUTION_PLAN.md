# DOCENTE OS — Copilot Kernel Execution Plan

Data: 2026-09-15  
Stato: ACTIVE  
Spec: `COPILOT_KERNEL_CANONICAL_SPEC.md`  
Issue: #415

## Obiettivo di prodotto

Portare DOCENTE OS da una serie di assistenti verticali a un unico copilota professionale capace di:

- comprendere la superficie e l'oggetto corrente;
- distinguere dati strutturati, documenti, inferenze e autorità;
- scoprire progressivamente le skill pertinenti;
- recuperare solo il contesto necessario;
- proporre senza confondere pianificato, eseguito e inferito;
- eseguire write solo attraverso capability applicative governate;
- lasciare trace/evidence verificabili senza salvare chain-of-thought.

## Baseline corrente

Già disponibili nel prodotto:

- `AssistantContext` e action-kind canonici;
- assistant-ui come experience layer;
- Planner Assistant;
- Lesson Copilot;
- Knowledge Assistant;
- `HomeDailyContext` con autorità `IN_FORCE / PROVISIONAL_DRAFT / NONE / AMBIGUOUS`;
- `TeacherMomentCopilotContext`;
- Temporal Projection;
- Lesson Brief;
- Teaching Session;
- KB Generations;
- curriculum authority;
- human-in-the-loop per write Planner.

Il Kernel è fondato; K1/K2/K3A/K3B sono integrate. Il lavoro corrente è K3C: costruire un benchmark italiano human-verified, confrontare retrieval lessicale/semantico/hybrid e autorizzare un provider solo dopo quality + privacy gate.

## Programma incrementale

### K0 — Kernel foundation

**Stato:** COMPLETE — PR #416.

Deliverable:

- contratti `CopilotRunContext`;
- catalogo resource kind;
- catalogo skill iniziale;
- progressive discovery;
- gestione `READY / PARTIAL / BLOCKED`;
- test unitari;
- nessuna UI e nessuna write.

Gate:

- Product CI;
- typecheck;
- lint;
- build;
- nessuna dipendenza provider/framework nel core.

### K1 — Today Context

**Stato:** COMPLETE — PR #418.

Obiettivo: la superficie `Oggi` deve conoscere la giornata reale, non soltanto il Planner.

Input:

- `HomeDailyContext`;
- Temporal Projection;
- Planner;
- sessioni/registrazioni quando necessarie.

Output minimo:

- lezioni di oggi;
- lezione corrente/prossima;
- registrazioni pendenti;
- attività Planner separate;
- authority temporale esplicita;
- missing/ambiguity espliciti.

Acceptance acquisita:

- Planner vuoto + lezioni presenti non produce `giornata vuota`;
- orario ambiguo non viene risolto per inferenza;
- orario provvisorio viene dichiarato;
- nessuna write.

### K2 — Next Lesson Preparation

**Stato:** COMPLETE — PR #420.

Obiettivo: rispondere in modo completo a `cosa preparo per la prossima lezione?`.

Input:

- next lesson da K1;
- class context;
- Lesson Brief;
- materiali già pronti;
- Piano annuale;
- curriculum authority;
- KB solo quando serve.

Acceptance acquisita:

- nessuna invenzione se il brief manca;
- materiali già pronti distinti da suggerimenti;
- Piano e curriculum usati con autorità corretta;
- evidence refs disponibili.

### K3 — Knowledge Retrieval

**Stato:** IN PROGRESS — K3A/K3B complete, K3C in corso.

Obiettivo: rendere la KB interrogabile dal Kernel con retrieval governato, senza trasformare indiscriminatamente tutto in embedding e senza delegare autorità al provider.

Baseline:

- filtri SQL/metadati;
- full-text;
- vector search;
- hybrid ranking;
- current generation obbligatoria;
- authority/freshness/privacy filter.

#### K3A — Governed full-text retrieval

**Stato:** COMPLETE — PR #422.

Acquisiti:

- contratto provider-neutral `KnowledgeRetrievalPort`;
- filtri workspace/anno/categoria/disciplina/classe/affidabilità;
- current generation fail-closed;
- provenance fino a fonte originale;
- full-text italiano;
- RRF deterministico e contratto multi-canale;
- `SEMANTIC` esplicitamente non disponibile in assenza di un canale reale.

#### K3B — Semantic storage/search foundation

**Stato:** COMPLETE — issue #423 CLOSED/COMPLETED; PR #424 + hardening #425.

Decisione canonica: `COPILOT_KERNEL_K3B_SEMANTIC_DECISION.md`.

Acquisiti e verificati:

- pgvector 0.8.2 nella boundary Supabase;
- profili embedding versionati e provider-neutral;
- embedding separati dalla KB canonica;
- exact cosine search come prima strategia;
- workspace/current-generation/filter enforcement prima del ranking;
- vettori non esposti direttamente ai client;
- readiness semantica fail-closed;
- RLS/ACL e indici FK verificati dopo DDL;
- restore rehearsal compatibile con pgvector;
- nessun provider esterno attivato e nessun profilo `ACTIVE` creato.

#### K3C — Provider + corpus eval + hybrid activation

**Stato:** IN PROGRESS — issue #426; contratto eval/privacy integrato con PR #427.

Decisione canonica: `COPILOT_KERNEL_K3C_EVAL_DECISION.md`.

Fondazione già acquisita:

- metriche provider-neutral Recall@5, MRR@10, nDCG@10 e subset `VERIFIED`;
- p50/p95 latency;
- `evaluationSetId` obbligatorio per confronti realmente comparabili;
- almeno 30 query human-verified prima dell'attivazione;
- current-generation coverage = 100%;
- workspace/stale-generation/filter violations = 0 come hard gate;
- provider-policy = `PASS` come gate indipendente dalla qualità;
- corpus reale non trasferibile a provider esterni senza approvazione specifica;
- nessun ANN e nessun provider `ACTIVE` in questa fase.

Passi ancora richiesti:

- costruire e validare il gold set italiano senza dati personali nel repository;
- misurare baseline `FULL_TEXT` sullo stesso evaluation set;
- misurare almeno il baseline locale e un candidato API su contenuti sanitizzati/non personali;
- confrontare `FULL_TEXT` vs `SEMANTIC` vs `HYBRID`;
- registrare qualità, latenza, costo/compute, dimensione storage e provider-policy receipt;
- attivare un profilo solo se tutte le soglie K3C sono soddisfatte.

Acceptance K3 complessiva:

- nessun chunk da generazioni obsolete quando esiste current generation;
- workspace/anno/classe/discipline rispettati;
- fonte originale sempre raggiungibile;
- risultati con provenance;
- semantic/hybrid dichiarati disponibili solo dopo gate reali.

### K4 — Unified Copilot

Obiettivo: eliminare la frammentazione runtime.

Migrazione:

- Planner → skill;
- Lesson → skill;
- Knowledge → skill;
- Today → skill;
- Class/Plan/System → skill.

assistant-ui rimane UI/runtime layer; il registry del Kernel decide quali skill/toolkit esporre.

Acceptance:

- un solo entry point logico del copilota;
- progressive skill/tool exposure;
- nessun mega-prompt;
- fallback deterministico in assenza del provider.

### K5 — Governed Writes

Obiettivo: ampliare capability operative senza ridurre il controllo umano.

Pattern:

```text
skill PROPOSE
→ structured proposal
→ preview
→ policy check
→ human confirmation
→ application command
→ receipt / evidence
```

Prima tranche:

- Planner task;
- nota/diario reversibile;
- draft interno.

Write esterne e decisioni istituzionali restano dietro gate dedicato.

### K6 — Interoperability / advanced agentic layer

Valutare solo con casi d'uso misurabili:

- MCP server DOCENTE OS;
- AG-UI/CopilotKit per run lunghi e shared state;
- AI SDK / OpenAI Agents adapter;
- GraphRAG per domande relazionali multi-documento;
- sub-agent soltanto se riducono errori o costi rispetto al Kernel singolo.

## Registro skill previsto

### Oggi / Tempo

- TODAY_OVERVIEW
- NEXT_LESSON_PREPARATION
- PENDING_LESSON_REGISTRATION
- FUTURE_DAY_OVERVIEW
- SCHEDULE_CONFLICT_EXPLAIN

### Planner / Agenda

- PLANNER_PRIORITIZE
- PLANNER_EXPLAIN_TASK
- PLANNER_PROPOSE_TASK
- PLANNER_RESCHEDULE_PREVIEW
- DEADLINE_OVERVIEW

### Classe / Lezione

- CLASS_STATUS_OVERVIEW
- LESSON_CONTEXT_EXPLAIN
- LESSON_PREPARATION
- LESSON_REFLECTION
- LESSON_MATERIAL_DISCOVERY
- LESSON_CONTINUITY_EXPLAIN

### Piano / Progettazione

- ANNUAL_PLAN_PROGRESS
- PLAN_DEVIATION_EXPLAIN
- DESIGN_UDA_PROPOSAL
- DESIGN_ACTIVITY_PROPOSAL
- EVIDENCE_ALIGNMENT_REVIEW

### Curriculum

- CURRICULUM_AUTHORITY_CHECK
- CURRICULUM_APPLICABILITY_EXPLAIN
- CML_ALIGNMENT_REVIEW

### Knowledge

- KNOWLEDGE_EXPLAIN
- KNOWLEDGE_FIND_RELEVANT
- KNOWLEDGE_COMPARE_SOURCES
- KNOWLEDGE_FIND_DEADLINES
- KNOWLEDGE_FIND_ACTIONS
- KNOWLEDGE_SOURCE_TRACE

### Comunicazioni

- SCHOOL_COMMUNICATION_IMPACT
- COMMUNICATION_DEADLINE_REVIEW
- COMMUNICATION_CLASS_RELEVANCE

### Libri / Risorse

- TEXTBOOK_RESOURCE_DISCOVERY
- PUBLISHER_RESOURCE_DISCOVERY

### Sistema

- SYSTEM_HELP
- SYSTEM_CAPABILITY_EXPLAIN
- SYSTEM_NAVIGATION_HELP

Le skill non vengono implementate tutte insieme. Il catalogo descrive il dominio obiettivo; ogni skill diventa `ACTIVE` soltanto quando possiede risorse, capability, test ed eval.

## Registro conoscenze previsto

Il Resource Registry deve poter descrivere, senza necessariamente caricare il payload:

- workspace;
- anno scolastico;
- calendario;
- orario;
- giornata;
- Planner;
- class registry;
- class context;
- Piano annuale;
- lesson brief;
- session history;
- evidenze;
- curriculum authority;
- KB current generation;
- comunicazioni;
- libri/adozioni;
- risorse editore;
- Drive autorizzato;
- capability del prodotto.

## Regole di sviluppo

1. Una slice modifica al massimo un livello architetturale principale.
2. Prima read/propose, poi write.
3. Prima read model deterministici, poi retrieval semantico.
4. Una skill senza eval non diventa canonica.
5. Una risorsa ambigua non viene risolta dal modello.
6. Un tool non espone repository/provider raw.
7. Il provider non decide autorizzazioni.
8. Nessuna migrazione big-bang degli assistenti correnti.

## Stato di avanzamento

| Incremento | Stato | Evidenza |
|---|---|---|
| K0 Kernel foundation | COMPLETE | PR #416 |
| K1 Today Context | COMPLETE | PR #418 |
| K2 Next Lesson | COMPLETE | PR #420 |
| K3A Governed full-text | COMPLETE | PR #422 |
| K3B Semantic foundation | COMPLETE | issue #423 + PR #424/#425 + runtime evidence |
| K3C Provider + hybrid eval | IN PROGRESS | issue #426 + PR #427 + `COPILOT_KERNEL_K3C_EVAL_DECISION.md` |
| K4 Unified Copilot | NOT STARTED | dipende da K3 |
| K5 Governed Writes | NOT STARTED | dipende da K4 |
| K6 Interoperability | NOT AUTHORIZED | richiede evidenza di necessità |

## Prossimo gate

Costruire il **gold set italiano K3C** e renderlo verificabile senza pubblicare contenuti personali:

`query set human-verified → baseline FULL_TEXT → baseline LOCAL → almeno un candidato API su contenuti sanitizzati → SEMANTIC/HYBRID eval sullo stesso evaluationSetId → privacy/provider receipt → activation gate`

Finché questa catena non è PASS, `semanticAvailable` resta false e non viene creato alcun profilo `ACTIVE`.
