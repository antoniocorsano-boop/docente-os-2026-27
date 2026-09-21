# DOCENTE OS — Runtime Release Contract V1

Data: **2026-09-21**
Stato: **IMPLEMENTATION CANDIDATE**

## Obiettivo

Ridurre il tempo di collaudo umano senza indebolire i gate tecnici.

Principio:

> **un deploy non è verde se codice, schema database e capability runtime non sono coerenti sullo stesso stato operativo.**

## Livelli

### L0 — preflight rapido, sempre

Target: pochi secondi.

Verifica:
- classificazione del diff;
- inventario migrazioni;
- disciplina del watermark dopo 0074;
- collisioni PL/pgSQL note;
- coerenza delle capability esterne dichiarate.

### L1 — replay DB effimero, solo quando serve

Si attiva se cambiano migrazioni o boundary di persistenza.

Il job crea uno stack Supabase locale effimero, applica l'intera catena di migrazioni e riesegue il reset completo. Nessun database Beta/Production viene modificato.

Sul database locale vengono controllate le funzioni PL/pgSQL critiche con `plpgsql_check`.

### L2 — runtime reconciliation Beta

Il repository e il database condividono un watermark:

`runtime_schema_contract_state.migration_id`

Il processo di avvio confronta il watermark richiesto dal commit con quello esposto dal database. Se non coincidono, l'avvio fallisce prima di servire la nuova versione.

Il monitor runtime ripete lo stesso confronto con l'account E2E già governato.

### L3 — write E2E reale, solo percorsi critici

Non viene attivato usando dati didattici reali.

Prima deve esistere una fixture E2E isolata e reversibile. Solo allora un cambiamento classificato `criticalWrite` eseguirà un write reale browser/API e ne verificherà la receipt.

## Regola migrazioni dopo 0074

Ogni nuova migrazione deve:
1. avere numero univoco e sequenziale;
2. applicarsi dopo il replay completo;
3. concludere con:

`select private.advance_runtime_schema_contract('<migration-id>');`

Il marker impedisce salti silenziosi nella sequenza runtime.

## Costi

- PR normale: solo L0;
- DB/persistenza: L0 + L1;
- capability esterna: L0 + verifica runtime appropriata;
- write critico: L0 + L1 + L3 quando la fixture isolata sarà disponibile;
- controlli completi più pesanti: schedulati/notturni o per release candidate.

## Confini

- nessuna promozione Production automatica;
- nessun service-role nel client;
- nessun database reale usato dal replay CI;
- nessun dato didattico reale usato come fixture automatica;
- Human Review resta necessaria per esperienza, qualità didattica e controllo docente;
- DOS-A1 resta RUNTIME_DEFERRED.
