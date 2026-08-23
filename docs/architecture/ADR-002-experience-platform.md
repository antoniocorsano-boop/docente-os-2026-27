# ADR-002 — Experience Platform e assistente contestuale

Data: 2026-08-22  
Stato: ACCEPTED

## Contesto

DOCENTE OS ha raggiunto una base funzionale con Next.js, Supabase, RLS, Planner, Conoscenza, Piano annuale, Orario, Classi e Impostazioni. Il limite attuale non è l'assenza di funzioni, ma la frammentazione dell'esperienza: CSS e pattern locali, gergo tecnico visibile, azioni non sempre contestualizzate e assenza di un livello collaborativo capace di accompagnare il docente.

Il progetto necessita di un'architettura di esperienza che aumenti qualità e velocità di sviluppo senza riscrivere dominio e persistenza.

## Decisione

### 1. Component platform

Adottiamo **shadcn/ui** come sorgente primaria dei componenti UI evoluti.

Motivi:

- open source / open code;
- codice dei componenti copiato nel repository e quindi controllabile;
- compatibilità naturale con React/Next.js;
- composizione accessibile tramite primitive mature;
- migrazione progressiva possibile;
- nessun lock-in su un tema proprietario.

Tailwind CSS viene introdotto come infrastruttura di styling e token quando inizia X1.

### 2. AI experience layer

Adottiamo **assistant-ui** come prima scelta per il layer collaborativo.

Il dominio non importa direttamente assistant-ui. L'integrazione avviene tramite adapter/presentation layer e `AiOrchestratorPort`.

Sono esplicitamente consentiti runtime custom. Non adottiamo come requisito:

- assistant-cloud;
- Vercel AI SDK;
- uno specifico provider LLM;
- persistenza conversazionale proprietaria.

### 3. Agentic layer futuro

**CopilotKit/AG-UI** entra in stato `CANDIDATE_FOR_X6`.

Non viene installato nella baseline fino a quando X3-X4 non dimostrano che shared state e generative UI portano un beneficio misurabile rispetto al runtime custom.

### 4. Editor professionale

**BlockNote** è candidato approvato per X5 come editor di documenti a blocchi. La baseline deve usare esclusivamente pacchetti con licenza compatibile.

### 5. Modelli locali

**Ollama** è un adapter opzionale per sviluppo/test locale e non una dipendenza del prodotto.

### 6. Tecnologie non adottate come fondazione

- Refine: non necessario come meta-framework.
- Mantine: non introdurre una seconda component library parallela.
- dashboard template completi: benchmark soltanto.

## Confini architetturali

Dipendenze consentite:

```text
UI components -> presentation/application
assistant-ui adapter -> application AI port
AI provider adapter -> application AI port
application -> domain
infrastructure -> domain/application ports
```

Dipendenze vietate:

```text
domain -> shadcn/ui
domain -> assistant-ui
domain -> CopilotKit
domain -> Ollama/OpenAI/Anthropic/etc.
RLS/domain invariants -> component library
```

## Assistant contract

Nuovo oggetto di presentazione previsto:

```ts
type AssistantContext = {
  surface: string
  workspaceId: string
  academicYearId?: string
  discipline?: string
  classLabel?: string
  objectType?: string
  objectId?: string
  provenance?: unknown
  state?: string
  availableCapabilities: string[]
  forbiddenCapabilities: string[]
  missingInformation: string[]
}
```

Il tipo concreto verrà raffinato in X3 senza esporre oggetti provider-specifici.

## Regole Human-in-the-loop

Una tool action AI deve essere classificata:

- `READ_ONLY`
- `PROPOSE`
- `WRITE_REVERSIBLE`
- `WRITE_EXTERNAL`
- `INSTITUTIONAL_DECISION`

`WRITE_EXTERNAL` e `INSTITUTIONAL_DECISION` richiedono sempre conferma esplicita. Le altre write richiedono almeno preview/undo secondo la policy verticale.

## Hosting

Per lo sviluppo corrente il riferimento operativo è **Netlify deploy preview su `develop`**, perché è il runtime verificato e stabile.

Vercel resta provider compatibile ma **non è gate del progetto** finché persistono limiti di build dell'account. Il dominio e il prodotto devono rimanere hosting-neutral.

La produzione definitiva resta una decisione separata da congelare quando il runtime supera i gate di rilascio.

## Package management

Finché la CI e il repository usano `npm`, `npm` è il package manager operativo canonico. Un eventuale passaggio a pnpm richiede ADR/migrazione esplicita e lockfile dedicato; non si mantiene una divergenza documentale.

## Strategia di adozione

- nessuna migrazione big-bang;
- introdurre componenti shadcn solo nelle superfici toccate dalla slice;
- sostituire il CSS locale soltanto quando il comportamento è coperto da gate;
- l'assistente entra prima come read/propose, poi come write con conferma;
- non cambiare simultaneamente architettura dati e architettura UI nella stessa slice salvo necessità dimostrata.

## Gate

Questa ADR è soddisfatta quando:

1. X1 introduce la component foundation senza regressioni;
2. almeno una superficie usa componenti canonici senza CSS duplicato sostanziale;
3. X3 integra assistant-ui con runtime provider-neutral;
4. nessuna proposta AI bypassa application/domain/RLS;
5. il prodotto continua a funzionare senza provider AI configurato.
