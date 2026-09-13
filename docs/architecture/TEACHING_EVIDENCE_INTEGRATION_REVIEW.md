# DOCENTE OS — Teaching Evidence Integration Review

Data: 2026-09-13  
Stato: TE-0 REVIEW / TE-1 BLOCKED

## 1. Scopo

Verificare dove innestare **Osservazioni ed evidenze** senza creare una seconda verità della lezione, una seconda orchestrazione AI o una seconda memoria didattica.

## 2. Matrice dei boundary esistenti

| Boundary | Autorità corrente | Write authority | Relazione con Teaching Evidence | Decisione |
|---|---|---|---|---|
| `TeachingSession` | ciò che il docente registra come realmente accaduto | `record_teaching_session` tramite `SupabaseTeachingSessionRepository.record()` | anchor obbligatorio di Observation/EvidenceReference | RIUSARE |
| `TeachingSessionAllocation` | minuti effettivi imputati a B01-B33 | stesso write atomico della sessione | unico raccordo sessione → blocco canonico | RIUSARE, NON DUPLICARE |
| `AnnualPlanBlockProgress` | decisione sullo stato del blocco | `SupabaseAnnualPlanExecutionRepository.saveProgress()` | non è un registro di osservazioni formative | TENERE SEPARATO |
| `TeachingSessionReflection` | riflessione professionale ex post della singola lezione | flusso `Registra` del cockpit + proiezione Drive | può essere proposta/arricchita da Observation | RIUSARE |
| Drive Diary | proiezione documentale della reflection/sessione | outbox + sync Drive | destinazione documentale, non fonte di verità | RIUSARE |
| `Observe` UI | promemoria/check locali della lezione | oggi nessun write | punto di acquisizione delle micro-rilevazioni | EVOLVERE |
| `AiOrchestratorPort` | boundary canonico AI | capability/tool → domain policy → adapter | ospita i ruoli logici Context/Pattern/Planning/Governance | RIUSARE |
| `Observation` | nuova capability | non ancora autorizzata | fatto professionale strutturato | ADDITIVE |
| `EvidenceReference` | nuova capability | non ancora autorizzata | riferimento a evidenza, non copia dell'asset | ADDITIVE |
| `TeachingProposal` | nuova capability | proposta human-gated | nessuna mutazione autonoma | ADDITIVE |

## 3. Finding critico — due semantiche di «Registra»

La revisione del runtime `develop` mostra due percorsi distinti.

### A. Classe / TeachingSession — boundary coerente

`product/src/app/classi/[sectionId]/actions.ts` espone `recordTeachingSession(...)`:

```text
contesto classe/data/occorrenza
  ↓
TeachingSessionDraft
  +
TeachingSessionAllocation[]
  ↓
validateTeachingSessionAllocations
  ↓
SupabaseTeachingSessionRepository.record
  ↓
record_teaching_session RPC
```

La conferma del completamento del Bxx è deliberatamente separata in `confirmTeachingBlockCompletion(...)`, che usa i minuti effettivamente allocati alle TeachingSession correnti.

Questa è la semantica coerente con T4: **prima registro ciò che è accaduto, poi il docente decide lo stato del Piano**.

### B. Workspace `/lezioni/<Bxx>` — shortcut di avanzamento

`product/src/app/classi/[sectionId]/lezioni/actions.ts` espone `recordLessonExecution(...)` e salva direttamente:

```text
SVOLTO | RIMODULATO | RECUPERATO
  ↓
AnnualPlanBlockProgress
```

Non crea una `TeachingSession` e non passa da `record_teaching_session`.

Il relativo `LessonCloseClient` presenta questa azione all'utente come **chiusura/registrazione della lezione**.

### C. Cockpit materiale `/in-classe/<assetId>/registra` — TeachingSession + Reflection

`recordClassroomLesson(...)`:

- crea una TeachingSession autorevole;
- consente sessioni diagnostiche/pre-canoniche senza inventare Bxx;
- salva la reflection nel `evidenceNote` strutturato;
- proietta il Diario su Drive tramite outbox;
- non completa automaticamente il Piano annuale.

Questa semantica è coerente con il boundary TeachingSession.

## 4. Rischio

Persistendo Observation dalla fase `Osserva` senza chiudere il finding sopra, DOCENTE OS avrebbe due verità concorrenti:

1. lezioni con `TeachingSession + Observation`;
2. lezioni «registrate» soltanto come `AnnualPlanBlockProgress`, prive di sessione reale.

Ne deriverebbero:

- timeline incompleta;
- analisi longitudinali falsate;
- Diario non allineato;
- impossibilità di spiegare perché un Bxx è `SVOLTO` ma non esiste la lezione che lo sostiene;
- differenza di comportamento fra cockpit e workspace canonico.

**TE-1 resta bloccata finché il boundary di chiusura della lezione non converge.**

## 5. Decisione proposta

Il comando umano **Registra la lezione** deve avere un solo significato semantico:

```text
REGISTRA LA LEZIONE
  ↓
TeachingSession autorevole
  + allocazioni opzionali
  + reflection opzionale
  + observations opzionali
  + evidence references opzionali
```

La decisione sul Piano resta separata:

```text
TeachingSession[] + allocations
  ↓
proposta/lettura avanzamento
  ↓
conferma docente
  ↓
AnnualPlanBlockProgress
```

Per il workspace `/lezioni/<Bxx>` il Bxx è già noto, quindi la chiusura può proporre un'allocazione coerente, ma non deve saltare la TeachingSession.

## 6. Temporalità delle micro-osservazioni

Esiste un problema di lifecycle: `Osserva` precede `Registra`, mentre l'id canonico della TeachingSession nasce al momento del write autorevole.

### Decisione TE-0

Durante `Osserva` le micro-rilevazioni restano **draft effimeri di interazione**, non record canonici.

Al comando `Registra`:

```text
session draft
+ allocation draft[]
+ observation draft[]
+ evidence-reference draft[]
        ↓
server revalidation
        ↓
commit coerente con TeachingSession receipt
```

TE-1 deve decidere se il commit diventa:

- un unico RPC atomico esteso; oppure
- `TeachingSession` atomica seguita da un write append-only idempotente con compensazione/receipt esplicita.

La preferenza architetturale è **un unico boundary applicativo e una receipt unica**, evitando Observation orfane.

Un eventuale autosalvataggio di osservazioni prima della registrazione richiederebbe una nuova entità `LessonDraft` con lifecycle proprio e non è autorizzato da TE-0.

## 7. Supersessione

La correzione di una TeachingSession non modifica in-place la storia ma usa `supersedes_session_id`.

Regola proposta:

- le Observation della sessione superseded restano storiche;
- le viste correnti usano Observation appartenenti alle sole `currentTeachingSessions(...)`;
- una correzione non copia automaticamente le Observation precedenti come se fossero nuovamente osservate;
- la UI può proporre di riportarle nel nuovo draft, ma serve conferma esplicita del docente.

## 8. Reflection e Diario

Le micro-osservazioni non sostituiscono `TeachingSessionReflection`.

Pipeline corretta:

```text
Observation/EvidenceReference
  ↓
bozza di Reflection
  ↓
revisione docente
  ↓
TeachingSessionReflection
  ↓
Drive Diary projection
```

`observations` dentro la reflection resta testo professionale sintetico; Observation è il dato strutturato di provenienza.

## 9. Cooperazione AI

I ruoli logici Teaching Evidence **non introducono un orchestratore parallelo**.

Usano il contratto già canonico:

```text
assistant-ui
  → Assistant Runtime Adapter
  → AiOrchestratorPort
  → application capability/tool
  → domain policy
  → infrastructure adapter
```

Mapping:

- Context role → costruzione `AssistantContext` minimizzato;
- Observation role → normalizzazione/validazione di input già fornito dal docente, non generazione di fatti;
- Evidence role → risoluzione di riferimenti/provenienza;
- Pattern role → capability `READ_ONLY`;
- Planning role → `AssistantProposal` con `actionKind = PROPOSE`;
- Governance role → domain policy + server revalidation, non un agente autonomo privilegiato.

L'assenza del provider AI non deve impedire acquisizione, registrazione, Diario o lettura manuale delle evidenze.

## 10. Gate TE-1

TE-1 può iniziare soltanto quando sono chiusi con test/receipt:

1. **Register convergence** — ogni azione utente denominata «Registra la lezione» produce una TeachingSession autorevole;
2. **Plan separation** — nessun record di lezione completa automaticamente Bxx;
3. **Draft lifecycle** — Observation pre-sessione non vengono persistite come record orfani;
4. **Atomicity/idempotency** — sessione + observation receipt coerenti;
5. **Supersession semantics** — letture correnti escludono la linea superseded senza cancellare storia;
6. **Reflection compatibility** — Diario e reflection continuano a funzionare;
7. **Tier 1 privacy** — solo classe/gruppi anonimi;
8. **AI reuse** — nessun secondo orchestratore;
9. **RLS/AAL2** — nuovi write protetti secondo la baseline corrente;
10. **WCAG/mobile/HIM** — TE-2 non introduce frizione o regressioni.

## 11. Stato della review

- TeachingSession reuse: **PASS**
- TeachingSessionAllocation reuse: **PASS**
- Reflection/Drive reuse: **PASS**
- AI orchestration reuse: **PASS**
- Tier 1 no-student-profile boundary: **PASS BY CONTRACT / runtime not yet added**
- Unified `Registra` semantics: **GAP — BLOCKING TE-1**
- Observation persistence: **NOT AUTHORIZED**
- UI persistence/autosave: **NOT AUTHORIZED**
