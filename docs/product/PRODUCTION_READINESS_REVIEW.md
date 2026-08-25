# DOCENTE OS — Production Readiness Review

Stato: **REVIEW CURRENT / INACTIVE PRODUCTION PROVISIONED / ACTIVATION HOLD**

Questa review distingue l'esistenza di una Production inattiva tecnicamente funzionante dall'autorizzazione a usarla con dati professionali reali.

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
- P7-E: provider Render / Frankfurt.
- P7-F: Supabase Production separato, schema-ready e senza dati applicativi reali.
- P7-F2: Render Production provisionato inattivo; `Production Runtime Smoke` run `32836204567`: PASS.
- autenticazione tecnica Production: PASS.
- RPC autenticato `current_workspace_context`: PASS.
- verifica post-smoke: nessuna mutazione applicativa e nessun dato professionale reale.
- `DB_LOGICAL_RESTORE`: PASS, run `32837945388`.
- `INCIDENT_ESCALATION_MINIMUM`: PASS.
  - implementazione PR #192, merge `075bf9e5f00b76ee1555656a98d87a88caa714b4`;
  - gate `p7-incident/escalation-contract`: PASS, run `32838659845`;
  - rehearsal sintetico issue #193: owner-visible, assegnato all'owner, receipt finale presente, chiuso `completed`.

Ricevute canoniche:

- `docs/product/P7F2_PRODUCTION_RUNTIME_RECEIPT.md`;
- `docs/product/P7_DB_RESTORE_REHEARSAL_RECEIPT.md`;
- `docs/product/P7_INCIDENT_ESCALATION_REHEARSAL_RECEIPT.md`.

## Blocker prima dell'attivazione con dati reali

### 1. Supabase Auth service recovery

Stato: **NOT PROVEN / BLOCKER**.

Il logical restore PostgreSQL ha provato schema e catalogo `auth.users`, ma non dimostra che GoTrue/Supabase Auth sia recuperabile end-to-end dopo un disaster recovery reale. Serve una prova in ambiente Supabase isolato o un meccanismo equivalente e verificabile.

### 2. Off-site Storage recovery

Stato: **NOT PROVEN / BLOCKER**.

Il restore del catalogo Storage non equivale al backup indipendente degli oggetti binari. Deve esistere una copia off-site degli originali e deve essere verificato almeno un percorso di restore binario.

## Blocker chiusi

### DB logical restore

**PASS.** PostgreSQL 16 effimero, tutti i file SQL canonici presenti applicati, dati sintetici, `pg_dump`, distruzione DB, `pg_restore`, fingerprint invariato e RLS preservato. Beta/Production non toccati.

### Incident escalation minimum

**PASS.** Il percorso canonico è GitHub Issue con template strutturato, severità, impatto, contenimento, owner action, evidenze e receipt di chiusura. Il rehearsal #193 ha provato la sequenza:

**creazione → classificazione → assegnazione owner → evidenze → receipt → chiusura**.

La prova non implica paging 24/7, SMS/email esterne o incident response multi-operatore; tali capability non sono richieste per il pilot single-owner.

## Watch non bloccanti per il pilot

- load/scale isolato prima di rollout più ampio;
- leaked-password protection quando il piano Supabase lo consente;
- longitudinal proof;
- retention/account deletion dopo evidenza sufficiente di export/recovery.

## Stato di promozione applicativa

La Production inattiva durante il runtime smoke serviva il commit applicativo `f33eb4785ed66630c3a162ae2f2c1bd5db64d532`. Production non segue automaticamente `develop`: ogni allineamento richiede SHA immutabile certificato e decisione umana esplicita.

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

Restano due soli blocker di activation:

1. `SUPABASE_AUTH_SERVICE_RECOVERY`;
2. `OFFSITE_STORAGE_RECOVERY`.

Production activation resta **HOLD** fino alla loro chiusura e a una nuova readiness review.
