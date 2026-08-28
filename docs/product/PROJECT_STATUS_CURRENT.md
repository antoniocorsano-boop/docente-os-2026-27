# DOCENTE OS — Stato corrente canonico

Data: 2026-08-28  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

Baseline di sviluppo osservata dall'audit: `develop` @ `1462e02be5cc4c9d211a57db8178bb60b7bf0d22`.

## 1. Classificazione

DOCENTE OS dispone di una **Production attiva in modalità SINGLE_OWNER_PILOT**, separata dalla Beta e vincolata al commit immutabile certificato `db3d4ab014ad11dec4aeccdb5aa8740220e4ebde`.

Classificazione di maturità 2026-08-28: **M4 — CONTROLLED PRODUCTION PILOT**.

Stato Production invariato:

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

È ammesso esclusivamente:

`TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`.

Sono ammessi contenuti professionali reali del proprietario purché non contengano dati personali di studenti, famiglie, colleghi o altri terzi.

Restano vietati dati personali scolastici/di terzi, categorie particolari di dati, credenziali o segreti, migrazione automatica Beta → Production, signup pubblico e onboarding multi-tenant.

`TIER_2_SCHOOL_PERSONAL_DATA` resta **NOT_ADMITTED** e richiede un gate separato.

## 3. Runtime e invarianti di prodotto

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- branch canonico di sviluppo: `develop`;
- promozione Production: `IMMUTABLE_CERTIFIED_SHA`;
- Vercel non è gate canonico; Netlify è legacy.

Capability consolidate:

- X0/X1/X2: COMPLETE;
- X3: COMPLETE / `READ_ONLY-PROPOSE`;
- X4-A: COMPLETE / BETA-PROVEN — write assistita `PLANNER_CREATE_TASK`;
- X5-A: COMPLETE / BETA-PROVEN — UDA versionate;
- X5-B: COMPLETE / BETA-PROVEN — export professionale;
- X6: FUTURE / NOT BASELINE;
- T1/T2/T3A/T3B/T3C/T4: COMPLETE;
- Human Interaction Model v1: FOUNDATION + CI GATE;
- curriculum interoperability v2: provisional/approved applicability + coverage + persistence + revalidation;
- textbook adoption: T1/T2 foundation + MIM discovery;
- Lesson Workspace extensions: persistent `PROPOSED → ACCEPTED` boundary;
- first lesson design tool: local deterministic activation-question proposal;
- reverse curriculum feedback: teacher-confirmed professional outbox to Arena contract.

## 4. Operational hardening

Stato certificato storico invariato:

**P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D REVIEW CURRENT / P7-E PASS / P7-F PASS / P7-F2 COMPLETE / DB_LOGICAL_RESTORE PASS / SUPABASE_AUTH_SERVICE_RECOVERY PASS / OFFSITE_STORAGE_RECOVERY_REHEARSAL PASS / OFFSITE_STORAGE_PERSISTENT_DESTINATION PASS / OFFSITE_STORAGE_RETENTION_LOCK PASS / INCIDENT_ESCALATION_MINIMUM PASS / P7_PRODUCTION_ACTIVATION_DECISION PASS / P7_PRODUCTION_PROMOTION PASS / P7_REAL_DATA_ADMISSION_TIER_1 PASS / TECHNICAL BLOCKERS 0 / SINGLE_OWNER_PILOT ACTIVE**.

### Stato dei gate sull'attuale `develop`

Dopo il merge #248 alcuni gate E2E risultano rossi sul commit `1462e02b…`: `ops-security/supabase`, P6, K1 e X4.

Il log verificato di `ops-security/supabase` non mostra una violazione RLS: fallisce su `TypeError: fetch failed` verso il Supabase E2E. Questi esiti sono pertanto classificati **E2E_ENVIRONMENT_UNAVAILABLE / DA RICONFERMARE CON AMBIENTE ATTIVO**, non come regressione Production e non modificano retroattivamente i PASS certificati.

Regola futura: i gate dipendenti dall'ambiente devono distinguere indisponibilità infrastrutturale da failure applicativa.

## 5. Readiness

`productionActivationDecision = ACTIVE_SINGLE_OWNER_PILOT`

`activationBlockers = []`

`realUserDataAccepted = true`

`realUserDataAdmissionScope = TIER_1_OWNER_PROFESSIONAL_NON_PERSONAL`

Maturità corrente: `M4_CONTROLLED_PRODUCTION_PILOT`.

DOCENTE OS non è ancora M5 perché multi-user/general availability e Tier 2 non sono ammessi e manca sustained-pilot evidence sufficiente per una distribuzione generale.

## 6. Gate permanenti rilevanti

Restano canonici almeno:

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
- Human Interaction Model gate;
- `production-promotion/contract`;
- `production-infrastructure/spec`;
- `production-readiness/review`;
- `production-runtime/smoke`;
- recovery e incident gates P7.

## 7. Interoperabilità CurManLight Arena

Il confine di prodotto è ora maturo a livello contrattuale:

- Arena → Docente OS: preview, acceptance docente, coverage gate, persistence append-only, revalidation su APPROVED;
- Docente OS → Arena: osservazione professionale confermata, privacy `PROFESSIONAL_NON_PERSONAL`, outbox senza transport automatico.

Il runtime transport cross-product resta volutamente fuori baseline. Non deve essere confuso con la maturità dei contratti.

## 8. Priorità di maturazione

Ordine corrente:

1. consolidare lo stato canonico e l'igiene repository;
2. rendere i gate E2E espliciti rispetto a `ENVIRONMENT_UNAVAILABLE`;
3. raccogliere sustained pilot evidence durante il normale uso scolastico;
4. completare l'interoperabilità runtime solo se richiesta dal pilot;
5. preparare Tier 2 esclusivamente tramite gate privacy separato, senza ammissione implicita.

Documento di audit collegato: `docs/product/SYSTEM_MATURITY_AUDIT_2026-08-28.md`.
