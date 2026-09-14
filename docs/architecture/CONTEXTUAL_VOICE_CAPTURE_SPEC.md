# DOCENTE OS — Contextual Voice Capture Spec

Data: **2026-09-14**  
Stato: **CANONICAL CANDIDATE / V1-C**  
Issue: **#385**  
Programma: **#387**  
Dipendenze: `AI_COLLABORATION_CANONICAL_SPEC.md`, `TEACHER_AI_COPILOT_PRODUCT_DIRECTION.md`, `TEACHER_OS_V1_PRODUCT_CONVERGENCE_CANONICAL.md`, `INSTITUTIONAL_INTEGRATION_CONFIGURATOR_CANONICAL.md`.

## 1. Scopo

Definire la cattura vocale come **input del copilota contestuale**, non come modulo indipendente.

Obiettivo:

`voce → contesto → trascrizione → interpretazione proposta → conferma umana → write governata`

Nessuna fase autorizza il modello a scrivere direttamente nel dominio.

## 2. Principi

- voice capture è un input mode, non una nuova destinazione;
- il contesto è risolto prima della persistenza;
- un contesto ambiguo non viene promosso automaticamente;
- raw audio effimero per default;
- trascrizione e interpretazione sono dati intermedi;
- soltanto un effetto confermato diventa record professionale;
- il fallimento STT/AI non blocca il task manuale;
- nessuna valutazione automatica degli alunni;
- nessun completamento automatico del Piano annuale;
- provider e retention sono risolti secondo `InstitutionPolicy`.

## 3. Entry point autorizzati

### Context-bound

- Classe;
- Lezione / Lesson Brief;
- Registra la lezione;
- copilota aperto da una superficie con `TeacherMoment` / `AssistantContext` valido.

### Global

Un eventuale microfono globale del copilota è ammesso soltanto se usa un resolver di contesto e non persiste finché il binding non è certo o confermato.

## 4. Context resolution

Ordine di autorità:

1. `explicitSurfaceContext` — section/lesson/task forniti dalla superficie corrente;
2. `activeTeachingContext` — sessione/task corrente già materializzato;
3. `authoritativeTemporalProjection` — orario attivo + data/ora + calendario/proiezione temporale;
4. `recentNavigationHint` — ultima classe/task, solo segnale debole.

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

- `CERTAIN` può alimentare la preview;
- `LIKELY` richiede conferma prima della write;
- `AMBIGUOUS` richiede scelta esplicita prima di effetti persistenti.

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

L'envelope non è un record didattico.

## 6. Interpretation candidates

```ts
type VoiceIntentKind =
  | 'LESSON_EXECUTION_NOTE'
  | 'PROFESSIONAL_OBSERVATION'
  | 'NEXT_LESSON_FOCUS'
  | 'PREPARATION_NEED'
  | 'REMINDER_CANDIDATE'
  | 'UNCLASSIFIED'
```

Ogni candidato mantiene `USER_REPORTED | INFERRED | TO_VERIFY`, summary, proposed effect e `requiresConfirmation: true`.

Il modello non trasforma `INFERRED` in `USER_REPORTED`.

## 7. Human preview

La UI presenta significato, non entità interne.

Esempio:

**Ti riferisci alla 2C appena conclusa.**

Propongo di conservare:

- **Oggi:** ciò che è stato realmente svolto;
- **Da riprendere:** il concetto rimasto incerto;
- **Per la prossima volta:** ciò che conviene preparare.

Azioni: `Conferma`, `Correggi`, `Scarta`, `Continua a parlare`.

## 8. Write boundary

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

Ogni write server-side riverifica utente/workspace, binding, capability, AAL2 quando applicabile, RLS/domain invariants, idempotency e provenance.

## 9. Effetti consentiti nel primo incremento

- proposta di nota di lezione;
- proposta di osservazione professionale;
- proposta di focus per la prossima lezione;
- proposta di task/preparazione.

Esclusi:

- completamento automatico Piano;
- valutazioni alunno;
- scritture istituzionali;
- invii esterni non confermati;
- modifiche irreversibili.

## 10. Audio lifecycle

1. acquisizione audio temporanea;
2. invio allo STT solo secondo provider/policy autorizzati;
3. transcript;
4. interpretazione;
5. preview;
6. conferma/scarto;
7. cancellazione raw audio salvo finalità separata autorizzata;
8. cancellazione transcript intermedio se non confermato;
9. persistenza esclusivamente dei record professionali approvati e della provenance necessaria.

La conservazione raw audio non è autorizzata per default.

## 11. Privacy e configuratore istituzionale

`InstitutionPolicy.voicePolicy` governa disponibilità, retention e persistenza transcript.

`InstitutionPolicy.aiPolicy` governa provider e data tier ammessi.

Regole permanenti:

- minimizzazione del contesto;
- nessun secret nel client/prompt;
- nessuna registrazione ambientale continua;
- nessuna cattura passiva della voce degli studenti;
- nessun dato personale non necessario;
- fallback manuale sempre disponibile.

## 12. Failure e recovery

### STT failure

`Non sono riuscito a trascrivere. Puoi riprovare o scrivere la nota.`

### Context ambiguity

Domanda breve con poche opzioni plausibili.

### AI interpretation failure

Consentire modifica manuale, salvataggio come nota semplice o nuovo tentativo.

### Write failure

Preview e input restano recuperabili; retry idempotente.

## 13. Acceptance V1-C

La capability è pronta per pilot quando:

- il microfono non introduce una nuova destinazione primaria;
- da Classe/Lezione il contesto corretto è risolto senza reimmissione;
- binding ambiguo non viene mai salvato senza conferma;
- raw audio è effimero per default;
- transcript non confermati non diventano record;
- una cattura può produrre più intenti separati;
- preview professionale e non tecnica;
- write tramite application boundary;
- nessuna auto-valutazione o auto-completamento Piano;
- fallback manuale funzionante;
- policy istituzionale applicata server-side;
- HVA mirata + HUMAN_USE dimostrano riduzione del Task Cost.

## 14. Decisione provider

La scelta del motore STT è successiva alla validazione di task, context binding, privacy, preview, confirmation model, persistenza e recovery.

Poi si confrontano provider/local model per qualità italiana, latenza, costi, privacy, offline capability e manutenibilità.

## 15. Regola finale

> **La voce deve ridurre il lavoro di registrazione, non creare un nuovo flusso da amministrare.**
