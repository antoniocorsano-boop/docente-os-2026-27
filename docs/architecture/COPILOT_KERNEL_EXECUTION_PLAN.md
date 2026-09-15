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

Gap principale: questi asset non confluiscono ancora in un unico Kernel di contesto/skill/capability.

## Programma incrementale

### K0 — Kernel foundation

**Stato:** IN PROGRESS in `feat/copilot-kernel-k0`.

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

Modifiche previste:

- builder reale di `CopilotRunContext` per `TODAY`;
- endpoint read-only del Kernel;
- adapter temporaneo verso `ContextualAssistantPanel`;
- `PlannerAssistant` non più autorità della superficie Oggi.

Acceptance:

- Planner vuoto + lezioni presenti non produce `giornata vuota`;
- orario ambiguo non viene risolto per inferenza;
- orario provvisorio viene dichiarato;
- nessuna write.

### K2 — Next Lesson Preparation

Obiettivo: rispondere in modo completo a `cosa preparo per la prossima lezione?`.

Input:

- next lesson da K1;
- class context;
- Lesson Brief;
- materiali già pronti;
- Piano annuale;
- curriculum authority;
- KB solo quando serve.

Acceptance:

- nessuna invenzione se il brief manca;
- materiali già pronti distinti da suggerimenti;
- Piano e curriculum usati con autorità corretta;
- evidence refs disponibili.

### K3 — Knowledge Retrieval

Obiettivo: rendere la KB interrogabile dal Kernel senza trasformare tutto in embedding.

Baseline:

- filtri SQL/metadati;
- full-text;
- vector search;
- hybrid ranking;
- current generation obbligatoria;
- authority/freshness/privacy filter.

Acceptance:

- nessun chunk da generazioni obsolete quando esiste current generation;
- workspace/anno/classe/discipline rispettati;
- fonte originale sempre raggiungibile;
- risultati con provenance.

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
| K0 Spec | IN PROGRESS | `COPILOT_KERNEL_CANONICAL_SPEC.md` |
| K0 Contracts | IN PROGRESS | `product/src/core/application/copilot/copilot-kernel.ts` |
| K0 Tests | IN PROGRESS | `copilot-kernel.test.ts` |
| K1 Today Context | NOT STARTED | dipende da K0 PASS |
| K2 Next Lesson | NOT STARTED | dipende da K1 |
| K3 Hybrid Retrieval | NOT STARTED | dipende da K1/K2 |
| K4 Unified Copilot | NOT STARTED | dipende da K1-K3 |
| K5 Governed Writes | NOT STARTED | dipende da K4 |
| K6 Interoperability | NOT AUTHORIZED | richiede evidenza di necessità |

## Prossimo commit dopo K0

Solo dopo CI verde:

`K1 Today Context: aggrega HomeDailyContext + Planner nel CopilotRunContext`

Non anticipare KB retrieval o write nello stesso incremento.
