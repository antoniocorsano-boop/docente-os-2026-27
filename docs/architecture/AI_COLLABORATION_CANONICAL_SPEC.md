# DOCENTE OS — AI Collaboration Canonical Spec

Data: 2026-08-22  
Stato: CANONICAL / APPROVED_FOR_X3

## 1. Scopo

Definire come l'intelligenza artificiale collabora con il docente senza diventare né fonte autoritativa né scorciatoia che bypassa dominio, RLS o validazione umana.

## 2. Principio

L'AI di DOCENTE OS è **contestuale, propositiva, verificabile e subordinata all'utente**.

Non deve limitarsi a rispondere a domande. Deve:

- leggere il contesto della superficie corrente;
- sintetizzare ciò che conta;
- segnalare lacune o incoerenze;
- proporre opzioni;
- anticipare l'effetto di ogni opzione;
- chiedere conferma prima delle azioni significative;
- lasciare traccia di provenienza e decisione.

## 3. Tipi di interazione

### READ_ONLY

Esempi:

- spiega un documento;
- trova una scadenza;
- confronta due fonti;
- mostra cosa manca;
- riassume il piano annuale;
- individua scostamenti nell'orario.

Può essere eseguita immediatamente.

### PROPOSE

Esempi:

- propone una nuova attività;
- suggerisce una UDA;
- prepara una revisione;
- propone una riallocazione del lavoro.

Produce una proposta strutturata, non una write.

### WRITE_REVERSIBLE

Esempi:

- crea una bozza interna;
- aggiunge una task nel Planner;
- salva una nota;
- aggiorna uno stato reversibile.

Richiede preview e conferma oppure undo immediato secondo policy verticale.

### WRITE_EXTERNAL

Esempi:

- invia e-mail;
- modifica Google Drive;
- crea evento Calendar;
- pubblica/esporta verso sistemi esterni.

Richiede sempre conferma esplicita immediatamente prima dell'effetto.

### INSTITUTIONAL_DECISION

Esempi:

- conferma curricolo;
- approva una versione istituzionale;
- attiva un orario;
- valida un documento come definitivo.

L'AI non può eseguire autonomamente. Può preparare materiale e motivazione; la decisione resta umana.

## 4. AssistantContext

Ogni sessione contestuale deve ricevere soltanto il contesto necessario.

Campi minimi previsti:

```ts
interface AssistantContext {
  surface: 'HOME' | 'TODAY' | 'KNOWLEDGE' | 'PLAN' | 'DESIGN' | 'TIMETABLE' | 'CLASSES' | 'SETTINGS' | string
  workspaceId: string
  academicYearId?: string
  discipline?: string
  classLabel?: string
  object?: {
    type: string
    id: string
    title?: string
    state?: string
  }
  provenance?: Array<{
    kind: string
    ref?: string
    label?: string
  }>
  availableCapabilities: string[]
  forbiddenCapabilities: string[]
  missingInformation: string[]
}
```

`AssistantContext` è un read model di presentazione. Non è il modello di dominio.

## 5. AssistantProposal

Le proposte devono essere strutturate:

```ts
interface AssistantProposal {
  id: string
  summary: string
  rationale?: string
  evidenceRefs: string[]
  actionKind: 'READ_ONLY' | 'PROPOSE' | 'WRITE_REVERSIBLE' | 'WRITE_EXTERNAL' | 'INSTITUTIONAL_DECISION'
  effectPreview: string
  reversible: boolean
  requiresConfirmation: boolean
  payloadRef?: string
}
```

Il modello non invia payload provider raw al client come autorità applicativa.

## 6. Formato conversazionale

Quando l'output è operativo, l'assistente usa questa sequenza:

**Ho trovato**  
Fatti rilevanti e provenienza.

**Ti propongo**  
Massimo tre opzioni prioritarie, salvo richiesta diversa.

**Se scegli questa opzione**  
Effetto concreto, dati modificati, dati non modificati.

**Confermi tu**  
Solo quando serve una decisione.

Evitare:

- eccesso di testo;
- linguaggio da chatbot generico;
- entusiasmo artificiale;
- formule imperative prive di motivazione;
- presentare inferenze come fatti;
- nascondere dati mancanti.

## 7. Evidenza e affidabilità

Ogni affermazione utile alla decisione deve poter essere classificata come:

- `DOCUMENTED`
- `USER_REPORTED`
- `INFERRED`
- `TO_VERIFY`

La UI può tradurre queste categorie in linguaggio umano, ma non deve perderle internamente.

## 8. Tool boundary

Il modello non chiama direttamente Supabase, Google o altri provider.

Flusso obbligatorio:

```text
assistant-ui
  -> Assistant Runtime Adapter
  -> AiOrchestratorPort
  -> application capability/tool
  -> domain policy
  -> infrastructure adapter
  -> provider/database
```

Ogni write deve essere validata di nuovo lato server; mai fidarsi del payload prodotto dal modello.

## 9. Persistenza conversazionale

Baseline X3:

- nessuna dipendenza da cloud conversazionale proprietario;
- le conversazioni possono essere effimere;
- persistiamo soltanto quando esiste un caso d'uso esplicito;
- la decisione/proposta accettata deve essere tracciabile indipendentemente dalla chat.

La chat non è il registro delle decisioni.

## 10. Privacy

- minimizzazione del contesto;
- nessun token provider nel prompt;
- nessuna service role key;
- niente dati alunno non necessari;
- possibilità di provider locale per casi appropriati;
- ogni adapter AI dichiara quali dati lascia il sistema.

## 11. Failure modes

Se il provider AI non è disponibile:

- DOCENTE OS resta pienamente navigabile;
- Planner, Conoscenza, Piano, Orario e Classi continuano a funzionare;
- la UI mostra “Assistente temporaneamente non disponibile”; non blocca l'azione manuale.

Se una proposta non è supportata dalle capability correnti:

- l'assistente lo dichiara;
- offre l'alternativa manuale o una proposta senza write.

## 12. X3 acceptance criteria

X3 è completata quando:

1. assistant-ui è montato in almeno una superficie reale;
2. usa `AssistantContext` derivato da dati autentici;
3. può funzionare con un runtime mock/local senza provider commerciale;
4. mostra suggerimenti contestuali;
5. non esegue write;
6. l'app funziona identicamente con assistente disabilitato;
7. testano almeno contesto, capability filtering e rendering proposta.

## 13. X4 acceptance criteria

X4 è completata quando:

1. almeno una `WRITE_REVERSIBLE` usa preview + conferma/undo;
2. almeno una proposta Planner viene creata tramite application layer;
3. il modello non può bypassare autorizzazioni;
4. ogni effetto persistente conserva `proposalId`, fonte e utente confermante quando applicabile;
5. nessuna write esterna viene introdotta senza gate dedicato.
