# DOCENTE OS — Stato corrente canonico

Data: 2026-08-26  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS dispone di una **Production attiva in modalità SINGLE_OWNER_PILOT**, separata dalla Beta e vincolata al commit immutabile certificato `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`.

Stato corrente:

- Render Production: **ACTIVE / LIVE** a Frankfurt;
- Production Runtime Smoke certificante: **PASS**, run `32903982577`;
- `exactCandidateShaVerified = true`;
- Supabase Production separato e schema-ready;
- auto-deploy Production: **OFF**;
- signup pubblico: **OFF**;
- onboarding multi-tenant: **OFF**;
- copia automatica Beta → Production: **OFF**;
- activation blocker tecnici P7: **0**;
- `realUserDataAccepted = true` esclusivamente nello scope `TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`.

## 2. Ammissione dati reali

Il proprietario ha autorizzato esplicitamente in data 2026-08-26 il solo:

`TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`

Sono ammessi contenuti professionali reali del proprietario nominato purché **non contengano dati personali di studenti, famiglie, colleghi o altri terzi**.

Restano vietati:

- dati personali di studenti;
- dati personali di terzi;
- categorie particolari di dati;
- credenziali o segreti;
- migrazione automatica Beta → Production;
- signup pubblico;
- onboarding multi-tenant.

Ogni import manuale richiede un'azione esplicita del proprietario.

Il livello `TIER_2_SCHOOL_PERSONAL_DATA` resta **NOT_ADMITTED** e richiede un gate separato.

## 3. Runtime e invarianti di prodotto

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

## 4. Operational hardening

**P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D REVIEW CURRENT / P7-E PASS / P7-F PASS / P7-F2 COMPLETE / DB_LOGICAL_RESTORE PASS / SUPABASE_AUTH_SERVICE_RECOVERY PASS / OFFSITE_STORAGE_RECOVERY_REHEARSAL PASS / OFFSITE_STORAGE_PERSISTENT_DESTINATION PASS / OFFSITE_STORAGE_RETENTION_LOCK PASS / INCIDENT_ESCALATION_MINIMUM PASS / P7_PRODUCTION_ACTIVATION_DECISION PASS / P7_PRODUCTION_PROMOTION PASS / P7_REAL_DATA_ADMISSION_TIER_1 PASS / TECHNICAL BLOCKERS 0 / SINGLE_OWNER_PILOT ACTIVE**.

## 5. Readiness

`productionActivationDecision = ACTIVE_SINGLE_OWNER_PILOT`

`activationBlockers = []`

`realUserDataAccepted = true`

`realUserDataAdmissionScope = TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`

Ricevute rilevanti:

- `ops/production-release-receipt.json`;
- `ops/real-data-admission-decision-receipt.json`.

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
- `p7-real-data/admission-review`;
- `p7-recovery/db-restore-rehearsal`;
- `p7-recovery/supabase-auth-service`;
- `p7-recovery/offsite-storage`;
- `p7-recovery/offsite-storage-destination`;
- `p7-recovery/r2-retention-lock`;
- `p7-incident/escalation-contract`.

## 7. Prossima priorità

**P7-TIER2-PERSONAL-DATA-GOVERNANCE** — solo preparazione dei prerequisiti per un eventuale futuro uso di dati personali scolastici.

Prima di qualsiasi possibile ammissione Tier 2 devono essere formalizzati almeno:

- data minimization policy;
- retention e cancellazione applicativa;
- procedura export/deletion dei dati personali;
- privacy review dedicata;
- nuova decisione umana esplicita.

Fino ad allora, i dati personali scolastici restano vietati.
