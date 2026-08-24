# DOCENTE OS — X4A Planner Confirmed Write

Data: 2026-08-24  
Stato: **IMPLEMENTATION CANDIDATE / GATE REQUIRED**  
Compatibilità: **COMPATIBLE** con `X4_WRITE_CONTRACT_PREP.md` e con X3 READ_ONLY / PROPOSE.

## 1. Scopo

X4A apre una sola capability persistente assistita:

`PLANNER_CREATE_TASK`

È una scrittura interna e reversibile. Non autorizza nessuna scrittura su Calendario, Orario, Piano annuale, Conoscenza, Drive, Gmail o sistemi esterni.

## 2. Separazione X3 / X4

La conversazione dell’assistente resta X3:

- legge;
- spiega;
- ordina;
- propone;
- non interpreta una risposta conversazionale come consenso a scrivere.

X4A è una superficie d’azione separata dentro il pannello Planner. La sequenza è:

```text
compila proposta
→ Mostra anteprima
→ proposta persistita PREVIEW_READY
→ nessun PlannerTask creato
→ Conferma e crea
→ RPC atomica
→ PlannerTask + receipt EXECUTED
→ eventuale Annulla creazione
→ PlannerTask CANCELLED + receipt UNDONE
```

`Non creare` porta la proposta a `REJECTED` e non produce alcun effetto Planner.

## 3. Trust boundary

Il browser non è fonte autorevole del payload al momento dell’esecuzione.

Durante `prepare` il server:

1. normalizza il payload con il contratto X4 esistente;
2. calcola il fingerprint;
3. persiste proposta, effetto, provenienza e payload;
4. restituisce l’anteprima.

Durante `execute` il browser invia **solo `proposalId`**. Il server rilegge il payload persistito, applica il gate X4 e la funzione PostgreSQL crea l’attività usando esclusivamente il contenuto della receipt.

Questo impedisce che una modifica client-side tra preview e conferma alteri silenziosamente l’effetto.

## 4. Persistenza e sicurezza

Migrazione: `0029_x4_planner_write_receipts.sql`.

Tabella `assistant_write_proposals`:

- RLS attiva;
- SELECT solo per autore autenticato e membro del workspace;
- nessun INSERT/UPDATE/DELETE diretto per `authenticated`;
- transizioni solo tramite RPC autenticate;
- `effect_ref` collega la receipt all’attività risultante;
- fingerprint, confermante e timestamp restano conservati.

RPC:

- `prepare_assistant_planner_create_task`;
- `execute_assistant_planner_create_task`;
- `reject_assistant_write_proposal`;
- `undo_assistant_planner_create_task`.

Le RPC `SECURITY DEFINER` verificano esplicitamente `auth.uid()`, membership e proprietà della proposta. Nessuna service-role key viene introdotta.

## 5. Reversibilità

Undo è consentito soltanto se:

- la proposta è `EXECUTED`;
- l’attività risultante appartiene allo stesso attore/workspace;
- la provenienza coincide con `assistant-write:<proposalId>`;
- l’attività è ancora `OPEN` o `WAITING`.

L’undo non cancella la storia: porta l’attività a `CANCELLED` e la receipt a `UNDONE`.

Se l’attività è già `DONE` o non è più nel perimetro sicuro, l’undo fallisce chiuso.

## 6. Human contract

Prima della conferma sono mostrati:

- titolo dell’attività;
- data/collocazione;
- priorità;
- nota, se presente;
- **Cosa cambia**;
- **Cosa resta invariato**;
- avviso che la conferma vale soltanto per quella proposta.

La CTA persistente è `Conferma e crea`; l’alternativa è `Non creare`.

Dopo l’esecuzione l’utente vede una ricevuta comprensibile e `Annulla creazione` finché l’effetto resta reversibile.

## 7. Gate di promozione

X4A può essere integrato in `develop` soltanto con:

1. Product CI PASS;
2. test del contratto X4 esistente PASS;
3. X4 application E2E PASS su account tecnico/RLS reali;
4. X3 PASS, per dimostrare che la conversazione non ha acquisito write implicite;
5. HVA applicativo PASS e osservazione della nuova superficie;
6. K1 PASS se la migrazione comune attiva il gate Knowledge.

Dopo merge:

1. Render deve servire stato prodotto esatto/equivalente;
2. `x4-planner/render-beta` PASS;
3. X3 Render PASS;
4. HVA Render PASS;
5. fixture X4 senza attività OPEN/WAITING residua.

Solo dopo questi gate `PROJECT_STATUS_CURRENT.md` può registrare X4A come capability attiva e certificata. X4 nel suo complesso resta parziale.
