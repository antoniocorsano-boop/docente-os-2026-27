# DOCENTE OS — Production Readiness Review

Stato: **REVIEW CURRENT / INACTIVE PRODUCTION PROVISIONED / ACTIVATION HOLD**

Questa review distingue l'esistenza di un'infrastruttura Production tecnicamente funzionante dall'autorizzazione ad attivarla con dati professionali reali.

## Decisione corrente

- **Production activation:** HOLD.
- **Inactive Production provisioning:** COMPLETE.
- **Scope futuro autorizzabile:** `SINGLE_OWNER_PILOT` / `named_owner_only`.
- **Real user data accepted:** false.
- **Production e Beta:** separati per applicazione, Supabase, DB, Auth, Storage e segreti.

## Evidenze soddisfatte

- P7-A: contratto Beta → Production e gate `production-promotion/contract`.
- P7-B: topologia Production separata.
- P7-C: specifica infrastrutturale e gate `production-infrastructure/spec`.
- P7-E: provider Render / Frankfurt scelto.
- P7-F: Supabase Production separato provisionato e schema-ready.
- P7-F2: Render Production provisionato e raggiungibile.
- `Production Runtime Smoke` run `32836204567`: PASS.
- autenticazione tecnica Production: PASS.
- RPC autenticato `current_workspace_context`: PASS.
- verifica post-smoke: nessun dato applicativo creato.

Ricevuta canonica runtime: `docs/product/P7F2_PRODUCTION_RUNTIME_RECEIPT.md`.

## Blocker prima dell'attivazione con dati reali

### 1. Restore rehearsal DB/Auth

Stato: **NOT PROVEN / BLOCKER**.

Il percorso di recupero DB/Auth deve essere provato in ambiente isolato con una ricevuta riproducibile prima di autorizzare dati professionali reali.

### 2. Off-site Storage recovery

Stato: **NOT PROVEN / BLOCKER**.

L'integrità DB↔Storage non equivale a backup indipendente. Deve esistere una copia off-site degli originali Storage e deve essere verificato almeno un percorso di restore.

### 3. Incident escalation minima

Stato: **NOT IMPLEMENTED / BLOCKER**.

Una Production attiva richiede almeno un percorso owner-visible di escalation e una receipt minima dell'incidente. Il monitor tecnico da solo non basta.

## Watch che non bloccano il pilot single-owner

- **Load/scale isolato:** necessario prima di rollout più ampio.
- **Leaked-password protection:** da abilitare quando il piano Supabase lo consente.
- **Longitudinal proof:** necessario oltre il pilot iniziale.
- **Retention/account deletion:** resta soggetto a evidenza sufficiente di export e recovery.

## Stato di promozione applicativa

La Production inattiva, durante il runtime smoke del 2026-08-25, serviva il commit applicativo `f33eb4785ed66630c3a162ae2f2c1bd5db64d532`, mentre `develop` era a `ee141fd156a788f2e4c2357ab0d09e6eec52f073`.

Questa divergenza è intenzionalmente ammessa dal contratto: Production non segue automaticamente `develop`. Qualunque allineamento deve usare uno SHA immutabile certificato e una decisione umana esplicita. Il PASS dello smoke non costituisce una promozione.

## Regola operativa

Nessun elemento di questa review autorizza:

- uso di dati reali;
- migrazione automatica Beta → Production;
- riuso di credenziali Beta;
- signup pubblico;
- onboarding multi-tenant;
- auto-deploy Production;
- ampliamento delle write capability AI.

## Prossimo gate

Il prossimo lavoro valido è chiudere, in ordine di rischio, i tre blocker di activation: `RESTORE_REHEARSAL`, `OFFSITE_STORAGE_RECOVERY`, `INCIDENT_ESCALATION_MINIMUM`. Solo dopo una nuova readiness review potrà essere valutata l'attivazione del pilot.