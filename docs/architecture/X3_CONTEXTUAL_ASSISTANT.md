# X3 — Contextual Assistant

Data: 2026-08-22  
Stato: COMPLETE_TECHNICAL / INTERACTIVE_ACCEPTANCE_PENDING  
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

Una richiesta di scrittura viene declassata a proposta: l’assistente descrive il percorso manuale ma non lo attiva.

## 5. Esperienza

Superficie pilota: `Conoscenza / dettaglio documento`.

La AppShell riconosce la route documento e monta un trigger contestuale non bloccante:

**Ti aiuto da qui**  
**Assistente contestuale · nessuna modifica automatica**

Prompt guida:

- Cosa contiene questo documento?
- Cosa devo controllare?
- Ci sono azioni o scadenze?
- Qual è il prossimo passo utile?

Le risposte seguono la grammatica:

**Ho trovato → Ti propongo → Se scegli questa opzione**

## 6. Optional / failure state

- `NEXT_PUBLIC_DOCENTE_OS_ASSISTANT=off` disabilita l’assistente;
- la pagina resta completamente operativa;
- se il read model non è disponibile, compare un messaggio non bloccante;
- le server actions manuali esistenti non dipendono dall’assistente.

## 7. Persistenza

- nessuna nuova tabella;
- nessuna persistenza chat;
- nessuna chat come registro decisionale;
- nessun nuovo schema/migration.

## 8. Test e gate verificati

Test aggiunti per:

- capability allowlist/denylist;
- informazioni mancanti;
- minimizzazione testo;
- conteggi proposte reali;
- downgrade delle richieste write;
- assenza di claim di scritture eseguite;
- priorità del contesto mancante nel prossimo passo.

Gate runtime:

- Product CI #213 PASS;
- 27/27 test PASS;
- TypeScript PASS;
- lint PASS;
- Next build PASS;
- Netlify READY;
- merge `3685066ed91695357b10a20e821199464e06f593`;
- nessuna migrazione DB/RLS/dati;
- nessun secret/API key.

## 9. Definition of done tecnica

Soddisfatta.

Resta il gate umano:

- verificare in browser il trigger;
- aprire l’assistente;
- porre almeno una domanda READ_ONLY;
- porre una richiesta di scrittura e confermare che venga rifiutata/declassata;
- verificare che il pannello non ostacoli l’uso mobile/desktop.

## 10. Next

X4 resta **HOLD_FOR_X3_INTERACTIVE_ACCEPTANCE**.

Dopo accettazione, una prima `WRITE_REVERSIBLE` potrà essere progettata soltanto con preview, conferma esplicita, application layer, policy dominio/RLS e provenienza della proposta.
