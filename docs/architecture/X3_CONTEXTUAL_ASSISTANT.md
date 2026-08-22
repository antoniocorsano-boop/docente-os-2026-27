# X3 — Contextual Assistant

Data: 2026-08-22  
Stato: APPROVED_FOR_IMPLEMENTATION  
Dipende da: X0, X1, X2, ADR-002, AI Collaboration Canonical Spec

## 1. Obiettivo

Trasformare “Ti aiuto da qui” in un assistente contestuale reale, integrato nella superficie di lavoro e capace di leggere il contesto autentico, spiegare ciò che conta e proporre passi successivi senza eseguire alcuna scrittura.

X3 autorizza esclusivamente:

- `READ_ONLY`;
- `PROPOSE`.

Sono vietati in X3:

- `WRITE_REVERSIBLE`;
- `WRITE_EXTERNAL`;
- `INSTITUTIONAL_DECISION`;
- tool che modificano database/provider;
- chiamate dirette a Supabase/Google dal runtime AI.

## 2. Libreria

Baseline verificata su GitHub il 2026-08-22:

- repository: `assistant-ui/assistant-ui`;
- licenza: MIT;
- package: `@assistant-ui/react`;
- versione osservata: `0.15.16`;
- peer React: `^18 || ^19`;
- API utilizzata: `useLocalRuntime`, `AssistantRuntimeProvider`, `ChatModelAdapter`, primitive Thread/Composer/Message.

`LocalRuntime` è scelto perché gestisce lo stato conversazionale nel client e consente un backend/adattatore personalizzato tramite un singolo `ChatModelAdapter.run()`.

## 3. Provider strategy X3

X3 NON richiede un provider commerciale.

Prima implementazione:

```text
AssistantContext autentico
  -> ProviderNeutralContextAdapter
  -> deterministic/mock ChatModelAdapter
  -> assistant-ui LocalRuntime
  -> UI contestuale
```

Il mock non inventa dati: genera risposte soltanto da `AssistantContext` e da snapshot minimizzati esplicitamente passati alla componente.

Questa baseline dimostra l'interazione e i confini. Il provider LLM reale entrerà soltanto tramite un adapter successivo senza cambiare il contratto della UI.

## 4. AssistantContext runtime

Il contratto canonico resta quello di `AI_COLLABORATION_CANONICAL_SPEC.md`.

Per `KNOWLEDGE`, il builder riceve dati autentici già disponibili lato server e produce un read model minimizzato:

- workspace id;
- anno scolastico id quando disponibile;
- documento/asset id;
- titolo umano;
- stato umano/tecnico minimo necessario;
- discipline/classi se presenti;
- provenienza;
- numero proposte azione/scadenza;
- disponibilità della versione organizzata;
- informazioni mancanti;
- capability consentite/vietate.

Non passa al runtime:

- token;
- service keys;
- credenziali provider;
- oggetti Supabase client;
- payload provider raw;
- dati alunno non necessari.

## 5. Capability X3

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
- `GMAIL_SEND`;
- qualsiasi capability non esplicitamente allowlisted.

## 6. Esperienza

Superficie pilota: `Conoscenza / dettaglio documento`.

Il pannello deve comunicare chiaramente:

**Assistente contestuale · nessuna modifica automatica**

Prompt suggeriti iniziali:

- “Cosa contiene questo documento?”
- “Cosa devo controllare?”
- “Ci sono azioni o scadenze?”
- “Qual è il prossimo passo utile?”

La risposta operativa segue:

**Ho trovato**  
Fatti/supporto disponibile.

**Ti propongo**  
Massimo tre opzioni.

**Se scegli questa opzione**  
Effetto previsto; in X3 l'effetto è sempre informativo/propositivo e non viene eseguito.

## 7. Relazione con le azioni manuali esistenti

L'assistente può indicare che esiste una funzione manuale (“Crea attività nel Planner”, “Controlla il contesto”, “Aggiorna analisi”), ma non la invoca.

Le server actions correnti restano l'unica via per le scritture dell'utente.

## 8. Persistenza

Baseline:

- conversazione effimera;
- nessuna nuova tabella;
- nessuna persistenza della chat;
- nessuna chat come registro decisionale.

## 9. Failure/off state

L'assistente deve poter essere disabilitato senza cambiare la funzionalità della pagina.

Se il runtime non è disponibile:

- il documento resta completamente utilizzabile;
- le azioni manuali restano disponibili;
- viene mostrato uno stato non bloccante.

## 10. Test obbligatori

- builder `AssistantContext` usa solo dati allowlisted;
- capability consentite/vietate corrette;
- dati mancanti esplicitati;
- adapter locale non produce una write;
- prompt classificati in intent read/propose;
- risposte non dichiarano effetti già eseguiti;
- rendering non necessario ai test duplicativi della libreria, ma il build React/Next deve passare.

## 11. Gate

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Poi:

- Netlify preview READY;
- dettaglio Conoscenza con dati reali renderizza;
- assistant-ui montato;
- nessuna nuova migrazione DB;
- nessun secret/API key richiesto;
- nessuna write dall'assistente;
- pagina identicamente operativa con assistente disabilitato.

## 12. Definition of done

X3 è completa quando l'assistente contestuale è montato sul dettaglio Conoscenza, usa un `AssistantContext` autentico e minimizzato, funziona con LocalRuntime/mock provider-neutral, genera soltanto READ_ONLY/PROPOSE e supera CI + deploy preview senza regressioni.

## 13. Next

X4 può introdurre una prima `WRITE_REVERSIBLE` soltanto dopo accettazione X3, con preview, conferma esplicita, application layer, policy dominio/RLS e provenienza della proposta.
