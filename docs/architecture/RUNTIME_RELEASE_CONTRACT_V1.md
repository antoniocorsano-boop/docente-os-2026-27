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
- continuità canonica della lineage runtime da 0060 in avanti;
- disciplina del watermark dopo 0074;
- registrazione obbligatoria di ogni nuova migrazione nel lineage manifest;
- collisioni PL/pgSQL note;
- coerenza delle capability esterne dichiarate.

### L1 — replay DB effimero, solo quando serve

Si attiva se cambiano migrazioni o boundary di persistenza.

Il job crea uno stack Supabase locale effimero, applica l'intera catena di migrazioni e riesegue il reset completo. Nessun database Beta/Production viene modificato.

Sul database locale vengono controllate le funzioni PL/pgSQL critiche con `plpgsql_check`.

### L2 — runtime reconciliation Beta

Il repository e il database condividono:
- il watermark `runtime_schema_contract_state.migration_id`;
- il manifest privato `private.runtime_schema_required_migrations`;
- lo snapshot read-only `public.runtime_schema_contract_snapshot()`.

Lo snapshot espone soltanto dati non sensibili: versione, migration id, `lineageOk` e l'eventuale elenco di migrazioni canoniche mancanti.

Il processo di avvio confronta il watermark richiesto dal commit e richiede anche `lineageOk=true`. Un database che espone l'ultima migrazione ma ha saltato una migrazione richiesta precedente viene quindi rifiutato prima di servire la nuova versione.

Il monitor runtime ripete gli stessi controlli con l'account E2E già governato.

### L3 — write E2E reale, solo percorsi critici

Non viene attivato usando dati didattici reali.

Prima deve esistere una fixture E2E isolata e reversibile. Solo allora un cambiamento classificato `criticalWrite` eseguirà un write reale browser/API e ne verificherà la receipt.

## Regola migrazioni dopo 0074

La lineage runtime canonica parte da **0060**.

Ogni nuova migrazione dopo 0074 deve:
1. avere numero univoco e sequenziale;
2. applicarsi dopo il replay completo;
3. registrare `version` e `migration_id` in `private.runtime_schema_required_migrations`;
4. concludere con:

`select private.advance_runtime_schema_contract('<migration-id>');`

La funzione di avanzamento verifica che tutte le migrazioni richieste precedenti risultino nella storia Supabase, normalizzando i vecchi nomi con o senza prefisso numerico.

Il watermark da solo non costituisce più prova sufficiente di allineamento.

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
