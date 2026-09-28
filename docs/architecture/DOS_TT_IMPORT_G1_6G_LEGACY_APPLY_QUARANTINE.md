# DOS-TT-IMPORT-01 — G1.6-G Legacy Apply Capability Quarantine

## Stato
**RUNTIME / DB REMEDIATION — FORWARD-ONLY — HOLD_PRODUCTION_APPLY**

Baseline: `develop@ceb8e4f6c6f516455a9b64c427a1201ab2f067f9`.

## Scopo
Materializzare la decisione G1.6-F: la RPC legacy G1.2 resta presente per compatibilità/audit, ma non deve essere una capability invocabile dai ruoli client.

## Modifica
La migrazione `0077_quarantine_legacy_timetable_import_apply.sql`:
- registra la propria lineage runtime;
- revoca `EXECUTE` su `public.apply_timetable_import_to_draft(uuid,bigint,uuid,bigint,uuid,jsonb)` da `PUBLIC`, `anon` e `authenticated`;
- non elimina né modifica il corpo della RPC;
- non modifica tabelle candidate, righe o receipt;
- non modifica timetable DRAFT/ACTIVE;
- avanza il runtime schema contract a 0077.

Il test DB storico viene corretto: non considera più l'esposizione ad `authenticated` un requisito e verifica anche che la funzione resti installata.

## Invarianti
- editing manuale T1 invariato;
- lifecycle DRAFT/ACTIVE invariato;
- G1.6-A→E invariato;
- nessun adapter G1.6-E→G1.2;
- nessuna nuova capability di apply;
- `CONFIRM_PREVIEW` resta decisione descrittiva;
- nessuna modifica a T/D/DIS;
- `HOLD_PRODUCTION_APPLY`, `HOLD_REPLAN` e DOS-A1 `RUNTIME_DEFERRED` restano attivi.

## Roll-forward
Le migrazioni già applicate non vengono riscritte. Un eventuale futuro re-enable richiede una nuova migrazione governata, un nuovo boundary applicativo, test di concorrenza/idempotenza aggiornati e HUMAN REVIEW.

## Gate
1. migration lineage 0077 valida;
2. `authenticated` senza EXECUTE sulla RPC;
3. RPC ancora presente;
4. anon/PUBLIC senza capability;
5. DB contract PASS;
6. regressioni Product/G1.6-A→E PASS;
7. review indipendente;
8. HUMAN REVIEW prima del merge.
