# DOCENTE OS — Stato corrente canonico

Data: 2026-08-25  
Stato documento: **CURRENT / CANONICAL STATUS**

Questo documento è la sintesi autorevole dello stato operativo. I checkpoint precedenti restano storici e non devono essere usati per dedurre lo stato corrente quando divergono da questo file.

## 1. Classificazione

DOCENTE OS è una **Beta operativa avanzata** con infrastruttura Production inattiva realmente provisionata e verificata tecnicamente.

La Production **non è attiva** e non è autorizzata a ricevere dati professionali reali. `productionActivationDecision = HOLD`.

Stato infrastrutturale:

- Beta Render: operativa;
- Supabase Production: separato e schema-ready;
- Render Production: `docente-os-2026-27-production`, Frankfurt, provisionato inattivo;
- Production Runtime Smoke autenticato: PASS, run `32836204567`;
- Production application rows dopo smoke: 0;
- identità Auth tecnica dedicata: 1;
- `DB_LOGICAL_RESTORE`: PASS;
- `SUPABASE_AUTH_SERVICE_RECOVERY`: PASS;
- `INCIDENT_ESCALATION_MINIMUM`: PASS;
- auto-deploy Production: OFF;
- dati reali autorizzati: false.

## 2. Runtime e invarianti di prodotto

- codice applicativo: `product/`;
- Next.js 16 / React 19 / TypeScript strict;
- Supabase Auth + PostgreSQL + Storage + RLS;
- branch canonico: `develop`;
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

Stato:

**P0 PASS / P1 PASS / P2 PASS applicativo / P3 PASS / P4 PASS / P5 PASS / P6-A PASS / P6-B PASS / P7-A PASS / P7-B PASS / P7-C PASS / P7-D REVIEW CURRENT / P7-E PASS / P7-F PASS / P7-F2 COMPLETE / DB_LOGICAL_RESTORE PASS / SUPABASE_AUTH_SERVICE_RECOVERY PASS / INCIDENT_ESCALATION_MINIMUM PASS / ACTIVATION HOLD**.

## 4. P7 — Production governance e recovery

### Production provisioning

- P7-A: promotion contract PASS;
- P7-B: Production data topology SEPARATE;
- P7-C/P7-E: Render Frankfurt, auto-deploy disabilitato;
- P7-F: Supabase Production provisionato e schema-ready;
- P7-F2: Render Production provisionato inattivo e runtime smoke autenticato PASS.

Production non segue automaticamente `develop`; la promozione richiede SHA immutabile certificato e decisione umana esplicita.

### DB logical restore

**PASS**, run `32837945388`.

Il rehearsal PostgreSQL isolato ha provato backup logico, distruzione, restore, dati sintetici, fingerprint schema e RLS. Beta e Production non sono stati toccati.

Ricevuta: `docs/product/P7_DB_RESTORE_REHEARSAL_RECEIPT.md`.

### Supabase Auth service recovery

**PASS**, run `32841165988`, job `97780759559`.

La prova ha usato uno stack Supabase completo ed effimero in GitHub Actions con GoTrue `v2.195.0` e Mailpit. Ha verificato:

- identità sintetica confermata;
- login password iniziale;
- richiesta `POST /auth/v1/recover`;
- email recovery catturata;
- recovery session emessa;
- cambio password attraverso la recovery session;
- vecchia password rifiutata;
- nuova password accettata;
- Beta/Production toccati: false;
- dati reali: false.

Implementazione: PR #195, merge `849f0b74e1ace3cb33a231a83ec9a9351cfa67cd`.

Ricevuta: `docs/product/P7_SUPABASE_AUTH_RECOVERY_RECEIPT.md`.

Nota: il test certifica il comportamento end-to-end del servizio Auth in uno stack Supabase reale e isolato; non dichiara provato il disaster recovery cloud gestito di Supabase.

### Incident escalation minimum

**PASS.** Gate `p7-incident/escalation-contract`; rehearsal sintetico issue #193, owner-visible, receipt finale e chiusura `completed`.

Ricevuta: `docs/product/P7_INCIDENT_ESCALATION_REHEARSAL_RECEIPT.md`.

## 5. Readiness / blocker di activation

Production activation resta **HOLD**.

Blocker chiusi:

- `DB_LOGICAL_RESTORE` — PASS;
- `SUPABASE_AUTH_SERVICE_RECOVERY` — PASS;
- `INCIDENT_ESCALATION_MINIMUM` — PASS.

Resta **un solo blocker**:

`OFFSITE_STORAGE_RECOVERY` — **OPEN / BLOCKER**: serve una copia indipendente degli oggetti Storage e una prova verificata di restore binario, usando dati sintetici.

Watch non bloccanti:

- load/scale isolato prima di rollout più ampio;
- leaked-password protection quando il piano Supabase lo consente;
- longitudinal proof;
- retention/account deletion dopo sufficiente evidenza di export/recovery.

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
- `p7-incident/escalation-contract`.

## 7. Prossime priorità autorizzate

1. **OFFSITE_STORAGE_RECOVERY** — copia indipendente e restore binario verificato degli oggetti Storage con soli dati sintetici;
2. nuova Production Readiness Review;
3. solo dopo, valutare activation del pilot e promozione di uno SHA applicativo certificato più recente;
4. load/scale isolato prima di rollout più ampio.

Non introdurre nuove macro-capability per riempire artificialmente la roadmap.
