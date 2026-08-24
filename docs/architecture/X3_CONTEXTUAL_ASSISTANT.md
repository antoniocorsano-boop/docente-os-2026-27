# X3 — Contextual Assistant

Data: 2026-08-24  
Stato: `KNOWLEDGE_ACCEPTED / PLANNER_EXTENSION_IN_RUNTIME_GATE`  
Dipende da: X0, X1, X2, ADR-002, AI Collaboration Canonical Spec

## 1. Obiettivo

Rendere DOCENTE OS un assistente contestuale integrato nelle superfici di lavoro, capace di leggere il contesto autentico, fornire una risposta sostanziale, spiegare ciò che conta e proporre passi successivi senza confondere risposta ed esecuzione.

X3 autorizza esclusivamente:

- `READ_ONLY`;
- `PROPOSE`.

Sono vietati:

- `WRITE_REVERSIBLE`;
- `WRITE_EXTERNAL`;
- `INSTITUTIONAL_DECISION`;
- tool che modificano database/provider;
- chiamate dirette a Supabase/Google dal runtime conversazionale.

## 2. Architettura

Baseline runtime:

- `@assistant-ui/react` 0.15.x;
- `useLocalRuntime`;
- `AssistantRuntimeProvider`;
- `ChatModelAdapter` deterministico/provider-neutral;
- pannello contestuale condiviso;
- primitive Thread / Composer / Message;
- nessuna API key richiesta da X3;
- nessun provider LLM esterno richiesto;
- conversazione effimera.

Flusso multi-superficie:

```text
AppShell
  -> ContextualAssistantBoundary
  -> riconoscimento superficie/route
  -> endpoint read-only autenticato della superficie
  -> repository server + RLS
  -> AssistantContext minimizzato e allowlisted
  -> responder deterministico della superficie
  -> assistant-ui LocalRuntime
  -> READ_ONLY / PROPOSE response
```

Superfici correnti:

```text
Knowledge detail
  -> GET /api/assistant/knowledge-context?assetId=...
  -> KnowledgeAssistantContext
  -> respondToKnowledgeAssistant()

Planner / Oggi
  -> GET /api/assistant/planner-context
  -> PlannerAssistantContext
  -> respondToPlannerAssistant()
```

Il `ContextualAssistantPanel` è condiviso; il read model e il responder restano specifici del dominio per non creare un unico contesto onnisciente e non controllabile.

## 3. AssistantContext e minimizzazione

### Knowledge

Il contesto passa soltanto dati allowlisted, tra cui:

- workspace/anno scolastico;
- asset e titolo umano;
- stato/tipologia/provenienza;
- summary ed excerpt limitati;
- nuclei distribuiti del contenuto;
- discipline/classi;
- conteggi di proposte azione/scadenza;
- dati mancanti;
- capability consentite/vietate.

### Planner

Il contesto passa soltanto:

- workspace/anno scolastico;
- data locale Europe/Rome;
- conteggi attività attive/aperte/in attesa/scadute/oggi/urgenti/alte/senza data;
- massimo 20 attività attive ordinate;
- titolo ridotto;
- note ridotte;
- stato;
- priorità;
- data di scadenza/pianificazione;
- tipo di provenienza.

Non passa:

- token;
- service role key;
- client Supabase;
- credenziali Google;
- payload raw provider;
- documenti interi non necessari;
- dati alunno non richiesti;
- capacità di scrittura implicite.

## 4. Capability X3

### Knowledge consentite

- `KNOWLEDGE_EXPLAIN_CONTEXT`;
- `KNOWLEDGE_SUMMARIZE_STATE`;
- `KNOWLEDGE_HIGHLIGHT_MISSING_CONTEXT`;
- `KNOWLEDGE_LIST_PROPOSALS`;
- `KNOWLEDGE_SUGGEST_NEXT_STEP`.

### Planner consentite

- `PLANNER_SUMMARIZE`;
- `PLANNER_PRIORITIZE`;
- `PLANNER_EXPLAIN_TASKS`;
- `PLANNER_SUGGEST_PLAN`.

### Vietate

- `PLANNER_CREATE_TASK`;
- `PLANNER_COMPLETE_TASK`;
- `PLANNER_REOPEN_TASK`;
- `PLANNER_MOVE_TASK`;
- `PLANNER_DELETE_TASK`;
- `KNOWLEDGE_UPDATE_CONTEXT`;
- `KNOWLEDGE_REPROCESS`;
- `DRIVE_WRITE`;
- `CALENDAR_WRITE`;
- `GMAIL_SEND`.

Una richiesta di scrittura viene declassata a proposta/anteprima informativa. Nessuna mutazione viene eseguita.

## 5. Contratto di risposta — Answer First

Il confine fra **rispondere** ed **eseguire** è obbligatorio e riusabile per tutte le superfici.

Regole:

1. **Un limite operativo può impedire un’azione, non una risposta.**
2. Se il contesto contiene l’informazione richiesta, l’assistente deve fornirla prima di indicare eventuali passi successivi.
3. Se la risposta è soltanto parzialmente sostenuta, deve distinguere ciò che è supportato da ciò che richiede ulteriore evidenza.
4. Se il dato non è disponibile, deve dichiararlo esplicitamente e fornire comunque le informazioni pertinenti realmente sostenute; non può inventare il dato mancante.
5. Una risposta composta soltanto da “apri”, “vai”, “usa”, “consulta” o equivalenti è invalida quando sostituisce contenuto che il contesto contiene già.
6. Il rifiuto di una scrittura automatica deve essere accompagnato, quando possibile, da anteprima, candidati, valori proposti, testo preparato o spiegazione concreta della decisione.
7. Le domande libere non possono essere degradate a un menù di prompt predefiniti.
8. Il riconoscimento di una richiesta di scrittura deve distinguere un **intento imperativo** da una domanda informativa. Esempio: “Cosa devo completare oggi?” richiede una risposta; “Completa X” o “Puoi completare X?” richiede una proposta senza esecuzione.

Ogni `AssistantResponse` espone:

- `answerStatus = SUPPORTED | PARTIAL | NOT_FOUND`;
- `grounding.kind = PAGE_CONTEXT`;
- `grounding.evidenceCount`.

Il validatore `validateAssistantResponseContract()` rende il contratto testabile.

## 6. Esperienza

L’assistente viene montato soltanto quando la superficie possiede un contesto X3 autorizzato.

### Knowledge

Prompt guida:

- Cosa contiene questo documento?
- Cosa devo controllare?
- Ci sono azioni o scadenze?
- Qual è il prossimo passo utile?

### Planner

Prompt guida:

- Cosa devo fare?
- Cosa viene prima?
- Come organizzo oggi?
- Cosa è in attesa?

I prompt guida sono scorciatoie, non un insieme chiuso. Una domanda libera deve ricevere una risposta fondata oppure un `NOT_FOUND` esplicito con il miglior contesto supportato disponibile.

Le risposte possono usare blocchi quali:

- **In sintesi / Risposta / Ho trovato / Situazione Planner**;
- **Punti principali / Attività pertinenti / Quello che posso affermare**;
- **Ti propongo / Suggerimento / Indicazione operativa**;
- **Limite operativo / Se scegli questa opzione**.

La grammatica visuale non deve mai sostituire il contenuto informativo.

## 7. Optional / failure state

- `NEXT_PUBLIC_DOCENTE_OS_ASSISTANT=off` disabilita l’assistente;
- la pagina resta completamente operativa;
- se il read model non è disponibile, compare un messaggio non bloccante;
- le azioni manuali esistenti non dipendono dall’assistente.

## 8. Persistenza

X3 non introduce persistenza conversazionale o nuove scritture:

- nessuna tabella chat;
- nessuna chat come registro decisionale;
- nessuna nuova migrazione per l’assistente;
- nessuna mutazione di Knowledge/Planner da parte del responder.

## 9. Test e gate

### Unit/contract

Sono verificati automaticamente:

- capability allowlist/denylist;
- informazioni mancanti;
- minimizzazione;
- conteggi reali;
- grounding;
- declassamento delle richieste write;
- assenza di claim di scritture eseguite;
- Answer First su domande libere;
- `NOT_FOUND` senza invenzione;
- rifiuto delle risposte di sola navigazione;
- distinzione fra domanda informativa e comando di scrittura;
- ordinamento Planner per scadenza/urgenza/pianificazione/stato.

### Browser applicativo autenticato

Il gate mobile esegue almeno:

**Knowledge**
- login account tecnico isolato;
- upload fixture autonoma;
- indicizzazione e stato `Pronto`;
- contesto professionale;
- sintesi;
- prossimo passo;
- domanda libera;
- anteprima write;
- verifica finale di nessuna attività creata.

**Planner**
- lettura del conteggio attività aperte realmente mostrato dalla pagina;
- confronto con il conteggio nel contesto assistente;
- domanda “Cosa devo fare?”;
- richiesta di completamento;
- reload del Planner;
- verifica che il conteggio delle attività aperte sia invariato.

### Render beta

Il gate Render non esegue il browser finché `/api/build-info` non restituisce esattamente il commit sotto test.

Stati semantici:

- SHA non allineato entro la finestra -> `DEPLOY_STALE`, browser non eseguito;
- SHA allineato + Playwright FAIL -> fallimento applicativo/runtime;
- SHA allineato + Playwright PASS -> runtime verificato.

Render Free può impiegare più di 12 minuti per distribuire una nuova revisione. Il gate corrente attende fino a 30 minuti per evitare falsi negativi senza trasformare un deploy non verificato in PASS.

## 10. Baseline e Definition of Done

Knowledge X3 è verificato sul runtime reale Render al commit:

`efd5432fc5e537a4b2b0345c59a78f286b72a948`

Su quello stesso SHA sono PASS:

- `x3-e2e/application`;
- `x3-e2e/render-beta`.

Planner X3 è integrato nel commit:

`98bbd6f48285df3e25477587e8f6f5804a08ab7d`

La sua Definition of Done richiede lo stesso doppio PASS sul commit esatto.

## 11. X4

X4 resta **HOLD / NOT_AUTHORIZED**.

La chiusura tecnica e interattiva di X3 non abilita automaticamente alcuna scrittura. Una futura `WRITE_REVERSIBLE` richiede un gate separato con almeno:

- preview esplicita;
- conferma legata alla preview/fingerprint;
- application layer;
- validazione server-side della capability;
- policy dominio/RLS;
- provenienza/audit;
- undo quando applicabile.

Il contratto Answer First resta invariato anche se in futuro aumenteranno le capability.