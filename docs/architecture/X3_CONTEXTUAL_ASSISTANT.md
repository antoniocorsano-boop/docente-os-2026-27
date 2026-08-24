# X3 — Contextual Assistant

Data: 2026-08-24  
Stato: COMPLETE_TECHNICAL / INTERACTIVE_ACCEPTANCE_IN_PROGRESS  
Dipende da: X0, X1, X2, ADR-002, AI Collaboration Canonical Spec

## 1. Obiettivo

Trasformare “Ti aiuto da qui” in un assistente contestuale reale, integrato nella superficie di lavoro e capace di leggere il contesto autentico, spiegare ciò che conta e proporre passi successivi senza eseguire alcuna scrittura.

X3 autorizza esclusivamente:

- `READ_ONLY`;
- `PROPOSE`.

Sono vietati:

- `WRITE_REVERSIBLE`;
- `WRITE_EXTERNAL`;
- `INSTITUTIONAL_DECISION`;
- tool che modificano database/provider;
- chiamate dirette a Supabase/Google dal runtime AI.

## 2. Implementazione congelata

Baseline runtime:

- `@assistant-ui/react` 0.15.x;
- `useLocalRuntime`;
- `AssistantRuntimeProvider`;
- `ChatModelAdapter` deterministico/provider-neutral;
- primitive Thread / Composer / Message;
- nessuna API key;
- nessun provider LLM esterno;
- conversazione effimera.

Flusso:

```text
Knowledge detail
  -> AppShell ContextualAssistantBoundary
  -> GET /api/assistant/knowledge-context?assetId=...
  -> authenticated server repositories + RLS
  -> minimized AssistantContext
  -> deterministic ChatModelAdapter
  -> assistant-ui LocalRuntime
  -> READ_ONLY / PROPOSE response
```

## 3. AssistantContext

Il builder `buildKnowledgeAssistantContext()` passa al runtime soltanto dati allowlisted:

- workspace id;
- anno scolastico id quando disponibile;
- asset id;
- titolo umano;
- stato;
- tipologia;
- provenienza umana;
- summary fino a 900 caratteri;
- excerpt fino a 700 caratteri;
- nuclei distribuiti del contenuto;
- discipline/classi;
- conteggio proposte azione/scadenza;
- dati mancanti;
- capability consentite/vietate.

Non passa:

- token;
- service role key;
- client Supabase;
- credenziali Google;
- payload raw provider;
- intero documento se non necessario;
- dati alunno non richiesti.

## 4. Capability X3

Consentite:

- `KNOWLEDGE_EXPLAIN_CONTEXT`;
- `KNOWLEDGE_SUMMARIZE_STATE`;
- `KNOWLEDGE_HIGHLIGHT_MISSING_CONTEXT`;
- `KNOWLEDGE_LIST_PROPOSALS`;
- `KNOWLEDGE_SUGGEST_NEXT_STEP`.

Vietate:

- `PLANNER_CREATE_TASK`;
- `KNOWLEDGE_UPDATE_CONTEXT`;
- `KNOWLEDGE_REPROCESS`;
- `DRIVE_WRITE`;
- `CALENDAR_WRITE`;
- `GMAIL_SEND`.

Una richiesta di scrittura viene declassata a proposta o anteprima: l’assistente non attiva la modifica.

## 5. Contratto di risposta — Answer First

Il confine fra **rispondere** ed **eseguire** è obbligatorio e vale come contratto riusabile per tutte le future superfici dell’assistente.

Regole:

1. **Un limite operativo può impedire una azione, non una risposta.**
2. Se il contesto contiene l’informazione richiesta, l’assistente deve fornirla prima di indicare eventuali passi successivi.
3. Se la risposta è soltanto parzialmente sostenuta, deve distinguere ciò che è supportato da ciò che richiede ulteriore evidenza.
4. Se il dato non è disponibile, deve dichiararlo esplicitamente e fornire comunque le informazioni pertinenti realmente sostenute dal contesto; non può inventare il dato mancante.
5. Una risposta composta soltanto da “apri”, “vai”, “usa”, “consulta” o equivalenti è invalida quando sostituisce contenuto che l’assistente possiede già.
6. Il rifiuto di una scrittura automatica deve essere accompagnato, quando possibile, da una anteprima, da valori proposti, da un testo preparato o da una spiegazione concreta della modifica.
7. Le domande libere non possono essere degradate a un menù di prompt predefiniti: il runtime deve cercare prima evidenze pertinenti nel contesto disponibile.

Ogni `AssistantResponse` espone inoltre:

- `answerStatus = SUPPORTED | PARTIAL | NOT_FOUND`;
- `grounding.kind = PAGE_CONTEXT`;
- `grounding.evidenceCount`.

Il validatore `validateAssistantResponseContract()` rende testabile il contratto e impedisce che l’evoluzione delle capability confonda prudenza operativa con evasività.

## 6. Esperienza

Superficie pilota: `Conoscenza / dettaglio documento`.

La AppShell riconosce la route documento e monta un trigger contestuale non bloccante:

**Ti aiuto da qui**  
**Assistente contestuale · nessuna modifica automatica**

Prompt guida:

- Cosa contiene questo documento?
- Cosa devo controllare?
- Ci sono azioni o scadenze?
- Qual è il prossimo passo utile?

I prompt guida sono scorciatoie, non un insieme chiuso. Una domanda libera deve ricevere una risposta fondata sui nuclei disponibili oppure una dichiarazione esplicita del gap informativo.

Le risposte possono usare blocchi quali:

- **In sintesi / Risposta / Ho trovato**;
- **Punti principali / Nuclei utilizzabili / Quello che posso affermare**;
- **Ti propongo / Suggerimento / Indicazione operativa**;
- **Limite operativo / Se scegli questa opzione**.

La grammatica visuale non deve mai sostituire il contenuto informativo.

## 7. Optional / failure state

- `NEXT_PUBLIC_DOCENTE_OS_ASSISTANT=off` disabilita l’assistente;
- la pagina resta completamente operativa;
- se il read model non è disponibile, compare un messaggio non bloccante;
- le server actions manuali esistenti non dipendono dall’assistente.

## 8. Persistenza

- nessuna nuova tabella;
- nessuna persistenza chat;
- nessuna chat come registro decisionale;
- nessun nuovo schema/migration.

## 9. Test e gate

Sono verificati automaticamente:

- capability allowlist/denylist;
- informazioni mancanti;
- minimizzazione testo;
- conteggi proposte reali;
- declassamento delle richieste di scrittura;
- assenza di claim di scritture eseguite;
- priorità del contesto mancante nel prossimo passo;
- uso di nuclei distribuiti del documento;
- risposta a domande libere mediante evidenze pertinenti;
- dichiarazione esplicita di `NOT_FOUND` senza allucinare dati;
- rifiuto delle risposte di sola navigazione;
- suggerimenti didattici fondati sul contenuto;
- anteprima Planner senza scrittura automatica.

Gate interattivo applicativo autenticato:

- login account tecnico isolato;
- upload fixture autonoma;
- indicizzazione e stato `Pronto`;
- contesto professionale completo;
- risposta di sintesi;
- prossimo passo;
- domanda libera non predefinita;
- anteprima di scrittura;
- verifica finale di assenza della scrittura nel Planner.

Il gate Render resta separato e richiede che il beta esponga l’esatto commit testato prima di eseguire lo stesso scenario browser.

## 10. Definition of done tecnica

La parte tecnica è soddisfatta soltanto quando:

- Product CI è verde;
- il contratto Answer First è verde;
- il gate browser applicativo autenticato è verde;
- il gate Render è verde sul medesimo commit distribuito.

I limiti infrastrutturali esterni non devono essere confusi con errori applicativi, ma devono restare visibili come gate distinti.

## 11. Next

X4 resta **HOLD_FOR_X3_INTERACTIVE_ACCEPTANCE** finché il gate Render non chiude l’accettazione sul commit distribuito.

Dopo accettazione, una prima `WRITE_REVERSIBLE` potrà essere progettata soltanto con preview, conferma esplicita, application layer, policy dominio/RLS e provenienza della proposta. Il contratto Answer First resterà invariato anche quando aumenteranno le capability di scrittura.
