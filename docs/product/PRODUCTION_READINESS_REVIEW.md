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
- `P7 DB Restore Rehearsal` run `32837945388`: PASS per il logical restore PostgreSQL isolato.

Ricevute canoniche:

- `docs/product/P7F2_PRODUCTION_RUNTIME_RECEIPT.md`;
- `docs/product/P7_DB_RESTORE_REHEARSAL_RECEIPT.md`.

## Blocker prima dell'attivazione con dati reali

### 1. Recovery DB/Auth

Stato: **DB LOGICAL RESTORE PROVEN / SUPABASE AUTH SERVICE NOT PROVEN / BLOCKER RESIDUO**.

Il componente database del restore rehearsal è ora provato in ambiente PostgreSQL 16 effimero e isolato. Il run `32837945388` ha applicato tutti i 35 file SQL canonici presenti nel repository, prodotto un backup logico, distrutto il database e ripristinato schema, dati sintetici, relazioni e 26 tabelle `public` con RLS. Beta e Production non sono stati toccati.

Questa prova non certifica ancora il servizio Supabase Auth end-to-end: il ripristino di una riga sintetica in `auth.users` prova il catalogo PostgreSQL, non GoTrue/Supabase Auth come servizio. Prima dell'attivazione resta quindi necessario dimostrare `SUPABASE_AUTH_SERVICE_RECOVERY` in un ambiente Supabase isolato o con un meccanismo equivalente e verificabile.

### 2. Off-site Storage recovery

Stato: **NOT PROVEN / BLOCKER**.

L'integrità DB↔Storage e il ripristino del catalogo `storage.buckets` non equivalgono al backup indipendente degli oggetti. Deve esistere una copia off-site degli originali Storage e deve essere verificato almeno un percorso di restore binario.

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

Il rischio `DB_LOGICAL_RESTORE` è ridotto e provato. Restano tre condizioni di activation da chiudere:

1. `SUPABASE_AUTH_SERVICE_RECOVERY`;
2. `OFFSITE_STORAGE_RECOVERY`;
3. `INCIDENT_ESCALATION_MINIMUM`.

Per rapporto costo/rischio, il prossimo lavoro autonomamente chiudibile senza toccare Production è `INCIDENT_ESCALATION_MINIMUM`; la prova Auth completa richiederà invece un ambiente Supabase realmente isolato o un meccanismo equivalente. Solo dopo la chiusura dei blocker e una nuova readiness review potrà essere valutata l'attivazione del pilot.
