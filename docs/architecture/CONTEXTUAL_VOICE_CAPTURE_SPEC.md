# DOCENTE OS — Contextual Voice Capture Spec

Data: **2026-09-14**  
Stato: **DESIGN SPEC / IMPLEMENTATION DEFERRED**  
Issue: **#385**  
Dipendenze: `AI_COLLABORATION_CANONICAL_SPEC.md`, `PRODUCT-SIMPLIFICATION.md`, `TEACHER_AI_COPILOT_PRODUCT_DIRECTION.md`.

## 1. Scopo

Definire la cattura vocale come **input del copilota contestuale**, non come modulo indipendente.

Obiettivo:

`voce → contesto → trascrizione → interpretazione proposta → conferma umana → write governata`

Nessuna fase autorizza il modello a scrivere direttamente nel dominio.

## 2. Principi

- voice capture è un **input mode**, non una nuova destinazione;
- il contesto è risolto prima della persistenza;
- un contesto ambiguo non viene promosso automaticamente;
- raw audio effimero per default;
- trascrizione e interpretazione sono dati intermedi;
- soltanto un effetto confermato diventa record professionale;
- il fallimento STT/AI non blocca il task manuale;
- nessuna valutazione automatica degli alunni;
- nessun completamento automatico del Piano annuale.

## 3. Entry point autorizzati

### Context-bound

- Classe;
- Lezione;
- Registra la lezione;
- copilota aperto da una superficie con `AssistantContext` valido.

In questi casi il binding iniziale può essere forte perché deriva dalla superficie.

### Global

Un eventuale microfono globale del copilota è ammesso soltanto se usa un resolver di contesto e non persiste finché il binding non è certo o confermato.

## 4. Context resolution

Ordine di autorità:

1. **explicitSurfaceContext** — section/lesson/task forniti dalla route o dal presenter corrente;
2. **activeTeachingContext** — sessione/task corrente già materializzato e coerente con il workspace;
3. **authoritativeTemporalProjection** — orario attivo + data/ora + calendario/proiezione temporale;
4. **recentNavigationHint** — ultima classe aperta o ultimo task consultato, solo come segnale debole.

Il resolver produce:

```ts
interface VoiceContextCandidate {
  source: 'SURFACE' | 'ACTIVE_TASK' | 'TEMPORAL_PROJECTION' | 'RECENT_HINT'
  sectionId?: string
  classLabel?: string
  discipline?: string
  lessonRef?: string
  blockId?: string
  scheduledAt?: string
  confidence: 'CERTAIN' | 'LIKELY' | 'AMBIGUOUS'
  evidenceRefs: string[]
}
```

Regola:

- `CERTAIN` può alimentare la preview;
- `LIKELY` richiede conferma prima della write;
- `AMBIGUOUS` richiede scelta esplicita del docente prima di classificare effetti persistenti.

## 5. Voice capture envelope

```ts
interface VoiceCaptureEnvelope {
  id: string
  workspaceId: string
  capturedAt: string
  contextCandidate: VoiceContextCandidate
  transcript: {
    text: string
    provider?: string
    confidence?: number
    ephemeral: true
  }
  retention: {
    rawAudio: 'EPHEMERAL' | 'EXPLICITLY_RETAINED'
    transcript: 'EPHEMERAL_UNTIL_CONFIRMED'
  }
}
```

Questo envelope non è un record didattico e non deve essere confuso con TeachingSession, Observation, PlannerTask o KnowledgeAsset.

## 6. Interpretation candidates

Il copilota può produrre zero o più candidati:

```ts
type VoiceIntentKind =
  | 'LESSON_EXECUTION_NOTE'
  | 'PROFESSIONAL_OBSERVATION'
  | 'NEXT_LESSON_FOCUS'
  | 'PREPARATION_NEED'
  | 'REMINDER_CANDIDATE'
  | 'UNCLASSIFIED'
```

Ogni candidato:

```ts
interface VoiceIntentCandidate {
  kind: VoiceIntentKind
  summary: string
  sourceTranscriptRange?: [number, number]
  epistemicState: 'USER_REPORTED' | 'INFERRED' | 'TO_VERIFY'
  proposedEffect?: string
  requiresConfirmation: true
}
```

Il modello non deve trasformare `INFERRED` in `USER_REPORTED`.

## 7. Human preview

La UI non presenta entità di dominio interne.

Esempio di preview:

**Ho capito che ti riferisci alla 2C appena conclusa.**

Propongo di conservare:

- **Oggi:** la distinzione tra risorse naturali e mezzi tecnici è stata compresa;
- **Da riprendere:** input e output;
- **Per la prossima volta:** preparare un esempio sull’irrigazione.

Azioni:

- `Conferma`;
- `Correggi`;
- `Scarta`;
- `Continua a parlare`.

Non mostrare `TeachingSession`, `AnnualPlanBlockProgress`, ID tecnici o categorie di storage.

## 8. Write boundary

Flusso obbligatorio:

```text
voice-ui
  -> SpeechToTextPort
  -> ContextualCaptureService
  -> Assistant Runtime / AiOrchestratorPort
  -> VoiceIntentCandidate[]
  -> Human preview + confirmation
  -> application capability verticale
  -> domain policy
  -> repository/provider
```

Il modello non scrive direttamente.

Ogni write server-side deve riverificare:

- utente/workspace;
- section/task binding;
- capability autorizzata;
- AAL2 quando richiesto dalla capability verticale;
- RLS/domain invariants;
- idempotency/provenance.

## 9. Effetti consentiti nel primo incremento

Il primo incremento post-UX0 dovrebbe limitarsi a effetti reversibili o facilmente verificabili:

- proposta di nota di lezione;
- proposta di osservazione professionale;
- proposta di focus per la prossima lezione;
- proposta di task/preparazione.

Esclusi dal primo incremento:

- completamento automatico blocchi/Piano;
- valutazioni alunno;
- scritture istituzionali;
- invii esterni;
- modifiche non reversibili.

## 10. Audio lifecycle

Baseline:

1. acquisizione audio locale/temporanea;
2. invio al motore STT solo se necessario e secondo adapter dichiarato;
3. ottenimento transcript;
4. interpretazione;
5. preview;
6. conferma/scarto;
7. cancellazione raw audio salvo esplicita finalità separata;
8. cancellazione transcript intermedio se non confermato;
9. persistenza esclusivamente dei record professionali approvati e della provenance necessaria.

La conservazione del raw audio richiede una decisione prodotto/privacy separata; non è autorizzata dalla presente specifica.

## 11. Privacy

- minimizzazione del contesto inviato al provider;
- provider e destinazione dati devono essere dichiarabili;
- niente service-role/token/provider secret nel client o nel prompt;
- Tier-1-safe durante pilot;
- il docente viene invitato a non dettare dati personali non necessari;
- nessuna registrazione ambientale continua;
- nessuna cattura passiva della voce degli studenti.

## 12. Failure e recovery

### STT failure

Mostrare:

`Non sono riuscito a trascrivere. Puoi riprovare o scrivere la nota.`

Il task non viene perso.

### Context ambiguity

Mostrare una domanda breve, con massimo poche opzioni realmente plausibili.

### AI interpretation failure

Conservare temporaneamente la trascrizione nel client/sessione di lavoro e consentire:

- modifica manuale;
- salvataggio come nota semplice;
- nuovo tentativo.

### Write failure

La preview e gli input confermati restano recuperabili; nessuna doppia write al retry.

## 13. Acceptance futura

La capability può essere considerata pronta per pilot quando:

- il microfono non introduce una nuova destinazione primaria;
- da Classe/Lezione il contesto corretto è risolto senza reimmissione;
- da entry point globale un binding ambiguo non viene mai salvato senza conferma;
- raw audio è effimero per default;
- transcript non confermati non diventano record;
- almeno tre intenti distinti possono essere proposti dalla stessa cattura;
- preview e linguaggio sono professionali, non tecnici;
- write passano dagli application boundary esistenti;
- nessuna auto-valutazione o auto-completamento Piano;
- fallback manuale funziona;
- HVA mobile e desktop PASS;
- HUMAN_USE dimostra riduzione del Task Cost rispetto alla compilazione manuale equivalente.

## 14. Decisione provider

La scelta del motore STT è deliberatamente successiva.

Prima si valida:

- task;
- contesto;
- privacy;
- preview;
- confirmation model;
- persistenza;
- recovery.

Solo dopo si confrontano provider/local model per qualità linguistica, latenza, costi, privacy, offline capability e manutenibilità.

## 15. Regola finale

> **La voce deve ridurre il lavoro di registrazione, non creare un nuovo flusso da amministrare.**

Il valore non è la trascrizione perfetta in sé. È la capacità di trasformare rapidamente una riflessione del docente in memoria professionale contestualizzata, verificabile e utile al prossimo passo.