# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS dispone ora di una **Production attiva in modalità SINGLE_OWNER_PILOT**, separata dalla Beta e vincolata a un commit immutabile certificato.

Stato corrente:

- Render Production: **ACTIVE / LIVE** a Frankfurt;
- commit servito: `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`;
- Production Runtime Smoke certificante: **PASS**, run `32903982577`;
- `exactCandidateShaVerified = true`;
- Supabase Production separato e schema-ready;
- auto-deploy Production: **OFF**;
- signup pubblico: **OFF**;
- onboarding multi-tenant: **OFF**;
- copia automatica Beta → Production: **OFF**;
- `realUserDataAccepted = false`;
- activation blocker tecnici P7: **0**.

La Production è quindi attiva come runtime del pilot nominativo, ma **non è ancora autorizzata a ricevere dati professionali reali**.

## 2. Runtime e invarianti di prodotto

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- branch canonico di sviluppo: `develop`;
- promozione Production: `IMMUTABLE_CERTIFIED_SHA`;
- Vercel non è gate canonico; Netlify è legacy.

Capability principali:

- X0/X1/X2: COMPLETE;
- X3: COMPLETE / `READ_ONLY-PROPOSE`;
- X4-A: COMPLETE / BETA-PROVEN — unica write assistita persistente autorizzata: `PLANNER_CREATE_TASK`;
- X5-A: COMPLETE / BETA-PROVEN — UDA versionate;
- X5-B: COMPLETE / BETA-PROVEN — export professionale;
- X6: FUTURE / NOT BASELINE;
- T1/T2/T3A/T3B/T3C/T4: COMPLETE.

Orario e Calendario restano domini indipendenti; la composizione avviene solo via Temporal Projection. Nessuna nuova write assistita è autorizzata senza gate dedicato.

## 3. Operational hardening

**P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D REVIEW CURRENT / P7-E PASS / P7-F PASS / P7-F2 COMPLETE / DB_LOGICAL_RESTORE PASS / SUPABASE_AUTH_SERVICE_RECOVERY PASS / OFFSITE_STORAGE_RECOVERY_REHEARSAL PASS / OFFSITE_STORAGE_PERSISTENT_DESTINATION PASS / OFFSITE_STORAGE_RETENTION_LOCK PASS / INCIDENT_ESCALATION_MINIMUM PASS / P7_PRODUCTION_ACTIVATION_DECISION PASS / P7_PRODUCTION_PROMOTION PASS / TECHNICAL BLOCKERS 0 / SINGLE_OWNER_PILOT ACTIVE**.

## 4. P7 — Production governance e recovery

Sono soddisfatti:

- promotion contract;
- Production data topology separata;
- Supabase Production provisionato;
- Render Production Frankfurt con auto-deploy disabilitato;
- DB logical restore;
- Supabase Auth service recovery;
- off-site Storage recovery rehearsal;
- Cloudflare R2 EU persistent destination;
- R2 Bucket Lock sul prefisso `production/`, retention 90 giorni;
- incident escalation minimum;
- decisione umana esplicita di attivazione;
- promozione immutabile e smoke post-promozione sullo SHA esatto.

Ricevuta di release: `docs/product/P7_PRODUCTION_RELEASE_RECEIPT.md`.

## 5. Readiness / activation

`productionActivationDecision = ACTIVE_SINGLE_OWNER_PILOT`

`activationBlockers = []`

`realUserDataAccepted = false`

Il runtime è attivo esclusivamente per il proprietario nominato. L'attivazione non amplia automaticamente scope, utenti o dati ammessi.

Watch non bloccanti:

- load/scale isolato prima di rollout più ampio;
- leaked-password protection quando il piano Supabase lo consente;
- longitudinal proof;
- retention/account deletion a livello applicativo.

## 6. Gate permanenti rilevanti

- `product-ci`;
- `ops-security/supabase`;
- `ops-security/dependencies`;
- `ops-health/render-beta`;
- `p3-export/*`;
- `p5-storage-integrity/*`;
- `p6-performance/*`;
- `x3-e2e/*`;
- `x4-planner/*`;
- `x5-authoring/*`;
- `x5b-export/*`;
- `hva/runtime`;
- `production-promotion/contract`;
- `production-infrastructure/spec`;
- `production-readiness/review`;
- `production-render/blueprint`;
- `production-runtime/smoke`;
- `p7-recovery/db-restore-rehearsal`;
- `p7-recovery/supabase-auth-service`;
- `p7-recovery/offsite-storage`;
- `p7-recovery/offsite-storage-destination`;
- `p7-recovery/r2-retention-lock`;
- `p7-incident/escalation-contract`.

## 7. Prossima priorità autorizzata

**P7-REAL-DATA-ADMISSION** — decisione separata e volontaria sull'ammissione di dati professionali reali nel pilot attivo.

Fino a quella decisione:

- nessun dato professionale reale deve essere importato;
- nessuna migrazione automatica Beta → Production;
- nessun ampliamento a utenti ulteriori;
- nessun auto-deploy.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.
