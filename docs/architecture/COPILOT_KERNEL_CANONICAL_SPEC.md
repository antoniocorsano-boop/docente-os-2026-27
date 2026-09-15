# DOCENTE OS — Copilot Kernel Canonical Spec

Data: 2026-09-15  
Stato: CANONICAL / APPROVED_FOR_INCREMENT  
Issue di riferimento: #415

## 1. Scopo

Questa specifica evolve `AI_COLLABORATION_CANONICAL_SPEC.md` senza sostituirla.

DOCENTE OS deve offrire un **unico copilota professionale** capace di usare, in modo governato e progressivo, le conoscenze del sistema, del caso d'uso corrente e della Knowledge Base. Planner Assistant, Lesson Assistant e Knowledge Assistant non sono prodotti separati: diventano scope/skill dello stesso kernel.

Principio guida:

> Tutta la conoscenza necessaria deve essere raggiungibile dal copilota, ma soltanto il minimo contesto ad alto segnale deve essere reso visibile al modello in ogni turno.

Il copilota non è una chat che riceve un mega-prompt. È un livello applicativo che seleziona skill, risorse, capability, tool e policy prima di coinvolgere un modello.

## 2. Decisione architetturale

```text
DOCENTE
   │
assistant-ui
   │
Copilot Runtime Adapter
   │
┌─────────────────────────────────────┐
│ DOCENTE OS COPILOT KERNEL           │
│                                     │
│ Context Broker                      │
│ Skill Registry                      │
│ Resource Registry                   │
│ Capability / Tool Registry          │
│ Policy Engine                       │
│ Retrieval Service                   │
│ Evidence Service                    │
│ Approval Service                    │
│ Trace / Evaluation Service          │
└─────────────────────────────────────┘
   │
AiOrchestratorPort
   │
provider adapter opzionale
   │
application layer → domain policy → infrastructure
```

Il Kernel è proprietà di DOCENTE OS. Framework e provider sono adapter.

## 3. Cosa resta canonico dalle specifiche esistenti

Restano invarianti:

- l'AI è contestuale, propositiva, verificabile e subordinata al docente;
- il dominio non dipende da assistant-ui, provider AI o MCP;
- le azioni sono classificate `READ_ONLY`, `PROPOSE`, `WRITE_REVERSIBLE`, `WRITE_EXTERNAL`, `INSTITUTIONAL_DECISION`;
- nessuna write può bypassare application layer, domain policy, RLS o gate AAL2;
- la chat non è il registro delle decisioni;
- le affermazioni operative devono mantenere provenienza e autorità;
- l'app resta utilizzabile con il copilota disabilitato.

## 4. Benchmark esterni e decisioni

### assistant-ui

assistant-ui resta il layer di esperienza. La direzione moderna del framework è basata su **Toolkits**, model context e tool UI. I toolkit permettono di comporre tool model-facing in scope espliciti; le vecchie API di registrazione puntuale sono deprecate.

Riferimenti:

- https://www.assistant-ui.com/docs/api-reference/tools/toolkits
- https://www.assistant-ui.com/docs/tools
- https://www.assistant-ui.com/docs/migrations/toolkit-tools

Decisione: adottare progressivamente i toolkit nel presentation/runtime layer, non nel dominio.

### MCP

MCP distingue **tools, resources e prompts** e supporta cataloghi interoperabili.

Riferimenti:

- https://modelcontextprotocol.io/
- https://www.assistant-ui.com/docs/tools/mcp

Decisione: usare lo stesso modello concettuale internamente, ma non rendere MCP la fondazione applicativa. Un futuro `DOCENTE OS MCP Server` potrà esporre risorse e tool del Kernel senza esporre database o provider.

### OpenAI Agents SDK

Il modello `RunContext`, tool filtering, guardrail e tracing è un benchmark utile per separare contesto applicativo da contesto visibile al modello e per rendere osservabili i run.

Riferimenti:

- https://openai.github.io/openai-agents-js/guides/context/
- https://openai.github.io/openai-agents-js/guides/guardrails/
- https://openai.github.io/openai-agents-js/guides/tracing/

Decisione: eventuale adapter futuro; non sostituisce il Kernel canonico.

### AI SDK / agent loop

Un loop a tool può essere utile in futuro, ma non deve diventare autorità del dominio.

Decisione: non introdurre nella slice K0. `AiOrchestratorPort` resta il confine canonico.

### AG-UI / CopilotKit

Utile per run lunghi, stato condiviso, steering e generative UI.

Decisione: resta candidato per fase successiva, dopo la maturazione del Kernel.

## 5. Quattro concetti separati

### Resource

Risponde a: **che cosa può conoscere il copilota?**

Esempi: giornata, orario, classe, Piano annuale, lesson brief, documento KB, autorità curricolare.

Una Resource è un descrittore governato, non necessariamente il payload completo.

### Skill

Risponde a: **che cosa sa fare professionalmente il copilota?**

Esempi: descrivere la giornata, preparare la prossima lezione, spiegare una circolare, verificare una base curricolare.

La Skill contiene strategia, prerequisiti, output contract e missing-context policy; non contiene accesso diretto all'infrastruttura.

### Tool

Risponde a: **quale operazione applicativa può essere eseguita?**

Esempi corretti:

- `get_today_lessons`
- `get_next_lesson`
- `search_knowledge`
- `get_annual_plan_progress`
- `propose_planner_task`

Esempi vietati:

- `query_supabase`
- `execute_sql`
- `update_table`

Il modello conosce il dominio, non l'infrastruttura.

### Policy

Risponde a: **questa capacità è consentita qui e ora?**

La policy valuta ruolo, workspace, oggetto, privacy, stato AAL, action kind e dominio. La disponibilità di un tool al modello non equivale mai ad autorizzazione del payload prodotto dal modello.

## 6. CopilotRunContext

Il Kernel mantiene un contesto completo; il modello ne vede solo una proiezione minimizzata.

Campi canonici:

```ts
interface CopilotRunContext {
  run: {
    id: string
    localDate: string
    localTime?: string
    surface: CopilotSurface
  }
  identity: {
    workspaceId: string
    academicYearId?: string
    role: string
  }
  focus?: {
    type: string
    id: string
    title?: string
  }
  resources: CopilotResourceDescriptor[]
  capabilities: {
    available: string[]
    forbidden: string[]
  }
  missing: string[]
  privacy: {
    classification: string
    providerPolicy: string
  }
  provenance: EvidenceRef[]
}
```

Regola: non usare l'LLM per scoprire workspace, anno scolastico, data, superficie o autorità che il sistema può determinare deterministicamente.

## 7. Autorità delle risorse

Ogni risorsa dichiara:

- `AUTHORITATIVE`
- `PROVISIONAL`
- `USER_REPORTED`
- `INFERRED`
- `TO_VERIFY`

Ogni risorsa dichiara inoltre stato:

- `AVAILABLE`
- `MISSING`
- `AMBIGUOUS`

Una risorsa richiesta e `AMBIGUOUS` blocca una skill che potrebbe produrre una risposta fuorviante. Non si sceglie silenziosamente una fonte concorrente.

## 8. Catalogo canonico delle conoscenze

### Identità e perimetro

- workspace corrente;
- ruolo corrente;
- anno scolastico;
- disciplina/e assegnate;
- classi/sezioni;
- plesso/contesto istituzionale quando autorizzato.

### Tempo e giornata

- data/ora locale;
- calendario scolastico;
- sospensioni e giornate senza lezione;
- versione di orario applicabile;
- lezioni della giornata;
- lezione corrente/prossima;
- conflitti o ambiguità temporali;
- registrazioni didattiche pendenti.

### Classe e didattica

- stato della sezione;
- monte ore/cattedra;
- Piano annuale per sezione;
- UDA, blocchi e progressione;
- lesson brief;
- materiali preparati;
- materiali suggeriti;
- evidenze didattiche;
- teaching session e storico;
- diario/riflessione docente.

### Curriculum

- programmazioni canoniche;
- UDA canoniche;
- indicazioni e riferimenti normativi;
- CML / autorità curricolare;
- applicabilità;
- rimodulazioni e stati provvisori;
- evidenze della validazione umana.

### Operatività

- Planner;
- attività aperte, scadute, pianificate, in attesa;
- agenda/calendario operativo;
- decisioni e ricevute delle write confermate.

### Knowledge Base

- asset originali;
- versioni trasformate;
- generazione corrente;
- documenti organizzati;
- estratti e highlight;
- classificazione professionale;
- relazioni con disciplina, classe, UDA, Piano, comunicazioni;
- azioni/scadenze proposte;
- provenienza e fonte originale.

### Comunicazioni scolastiche

- circolari;
- allegati;
- scadenze estratte;
- destinatari/pertinenza;
- impatto su classi e lavoro;
- stato di verifica umana.

### Libri e risorse esterne

- adozioni MIM sincronizzate;
- risorse editore;
- collegamenti Drive autorizzati;
- materiali collegati a lezione/classe.

### Conoscenza del prodotto

- superfici e funzioni disponibili;
- capability correnti;
- limiti del copilota;
- procedure dell'app;
- stato delle integrazioni;
- alternative manuali quando una capability è indisponibile.

## 9. Non tutto è RAG

### Read model deterministici

Devono restare query/read model applicativi:

- orario;
- calendario;
- Planner;
- classi;
- Piano annuale;
- sessioni;
- capability/policy;
- autorità curricolare.

Per domande come `Quali lezioni ho oggi?` non è ammesso semantic search come fonte primaria.

### Retrieval della KB

La KB usa progressivamente:

```text
metadata filters
+ full-text search
+ vector search
+ hybrid ranking
+ authority/freshness filters
```

Filtri minimi prima/durante il ranking:

- workspace;
- anno scolastico;
- generazione corrente;
- categoria;
- disciplina;
- classe;
- autorità;
- privacy.

GraphRAG non è baseline. Potrà essere valutato soltanto dopo metriche che dimostrino domande realmente multi-documento/relazionali non coperte dall'hybrid retrieval.

## 10. Skill Registry

Il registro contiene tutte le skill conosciute dal prodotto, ma il modello vede soltanto un sottoinsieme pertinente.

Una skill dichiara almeno:

```ts
interface CopilotSkillDescriptor {
  id: string
  version: string
  title: string
  description: string
  surfaces: CopilotSurface[]
  requiredResources: CopilotResourceKind[]
  optionalResources: CopilotResourceKind[]
  requiredCapabilities: string[]
  actionKind: CopilotActionKind
  missingContextPolicy: 'ASK' | 'PARTIAL' | 'REFUSE_TO_INFER'
  priority: number
  tags: string[]
}
```

## 11. Progressive skill discovery

Pipeline:

```text
surface/focus
   ↓
skill candidates compatibili
   ↓
resource availability + authority
   ↓
capability/policy filter
   ↓
READY / PARTIAL / BLOCKED
   ↓
solo READY/PARTIAL al modello
```

Obiettivo: non presentare decine o centinaia di tool/skill contemporaneamente.

`BLOCKED` non è un fallimento: è una decisione esplicita del sistema.

## 12. Catalogo iniziale delle skill

Famiglia `TODAY`:

- `TODAY_OVERVIEW`
- `NEXT_LESSON_PREPARATION`
- `PENDING_LESSON_REGISTRATION`

Famiglia `PLANNER`:

- `PLANNER_PRIORITIZE`
- futuro `PLANNER_PROPOSE_TASK`
- futuro `PLANNER_RESCHEDULE_PREVIEW`

Famiglia `KNOWLEDGE`:

- `KNOWLEDGE_EXPLAIN`
- `KNOWLEDGE_FIND_RELEVANT`
- futuro `KNOWLEDGE_COMPARE_SOURCES`
- futuro `KNOWLEDGE_EXTRACT_OBLIGATIONS`

Famiglia `CLASS/LESSON`:

- `CLASS_STATUS_OVERVIEW`
- `LESSON_CONTEXT_EXPLAIN`
- `LESSON_REFLECTION`
- `NEXT_LESSON_PREPARATION`

Famiglia `PLAN/CURRICULUM`:

- `ANNUAL_PLAN_PROGRESS`
- `CURRICULUM_AUTHORITY_CHECK`
- futuro `DESIGN_UDA_PROPOSAL`
- futuro `PLAN_DEVIATION_EXPLAIN`

Famiglia `COMMUNICATIONS`:

- `SCHOOL_COMMUNICATION_IMPACT`
- futuro `COMMUNICATION_DEADLINE_REVIEW`

Famiglia `TEXTBOOKS`:

- `TEXTBOOK_RESOURCE_DISCOVERY`

Famiglia `SYSTEM`:

- `SYSTEM_HELP`

La crescita del catalogo avviene per skill versionate e valutabili, non aggiungendo istruzioni libere al prompt globale.

## 13. Caso canonico: Oggi

La superficie Oggi deve usare come base `HomeDailyContext`, già presente nel prodotto, e aggregare Planner senza confondere i due domini.

Ordine di autorità:

```text
local date/time
→ calendar/timetable projection
→ HomeDailyContext
→ current/next lesson
→ teaching-session state
→ Planner
→ optional KB retrieval
```

Domanda: `Che cosa ho oggi?`

Risposta attesa:

1. lezioni della giornata;
2. lezione corrente/prossima;
3. eventuali registrazioni pendenti;
4. attività Planner separate;
5. dichiarazione dell'autorità dell'orario;
6. nessuna deduzione `Planner vuoto = giornata vuota`.

## 14. Caso canonico: preparazione della prossima lezione

```text
HomeDailyContext
→ next lesson identity
→ class context
→ lesson brief
→ prepared materials
→ annual plan/curriculum authority
→ optional KB hybrid retrieval
```

Se manca il Lesson Brief, la skill non inventa preparazione: chiede il contesto o dichiara il limite secondo policy.

## 15. Tool boundary

Il tool catalog del modello espone capability applicative, non repository/provider.

Ogni tool deve dichiarare:

- capability richiesta;
- action kind;
- schema input/output;
- scope consentito;
- policy di conferma;
- provenance minima;
- comportamento in caso di ambiguità.

Le write vengono rivalidate lato server immediatamente prima dell'effetto.

## 16. Privacy

Il Kernel decide il `providerPolicy` prima del model call.

Possibili valori baseline:

- `LOCAL_ONLY`
- `APPROVED_EXTERNAL_PROVIDER`
- `NO_MODEL`

Il retrieval può trovare una risorsa che il modello non è autorizzato a vedere: in quel caso il Kernel conserva il riferimento ma non espone il contenuto al provider.

## 17. CopilotTrace

Non si salva chain-of-thought.

Si salva, quando necessario per qualità e audit:

```text
runId
surface
focus
selected skills
resource descriptors consulted
tools exposed
tools executed
authority/evidence used
model/provider identifier
latency/token metrics when available
answer status
proposal/action kind
human approval result
```

Il trace deve poter essere disattivato o minimizzato secondo privacy policy.

## 18. Eval canoniche

Ogni skill significativa deve avere eval deterministiche.

`TODAY_OVERVIEW` minimo:

1. orario valido + tre lezioni → tre lezioni;
2. nessuna lezione → nessuna lezione;
3. due sorgenti temporali incompatibili → `AMBIGUOUS`;
4. Planner vuoto + lezioni presenti → vietato rispondere `non hai nulla oggi`;
5. orario provvisorio → autorità dichiarata;
6. prossima lezione disponibile → identità corretta;
7. resource/capability mancante → skill `PARTIAL` o `BLOCKED` secondo contratto.

Le eval di selezione skill precedono le eval linguistiche.

## 19. Migrazione dalle verticali correnti

Non eseguire big-bang.

Fasi:

1. introdurre Kernel e registry puri;
2. collegare `TODAY_OVERVIEW` ai read model esistenti;
3. sostituire il contesto Planner della superficie Oggi con aggregazione canonica;
4. migrare Lesson e Knowledge come skill dello stesso Kernel;
5. introdurre toolkits assistant-ui quando il catalogo applicativo è stabile;
6. aggiungere write/approval solo dopo i gate read/propose.

Gli endpoint attuali restano adapter temporanei finché la nuova pipeline non è verificata.

## 20. Componenti non adottati come fondazione

- mega-prompt contenente tutto DOCENTE OS;
- RAG per dati strutturati temporali/operativi;
- accesso diretto del modello a Supabase;
- decine di tool sempre visibili;
- router basato solo su parole chiave;
- graph agent complesso prima di casi d'uso dimostrati;
- GraphRAG come baseline;
- provider AI come dominio.

## 21. Gate di maturità

### K0 — Foundation

- spec canonica;
- contratti puri;
- resource/skill catalog iniziale;
- progressive discovery;
- test.

### K1 — Today Context

- `CopilotRunContext` reale per Oggi;
- `HomeDailyContext` + Planner;
- risposta corretta a lezioni/attività/prossimo momento;
- ambiguità dichiarate.

### K2 — Next Lesson

- brief/materiali/Piano/KB;
- preparazione contestuale;
- nessuna invenzione quando manca il brief.

### K3 — Knowledge Retrieval

- hybrid retrieval;
- filtri professionali;
- generazione corrente;
- authority/freshness evidence.

### K4 — Unified Copilot

- Planner, Lesson, Knowledge migrati a skill;
- unico runtime;
- progressive tool exposure.

### K5 — Governed Writes

- proposal → preview → confirmation → application command;
- audit e provenance;
- nessuna write esterna senza gate dedicato.

### K6 — Interoperability / Agentic UI

- eventuale MCP server;
- eventuale AG-UI;
- eventuali orchestrator adapter avanzati;
- solo dopo evidenza di beneficio.

## 22. Acceptance K0

K0 è chiuso quando:

1. il catalogo è versionato nel repository;
2. `CopilotRunContext`, risorse e skill sono provider-neutral;
3. skill non pertinenti alla superficie non vengono candidate;
4. capability mancanti bloccano l'esposizione;
5. risorse ambigue bloccano skill che non possono inferire;
6. una skill `PARTIAL` può restare visibile dichiarando il contesto mancante;
7. nessuna UI, write o provider dependency viene introdotta;
8. Product CI è verde.
