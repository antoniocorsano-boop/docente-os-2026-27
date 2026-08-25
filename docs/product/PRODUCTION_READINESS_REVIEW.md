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
- `DB_LOGICAL_RESTORE`: PASS, run `32837945388`.
- `INCIDENT_ESCALATION_MINIMUM`: PASS; rehearsal sintetico issue #193 owner-visible e chiuso `completed`.
- `SUPABASE_AUTH_SERVICE_RECOVERY`: **PASS**, run `32841165988`.
  - stack Supabase completo effimero in GitHub Actions;
  - GoTrue `v2.195.0`;
  - identità sintetica confermata;
  - login iniziale riuscito;
  - `POST /auth/v1/recover` accettata;
  - email di recovery catturata da Mailpit;
  - recovery session emessa;
  - password modificata attraverso la recovery session;
  - vecchia password rifiutata;
  - nuova password accettata;
  - Beta/Production non toccati.

Ricevute canoniche:

- `docs/product/P7F2_PRODUCTION_RUNTIME_RECEIPT.md`;
- `docs/product/P7_DB_RESTORE_REHEARSAL_RECEIPT.md`;
- `docs/product/P7_INCIDENT_ESCALATION_REHEARSAL_RECEIPT.md`;
- `docs/product/P7_SUPABASE_AUTH_RECOVERY_RECEIPT.md`.

## Blocker prima dell'attivazione con dati reali

Resta **un solo blocker**.

### Off-site Storage recovery

Stato: **NOT PROVEN / BLOCKER**.

Il restore del catalogo Storage non equivale al backup indipendente degli oggetti binari. Deve esistere una copia off-site degli originali e deve essere verificato almeno un percorso di restore binario, usando esclusivamente dati sintetici fino alla nuova decisione di readiness.

## Blocker chiusi

### DB logical restore

**PASS.** PostgreSQL effimero, migrazioni canoniche, dati sintetici, `pg_dump`, distruzione DB, `pg_restore`, fingerprint invariato e RLS preservato.

### Supabase Auth service recovery

**PASS.** Il run `32841165988` ha esercitato il servizio GoTrue reale dello stack Supabase locale, non soltanto il catalogo `auth.users`. Ha provato richiesta di recovery, emissione email, recovery session e sostituzione effettiva della password.

Questa prova non equivale a certificare il disaster recovery gestito dell'infrastruttura cloud Supabase; certifica però il comportamento end-to-end del servizio Auth richiesto dal blocker.

### Incident escalation minimum

**PASS.** Il percorso owner-visible via GitHub Issue è stato provato con receipt di chiusura sintetica e gate automatico.

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

Il solo blocker residuo è:

`OFFSITE_STORAGE_RECOVERY`.

Production activation resta **HOLD** fino alla prova di copia indipendente e restore binario degli oggetti Storage e alla successiva Production Readiness Review.
