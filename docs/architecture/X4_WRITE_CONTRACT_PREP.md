# DOCENTE OS — X4 Write Contract Prep

Data: 2026-08-23  
Stato: TECHNICAL_PREP_READY / EXECUTION_DISABLED

## Scopo

Preparare i contratti deterministici necessari a X4 senza autorizzare alcuna scrittura AI prima dell'accettazione UX di X3.

## Prima capability candidata

`PLANNER_CREATE_TASK`

È classificata come `WRITE_REVERSIBLE` perché crea una attività interna al Planner e non produce effetti esterni o decisioni istituzionali.

## Flusso obbligatorio

```text
AssistantContext
  -> proposta strutturata
  -> effect preview
  -> payload fingerprint
  -> conferma umana legata a proposalId + fingerprint
  -> execution gate server-side
  -> application capability
  -> repository/domain policy
```

Il modello non può invocare direttamente il repository Planner.

## Preview

Ogni proposta deve dichiarare prima della conferma:

- cosa cambia;
- cosa non cambia;
- fonte/evidenze;
- payload normalizzato;
- reversibilità;
- necessità di conferma.

Per `PLANNER_CREATE_TASK` la preview dichiara esplicitamente che:

- viene creata una attività nel Planner;
- non viene modificato il Piano annuale;
- non viene creato un evento nel Calendario;
- non viene modificato l'Orario;
- non viene modificata la fonte originaria.

## Binding della conferma

La conferma non è una generica risposta «sì» riutilizzabile.

È legata a:

- `proposalId`;
- `payloadFingerprint` SHA-256;
- utente confermante;
- timestamp.

Se il payload cambia dopo la preview, la conferma precedente non è più valida.

## Gate di esecuzione

L'esecuzione è ammessa solo se tutte le condizioni sono vere:

1. `x4Enabled = true`;
2. la capability è nella allowlist corrente;
3. la capability non è nella denylist;
4. la proposta è `CONFIRMED`;
5. proposta e conferma hanno lo stesso `proposalId`;
6. il fingerprint corrente coincide con quello mostrato in preview e confermato;
7. l'utente confermante è presente.

Qualunque condizione mancante produce fail-closed.

## Stato attuale

X3 mantiene `PLANNER_CREATE_TASK` nella denylist e X4 non è abilitata.

Quindi questi contratti possono essere integrati e testati senza rendere possibile alcuna scrittura AI persistente.

## Gate ancora necessario

Prima di attivare la prima write X4 occorre accettare l'esperienza X3 raffinata nel runtime beta reale.

Solo dopo quell'accettazione potrà essere aperta una slice separata che:

- rimuove `PLANNER_CREATE_TASK` dalla denylist solo nella superficie autorizzata;
- collega il gate al server action/application capability Planner;
- persiste `proposalId`, fonte, utente confermante e ricevuta dell'effetto;
- implementa undo o altra reversibilità esplicita;
- mantiene vietate tutte le `WRITE_EXTERNAL` senza gate dedicato.
